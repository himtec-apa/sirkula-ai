import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StateView } from "@/components/ui/StateView";
import { fetchNearbyBatches } from "@/lib/api";
import { formatKg, formatPortions } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, TYPOGRAPHY } from "@/config/theme";
import { useActorHeaders } from "@/store/useActorStore";
import { ActorRole, BatchState, type BatchWithItems } from "@/types/sirkula";

export default function HubMissionsScreen() {
  const router = useRouter();
  const actorHeaders = useActorHeaders();

  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.TIER_1_HUB),
    queryFn: () => fetchNearbyBatches(ActorRole.TIER_1_HUB, actorHeaders),
    staleTime: 15_000,
  });

  const missions = (data ?? []).filter(
    (batch) => batch.current_state === BatchState.TIER_1_CLAIMED,
  );

  return (
    <ScreenContainer
      title="Misi Penjemputan Aktif"
      subtitle="Batch yang telah dikonfirmasi klaimnya dan siap dijemput."
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
      ) : missions.length === 0 ? (
        <StateView
          kind="empty"
          title="Belum ada misi aktif"
          message="Ambil batch dari radar simpul untuk memulai misi penjemputan makanan."
          actionLabel="Buka Radar Misi"
          onAction={() => router.replace("/(tier1-hub)")}
        />
      ) : (
        missions.map((batch) => (
          <Card key={batch.id} padding="md" style={styles.card}>
            <View style={styles.cardHeader}>
              <Badge status={batch.current_state} size="sm" />
              <CountdownBadge expiresAt={batch.tier1_expires_at} size="sm" />
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

            <View style={styles.actionCol}>
              <Button
                label="Buka Tiket QR & Lokasi"
                size="sm"
                variant="primary"
                leftIcon={
                  <Ionicons
                    name="qr-code-outline"
                    size={16}
                    color={COLORS.surface}
                  />
                }
                onPress={() =>
                  router.push({
                    pathname: "/(tier1-hub)/mission/[id]",
                    params: { id: batch.id },
                  })
                }
              />
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batchTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
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
  actionCol: {
    marginTop: 4,
  },
});
