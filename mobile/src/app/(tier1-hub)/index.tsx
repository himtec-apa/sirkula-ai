import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { FilterPill } from "@/components/ui/FilterPill";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StateView } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { ClaimConflictError, claimBatch, fetchNearbyBatches } from "@/lib/api";
import { formatDecimal, formatKg, formatPortions } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from "@/config/theme";
import { useActorHeaders, useActorStore } from "@/store/useActorStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { ActorRole, BatchState, FOOD_RISK_LABELS, type BatchWithItems } from "@/types/sirkula";

type FilterType = "ALL" | "READY" | "CRITICAL";

const FILTERS: Array<{ id: FilterType; label: string }> = [
  { id: "ALL", label: "Semua" },
  { id: "READY", label: "Siap Jemput" },
  { id: "CRITICAL", label: "Risiko Tinggi" },
];

export default function HubRadarScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const actor = useActorStore((state) => state.profiles[ActorRole.TIER_1_HUB]);
  const actorHeaders = useActorHeaders();
  const isConnected = useConnectionStore((state) => state.isConnected);

  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 2,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.TIER_1_HUB),
    queryFn: () =>
      fetchNearbyBatches(
        ActorRole.TIER_1_HUB,
        actorHeaders,
        radiusMeters,
        {
          latitude: actor.location.coordinates[1],
          longitude: actor.location.coordinates[0],
        },
      ),
    staleTime: 15_000,
  });

  const allBatches = (data ?? []).filter((b, idx, self) => b?.id && self.findIndex((x) => x.id === b.id) === idx);
  const activeBatches = allBatches.filter(
    (b) => b.current_state === BatchState.TIER_1_HUMAN_ACTIVE,
  );
  const claimedBatches = allBatches.filter(
    (b) => b.current_state === BatchState.TIER_1_CLAIMED,
  );

  const filteredBatches = activeBatches.filter((batch) => {
    if (activeFilter === "READY") {
      return batch.total_portions >= 20;
    }
    if (activeFilter === "CRITICAL") {
      const expiresAt = new Date(batch.tier1_expires_at).getTime();
      return expiresAt - Date.now() <= 90 * 60_000;
    }
    return true;
  });

  const claimMutation = useMutation({
    mutationFn: (batchId: string) =>
      claimBatch({ batchId, actorHeaders }),
    onMutate: (batchId) => {
      setClaimingId(batchId);
    },
    onSuccess: ({ claim, batch }) => {
      queryClient.setQueryData(queryKeys.claims.byBatch(batch.id), claim);
      queryClient.setQueryData(queryKeys.claims.detail(claim.id), claim);
      queryClient.setQueryData(queryKeys.batches.detail(batch.id), batch);

      queryClient.setQueryData<BatchWithItems[]>(
        queryKeys.batches.list(ActorRole.TIER_1_HUB),
        (current) =>
          (current ?? []).map((item) =>
            item.id === batch.id ? { ...batch, active_claim: claim } : item,
          ),
      );

      showToast({
        type: "success",
        title: "Misi Berhasil Diklaim!",
        message: "Instruksi serah terima dan tiket QR dinamis telah dibuka.",
      });

      router.push({
        pathname: "/(tier1-hub)/mission/[id]",
        params: { id: batch.id },
      });
    },
    onError: (error, batchId) => {
      if (error instanceof ClaimConflictError) {
        showToast({
          type: "warning",
          title: "Misi Sudah Diambil",
          message: "Simpul lain telah mengklaim batch ini lebih cepat (409 Conflict).",
        });
        queryClient.setQueryData<BatchWithItems[]>(
          queryKeys.batches.list(ActorRole.TIER_1_HUB),
          (current) => (current ?? []).filter((item) => item.id !== batchId),
        );
      } else {
        showToast({
          type: "error",
          title: "Gagal Mengambil Misi",
          message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        });
      }
    },
    onSettled: () => {
      setClaimingId(null);
    },
  });

  const handleExpandRadius = () => {
    const next = radiusMeters + 1500;
    setRadiusMeters(next);
    showToast({
      type: "info",
      title: "Radius Diperluas",
      message: `Radar diperluas hingga ${formatDecimal(next / 1000)} km.`,
    });
    void refetch();
  };

  return (
    <ScreenContainer
      title={`Halo, ${actor.name}!`}
      subtitle="Kelola penjemputan dan distribusi makanan hari ini."
    >
      {/* Banner Radar Radius & Online indicator */}
      <View style={styles.radarBanner}>
        <View style={styles.radarHeaderRow}>
          <View style={styles.radarTitleGroup}>
            <View style={styles.radarPulseWrapper}>
              <Animated.View
                style={[
                  styles.radarPulseRing,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <View style={styles.radarPulseDot} />
            </View>
            <Text style={styles.radarTitleText}>
              Radar Radius {formatDecimal(radiusMeters / 1000)} km â€¢ Dago
            </Text>
          </View>

          <View style={styles.connectionBadge}>
            <View
              style={[
                styles.connDot,
                { backgroundColor: isConnected ? COLORS.success : COLORS.accent },
              ]}
            />
            <Text style={styles.connText}>
              {isConnected ? "WSS Online" : "Demo Mode"}
            </Text>
          </View>
        </View>

        <Text style={styles.radarSubtitle}>{actor.address_full}</Text>

        <View style={styles.radarCounterRow}>
          <View style={styles.counterBox}>
            <Text style={styles.counterLabel}>Tugas Baru</Text>
            <Text style={styles.counterNumber}>{activeBatches.length}</Text>
          </View>
          <View style={styles.counterBox}>
            <Text style={styles.counterLabel}>Dalam Distribusi</Text>
            <Text style={[styles.counterNumber, { color: COLORS.primary }]}>
              {claimedBatches.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterPillsRow}>
        {FILTERS.map((f) => (
          <FilterPill
            key={f.id}
            label={f.label}
            isActive={activeFilter === f.id}
            onPress={() => setActiveFilter(f.id)}
          />
        ))}
      </View>

      {/* Mission List */}
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
      ) : filteredBatches.length === 0 ? (
        <StateView
          kind="empty"
          title="Belum ada sisa pangan aktif di radius Anda"
          message="Batch baru akan muncul seketika donatur merilis surplus makanan."
          actionLabel="Perluas Radius Pencarian"
          onAction={handleExpandRadius}
        />
      ) : (
        filteredBatches.map((batch) => {
          const isClaiming = claimingId === batch.id;
          return (
            <Card key={batch.id} padding="md" style={styles.missionCard}>
              <View style={styles.missionCardHeader}>
                <Badge status={batch.current_state} size="sm" />
                <CountdownBadge expiresAt={batch.tier1_expires_at} size="sm" />
              </View>

              <Text style={styles.missionTitle} numberOfLines={2}>
                {batch.batch_summary}
              </Text>

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
                <View style={styles.metaItem}>
                  <Ionicons
                    name="shield-outline"
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={styles.metaText}>
                    {FOOD_RISK_LABELS[batch.highest_risk_category]}
                  </Text>
                </View>
              </View>

              <View style={styles.logisticsBox}>
                <View style={styles.logisticsItem}>
                  <Ionicons name="cube-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.logisticsText}>
                    Wadah: {batch.recommended_container ?? "2 Box Kontainer Besar"}
                  </Text>
                </View>
                <View style={styles.logisticsItem}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.logisticsSub}>
                    Radius Dago (lokasi tersamar Â±250m)
                  </Text>
                </View>
              </View>

              <View style={styles.missionCardBtn}>
                <Button
                  label={
                    isClaiming
                      ? "Mengunci Hak Misi..."
                      : "Ambil Misi Penyelamatan"
                  }
                  isLoading={isClaiming}
                  disabled={Boolean(claimingId)}
                  onPress={() => claimMutation.mutate(batch.id)}
                  leftIcon={
                    !isClaiming ? (
                      <Ionicons
                        name="hand-left-outline"
                        size={16}
                        color={COLORS.surface}
                      />
                    ) : null
                  }
                />
              </View>
            </Card>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  radarBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  radarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  radarTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radarPulseWrapper: {
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  radarPulseRing: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    opacity: 0.45,
  },
  radarPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  radarTitleText: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.text,
  },
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  radarSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  radarCounterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  counterBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.input,
    padding: 10,
  },
  counterLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  counterNumber: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginTop: 2,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  missionCard: {
    gap: 10,
    ...SHADOWS.md,
  },
  missionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  missionTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: "600",
  },
  logisticsBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.input,
    padding: 10,
    gap: 4,
  },
  logisticsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logisticsText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  logisticsSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  missionCardBtn: {
    marginTop: 4,
  },
});
