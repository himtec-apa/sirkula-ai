import { useState } from "react";
import {
  ActivityIndicator,
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
import { ROLE_HOME_ROUTE, ROLE_LABELS } from "@/lib/roles";
import { COLORS, FONTS, RADIUS, SHADOWS, TYPOGRAPHY } from "@/config/theme";
import { useActorStore } from "@/store/useActorStore";
import { registerActorApi } from "@/lib/api";
import { ActorRole, FIELD_ROLES, type FieldRole } from "@/types/sirkula";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuthSession = useActorStore((state) => state.setAuthSession);

  const [selectedRole, setSelectedRole] = useState<FieldRole>(ActorRole.DONOR);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // Field validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = "Nama lembaga / usaha wajib diisi.";
    } else if (name.trim().length < 3) {
      newErrors.name = "Nama minimal 3 karakter.";
    }

    if (!email.trim()) {
      newErrors.email = "Email resmi wajib diisi.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Format email tidak valid.";
    }

    if (!phone.trim()) {
      newErrors.phone = "Nomor WhatsApp wajib diisi.";
    } else if (phone.trim().replace(/\D/g, "").length < 9) {
      newErrors.phone = "Nomor WhatsApp minimal 9 digit.";
    }

    if (!password.trim()) {
      newErrors.password = "Kata sandi wajib diisi.";
    } else if (password.length < 6) {
      newErrors.password = "Kata sandi minimal 6 karakter.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setGeneralError("");
    if (!validate()) {
      safeHaptics.notificationError();
      return;
    }

    setIsLoading(true);
    safeHaptics.impactMedium();

    try {
      const res = await registerActorApi({
        name: name.trim(),
        role: selectedRole,
        email: email.trim().toLowerCase(),
        phone_whatsapp: phone.trim().startsWith("+") ? phone.trim() : `+62${phone.trim().replace(/^0/, "")}`,
        address_full: address.trim() || "Kota Bandung, Jawa Barat",
        handover_point_notes: "Loading Dock Utama",
        latitude: -6.8863,
        longitude: 107.6080,
        daily_capacity_kg: selectedRole === ActorRole.DONOR ? 150 : 80,
      });

      safeHaptics.notificationSuccess();
      setAuthSession({ token: res.access_token, actor: res.actor });
      router.replace(ROLE_HOME_ROUTE[selectedRole]);
    } catch (err: any) {
      safeHaptics.notificationError();
      setGeneralError(err.message ?? "Terjadi kesalahan saat pendaftaran akun.");
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
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand */}
          <View style={styles.brandHeader}>
            <View style={styles.brandLogoCircle}>
              <Image source={require("../../assets/logo.png")} style={styles.brandLogoImg} resizeMode="contain" />
            </View>
            <Text style={styles.headerTitle}>SIRKULA-AI</Text>
            <Text style={styles.headerSubtitle}>
              Pendaftaran Mitra Ekosistem Penyelamatan Pangan
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.cardContainer}>
            <Text style={styles.cardTitle}>Daftar Akun Baru</Text>
            <Text style={styles.cardDesc}>
              Bergabung bersama jejaring donatur, simpul warga, dan peternak Kota Bandung.
            </Text>

            {generalError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.errorBoxText}>{generalError}</Text>
              </View>
            ) : null}

            {/* Role Selection */}
            <Text style={styles.inputLabel}>Pilih Peran Lapangan:</Text>
            <View style={styles.rolePickerRow}>
              {FIELD_ROLES.map((role) => {
                const isSelected = selectedRole === role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => {
                      safeHaptics.impactLight();
                      setSelectedRole(role);
                    }}
                    style={[
                      styles.roleCard,
                      isSelected && styles.roleCardSelected,
                    ]}
                  >
                    <Ionicons
                      name={
                        isSelected
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={16}
                      color={isSelected ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        isSelected && styles.roleTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {ROLE_LABELS[role]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Nama Lembaga / Usaha */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lembaga / Usaha Kuliner</Text>
              <View
                style={[
                  styles.inputBox,
                  Boolean(errors.name) && styles.inputBoxError,
                ]}
              >
                <Ionicons name="business-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="contoh: Katering Barokah Dago"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                />
              </View>
              {errors.name ? <Text style={styles.fieldErrorText}>{errors.name}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Resmi</Text>
              <View
                style={[
                  styles.inputBox,
                  Boolean(errors.email) && styles.inputBoxError,
                ]}
              >
                <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="contoh: info@barokah.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? <Text style={styles.fieldErrorText}>{errors.email}</Text> : null}
            </View>

            {/* WhatsApp */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor WhatsApp</Text>
              <View
                style={[
                  styles.inputBox,
                  Boolean(errors.phone) && styles.inputBoxError,
                ]}
              >
                <Ionicons name="call-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="contoh: 081234567890"
                  placeholderTextColor={COLORS.textMuted}
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone ? <Text style={styles.fieldErrorText}>{errors.phone}</Text> : null}
            </View>

            {/* Alamat */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alamat / Area Penjemputan</Text>
              <View style={styles.inputBox}>
                <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="contoh: Jl. Dago No. 45, Coblong, Bandung"
                  placeholderTextColor={COLORS.textMuted}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* Kata Sandi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kata Sandi</Text>
              <View
                style={[
                  styles.inputBox,
                  Boolean(errors.password) && styles.inputBoxError,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
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
                    size={20}
                    color={COLORS.textMuted}
                  />
                </Pressable>
              </View>
              {errors.password ? <Text style={styles.fieldErrorText}>{errors.password}</Text> : null}
            </View>

            {/* Submit Button */}
            <View style={styles.actionContainer}>
              <Button
                label="Daftar Sekarang & Masuk"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                onPress={handleRegister}
              />
            </View>

            {/* Switch to Login */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Sudah memiliki akun terdaftar?</Text>
              <Pressable
                onPress={() => {
                  safeHaptics.impactLight();
                  router.replace("/login");
                }}
                hitSlop={6}
              >
                <Text style={styles.switchLink}>Masuk ke sini</Text>
              </Pressable>
            </View>
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
    paddingHorizontal: 16,
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandLogoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight60,
    overflow: "hidden",
  },
  brandLogoImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.surface,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorBoxText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.error,
    flex: 1,
  },
  rolePickerRow: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
    marginTop: 6,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 10,
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.light,
  },
  roleText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  roleTextSelected: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  inputBoxError: {
    borderColor: COLORS.error,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  fieldErrorText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },
  actionContainer: {
    marginTop: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    gap: 6,
  },
  switchText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  switchLink: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primary,
  },
});
