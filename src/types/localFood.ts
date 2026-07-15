/**
 * LocalFoodItem — アプリにバンドルされるローカル食品データの型定義
 *
 * 全4ソース (MEXT + USDA Foundation/SR Legacy/Survey) を統合した正規化フォーマット。
 * scripts/generate-food-index.js によって src/data/*.json として生成される。
 */

export interface LocalFoodItem {
  /** 'mext-XXXXX' | 'usda-XXXXXXX' */
  id: string;
  food_code: string;
  food_name: string;
  food_name_en: string | null;
  category_name: string;
  source: 'mext' | 'usda_foundation' | 'usda_sr_legacy' | 'usda_survey';
  data_quality: number | null;
  brand_owner: string | null;
  /** 人気スコア 1〜9（高いほど一般的）*/
  pop: number | null;

  // ── 基本栄養素（FoodItemSearchResult との互換性） ──
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbohydrate_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  salt_equivalent_g: number | null;
  cholesterol_mg: number | null;
  carbon_kg_per_100g: number | null;
  water_liter_per_100g: number | null;

  // ── ミクロ栄養素（NutrientsData 互換・ショートキー） ──

  /**
   * ミネラル 13種
   * keys: na, k, ca, mg, p, fe, zn, cu, mn, io, se, cr, mo
   */
  min: Record<string, number> | null;

  /**
   * ビタミン（主要種）
   * keys: rae, d, e, k1, b1, b2, nia, b6, b12, fol, pan, bio, c, bce, ret
   */
  vit: Record<string, number> | null;

  /**
   * 脂肪酸
   * keys: sfa, mufa, pufa, n3, n6, epa, dha, ala, la, ara
   */
  fat: Record<string, number> | null;

  /**
   * アミノ酸
   * keys: ile, leu, lys, met, cys, phe, tyr, thr, trp, val, arg, his,
   *       ala_aa, asp, glu, gly, pro, ser
   */
  aa: Record<string, number> | null;
}
