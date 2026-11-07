import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY } from "@/config/theme";

export interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
  subtitle?: string;
}

export function SectionHeader({
  title,
  icon,
  iconColor = COLORS.primary,
  actionLabel,
  onAction,
  subtitle,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={iconColor}
            style={styles.iconMargin}
          />
        ) : null}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          onPress={onAction}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 6,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconMargin: {
    marginRight: 6,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 15,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
