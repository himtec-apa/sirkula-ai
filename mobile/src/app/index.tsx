import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_HOME_ROUTE } from "@/lib/roles";
import { COLORS, FONTS, MONO_FALLBACK, RADIUS } from "@/config/theme";
import { useActorStore } from "@/store/useActorStore";

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useActorStore((state) => state.isAuthenticated);
  const hasOnboarded = useActorStore((state) => state.hasOnboarded);
  const activeRole = useActorStore((state) => state.activeRole);

  const [loadingStep, setLoadingStep] = useState(0);

  // 3 concentric radar rings fading alternately
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.7)).current;

  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.5)).current;

  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring3Opacity = useRef(new Animated.Value(0.3)).current;

  const logoScale = useRef(new Animated.Value(0.85)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Concentric pulsing rings loop
    const animateRing = (
      scale: Animated.Value,
      opacity: Animated.Value,
      delay: number,
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 2.3,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
    };

    const anim1 = animateRing(ring1Scale, ring1Opacity, 0);
    const anim2 = animateRing(ring2Scale, ring2Opacity, 400);
    const anim3 = animateRing(ring3Scale, ring3Opacity, 800);

    anim1.start();
    anim2.start();
    anim3.start();

    const t1 = setTimeout(() => setLoadingStep(1), 600);
    const t2 = setTimeout(() => setLoadingStep(2), 1200);

    const redirectTimer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace(ROLE_HOME_ROUTE[activeRole]);
      } else if (hasOnboarded) {
        router.replace("/login");
      } else {
        router.replace("/onboarding");
      }
    }, 1800);

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(redirectTimer);
    };
  }, [
    activeRole,
    contentOpacity,
    hasOnboarded,
    isAuthenticated,
    logoScale,
    ring1Opacity,
    ring1Scale,
    ring2Opacity,
    ring2Scale,
    ring3Opacity,
    ring3Scale,
    router,
  ]);

  const stepMessages = [
    "Memuat modul geo-spasial & PostGIS...",
    "Menginisialisasi Mesin Bio-Termal Q10 & Kriptografi HMAC...",
    "Menyiapkan sesi mitra aktif...",
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.centerContent}>
        <View style={styles.radarWrapper}>
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: ring3Scale }],
                opacity: ring3Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: ring2Scale }],
                opacity: ring2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: ring1Scale }],
                opacity: ring1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.logoCircle,
              {
                transform: [{ scale: logoScale }],
                opacity: contentOpacity,
              },
            ]}
          >
            <Image source={require("../../assets/logo.png")} style={styles.logoImage} resizeMode="contain" />
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: contentOpacity, alignItems: "center" }}>
          <Text style={styles.brandTitle}>SIRKULA-AI</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>PLATFORM PENYELAMATAN PANGAN</Text>
          </View>
          <Text style={styles.brandTagline}>
            Berbagi Material, Kurangi Limbah, Ciptakan Nilai.
          </Text>
        </Animated.View>
      </View>

      <View style={styles.footerContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width:
                  loadingStep === 0
                    ? "35%"
                    : loadingStep === 1
                      ? "75%"
                      : "100%",
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>{stepMessages[loadingStep]}</Text>
        <Text style={styles.copyrightText}>
          Standardized under Bio-Thermal Q10 Protocol & RFC 2104
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  radarWrapper: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  radarRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    backgroundColor: COLORS.primary18,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  logoImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  brandTitle: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: COLORS.surface,
    textAlign: "center",
  },
  badgePill: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: COLORS.surfaceLight15,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.light,
  },
  brandTagline: {
    marginTop: 14,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    maxWidth: 290,
    lineHeight: 19,
  },
  footerContainer: {
    width: "100%",
    alignItems: "center",
  },
  progressTrack: {
    width: "65%",
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.pill,
  },
  loadingText: {
    fontFamily: MONO_FALLBACK,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.92)",
    textAlign: "center",
    marginBottom: 8,
  },
  copyrightText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
});
