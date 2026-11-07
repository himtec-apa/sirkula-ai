import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCountdown } from "@/hooks/useCountdown";
import { formatDuration } from "@/lib/format";
import { COLORS, MONO_FALLBACK, RADIUS, TYPOGRAPHY } from "@/config/theme";

export interface CountdownBadgeProps {
  expiresAt: string | number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function CountdownBadge({
  expiresAt,
  label,
  size = "md",
}: CountdownBadgeProps) {
  const { remainingMs, isExpired } = useCountdown(expiresAt);
  const formatted = formatDuration(remainingMs);
  const isUrgent = remainingMs <= 15 * 60_000 && remainingMs > 0;

  const color = isExpired
    ? COLORS.error
    : isUrgent
      ? COLORS.warning
      : COLORS.success;

  const bgColor = isExpired
    ? COLORS.errorLight
    : isUrgent
      ? COLORS.amberLight
      : COLORS.successLight;

  if (size === "lg") {
    return (
      <View
        accessible
        accessibilityLabel={`Sisa waktu: ${formatted}`}
        style={[styles.boxLg, { borderColor: color }]}
      >
        {label ? <Text style={styles.labelLg}>{label}</Text> : null}
        <Text style={[styles.timerLg, { color }]}>{formatted}</Text>
      </View>
    );
  }

  const isSm = size === "sm";

  return (
    <View
      accessible
      accessibilityLabel={`Sisa waktu: ${formatted}`}
      style={[
        styles.badge,
        { backgroundColor: bgColor, borderColor: color },
        isSm && styles.badgeSm,
      ]}
    >
      <Ionicons
        name="time-outline"
        size={isSm ? 12 : 14}
        color={color}
        style={styles.iconMargin}
      />
      <Text
        style={[
          styles.timerText,
          { color },
          isSm && styles.timerTextSm,
        ]}
      >
        {formatted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  iconMargin: {
    marginRight: 4,
  },
  timerText: {
    fontFamily: MONO_FALLBACK,
    fontSize: 12,
    fontWeight: "700",
  },
  timerTextSm: {
    fontSize: 11,
  },
  boxLg: {
    alignItems: "center",
    padding: 16,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    backgroundColor: COLORS.surface,
  },
  labelLg: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  timerLg: {
    fontFamily: MONO_FALLBACK,
    fontSize: 32,
    fontWeight: "700",
  },
});
