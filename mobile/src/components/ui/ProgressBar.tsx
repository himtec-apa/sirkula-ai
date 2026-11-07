import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { COLORS, RADIUS } from "@/config/theme";

export interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  colorScheme?: "safe_decay" | "primary" | "accent";
}

export function ProgressBar({
  progress,
  height = 6,
  colorScheme = "safe_decay",
}: ProgressBarProps) {
  const animatedWidth = useRef(new Animated.Value(Math.min(1, Math.max(0, progress)))).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [animatedWidth, progress]);

  let barColor: string;
  if (colorScheme === "safe_decay") {
    if (progress > 0.5) {
      barColor = COLORS.success;
    } else if (progress > 0.2) {
      barColor = COLORS.warning;
    } else {
      barColor = COLORS.error;
    }
  } else if (colorScheme === "accent") {
    barColor = COLORS.accent;
  } else {
    barColor = COLORS.primary;
  }

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.track, { height }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolation,
            backgroundColor: barColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: RADIUS.pill,
  },
});
