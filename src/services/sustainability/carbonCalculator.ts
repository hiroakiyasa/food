/**
 * Carbon Footprint Calculator — 食事の環境負荷推定
 *
 * 食品カテゴリ別の参照CO₂原単位 (kg CO₂e / kg食品) を使用して
 * 日次の炭水化物・タンパク質・脂質摂取量から環境負荷を推定する。
 *
 * 参考: Poore & Nemecek (2018) "Reducing food's environmental impacts through producers and consumers"
 *
 * 簡易推定モデル（食品カテゴリ情報が利用できない場合のフォールバック）:
 *   - タンパク質は動物性60%と仮定（日本の平均食）
 *   - 食物繊維量が多いほど植物性比率が高いとみなし動物性比率を引き下げ
 *   - ナトリウムが高い場合は加工食品率が高いと推定
 */

export type CarbonGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface DailyCarbonResult {
  /** 推定CO₂排出量 kg CO₂e/日 */
  estimated_kg: number;
  /** グレード A〜E */
  grade: CarbonGrade;
  /** 日本人平均との比較 (-1.0〜+1.0) 0=平均, 負=平均以下 */
  vs_average: number;
  /** 主な排出源の推定 */
  breakdown: CarbonBreakdown;
}

export interface CarbonBreakdown {
  animal_protein_kg: number;
  plant_food_kg: number;
  processed_food_kg: number;
  dairy_proxy_kg: number;
}

/** 日本人平均的な食事のCO₂ = 約3.5 kg CO₂e/日 */
const JAPAN_DAILY_AVERAGE_KG = 3.5;

/** 食品原単位参照値 (kg CO₂e / kg food) */
const EMISSION_FACTORS = {
  beef:       27.0,
  pork:        7.6,
  chicken:     5.9,
  fish_avg:    3.9,
  eggs:        4.5,
  dairy:       3.2,
  vegetables:  0.5,
  grains:      1.4,
  legumes:     1.8,
  processed:   3.8,
} as const;

/**
 * 日次栄養データから CO₂フットプリントを推定する
 * （食品カテゴリデータがない場合の簡易モデル）
 */
export function estimateDailyCarbon(params: {
  totalKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  sodiumMg: number;
}): DailyCarbonResult {
  const { totalKcal, proteinG, fatG, carbsG, fiberG, sodiumMg } = params;

  if (totalKcal <= 0) {
    return { estimated_kg: 0, grade: 'A', vs_average: -1, breakdown: { animal_protein_kg: 0, plant_food_kg: 0, processed_food_kg: 0, dairy_proxy_kg: 0 } };
  }

  // 植物性食品比率の推定: 食物繊維量が多いほど植物性食品が多い
  // 食物繊維20g/日 = 植物性食品が十分 → 動物性タンパク質比率を下げる
  const fiberRatio = Math.min(1, fiberG / 20);
  const animalProteinRatio = Math.max(0.2, 0.7 - fiberRatio * 0.35); // 0.35〜0.70
  const animalProteinG = proteinG * animalProteinRatio;
  const plantProteinG = proteinG * (1 - animalProteinRatio);

  // タンパク質からの推定重量: タンパク質密度は食品により異なるが平均20%と仮定
  const animalFoodWeightKg = (animalProteinG / 0.20) / 1000; // grams → kg
  const plantFoodWeightKg = (plantProteinG / 0.03) / 1000;   // 植物性タンパク質密度3%

  // 乳製品プロキシ: 脂質が多く動物性比率が高い場合
  const dairyProxyKg = animalFoodWeightKg * 0.25; // 動物性食品の25%が乳製品と推定

  // 加工食品推定: ナトリウムが高い = 加工食品率高い
  const sodiumRatio = Math.min(1, sodiumMg / 3000);
  const processedFoodWeightKg = (totalKcal / 2000) * 0.3 * sodiumRatio;

  // CO₂計算
  const animalCO2 = animalFoodWeightKg * EMISSION_FACTORS.pork * 0.5 +
                    animalFoodWeightKg * EMISSION_FACTORS.chicken * 0.3 +
                    animalFoodWeightKg * EMISSION_FACTORS.fish_avg * 0.2;
  const dairyCO2 = dairyProxyKg * EMISSION_FACTORS.dairy;
  const plantCO2 = plantFoodWeightKg * EMISSION_FACTORS.vegetables * 0.5 +
                   (carbsG / 1000) * EMISSION_FACTORS.grains;
  const processedCO2 = processedFoodWeightKg * EMISSION_FACTORS.processed;

  const totalKg = Math.round((animalCO2 + dairyCO2 + plantCO2 + processedCO2) * 100) / 100;

  return {
    estimated_kg: totalKg,
    grade: calcCarbonGrade(totalKg),
    vs_average: Math.round(((totalKg - JAPAN_DAILY_AVERAGE_KG) / JAPAN_DAILY_AVERAGE_KG) * 100) / 100,
    breakdown: {
      animal_protein_kg: Math.round(animalCO2 * 100) / 100,
      plant_food_kg: Math.round(plantCO2 * 100) / 100,
      processed_food_kg: Math.round(processedCO2 * 100) / 100,
      dairy_proxy_kg: Math.round(dairyCO2 * 100) / 100,
    },
  };
}

/**
 * CO₂グレードを算出する
 * A: < 2.0 kg (植物性中心)
 * B: 2.0〜3.0 kg (平均より低め)
 * C: 3.0〜4.5 kg (日本平均程度)
 * D: 4.5〜6.5 kg (平均より高め)
 * E: > 6.5 kg (高負荷)
 */
export function calcCarbonGrade(kgPerDay: number): CarbonGrade {
  if (kgPerDay < 2.0) return 'A';
  if (kgPerDay < 3.0) return 'B';
  if (kgPerDay < 4.5) return 'C';
  if (kgPerDay < 6.5) return 'D';
  return 'E';
}

export const CARBON_GRADE_COLORS: Record<CarbonGrade, string> = {
  A: '#22C55E',
  B: '#86EFAC',
  C: '#F59E0B',
  D: '#F97316',
  E: '#EF4444',
};

export const CARBON_GRADE_LABELS: Record<CarbonGrade, string> = {
  A: '低負荷',
  B: '良好',
  C: '普通',
  D: 'やや高め',
  E: '高負荷',
};

/** 食品100gあたりのCO₂参照値（カテゴリ名 → kg CO₂e/100g） */
export const CARBON_REFERENCE_PER_100G: Record<string, number> = {
  '肉類':     0.55,  // 混合平均
  '牛肉':     2.70,
  '豚肉':     0.76,
  '鶏肉':     0.59,
  '魚介類':   0.39,
  '卵類':     0.45,
  '乳類':     0.32,
  '野菜類':   0.05,
  '果実類':   0.07,
  '穀類':     0.14,
  '豆類':     0.18,
  '油脂類':   0.36,
  '菓子類':   0.38,
};
