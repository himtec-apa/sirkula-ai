import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StateView } from "@/components/ui/StateView";
import { fetchNearbyBatches, fetchEsgSummary } from "@/lib/api";
import { formatKg, formatPortions } from "@/lib/format";
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
  FOOD_RISK_LABELS,
  type BatchWithItems,
} from "@/types/sirkula";

export default function DonorHomeScreen() {
  const router = useRouter();
  const actor = useActorStore((state) => state.profiles[ActorRole.DONOR]);
  const actorHeaders = useActorHeaders();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.DONOR),
    queryFn: () => fetchNearbyBatches(ActorRole.DONOR, actorHeaders, 50000),
    staleTime: 15_000,
  });

  const { data: esgData } = useQuery({
    queryKey: ["esg-summary"],
    queryFn: fetchEsgSummary,
    staleTime: 15_000,
  });

  const batches = data ?? [];
  const activeBatches = batches.filter(
    (b) =>
      b.current_state !== BatchState.COMPLETED &&
      b.current_state !== BatchState.CANCELLED_BY_DONOR,
  );

  return (
    <ScreenContainer>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          gap: 14,
        }}
      >
        {/* Sapaan & Verified Partner Badge */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Halo, {actor.name}!</Text>
          <View style={styles.partnerBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
            <Text style={styles.partnerBadgeText}>
              Mitra Terverifikasi • Dago, Bandung
            </Text>
          </View>
        </View>

        {/* Hero CTA Ingesti Kamera */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka kamera ingesti makanan berlebih"
          onPress={() => router.push("/(donor)/camera")}
          style={styles.heroCard}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Decorative Translucent Concentric Rings */}
          <View style={styles.heroDecorRing1} />
          <View style={styles.heroDecorRing2} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <Ionicons name="camera" size={28} color={COLORS.surface} />
            </View>
            <View style={styles.speedPill}>
              <Ionicons name="flash" size={12} color={COLORS.surface} />
              <Text style={styles.speedText}>&lt;= 15 DETIK ZERO-UI</Text>
            </View>
          </View>

          <View style={styles.heroTextCol}>
            <Text style={styles.heroHeading}>Donasi Material Sekarang</Text>
            <Text style={styles.heroBody}>
              Ambil foto sajian atau wadah surplus. Vision AI mengestimasi
              porsi, berat, dan batas aman secara instan.
            </Text>
          </View>

          <View style={styles.heroWhiteBtn}>
            <Text style={styles.heroWhiteBtnText}>+ Donasi Material Sekarang</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </View>
        </Pressable>

        {/* Akses Cepat Scanner Pintu Loading Dock */}
        <Card
          padding="sm"
          onPress={() => router.push("/(donor)/scanner")}
          accessibilityLabel="Buka scanner serah terima loading dock"
        >
          <View style={styles.scannerRow}>
            <View style={styles.scannerIconBox}>
              <Ionicons name="qr-code" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.scannerTextCol}>
              <Text style={styles.scannerTitle}>Scan QR Kurir Loading Dock</Text>
              <Text style={styles.scannerSub}>
                Verifikasi blind handshake di basement (offline HMAC-SHA256)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>
        </Card>

        {/* Bagian Donasi Aktif */}
        <SectionHeader
          title="Donasi Aktif & Batas Waktu"
          icon="time-outline"
          actionLabel="Lihat Riwayat"
          onAction={() => router.push("/(donor)/history")}
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
        ) : activeBatches.length === 0 ? (
          <StateView
            kind="empty"
            title="Belum ada donasi aktif saat ini"
            message="Gunakan kamera ingest untuk merilis makanan berlebih pertama Anda."
            actionLabel="Buka Kamera Ingest"
            onAction={() => router.push("/(donor)/camera")}
          />
        ) : (
          activeBatches.map((batch) => {
            const now = Date.now();
            const exp = new Date(batch.tier1_expires_at).getTime();
            const created = new Date(batch.created_at).getTime();
            const totalSpan = Math.max(1, exp - created);
            const remaining = Math.max(0, exp - now);
            const progressRatio = Math.min(1, Math.max(0, remaining / totalSpan));

            return (
              <Card key={batch.id} padding="md" style={styles.batchCard}>
                <View style={styles.batchHeader}>
                  <Badge status={batch.current_state} size="sm" />
                  <CountdownBadge expiresAt={batch.tier1_expires_at} size="sm" />
                </View>

                <Text style={styles.batchName} numberOfLines={2}>
                  {batch.batch_summary}
                </Text>

                <View style={styles.batchMetaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons
                      name="restaurant-outline"
                      size={13}
                      color={COLORS.textMuted}
                    />
                    <Text style={styles.metaChipText}>
                      {formatPortions(batch.total_portions)}
                    </Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons
                      name="scale-outline"
                      size={13}
                      color={COLORS.textMuted}
                    />
                    <Text style={styles.metaChipText}>
                      {formatKg(batch.total_weight_kg)}
                    </Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons
                      name="thermometer-outline"
                      size={13}
                      color={COLORS.accent}
                    />
                    <Text style={styles.metaChipText}>
                      {batch.ambient_temp_c ?? 29.5}°C
                    </Text>
                  </View>
                </View>

                {/* Sisa Waktu Aman Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>Sisa Waktu Aman:</Text>
                    <Text style={styles.riskLabel}>
                      {FOOD_RISK_LABELS[batch.highest_risk_category]}
                    </Text>
                  </View>
                  <ProgressBar progress={progressRatio} height={7} />
                </View>

                {batch.current_state === BatchState.TIER_1_CLAIMED ? (
                  <Button
                    label="Scan QR Kurir yang Tiba"
                    variant="primary"
                    size="sm"
                    leftIcon={
                      <Ionicons
                        name="qr-code-outline"
                        size={16}
                        color={COLORS.surface}
                      />
                    }
                    onPress={() => router.push("/(donor)/scanner")}
                  />
                ) : null}
              </Card>
            );
          })
        )}

        {/* Dampak Kumulatif ESG */}
        <SectionHeader
          title="Dampak Kumulatif ESG"
          icon="earth-outline"
          subtitle="Hasil penyelamatan material terverifikasi"
        />

        <View style={styles.grid2x2}>
          <MetricCard
            label="Porsi Diselamatkan"
            value={esgData?.total_portions_saved ?? 60}
            unit="porsi"
            icon="restaurant"
            color={COLORS.primary}
            bgColor={COLORS.primaryLight}
            trend="+18% minggu ini"
          />
          <MetricCard
            label="Limbah Dicegah"
            value={esgData?.total_weight_saved_kg ?? 13}
            unit="kg"
            icon="scale"
            color={COLORS.accent}
            bgColor={COLORS.amberLight}
            trend="+12% minggu ini"
          />
          <MetricCard
            label="Emisi CO2e Ditekan"
            value={esgData?.co2e_avoided_kg ?? 32.5}
            unit="kg"
            icon="leaf"
            color={COLORS.blueDark}
            bgColor={COLORS.infoLight}
            trend="Faktor 2.5 kg/kg"
          />
          <MetricCard
            label="Nilai Pakan Maggot"
            value={esgData?.estimated_feed_savings_idr ?? 49400}
            prefix="Rp"
            icon="cash"
            color={COLORS.purple}
            bgColor={COLORS.purpleLight}
            trend="Rp 3.800 per kg"
          />
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  greetingSection: {
    marginBottom: 2,
  },
  greetingTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    alignSelf: "flex-start",
  },
  partnerBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  heroCard: {
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    padding: 20,
    ...SHADOWS.lg,
  },
  heroDecorRing1: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.surfaceLight15,
  },
  heroDecorRing2: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceLight20,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight20,
    justifyContent: "center",
    alignItems: "center",
  },
  speedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceLight20,
  },
  speedText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: COLORS.surface,
  },
  heroTextCol: {
    marginBottom: 16,
  },
  heroHeading: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.surface,
  },
  heroBody: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
    lineHeight: 18,
  },
  heroWhiteBtn: {
    flexDirection: "row",
    height: 46,
    borderRadius: RADIUS.button,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  heroWhiteBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
  },
  scannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 2,
  },
  scannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerTextCol: {
    flex: 1,
  },
  scannerTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 13,
    color: COLORS.text,
  },
  scannerSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  batchCard: {
    gap: 10,
  },
  batchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batchName: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
  },
  batchMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  metaChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  progressContainer: {
    gap: 4,
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  riskLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
});
