import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StateView } from "@/components/ui/StateView";
import { fetchNearbyBatches } from "@/lib/api";
import { formatDateTime, formatKg, formatPortions } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, TYPOGRAPHY } from "@/config/theme";
import { useActorHeaders } from "@/store/useActorStore";
import { ActorRole, BatchState, type BatchWithItems } from "@/types/sirkula";

export default function DonorHistoryScreen() {
  const actorHeaders = useActorHeaders();
  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.DONOR),
    queryFn: () => fetchNearbyBatches(ActorRole.DONOR, actorHeaders, 50000),
    staleTime: 15_000,
  });

  const history = (data ?? []).filter(
    (batch) =>
      batch.current_state === BatchState.COMPLETED ||
      batch.current_state === BatchState.CANCELLED_BY_DONOR,
  );

  return (
    <ScreenContainer
      title="Riwayat Donasi Pangan"
      subtitle="Arsip batch makanan yang telah terserahterimakan atau selesai."
    >
      {isLoading ? (
        <StateView kind="loading" />
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
          title="Riwayat donasi masih kosong"
          message="Batch yang telah selesai diserahterimakan akan muncul di sini beserta nomor sertifikat waiver."
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
              <View style={styles.metaItem}>
                <Ionicons
                  name="restaurant-outline"
                  size={14}
                  color={COLORS.textMuted}
                />
                <Text style={styles.metaText}>
                  {formatPortions(batch.total_portions)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons
                  name="scale-outline"
                  size={14}
                  color={COLORS.textMuted}
                />
                <Text style={styles.metaText}>
                  {formatKg(batch.total_weight_kg)}
                </Text>
              </View>
            </View>

            <View style={styles.waiverNoticeBox}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={COLORS.primary}
              />
              <Text style={styles.waiverNoticeText}>
                Sertifikat Digital Liability Waiver terbit otomatis
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  batchTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 15,
    color: COLORS.text,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  waiverNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  waiverNoticeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
});
