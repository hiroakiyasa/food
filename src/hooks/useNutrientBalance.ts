import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useNutritionTargets } from './useNutritionTargets';
import { useMealsByDate } from './useMeals';
import { NUTRIENT_DEFINITIONS, type NutrientDefinition } from '@/src/lib/nutritionConstants';
import type { Database, Json } from '@/src/types/database';
import type {
  NutrientBalanceItem,
  NutrientBalanceData,
  NutrientStatus,
  MacroRadarPoint,
} from '@/src/types/nutrientBalance';
import { fetchMicronutrientsBatch, type MicronutrientData } from '@/src/services/food/micronutrientStorage';

type FoodItem = Database['public']['Tables']['food_items']['Row'];

// Enriched food item with micronutrients from Storage
type EnrichedFoodItem = FoodItem & {
  _micro?: MicronutrientData;
};

function getStatus(
  ratio: number,
  defThreshold: number,
  excThreshold: number,
): NutrientStatus {
  if (ratio < defThreshold) return 'deficient';
  if (ratio > excThreshold) return 'excessive';
  return 'adequate';
}

function parseNumericValue(value: Json | undefined): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  return null;
}

function extractJsonValue(json: Json | null, key: string): number | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const record = json as Record<string, Json | undefined>;
  const v = parseNumericValue(record[key]);
  if (v !== null) return v;
  const normalizedKey = key.toLowerCase();
  const fallback = Object.entries(record).find(([k]) => k.toLowerCase() === normalizedKey);
  if (fallback) return parseNumericValue(fallback[1]);
  return null;
}

function extractSaturatedFatPer100g(foodItem: EnrichedFoodItem): number | null {
  // Storage fat section uses short key 'sfa'
  const fatSection = foodItem._micro?.fat;
  if (fatSection) {
    const val = fatSection['sfa'];
    if (typeof val === 'number') return val;
  }
  // Fallback to DB column (legacy path)
  return extractJsonValue(foodItem.fatty_acids as Json | null, 'sfa')
    ?? extractJsonValue(foodItem.fatty_acids as Json | null, 'saturated_total_g')
    ?? null;
}

function getFoodItemNutrientPer100g(
  def: NutrientDefinition,
  foodItem: EnrichedFoodItem,
): number | null {
  if (def.key === 'cholesterol') {
    return foodItem.cholesterol_mg ?? null;
  }

  if (def.key === 'saturatedFat') {
    return extractSaturatedFatPer100g(foodItem);
  }

  if (!def.foodItemJsonKey || !def.foodItemJsonColumn) {
    return null;
  }

  // Use Storage nutrients data (short keys in min/vit sections)
  // NUTRIENT_TO_COMPACT maps foodItemJsonKey -> { column, shortKey }
  if (def.foodItemJsonColumn === 'minerals') {
    const minSection = foodItem._micro?.min;
    if (minSection) {
      // Look up via NUTRIENT_TO_COMPACT short key mapping
      const shortKey = MINERAL_SHORT_MAP[def.foodItemJsonKey];
      if (shortKey) {
        const val = minSection[shortKey];
        if (typeof val === 'number') return val;
      }
    }
    // Fallback to DB column
    return extractJsonValue(foodItem.minerals as Json | null, def.foodItemJsonKey);
  }
  if (def.foodItemJsonColumn === 'vitamins') {
    const vitSection = foodItem._micro?.vit;
    if (vitSection) {
      const shortKey = VITAMIN_SHORT_MAP[def.foodItemJsonKey];
      if (shortKey) {
        const val = vitSection[shortKey];
        if (typeof val === 'number') return val;
      }
    }
    // Fallback to DB column
    return extractJsonValue(foodItem.vitamins as Json | null, def.foodItemJsonKey);
  }

  return null;
}

// Inline short key maps for NUTRIENT_DEFINITIONS lookup
const MINERAL_SHORT_MAP: Record<string, string> = {
  sodium: 'na', potassium: 'k', calcium: 'ca', magnesium: 'mg_',
  phosphorus: 'p', iron: 'fe', zinc: 'zn', copper: 'cu',
  manganese: 'mn', iodine: 'i', selenium: 'se', chromium: 'cr', molybdenum: 'mo',
};
const VITAMIN_SHORT_MAP: Record<string, string> = {
  retinol: 'ret', alphaCarotene: 'acar', betaCarotene: 'bcar',
  betaCryptoxanthin: 'bcry', betaCaroteneEquiv: 'bce', retinolActivityEquiv: 'rae',
  vitaminD: 'vd', alphaTocopherol: 'at', betaTocopherol: 'bt',
  gammaTocopherol: 'gt', deltaTocopherol: 'dt', vitaminK: 'vk',
  vitaminB1: 'b1', vitaminB2: 'b2', niacin: 'nia', niacinEquiv: 'nie',
  vitaminB6: 'b6', vitaminB12: 'b12', folate: 'fol',
  pantothenicAcid: 'pa', biotin: 'bio', vitaminC: 'vc',
};

interface UseNutrientBalanceOptions {
  date: string;
  mealId?: string;
}

