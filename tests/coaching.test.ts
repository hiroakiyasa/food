import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateAdaptiveEnergy } from '../src/services/coaching/adaptiveEnergy';
import { createNextMealSuggestion } from '../src/services/coaching/nextMealCoach';
import { estimateJapaneseMealUncertainty } from '../src/services/nutrition/japaneseMealEstimator';

test('adaptive energy closes the loop from intake and weight loss', () => {
  const intakes = Array.from({ length: 18 }, (_, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, '0')}`,
    energyKcal: 1800,
  }));
  const result = calculateAdaptiveEnergy({
    dailyIntakes: intakes,
    weights: [
      { date: '2026-06-01', weightKg: 70 },
      { date: '2026-06-08', weightKg: 69.7 },
      { date: '2026-06-15', weightKg: 69.4 },
    ],
    currentTargetKcal: 2000,
    currentProteinG: 80,
    goal: 'weight_loss',
  });
  assert.ok(result.estimatedExpenditureKcal > 1900);
  assert.ok(result.recommendedEnergyKcal >= 1820, 'weekly adjustment is intentionally bounded');
  assert.ok(result.confidence > 0.65);
});

test('adaptive energy stays conservative with sparse data', () => {
  const result = calculateAdaptiveEnergy({
    dailyIntakes: [{ date: '2026-07-15', energyKcal: 900 }],
    weights: [],
    currentTargetKcal: 2100,
    currentProteinG: 80,
  });
  assert.ok(Math.abs(result.recommendedEnergyKcal - 2100) <= 180);
  assert.ok(result.confidence < 0.4);
  assert.match(result.explanation, /記録が少ない/);
});

test('next meal coach prioritizes sodium safety before other deficits', () => {
  const suggestion = createNextMealSuggestion({
    hour: 18,
    calories: 1200,
    proteinG: 30,
    fiberG: 8,
    sodiumMg: 2500,
    targetCalories: 2000,
    targetProteinG: 80,
    targetFiberG: 21,
    targetSodiumMg: 2600,
  });
  assert.match(suggestion.title, /塩分/);
  assert.equal(suggestion.mealType, 'dinner');
});

test('Japanese soup analysis expands uncertainty and asks about broth', () => {
  const result = estimateJapaneseMealUncertainty({
    name: '味噌ラーメン',
    detected_name: 'ラーメン',
    portion_grams: 500,
    energy_kcal: 620,
    confidence: 0.72,
    estimate_basis: 'database',
  });
  assert.ok(result.portionMinGrams < 500);
  assert.ok(result.portionMaxGrams > 500);
  assert.ok(result.hiddenIngredientFlags.includes('broth'));
  assert.match(result.confirmationPrompt ?? '', /スープ|汁/);
});
