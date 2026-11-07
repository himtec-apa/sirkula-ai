import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StateView } from "@/components/ui/StateView";
import { fetchNearbyBatches } from "@/lib/api";
import { formatDateTime, formatKg } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, TYPOGRAPHY } from "@/config/theme";
import { useActorHeaders } from "@/store/useActorStore";
import { ActorRole, BatchState, type BatchWithItems } from "@/types/sirkula";

export default function CompostHistoryScreen() {
  const actorHeaders = useActorHeaders();
  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.TIER_3_COMPOST),
    queryFn: () =>
      fetchNearbyBatches(ActorRole.TIER_3_COMPOST, actorHeaders, 10000),
    staleTime: 15_000,
  });

  const history = (data ?? []).filter(
    (batch) => batch.current_state === BatchState.COMPLETED,
  );

  return (
    <ScreenContainer
      title="Riwayat Biomasa Kompos"
      subtitle="Batch biomasa organik yang telah selesai dijemput dan diolah menjadi kompos."
    >
      {isLoading ? (
        <StateView kind="loading" message="Memuat riwayat serah-terima..." />
      ) : isError ? (
        <StateView
          kind="error"
          actionLabel="Coba Lagi"
          onAction={() => {
            void refetch();
          }}
        />
      ) : history.length === 0 ? (
        <StateView
          kind="empty"
          title="Riwayat kompos masih kosong"
          message="Batch biomasa yang berhasil diserahterimakan akan diarsip di sini."
        />
      ) : (
        history.map((batch) => (
          <Card key={batch.id} padding="md" style={styles.card}>
            <View style={styles.cardHeader}>
              <Badge status={batch.current_state} size="sm" />
              <Text style={styles.dateText}>
                {formatDateTime(batch.updated_at)}
              </Text>
            </View>

            <Text style={styles.batchTitle}>{batch.batch_summary}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Biomasa Diselamatkan:</Text>
              <Text style={styles.metaValue}>{formatKg(batch.total_weight_kg)}</Text>
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  batchTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  metaLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  metaValue: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.warning,
  },
});
