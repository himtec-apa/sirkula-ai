import { Platform } from "react-native";

export const COLORS = {
  primary: "#0B7A6B",
  primaryDark: "#085E52",
  secondary: "#0FA690",
  light: "#E6F7F4",
  background: "#F5FAF9",
  surface: "#FFFFFF",
  border: "#E6F7F4",
  text: "#0F172A",
  textMuted: "#64748B",
  accent: "#F59E0B",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Light tints
  amberLight: "#FEF3C7",
  amberDark: "#92400E",
  errorLight: "#FEE2E2",
  infoLight: "#DBEAFE",
  primaryLight: "#E6F7F4",
  successLight: "#D1FAE5",
  blueDark: "#0D6EFD",
  purple: "#7B2CBF",
  purpleLight: "#F3EBF9",

  // Opacity overlays & translucent tints
  overlayDark: "rgba(15, 23, 42, 0.72)",
  overlayBackdrop: "rgba(15, 23, 42, 0.5)",
  overlayHeavy: "rgba(15, 23, 42, 0.86)",
  surfaceLight15: "rgba(255, 255, 255, 0.15)",
  surfaceLight20: "rgba(255, 255, 255, 0.2)",
  surfaceLight35: "rgba(255, 255, 255, 0.35)",
  surfaceLight60: "rgba(255, 255, 255, 0.6)",
  primary12: "rgba(11, 122, 107, 0.12)",
  primary18: "rgba(15, 166, 144, 0.18)",
  accent15: "rgba(245, 158, 11, 0.15)",
  accent20: "rgba(245, 158, 11, 0.2)",
  success15: "rgba(16, 185, 129, 0.15)",
  error15: "rgba(239, 68, 68, 0.15)",
  black05: "rgba(0, 0, 0, 0.05)",

  // Legacy mappings for backward compatibility
  primary500: "#0B7A6B",
  primary600: "#085E52",
  secondary500: "#0FA690",
  accent500: "#F59E0B",
  accent700: "#B45309",
  bgBase: "#F5FAF9",
  textPrimary: "#0F172A",
  success700: "#047857",
  warning700: "#B45309",
  error700: "#B91C1C",
  info700: "#1D4ED8",
  surfaceAlt: "#F8FAFC",
  textSecondary: "#64748B",
  danger: "#EF4444",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  xs: 4,
  card: 12,
  button: 12,
  input: 8,
  pill: 999,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#0B7A6B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
} as const;

export const FONTS = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  mono: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

export const MONO_FALLBACK = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600" as const,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600" as const,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  button: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600" as const,
    fontFamily: FONTS.semiBold,
  },
  mono: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.mono,
  },
} as const;

export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  fonts: FONTS,
  typography: TYPOGRAPHY,
} as const;
