import { palette } from './theme';

export type NutrientCategory = 'macro' | 'mineral' | 'vitamin' | 'other';

export interface NutrientDefinition {
  key: string;
  nameJa: string;
  unit: string;
  defaultTarget: number;
  color: string;
  category: NutrientCategory;
  /** Ratio below which status is 'deficient' */
  deficientThreshold: number;
  /** Ratio above which status is 'excessive' */
  excessiveThreshold: number;
  /** DB column on nutrition_targets if available */
  dbTargetKey?: string;
  /** Short key in compressed food_items.minerals or food_items.vitamins JSONB */
  foodItemJsonKey?: string;
  /** Which JSONB column to look in: 'minerals' or 'vitamins' */
  foodItemJsonColumn?: 'minerals' | 'vitamins';
}

export const NUTRIENT_DEFINITIONS: NutrientDefinition[] = [
  // Macro
  {
    key: 'energy',
    nameJa: 'エネルギー',
    unit: 'kcal',
    defaultTarget: 2000,
    color: palette.primary,
    category: 'macro',
    deficientThreshold: 0.6,
    excessiveThreshold: 1.3,
    dbTargetKey: 'energy_kcal',
  },
  {
    key: 'protein',
    nameJa: 'たんぱく質',
    unit: 'g',
    defaultTarget: 60,
    color: palette.protein,
    category: 'macro',
    deficientThreshold: 0.6,
    excessiveThreshold: 1.3,
    dbTargetKey: 'protein_g',
  },
  {
    key: 'fat',
    nameJa: '脂質',
    unit: 'g',
    defaultTarget: 55,
    color: palette.fat,
    category: 'macro',
    deficientThreshold: 0.6,
    excessiveThreshold: 1.3,
    dbTargetKey: 'fat_g',
  },
  {
    key: 'carbohydrate',
    nameJa: '炭水化物',
    unit: 'g',
    defaultTarget: 300,
    color: palette.carbs,
    category: 'macro',
    deficientThreshold: 0.6,
    excessiveThreshold: 1.3,
    dbTargetKey: 'carbohydrate_g',
  },
  // Mineral
  {
    key: 'fiber',
    nameJa: '食物繊維',
    unit: 'g',
    defaultTarget: 20,
    color: palette.fiber,
    category: 'mineral',
    deficientThreshold: 0.6,
    excessiveThreshold: 2.0,
    dbTargetKey: 'fiber_g',
  },
  {
    key: 'calcium',
    nameJa: 'カルシウム',
    unit: 'mg',
    defaultTarget: 650,
    color: palette.calcium,
    category: 'mineral',
    deficientThreshold: 0.6,
    excessiveThreshold: 1.5,
    dbTargetKey: 'calcium_mg',
    foodItemJsonKey: 'ca',
    foodItemJsonColumn: 'minerals',
  },
  {
    key: 'iron',
    nameJa: '鉄',
    unit: 'mg',
    defaultTarget: 7.5,
    color: palette.iron,
    category: 'mineral',
    deficientThreshold: 0.6,
    excessiveThreshold: 1.5,
    dbTargetKey: 'iron_mg',
    foodItemJsonKey: 'fe',
    foodItemJsonColumn: 'minerals',
  },
  // Vitamin
  {
    key: 'vitaminA',
    nameJa: 'ビタミンA',
    unit: 'μgRAE',
    defaultTarget: 700,
    color: palette.vitaminA,
    category: 'vitamin',
    deficientThreshold: 0.6,
    excessiveThreshold: 1.5,
    foodItemJsonKey: 'rae',
    foodItemJsonColumn: 'vitamins',
  },
  {
    key: 'vitaminE',
    nameJa: 'ビタミンE',
    unit: 'mg',
    defaultTarget: 6.0,
    color: palette.vitaminE,
    category: 'vitamin',
    deficientThreshold: 0.6,
    excessiveThreshold: 1.5,
    foodItemJsonKey: 'at',
    foodItemJsonColumn: 'vitamins',
  },
  {
    key: 'vitaminB1',
    nameJa: 'ビタミンB1',
    unit: 'mg',
    defaultTarget: 1.1,
    color: palette.vitaminB1,
    category: 'vitamin',
    deficientThreshold: 0.6,
    excessiveThreshold: 2.0,
    foodItemJsonKey: 'b1',
    foodItemJsonColumn: 'vitamins',
  },
  {
    key: 'vitaminB2',
    nameJa: 'ビタミンB2',
    unit: 'mg',
    defaultTarget: 1.2,
    color: palette.vitaminB2,
    category: 'vitamin',
    deficientThreshold: 0.6,
    excessiveThreshold: 2.0,
    foodItemJsonKey: 'b2',
    foodItemJsonColumn: 'vitamins',
  },
  {
    key: 'vitaminC',
    nameJa: 'ビタミンC',
    unit: 'mg',
    defaultTarget: 100,
    color: palette.vitaminC,
    category: 'vitamin',
    deficientThreshold: 0.6,
    excessiveThreshold: 2.0,
    foodItemJsonKey: 'vc',
    foodItemJsonColumn: 'vitamins',
  },
  // Other
  {
    key: 'saturatedFat',
    nameJa: '飽和脂肪酸',
    unit: 'g',
    defaultTarget: 16,
    color: palette.saturatedFat,
    category: 'other',
    deficientThreshold: 0.3,
    excessiveThreshold: 1.3,
    // saturated fat is derived from fatty_acids JSON (food item dataset)
  },
  {
    key: 'salt',
    nameJa: '塩分',
    unit: 'g',
    defaultTarget: 7.5,
    color: palette.salt,
    category: 'other',
    deficientThreshold: 0.3,
    excessiveThreshold: 1.3,
    dbTargetKey: 'salt_g',
  },
  {
    key: 'cholesterol',
    nameJa: 'コレステロール',
    unit: 'mg',
    defaultTarget: 200,
    color: palette.cholesterol,
    category: 'other',
    deficientThreshold: 0.3,
    excessiveThreshold: 1.0,
    dbTargetKey: 'cholesterol_mg',
  },
];

export const NUTRIENT_BY_KEY = Object.fromEntries(
  NUTRIENT_DEFINITIONS.map((d) => [d.key, d]),
) as Record<string, NutrientDefinition>;

export const CATEGORY_LABELS: Record<NutrientCategory, string> = {
  macro: 'マクロ栄養素',
  mineral: 'ミネラル・食物繊維',
  vitamin: 'ビタミン',
  other: 'その他',
};

export const CATEGORY_ORDER: NutrientCategory[] = ['macro', 'mineral', 'vitamin', 'other'];
