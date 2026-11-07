import test from 'node:test';
import assert from 'node:assert/strict';
import { FoodRiskCategory } from '@sirkula/shared-types';
import { calculateDynamicSafeWindow } from './q10-calculator.js';
import { calculateEsgMetrics } from './esg-converter.js';

test('Q10 Calculator - Standard Reference Temp (25C, 60% RH)', () => {
  const result = calculateDynamicSafeWindow({
    category: FoodRiskCategory.WET_COCONUT_MILK, // base: 120 min
    ambientTempC: 25.0,
    humidityPct: 60,
    exposedMinutesPrior: 0,
    isAcRoom: false,
  });

  assert.equal(result.baseShelfLifeMin, 120);
  assert.equal(result.q10DecayMultiplier, 1.0);
  // raw: 120 * 1 * 1 = 120. buffer = 20 -> safe window = 100 min
  assert.equal(result.safeWindowHumanMin, 100);
  assert.ok(result.tier2ExpiresAt.getTime() > result.tier1ExpiresAt.getTime());
});

test('Q10 Calculator - Hot Humid Tropical Scenario (35C, 85% RH)', () => {
  const result = calculateDynamicSafeWindow({
    category: FoodRiskCategory.WET_COCONUT_MILK, // base: 120 min
    ambientTempC: 35.0,
    humidityPct: 85,
    exposedMinutesPrior: 15,
    isAcRoom: false,
  });

  // At 35C: Q10^(-(35-25)/10) = 2.2^(-1) = 1 / 2.2 ~= 0.455
  // Humidity penalty: 1 - 0.15 * ((85-70)/30) = 1 - 0.15 * 0.5 = 0.925
  // raw: 120 * 0.4545 * 0.925 ~= 50.45
  // safe: 50.45 - 15 - 20 = 15.45 -> 15 min
  assert.ok(result.q10DecayMultiplier < 0.5);
  assert.ok(result.safeWindowHumanMin < 25);
  assert.ok(result.safeWindowHumanMin > 10);
});

test('Q10 Calculator - Air Conditioned Room (32C outside, AC on)', () => {
  const result = calculateDynamicSafeWindow({
    category: FoodRiskCategory.MOIST_PROTEIN_CARB, // base: 240 min
    ambientTempC: 32.0,
    humidityPct: 65,
    isAcRoom: true,
  });

  assert.equal(result.effectiveTempC, 22.0);
  // At 22C: Q10^(-(22-25)/10) = 2.2^(0.3) ~= 1.268 (cooler than reference extends life)
  assert.ok(result.q10DecayMultiplier > 1.2);
});

test('ESG Converter - Computes CO2e, CH4, and feed savings accurately', () => {
  const metrics = calculateEsgMetrics(10.0);
  assert.equal(metrics.co2eAvoidedKg, 25.0);
  assert.equal(metrics.methaneCh4AvoidedKg, 1.5);
  assert.equal(metrics.estimatedFeedSavingsIdr, 38000.0);
});
