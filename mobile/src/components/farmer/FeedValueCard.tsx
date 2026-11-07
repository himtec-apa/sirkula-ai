import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { formatIdr, formatKg, formatNumber } from "@/lib/format";
import {
  estimateBsfHarvestYieldKg,
  estimateBsfLarvaeCount,
  estimateCo2eAvoidedKg,
  estimateFeedSavingsIdr,
} from "@/lib/esg-converter";
import { COLORS, FONTS, RADIUS, TYPOGRAPHY } from "@/config/theme";

export interface FeedValueCardProps {
  weightKg?: number;
  interactive?: boolean;
  title?: string;
  subtitle?: string;
}

export function FeedValueCard({
  weightKg: initialWeight = 50,
  interactive = false,
  title = "Kalkulator Nilai Biomasa Pakan",
  subtitle = "Konversi otomatis limbah pangan menjadi nilai ekonomi pakan ternak.",
}: FeedValueCardProps) {
  const [currentWeight, setCurrentWeight] = useState<number>(initialWeight);

  const feedSavingsIdr = estimateFeedSavingsIdr(currentWeight);
  const bsfLarvaeCount = estimateBsfLarvaeCount(currentWeight);
  const bsfHarvestYieldKg = estimateBsfHarvestYieldKg(currentWeight);
  const co2eAvoidedKg = estimateCo2eAvoidedKg(currentWeight);

  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Ionicons name="bug" size={18} color={COLORS.accent} />
          </View>
          <View style={styles.titleCol}>
            <Text style={styles.titleText}>{title}</Text>
            {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.badgeWeight}>
          <Text style={styles.badgeWeightText}>
            {formatKg(currentWeight)}
          </Text>
        </View>
      </View>

      {interactive ? (
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Uji Simulasi Bobot (kg):</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={String(currentWeight)}
              onChangeText={(text) => {
                const val = parseFloat(text);
                setCurrentWeight(isNaN(val) || val < 0 ? 0 : val);
              }}
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        <View style={styles.metricBoxHighlight}>
          <Text style={styles.metricLabelHighlight}>Hemat Pakan Komersial</Text>
          <Text style={styles.metricValueHighlight}>
            {formatIdr(feedSavingsIdr)}
          </Text>
          <Text style={styles.metricFormulaText}>Formula Rp 3.800 per kg</Text>
        </View>

        <View style={styles.metricBoxNormal}>
          <Text style={styles.metricLabelNormal}>Kapasitas Larva BSF</Text>
          <Text style={styles.metricValueNormal}>
            {formatNumber(bsfLarvaeCount)}
          </Text>
          <Text style={styles.metricFormulaText}>~3.000 larva per kg</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Ionicons name="leaf-outline" size={14} color={COLORS.primary} />
          <Text style={styles.footerItemText}>
            Potensi Maggot:{" "}
            <Text style={styles.boldText}>{formatKg(bsfHarvestYieldKg)}</Text>
          </Text>
        </View>

        <View style={styles.footerItem}>
          <Ionicons
            name="shield-checkmark-outline"
            size={14}
            color={COLORS.primary}
          />
          <Text style={styles.footerItemText}>
            Reduksi CO2e:{" "}
            <Text style={styles.boldText}>{formatKg(co2eAvoidedKg)}</Text>
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: `${COLORS.accent}40`,
    backgroundColor: COLORS.surface,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.amberLight,
    justifyContent: "center",
    alignItems: "center",
  },
  titleCol: {
    flex: 1,
  },
  titleText: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.text,
  },
  subtitleText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  badgeWeight: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
  },
  badgeWeightText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.surface,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    padding: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
  },
  inputLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.input,
    paddingHorizontal: 8,
    height: 34,
  },
  textInput: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
    width: 60,
    textAlign: "right",
    padding: 0,
  },
  inputUnit: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  metricBoxHighlight: {
    flex: 1,
    padding: 10,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: `${COLORS.accent}30`,
    backgroundColor: COLORS.amberLight,
  },
  metricLabelHighlight: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.amberDark,
  },
  metricValueHighlight: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
    marginTop: 2,
  },
  metricBoxNormal: {
    flex: 1,
    padding: 10,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  metricLabelNormal: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  metricValueNormal: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
    marginTop: 2,
  },
  metricFormulaText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: RADIUS.input,
    marginTop: 10,
  },
  footerItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerItemText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  boldText: {
    fontWeight: "700",
    color: COLORS.text,
  },
});
