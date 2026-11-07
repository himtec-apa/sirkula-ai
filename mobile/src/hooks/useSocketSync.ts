import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";
import { buildActorHeaders, useActorStore } from "@/store/useActorStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { fetchAuthToken } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import {
  ActorRole,
  BatchState,
  type BatchCreatedPayload,
  type BatchClaimedPayload,
  type BatchHandoverCompletedPayload,
  type BatchStateTransitionedPayload,
  type BatchWithItems,
  type ClientToServerEvents,
  type FieldRole,
  type RescueClaim,
  type ServerToClientEvents,
} from "@/types/sirkula";

type SirkulaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function isFieldRole(value: unknown): value is FieldRole {
  return (
    value === ActorRole.DONOR ||
    value === ActorRole.TIER_1_HUB ||
    value === ActorRole.TIER_2_FARMER ||
    value === ActorRole.TIER_3_COMPOST ||
    value === ActorRole.ESG_AUDITOR ||
    value === ActorRole.SIMULATOR_ADMIN
  );
}

function roleAcceptsBatch(role: FieldRole, state: BatchState): boolean {
  if (
    role === ActorRole.DONOR ||
    role === ActorRole.ESG_AUDITOR ||
    role === ActorRole.SIMULATOR_ADMIN
  ) {
    return true;
  }
  if (role === ActorRole.TIER_1_HUB) {
    return (
      state === BatchState.TIER_1_HUMAN_ACTIVE ||
      state === BatchState.TIER_1_CLAIMED
    );
  }
  if (role === ActorRole.TIER_2_FARMER) {
    return (
      state === BatchState.TIER_2_ANIMAL_ACTIVE ||
      state === BatchState.TIER_2_CLAIMED
    );
  }
  if (role === ActorRole.TIER_3_COMPOST) {
    return state === BatchState.TIER_3_COMPOST_ACTIVE;
  }
  return true;
}

function syncBatchAcrossLists(
  queryClient: QueryClient,
  batch: BatchWithItems,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.batches.listPrefix });

  for (const query of queries) {
    const role = query.queryKey[2];
    if (!isFieldRole(role)) {
      continue;
    }
    queryClient.setQueryData<BatchWithItems[]>(query.queryKey, (current) => {
      if (!current) {
        return current;
      }
      const others = current.filter((item) => item.id !== batch.id);
      if (!roleAcceptsBatch(role, batch.current_state)) {
        return others;
      }
      return [batch, ...others];
    });
  }
}

function patchBatchInLists(
  queryClient: QueryClient,
  batchId: string,
  patch: Partial<BatchWithItems>,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.batches.listPrefix });

  for (const query of queries) {
    const role = query.queryKey[2];
    if (!isFieldRole(role)) {
      continue;
    }
    queryClient.setQueryData<BatchWithItems[]>(query.queryKey, (current) => {
      if (!current) {
        return current;
      }
      const existing = current.find((item) => item.id === batchId);
      if (!existing) {
        return current;
      }
      const updated = { ...existing, ...patch };
      if (!roleAcceptsBatch(role, updated.current_state)) {
        return current.filter((item) => item.id !== batchId);
      }
      return current.map((item) => (item.id === batchId ? updated : item));
    });
  }
}

function patchBatchDetail(
  queryClient: QueryClient,
  batchId: string,
  patch: Partial<BatchWithItems>,
): void {
  queryClient.setQueryData<BatchWithItems>(
    queryKeys.batches.detail(batchId),
    (current) => (current ? { ...current, ...patch } : current),
  );
}

function cacheClaim(queryClient: QueryClient, claim: RescueClaim): void {
  queryClient.setQueryData(queryKeys.claims.detail(claim.id), claim);
  queryClient.setQueryData(queryKeys.claims.byBatch(claim.batch_id), claim);
}

