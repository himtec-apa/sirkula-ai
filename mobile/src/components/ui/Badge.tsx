import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, TYPOGRAPHY } from "@/config/theme";
import { BatchState, ClaimStatus } from "@/types/sirkula";

export type BadgeStatus = BatchState | ClaimStatus;
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  status: BadgeStatus;
  size?: BadgeSize;
}

interface BadgeMeta {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const BADGE_META: Record<BadgeStatus, BadgeMeta> = {
  [BatchState.TIER_1_HUMAN_ACTIVE]: {
    label: "Tier 1: Aktif Manusia",
    dotColor: COLORS.success,
    bgColor: COLORS.successLight,
    textColor: COLORS.primaryDark,
    icon: "shield-checkmark",
  },
  [BatchState.TIER_1_CLAIMED]: {
    label: "Tier 1: Diklaim Simpul",
    dotColor: COLORS.info,
    bgColor: COLORS.infoLight,
    textColor: COLORS.info,
    icon: "bicycle",
  },
  [BatchState.TIER_2_ANIMAL_ACTIVE]: {
    label: "Tier 2: Pakan Ternak",
    dotColor: COLORS.accent,
    bgColor: COLORS.amberLight,
    textColor: COLORS.amberDark,
    icon: "leaf",
  },
  [BatchState.TIER_2_CLAIMED]: {
    label: "Tier 2: Diklaim Peternak",
    dotColor: COLORS.accent,
    bgColor: COLORS.amberLight,
    textColor: COLORS.amberDark,
    icon: "sync",
  },
  [BatchState.TIER_3_COMPOST_ACTIVE]: {
    label: "Tier 3: Kompos Organik",
    dotColor: COLORS.textMuted,
    bgColor: COLORS.background,
    textColor: COLORS.textMuted,
    icon: "trash",
  },
  [BatchState.COMPLETED]: {
    label: "Penyelamatan Selesai",
    dotColor: COLORS.info,
    bgColor: COLORS.infoLight,
    textColor: COLORS.info,
    icon: "checkmark-circle",
  },
  [BatchState.CANCELLED_BY_DONOR]: {
    label: "Dibatalkan / Kedaluwarsa",
    dotColor: COLORS.error,
    bgColor: COLORS.errorLight,
    textColor: COLORS.error,
    icon: "close-circle",
  },
  [ClaimStatus.ACTIVE_EN_ROUTE]: {
    label: "Kurir Menuju Lokasi",
    dotColor: COLORS.info,
    bgColor: COLORS.infoLight,
    textColor: COLORS.info,
    icon: "navigate",
  },
  [ClaimStatus.HANDOVER_COMPLETED]: {
    label: "Serah Terima Berhasil",
    dotColor: COLORS.success,
    bgColor: COLORS.successLight,
    textColor: COLORS.primaryDark,
    icon: "checkmark-done-circle",
  },
  [ClaimStatus.EXPIRED_AUTO_REVOKED]: {
    label: "Kedaluwarsa Otomatis",
    dotColor: COLORS.error,
    bgColor: COLORS.errorLight,
    textColor: COLORS.error,
    icon: "alert-circle",
  },
  [ClaimStatus.CANCELLED_BY_RECEIVER]: {
    label: "Klaim Dibatalkan",
    dotColor: COLORS.textMuted,
    bgColor: COLORS.background,
    textColor: COLORS.textMuted,
    icon: "remove-circle",
  },
};

export function Badge({ status, size = "md" }: BadgeProps) {
  const meta = BADGE_META[status] ?? {
    label: String(status),
    dotColor: COLORS.textMuted,
    bgColor: COLORS.background,
    textColor: COLORS.textMuted,
    icon: "information-circle",
  };

  const isSm = size === "sm";

  return (
    <View
      accessible
      accessibilityLabel={`Status: ${meta.label}`}
      style={[
        styles.badge,
        { backgroundColor: meta.bgColor, borderColor: meta.dotColor },
        isSm ? styles.badge_sm : styles.badge_md,
      ]}
    >
      <Ionicons
        name={meta.icon}
        size={isSm ? 12 : 14}
        color={meta.textColor}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          { color: meta.textColor },
          isSm ? styles.label_sm : styles.label_md,
        ]}
      >
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badge_sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badge_md: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
  },
  label_sm: {
    fontSize: 11,
    lineHeight: 14,
  },
  label_md: {
    fontSize: 12,
    lineHeight: 16,
  },
});
