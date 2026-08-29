import { supabase } from '@/src/lib/supabase';
import type { Database } from '@/src/types/database';
import { searchLocalFoods, getLocalCategories } from './localFoodSearch';

export type FoodItemRow = Database['public']['Tables']['food_items']['Row'];

// Select basic nutrition columns + source/quality (skip heavy JSON columns)
const FOOD_ITEM_COLUMNS = 'id,food_code,food_name,food_name_en,category_name,source,data_quality,brand_owner,energy_kcal,protein_g,fat_g,carbohydrate_g,fiber_g,sodium_mg,salt_equivalent_g,cholesterol_mg';

export type FoodItemSearchResult = Pick<
  FoodItemRow,
  | 'id'
  | 'food_code'
  | 'food_name'
  | 'food_name_en'
  | 'category_name'
  | 'source'
  | 'data_quality'
  | 'brand_owner'
  | 'energy_kcal'
  | 'protein_g'
  | 'fat_g'
  | 'carbohydrate_g'
  | 'fiber_g'
  | 'sodium_mg'
  | 'salt_equivalent_g'
  | 'cholesterol_mg'
>;

/**
 * ローカルMEXTデータを優先し、Supabaseで補完するマージ検索。
 *
 * - ローカル: 日本食品標準成分表 2,541食品（オフライン即時）
 * - Supabase: DBに登録済みの食品（バーコード商品・ユーザー追加食品など）
 * - 重複は food_code でチェックし、ローカル側を優先する
 */
export async function searchFoodItems({
  query,
  category,
  limit = 50,
}: {
  query?: string;
  category?: string;
  limit?: number;
}): Promise<FoodItemSearchResult[]> {
  // --- 1. ローカル検索（同期・即時）---
  const localResults = searchLocalFoods({ query, category, limit });

  // カテゴリ選択かキーワードがない場合はローカルのみ返す
  if (!category && !query?.trim()) return localResults;

  // --- 2. Supabase 検索（非同期・ネットワーク）---
  try {
    let q = supabase.from('food_items').select(FOOD_ITEM_COLUMNS);

    if (category) q = q.eq('category_name', category);

    const trimmed = query?.trim();
    if (trimmed) {
      q = q.or(`food_name.ilike.%${trimmed}%,food_name_en.ilike.%${trimmed}%`);
    }

    const { data } = await q
      .not('energy_kcal', 'is', null)
      .order('data_quality', { ascending: false, nullsFirst: false })
      .order('energy_kcal',  { ascending: false, nullsFirst: false })
      .limit(limit);

    if (!data || data.length === 0) return localResults;

    // --- 3. マージ（ローカル優先・food_code で重複排除）---
    const localCodes = new Set(localResults.map((f) => f.food_code));
    const remoteOnly = (data as FoodItemSearchResult[]).filter(
      (f) => !localCodes.has(f.food_code),
    );

    return [...localResults, ...remoteOnly].slice(0, limit);
  } catch {
    // ネットワークエラー時はローカルのみで継続
    return localResults;
  }
}

/**
 * ローカルのみを使ったページング検索（無限スクロール用）
 * Supabase との重複排除は不要（ローカルデータのみ）。
 */
export function searchFoodItemsPaged({
  query,
  category,
  offset = 0,
  limit = 50,
}: {
  query?: string;
  category?: string;
  offset?: number;
  limit?: number;
}): FoodItemSearchResult[] {
  return searchLocalFoods({ query, category, limit, offset });
}

export interface FoodCategory {
  name: string;
  count: number;
}

/**
 * カテゴリ一覧はローカルデータから即時取得し、
 * Supabaseにしか存在しないカテゴリがあれば補完する。
 */
export async function fetchFoodCategories(): Promise<FoodCategory[]> {
  // ローカルカテゴリを基本とする（オフラインでも常に全カテゴリが表示される）
  const localCategories = getLocalCategories();

  try {
    const { data, error } = await supabase.rpc('get_food_categories');

    let remoteCategories: FoodCategory[] = [];
    if (error || !data) {
      // RPC 未対応の場合は手動集計
      const { data: fallback } = await supabase
        .from('food_items')
        .select('category_name')
        .limit(5000);
      if (fallback) {
        const counts: Record<string, number> = {};
        for (const row of fallback) {
          const name = (row as { category_name: string }).category_name;
          counts[name] = (counts[name] ?? 0) + 1;
        }
        remoteCategories = Object.entries(counts).map(([name, count]) => ({ name, count }));
      }
    } else {
      remoteCategories = data as FoodCategory[];
    }

    // ローカルに存在しないカテゴリだけ追記
    const localNames = new Set(localCategories.map((c) => c.name));
    const remoteOnly = remoteCategories.filter((c) => !localNames.has(c.name));

    return [...localCategories, ...remoteOnly];
  } catch {
    // ネットワークエラー時はローカルカテゴリのみ
    return localCategories;
  }
}