export function useSocketSync(enabled = true): void {
  const queryClient = useQueryClient();
  const activeRole = useActorStore((state) => state.activeRole);
  const currentActor = useActorStore((state) => state.currentActor);
  const profileActorId = useActorStore((state) => state.profiles[state.activeRole]?.id);
  const actorId = currentActor?.id ?? profileActorId;
  const storeToken = useActorStore((state) => state.token);
  const setConnected = useConnectionStore((state) => state.setConnected);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let activeSocket: SirkulaSocket | null = null;
    let cancelled = false;

    const tokenPromise = storeToken ? Promise.resolve(storeToken) : fetchAuthToken(actorId);

    void tokenPromise.then((jwtToken) => {
      if (cancelled) return;

      const headers = buildActorHeaders(actorId, activeRole);
      const socket: SirkulaSocket = io(env.socketUrl, {
        autoConnect: true,
        reconnection: true,
        auth: {
          token: jwtToken ?? undefined,
          ...headers,
        },
        transports: ["websocket", "polling"],
      });
      activeSocket = socket;

      const handleConnect = () => {
        setConnected(true);
        socket.emit("actor:subscribe", { actor_id: actorId, role: activeRole });
        (socket as any).emit("join:room", `room:${activeRole}`);
        (socket as any).emit("join:room", `room:actor:${actorId}`);
      };
      const handleDisconnect = () => setConnected(false);

      const handleBatchCreated: ServerToClientEvents["batch:created"] = (
        payload,
      ) => {
        if (payload.batch) {
          queryClient.setQueryData(
            queryKeys.batches.detail(payload.batch.id),
            payload.batch,
          );
          syncBatchAcrossLists(queryClient, payload.batch);
        } else {
          void queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
          const batchId = payload.batch_id ?? (payload as any).id;
          if (batchId) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.batches.detail(String(batchId)),
            });
          }
        }
      };

      const handleStateTransitioned: ServerToClientEvents["batch:state_transitioned"] =
        (payload) => {
          if (payload.batch) {
            queryClient.setQueryData(
              queryKeys.batches.detail(payload.batch.id),
              payload.batch,
            );
            syncBatchAcrossLists(queryClient, payload.batch);
            return;
          }

          if (payload.batch_id) {
            patchBatchDetail(queryClient, payload.batch_id, {
              current_state: payload.new_state,
              updated_at: payload.transitioned_at,
            });
            patchBatchInLists(queryClient, payload.batch_id, {
              current_state: payload.new_state,
              updated_at: payload.transitioned_at,
            });
          }
          void queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
        };

      const handleBatchClaimed: ServerToClientEvents["batch:claimed"] = (
        payload,
      ) => {
        if (payload.claim) {
          cacheClaim(queryClient, payload.claim);
        }
        if (payload.batch) {
          queryClient.setQueryData(
            queryKeys.batches.detail(payload.batch.id),
            payload.batch,
          );
          syncBatchAcrossLists(queryClient, payload.batch);
          return;
        }
        const batchId = payload.claim?.batch_id ?? payload.batch_id;
        if (batchId) {
          const patch: Partial<BatchWithItems> = {
            current_state: payload.new_state ?? BatchState.TIER_1_CLAIMED,
          };
          if (payload.claim) {
            patch.active_claim = payload.claim;
          }
          patchBatchDetail(queryClient, batchId, patch);
          patchBatchInLists(queryClient, batchId, patch);
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      };

      const handleHandoverCompleted: ServerToClientEvents["batch:handover_completed"] =
        (payload) => {
          if (payload.claim) {
            cacheClaim(queryClient, payload.claim);
          }
          if (payload.batch) {
            queryClient.setQueryData(
              queryKeys.batches.detail(payload.batch.id),
              payload.batch,
            );
            syncBatchAcrossLists(queryClient, payload.batch);
            return;
          }
          const batchId = payload.batch_id ?? payload.claim?.batch_id;
          if (batchId) {
            const patch: Partial<BatchWithItems> = {
              current_state: BatchState.COMPLETED,
            };
            if (payload.claim) {
              patch.active_claim = payload.claim;
              patch.updated_at = payload.claim.updated_at;
            }
            patchBatchDetail(queryClient, batchId, patch);
            patchBatchInLists(queryClient, batchId, patch);
          }
          void queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
        };

      const handleReconnect = () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("batch:created", handleBatchCreated);
      socket.on("batch:state_transitioned", handleStateTransitioned);
      socket.on("batch:claimed", handleBatchClaimed);
      socket.on("batch:handover_completed", handleHandoverCompleted);
      socket.io.on("reconnect", handleReconnect);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.disconnect();
        setConnected(false);
      }
    };
  }, [actorId, activeRole, storeToken, enabled, queryClient, setConnected]);
}
