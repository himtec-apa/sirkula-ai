import { useMemo } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { useCountdown } from "@/hooks/useCountdown";
import { formatKg, formatPortions } from "@/lib/format";
import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from "@/config/theme";
import {
  FOOD_RISK_LABELS,
  type BatchWithItems,
} from "@/types/sirkula";

export interface BatchPreviewModalProps {
  visible: boolean;
  batch: BatchWithItems | null;
  imageUri?: string | null;
  isFallback?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchPreviewModal({
  visible,
  batch,
  imageUri,
  isFallback = false,
  isSubmitting = false,
  onClose,
  onConfirm,
}: BatchPreviewModalProps) {
  const insets = useSafeAreaInsets();

  const expiresAt = useMemo(() => {
    if (!batch) return 0;
    const parsed = Date.parse(batch.tier1_expires_at);
    return Number.isFinite(parsed)
      ? parsed
      : Date.now() + batch.safe_window_human_min * 60_000;
  }, [batch]);

  const { isExpired } = useCountdown(expiresAt);

  if (!batch) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup pratinjau"
          disabled={isSubmitting}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.modalContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerTitle}>Pratinjau Hasil AI Vision</Text>
              <Text style={styles.headerSubtitle}>
                Periksa rincian sebelum merilis batch ke radar simpul warga.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              disabled={isSubmitting}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isFallback ? (
              <View style={styles.fallbackBox}>
                <Ionicons name="warning" size={16} color={COLORS.warning} />
                <Text style={styles.fallbackText}>
                  Mode Demo Standalone: Data diproses via mesin model Q10 lokal.
                </Text>
              </View>
            ) : null}

            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
                accessibilityLabel="Foto makanan yang dipindai"
              />
            ) : null}

            <View style={styles.summaryBox}>
              <Text style={styles.batchSummaryTitle}>
                {batch.batch_summary}
              </Text>
              <Text style={styles.batchSummarySub}>
                {formatPortions(batch.total_portions)} • {formatKg(batch.total_weight_kg)}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Ionicons
                    name="thermometer-outline"
                    size={14}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.statLabel}>Suhu Ambien</Text>
                </View>
                <Text style={styles.statValue}>{batch.ambient_temp_c}°C</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Ionicons
                    name="water-outline"
                    size={14}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.statLabel}>Kelembapan</Text>
                </View>
                <Text style={styles.statValue}>{batch.humidity_pct}%</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailCardLabel}>Kategori Risiko Tertinggi</Text>
              <Text style={styles.detailCardValue}>
                {FOOD_RISK_LABELS[batch.highest_risk_category]}
              </Text>
              <Text style={[styles.detailCardLabel, { marginTop: 8 }]}>
                Rekomendasi Wadah Logistik
              </Text>
              <Text style={styles.detailCardValue}>
                {batch.recommended_container ?? "2 Box Kontainer Besar"}
              </Text>
            </View>

            <View style={styles.countdownCenterCard}>
              <Text style={styles.countdownTitle}>
                Sisa Batas Aman Konsumsi Manusia (Bio-Termal)
              </Text>
              <View style={styles.countdownWrapper}>
                <CountdownBadge expiresAt={batch.tier1_expires_at} size="lg" />
              </View>
              <Text style={styles.countdownDesc}>
                Dihitung dari laju pembusukan Q10 (safe window {batch.safe_window_human_min} menit).
              </Text>
            </View>

            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>Rincian Menu Ekstraksi AI:</Text>
              {batch.items.map((item) => (
                <View key={item.id} style={styles.menuItemCard}>
                  <View style={styles.menuItemTop}>
                    <Text style={styles.menuItemName}>{item.menu_name}</Text>
                    <Text style={styles.menuItemPortions}>
                      {formatPortions(item.estimated_portions)} • {formatKg(item.estimated_weight_kg)}
                    </Text>
                  </View>
                  <Text style={styles.menuItemCategory}>
                    {FOOD_RISK_LABELS[item.category]} •{" "}
                    {item.contains_coconut_milk ? "Mengandung santan" : "Tanpa santan"}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <View style={styles.footerBtn}>
              <Button
                label="Batal"
                variant="outline"
                disabled={isSubmitting}
                onPress={onClose}
              />
            </View>
            <View style={styles.footerBtn}>
              <Button
                label={isExpired ? "Batas Aman Habis" : "Rilis Donasi"}
                variant="primary"
                isLoading={isSubmitting}
                disabled={isExpired}
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlayBackdrop,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: "90%",
    ...SHADOWS.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  fallbackBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.amberLight,
    padding: 10,
    borderRadius: RADIUS.input,
  },
  fallbackText: {
    flex: 1,
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.amberDark,
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.background,
  },
  summaryBox: {
    gap: 2,
  },
  batchSummaryTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  batchSummarySub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: 2,
  },
  detailCard: {
    padding: 12,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailCardLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  detailCardValue: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.text,
    marginTop: 2,
  },
  countdownCenterCard: {
    alignItems: "center",
    padding: 14,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countdownTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primaryDark,
    textAlign: "center",
  },
  countdownWrapper: {
    marginVertical: 6,
  },
  countdownDesc: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  menuSection: {
    gap: 8,
  },
  menuSectionTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  menuItemCard: {
    padding: 10,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuItemName: {
    ...TYPOGRAPHY.h3,
    fontSize: 13,
    color: COLORS.text,
  },
  menuItemPortions: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.primary,
  },
  menuItemCategory: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerBtn: {
    flex: 1,
  },
});
