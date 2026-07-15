import type { NutrientValues, NutrientTarget, MealScore } from '@/src/types/nutrition';

export function calculateMealScore(
  nutrients: NutrientValues,
  target: NutrientTarget,
): MealScore {
  // PFC balance score (ideal: P15% F25% C60%)
  const totalCal = nutrients.energy_kcal || 1;
  const pPct = ((nutrients.protein_g * 4) / totalCal) * 100;
  const fPct = ((nutrients.fat_g * 9) / totalCal) * 100;
  const cPct = ((nutrients.carbohydrate_g * 4) / totalCal) * 100;

  const pDiff = Math.abs(pPct - 15);
  const fDiff = Math.abs(fPct - 25);
  const cDiff = Math.abs(cPct - 60);
  const pfcBalance = Math.max(0, 100 - (pDiff + fDiff + cDiff));

  // Fiber score (target ~7g per meal for 21g/day)
  const mealFiberTarget = target.fiber_g / 3;
  const fiberRatio = Math.min(nutrients.fiber_g / mealFiberTarget, 1.5);
  const fiberScore = Math.min(100, fiberRatio * 100);

  // Sodium score (lower is better, target ~767mg per meal for 2300mg/day)
  const mealSodiumTarget = target.sodium_mg / 3;
  const sodiumRatio = nutrients.sodium_mg / mealSodiumTarget;
  const sodiumScore = sodiumRatio <= 1 ? 100 : Math.max(0, 100 - (sodiumRatio - 1) * 50);

  // Variety score placeholder (based on number of items - will be refined)
  const varietyScore = 70;

  const overall = Math.round(
    pfcBalance * 0.3 + fiberScore * 0.25 + sodiumScore * 0.25 + varietyScore * 0.2,
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    pfc_balance: Math.round(pfcBalance),
    fiber_score: Math.round(fiberScore),
    sodium_score: Math.round(sodiumScore),
    variety_score: varietyScore,
  };
}

export function getTrafficLight(nutrientPer100g: {
  fat: number;
  saturatedFat: number;
  sugar: number;
  salt: number;
}): { fat: string; saturated_fat: string; sugar: string; salt: string } {
  const classify = (value: number, low: number, high: number) => {
    if (value <= low) return 'green';
    if (value <= high) return 'amber';
    return 'red';
  };

  return {
    fat: classify(nutrientPer100g.fat, 3, 17.5),
    saturated_fat: classify(nutrientPer100g.saturatedFat, 1.5, 5),
    sugar: classify(nutrientPer100g.sugar, 5, 22.5),
    salt: classify(nutrientPer100g.salt, 0.3, 1.5),
  };
}
