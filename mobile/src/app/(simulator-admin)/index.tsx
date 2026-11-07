import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StateView } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { fetchNearbyBatches, timeWarpSimulation } from "@/lib/api";
import { formatDateTime, formatKg } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, FONTS, RADIUS, TYPOGRAPHY } from "@/config/theme";
import { useActorHeaders } from "@/store/useActorStore";
import {
  ActorRole,
  BatchState,
  type BatchWithItems,
} from "@/types/sirkula";

export default function SimulatorHomeScreen() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const actorHeaders = useActorHeaders();

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [overrideTemp, setOverrideTemp] = useState<number>(35);

  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.SIMULATOR_ADMIN),
    queryFn: () =>
      fetchNearbyBatches(ActorRole.SIMULATOR_ADMIN, actorHeaders, 15000),
    staleTime: 10_000,
  });

  const batches = data ?? [];

  // Active batches eligible for simulation (Tier 1 or Tier 2)
  const activeBatches = useMemo(
    () =>
      batches.filter(
        (b) =>
          b.current_state === BatchState.TIER_1_HUMAN_ACTIVE ||
          b.current_state === BatchState.TIER_1_CLAIMED ||
          b.current_state === BatchState.TIER_2_ANIMAL_ACTIVE ||
          b.current_state === BatchState.TIER_2_CLAIMED ||
          b.current_state === BatchState.TIER_3_COMPOST_ACTIVE,
      ),
    [batches],
  );

  const selectedBatch = useMemo(
    () =>
      activeBatches.find((b) => b.id === selectedBatchId) ??
      activeBatches[0] ??
      null,
    [activeBatches, selectedBatchId],
  );

  const q10Factor = useMemo(() => {
    const temp = overrideTemp;
    return Math.pow(2.2, (temp - 25) / 10).toFixed(2);
  }, [overrideTemp]);

  const simMutation = useMutation({
    mutationFn: timeWarpSimulation,
    onSuccess: (res) => {
      showToast({
        kind: "success",
        title: "Simulasi Berhasil Diterapkan",
        message: res.message || "State batch dan timer Q₁₀ diperbarui di backend.",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.batches.listPrefix,
      });
      void refetch();
    },
    onError: (err) => {
      showToast({
        kind: "error",
        title: "Simulasi Gagal",
        message:
          err instanceof Error ? err.message : "Gagal menjalankan mutasi God-Mode.",
      });
    },
  });

  const handleApplyTemp = () => {
    if (!selectedBatch) return;
    simMutation.mutate({
      batchId: selectedBatch.id,
      overrideTempC: overrideTemp,
      notes: `Suhu dinaikkan ke ${overrideTemp}°C via Mobile Simulator (Q10 factor: ${q10Factor}x)`,
    });
  };

  const handleTriggerSpoilageTier2 = () => {
    if (!selectedBatch) return;
    simMutation.mutate({
      batchId: selectedBatch.id,
      forceExpireTier1: true,
      notes: "Dewan Juri Trigger: Instant Spoilage ke Tier 2 (Pakan Ternak)",
    });
  };

  const handleTriggerCompostTier3 = () => {
    if (!selectedBatch) return;
    simMutation.mutate({
      batchId: selectedBatch.id,
      forceExpireTier2: true,
      notes: "Dewan Juri Trigger: Instant Spoilage ke Tier 3 (Biomasa Kompos)",
    });
  };

  return (
    <ScreenContainer
      title="God-Mode Simulator"
      subtitle="Pengendali intervensi simulasi dewan juri, percepatan waktu Arrhenius Q₁₀, dan mutasi multi-tier."
    >
      <SectionHeader
        title="Batch Sasaran Intervensi"
        actionLabel="Segarkan"
        onAction={() => {
          void refetch();
        }}
      />

      {isLoading ? (
        <StateView kind="loading" message="Memuat batch dalam radar..." />
      ) : isError ? (
        <StateView
          kind="error"
          actionLabel="Coba Lagi"
          onAction={() => {
            void refetch();
          }}
        />
      ) : activeBatches.length === 0 ? (
        <StateView
          kind="empty"
          title="Tidak Ada Batch Aktif"
          message="Buat batch donasi baru dari akun Donatur untuk melakukan simulasi degradasi mikrobiologis."
        />
      ) : (
        <>
          {/* Horizontal Batch Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorScroll}
          >
            {activeBatches.map((b) => {
              const isSelected = selectedBatch?.id === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setSelectedBatchId(b.id)}
                  style={[
                    styles.selectorCard,
                    isSelected && styles.selectorCardSelected,
                  ]}
                >
                  <Badge status={b.current_state} size="sm" />
                  <Text numberOfLines={1} style={styles.selectorTitle}>
                    {b.batch_summary}
                  </Text>
                  <Text style={styles.selectorSub}>
                    {formatKg(b.total_weight_kg)} · {b.ambient_temp_c ?? 29}°C
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Active Batch Control Panel */}
          {selectedBatch && (
            <Card padding="md" style={styles.controlCard}>
              <View style={styles.cardHeader}>
                <View style={styles.godBadge}>
                  <Ionicons name="flash" size={14} color={COLORS.warning} />
                  <Text style={styles.godBadgeText}>GOD-MODE ACTIVE</Text>
                </View>
                <Badge status={selectedBatch.current_state} size="sm" />
              </View>

              <Text style={styles.controlTitle}>{selectedBatch.batch_summary}</Text>

              {/* Bio-thermal parameters */}
              <View style={styles.paramsGrid}>
                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>Suhu Saat Ini</Text>
                  <Text style={styles.paramValue}>
                    {selectedBatch.ambient_temp_c ?? 29}°C
                  </Text>
                </View>
                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>Kelembapan</Text>
                  <Text style={styles.paramValue}>
                    {selectedBatch.humidity_pct ?? 75}%
                  </Text>
                </View>
                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>Jendela Aman Tier 1</Text>
                  <CountdownBadge
                    expiresAt={selectedBatch.tier1_expires_at}
                    size="sm"
                  />
                </View>
              </View>

              {/* Temperature Override Stepper */}
              <View style={styles.tempSection}>
                <View style={styles.tempHeader}>
                  <Text style={styles.tempTitle}>Override Suhu Lingkungan</Text>
                  <Text style={styles.tempDisplay}>{overrideTemp}°C</Text>
                </View>
                <Text style={styles.q10Formula}>
                  Laju pembusukan Arrhenius Q₁₀:{" "}
                  <Text style={styles.q10Highlight}>{q10Factor}× lebih cepat</Text>
                </Text>

                <View style={styles.stepperRow}>
                  <Button
                    title="-2°C"
                    variant="outline"
                    onPress={() => setOverrideTemp((t) => Math.max(20, t - 2))}
                    style={styles.stepBtn}
                  />
                  <Button
                    title="+2°C"
                    variant="outline"
                    onPress={() => setOverrideTemp((t) => Math.min(45, t + 2))}
                    style={styles.stepBtn}
                  />
                  <Button
                    title="+5°C (Gelombang Panas)"
                    variant="outline"
                    onPress={() => setOverrideTemp((t) => Math.min(45, t + 5))}
                    style={styles.stepBtnWide}
                  />
                </View>

                <Button
                  title="Terapkan Override Suhu ke Backend"
                  variant="primary"
                  loading={simMutation.isPending}
                  onPress={handleApplyTemp}
                  style={{ marginTop: 12 }}
                />
              </View>

              {/* Instant Spoilage Buttons */}
              <View style={styles.actionButtons}>
                <Button
                  title="⚡ TRIGGER INSTANT SPOILAGE (TIER 2 - PAKAN)"
                  variant="danger"
                  loading={simMutation.isPending}
                  onPress={handleTriggerSpoilageTier2}
                />
                <Button
                  title="⚡ TRIGGER COMPOST DECAY (TIER 3 - KOMPOS)"
                  variant="warning"
                  loading={simMutation.isPending}
                  onPress={handleTriggerCompostTier3}
                />
              </View>
            </Card>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  selectorScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  selectorCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 160,
    maxWidth: 200,
  },
  selectorCardSelected: {
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.light,
  },
  selectorTitle: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  selectorSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  controlCard: {
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  godBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  godBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: "#b45309",
  },
  controlTitle: {
    ...TYPOGRAPHY.subtitle,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  paramsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  paramBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  paramLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  paramValue: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  tempSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginBottom: 16,
  },
  tempHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  tempTitle: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  tempDisplay: {
    ...TYPOGRAPHY.subtitle,
    fontFamily: FONTS.monoBold,
    color: COLORS.primaryDark,
  },
  q10Formula: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  q10Highlight: {
    fontFamily: FONTS.bold,
    color: COLORS.danger,
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepBtn: {
    flex: 1,
  },
  stepBtnWide: {
    flex: 1.5,
  },
  actionButtons: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 8,
  },
});
