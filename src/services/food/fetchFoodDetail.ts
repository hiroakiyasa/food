import { supabase } from '@/src/lib/supabase';
import type { FoodItemRow } from './searchFood';
import type { NutrientsData, DetailData } from './micronutrientStorage';
import { fetchMicronutrients, fetchFoodDetail as fetchDetailFromStorage } from './micronutrientStorage';
import { getLocalFoodById } from './localFoodSearch';
import type { LocalFoodItem } from '@/src/types/localFood';

export interface FoodItemWithDetails extends FoodItemRow {
  /** Nutrients data from Storage nutrients/ (min/vit/fat/aa/g/ext) */
  _nutrients: NutrientsData | null;
  /** Detail data from Storage details/ (org/cho_d/fib_d/add/portions/ingr) */
  _detail: DetailData | null;
}

/**
 * ローカル食品（mext- / usda- プレフィックス）の詳細をローカルデータから構築する
 */
function buildFoodItemWithDetailsFromLocal(local: LocalFoodItem): FoodItemWithDetails {
  const baseRow: FoodItemRow = {
    id:                local.id,
    food_code:         local.food_code,
    food_name:         local.food_name,
    food_name_en:      local.food_name_en,
    category_name:     local.category_name,
    source:            local.source,
    data_quality:      local.data_quality,
    brand_owner:       local.brand_owner,
    energy_kcal:       local.energy_kcal,
    protein_g:         local.protein_g,
    fat_g:             local.fat_g,
    carbohydrate_g:    local.carbohydrate_g,
    fiber_g:           local.fiber_g,
    sodium_mg:         local.sodium_mg,
    salt_equivalent_g: local.salt_equivalent_g,
    cholesterol_mg:    local.cholesterol_mg,
    carbon_kg_per_100g:   local.carbon_kg_per_100g,
    water_liter_per_100g: local.water_liter_per_100g,
    // Supabase JSON 列はローカルデータには存在しないため null
    minerals:    null,
    vitamins:    null,
    amino_acids: null,
    fatty_acids: null,
    // DB 専用列（ローカル食品では未使用）
    data_type:          null,
    nova_classification: null,
    traffic_light:      null,
    gtin_upc:           null,
    serving_size:       null,
    serving_size_unit:  null,
    food_score_grade:   null,
    food_score_value:   null,
    processing_level:   null,
    created_at:         new Date().toISOString(),
  };

  const hasNutrients = local.min || local.vit || local.fat || local.aa;
  const nutrients: NutrientsData | null = hasNutrients
    ? {
        min: local.min ?? {},
        vit: local.vit ?? {},
        fat: local.fat ?? {},
        aa:  local.aa  ?? {},
      }
    : null;

  return { ...baseRow, _nutrients: nutrients, _detail: null };
}

export async function fetchFoodItemDetail(id: string): Promise<FoodItemWithDetails | null> {
  // ローカル食品（mext- / usda- プレフィックス）はローカルデータから返す
  if (id.startsWith('mext-') || id.startsWith('usda-')) {
    const local = getLocalFoodById(id);
    return local ? buildFoodItemWithDetailsFromLocal(local) : null;
  }

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('id', id)
    .single();

  // PGRST116 = row not found → null を返してエラーを抑制
  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null;
    throw error;
  }
  if (!data) return null;

  // Fetch nutrients and details from Storage in parallel
  const [nutrients, detail] = await Promise.all([
    fetchMicronutrients(data.food_code, data.source),
    fetchDetailFromStorage(data.food_code, data.source),
  ]);

  return {
    ...data,
    _nutrients: nutrients,
    _detail: detail,
  } as FoodItemWithDetails;
}
