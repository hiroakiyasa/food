import type { AIFoodAnalysisItem } from '@/src/types/nutrition';

export type JapaneseMealUncertainty = {
  portionMinGrams: number;
  portionMaxGrams: number;
  energyMinKcal: number;
  energyMaxKcal: number;
  hiddenIngredientFlags: string[];
  confirmationPrompt: string | null;
};

const RULES: { pattern: RegExp; flag: string; prompt: string; spread: number }[] = [
  { pattern: /みそ汁|味噌汁|スープ|ラーメン|うどん|そば/, flag: 'broth', prompt: '汁・スープはどのくらい飲みましたか？', spread: 0.28 },
  { pattern: /サラダ|温野菜|カルパッチョ/, flag: 'dressing', prompt: 'ドレッシングやたれを使いましたか？', spread: 0.2 },
  { pattern: /揚げ|フライ|天ぷら|炒め/, flag: 'cooking_oil', prompt: '調理油の量でカロリーが変わります', spread: 0.25 },
  { pattern: /丼|カレー|チャーハン|ご飯|米/, flag: 'rice_bowl_size', prompt: 'ご飯の量を茶碗サイズで確認してください', spread: 0.18 },
  { pattern: /煮物|照り焼き|焼き鳥|しょうゆ|醤油/, flag: 'sauce', prompt: 'たれ・しょうゆの追加量を確認してください', spread: 0.22 },
];

export function estimateJapaneseMealUncertainty(
  item: Pick<AIFoodAnalysisItem, 'name' | 'detected_name' | 'portion_grams' | 'energy_kcal' | 'confidence' | 'estimate_basis'>,
): JapaneseMealUncertainty {
  const label = `${item.name} ${item.detected_name ?? ''}`;
  const matched = RULES.filter((rule) => rule.pattern.test(label));
  const confidenceSpread = Math.max(0.12, (1 - item.confidence) * 0.55);
  const basisSpread = item.estimate_basis === 'database' ? 0.08 : 0.2;
  const spread = Math.min(0.6, Math.max(confidenceSpread + basisSpread, ...matched.map((rule) => rule.spread)));
  const lower = Math.max(0.45, 1 - spread);
  const upper = 1 + spread;
  return {
    portionMinGrams: Math.max(1, Math.round(item.portion_grams * lower)),
    portionMaxGrams: Math.max(1, Math.round(item.portion_grams * upper)),
    energyMinKcal: Math.max(0, Math.round(item.energy_kcal * lower)),
    energyMaxKcal: Math.max(0, Math.round(item.energy_kcal * upper)),
    hiddenIngredientFlags: [...new Set(matched.map((rule) => rule.flag))],
    confirmationPrompt: matched[0]?.prompt ?? null,
  };
}

export function applyConsumptionRatio(
  item: AIFoodAnalysisItem,
  ratio: number,
): AIFoodAnalysisItem {
  const boundedRatio = Math.max(0, Math.min(1, ratio));
  return {
    ...item,
    portion_grams: item.portion_grams * boundedRatio,
    portion_min_grams: item.portion_min_grams * boundedRatio,
    portion_max_grams: item.portion_max_grams * boundedRatio,
    energy_kcal: item.energy_kcal * boundedRatio,
    energy_min_kcal: item.energy_min_kcal * boundedRatio,
    energy_max_kcal: item.energy_max_kcal * boundedRatio,
    protein_g: item.protein_g * boundedRatio,
    fat_g: item.fat_g * boundedRatio,
    carbohydrate_g: item.carbohydrate_g * boundedRatio,
    fiber_g: item.fiber_g * boundedRatio,
    sodium_mg: item.sodium_mg * boundedRatio,
    salt_equivalent_g: item.salt_equivalent_g * boundedRatio,
  };
}

export const RICE_PORTIONS = [
  { label: '小盛り', grams: 100 },
  { label: '普通', grams: 150 },
  { label: '大盛り', grams: 220 },
] as const;
