/**
 * Food Score Calculator — Nutri-Score型評価システム
 *
 * スコア計算ロジック:
 * - プラス点: 食物繊維・タンパク質・野菜果物豆類比率
 * - マイナス点: エネルギー・飽和脂肪酸・糖質・ナトリウム・超加工度(NOVA)
 * - グレード: A(≥70), B(50-70), C(30-50), D(10-30), E(<10)
 */

export type FoodScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface FoodScoreInput {
  energy_kcal?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbohydrate_g?: number | null;
  fiber_g?: number | null;
  sodium_mg?: number | null;
  salt_equivalent_g?: number | null;
  /** NOVA分類 1=未加工, 2=加工食品, 3=加工食品素材, 4=超加工食品 */
  nova_classification?: number | null;
  /** 推定飽和脂肪酸 (g/100g) — fatty_acidsから取得可能な場合 */
  saturated_fat_g?: number | null;
  /** 推定糖質 (g/100g) — carbohydrate_detailsから取得可能な場合 */
  sugars_g?: number | null;
  /** 提供量 (g) — 100gあたりに正規化するために使用 */
  portion_grams?: number | null;
}

export interface FoodScoreResult {
  grade: FoodScoreGrade;
  value: number; // 0-100
  breakdown: {
    positivePoints: number;
    negativePoints: number;
    fiberPoints: number;
    proteinPoints: number;
    energyPenalty: number;
    sodiumPenalty: number;
    satFatPenalty: number;
    sugarPenalty: number;
    novaPenalty: number;
  };
}

/**
 * 100gあたりの値に正規化
 */
function normalize(value: number | null | undefined, portionGrams: number | null | undefined): number {
  if (value == null) return 0;
  if (portionGrams && portionGrams > 0 && portionGrams !== 100) {
    return (value / portionGrams) * 100;
  }
  return value;
}

/**
 * エネルギーポイント (マイナス点: 0〜10)
 * 100gあたりのkcalに基づく
 */
function calcEnergyPenalty(kcalPer100g: number): number {
  if (kcalPer100g <= 80) return 0;
  if (kcalPer100g <= 160) return 1;
  if (kcalPer100g <= 240) return 2;
  if (kcalPer100g <= 320) return 3;
  if (kcalPer100g <= 400) return 4;
  if (kcalPer100g <= 480) return 5;
  if (kcalPer100g <= 560) return 6;
  if (kcalPer100g <= 640) return 7;
  if (kcalPer100g <= 720) return 8;
  if (kcalPer100g <= 800) return 9;
  return 10;
}

/**
 * ナトリウムポイント (マイナス点: 0〜10)
 * 塩分換算 (g/100g) に基づく
 */
function calcSodiumPenalty(sodiumMgPer100g: number): number {
  // ナトリウム(mg) → 食塩相当量(g): Na × 2.54 / 1000
  const saltEquiv = (sodiumMgPer100g * 2.54) / 1000;
  if (saltEquiv <= 0.3) return 0;
  if (saltEquiv <= 0.6) return 1;
  if (saltEquiv <= 0.9) return 2;
  if (saltEquiv <= 1.2) return 3;
  if (saltEquiv <= 1.5) return 4;
  if (saltEquiv <= 1.8) return 5;
  if (saltEquiv <= 2.1) return 6;
  if (saltEquiv <= 2.4) return 7;
  if (saltEquiv <= 2.7) return 8;
  if (saltEquiv <= 3.0) return 9;
  return 10;
}

/**
 * 飽和脂肪酸ポイント (マイナス点: 0〜10)
 * g/100gに基づく
 */
function calcSatFatPenalty(satFatPer100g: number): number {
  if (satFatPer100g <= 1) return 0;
  if (satFatPer100g <= 2) return 1;
  if (satFatPer100g <= 3) return 2;
  if (satFatPer100g <= 4) return 3;
  if (satFatPer100g <= 5) return 4;
  if (satFatPer100g <= 6) return 5;
  if (satFatPer100g <= 7) return 6;
  if (satFatPer100g <= 8) return 7;
  if (satFatPer100g <= 9) return 8;
  if (satFatPer100g <= 10) return 9;
  return 10;
}

/**
 * 糖質ポイント (マイナス点: 0〜10)
 * g/100gに基づく
 */
function calcSugarPenalty(sugarsPer100g: number): number {
  if (sugarsPer100g <= 4.5) return 0;
  if (sugarsPer100g <= 9) return 1;
  if (sugarsPer100g <= 13.5) return 2;
  if (sugarsPer100g <= 18) return 3;
  if (sugarsPer100g <= 22.5) return 4;
  if (sugarsPer100g <= 27) return 5;
  if (sugarsPer100g <= 31) return 6;
  if (sugarsPer100g <= 36) return 7;
  if (sugarsPer100g <= 40) return 8;
  if (sugarsPer100g <= 45) return 9;
  return 10;
}

/**
 * 食物繊維ポイント (プラス点: 0〜5)
 * g/100gに基づく
 */
function calcFiberPoints(fiberPer100g: number): number {
  if (fiberPer100g <= 0.9) return 0;
  if (fiberPer100g <= 1.9) return 1;
  if (fiberPer100g <= 2.8) return 2;
  if (fiberPer100g <= 3.7) return 3;
  if (fiberPer100g <= 4.7) return 4;
  return 5;
}

/**
 * タンパク質ポイント (プラス点: 0〜5)
 * g/100gに基づく
 */
function calcProteinPoints(proteinPer100g: number): number {
  if (proteinPer100g <= 1.6) return 0;
  if (proteinPer100g <= 3.2) return 1;
  if (proteinPer100g <= 4.8) return 2;
  if (proteinPer100g <= 6.4) return 3;
  if (proteinPer100g <= 8.0) return 4;
  return 5;
}

