import { useMemo } from 'react';
import { useCycleStore } from '@/src/stores/cycleStore';
import {
  calcCurrentPhase,
  PHASE_INFO,
  type CyclePhase,
} from '@/src/services/cycle/cycleNutritionEngine';

export interface MenstrualCycleState {
  isEnabled: boolean;
  phase: CyclePhase | null;
  dayInCycle: number | null;
  daysUntilNext: number | null;
  phaseInfo: typeof PHASE_INFO[CyclePhase] | null;
  lastPeriodStart: Date | null;
  avgCycleLength: number;
  avgPeriodLength: number;
}

/**
 * 月経周期の現在状態を返すフック
 */
export function useMenstrualCycle(): MenstrualCycleState {
  const {
    isEnabled,
    lastPeriodStart,
    avgCycleLength,
    avgPeriodLength,
  } = useCycleStore();

  return useMemo(() => {
    if (!isEnabled || !lastPeriodStart) {
      return {
        isEnabled,
        phase: null,
        dayInCycle: null,
        daysUntilNext: null,
        phaseInfo: null,
        lastPeriodStart: null,
        avgCycleLength,
        avgPeriodLength,
      };
    }

    const periodDate = new Date(lastPeriodStart);
    const { phase, dayInCycle, daysUntilNext } = calcCurrentPhase(
      periodDate,
      avgCycleLength,
      avgPeriodLength,
    );

    return {
      isEnabled,
      phase,
      dayInCycle,
      daysUntilNext,
      phaseInfo: PHASE_INFO[phase],
      lastPeriodStart: periodDate,
      avgCycleLength,
      avgPeriodLength,
    };
  }, [isEnabled, lastPeriodStart, avgCycleLength, avgPeriodLength]);
}
