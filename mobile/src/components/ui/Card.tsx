import { useRef, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { safeHaptics } from "@/utils/haptics";
import { COLORS, RADIUS, SHADOWS, SPACING } from "@/config/theme";

export type CardElevation = "flat" | "raised";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  children: ReactNode;
  elevation?: CardElevation;
  padding?: CardPadding;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
  accessibilityLabel?: string;
}

export function Card({
  children,
  elevation = "flat",
  padding = "md",
  onPress,
  style,
  accessibilityLabel,
}: CardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!onPress) return;
    safeHaptics.impactLight();
    onPress();
  };

  const cardStyle = [
    styles.card,
    elevation === "raised" && styles.raised,
    styles[`pad_${padding}`],
    style,
  ];

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={cardStyle}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  raised: {
    ...SHADOWS.md,
  },
  pad_none: {
    padding: 0,
  },
  pad_sm: {
    padding: SPACING.sm,
  },
  pad_md: {
    padding: SPACING.lg,
  },
  pad_lg: {
    padding: SPACING.xl,
  },
});
