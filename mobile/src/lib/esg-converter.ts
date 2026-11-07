import {
  calculateFeedSavingsIdr,
  calculateCo2eAvoided,
  calculateMethaneAvoided,
  calculateDynamicSafeWindow as calculateDynamicSafeWindowSdk,
  FEED_SAVINGS_IDR_PER_KG,
  CO2E_FACTOR_PER_KG,
  METHANE_CH4_FACTOR_PER_KG,
  Q10_TEMPERATURE_COEFFICIENT,
  REFERENCE_TEMPERATURE_C,
} from "@sirkula/bio-thermal-sdk";

export {
  calculateFeedSavingsIdr,
  calculateCo2eAvoided,
  calculateMethaneAvoided,
  calculateDynamicSafeWindowSdk,
  FEED_SAVINGS_IDR_PER_KG,
  CO2E_FACTOR_PER_KG,
  METHANE_CH4_FACTOR_PER_KG,
};

export const CO2E_AVOIDED_KG_PER_KG = CO2E_FACTOR_PER_KG;
export const METHANE_AVOIDED_KG_PER_KG = METHANE_CH4_FACTOR_PER_KG;
export const BSF_LARVAE_FED_PER_KG = 3000;
export const BSF_HARVEST_YIELD_RATIO = 0.2;
export const Q10_COEFFICIENT = Q10_TEMPERATURE_COEFFICIENT;
export const REFERENCE_TEMP_C = REFERENCE_TEMPERATURE_C;

export function estimateFeedSavingsIdr(weightKg: number): number {
  return calculateFeedSavingsIdr(weightKg);
}

export function estimateBsfLarvaeCount(weightKg: number): number {
  return Math.round(weightKg * BSF_LARVAE_FED_PER_KG);
}

export function estimateBsfHarvestYieldKg(weightKg: number): number {
  return Number((weightKg * BSF_HARVEST_YIELD_RATIO).toFixed(2));
}

export function estimateCo2eAvoidedKg(weightKg: number): number {
  return calculateCo2eAvoided(weightKg);
}

export function estimateMethaneAvoidedKg(weightKg: number): number {
  return calculateMethaneAvoided(weightKg);
}

export function calculateQ10DecayMultiplier(
  ambientTempC: number,
  referenceTempC = REFERENCE_TEMP_C,
): number {
  const deltaT = ambientTempC - referenceTempC;
  const exponent = deltaT / 10.0;
  return Number(Math.pow(Q10_COEFFICIENT, exponent).toFixed(2));
}

export function calculateDynamicSafeWindow(
  baseShelfLifeMin: number,
  ambientTempC: number,
  isAcRoom: boolean,
  exposedMinutesPrior: number,
): number {
  const effectiveTemp = isAcRoom ? Math.min(ambientTempC, 22.0) : ambientTempC;
  const decayMultiplier = calculateQ10DecayMultiplier(effectiveTemp);
  const adjustedShelfLife = baseShelfLifeMin / Math.max(1.0, decayMultiplier);
  const remaining = adjustedShelfLife - exposedMinutesPrior;
  return Math.max(10, Math.round(remaining));
}
