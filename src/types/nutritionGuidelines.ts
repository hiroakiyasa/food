// Types for the new nutrition_guidelines_part1/2/3.json format

export interface QuantitativeCriteria {
  targetMin: number | null;
  targetMax: number | null;
  unit: string;  // "g", "mg", "μg", "μgRAE", "%E", "mL", "g/kg体重"
  per: string;   // "day", "day (付加量)"
}

export interface GuidelineFocusNutrient {
  nutrientKey: string;          // e.g. "folicAcid", "vitaminD", "saltEquivalent"
  nutrientName: string;         // e.g. "葉酸", "ビタミンD"
  action: 'increase' | 'limit';
  priority: 'High' | 'Medium' | 'Low';
  quantitativeCriteria: QuantitativeCriteria;
  reason: string;
  evidenceBase: string;
  evidenceUrl: string | null;
}

export interface NutritionGuideline {
  categoryId: string;           // e.g. "1_LifeStage"
  subCategoryName: string;      // e.g. "妊娠中" ← stored in active_conditions
  description: string;
  focusNutrients: GuidelineFocusNutrient[];
}

export const CATEGORY_NAMES: Record<string, string> = {
  '1_LifeStage':      'ライフステージ',
  '2_BodyGoal':       '体重・体型目標',
  '3_Lifestyle':      '食事スタイル',
  '4_ChronicDisease': '慢性疾患',
  '5_DailyHealth':    '日常の健康・体調',
};