export function useNutrientBalance({ date, mealId }: UseNutrientBalanceOptions) {
  const { data: targets } = useNutritionTargets();
  const { data: meals = [] } = useMealsByDate(date);

  // Collect food_item_ids from relevant meal items
  const mealItems = useMemo(() => {
    if (mealId) {
      const meal = meals.find((m) => m.id === mealId);
      return meal?.meal_items ?? [];
    }
    return meals.flatMap((m) => m.meal_items);
  }, [meals, mealId]);

  const foodItemIds = useMemo(
    () => mealItems.filter((mi) => mi.food_item_id).map((mi) => mi.food_item_id!),
    [mealItems],
  );
  const uniqueFoodItemIds = useMemo(
    () => Array.from(new Set(foodItemIds)),
    [foodItemIds],
  );
  const foodItemIdsKey = useMemo(
    () => [...uniqueFoodItemIds].sort().join(','),
    [uniqueFoodItemIds],
  );

  // Fetch food_items + micronutrients from Storage
  const { data: foodItems = [] } = useQuery({
    queryKey: ['food-items-micro', foodItemIdsKey],
    queryFn: async (): Promise<EnrichedFoodItem[]> => {
      if (uniqueFoodItemIds.length === 0) return [];

      // Fetch basic food item data from DB
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .in('id', uniqueFoodItemIds);
      if (error) throw error;
      const items = (data ?? []) as FoodItem[];

      // Fetch micronutrients from Storage in batch
      const microMap = await fetchMicronutrientsBatch(
        items.map((fi) => ({ id: fi.id, food_code: fi.food_code, source: fi.source })),
      );

      // Merge Storage data into food items
      return items.map((fi) => ({
        ...fi,
        _micro: microMap.get(fi.id),
      }));
    },
    enabled: uniqueFoodItemIds.length > 0,
  });

  const balanceData = useMemo((): NutrientBalanceData | null => {
    if (mealItems.length === 0 && !mealId) return null;

    const foodItemMap = new Map(foodItems.map((fi) => [fi.id, fi]));

    // Sum macro values from meal_items directly
    const macroSums: Record<string, number> = {
      energy: 0,
      protein: 0,
      fat: 0,
      carbohydrate: 0,
      fiber: 0,
      salt: 0,
    };

    for (const mi of mealItems) {
      macroSums.energy += mi.energy_kcal ?? 0;
      macroSums.protein += mi.protein_g ?? 0;
      macroSums.fat += mi.fat_g ?? 0;
      macroSums.carbohydrate += mi.carbohydrate_g ?? 0;
      macroSums.fiber += mi.fiber_g ?? 0;
      // Convert sodium_mg to salt_g approximation: salt_g ≈ sodium_mg * 2.54 / 1000
      macroSums.salt += ((mi.sodium_mg ?? 0) * 2.54) / 1000;
    }

    // Sum micronutrient values from food_items data (100g-basis -> portion basis)
    const microSums: Record<string, number> = {};
    const itemsWithFoodId = mealItems.filter((mi) => mi.food_item_id);

    for (const mi of itemsWithFoodId) {
      const fi = foodItemMap.get(mi.food_item_id!);
      if (!fi) continue;
      const portionRatio = mi.portion_grams && mi.portion_grams > 0
        ? mi.portion_grams / 100
        : 1;

      for (const def of NUTRIENT_DEFINITIONS) {
        if (def.key in macroSums) continue;
        const per100g = getFoodItemNutrientPer100g(def, fi);
        if (per100g === null) continue;
        microSums[def.key] = (microSums[def.key] ?? 0) + per100g * portionRatio;
      }
    }

    const hasEstimatedMicro = itemsWithFoodId.length < mealItems.length;

    // Build nutrient balance items
    const nutrients: NutrientBalanceItem[] = NUTRIENT_DEFINITIONS.map((def) => {
      // Get current value
      let currentValue = 0;
      if (def.key in macroSums) {
        currentValue = macroSums[def.key];
      } else {
        currentValue = microSums[def.key] ?? 0;
      }

      // Get target value
      let targetValue = def.defaultTarget;
      if (targets && def.dbTargetKey) {
        const dbVal = (targets as unknown as Record<string, unknown>)[def.dbTargetKey];
        if (typeof dbVal === 'number' && dbVal > 0) {
          targetValue = dbVal;
        }
      }

      const ratio = targetValue > 0 ? currentValue / targetValue : 0;
      const status = getStatus(ratio, def.deficientThreshold, def.excessiveThreshold);
      const isEstimated = !(def.key in macroSums) && hasEstimatedMicro;

      return {
        key: def.key,
        nameJa: def.nameJa,
        unit: def.unit,
        currentValue,
        targetValue,
        ratio,
        status,
        color: def.color,
        category: def.category,
        isEstimated,
      };
    });

    // Macro radar
    const macroRadar: MacroRadarPoint[] = [
      {
        label: 'P',
        value: macroSums.protein,
        maxValue: targets?.protein_g ?? 60,
      },
      {
        label: 'F',
        value: macroSums.fat,
        maxValue: targets?.fat_g ?? 55,
      },
      {
        label: 'C',
        value: macroSums.carbohydrate,
        maxValue: targets?.carbohydrate_g ?? 300,
      },
      {
        label: '繊維',
        value: macroSums.fiber,
        maxValue: targets?.fiber_g ?? 20,
      },
    ];

    return {
      viewType: mealId ? 'meal' : 'daily',
      nutrients,
      macroRadar,
    };
  }, [mealItems, foodItems, targets, mealId]);

  return balanceData;
}
