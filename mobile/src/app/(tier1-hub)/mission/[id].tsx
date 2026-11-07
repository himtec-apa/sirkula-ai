import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { DynamicQrTicket } from "@/components/shared/DynamicQrTicket";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchBatchDetail } from "@/lib/api";
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
  type RescueClaim,
} from "@/types/sirkula";

export default function MissionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActorStore((state) => state.profiles[ActorRole.TIER_1_HUB]);
  const actorHeaders = useActorHeaders();

  const [isTransitioned, setIsTransitioned] = useState(false);

  const { data: batch, isLoading } = useQuery<BatchWithItems>({
    queryKey: queryKeys.batches.detail(id ?? ""),
    queryFn: () => fetchBatchDetail(id ?? "", actorHeaders),
    enabled: Boolean(id),
    staleTime: 15_000,
  });

  const claim: RescueClaim | null = useMemo(() => {
    return batch?.active_claim ?? null;
  }, [batch?.active_claim]);

  const isExpiredByTime = useMemo(() => {
    if (!batch) return false;
    const expiresAt = new Date(batch.tier1_expires_at).getTime();
    return expiresAt <= Date.now();
  }, [batch]);

  const isLocked =
    isTransitioned ||
    isExpiredByTime ||
    batch?.current_state === BatchState.TIER_2_ANIMAL_ACTIVE ||
    batch?.current_state === BatchState.TIER_3_COMPOST_ACTIVE;

  const handleContactDonor = () => {
    const phone = batch?.donor?.phone_whatsapp ?? "+6281210000001";
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const message = encodeURIComponent(
      `Halo Donatur SIRKULA-AI, saya dari ${actor.name}. Kami sedang menuju ke loading dock untuk penjemputan batch: ${
        batch?.batch_summary ?? "Misi Pangan"
      }.`,
    );
    const whatsappUrl = `https://wa.me/${cleanPhone.replace("+", "")}?text=${message}`;

    void Linking.openURL(whatsappUrl).catch(() => {
      void Linking.openURL(`tel:${cleanPhone}`);
    });
  };

  if (isLocked) {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={styles.lockedContainer}
      >
        <View style={styles.alertIconCircle}>
          <Ionicons name="alert-circle" size={48} color={COLORS.surface} />
        </View>

        <Text style={styles.lockedHeading}>
          Waktu Aman Habis: Misi Dialihkan
        </Text>

        <View style={styles.lockedBox}>
          <View style={styles.lockedBoxTop}>
            <Text style={styles.lockedBoxLabel}>Status Baru</Text>
            <Text style={styles.lockedBoxTier}>TIER_2_ANIMAL_ACTIVE</Text>
          </View>
          <Text style={styles.lockedBoxDesc}>
            Batas aman konsumsi manusia telah berakhir. Demi keselamatan pangan,
            tiket serah terima dibatalkan otomatis dan batch dialihkan ke
            peternak pakan ternak.
          </Text>
        </View>

        <View style={styles.lockedBtnWrapper}>
          <Button
            label="Kembali ke Radar"
            variant="secondary"
            onPress={() => router.replace("/(tier1-hub)")}
          />
        </View>
      </View>
    );
  }

  if (isLoading || !batch) {
    return (
      <ScreenContainer
        title="Detail Misi Penjemputan"
        subtitle="Memuat tiket QR dan instruksi loading dock..."
      >
        <Card padding="md">
          <Skeleton height={24} width="70%" borderRadius={8} />
          <Skeleton height={14} width="90%" borderRadius={6} style={{ marginTop: 8 }} />
          <Skeleton height={180} borderRadius={16} style={{ marginTop: 16 }} />
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Detail Misi Penjemputan"
      subtitle="Tunjukkan tiket QR di titik serah terima donatur."
      rightSlot={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke radar misi"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="close" size={20} color={COLORS.text} />
        </Pressable>
      }
    >
      <View style={styles.topStatusRow}>
        <Badge status={BatchState.TIER_1_CLAIMED} size="md" />
        <View style={styles.confirmedPill}>
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={COLORS.primary}
          />
          <Text style={styles.confirmedText}>Klaim Terkonfirmasi</Text>
        </View>
      </View>

      <Card padding="md">
        <Text style={styles.batchTitle}>{batch.batch_summary}</Text>
        <Text style={styles.batchIdText}>ID Batch: {batch.id}</Text>

        <View style={styles.chipsRow}>
          <View style={styles.infoChip}>
            <Text style={styles.chipLabel}>Total Porsi</Text>
            <Text style={styles.chipVal}>
              {formatPortions(batch.total_portions)}
            </Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.chipLabel}>Estimasi Berat</Text>
            <Text style={styles.chipVal}>{formatKg(batch.total_weight_kg)}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.chipLabel}>Kategori Risiko</Text>
            <Text style={styles.chipVal}>
              {FOOD_RISK_LABELS[batch.highest_risk_category]}
            </Text>
          </View>
        </View>

        <View style={styles.containerBox}>
          <Ionicons name="cube-outline" size={15} color={COLORS.primary} />
          <Text style={styles.containerText}>
            Rekomendasi Wadah:{" "}
            {batch.recommended_container ?? "2 Box Kontainer Besar"}
          </Text>
        </View>
      </Card>

      {claim ? (
        <DynamicQrTicket
          claim={claim}
          batch={batch}
          onExpired={() => setIsTransitioned(true)}
        />
      ) : (
        <Card padding="md" style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
          <Ionicons name="time-outline" size={32} color={COLORS.primary} />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text }}>
            Tiket Klaim Sedang Disiapkan
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: "center" }}>
            Data klaim sedang diproses langsung oleh sistem database PostgreSQL SIRKULA-AI.
          </Text>
        </Card>
      )}

      <Card padding="md">
        <Text style={styles.menuTitle}>Daftar Menu Makanan</Text>
        <View style={styles.menuList}>
          {batch.items.map((item) => (
            <View key={item.id} style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <Text style={styles.menuName}>{item.menu_name}</Text>
                <Text style={styles.menuSub}>
                  {item.contains_coconut_milk
                    ? "Mengandung santan"
                    : "Tanpa santan"}
                </Text>
              </View>
              <Text style={styles.menuRight}>
                {formatPortions(item.estimated_portions)} • {formatKg(item.estimated_weight_kg)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.bottomActions}>
        <Button
          label="Hubungi Donatur (WhatsApp)"
          variant="outline"
          leftIcon={
            <Ionicons name="logo-whatsapp" size={18} color={COLORS.success} />
          }
          onPress={handleContactDonor}
        />
        <Button
          label="Kembali ke Radar"
          variant="secondary"
          onPress={() => router.replace("/(tier1-hub)")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  topStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },
  confirmedText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  batchTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  batchIdText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  infoChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  chipLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  chipVal: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 1,
  },
  containerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: RADIUS.input,
    marginTop: 10,
  },
  containerText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  menuTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  menuList: {
    gap: 8,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  menuLeft: {
    flex: 1,
  },
  menuName: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  menuSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  menuRight: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  bottomActions: {
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  lockedContainer: {
    flex: 1,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  alertIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  lockedHeading: {
    ...TYPOGRAPHY.h1,
    color: COLORS.surface,
    textAlign: "center",
  },
  lockedBox: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: RADIUS.card,
    padding: 16,
    marginVertical: 20,
    width: "100%",
  },
  lockedBoxTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  lockedBoxLabel: {
    ...TYPOGRAPHY.caption,
    color: "rgba(255, 255, 255, 0.8)",
  },
  lockedBoxTier: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.amberLight,
  },
  lockedBoxDesc: {
    ...TYPOGRAPHY.caption,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
  },
  lockedBtnWrapper: {
    width: "100%",
  },
});
