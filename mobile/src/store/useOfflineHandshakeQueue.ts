import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafetyInvariantError,
  verifyHandoverApi,
  type VerifyHandoverResult,
} from "@/lib/api";
import type { ActorHeaders } from "@/store/useActorStore";
import type { RescueTier } from "@/types/sirkula";

export interface QueuedHandshake {
  id: string;
  batch_id: string;
  claim_id: string;
  receiver_id: string;
  tier: RescueTier;
  scanned_at: string;
  qr_token: string;
  waiver_signature_hash: string;
  retry_count: number;
  last_error?: string;
  status: "PENDING" | "SYNCING" | "FAILED";
}

export interface SyncSummary {
  synced: number;
  failed: number;
  safetyRejected: number;
  results: VerifyHandoverResult[];
}

interface OfflineHandshakeQueueState {
  queue: QueuedHandshake[];
  isSyncing: boolean;
  enqueue: (
    item: Omit<QueuedHandshake, "id" | "retry_count" | "status">,
  ) => QueuedHandshake;
  dequeue: (id: string) => void;
  clearQueue: () => void;
  syncQueue: (actorHeaders: ActorHeaders) => Promise<SyncSummary>;
}

export const useOfflineHandshakeQueue = create<OfflineHandshakeQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,

      enqueue: (item) => {
        const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const queued: QueuedHandshake = {
          ...item,
          id,
          retry_count: 0,
          status: "PENDING",
        };
        set((state) => ({
          queue: [
            queued,
            ...state.queue.filter(
              (existing) => existing.batch_id !== item.batch_id,
            ),
          ],
        }));
        return queued;
      },

      dequeue: (id) => {
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        }));
      },

      clearQueue: () => {
        set({ queue: [] });
      },

      syncQueue: async (actorHeaders) => {
        const state = get();
        if (state.isSyncing || state.queue.length === 0) {
          return { synced: 0, failed: 0, safetyRejected: 0, results: [] };
        }

        set({ isSyncing: true });

        const itemsToSync = [...state.queue];
        const summary: SyncSummary = {
          synced: 0,
          failed: 0,
          safetyRejected: 0,
          results: [],
        };

        for (const item of itemsToSync) {
          try {
            const result = await verifyHandoverApi({
              batchId: item.batch_id,
              claimId: item.claim_id,
              qrToken: item.qr_token,
              scannedAt: item.scanned_at,
              waiverSignatureHash: item.waiver_signature_hash,
              actorHeaders,
              offlineVerified: true,
            });

            summary.synced += 1;
            summary.results.push(result);
            get().dequeue(item.id);
          } catch (error) {
            if (error instanceof SafetyInvariantError) {
              summary.safetyRejected += 1;
              get().dequeue(item.id);
            } else {
              summary.failed += 1;
              set((current) => ({
                queue: current.queue.map((q) =>
                  q.id === item.id
                    ? {
                        ...q,
                        retry_count: q.retry_count + 1,
                        status: "FAILED",
                        last_error:
                          error instanceof Error
                            ? error.message
                            : "Gagal menghubungkan ke server.",
                      }
                    : q,
                ),
              }));
            }
          }
        }

        set({ isSyncing: false });
        return summary;
      },
    }),
    {
      name: "sirkula.handshake.queue.v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ queue: state.queue }),
    },
  ),
);
