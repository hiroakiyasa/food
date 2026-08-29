import { useMemo } from 'react';
import { useNutritionTargets } from '@/src/hooks/useNutritionTargets';
import { useMenstrualCycle } from '@/src/hooks/useMenstrualCycle';
import {
  applyPhaseAdjustments,
  PHASE_ADJUSTMENTS,
  type CyclePhase,
} from '@/src/services/cycle/cycleNutritionEngine';
import type { LocalNutritionTarget } from '@/src/lib/localDb';

export interface CycleAdjustedTargets extends LocalNutritionTarget {
  /** フェーズ調整が適用されているか */
  isAdjusted: boolean;
  /** 現在のサイクルフェーズ */
  cyclePhase: CyclePhase | null;
  /** カフェイン上限(mg) */
  caffeine_limit_mg: number | null;
}

/**
 * 月経周期フェーズを考慮した栄養目標を返すフック
 *
 * - 月経周期トラッキングが無効の場合: 通常の栄養目標をそのまま返す
 * - 有効の場合: フェーズ調整を適用した目標を返す
 */
export function useCycleNutritionTargets(): {
  data: CycleAdjustedTargets | null;
  isLoading: boolean;
} {
  const { data: baseTargets, isLoading } = useNutritionTargets();
  const cycle = useMenstrualCycle();

  const adjusted = useMemo((): CycleAdjustedTargets | null => {
    if (!baseTargets) return null;

    // 月経周期が無効またはフェーズ不明の場合はそのまま返す
    if (!cycle.isEnabled || !cycle.phase) {
      return {
        ...baseTargets,
        isAdjusted: false,
        cyclePhase: null,
        caffeine_limit_mg: null,
      };
    }

    const phaseAdj = applyPhaseAdjustments(
      {
        energy_kcal: baseTargets.energy_kcal,
        protein_g: baseTargets.protein_g,
        fat_g: baseTargets.fat_g,
        carbohydrate_g: baseTargets.carbohydrate_g,
        fiber_g: baseTargets.fiber_g,
        iron_mg: baseTargets.iron_mg,
        calcium_mg: baseTargets.calcium_mg,
      },
      cycle.phase,
    );

    const caffeinLimit = PHASE_ADJUSTMENTS[cycle.phase].caffeine_limit_mg;

    return {
      ...baseTargets,
      ...phaseAdj,
      isAdjusted: true,
      cyclePhase: cycle.phase,
      caffeine_limit_mg: caffeinLimit,
    };
  }, [baseTargets, cycle.isEnabled, cycle.phase]);

  return { data: adjusted, isLoading };
}
