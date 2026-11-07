import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { FeedValueCard } from "@/components/farmer/FeedValueCard";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StateView } from "@/components/ui/StateView";
import { fetchNearbyBatches } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { COLORS, RADIUS, TYPOGRAPHY } from "@/config/theme";
import { useActorHeaders } from "@/store/useActorStore";
import { ActorRole, BatchState, type BatchWithItems } from "@/types/sirkula";

export default function FarmerBiomassScreen() {
  const actorHeaders = useActorHeaders();
  const { data, isLoading, isError, refetch } = useQuery<BatchWithItems[]>({
    queryKey: queryKeys.batches.list(ActorRole.TIER_2_FARMER),
    queryFn: () =>
      fetchNearbyBatches(ActorRole.TIER_2_FARMER, actorHeaders, 8000),
    staleTime: 15_000,
  });

  const feedBatches = (data ?? []).filter(
    (b) => b.current_state === BatchState.TIER_2_ANIMAL_ACTIVE,
  );

  return (
    <ScreenContainer
      title="Kalkulator Biomasa Organik"
      subtitle="Kalkulasi konversi limbah organik menjadi pakan maggot BSF & nilai ekonomi."
    >
      <FeedValueCard
        interactive
        weightKg={80}
        title="Simulasi Bebas Bobot Biomasa"
        subtitle="Ketikkan angka bobot (kg) untuk menguji estimasi penghematan & reduksi emisi."
      />

      {isLoading ? (
        <StateView kind="loading" />
      ) : isError ? (
        <StateView
          kind="error"
          actionLabel="Coba Lagi"
          onAction={() => {
            void refetch();
          }}
        />
      ) : feedBatches.length > 0 ? (
        <View style={styles.batchList}>
          <Text style={styles.sectionHeading}>Batch Pakan Terdeteksi di Radar:</Text>
          {feedBatches.map((batch) => (
            <FeedValueCard
              key={batch.id}
              weightKg={batch.total_weight_kg}
              title={batch.batch_summary}
              subtitle={`Bobot batch: ${batch.total_weight_kg} kg • ${batch.recommended_container ?? "Drum Terpal"}`}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.formulaInfoCard}>
        <Text style={styles.formulaTitle}>
          Koefisien Standar SIRKULA-AI (Bio-Thermal & ESG Protocol):
        </Text>
        <Text style={styles.formulaBody}>
          • Biaya pakan komersial: Rp 3.800 per kg material organik.{"\n"}
          • Kapasitas larva BSF (Maggot): ~3.000 larva per kg limbah.{"\n"}
          • Yield panen maggot segar: 20% dari bobot biomasa terurai.{"\n"}
          • Reduksi jejak karbon: 2.5 kg CO2e & 0.15 kg gas metana (CH4) per kg limbah terhindar dari TPA.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  batchList: {
    gap: 10,
    marginTop: 6,
  },
  sectionHeading: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  formulaInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  formulaTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  formulaBody: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
});
