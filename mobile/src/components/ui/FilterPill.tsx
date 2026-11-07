import { Pressable, StyleSheet, Text } from "react-native";
import { safeHaptics } from "@/utils/haptics";
import { COLORS, RADIUS, TYPOGRAPHY } from "@/config/theme";

export interface FilterPillProps {
  label: string;
  isActive?: boolean;
  active?: boolean;
  onPress: () => void;
  count?: number;
}

export function FilterPill({
  label,
  isActive,
  active,
  onPress,
  count,
}: FilterPillProps) {
  const isSelected = isActive ?? active ?? false;

  const handlePress = () => {
    safeHaptics.impactLight();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={handlePress}
      style={[styles.pill, isSelected ? styles.activePill : styles.inactivePill]}
    >
      <Text style={[styles.text, isSelected ? styles.activeText : styles.inactiveText]}>
        {label}
        {typeof count === "number" ? ` (${count})` : ""}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  activePill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  inactivePill: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  text: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
  },
  activeText: {
    color: COLORS.surface,
  },
  inactiveText: {
    color: COLORS.textMuted,
  },
});
