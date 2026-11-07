import { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "qrcode";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { useCountdown } from "@/hooks/useCountdown";
import { formatDuration } from "@/lib/format";
import {
  COLORS,
  FONTS,
  MONO_FALLBACK,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from "@/config/theme";
import type { BatchWithItems, RescueClaim } from "@/types/sirkula";

export interface DynamicQrTicketProps {
  claim: RescueClaim;
  batch: BatchWithItems;
  onExpired?: () => void;
}

interface MatrixRun {
  isDark: boolean;
  length: number;
}

export function DynamicQrTicket({
  claim,
  batch,
  onExpired,
}: DynamicQrTicketProps) {
  const { remainingMs, isExpired } = useCountdown(claim.qr_expires_at);
  const [copied, setCopied] = useState(false);

  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (isExpired && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onExpiredRef.current?.();
    }
  }, [isExpired]);

  const qrMatrix = useMemo(() => {
    try {
      const tokenToEncode = claim.qr_token || claim.qr_token_hash;
      const qr = QRCode.create(tokenToEncode, {
        errorCorrectionLevel: "M",
      });
      const size = qr.modules.size;
      const rows: MatrixRun[][] = [];

      for (let r = 0; r < size; r++) {
        const rowRuns: MatrixRun[] = [];
        let currentDark = Boolean(qr.modules.get(r, 0));
        let currentLength = 1;

        for (let c = 1; c < size; c++) {
          const isDark = Boolean(qr.modules.get(r, c));
          if (isDark === currentDark) {
            currentLength += 1;
          } else {
            rowRuns.push({ isDark: currentDark, length: currentLength });
            currentDark = isDark;
            currentLength = 1;
          }
        }
        rowRuns.push({ isDark: currentDark, length: currentLength });
        rows.push(rowRuns);
      }

      return { size, rows };
    } catch {
      return null;
    }
  }, [claim.qr_token, claim.qr_token_hash]);

  const targetCoords = batch.exact_pickup_location.coordinates;
  const longitude = targetCoords[0];
  const latitude = targetCoords[1];
  const handoverNotes =
    batch.handover_point_notes ??
    batch.donor?.handover_point_notes ??
    "Pintu loading dock B2 gerbang barat samping dapur donatur.";

  const handleOpenMaps = () => {
    const mapsUrl = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    void Linking.openURL(mapsUrl).catch(() => {
      void Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      );
    });
  };

  const handleSimulateCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timerText = formatDuration(remainingMs);
  const isUrgent = remainingMs > 0 && remainingMs <= 10 * 60_000;

  const qrBoxSize = 220;
  const moduleSize = qrMatrix ? Math.floor(qrBoxSize / qrMatrix.size) : 7;
  const actualRenderedWidth = qrMatrix ? moduleSize * qrMatrix.size : qrBoxSize;

  return (
    <View style={styles.container}>
      <Card padding="lg" style={styles.ticketCard}>
        <View style={styles.badgeRow}>
          <Ionicons
            name="shield-checkmark"
            size={14}
            color={COLORS.primary}
          />
          <Text style={styles.badgeText}>Tiket QR Blind Handshake</Text>
        </View>

        <Text style={styles.ticketHint}>
          Tunjukkan ke staf donatur di loading dock saat serah terima
        </Text>

        <View style={styles.qrWrapper}>
          {qrMatrix ? (
            <View
              style={{
                width: actualRenderedWidth,
                height: actualRenderedWidth,
                backgroundColor: COLORS.surface,
              }}
              accessibilityLabel={`QR Code Serah Terima Token ${claim.qr_token_hash}`}
            >
              {qrMatrix.rows.map((rowRuns, rIndex) => (
                <View key={`row-${rIndex}`} style={{ flexDirection: "row" }}>
                  {rowRuns.map((run, runIndex) => (
                    <View
                      key={`run-${rIndex}-${runIndex}`}
                      style={{
                        width: run.length * moduleSize,
                        height: moduleSize,
                        backgroundColor: run.isDark ? COLORS.text : COLORS.surface,
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.placeholderBox, { width: qrBoxSize, height: qrBoxSize }]}>
              <Text style={styles.placeholderText}>Membuat QR Code...</Text>
            </View>
          )}
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Masa Berlaku Tiket QR Dinamis</Text>
          <Text
            style={[
              styles.timerDigits,
              {
                color: isExpired
                  ? COLORS.error
                  : isUrgent
                    ? COLORS.warning
                    : COLORS.text,
              },
            ]}
          >
            {isExpired ? "00:00:00" : timerText}
          </Text>
          <Text style={styles.timerDesc}>
            {isExpired
              ? "Tiket telah kedaluwarsa. Serah terima dibatalkan otomatis."
              : isUrgent
                ? "Batas aman tersisa sedikit. Segera selesaikan serah terima."
                : "Timer tersinkronisasi dengan batas aman mikrobiologi."}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Salin kode token QR"
          onPress={handleSimulateCopy}
          style={styles.copyRow}
        >
          <Ionicons
            name={copied ? "checkmark" : "copy-outline"}
            size={13}
            color={copied ? COLORS.success : COLORS.textMuted}
          />
          <Text style={styles.copyTokenText}>
            {claim.qr_token_hash.length > 24
              ? `${claim.qr_token_hash.slice(0, 12)}...${claim.qr_token_hash.slice(-8)}`
              : claim.qr_token_hash}
          </Text>
          {copied ? (
            <Text style={styles.copiedBadge}>Tersalin</Text>
          ) : null}
        </Pressable>
      </Card>

      {/* Instruksi Titik Serah Terima */}
      <Card padding="md">
        <View style={styles.locationHeaderRow}>
          <View style={styles.locationIconBox}>
            <Ionicons name="business-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.locationTitleCol}>
            <Text style={styles.locationHeaderTitle}>
              Instruksi Titik Serah Terima
            </Text>
            <Text style={styles.locationHeaderSub}>
              Pintu belakang / akses tertutup donatur
            </Text>
          </View>
          <View style={styles.dockTag}>
            <Text style={styles.dockTagText}>Loading Dock</Text>
          </View>
        </View>

        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Catatan Petunjuk Lokasi:</Text>
          <Text style={styles.notesBody}>{handoverNotes}</Text>
        </View>

        <View style={styles.coordRow}>
          <View style={styles.coordTextCol}>
            <Text style={styles.coordLabel}>Koordinat Presisi:</Text>
            <Text style={styles.coordValue}>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka rute navigasi peta"
            onPress={handleOpenMaps}
            style={styles.mapBtn}
          >
            <Ionicons name="navigate-outline" size={14} color={COLORS.primary} />
            <Text style={styles.mapBtnText}>Buka Peta</Text>
          </Pressable>
        </View>
      </Card>

      <Card padding="sm" style={styles.hmacNoticeCard}>
        <View style={styles.hmacNoticeRow}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={COLORS.textMuted}
          />
          <Text style={styles.hmacNoticeText}>
            Token QR memuat tanda tangan HMAC-SHA256 yang dapat diverifikasi
            secara offline oleh donatur di basement tanpa koneksi internet.
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  ticketCard: {
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  ticketHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
  qrWrapper: {
    marginVertical: 14,
    padding: 12,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  placeholderBox: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  placeholderText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  timerCard: {
    width: "100%",
    alignItems: "center",
    padding: 12,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timerLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  timerDigits: {
    fontFamily: MONO_FALLBACK,
    fontSize: 28,
    fontWeight: "700",
    marginVertical: 4,
  },
  timerDesc: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyTokenText: {
    fontFamily: MONO_FALLBACK,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  copiedBadge: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
  },
  locationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationIconBox: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  locationTitleCol: {
    flex: 1,
  },
  locationHeaderTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.text,
  },
  locationHeaderSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  dockTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },
  dockTagText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  notesBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.input,
    padding: 10,
    marginTop: 10,
  },
  notesTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  notesBody: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    marginTop: 2,
    lineHeight: 16,
  },
  coordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  coordTextCol: {
    flex: 1,
  },
  coordLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  coordValue: {
    fontFamily: MONO_FALLBACK,
    fontSize: 12,
    color: COLORS.text,
    marginTop: 1,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  mapBtnText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.primary,
  },
  hmacNoticeCard: {
    backgroundColor: COLORS.background,
  },
  hmacNoticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  hmacNoticeText: {
    flex: 1,
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
});
