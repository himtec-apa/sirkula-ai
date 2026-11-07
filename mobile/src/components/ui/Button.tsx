import { forwardRef, type ElementRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { safeHaptics } from "@/utils/haptics";
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from "@/config/theme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "warning";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<PressableProps, "children" | "style"> {
  label?: string;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const Button = forwardRef<ElementRef<typeof Pressable>, ButtonProps>(
  function Button(
    {
      label,
      title,
      variant = "primary",
      size = "md",
      isLoading = false,
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = true,
      disabled,
      onPress,
      accessibilityState,
      style,
      ...pressableProps
    },
    ref,
  ) {
    const scaleAnim = new Animated.Value(1);
    const isBusy = isLoading || Boolean(loading);
    const isDisabled = Boolean(disabled) || isBusy;
    const buttonText = label ?? title ?? "";

    const handlePressIn = () => {
      if (isDisabled) return;
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    };

    const handlePress = (e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
      if (isDisabled) return;
      safeHaptics.impactLight();
      onPress?.(e);
    };

    const containerStyle = [
      styles.base,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      isDisabled && styles.disabled,
      style,
    ];

    const labelStyle = [
      styles.labelBase,
      styles[`label_${variant}`],
      styles[`label_${size}`],
    ];

    const spinnerColor =
      variant === "primary" || variant === "danger"
        ? COLORS.surface
        : COLORS.primary;

    return (
      <Animated.View
        style={[
          fullWidth && styles.fullWidth,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Pressable
          ref={ref}
          accessibilityRole="button"
          accessibilityState={{
            ...accessibilityState,
            disabled: isDisabled,
            busy: isBusy,
          }}
          disabled={isDisabled}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={containerStyle}
          {...pressableProps}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={spinnerColor} />
          ) : (
            leftIcon ? <View style={styles.iconMargin}>{leftIcon}</View> : null
          )}
          <Text style={labelStyle}>{buttonText}</Text>
          {!isBusy && rightIcon ? (
            <View style={styles.rightIconMargin}>{rightIcon}</View>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1,
  },
  fullWidth: {
    width: "100%",
  },
  sm: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  md: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  outline: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  danger: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  warning: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warning,
  },
  disabled: {
    opacity: 0.55,
  },
  labelBase: {
    ...TYPOGRAPHY.button,
    textAlign: "center",
  },
  label_sm: {
    fontSize: 13,
  },
  label_md: {
    fontSize: 14,
  },
  label_lg: {
    fontSize: 16,
  },
  label_primary: {
    color: COLORS.surface,
  },
  label_secondary: {
    color: COLORS.surface,
  },
  label_outline: {
    color: COLORS.text,
  },
  label_danger: {
    color: COLORS.surface,
  },
  label_warning: {
    color: COLORS.surface,
  },
  iconMargin: {
    marginRight: 8,
  },
  rightIconMargin: {
    marginLeft: 8,
  },
});
