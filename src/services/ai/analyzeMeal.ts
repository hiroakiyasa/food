import { supabase } from '@/src/lib/supabase';
import type { AIFoodAnalysis, NutritionEstimateBasis } from '@/src/types/nutrition';

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function normalizeAnalysis(value: unknown): AIFoodAnalysis {
  if (!value || typeof value !== 'object') {
    throw new Error('写真の解析結果を取得できませんでした');
  }
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new Error('写真から食品を判定できませんでした。明るい場所でお皿全体を撮影してください');
  }

  const items = raw.items.slice(0, 12).map((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const sodiumMg = finiteNumber(item.sodium_mg);
    const basis = item.estimate_basis;
    const estimateBasis: NutritionEstimateBasis = basis === 'database' || basis === 'mock'
      ? basis
      : 'ai_estimate';
    return {
      name: String(item.name || item.matched_food_name || item.detected_name || `食品${index + 1}`),
      detected_name: item.detected_name ? String(item.detected_name) : undefined,
      matched_food_name: item.matched_food_name ? String(item.matched_food_name) : null,
      food_item_id: item.food_item_id ? String(item.food_item_id) : null,
      food_code: item.food_code ? String(item.food_code) : null,
      database_source: item.database_source ? String(item.database_source) : null,
      estimate_basis: estimateBasis,
      portion_grams: Math.max(1, Math.min(2000, finiteNumber(item.portion_grams, 100))),
      confidence: Math.min(1, finiteNumber(item.confidence, 0.4)),
      database_match_score: Math.min(1, finiteNumber(item.database_match_score, 0)),
      energy_kcal: finiteNumber(item.energy_kcal),
      protein_g: finiteNumber(item.protein_g),
      fat_g: finiteNumber(item.fat_g),
      carbohydrate_g: finiteNumber(item.carbohydrate_g),
      fiber_g: finiteNumber(item.fiber_g),
      sodium_mg: sodiumMg,
      salt_equivalent_g: finiteNumber(
        item.salt_equivalent_g,
        sodiumMg * 2.54 / 1000,
      ),
    };
  });

  return {
    items,
    meal_type_guess: String(raw.meal_type_guess || 'lunch'),
    summary: raw.summary ? String(raw.summary) : undefined,
    disclaimer: raw.disclaimer ? String(raw.disclaimer) : undefined,
    analysis_source: raw.analysis_source === 'mock' ? 'mock' : 'gemini+database',
    model: raw.model ? String(raw.model) : undefined,
  };
}

export async function analyzeFoodImage(imageBase64: string): Promise<AIFoodAnalysis> {
  if (!imageBase64 || imageBase64.length < 100) {
    throw new Error('解析する画像データがありません');
  }
  const { data, error } = await supabase.functions.invoke('analyze-food-image', {
    body: { image_base64: imageBase64, mime_type: 'image/jpeg' },
  });
  if (error) throw new Error(error.message);
  return normalizeAnalysis(data);
}
