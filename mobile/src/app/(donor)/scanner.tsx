import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeHaptics } from "@/utils/haptics";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { SafetyInvariantError, verifyHandoverApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import {
  COLORS,
  FONTS,
  MONO_FALLBACK,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from "@/config/theme";
import { useActorHeaders } from "@/store/useActorStore";
import { useOfflineHandshakeQueue } from "@/store/useOfflineHandshakeQueue";
import {
  ActorRole,
  BatchState,
  type BatchWithItems,
} from "@/types/sirkula";
import {
  verifyOfflineHmacToken,
  type VerificationSuccess,
} from "@/utils/offlineHmacVerifier";

export default function DonorScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const actorHeaders = useActorHeaders();

  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [successResult, setSuccessResult] =
    useState<VerificationSuccess | null>(null);
  const [safetyViolation, setSafetyViolation] = useState<string | null>(null);

  const queue = useOfflineHandshakeQueue((state) => state.queue);
  const isSyncing = useOfflineHandshakeQueue((state) => state.isSyncing);
  const syncQueue = useOfflineHandshakeQueue((state) => state.syncQueue);
  const enqueue = useOfflineHandshakeQueue((state) => state.enqueue);

  const scannedRef = useRef(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || isProcessing) return;
    scannedRef.current = true;
    setIsProcessing(true);

    try {
      const offlineCheck = await verifyOfflineHmacToken(data);

      if (!offlineCheck.isValid) {
        if (offlineCheck.error === "SAFETY_INVARIANT_VIOLATION") {
          setSafetyViolation(offlineCheck.message);
          return;
        }

        showToast({
          type: "error",
          title: "Token QR Tidak Valid",
          message: offlineCheck.message,
        });

        setTimeout(() => {
          scannedRef.current = false;
          setIsProcessing(false);
        }, 2200);
        return;
      }

      const payload = offlineCheck.payload;
      const scannedAt = new Date().toISOString();

      try {
        await verifyHandoverApi({
          batchId: payload.batch_id,
          claimId: payload.claim_id,
          qrToken: data,
          scannedAt,
          waiverSignatureHash: offlineCheck.waiverSignatureHash,
          actorHeaders,
          offlineVerified: false,
        });

        queryClient.setQueryData<BatchWithItems[]>(
          queryKeys.batches.list(ActorRole.DONOR),
          (current) =>
            (current ?? []).map((batch) =>
              batch.id === payload.batch_id
                ? { ...batch, current_state: BatchState.COMPLETED }
                : batch,
            ),
        );

        setSuccessResult({
          isValid: true,
          payload,
          waiverSignatureHash: offlineCheck.waiverSignatureHash,
          verifiedAt: scannedAt,
          mode: "ONLINE_VERIFIED",
        });

        safeHaptics.notificationSuccess();

        showToast({
          type: "success",
          title: "Serah Terima Berhasil Diverifikasi",
          message: "Status batch diperbarui menjadi COMPLETED.",
        });
      } catch (networkOrApiError) {
        if (networkOrApiError instanceof SafetyInvariantError) {
          setSafetyViolation(networkOrApiError.message);
          return;
        }

        enqueue({
          batch_id: payload.batch_id,
          claim_id: payload.claim_id,
          receiver_id: payload.receiver_id,
          tier: payload.tier,
          scanned_at: scannedAt,
          qr_token: data,
          waiver_signature_hash: offlineCheck.waiverSignatureHash,
        });

        queryClient.setQueryData<BatchWithItems[]>(
          queryKeys.batches.list(ActorRole.DONOR),
          (current) =>
            (current ?? []).map((batch) =>
              batch.id === payload.batch_id
                ? { ...batch, current_state: BatchState.COMPLETED }
                : batch,
            ),
        );

        setSuccessResult(offlineCheck);

        showToast({
          type: "info",
          title: "Tersimpan Offline di Basement",
          message: "Tanda tangan HMAC valid. Transaksi akan disinkronkan saat ada sinyal.",
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Pemindaian Gagal",
        message: "Format QR tidak dapat diproses. Coba lagi.",
      });
      setTimeout(() => {
        scannedRef.current = false;
        setIsProcessing(false);
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetScanner = () => {
    scannedRef.current = false;
    setSuccessResult(null);
    setSafetyViolation(null);
    setIsProcessing(false);
  };

  const handleManualSync = async () => {
    const summary = await syncQueue(actorHeaders);
    if (summary.synced > 0) {
      showToast({
        type: "success",
        title: "Sinkronisasi Berhasil",
        message: `${summary.synced} transaksi offline berhasil diunggah ke server.`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
    } else if (summary.failed > 0) {
      showToast({
        type: "warning",
        title: "Jaringan Belum Tersedia",
        message: "Server belum merespons. Transaksi tetap tersimpan aman di antrean offline.",
      });
    }
  };

  const handleSimulateWebScan = () => {
    const activeBatch =
      queryClient
        .getQueryData<BatchWithItems[]>(queryKeys.batches.list(ActorRole.DONOR))
        ?.find((b) => b.current_state === BatchState.TIER_1_CLAIMED) ?? {
        id: "batch-dago-001",
      };
    const token = `SRK-${activeBatch.id.slice(0, 8).toUpperCase()}-WEBTEST`;
    void handleBarcodeScanned({ data: token });
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
          message="Kamera digunakan untuk memindai tiket QR kurir di loading dock basement secara online maupun offline."
          icon="qr-code-outline"
          actionLabel="Aktifkan Kamera"
          onAction={() => {
            void requestPermission();
          }}
        />
        <View style={styles.backBtnWrapper}>
          {Platform.OS === "web" ? (
            <View style={{ marginBottom: 10, width: "100%" }}>
              <Button
                label="Simulasikan Scan QR Kurir (1-Klik Web)"
                variant="primary"
                onPress={handleSimulateWebScan}
              />
            </View>
          ) : null}
          <Button
            label="Kembali ke Beranda"
            variant="outline"
            onPress={() => router.replace("/(donor)")}
          />
        </View>
      </View>
    );
  }

  if (safetyViolation) {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={styles.violationScreen}
      >
        <View style={styles.violationIconCircle}>
          <Ionicons name="alert-circle" size={48} color={COLORS.surface} />
        </View>

        <Text style={styles.violationTitle}>
          Batas Aman Konsumsi Manusia Terlampaui: Serah Terima Ditolak
        </Text>

        <View style={styles.violationBox}>
          <Text style={styles.violationBoxHeader}>Safety Invariant Terpicu:</Text>
          <Text style={styles.violationBoxDesc}>{safetyViolation}</Text>
          <Text style={styles.violationBoxSub}>
            Makanan tidak boleh didistribusikan untuk konsumsi manusia. Sistem
            mencabut tiket penjemputan dan mengalihkan batch ke pakan ternak.
          </Text>
        </View>

        <View style={styles.actionCol}>
          <Button
            label="Scan QR Lainnya"
            variant="secondary"
            onPress={handleResetScanner}
          />
          <Button
            label="Kembali ke Beranda"
            variant="outline"
            onPress={() => router.replace("/(donor)")}
          />
        </View>
      </View>
    );
  }

  if (successResult) {
    const isOnline = successResult.mode === "ONLINE_VERIFIED";
    return (
      <View
        style={[
          styles.successScreen,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <Card padding="lg" style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <Ionicons
              name="checkmark-circle"
              size={40}
              color={COLORS.success}
            />
          </View>

          <Text style={styles.successTitle}>
            Serah Terima Berhasil Diverifikasi!
          </Text>

          <View style={styles.successBadge}>
            <Text
              style={[
                styles.successBadgeText,
                { color: isOnline ? COLORS.success : COLORS.primary },
              ]}
            >
              {isOnline
                ? "Mode Online Terverifikasi Server"
                : "Basement Mode (Offline HMAC Valid)"}
            </Text>
          </View>

          <View style={styles.summaryTable}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Target Penyelamatan</Text>
              <Text style={styles.tableValue}>
                {successResult.payload.tier === "TIER_1_HUMAN"
                  ? "Konsumsi Manusia (Tier 1)"
                  : "Biomasa Pakan Ternak (Tier 2)"}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>ID Batch</Text>
              <Text style={[styles.tableValue, styles.monoText]}>
                {successResult.payload.batch_id.slice(0, 18)}...
              </Text>
            </View>

            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.tableLabel}>Waktu Serah Terima</Text>
              <Text style={styles.tableValue}>
                {new Date(successResult.verifiedAt).toLocaleTimeString("id-ID")}
              </Text>
            </View>
          </View>

          <View style={styles.waiverBox}>
            <View style={styles.waiverTitleRow}>
              <Ionicons
                name="document-text-outline"
                size={14}
                color={COLORS.primary}
              />
              <Text style={styles.waiverTitle}>
                Digital Liability Waiver Hash:
              </Text>
            </View>
            <Text style={styles.waiverHash}>
              {successResult.waiverSignatureHash}
            </Text>
            <Text style={styles.waiverNotice}>
              Bukti hukum digital bebas tuntutan telah diarsip secara kriptografis.
            </Text>
          </View>

          <View style={styles.successBtnCol}>
            <Button
              label="Selesai & Kembali ke Beranda"
              variant="primary"
              onPress={() => router.replace("/(donor)")}
            />
            <Button
              label="Scan QR Lainnya"
              variant="outline"
              onPress={handleResetScanner}
            />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <CameraView
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scannedRef.current ? undefined : handleBarcodeScanned}
        style={StyleSheet.absoluteFill}
      />

      {/* Header Overlay */}
      <View
        style={[
          styles.headerOverlay,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Scan QR Serah Terima</Text>
          <Text style={styles.headerSubtitle}>
            Arahkan ke QR tiket yang dibawa kurir di loading dock
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup scanner"
          onPress={() => router.replace("/(donor)")}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={20} color={COLORS.surface} />
        </Pressable>
      </View>

      {/* Viewfinder frame */}
      <View pointerEvents="none" style={styles.frameContainer}>
        <View style={styles.frameBox}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          <View style={styles.frameHintWrapper}>
            <Text style={styles.frameHintText}>
              Posisikan QR Code di dalam kotak
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom info & sync queue indicator */}
      <View
        style={[
          styles.bottomControls,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        {Platform.OS === "web" ? (
          <Button
            label="Simulasikan Scan QR Kurir (1-Klik Web)"
            variant="secondary"
            size="sm"
            onPress={handleSimulateWebScan}
          />
        ) : null}

        {queue.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ada ${queue.length} transaksi offline. Ketuk untuk sinkronisasi.`}
            onPress={handleManualSync}
            disabled={isSyncing}
            style={styles.syncQueueBar}
          >
            <View style={styles.syncTextCol}>
              <Text style={styles.syncTitle}>
                Antrean Offline: {queue.length} Transaksi
              </Text>
              <Text style={styles.syncSub}>
                {isSyncing
                  ? "Menyinkronkan ke server..."
                  : "Ketuk untuk upload ke server sekarang."}
              </Text>
            </View>
            <Ionicons
              name={isSyncing ? "sync" : "cloud-upload-outline"}
              size={20}
              color={COLORS.primary}
            />
          </Pressable>
        ) : null}

        <View style={styles.basementInfoBar}>
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={COLORS.surface}
          />
          <Text style={styles.basementInfoText}>
            Basement Mode Aktif: Validasi HMAC-SHA256 tanpa internet
          </Text>
        </View>
      </View>

      {isProcessing ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.surface} />
          <Text style={styles.loadingText}>
            Memverifikasi Tanda Tangan Kriptografi...
          </Text>
        </View>
      ) : null}
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight20,
    justifyContent: "center",
    alignItems: "center",
  },
  frameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  frameBox: {
    width: "75%",
    maxWidth: 270,
    aspectRatio: 1,
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderColor: COLORS.success,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderColor: COLORS.success,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderColor: COLORS.success,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
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
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 8,
  },
  syncQueueBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  syncTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  syncTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primary,
  },
  syncSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  basementInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.overlayDark,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
  },
  basementInfoText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.surface,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayHeavy,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.surface,
    marginTop: 14,
    textAlign: "center",
  },
  violationScreen: {
    flex: 1,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  violationIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  violationTitle: {
    ...TYPOGRAPHY.h1,
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.surface,
    textAlign: "center",
  },
  violationBox: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: RADIUS.card,
    padding: 16,
    marginVertical: 20,
    width: "100%",
  },
  violationBoxHeader: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.surface,
  },
  violationBoxDesc: {
    ...TYPOGRAPHY.caption,
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 18,
    marginTop: 4,
  },
  violationBoxSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 10,
    lineHeight: 16,
  },
  actionCol: {
    width: "100%",
    gap: 8,
  },
  successScreen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
  },
  successCard: {
    alignItems: "center",
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.successLight,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    textAlign: "center",
    marginTop: 12,
  },
  successBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  successBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
  },
  summaryTable: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.input,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  tableValue: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  monoText: {
    fontFamily: MONO_FALLBACK,
  },
  waiverBox: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.input,
    padding: 12,
    marginTop: 10,
    gap: 2,
  },
  waiverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  waiverTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  waiverHash: {
    fontFamily: MONO_FALLBACK,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  waiverNotice: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  successBtnCol: {
    width: "100%",
    gap: 8,
    marginTop: 18,
  },
});
