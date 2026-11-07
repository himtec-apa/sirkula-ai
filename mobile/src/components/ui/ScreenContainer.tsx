import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, TYPOGRAPHY } from "@/config/theme";

export interface ScreenContainerProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  respectTopInset?: boolean;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ScreenContainer({
  title,
  subtitle,
  children,
  rightSlot,
  respectTopInset = false,
  scrollable = true,
  contentContainerStyle,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const containerPadding = {
    paddingTop: (respectTopInset ? insets.top : 0) + 16,
    paddingBottom: insets.bottom + 32,
    paddingHorizontal: 20,
  };

  const header =
    title || rightSlot ? (
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightSlot}
      </View>
    ) : null;

  if (!scrollable) {
    return (
      <View style={[styles.staticContainer, containerPadding, contentContainerStyle]}>
        <StatusBar style="dark" />
        {header}
        <View style={styles.body}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollWrapper}
      contentContainerStyle={[styles.scrollContent, containerPadding, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="dark" />
      {header}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 24,
    lineHeight: 30,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  body: {
    gap: 12,
  },
});
