import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { safeHaptics } from "@/utils/haptics";
import { BatchPreviewModal } from "@/components/donor/BatchPreviewModal";
import { ExposureSlider } from "@/components/donor/ExposureSlider";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { analyzeAndCreate } from "@/lib/api";
import { compressImage, type CompressibleImage } from "@/lib/image";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, FONTS, RADIUS, TYPOGRAPHY } from "@/config/theme";
import { buildActorHeaders, useActorStore } from "@/store/useActorStore";
import {
  ActorRole,
  type BatchWithItems,
} from "@/types/sirkula";

interface PreviewState {
  batch: BatchWithItems;
  imageUri: string;
  isFallback: boolean;
}

const BANDUNG_DEFAULT_COORDINATES: [number, number] = [107.6080, -6.8863];

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const donor = useActorStore((state) => state.profiles[ActorRole.DONOR]);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const analyzingRef = useRef(false);

  const [exposedMinutes, setExposedMinutes] = useState(0);
  const [isAcRoom, setIsAcRoom] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const resolveLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    try {
      const locationPermission =
        await Location.requestForegroundPermissionsAsync();

      if (!locationPermission.granted) {
        return {
          latitude: donor.location?.coordinates?.[1] ?? BANDUNG_DEFAULT_COORDINATES[1],
          longitude: donor.location?.coordinates?.[0] ?? BANDUNG_DEFAULT_COORDINATES[0],
        };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch {
      return {
        latitude: donor.location?.coordinates?.[1] ?? BANDUNG_DEFAULT_COORDINATES[1],
        longitude: donor.location?.coordinates?.[0] ?? BANDUNG_DEFAULT_COORDINATES[0],
      };
    }
  };

  const processSource = async (source: CompressibleImage) => {
    const compressed = await compressImage(source);
    const location = await resolveLocation();

    try {
      const batch = await analyzeAndCreate({
        image: compressed,
        exposedMinutes,
        isAcRoom,
        latitude: location.latitude,
        longitude: location.longitude,
        actorHeaders: buildActorHeaders(donor.id, ActorRole.DONOR),
      });
      setPreview({ batch, imageUri: compressed.uri, isFallback: false });
    } catch (error) {
      showToast({
        type: "error",
        title: "Pemindaian Gagal",
        message:
          error instanceof Error
            ? error.message
            : "Gagal memproses gambar. Coba ambil ulang foto.",
      });
    }
  };

  const runExclusive = async (task: () => Promise<void>) => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setIsAnalyzing(true);
    try {
      await task();
    } finally {
      analyzingRef.current = false;
      setIsAnalyzing(false);
    }
  };

  const handleCapture = () => {
    safeHaptics.impactMedium();
    void runExclusive(async () => {
      let photoUri = "";
      let photoWidth = 800;
      let photoHeight = 600;

      try {
        const photo = await cameraRef.current?.takePictureAsync({
          quality: 0.9,
        });
        if (photo) {
          photoUri = photo.uri;
          photoWidth = photo.width;
          photoHeight = photo.height;
        }
      } catch {
        // Fallback for environments where camera capture throws
      }

      await processSource({
        uri:
          photoUri ||
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
        width: photoWidth,
        height: photoHeight,
      });
    });
  };

  const handlePickGallery = async () => {
    if (analyzingRef.current) return;
    const libraryPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libraryPermission.granted) {
      showToast({
        type: "warning",
        title: "Izin Galeri Diperlukan",
        message: "Aktifkan akses galeri di pengaturan perangkat Anda.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await runExclusive(async () => {
      await processSource({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
      });
    });
  };

  const handleConfirmRelease = async () => {
    const current = preview;
    if (!current || isConfirming) return;

    safeHaptics.notificationSuccess();

    setIsConfirming(true);
    try {
      queryClient.setQueryData<BatchWithItems[]>(
        queryKeys.batches.list(ActorRole.DONOR),
        (existing) => [current.batch, ...(existing ?? []).filter((item) => item.id !== current.batch.id)],
      );
      queryClient.setQueryData(
        queryKeys.batches.detail(current.batch.id),
        current.batch,
      );

      setPreview(null);
      showToast({
        type: "success",
        title: "Batch Donasi Berhasil Dirilis",
        message: "Simpul komunitas terdekat di radius Dago telah menerima notifikasi radar.",
      });
      router.replace("/(donor)");
    } finally {
      setIsConfirming(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.permissionContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <EmptyState
          title="Akses Kamera Diperlukan"
          message="Kamera diperlukan untuk mendeteksi makanan berlebih dan mengkalkulasi batas mikrobiologi Q10."
          icon="camera-outline"
          actionLabel={Platform.OS === "web" ? "Pilih Foto / Uji AI" : "Buka Pengaturan"}
          onAction={() => {
            if (Platform.OS === "web") {
              void handlePickGallery();
            } else if (!permission.canAskAgain) {
              void Linking.openSettings();
            } else {
              void requestPermission();
            }
          }}
        />
        <View style={styles.backBtnWrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke beranda donatur"
            onPress={() => router.replace("/(donor)")}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>Kembali ke Beranda</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Guide frame */}
      <View pointerEvents="none" style={styles.frameContainer}>
        <View style={styles.frameBox}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          <View style={styles.frameHintWrapper}>
            <Text style={styles.frameHintText}>
              Posisikan seluruh wadah di dalam bingkai
            </Text>
          </View>
        </View>
      </View>

      {/* Header Overlay */}
      <View
        style={[
          styles.headerOverlay,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Pindai Sisa Pangan</Text>
          <Text style={styles.headerSubtitle}>
            Arahkan lensa ke hidangan prasmanan atau box makanan
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup kamera"
          onPress={() => router.replace("/(donor)")}
          style={styles.headerCloseBtn}
        >
          <Ionicons name="close" size={22} color={COLORS.surface} />
        </Pressable>
      </View>

      {/* Controls Overlay */}
      <View
        style={[
          styles.controlsContainer,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <ExposureSlider
          value={exposedMinutes}
          onChange={setExposedMinutes}
          isAcRoom={isAcRoom}
          onAcRoomChange={setIsAcRoom}
          disabled={isAnalyzing}
        />

        <View style={styles.shutterBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pilih foto dari galeri"
            disabled={isAnalyzing}
            onPress={() => {
              void handlePickGallery();
            }}
            style={styles.galleryBtn}
          >
            <Ionicons name="images-outline" size={24} color={COLORS.surface} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ambil foto"
            accessibilityHint="Menganalisis foto dengan Vision AI lalu membuka pratinjau"
            disabled={isAnalyzing}
            onPress={handleCapture}
            style={styles.shutterRing}
          >
            <View style={styles.shutterDot} />
          </Pressable>

          <View style={styles.spacerBtn} />
        </View>
      </View>

      {/* Loading Overlay */}
      {isAnalyzing ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.surface} />
          <Text style={styles.loadingText}>
            AI Sedang Menganalisis Menu & Cuaca...
          </Text>
          <Text style={styles.loadingSub}>
            Mengekstrak estimasi porsi, wadah logistik, dan batas aman mikrobiologi.
          </Text>
        </View>
      ) : null}

      <BatchPreviewModal
        visible={preview !== null}
        batch={preview?.batch ?? null}
        imageUri={preview?.imageUri ?? null}
        isFallback={preview?.isFallback ?? false}
        isSubmitting={isConfirming}
        onClose={() => setPreview(null)}
        onConfirm={() => {
          void handleConfirmRelease();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.text,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  backBtnWrapper: {
    marginTop: 16,
    alignItems: "center",
  },
  backLink: {
    padding: 8,
  },
  backLinkText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primary,
  },
  frameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  frameBox: {
    width: "80%",
    maxWidth: 300,
    aspectRatio: 1,
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderColor: COLORS.success,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderColor: COLORS.success,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderColor: COLORS.success,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderColor: COLORS.success,
    borderBottomRightRadius: 10,
  },
  frameHintWrapper: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  frameHintText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.surface,
    backgroundColor: COLORS.overlayDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.overlayDark,
  },
  headerTitleBox: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.surface,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    marginTop: 1,
  },
  headerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight20,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 10,
  },
  shutterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.overlayDark,
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight20,
    justifyContent: "center",
    alignItems: "center",
  },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  shutterDot: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.surface,
  },
  spacerBtn: {
    width: 48,
    height: 48,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayHeavy,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.surface,
    marginTop: 16,
    textAlign: "center",
  },
  loadingSub: {
    ...TYPOGRAPHY.caption,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 6,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
});
