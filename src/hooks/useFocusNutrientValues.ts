import { useMemo } from 'react';
import { useNutrientBalance } from './useNutrientBalance';
import type { MergedFocusNutrient } from './useActiveConditions';

// Map from guideline nutrientKey → NutrientBalance key
const GUIDELINE_TO_BALANCE_KEY: Record<string, string> = {
  folicAcid: 'folate',
  iron: 'iron',
  vitaminD: 'vitaminD',
  vitaminB12: 'vitaminB12',
  vitaminC: 'vitaminC',
  calcium: 'calcium',
  saltEquivalent: 'salt',
  protein: 'protein',
  zinc: 'zinc',
  omega3: 'omega3',
  vitaminA: 'retinolActivityEquiv',
  vitaminE: 'alphaTocopherol',
  vitaminK: 'vitaminK',
  vitaminB1: 'vitaminB1',
  vitaminB2: 'vitaminB2',
  niacin: 'niacin',
  vitaminB6: 'vitaminB6',
  pantothenicAcid: 'pantothenicAcid',
  biotin: 'biotin',
  phosphorus: 'phosphorus',
  magnesium: 'magnesium',
  potassium: 'potassium',
  iodine: 'iodine',
  selenium: 'selenium',
  copper: 'copper',
  manganese: 'manganese',
  fat: 'fat',
  carbohydrate: 'carbohydrate',
  fiber: 'fiber',
  saturatedFat: 'saturatedFat',
  cholesterol: 'cholesterol',
  sodium: 'salt',
};

export interface FocusNutrientValue {
  currentValue: number;
  targetValue: number;
  unit: string;
  ratio: number;
  status: string;
}

export function useFocusNutrientValues(
  focusNutrients: MergedFocusNutrient[],
  date: string,
): Map<string, FocusNutrientValue> {
  const balanceData = useNutrientBalance({ date });

  return useMemo(() => {
    const map = new Map<string, FocusNutrientValue>();
    if (!balanceData) return map;

    const indexed = new Map(balanceData.nutrients.map((n) => [n.key, n]));

    for (const fn of focusNutrients) {
      if (!fn.nutrientKey) continue;
      const balanceKey = GUIDELINE_TO_BALANCE_KEY[fn.nutrientKey];
      if (!balanceKey) continue;
      const item = indexed.get(balanceKey);
      if (item) {
        map.set(fn.nutrientKey, {
          currentValue: item.currentValue,
          targetValue: item.targetValue,
          unit: item.unit,
          ratio: item.ratio,
          status: item.status,
        });
      }
    }

    return map;
  }, [balanceData, focusNutrients]);
}
