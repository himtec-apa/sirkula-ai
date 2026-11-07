import { Platform } from "react-native";
import * as ExpoHaptics from "expo-haptics";

export const safeHaptics = {
  impactLight: () => {
    if (Platform.OS === "web") return;
    try {
      void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // Safe fallback
    }
  },
  impactMedium: () => {
    if (Platform.OS === "web") return;
    try {
      void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {
      // Safe fallback
    }
  },
  notificationSuccess: () => {
    if (Platform.OS === "web") return;
    try {
      void ExpoHaptics.notificationAsync(
        ExpoHaptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch {
      // Safe fallback
    }
  },
  notificationWarning: () => {
    if (Platform.OS === "web") return;
    try {
      void ExpoHaptics.notificationAsync(
        ExpoHaptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    } catch {
      // Safe fallback
    }
  },
  notificationError: () => {
    if (Platform.OS === "web") return;
    try {
      void ExpoHaptics.notificationAsync(
        ExpoHaptics.NotificationFeedbackType.Error,
      ).catch(() => {});
    } catch {
      // Safe fallback
    }
  },
};