/**
 * NOVA超加工ペナルティ (マイナス点: 0〜15)
 */
function calcNovaPenalty(nova: number | null | undefined): number {
  if (nova == null) return 0;
  if (nova === 1) return 0;
  if (nova === 2) return 3;
  if (nova === 3) return 8;
  if (nova === 4) return 15;
  return 0;
}

/**
 * スコア値からグレードへ変換
 */
export function scoreToGrade(value: number): FoodScoreGrade {
  if (value >= 70) return 'A';
  if (value >= 50) return 'B';
  if (value >= 30) return 'C';
  if (value >= 10) return 'D';
  return 'E';
}

/**
 * グレードの表示色
 */
export const GRADE_COLORS: Record<FoodScoreGrade, string> = {
  A: '#22C55E', // 緑
  B: '#84CC16', // 黄緑
  C: '#F59E0B', // 黄
  D: '#F97316', // オレンジ
  E: '#EF4444', // 赤
};

/**
 * グレードの背景色（薄い）
 */
export const GRADE_BG_COLORS: Record<FoodScoreGrade, string> = {
  A: '#DCFCE7',
  B: '#ECFCCB',
  C: '#FEF3C7',
  D: '#FFEDD5',
  E: '#FEE2E2',
};

/**
 * 食品スコアを計算する
 */
export function calculateFoodScore(input: FoodScoreInput): FoodScoreResult {
  const portion = input.portion_grams;

  // 100gあたりに正規化
  const kcalPer100g = normalize(input.energy_kcal, portion);
  const sodiumMgPer100g = normalize(input.sodium_mg, portion);
  const fiberPer100g = normalize(input.fiber_g, portion);
  const proteinPer100g = normalize(input.protein_g, portion);

  // 飽和脂肪酸: 直接データがなければ総脂質の40%を推定
  const satFatPer100g = input.saturated_fat_g != null
    ? normalize(input.saturated_fat_g, portion)
    : normalize((input.fat_g ?? 0) * 0.4, portion);

  // 糖質: 直接データがなければ炭水化物の50%を推定（日本食品は糖質比率が異なる）
  const sugarsPer100g = input.sugars_g != null
    ? normalize(input.sugars_g, portion)
    : normalize((input.carbohydrate_g ?? 0) * 0.5, portion);

  // マイナス点の計算
  const energyPenalty = calcEnergyPenalty(kcalPer100g);
  const sodiumPenalty = calcSodiumPenalty(sodiumMgPer100g);
  const satFatPenalty = calcSatFatPenalty(satFatPer100g);
  const sugarPenalty = calcSugarPenalty(sugarsPer100g);
  const novaPenalty = calcNovaPenalty(input.nova_classification);

  // プラス点の計算
  const fiberPoints = calcFiberPoints(fiberPer100g);
  const proteinPoints = calcProteinPoints(proteinPer100g);

  // 合計
  const negativePoints = energyPenalty + sodiumPenalty + satFatPenalty + sugarPenalty + novaPenalty;
  const positivePoints = fiberPoints + proteinPoints;

  // スコア計算: 最大マイナス点は45(10+10+10+10+15)、最大プラスは10(5+5)
  // 100点満点に正規化: (10 - negativePoints + positivePoints) / 55 * 100
  const rawScore = 10 - negativePoints + positivePoints;
  const maxPossible = 10 + 10; // 最大プラス点+ベース
  const minPossible = 10 - 45; // ベース-最大マイナス点
  const normalizedValue = Math.round(
    ((rawScore - minPossible) / (maxPossible - minPossible)) * 100
  );
  const value = Math.max(0, Math.min(100, normalizedValue));
  const grade = scoreToGrade(value);

  return {
    grade,
    value,
    breakdown: {
      positivePoints,
      negativePoints,
      fiberPoints,
      proteinPoints,
      energyPenalty,
      sodiumPenalty,
      satFatPenalty,
      sugarPenalty,
      novaPenalty,
    },
  };
}

/**
 * 食事（複数食品）の平均スコアを計算する
 */
export function calculateMealScore(items: FoodScoreInput[]): FoodScoreResult | null {
  if (items.length === 0) return null;

  const results = items.map(calculateFoodScore);
  const avgValue = Math.round(results.reduce((sum, r) => sum + r.value, 0) / results.length);

  // breakdownの平均も計算
  const avgBreakdown = {
    positivePoints: results.reduce((s, r) => s + r.breakdown.positivePoints, 0) / results.length,
    negativePoints: results.reduce((s, r) => s + r.breakdown.negativePoints, 0) / results.length,
    fiberPoints: results.reduce((s, r) => s + r.breakdown.fiberPoints, 0) / results.length,
    proteinPoints: results.reduce((s, r) => s + r.breakdown.proteinPoints, 0) / results.length,
    energyPenalty: results.reduce((s, r) => s + r.breakdown.energyPenalty, 0) / results.length,
    sodiumPenalty: results.reduce((s, r) => s + r.breakdown.sodiumPenalty, 0) / results.length,
    satFatPenalty: results.reduce((s, r) => s + r.breakdown.satFatPenalty, 0) / results.length,
    sugarPenalty: results.reduce((s, r) => s + r.breakdown.sugarPenalty, 0) / results.length,
    novaPenalty: results.reduce((s, r) => s + r.breakdown.novaPenalty, 0) / results.length,
  };

  return {
    grade: scoreToGrade(avgValue),
    value: avgValue,
    breakdown: avgBreakdown,
  };
}
