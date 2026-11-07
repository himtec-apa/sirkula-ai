import { useQuery } from "@tanstack/react-query";
import { fetchNearbyBatches } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useActorHeaders } from "@/store/useActorStore";
import { type BatchWithItems, type FieldRole } from "@/types/sirkula";

export function useDemoBatches(role: FieldRole) {
  const actorHeaders = useActorHeaders();

  return useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(role),
    queryFn: () => fetchNearbyBatches(role, actorHeaders),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
