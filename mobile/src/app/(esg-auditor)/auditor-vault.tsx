import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StateView } from "@/components/ui/StateView";
import { fetchEsgSummary } from "@/lib/api";
import { formatDateTime, formatKg } from "@/lib/format";
import { COLORS, FONTS, RADIUS, TYPOGRAPHY } from "@/config/theme";
import type { EsgSummary } from "@/types/sirkula";

export default function AuditorVaultScreen() {
  const { data, isLoading, isError, refetch } = useQuery<EsgSummary>({
    queryKey: ["esg-summary"],
    queryFn: fetchEsgSummary,
    staleTime: 15_000,
  });

  const certificates = data?.recent_waiver_certificates ?? [];

  return (
    <ScreenContainer
      title="Legal Vault Sertifikat"
      subtitle="Arsip sertifikat Good Samaritan Digital Liability Waiver dengan integritas SHA-256."
    >
      {isLoading ? (
        <StateView kind="loading" message="Membuka brankas sertifikat..." />
      ) : isError ? (
        <StateView
          kind="error"
          actionLabel="Coba Lagi"
          onAction={() => {
            void refetch();
          }}
        />
      ) : certificates.length === 0 ? (
        <StateView
          kind="empty"
          title="Brankas Sertifikat Kosong"
          message="Setiap serah-terima makanan yang lolos verifikasi QR secara otomatis menghasilkan sertifikat liability waiver di sini."
        />
      ) : (
        certificates.map((cert) => (
          <Card key={cert.waiver_certificate_no} padding="md" style={styles.card}>
            <View style={styles.header}>
              <Ionicons name="document-text" size={20} color={COLORS.primary} />
              <Text style={styles.certNo}>{cert.waiver_certificate_no}</Text>
            </View>

            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={styles.label}>Pihak Donatur:</Text>
                <Text style={styles.value}>{cert.donor_name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Penerima (Mitra):</Text>
                <Text style={styles.value}>{cert.receiver_name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Biomasa Pangan:</Text>
                <Text style={styles.value}>{formatKg(cert.weight_saved_kg)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Pencegahan Emisi:</Text>
                <Text style={[styles.value, { color: COLORS.success }]}>
                  {cert.co2e_avoided_kg} kg CO₂e
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Waktu Serah-Terima:</Text>
                <Text style={styles.value}>{formatDateTime(cert.recorded_at)}</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.hashLabel}>Digital Signature (SHA-256):</Text>
              <Text numberOfLines={2} style={styles.hashValue}>
                {cert.waiver_signature_hash}
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  certNo: {
    ...TYPOGRAPHY.subtitle,
    fontFamily: FONTS.monoBold,
    color: COLORS.primaryDark,
  },
  body: {
    gap: 6,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  value: {
    ...TYPOGRAPHY.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  footer: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  hashLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  hashValue: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
});
