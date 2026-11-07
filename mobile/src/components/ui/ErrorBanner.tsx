import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { COLORS, TYPOGRAPHY } from "@/config/theme";

export interface ErrorBannerProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({
  title = "Terjadi Kesalahan Jaringan",
  message = "Gagal memuat data dari server. Periksa koneksi Anda lalu coba lagi.",
  onRetry,
  retryLabel = "Coba Lagi",
}: ErrorBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={24} color={COLORS.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.btnRow}>
          <Button
            label={retryLabel}
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={onRetry}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.errorLight,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.errorLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.error,
    textAlign: "center",
  },
  message: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 290,
    lineHeight: 18,
  },
  btnRow: {
    marginTop: 14,
  },
});
