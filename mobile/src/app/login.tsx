import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { safeHaptics } from "@/utils/haptics";
import { Button } from "@/components/ui/Button";
import { ROLE_HOME_ROUTE } from "@/lib/roles";
import { COLORS, FONTS, RADIUS, SHADOWS, TYPOGRAPHY } from "@/config/theme";
import { useActorStore } from "@/store/useActorStore";
import { loginActorApi } from "@/lib/api";
import { ActorRole, type FieldRole } from "@/types/sirkula";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuthSession = useActorStore((state) => state.setAuthSession);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // Inline validation errors
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleLogin = async () => {
    setGeneralError("");
    let hasError = false;

    if (!identifier.trim()) {
      setIdentifierError("Email atau No. WhatsApp wajib diisi.");
      hasError = true;
    } else {
      setIdentifierError("");
    }

    if (!password.trim()) {
      setPasswordError("Kata sandi wajib diisi.");
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError("Kata sandi minimal 6 karakter.");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) {
      safeHaptics.notificationError();
      return;
    }

    setIsLoading(true);
    safeHaptics.impactMedium();

    try {
      const res = await loginActorApi(identifier.trim(), password);
      setAuthSession({ token: res.access_token, actor: res.actor });
      safeHaptics.notificationSuccess();
      const targetRole = (res.actor.role as FieldRole) || ActorRole.DONOR;
      router.replace(ROLE_HOME_ROUTE[targetRole] || "/(donor)");
    } catch (err: any) {
      safeHaptics.notificationError();
      setGeneralError(err.message ?? "Email atau kata sandi tidak cocok.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandHeader}>
            <View style={styles.brandLogoCircle}>
              <Image source={require("../../assets/logo.png")} style={styles.brandLogoImg} resizeMode="contain" />
            </View>
            <Text style={styles.headerTitle}>SIRKULA-AI</Text>
            <Text style={styles.headerSubtitle}>
              Platform Berbagi Material & Logistik Penyelamatan Pangan
            </Text>
          </View>

          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Masuk ke Akun</Text>
              <Text style={styles.cardSubtitle}>
                Silakan masuk dengan akun mitra terdaftar untuk mengakses radar logistik pangan.
              </Text>
            </View>

            {generalError ? (
              <View style={styles.generalErrorBox}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.generalErrorText}>{generalError}</Text>
                  {generalError.toLowerCase().includes("belum terdaftar") ||
                  generalError.toLowerCase().includes("tidak ditemukan") ? (
                    <Pressable
                      onPress={() => {
                        safeHaptics.impactLight();
                        router.replace("/register");
                      }}
                      style={{ marginTop: 4 }}
                    >
                      <Text style={styles.registerSuggestionLink}>
                        Klik di sini untuk mendaftar akun baru →
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email / No. WhatsApp</Text>
                <View
                  style={[
                    styles.inputBox,
                    Boolean(identifierError) && styles.inputBoxError,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={COLORS.textMuted}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="contoh@sirkula.ai / 08123456789"
                    placeholderTextColor={COLORS.textMuted}
                    value={identifier}
                    onChangeText={(text) => {
                      setIdentifier(text);
                      if (identifierError) setIdentifierError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {identifierError ? (
                  <Text style={styles.errorText}>{identifierError}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kata Sandi</Text>
                <View
                  style={[
                    styles.inputBox,
                    Boolean(passwordError) && styles.inputBoxError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={COLORS.textMuted}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Minimal 6 karakter"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) setPasswordError("");
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </Pressable>
                </View>
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
              </View>

              <View style={styles.formBtnCol}>
                <Button
                  label="Masuk ke Akun"
                  isLoading={isLoading}
                  onPress={handleLogin}
                />
              </View>
            </View>

            <View style={styles.authSwitchFooter}>
              <Text style={styles.authSwitchText}>
                Belum memiliki akun mitra?
              </Text>
              <Pressable
                onPress={() => {
                  safeHaptics.impactLight();
                  router.replace("/register");
                }}
                hitSlop={8}
              >
                <Text style={styles.authSwitchLink}>
                  Daftar akun baru di sini
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomHelpRow}>
            <Ionicons
              name="shield-checkmark"
              size={14}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.bottomHelpText}>
              Terhubung langsung ke PostgreSQL Database SIRKULA-AI
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandLogoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  brandLogoImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.surface,
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 290,
    lineHeight: 18,
  },
  cardContainer: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.lg,
  },
  cardHeader: {
    marginBottom: 18,
  },
  cardTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontSize: 18,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  formSection: {
    gap: 14,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  inputBoxError: {
    borderColor: COLORS.error,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    fontSize: 11,
  },
  formBtnCol: {
    gap: 10,
    marginTop: 8,
  },
  generalErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEE2E2",
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  generalErrorText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.error,
    lineHeight: 17,
  },
  registerSuggestionLink: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primaryDark,
    textDecorationLine: "underline",
  },
  authSwitchFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  authSwitchText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  authSwitchLink: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
  },
  bottomHelpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
  },
  bottomHelpText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
  },
});
