/**
 * Cycle Nutrition Engine — 月経周期×栄養管理
 *
 * 4フェーズに応じた栄養調整:
 * - 月経期  (Day 1〜5):   鉄分↑, マグネシウム↑
 * - 卵胞期  (Day 6〜13):  エネルギー↑, タンパク質↑
 * - 排卵期  (Day 14〜16): ビタミンC↑, 亜鉛↑
 * - 黄体期  (Day 17〜28): カルシウム↑, 炭水化物↑, カフェイン制限
 */

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface CyclePhaseInfo {
  phase: CyclePhase;
  label: string;
  emoji: string;
  dayRange: string;
  description: string;
  color: string;
  bgColor: string;
}

export const PHASE_INFO: Record<CyclePhase, CyclePhaseInfo> = {
  menstrual: {
    phase: 'menstrual',
    label: '月経期',
    emoji: '🔴',
    dayRange: 'Day 1〜5',
    description: '鉄分とマグネシウムを意識して摂りましょう',
    color: '#EF4444',
    bgColor: '#FEE2E2',
  },
  follicular: {
    phase: 'follicular',
    label: '卵胞期',
    emoji: '🌱',
    dayRange: 'Day 6〜13',
    description: '代謝が活発になる時期。タンパク質を積極的に',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
  ovulatory: {
    phase: 'ovulatory',
    label: '排卵期',
    emoji: '✨',
    dayRange: 'Day 14〜16',
    description: 'エネルギー最高潮。ビタミンCと亜鉛を補給',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  luteal: {
    phase: 'luteal',
    label: '黄体期',
    emoji: '🌙',
    dayRange: 'Day 17〜28',
    description: 'PMSに備えてカルシウムとマグネシウムを',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
  },
};

export interface CycleNutrientAdjustment {
  /** 目標値の乗数 (1.0 = 変更なし) */
  energy_multiplier: number;
  protein_multiplier: number;
  carbs_multiplier: number;
  fat_multiplier: number;
  fiber_multiplier: number;
  iron_multiplier: number;
  calcium_multiplier: number;
  magnesium_multiplier: number;
  zinc_multiplier: number;
  vitamin_c_multiplier: number;
  /** カフェイン上限(mg/day), null = 制限なし */
  caffeine_limit_mg: number | null;
  /** フェーズ特有の推奨食品 */
  recommended_foods: string[];
  /** フェーズ特有の注意食品 */
  caution_foods: string[];
}

export const PHASE_ADJUSTMENTS: Record<CyclePhase, CycleNutrientAdjustment> = {
  menstrual: {
    energy_multiplier: 1.0,
    protein_multiplier: 1.1,
    carbs_multiplier: 1.0,
    fat_multiplier: 1.0,
    fiber_multiplier: 1.1,
    iron_multiplier: 1.5,
    calcium_multiplier: 1.1,
    magnesium_multiplier: 1.2,
    zinc_multiplier: 1.0,
    vitamin_c_multiplier: 1.2,
    caffeine_limit_mg: 150,
    recommended_foods: ['ほうれん草', 'レバー', '赤身肉', '豆腐', 'あさり', 'ひじき', 'チョコレート（高カカオ）'],
    caution_foods: ['アルコール', '冷たい食べ物', '過度なカフェイン'],
  },
  follicular: {
    energy_multiplier: 1.05,
    protein_multiplier: 1.1,
    carbs_multiplier: 1.05,
    fat_multiplier: 1.0,
    fiber_multiplier: 1.0,
    iron_multiplier: 1.0,
    calcium_multiplier: 1.0,
    magnesium_multiplier: 1.0,
    zinc_multiplier: 1.0,
    vitamin_c_multiplier: 1.0,
    caffeine_limit_mg: null,
    recommended_foods: ['鶏むね肉', '卵', '大豆製品', '発酵食品（ヨーグルト、味噌）', '緑黄色野菜'],
    caution_foods: [],
  },
  ovulatory: {
    energy_multiplier: 1.05,
    protein_multiplier: 1.1,
    carbs_multiplier: 1.0,
    fat_multiplier: 1.0,
    fiber_multiplier: 1.0,
    iron_multiplier: 1.0,
    calcium_multiplier: 1.0,
    magnesium_multiplier: 1.0,
    zinc_multiplier: 1.2,
    vitamin_c_multiplier: 1.2,
    caffeine_limit_mg: null,
    recommended_foods: ['牡蠣', '牛肉', 'かぼちゃの種', 'ブロッコリー', 'パプリカ', 'キウイ'],
    caution_foods: [],
  },
  luteal: {
    energy_multiplier: 1.05,
    protein_multiplier: 1.05,
    carbs_multiplier: 1.1,
    fat_multiplier: 1.0,
    fiber_multiplier: 1.1,
    iron_multiplier: 1.0,
    calcium_multiplier: 1.3,
    magnesium_multiplier: 1.2,
    zinc_multiplier: 1.0,
    vitamin_c_multiplier: 1.0,
    caffeine_limit_mg: 100,
    recommended_foods: ['乳製品', '小松菜', '豆腐', 'バナナ', 'アボカド', 'ナッツ類', '全粒穀物'],
    caution_foods: ['塩分の多い食品', '過度なカフェイン', 'アルコール', '精製糖'],
  },
};

/**
 * 最後の生理開始日とサイクル長から現在のフェーズを計算する
 */
export function calcCurrentPhase(
  lastPeriodStart: Date,
  cycleLength: number = 28,
  periodLength: number = 5,
): { phase: CyclePhase; dayInCycle: number; daysUntilNext: number } {
  const now = new Date();
  const diffMs = now.getTime() - lastPeriodStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dayInCycle = (diffDays % cycleLength) + 1;
  const daysUntilNext = cycleLength - (diffDays % cycleLength);

  let phase: CyclePhase;
  if (dayInCycle <= periodLength) {
    phase = 'menstrual';
  } else if (dayInCycle <= 13) {
    phase = 'follicular';
  } else if (dayInCycle <= 16) {
    phase = 'ovulatory';
  } else {
    phase = 'luteal';
  }

  return { phase, dayInCycle, daysUntilNext };
}

/**
 * 基本栄養目標値にフェーズ調整を適用する
 */
export interface BaseNutritionTargets {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  iron_mg: number | null;
  calcium_mg: number | null;
}

export function applyPhaseAdjustments(
  base: BaseNutritionTargets,
  phase: CyclePhase,
): BaseNutritionTargets {
  const adj = PHASE_ADJUSTMENTS[phase];
  return {
    energy_kcal: Math.round(base.energy_kcal * adj.energy_multiplier),
    protein_g: Math.round(base.protein_g * adj.protein_multiplier * 10) / 10,
    fat_g: Math.round(base.fat_g * adj.fat_multiplier * 10) / 10,
    carbohydrate_g: Math.round(base.carbohydrate_g * adj.carbs_multiplier * 10) / 10,
    fiber_g: Math.round(base.fiber_g * adj.fiber_multiplier * 10) / 10,
    iron_mg: base.iron_mg != null
      ? Math.round(base.iron_mg * adj.iron_multiplier * 10) / 10
      : null,
    calcium_mg: base.calcium_mg != null
      ? Math.round(base.calcium_mg * adj.calcium_multiplier)
      : null,
  };
}
