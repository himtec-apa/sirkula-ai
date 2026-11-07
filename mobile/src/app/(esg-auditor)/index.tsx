import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StateView } from "@/components/ui/StateView";
import { fetchEsgSummary } from "@/lib/api";
import { formatDateTime, formatIdr, formatKg } from "@/lib/format";
import { COLORS, FONTS, RADIUS, TYPOGRAPHY } from "@/config/theme";
import type { EsgSummary } from "@/types/sirkula";

export default function AuditorHomeScreen() {
  const { data, isLoading, isError, refetch } = useQuery<EsgSummary>({
    queryKey: ["esg-summary"],
    queryFn: fetchEsgSummary,
    staleTime: 15_000,
  });

  const summary = data;

  return (
    <ScreenContainer
      title="Telemetri & Audit ESG"
      subtitle="Inspeksi metrik reduksi emisi CO₂e, mitigasi gas metana, dan legalitas digital sertifikat."
    >
      <SectionHeader
        title="Ringkasan Dampak Lingkungan"
        actionLabel="Segarkan"
        onAction={() => {
          void refetch();
        }}
      />

      {isLoading ? (
        <StateView kind="loading" message="Menghubungkan ke pusat telemetri ESG..." />
      ) : isError ? (
        <StateView
          kind="error"
          title="Gagal Mengambil Data Telemetri"
          message="Server analitik ESG tidak merespons."
          actionLabel="Coba Lagi"
          onAction={() => {
            void refetch();
          }}
        />
      ) : !summary ? null : (
        <>
          {/* Main Carbon & Methane Cards */}
          <View style={styles.metricsGrid}>
            <Card padding="md" style={[styles.metricCard, { borderLeftColor: COLORS.success, borderLeftWidth: 4 }]}>
              <View style={styles.metricIconRow}>
                <Ionicons name="leaf" size={20} color={COLORS.success} />
                <Text style={styles.metricTag}>Reduksi Emisi</Text>
              </View>
              <Text style={styles.metricValue}>
                {Number(summary.co2e_avoided_kg).toFixed(1)} kg
              </Text>
              <Text style={styles.metricLabel}>Emisi CO₂e Dihindari</Text>
            </Card>

            <Card padding="md" style={[styles.metricCard, { borderLeftColor: COLORS.info, borderLeftWidth: 4 }]}>
              <View style={styles.metricIconRow}>
                <Ionicons name="cloud" size={20} color={COLORS.info} />
                <Text style={styles.metricTag}>Mitigasi TPA</Text>
              </View>
              <Text style={styles.metricValue}>
                {Number(summary.methane_ch4_avoided_kg).toFixed(2)} kg
              </Text>
              <Text style={styles.metricLabel}>Gas Metana (CH₄) Dicegah</Text>
            </Card>
          </View>

          {/* Secondary Stats Grid */}
          <View style={styles.metricsGrid}>
            <Card padding="md" style={styles.metricCard}>
              <Text style={styles.metricSmallLabel}>Total Batch Rescued</Text>
              <Text style={styles.metricSmallValue}>
                {summary.total_batches_rescued} batch
              </Text>
              <Text style={styles.metricSub}>
                {summary.total_portions_saved} porsi terselamatkan
              </Text>
            </Card>

            <Card padding="md" style={styles.metricCard}>
              <Text style={styles.metricSmallLabel}>Total Biomasa</Text>
              <Text style={styles.metricSmallValue}>
                {formatKg(summary.total_weight_saved_kg)}
              </Text>
              <Text style={styles.metricSub}>
                Penghematan pakan {formatIdr(summary.estimated_feed_savings_idr)}
              </Text>
            </Card>
          </View>

          {/* Recent Waiver Certificates */}
          <SectionHeader title="Sertifikat Serah-Terima Terkini" />

          {summary.recent_waiver_certificates.length === 0 ? (
            <StateView
              kind="empty"
              title="Belum Ada Sertifikat Serah-Terima"
              message="Sertifikat Digital Liability Waiver akan tercatat otomatis saat QR scan selesai."
            />
          ) : (
            summary.recent_waiver_certificates.map((cert) => (
              <Card key={cert.waiver_certificate_no} padding="md" style={styles.certCard}>
                <View style={styles.certHeader}>
                  <View style={styles.certBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
                    <Text style={styles.certBadgeText}>VERIFIED WAIVER</Text>
                  </View>
                  <Text style={styles.certNo}>{cert.waiver_certificate_no}</Text>
                </View>

                <View style={styles.certParties}>
                  <Text style={styles.certPartyName}>
                    <Text style={styles.partyLabel}>Donatur: </Text>
                    {cert.donor_name}
                  </Text>
                  <Text style={styles.certPartyName}>
                    <Text style={styles.partyLabel}>Penerima: </Text>
                    {cert.receiver_name}
                  </Text>
                </View>

                <View style={styles.certStatsRow}>
                  <Text style={styles.certStat}>
                    Berat: <Text style={styles.certBold}>{formatKg(cert.weight_saved_kg)}</Text>
                  </Text>
                  <Text style={styles.certStat}>
                    CO₂e: <Text style={styles.certBold}>{cert.co2e_avoided_kg} kg</Text>
                  </Text>
                  <Text style={styles.certDate}>
                    {formatDateTime(cert.recorded_at)}
                  </Text>
                </View>

                {cert.waiver_signature_hash && (
                  <View style={styles.hashWrap}>
                    <Text numberOfLines={1} style={styles.hashText}>
                      SHA-256: {cert.waiver_signature_hash}
                    </Text>
                  </View>
                )}
              </Card>
            ))
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
  },
  metricIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  metricTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontFamily: FONTS.semiBold,
  },
  metricValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  metricSmallLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  metricSmallValue: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  certCard: {
    marginBottom: 12,
  },
  certHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  certBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  certBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
  certNo: {
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    color: COLORS.textMuted,
  },
  certParties: {
    gap: 4,
    marginBottom: 10,
  },
  partyLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  certPartyName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  certStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginBottom: 8,
  },
  certStat: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  certBold: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  certDate: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  hashWrap: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  hashText: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
  },
});
