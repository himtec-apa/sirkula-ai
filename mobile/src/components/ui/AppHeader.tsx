import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { env } from "@/config/env";
import { triggerGodModeSimulation } from "@/lib/api";
import { ROLE_ACCENT, ROLE_SHORT_LABELS } from "@/lib/roles";
import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from "@/config/theme";
import { useActorStore } from "@/store/useActorStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { ActorRole } from "@/types/sirkula";

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const activeRole = useActorStore((state) => state.activeRole);
  const currentActor = useActorStore((state) => state.currentActor);
  const profileActor = useActorStore((state) => state.profiles[activeRole]);
  const actor = currentActor ?? profileActor;
  const logout = useActorStore((state) => state.logout);
  const isConnected = useConnectionStore((state) => state.isConnected);

  const [simulatorVisible, setSimulatorVisible] = useState(false);
  const [simTemp, setSimTemp] = useState(36.0);

  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.25,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blinkAnim]);

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Keluar",
      "Apakah Anda yakin ingin keluar dari akun Anda?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: () => {
            logout();
            showToast({
              type: "info",
              title: "Sesi Berakhir",
              message: "Silakan masuk kembali untuk melanjutkan.",
            });
            router.replace("/login");
          },
        },
      ],
    );
  };

  const handleTriggerSpoilage = async () => {
    try {
      await triggerGodModeSimulation("all", simTemp);
      setSimulatorVisible(false);
      showToast({
        type: "warning",
        title: "God-Mode: Pembusukan Terpicu",
        message: `Simulasi suhu ${simTemp}°C memindahkan seluruh batch manusia ke Tier 2 Pakan Ternak.`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Simulasi Gagal",
        message: err.message ?? "Gagal memicu simulasi time-warp ke server backend.",
      });
    }
  };

  const accentColor = ROLE_ACCENT[activeRole]?.surface || COLORS.primary;

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
      <View style={styles.contentRow}>
        {/* Single Logged-in Account Identity */}
        <View style={styles.actorInfo}>
          <Avatar
            name={actor.name}
            size="sm"
            accentColor={accentColor}
          />
          <View style={styles.actorTextCol}>
            <Text style={styles.actorName} numberOfLines={1}>
              {actor.name}
            </Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.rolePill,
                  { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}40` },
                ]}
              >
                <Text style={[styles.rolePillText, { color: accentColor }]}>
                  {ROLE_SHORT_LABELS[activeRole] ?? activeRole}
                </Text>
              </View>
              <Animated.View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isConnected
                      ? COLORS.success
                      : COLORS.accent,
                    opacity: blinkAnim,
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {env.useMock ? "Demo" : isConnected ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rightButtons}>
          {activeRole === ActorRole.SIMULATOR_ADMIN && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="God-Mode Simulator"
              onPress={() => setSimulatorVisible(true)}
              style={styles.actionBtn}
            >
              <Ionicons
                name="hardware-chip-outline"
                size={18}
                color={COLORS.primary}
              />
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun"
            onPress={handleLogout}
            style={styles.actionBtn}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* God-Mode Simulator Sheet (Hanya untuk Admin/Testing) */}
      <BottomSheet
        visible={simulatorVisible}
        onClose={() => setSimulatorVisible(false)}
        title="God-Mode Simulator Juri"
        subtitle="Uji ketahanan state machine bio-termal secara langsung"
      >
        <View style={styles.simCard}>
          <Text style={styles.simCardTitle}>SIMULASI LONJAKAN SUHU RUANG</Text>
          <Text style={styles.simTempText}>{simTemp}°C</Text>
          <View style={styles.tempButtonRow}>
            {[26.0, 30.0, 36.0, 40.0].map((temp) => (
              <Pressable
                key={temp}
                onPress={() => setSimTemp(temp)}
                style={[
                  styles.tempBtn,
                  simTemp === temp ? styles.tempBtnActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.tempBtnText,
                    simTemp === temp ? styles.tempBtnTextActive : null,
                  ]}
                >
                  {temp}°C
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.simHelperText}>
            Faktor Bio-Termal Q10 = 2.2: Kenaikan suhu dari 26°C ke 36°C memotong
            batas aman manusia hingga 50%!
          </Text>
        </View>

        <Button
          label="Picu Pembusukan Cepat (Mutasi ke Tier 2)"
          variant="danger"
          onPress={handleTriggerSpoilage}
        />
        <Button
          label="Tutup Panel"
          variant="outline"
          onPress={() => setSimulatorVisible(false)}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingBottom: 10,
    ...SHADOWS.sm,
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  actorTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  actorName: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.text,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 6,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  simCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.card,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  simCardTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  simTempText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.accent,
    marginVertical: 4,
  },
  tempButtonRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 8,
  },
  tempBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  tempBtnActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.amberLight,
  },
  tempBtnText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  tempBtnTextActive: {
    color: COLORS.accent,
  },
  simHelperText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
});
