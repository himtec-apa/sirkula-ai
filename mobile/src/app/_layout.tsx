import "../global.css";

import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";

import { AppHeader } from "@/components/ui/AppHeader";
import { ToastProvider } from "@/components/ui/Toast";
import { useSocketSync } from "@/hooks/useSocketSync";
import { COLORS } from "@/config/theme";
import { useActorStore } from "@/store/useActorStore";
import { fetchAllActors } from "@/lib/api";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RootShell() {
  const segments = useSegments();
  const [hasHydrated, setHasHydrated] = useState<boolean>(
    useActorStore.persist.hasHydrated(),
  );

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const segs = segments as string[];
  const lastSegment = segs[segs.length - 1];
  const isAuthOrSplash =
    segs.length === 0 ||
    segs[0] === "index" ||
    segs[0] === "onboarding" ||
    segs[0] === "login" ||
    segs[0] === "register";
  const isCameraOrScannerOrMission =
    lastSegment === "camera" ||
    lastSegment === "scanner" ||
    lastSegment === "hub-scanner" ||
    segs.includes("mission");
  const hideRoleHeader = isAuthOrSplash || isCameraOrScannerOrMission;

  useEffect(() => {
    if (hasHydrated) return;
    if (useActorStore.persist.hasHydrated()) {
      setHasHydrated(true);
      return;
    }
    const unsubscribe = useActorStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    void useActorStore.persist.rehydrate();
    return unsubscribe;
  }, [hasHydrated]);

  const isReady = hasHydrated && fontsLoaded;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isReady]);

  const syncActors = useActorStore((state) => state.syncActorsFromApi);

  useEffect(() => {
    if (!isReady) return;
    void fetchAllActors().then((actors) => {
      if (actors && actors.length > 0) {
        syncActors(actors);
      }
    }).catch(() => undefined);
  }, [isReady, syncActors]);

  useSocketSync(isReady);

  if (!isReady) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <View style={Platform.OS === "web" ? styles.webOuter : styles.root}>
      <View style={Platform.OS === "web" ? styles.webMobileShell : styles.root}>
        {hideRoleHeader ? null : <AppHeader />}
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(donor)" />
          <Stack.Screen name="(tier1-hub)" />
          <Stack.Screen name="(tier2-farmer)" />
          <Stack.Screen name="(tier3-compost)" />
          <Stack.Screen name="(esg-auditor)" />
          <Stack.Screen name="(simulator-admin)" />
          <Stack.Screen
            name="+not-found"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
        </Stack>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RootShell />
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webOuter: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  webMobileShell: {
    width: "100%",
    maxWidth: 480,
    height: "100%",
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
  },
});
