/**
 * localFoodSearch.ts — ローカル食品データ検索（全4ソース統合）
 *
 * scripts/generate-food-index.js で生成した JSON チャンクを静的インポートし、
 * オフラインでも即時検索できる。
 *
 * カバー範囲: MEXT 2,541件 + USDA Foundation 365件 + SR Legacy 7,793件 + Survey 5,432件
 *            = 16,131食品
 */

// ── MEXT (5ファイル) ──────────────────────────────────────────────────────────
import mextP1 from '@/src/data/mext_foods_p1.json';
import mextP2 from '@/src/data/mext_foods_p2.json';
import mextP3 from '@/src/data/mext_foods_p3.json';
import mextP4 from '@/src/data/mext_foods_p4.json';
import mextP5 from '@/src/data/mext_foods_p5.json';

// ── USDA Foundation (1ファイル) ───────────────────────────────────────────────
import foundP1 from '@/src/data/usda_foundation_p1.json';

// ── USDA SR Legacy (13ファイル) ───────────────────────────────────────────────
import srP1  from '@/src/data/usda_sr_legacy_p1.json';
import srP2  from '@/src/data/usda_sr_legacy_p2.json';
import srP3  from '@/src/data/usda_sr_legacy_p3.json';
import srP4  from '@/src/data/usda_sr_legacy_p4.json';
import srP5  from '@/src/data/usda_sr_legacy_p5.json';
import srP6  from '@/src/data/usda_sr_legacy_p6.json';
import srP7  from '@/src/data/usda_sr_legacy_p7.json';
import srP8  from '@/src/data/usda_sr_legacy_p8.json';
import srP9  from '@/src/data/usda_sr_legacy_p9.json';
import srP10 from '@/src/data/usda_sr_legacy_p10.json';
import srP11 from '@/src/data/usda_sr_legacy_p11.json';
import srP12 from '@/src/data/usda_sr_legacy_p12.json';
import srP13 from '@/src/data/usda_sr_legacy_p13.json';

// ── USDA Survey (10ファイル) ──────────────────────────────────────────────────
import surveyP1  from '@/src/data/usda_survey_p1.json';
import surveyP2  from '@/src/data/usda_survey_p2.json';
import surveyP3  from '@/src/data/usda_survey_p3.json';
import surveyP4  from '@/src/data/usda_survey_p4.json';
import surveyP5  from '@/src/data/usda_survey_p5.json';
import surveyP6  from '@/src/data/usda_survey_p6.json';
import surveyP7  from '@/src/data/usda_survey_p7.json';
import surveyP8  from '@/src/data/usda_survey_p8.json';
import surveyP9  from '@/src/data/usda_survey_p9.json';
import surveyP10 from '@/src/data/usda_survey_p10.json';

import type { LocalFoodItem } from '@/src/types/localFood';
import type { FoodItemSearchResult, FoodCategory } from './searchFood';

// ── ロケール検出（起動時一回のみ）────────────────────────────────────────────

function detectLocale(): 'ja' | 'other' {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale;
    return loc.toLowerCase().startsWith('ja') ? 'ja' : 'other';
  } catch {
    return 'ja';
  }
}

const USER_LOCALE = detectLocale();

function getSourcePriority(source: string): number {
  if (USER_LOCALE === 'ja') {
    const map: Record<string, number> = { mext: 4, usda_foundation: 3, usda_sr_legacy: 2, usda_survey: 1 };
    return map[source] ?? 0;
  } else {
    const map: Record<string, number> = { usda_foundation: 4, usda_sr_legacy: 3, mext: 2, usda_survey: 1 };
    return map[source] ?? 0;
  }
}

// ── 全食品リスト ───────────────────────────────────────────────────────────────

