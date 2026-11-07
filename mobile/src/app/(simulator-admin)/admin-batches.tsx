import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { FilterPill } from "@/components/ui/FilterPill";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StateView } from "@/components/ui/StateView";
import { fetchNearbyBatches } from "@/lib/api";
import { formatDateTime, formatKg } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, TYPOGRAPHY } from "@/config/theme";
import { useActorHeaders } from "@/store/useActorStore";
import {
  ActorRole,
  BatchState,
  type BatchWithItems,
} from "@/types/sirkula";

export default function AdminBatchesScreen() {
  const actorHeaders = useActorHeaders();
  const [filter, setFilter] = useState<string>("ALL");

  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.SIMULATOR_ADMIN),
    queryFn: () =>
      fetchNearbyBatches(ActorRole.SIMULATOR_ADMIN, actorHeaders, 15000),
    staleTime: 10_000,
  });

  const batches = (data ?? []).filter((b, idx, self) => b?.id && self.findIndex((x) => x.id === b.id) === idx);

  const filteredBatches = useMemo(() => {
    if (filter === "ALL") return batches;
    if (filter === "TIER_1") {
      return batches.filter(
        (b) =>
          b.current_state === BatchState.TIER_1_HUMAN_ACTIVE ||
          b.current_state === BatchState.TIER_1_CLAIMED,
      );
    }
    if (filter === "TIER_2") {
      return batches.filter(
        (b) =>
          b.current_state === BatchState.TIER_2_ANIMAL_ACTIVE ||
          b.current_state === BatchState.TIER_2_CLAIMED,
      );
    }
    if (filter === "TIER_3") {
      return batches.filter(
        (b) => b.current_state === BatchState.TIER_3_COMPOST_ACTIVE,
      );
    }
    if (filter === "COMPLETED") {
      return batches.filter(
        (b) => b.current_state === BatchState.COMPLETED,
      );
    }
    return batches;
  }, [batches, filter]);

  return (
    <ScreenContainer
      title="Semua Batch Spatiotemporal"
      subtitle="Monitoring menyeluruh atas seluruh siklus hidup batch makanan di Kota Bandung."
    >
      {/* Filter Pills */}
      <View style={styles.filtersRow}>
        <FilterPill
          label="Semua"
          active={filter === "ALL"}
          onPress={() => setFilter("ALL")}
        />
        <FilterPill
          label="Tier 1 (Manusia)"
          active={filter === "TIER_1"}
          onPress={() => setFilter("TIER_1")}
        />
        <FilterPill
          label="Tier 2 (Pakan)"
          active={filter === "TIER_2"}
          onPress={() => setFilter("TIER_2")}
        />
        <FilterPill
          label="Tier 3 (Kompos)"
          active={filter === "TIER_3"}
          onPress={() => setFilter("TIER_3")}
        />
        <FilterPill
          label="Selesai"
          active={filter === "COMPLETED"}
          onPress={() => setFilter("COMPLETED")}
        />
      </View>

      {isLoading ? (
        <StateView kind="loading" message="Memuat seluruh batch..." />
      ) : isError ? (
        <StateView
          kind="error"
          actionLabel="Coba Lagi"
          onAction={() => {
            void refetch();
          }}
        />
      ) : filteredBatches.length === 0 ? (
        <StateView
          kind="empty"
          title="Tidak Ada Batch"
          message="Tidak ditemukan batch makanan pada filter ini."
        />
      ) : (
        filteredBatches.map((batch) => (
          <Card key={batch.id} padding="md" style={styles.card}>
            <View style={styles.cardHeader}>
              <Badge status={batch.current_state} size="sm" />
              <Text style={styles.weightText}>
                {formatKg(batch.total_weight_kg)}
              </Text>
            </View>

            <Text style={styles.batchTitle}>{batch.batch_summary}</Text>

            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>
                Suhu: {batch.ambient_temp_c ?? 29}°C · RH: {batch.humidity_pct ?? 75}%
              </Text>
              {batch.current_state === BatchState.TIER_1_HUMAN_ACTIVE && (
                <CountdownBadge expiresAt={batch.tier1_expires_at} size="sm" />
              )}
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.dateText}>
                Dibuat: {formatDateTime(batch.created_at)}
              </Text>
              <Text style={styles.idText}>ID: {batch.id.slice(0, 8)}</Text>
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  weightText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  batchTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  dateText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  idText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: COLORS.textMuted,
  },
});
