import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { DynamicQrTicket } from "@/components/shared/DynamicQrTicket";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StateView } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { ClaimConflictError, claimBatch, fetchNearbyBatches } from "@/lib/api";
import { formatKg } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, FONTS, RADIUS, SHADOWS, TYPOGRAPHY } from "@/config/theme";
import { useActorHeaders, useActorStore } from "@/store/useActorStore";
import {
  ActorRole,
  BatchState,
  ClaimStatus,
  type BatchWithItems,
  type RescueClaim,
} from "@/types/sirkula";

export default function CompostHomeScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const actor = useActorStore(
    (state) => state.profiles[ActorRole.TIER_3_COMPOST],
  );
  const actorHeaders = useActorHeaders();

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activePassBatch, setActivePassBatch] = useState<BatchWithItems | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.TIER_3_COMPOST),
    queryFn: () =>
      fetchNearbyBatches(
        ActorRole.TIER_3_COMPOST,
        actorHeaders,
        10000,
        {
          latitude: actor.location.coordinates[1],
          longitude: actor.location.coordinates[0],
        },
      ),
    staleTime: 15_000,
  });

  const batches = (data ?? []).filter((b, idx, self) => b?.id && self.findIndex((x) => x.id === b.id) === idx);

  const availableBatches = useMemo(
    () =>
      batches.filter((b) => b.current_state === BatchState.TIER_3_COMPOST_ACTIVE),
    [batches],
  );

  const totalBiomassKg = useMemo(
    () => availableBatches.reduce((acc, curr) => acc + (curr.total_weight_kg || 0), 0),
    [availableBatches],
  );

  const totalCh4AvoidedKg = useMemo(
    () => (totalBiomassKg * 0.05).toFixed(2),
    [totalBiomassKg],
  );

  const claimMutation = useMutation({
    mutationFn: (batchId: string) =>
      claimBatch({
        batchId,
        actorHeaders,
      }),
    onMutate: (batchId) => {
      setClaimingId(batchId);
    },
    onSuccess: ({ claim, batch }) => {
      showToast({
        kind: "success",
        title: "Klaim Biomasa Kompos Berhasil",
        message: "Tiket QR dinamis telah dibuat untuk serah-terima di lokasi donatur.",
      });

      queryClient.setQueryData<BatchWithItems[]>(
        queryKeys.batches.list(ActorRole.TIER_3_COMPOST),
        (current) => {
          if (!current) return [batch];
          return current.map((item) => (item.id === batch.id ? batch : item));
        },
      );

      setActivePassBatch(batch);
    },
    onError: (err) => {
      if (err instanceof ClaimConflictError) {
        showToast({
          kind: "error",
          title: "Sudah Diklaim",
          message: err.message,
        });
      } else {
        showToast({
          kind: "error",
          title: "Klaim Gagal",
          message:
            err instanceof Error
              ? err.message
              : "Terjadi gangguan saat memproses klaim.",
        });
      }
    },
    onSettled: () => {
      setClaimingId(null);
    },
  });

  return (
    <ScreenContainer
      title="Radar Biomasa Kompos"
      subtitle="Penyelamatan biomasa terdegradasi untuk pembuatan pupuk organik aerobik."
    >
      {/* Metric Highlights */}
      <View style={styles.metricsGrid}>
        <Card padding="md" style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Biomasa Siap Ambil</Text>
          <Text style={styles.metricValue}>{formatKg(totalBiomassKg)}</Text>
          <Text style={styles.metricSub}>Biomasa non-pangan kota</Text>
        </Card>
        <Card padding="md" style={styles.metricCard}>
          <Text style={styles.metricLabel}>Potensi Reduksi CH₄</Text>
          <Text style={[styles.metricValue, { color: COLORS.warning }]}>
            {totalCh4AvoidedKg} kg
          </Text>
          <Text style={styles.metricSub}>Cegah pembusukan anaerob TPA</Text>
        </Card>
      </View>

      <SectionHeader
        title="Biomasa Tersedia (Tier 3)"
        actionLabel="Segarkan"
        onAction={() => {
          void refetch();
        }}
      />

      {isLoading ? (
        <StateView kind="loading" message="Memindai biomasa kompos di sekitar..." />
      ) : isError ? (
        <StateView
          kind="error"
          title="Gagal Memuat Data"
          message="Tidak dapat menghubungkan ke radar biomasa kompos."
          actionLabel="Coba Lagi"
          onAction={() => {
            void refetch();
          }}
        />
      ) : availableBatches.length === 0 ? (
        <StateView
          kind="empty"
          title="Belum Ada Biomasa Kompos"
          message="Batch makanan yang telah melewati batas aman pakan ternak akan otomatis dialihkan ke Tier 3 di sini."
        />
      ) : (
        availableBatches.map((batch) => {
          const hasActiveClaim =
            batch.active_claim?.status === ClaimStatus.ACTIVE_EN_ROUTE;

          return (
            <Card key={batch.id} padding="md" style={styles.batchCard}>
              <View style={styles.batchHeader}>
                <Badge status={batch.current_state} size="sm" />
                <Text style={styles.weightBadge}>
                  {formatKg(batch.total_weight_kg)}
                </Text>
              </View>

              <Text style={styles.batchTitle}>{batch.batch_summary}</Text>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.infoText}>
                  {batch.handover_point_notes || "Lokasi tersamarkan (radius aman)"}
                </Text>
              </View>

              <View style={styles.actionRow}>
                {hasActiveClaim ? (
                  <Button
                    title="Buka Tiket QR"
                    variant="outline"
                    onPress={() => setActivePassBatch(batch)}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <Button
                    title={claimingId === batch.id ? "Memproses..." : "Klaim Biomasa Kompos"}
                    variant="primary"
                    loading={claimingId === batch.id}
                    disabled={claimMutation.isPending}
                    onPress={() => claimMutation.mutate(batch.id)}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
            </Card>
          );
        })
      )}

      {/* Dynamic QR Ticket Modal */}
      {activePassBatch && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          visible={Boolean(activePassBatch)}
          onRequestClose={() => setActivePassBatch(null)}
        >
          <View style={[styles.modalRoot, { paddingTop: Math.max(insets.top, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tiket Penyerahan Biomasa</Text>
              <Pressable
                accessibilityLabel="Tutup tiket"
                onPress={() => setActivePassBatch(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <DynamicQrTicket
                batch={activePassBatch}
                claim={
                  activePassBatch.active_claim ??
                  ({
                    id: "claim-temp",
                    batch_id: activePassBatch.id,
                    receiver_id: actor.id,
                    claimed_for_tier: "TIER_3_COMPOST",
                    status: ClaimStatus.ACTIVE_EN_ROUTE,
                    qr_token_hash: "",
                    qr_expires_at: new Date(Date.now() + 45 * 60_000).toISOString(),
                    claimed_at: new Date().toISOString(),
                    handover_scanned_at: null,
                    handover_ambient_temp_c: null,
                    handover_scan_location: null,
                    liability_waiver_accepted: true,
                    waiver_signature_hash: null,
                    revocation_reason: null,
                    updated_at: new Date().toISOString(),
                  } satisfies RescueClaim)
                }
                onExpired={() => {
                  showToast({
                    kind: "warning",
                    title: "Tiket Kedaluwarsa",
                    message: "Batas waktu tiket QR telah habis.",
                  });
                  setActivePassBatch(null);
                  void refetch();
                }}
              />
            </ScrollView>
          </View>
        </Modal>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  metricValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  batchCard: {
    marginBottom: 12,
  },
  batchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  weightBadge: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.primaryDark,
    fontFamily: FONTS.bold,
  },
  batchTitle: {
    ...TYPOGRAPHY.body,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 6,
  },
  modalBody: {
    padding: 20,
  },
});
