import { Platform, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCountdown } from "@/hooks/useCountdown";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import { COLORS } from "@/lib/theme";

export interface CountdownTimerProps {
  expiresAt: string | number;
  label?: string;
  variant?: "compact" | "large";
}

const MONOSPACE = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const URGENT_THRESHOLD_MS = 15 * 60_000;

export function CountdownTimer({
  expiresAt,
  label,
  variant = "compact",
}: CountdownTimerProps) {
  const { remainingMs, isExpired } = useCountdown(expiresAt);
  const formatted = formatDuration(remainingMs);
  const isUrgent = remainingMs <= URGENT_THRESHOLD_MS;
  const colorClass = isExpired
    ? "text-error-700"
    : isUrgent
      ? "text-warning-700"
      : "text-success-700";

  if (variant === "large") {
    return (
      <View
        accessible
        accessibilityLabel={`Sisa waktu aman ${formatted}`}
        className="items-center"
      >
        <Text
          className={cn("text-4xl font-bold", colorClass)}
          style={{ fontFamily: MONOSPACE }}
        >
          {formatted}
        </Text>
        <Text className="mt-1 text-xs text-text-muted">
          {label ?? "Sisa batas aman konsumsi manusia"}
        </Text>
        {isExpired ? (
          <Text className="mt-2 text-center text-sm font-semibold text-error-700">
            Batas aman telah terlewati.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={`Sisa waktu aman ${formatted}`}
      className="flex-row items-center gap-1"
    >
      <Ionicons
        name="time-outline"
        size={14}
        color={
          isExpired
            ? COLORS.error700
            : isUrgent
              ? COLORS.warning700
              : COLORS.success700
        }
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        className={cn("text-xs font-semibold", colorClass)}
        style={{ fontFamily: MONOSPACE }}
      >
        {formatted}
      </Text>
    </View>
  );
}
