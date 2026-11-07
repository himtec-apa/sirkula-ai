import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CountdownBadge } from "@/components/ui/CountdownBadge";
import { formatDateTime, formatKg, formatPortions } from "@/lib/format";
import { COLORS, TYPOGRAPHY } from "@/config/theme";
import { BatchState, type BatchWithItems } from "@/types/sirkula";

export interface BatchCardProps {
  batch: BatchWithItems;
  tone?: "default" | "tier2";
  showCountdown?: boolean;
  footer?: ReactNode;
}

function isActiveState(state: BatchState): boolean {
  return (
    state === BatchState.TIER_1_HUMAN_ACTIVE ||
    state === BatchState.TIER_1_CLAIMED ||
    state === BatchState.TIER_2_ANIMAL_ACTIVE ||
    state === BatchState.TIER_2_CLAIMED
  );
}

export function BatchCard({
  batch,
  tone = "default",
  showCountdown = false,
  footer,
}: BatchCardProps) {
  const expiryIso =
    tone === "tier2" ? batch.tier2_expires_at : batch.tier1_expires_at;
  const active = isActiveState(batch.current_state);

  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.headerRow}>
        <Badge status={batch.current_state} size="sm" />
        {showCountdown && active ? (
          <CountdownBadge expiresAt={expiryIso} size="sm" />
        ) : (
          <Text style={styles.dateText}>
            {formatDateTime(batch.updated_at)}
          </Text>
        )}
      </View>

      <Text style={styles.summaryText}>{batch.batch_summary}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons
            name="restaurant-outline"
            size={14}
            color={COLORS.textMuted}
          />
          <Text style={styles.metaText}>
            {formatPortions(batch.total_portions)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons
            name="scale-outline"
            size={14}
            color={COLORS.textMuted}
          />
          <Text style={styles.metaText}>
            {formatKg(batch.total_weight_kg)}
          </Text>
        </View>
      </View>

      {tone === "tier2" ? (
        <View style={styles.tier2Tag}>
          <Ionicons name="leaf" size={14} color={COLORS.surface} />
          <Text style={styles.tier2TagText}>Khusus Biomasa Pakan Ternak</Text>
        </View>
      ) : null}

      {active ? (
        <Text style={styles.expiryNote}>
          {tone === "tier2"
            ? `Batas alih kompos: ${formatDateTime(batch.tier2_expires_at)}`
            : `Batas aman manusia: ${formatDateTime(batch.tier1_expires_at)}`}
        </Text>
      ) : null}

      {footer ? <View style={styles.footerRow}>{footer}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  summaryText: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  tier2Tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  tier2TagText: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.surface,
  },
  expiryNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
});