const LOCAL_FOODS: LocalFoodItem[] = [
  // MEXT
  ...(mextP1 as unknown as LocalFoodItem[]),
  ...(mextP2 as unknown as LocalFoodItem[]),
  ...(mextP3 as unknown as LocalFoodItem[]),
  ...(mextP4 as unknown as LocalFoodItem[]),
  ...(mextP5 as unknown as LocalFoodItem[]),
  // USDA Foundation
  ...(foundP1 as unknown as LocalFoodItem[]),
  // USDA SR Legacy
  ...(srP1  as unknown as LocalFoodItem[]),
  ...(srP2  as unknown as LocalFoodItem[]),
  ...(srP3  as unknown as LocalFoodItem[]),
  ...(srP4  as unknown as LocalFoodItem[]),
  ...(srP5  as unknown as LocalFoodItem[]),
  ...(srP6  as unknown as LocalFoodItem[]),
  ...(srP7  as unknown as LocalFoodItem[]),
  ...(srP8  as unknown as LocalFoodItem[]),
  ...(srP9  as unknown as LocalFoodItem[]),
  ...(srP10 as unknown as LocalFoodItem[]),
  ...(srP11 as unknown as LocalFoodItem[]),
  ...(srP12 as unknown as LocalFoodItem[]),
  ...(srP13 as unknown as LocalFoodItem[]),
  // USDA Survey
  ...(surveyP1  as unknown as LocalFoodItem[]),
  ...(surveyP2  as unknown as LocalFoodItem[]),
  ...(surveyP3  as unknown as LocalFoodItem[]),
  ...(surveyP4  as unknown as LocalFoodItem[]),
  ...(surveyP5  as unknown as LocalFoodItem[]),
  ...(surveyP6  as unknown as LocalFoodItem[]),
  ...(surveyP7  as unknown as LocalFoodItem[]),
  ...(surveyP8  as unknown as LocalFoodItem[]),
  ...(surveyP9  as unknown as LocalFoodItem[]),
  ...(surveyP10 as unknown as LocalFoodItem[]),
];

// ── ソート済み全食品リスト（モジュール初期化時に一度だけ構築）────────────────
// energy_kcal が null のデータは栄養情報が揃っていないため除外する

const SORTED_FOODS: LocalFoodItem[] = LOCAL_FOODS
  .filter((f) => f.energy_kcal != null)
  .sort((a, b) => {
    const srcDiff = getSourcePriority(b.source) - getSourcePriority(a.source);
    if (srcDiff !== 0) return srcDiff;
    return (b.pop ?? 0) - (a.pop ?? 0);
  });

// カテゴリ別インデックス（高速アクセス用）
const CATEGORY_INDEX = new Map<string, LocalFoodItem[]>();
for (const food of SORTED_FOODS) {
  const cat = food.category_name ?? '不明';
  if (!CATEGORY_INDEX.has(cat)) CATEGORY_INDEX.set(cat, []);
  CATEGORY_INDEX.get(cat)!.push(food);
}

// ID → LocalFoodItem の高速ルックアップ（詳細表示用）
const LOCAL_FOOD_MAP = new Map<string, LocalFoodItem>(
  LOCAL_FOODS.map((f) => [f.id, f]),
);

/**
 * ID からローカル食品を取得する（詳細表示用）
 */
export function getLocalFoodById(id: string): LocalFoodItem | undefined {
  return LOCAL_FOOD_MAP.get(id);
}

/**
 * ローカル食品データをキーワード / カテゴリで検索する（同期・即時）
 * ロケールに応じてソースを優先し、人気スコア順で返す。
 * offset / limit でページング対応（無限スクロール用）。
 */
export function searchLocalFoods({
  query,
  category,
  limit = 50,
  offset = 0,
}: {
  query?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): FoodItemSearchResult[] {
  // カテゴリ選択時はインデックスから高速取得（既にソート済み）
  let results: LocalFoodItem[];
  if (category) {
    results = CATEGORY_INDEX.get(category) ?? [];
  } else {
    results = SORTED_FOODS;
  }

  // テキスト検索（日本語 / 英語）
  const trimmed = query?.trim().toLowerCase();
  if (trimmed) {
    results = results.filter(
      (f) =>
        f.food_name?.toLowerCase().includes(trimmed) ||
        (f.food_name_en?.toLowerCase().includes(trimmed) ?? false),
    );

    // 前方一致を優先（ソースソートを維持しつつ前方一致を先頭に）
    results = [...results].sort((a, b) => {
      const aStarts = a.food_name?.toLowerCase().startsWith(trimmed) ? 1 : 0;
      const bStarts = b.food_name?.toLowerCase().startsWith(trimmed) ? 1 : 0;
      return bStarts - aStarts;
    });
  }

  return (results.slice(offset, offset + limit) as unknown as FoodItemSearchResult[]);
}

/**
 * ローカルデータからカテゴリ一覧と件数を返す（同期・即時）
 */
export function getLocalCategories(): FoodCategory[] {
  const counts = new Map<string, number>();
  for (const food of SORTED_FOODS) {
    const cat = food.category_name ?? '不明';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
