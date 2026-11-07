import { FoodRiskCategory } from '@sirkula/shared-types';

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
