import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, TYPOGRAPHY } from "@/config/theme";

export interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  trend?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  prefix,
  icon,
  color,
  bgColor,
  trend,
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const steps = 20;
    const increment = value / steps;
    const stepTime = duration / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  const formattedNum =
    displayValue >= 1000
      ? displayValue.toLocaleString("id-ID")
      : String(displayValue);

  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      <View style={[styles.iconWrapper, { backgroundColor: `${color}25` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.valueText}>
        {prefix ? `${prefix} ` : ""}
        {formattedNum}
        {unit ? ` ${unit}` : ""}
      </Text>
      <Text style={styles.labelText}>{label}</Text>
      {trend ? (
        <View style={styles.trendRow}>
          <Ionicons name="trending-up" size={12} color={COLORS.primaryDark} />
          <Text style={styles.trendText}>{trend}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    borderRadius: RADIUS.card,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  valueText: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    lineHeight: 22,
    color: COLORS.text,
  },
  labelText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  trendText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
});
