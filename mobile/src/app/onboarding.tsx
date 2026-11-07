import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { safeHaptics } from "@/utils/haptics";
import { COLORS, FONTS, RADIUS } from "@/config/theme";
import { useActorStore } from "@/store/useActorStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  featurePill: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    badge: "<= 15 DETIK ZERO-UI",
    title: "Deteksi Pangan Cerdas Tanpa Repot",
    description:
      "Cukup ambil 1 foto prasmanan atau wadah makanan berlebih. Kecerdasan Multimodal Gemini mengekstrak nama menu, estimasi porsi, berat kg, dan batas aman secara instan.",
    icon: "scan-circle",
    featurePill: "Vision AI Multimodal",
  },
  {
    id: "2",
    badge: "MODEL BIO-TERMAL Q10",
    title: "Otomasi Alih Target 3-Tier",
    description:
      "Sistem memantau laju pembusukan makanan secara real-time berdasarkan cuaca lokal. Makanan otomatis dialihkan: Konsumsi Manusia -> Pakan Ternak Maggot BSF -> Kompos.",
    icon: "git-network-outline",
    featurePill: "Mikrobiologi Spasial",
  },
  {
    id: "3",
    badge: "BLIND HANDSHAKE & WAIVER",
    title: "Penjemputan Bermartabat & Aman Hukum",
    description:
      "Serah terima tertutup di pintu belakang loading dock dengan Tiket QR HMAC-SHA256 offline di basement. Sertifikat Digital Liability Waiver diterbitkan otomatis melindungi donatur.",
    icon: "shield-checkmark",
    featurePill: "HMAC Kriptografis",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useActorStore(
    (state) => state.completeOnboarding,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    safeHaptics.impactLight();

    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    safeHaptics.notificationSuccess();
    completeOnboarding();
    router.replace("/login");
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < SLIDES.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brandName}>SIRKULA-AI</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lewati pengenalan"
          onPress={handleFinish}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Lewati</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.illustrationWrapper}>
              <View style={styles.outerRing}>
                <View style={styles.middleRing}>
                  <View style={styles.iconCircle}>
                    <Ionicons name={item.icon} size={64} color={COLORS.surface} />
                  </View>
                </View>
              </View>

              <View style={styles.pillContainer}>
                <Ionicons name="sparkles" size={13} color={COLORS.primary} />
                <Text style={styles.pillText}>{item.featurePill}</Text>
              </View>
            </View>

            <View style={styles.slideContent}>
              <View style={styles.badgeWrapper}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>

              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideDescription}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footerBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.paginationRow}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            currentIndex === SLIDES.length - 1
              ? "Mulai Sekarang"
              : "Lanjut ke slide berikutnya"
          }
          onPress={handleNext}
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>
            {currentIndex === SLIDES.length - 1 ? "Mulai Sekarang" : "Lanjut"}
          </Text>
          <Ionicons
            name={
              currentIndex === SLIDES.length - 1
                ? "arrow-forward-circle"
                : "chevron-forward"
            }
            size={22}
            color={COLORS.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  brandName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.surface,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceLight15,
  },
  skipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.surface,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  illustrationWrapper: {
    width: "100%",
    alignItems: "center",
    marginVertical: 24,
  },
  outerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.surfaceLight15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  middleRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.surfaceLight20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.surfaceLight35,
    justifyContent: "center",
    alignItems: "center",
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    marginTop: -16,
    elevation: 4,
  },
  pillText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  slideContent: {
    alignItems: "center",
    marginTop: 12,
  },
  badgeWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceLight15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.light,
  },
  slideTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.surface,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 10,
  },
  slideDescription: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  footerBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: COLORS.surface,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  actionButton: {
    flexDirection: "row",
    height: 52,
    borderRadius: RADIUS.button,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
