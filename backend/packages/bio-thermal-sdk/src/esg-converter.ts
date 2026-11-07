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
