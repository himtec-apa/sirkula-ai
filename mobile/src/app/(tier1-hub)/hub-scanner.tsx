import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { DynamicQrTicket } from "@/components/shared/DynamicQrTicket";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateView } from "@/components/ui/StateView";
import { fetchNearbyBatches } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, TYPOGRAPHY } from "@/config/theme";
import { useActorHeaders, useActorStore } from "@/store/useActorStore";
import { ActorRole, BatchState, type BatchWithItems, type RescueClaim } from "@/types/sirkula";

export default function HubScannerScreen() {
  const router = useRouter();
  const actor = useActorStore((state) => state.profiles[ActorRole.TIER_1_HUB]);
  const actorHeaders = useActorHeaders();

  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.TIER_1_HUB),
    queryFn: () => fetchNearbyBatches(ActorRole.TIER_1_HUB, actorHeaders),
    staleTime: 15_000,
  });

  const activeMission = useMemo(() => {
    return (data ?? []).find(
      (batch) => batch.current_state === BatchState.TIER_1_CLAIMED,
    );
  }, [data]);

  const claim: RescueClaim | null = useMemo(() => {
    return activeMission?.active_claim ?? null;
  }, [activeMission]);

  return (
    <ScreenContainer
      title="Tiket QR Serah Terima"
      subtitle="Tunjukkan tiket dinamis ini ke staf donatur di loading dock."
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
      ) : activeMission && claim ? (
        <View style={styles.contentCol}>
          <Card padding="sm" style={styles.activeBanner}>
            <View style={styles.bannerRow}>
              <Ionicons
                name="information-circle"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.bannerText}>
                Misi Aktif: {activeMission.batch_summary}
              </Text>
            </View>
          </Card>

          <DynamicQrTicket claim={claim} batch={activeMission} />

          <Button
            label="Buka Rincian Misi Lengkap"
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/(tier1-hub)/mission/[id]",
                params: { id: activeMission.id },
              })
            }
          />
        </View>
      ) : (
        <Card padding="lg" style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="qr-code-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada Misi Penjemputan Aktif</Text>
          <Text style={styles.emptySubtitle}>
            Tiket QR dinamis akan otomatis aktif segera setelah Anda mengambil
            misi makanan di radar simpul.
          </Text>
          <View style={styles.emptyBtnWrapper}>
            <Button
              label="Buka Radar Simpul Warga"
              variant="primary"
              size="sm"
              fullWidth={false}
              onPress={() => router.replace("/(tier1-hub)")}
            />
          </View>
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentCol: {
    gap: 12,
  },
  activeBanner: {
    backgroundColor: COLORS.primaryLight,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
  },
  emptySubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 290,
    lineHeight: 18,
  },
  emptyBtnWrapper: {
    marginTop: 16,
  },
});
