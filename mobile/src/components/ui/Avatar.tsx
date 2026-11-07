import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY } from "@/config/theme";

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  isVerified?: boolean;
  accentColor?: string;
}

export function Avatar({
  name,
  size = "md",
  isVerified = true,
  accentColor = COLORS.primary,
}: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dimensions = size === "sm" ? 36 : size === "md" ? 44 : 56;
  const fontSize = size === "sm" ? 13 : size === "md" ? 16 : 20;

  return (
    <View style={{ width: dimensions, height: dimensions }}>
      <View
        style={[
          styles.circle,
          {
            width: dimensions,
            height: dimensions,
            borderRadius: dimensions / 2,
            backgroundColor: `${accentColor}18`,
            borderColor: accentColor,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize, color: accentColor }]}>
          {initials || "SA"}
        </Text>
      </View>
      {isVerified ? (
        <View style={styles.verifiedDot}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    ...TYPOGRAPHY.h3,
    fontWeight: "700",
  },
  verifiedDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    backgroundColor: COLORS.surface,
    borderRadius: 7,
  },
});
