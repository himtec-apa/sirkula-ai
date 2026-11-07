import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { COLORS, TYPOGRAPHY } from "@/config/theme";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <ScreenContainer
      title="Halaman Tidak Ditemukan"
      subtitle="Rute yang Anda tuju tidak tersedia di aplikasi lapangan."
      respectTopInset
    >
      <View style={styles.contentBox}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="compass-outline"
            size={28}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.message}>
          Periksa kembali rute navigasi atau kembali ke halaman beranda.
        </Text>
        <View style={styles.btnRow}>
          <Button
            label="Kembali ke Beranda"
            variant="outline"
            fullWidth={false}
            onPress={() => router.replace("/login")}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentBox: {
    alignItems: "center",
    padding: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
  btnRow: {
    marginTop: 18,
  },
});
