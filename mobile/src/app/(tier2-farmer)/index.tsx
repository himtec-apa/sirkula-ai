import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedValueCard } from "@/components/farmer/FeedValueCard";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { DynamicQrTicket } from "@/components/shared/DynamicQrTicket";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StateView } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { ClaimConflictError, claimBatch, fetchNearbyBatches } from "@/lib/api";
import { formatIdr, formatKg } from "@/lib/format";
import { estimateFeedSavingsIdr } from "@/lib/esg-converter";
import { queryKeys } from "@/lib/queryKeys";
import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from "@/config/theme";
import { useActorHeaders, useActorStore } from "@/store/useActorStore";
import {
  ActorRole,
  BatchState,
  ClaimStatus,
  type BatchWithItems,
  type RescueClaim,
} from "@/types/sirkula";

export default function FarmerHomeScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const actor = useActorStore(
    (state) => state.profiles[ActorRole.TIER_2_FARMER],
  );
  const actorHeaders = useActorHeaders();

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activePassBatch, setActivePassBatch] = useState<BatchWithItems | null>(
    null,
  );

  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.TIER_2_FARMER),
    queryFn: () =>
      fetchNearbyBatches(
        ActorRole.TIER_2_FARMER,
        actorHeaders,
        8000,
        {
          latitude: actor.location.coordinates[1],
          longitude: actor.location.coordinates[0],
        },
      ),
    staleTime: 15_000,
  });

  const allBatches = (data ?? []).filter((b, idx, self) => b?.id && self.findIndex((x) => x.id === b.id) === idx);
  const availableBatches = allBatches.filter(
    (b) => b.current_state === BatchState.TIER_2_ANIMAL_ACTIVE,
  );
  const claimedBatches = allBatches.filter(
    (b) => b.current_state === BatchState.TIER_2_CLAIMED,
  );

  const totalAvailableKg = useMemo(() => {
    return availableBatches.reduce((sum, b) => sum + b.total_weight_kg, 0);
  }, [availableBatches]);

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
        queryKeys.batches.list(ActorRole.TIER_2_FARMER),
        (current) =>
          (current ?? []).map((item) =>
            item.id === batch.id ? { ...batch, active_claim: claim } : item,
          ),
      );

      showToast({
        type: "success",
        title: "Pakan Berhasil Diklaim!",
        message: "Tiket QR penjemputan dan instruksi loading dock siap.",
      });

      setActivePassBatch({ ...batch, active_claim: claim });
    },
    onError: (error, batchId) => {
      if (error instanceof ClaimConflictError) {
        showToast({
          type: "warning",
          title: "Pakan Sudah Diklaim",
          message:
            "Peternak lain telah mengklaim batch ini lebih cepat (409 Conflict).",
        });
        queryClient.setQueryData<BatchWithItems[]>(
          queryKeys.batches.list(ActorRole.TIER_2_FARMER),
          (current) => (current ?? []).filter((item) => item.id !== batchId),
        );
      } else {
        showToast({
          type: "error",
          title: "Gagal Mengklaim Pakan",
          message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        });
      }
    },
    onSettled: () => {
      setClaimingId(null);
    },
  });

  const activePassClaim: RescueClaim | null = useMemo(() => {
    if (!activePassBatch) return null;
    if (activePassBatch.active_claim) {
      return activePassBatch.active_claim;
    }
    return {
      id: `claim-farmer-${Date.now()}`,
      batch_id: activePassBatch.id,
      receiver_id: actor.id,
      claimed_for_tier: "TIER_2_ANIMAL",
      status: ClaimStatus.ACTIVE_EN_ROUTE,
      qr_token_hash: `SRK-FARM-${activePassBatch.id.slice(0, 8).toUpperCase()}`,
      qr_expires_at: activePassBatch.tier2_expires_at,
      claimed_at: new Date().toISOString(),
      handover_scanned_at: null,
      handover_ambient_temp_c: null,
      handover_scan_location: null,
      liability_waiver_accepted: true,
      waiver_signature_hash: null,
      revocation_reason: null,
      updated_at: new Date().toISOString(),
    };
  }, [activePassBatch, actor.id]);

  return (
    <ScreenContainer
      title={`Halo, ${actor.name}!`}
      subtitle="Kelola material organik dari donasi makanan untuk pakan ternak."
    >
      {/* Banner Amber KHUSUS BIOMASA PAKAN TERNAK */}
      <View style={styles.bannerAmber}>
        <View style={styles.bannerAmberHeader}>
          <Ionicons name="leaf" size={18} color={COLORS.surface} />
          <Text style={styles.bannerAmberTag}>KHUSUS BIOMASA PAKAN TERNAK</Text>
        </View>
        <Text style={styles.bannerAmberDesc}>
          Material kaya nutrisi yang dialihkan dari konsumsi manusia. Sangat
          ideal untuk larva BSF (Maggot), lele, dan pakan ternak terfermentasi.
        </Text>
      </View>

      {/* Feed Value Card with interactive calculation */}
      <FeedValueCard
        weightKg={totalAvailableKg > 0 ? totalAvailableKg : 50}
        interactive
        title="Kalkulator Nilai Biomasa Pakan"
        subtitle="Simulasi penghematan pakan komersial secara real-time."
      />

      {/* Batch Dalam Penjemputan */}
      {claimedBatches.length > 0 ? (
        <View style={styles.claimedSection}>
          <SectionHeader
            title="Pakan Dalam Penjemputan"
            icon="bicycle-outline"
            iconColor={COLORS.accent}
          />
          {claimedBatches.map((batch) => (
            <Card key={`claimed-${batch.id}`} padding="md" style={styles.claimedCard}>
              <View style={styles.claimedHeader}>
                <Badge status={batch.current_state} size="sm" />
                <Text style={styles.claimedWeight}>
                  {formatKg(batch.total_weight_kg)}
                </Text>
              </View>

              <Text style={styles.claimedTitle}>{batch.batch_summary}</Text>

              <View style={styles.claimedBtnWrapper}>
                <Button
                  label="Buka QR Pass Penjemputan"
                  variant="primary"
                  size="sm"
                  leftIcon={
                    <Ionicons
                      name="qr-code-outline"
                      size={16}
                      color={COLORS.surface}
                    />
                  }
                  onPress={() => setActivePassBatch(batch)}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Daftar Penjemputan Biomasa */}
      <SectionHeader
        title="Radar Permintaan Pickup Pakan"
        icon="radio-outline"
        iconColor={COLORS.accent}
        subtitle="Batch sisa pangan yang dialihkan ke Tier 2 pakan ternak"
      />

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
      ) : availableBatches.length === 0 ? (
        <StateView
          kind="empty"
          title="Belum ada biomasa pakan aktif di radius Anda"
          message="Batch yang dialihkan dari konsumsi manusia akan otomatis muncul di sini via WebSocket."
          actionLabel="Segarkan Radar"
          onAction={() => {
            void refetch();
          }}
        />
      ) : (
        availableBatches.map((batch) => {
          const isClaiming = claimingId === batch.id;
          const feedSavings = estimateFeedSavingsIdr(batch.total_weight_kg);

          return (
            <Card key={batch.id} padding="md" style={styles.feedCard}>
              <View style={styles.feedCardHeader}>
                <Badge status={batch.current_state} size="sm" />
                <CountdownBadge expiresAt={batch.tier2_expires_at} size="sm" />
              </View>

              <Text style={styles.feedTitle} numberOfLines={2}>
                {batch.batch_summary}
              </Text>

              <View style={styles.feedMetaRow}>
                <View style={styles.feedMetaItem}>
                  <Ionicons
                    name="scale-outline"
                    size={14}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.feedMetaText}>
                    {formatKg(batch.total_weight_kg)}
                  </Text>
                </View>
                <View style={styles.feedMetaItem}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.feedMetaText}>
                    Resto Melati • Dago (±250m)
                  </Text>
                </View>
              </View>

              <View style={styles.savingsBox}>
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>Hemat Pakan Komersial:</Text>
                  <Text style={styles.savingsValue}>{formatIdr(feedSavings)}</Text>
                </View>
                <Text style={styles.containerText}>
                  Wadah: {batch.recommended_container ?? "4 Drum Terpal Biru"}
                </Text>
              </View>

              <View style={styles.feedBtnWrapper}>
                <Button
                  label={
                    isClaiming
                      ? "Mengunci Hak Pakan..."
                      : "Klaim Pakan Ternak"
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

      {/* Modal QR Pass Penjemputan Pakan */}
      <Modal
        visible={activePassBatch !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActivePassBatch(null)}
      >
        <View style={[styles.modalScreen, { paddingTop: insets.top + 8 }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalHeaderTitle}>
                QR Pass Penjemputan Pakan
              </Text>
              <Text style={styles.modalHeaderSub}>
                {activePassBatch?.batch_summary}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup tiket pass"
              onPress={() => setActivePassBatch(null)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activePassBatch && activePassClaim ? (
              <DynamicQrTicket
                claim={activePassClaim}
                batch={activePassBatch}
                onExpired={() => {
                  showToast({
                    type: "warning",
                    title: "Tiket Pakan Kedaluwarsa",
                    message: "Batas waktu penjemputan telah berakhir.",
                  });
                  setActivePassBatch(null);
                }}
              />
            ) : null}

            <Button
              label="Tutup Tiket Pass"
              variant="outline"
              onPress={() => setActivePassBatch(null)}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bannerAmber: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.card,
    padding: 14,
    gap: 6,
    ...SHADOWS.sm,
  },
  bannerAmberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerAmberTag: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: COLORS.surface,
  },
  bannerAmberDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.92)",
    lineHeight: 16,
  },
  claimedSection: {
    gap: 8,
  },
  claimedCard: {
    gap: 8,
    borderColor: `${COLORS.primary}40`,
  },
  claimedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  claimedWeight: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  claimedTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.text,
  },
  claimedBtnWrapper: {
    marginTop: 2,
  },
  feedCard: {
    gap: 10,
    borderColor: `${COLORS.accent}40`,
    ...SHADOWS.sm,
  },
  feedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
  },
  feedMetaRow: {
    flexDirection: "row",
    gap: 12,
  },
  feedMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  feedMetaText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  savingsBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.input,
    padding: 10,
    gap: 4,
  },
  savingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  savingsLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  savingsValue: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.amberDark,
  },
  containerText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  feedBtnWrapper: {
    marginTop: 4,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalHeaderTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
  },
  modalHeaderSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
});
