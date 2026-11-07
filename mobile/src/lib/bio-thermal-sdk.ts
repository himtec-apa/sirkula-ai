import { FoodRiskCategory } from "@/types/sirkula";

export const Q10_TEMPERATURE_COEFFICIENT = 2.2;
export const REFERENCE_TEMPERATURE_C = 25.0;
export const HUMIDITY_PENALTY_FACTOR = 0.15;
export const COURIER_SAFETY_BUFFER_MINUTES = 20;
export const TIER2_DURATION_MINUTES = 720; // 12 hours after Tier 1

export const BASE_SHELF_LIFE_MAP: Record<FoodRiskCategory, number> = {
  [FoodRiskCategory.WET_COCONUT_MILK]: 120,
  [FoodRiskCategory.WET_NON_COCONUT]: 180,
  [FoodRiskCategory.MOIST_PROTEIN_CARB]: 240,
  [FoodRiskCategory.DRY_FRIED]: 360,
  [FoodRiskCategory.BAKERY_PASTRY]: 300,
};

export interface DynamicSafeWindowParams {
  category: FoodRiskCategory;
  ambientTempC: number;
  humidityPct: number;
  exposedMinutesPrior?: number;
  isAcRoom?: boolean;
  referenceDate?: Date;
}

export interface DynamicSafeWindowResult {
  baseShelfLifeMin: number;
  effectiveTempC: number;
  q10DecayMultiplier: number;
  safeWindowHumanMin: number;
  tier1ExpiresAt: Date;
  tier2ExpiresAt: Date;
}

export function getBaseShelfLifeMin(category: FoodRiskCategory): number {
  return BASE_SHELF_LIFE_MAP[category] ?? 120;
}

/**
 * Pure function to calculate dynamic microbiology safe window (t_safe)
 * using the adapted Arrhenius Q10 formula and environmental parameters.
 */
export function calculateDynamicSafeWindow(params: DynamicSafeWindowParams): DynamicSafeWindowResult {
  const baseShelfLifeMin = getBaseShelfLifeMin(params.category);
  const exposedMinutesPrior = Math.max(0, params.exposedMinutesPrior ?? 0);
  const refDate = params.referenceDate ?? new Date();

  // If room is AC cooled, effective ambient temp is conditioned to max 22.0°C
  const effectiveTempC = params.isAcRoom
    ? Math.min(params.ambientTempC, 22.0)
    : params.ambientTempC;

  // Q10 decay multiplier: Q10^(-(T - T_ref)/10)
  const q10Exponent = -(effectiveTempC - REFERENCE_TEMPERATURE_C) / 10;
  const q10DecayMultiplier = Math.pow(Q10_TEMPERATURE_COEFFICIENT, q10Exponent);

  // Humidity penalty: [1 - alpha * max(0, (RH - 70) / 30)]
  const excessHumidity = Math.max(0, (params.humidityPct - 70) / 30);
  const humidityMultiplier = Math.max(0, 1 - HUMIDITY_PENALTY_FACTOR * excessHumidity);

  // t_safe = max(0, round(t_base * Q10_decay * humidity_factor - t_exposed - t_buffer))
  const rawDecayWindow = baseShelfLifeMin * q10DecayMultiplier * humidityMultiplier;
  const safeWindowHumanMin = Math.max(
    0,
    Math.round(rawDecayWindow - exposedMinutesPrior - COURIER_SAFETY_BUFFER_MINUTES)
  );

  const tier1ExpiresAt = new Date(refDate.getTime() + safeWindowHumanMin * 60 * 1000);
  const tier2ExpiresAt = new Date(tier1ExpiresAt.getTime() + TIER2_DURATION_MINUTES * 60 * 1000);

  return {
    baseShelfLifeMin,
    effectiveTempC: Number(effectiveTempC.toFixed(1)),
    q10DecayMultiplier: Number(q10DecayMultiplier.toFixed(3)),
    safeWindowHumanMin,
    tier1ExpiresAt,
    tier2ExpiresAt,
  };
}

export const CO2E_FACTOR_PER_KG = 2.5; // 2.5 kg CO2e / kg food waste
export const METHANE_CH4_FACTOR_PER_KG = 0.15; // 0.150 kg CH4 / kg food waste
export const FEED_SAVINGS_IDR_PER_KG = 3800.0; // Rp 3.800 / kg animal feed

export interface EsgMetrics {
  co2eAvoidedKg: number;
  methaneCh4AvoidedKg: number;
  estimatedFeedSavingsIdr: number;
}

export function calculateCo2eAvoided(weightKg: number): number {
  if (weightKg <= 0) return 0;
  return Number((Math.round(weightKg * CO2E_FACTOR_PER_KG * 100) / 100).toFixed(2));
}

export function calculateMethaneAvoided(weightKg: number): number {
  if (weightKg <= 0) return 0;
  return Number((Math.round(weightKg * METHANE_CH4_FACTOR_PER_KG * 1000) / 1000).toFixed(3));
}

export function calculateFeedSavingsIdr(weightKg: number): number {
  if (weightKg <= 0) return 0;
  return Number((Math.round(weightKg * FEED_SAVINGS_IDR_PER_KG * 100) / 100).toFixed(2));
}

export function calculateEsgMetrics(weightKg: number): EsgMetrics {
  return {
    co2eAvoidedKg: calculateCo2eAvoided(weightKg),
    methaneCh4AvoidedKg: calculateMethaneAvoided(weightKg),
    estimatedFeedSavingsIdr: calculateFeedSavingsIdr(weightKg),
  };
}
