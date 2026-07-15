import { useMemo } from 'react';
import {
  estimateDailyCarbon,
  calcCarbonGrade,
  type DailyCarbonResult,
  type CarbonGrade,
} from '@/src/services/sustainability/carbonCalculator';
import type { LocalDailySummary } from '@/src/lib/localDb';

export interface DailyCarbonPoint extends DailyCarbonResult {
  date: string;
}

export interface CarbonFootprintAnalysis {
  /** 期間の日次CO₂データ */
  dailyPoints: DailyCarbonPoint[];
  /** 期間平均CO₂(kg/日) */
  avgKgPerDay: number | null;
  /** 平均グレード */
  avgGrade: CarbonGrade | null;
  /** 日本平均との比較 % */
  vsJapanAverage: number | null;
  /** 最も影響の大きい排出源 */
  topSource: string | null;
}

/**
 * 日次サマリー配列からCO₂フットプリント分析を計算するフック
 */
export function useCarbonFootprint(
  summaries: LocalDailySummary[],
): CarbonFootprintAnalysis {
  return useMemo(() => {
    if (summaries.length === 0) {
      return {
        dailyPoints: [],
        avgKgPerDay: null,
        avgGrade: null,
        vsJapanAverage: null,
        topSource: null,
      };
    }

    const dailyPoints: DailyCarbonPoint[] = summaries
      .filter((s) => s.total_energy_kcal > 0)
      .map((s) => {
        // DB に total_carbon_kg が保存されていればそれを使用、なければ推定
        const estimated = s.total_carbon_kg != null
          ? {
              estimated_kg: s.total_carbon_kg,
              grade: s.carbon_grade ?? calcCarbonGrade(s.total_carbon_kg),
              vs_average: (s.total_carbon_kg - 3.5) / 3.5,
              breakdown: { animal_protein_kg: 0, plant_food_kg: 0, processed_food_kg: 0, dairy_proxy_kg: 0 },
            }
          : estimateDailyCarbon({
              totalKcal: s.total_energy_kcal,
              proteinG: s.total_protein_g,
              fatG: s.total_fat_g,
              carbsG: s.total_carbohydrate_g,
              fiberG: s.total_fiber_g,
              sodiumMg: s.total_sodium_mg,
            });

        return { date: s.date, ...estimated };
      });

    if (dailyPoints.length === 0) {
      return { dailyPoints: [], avgKgPerDay: null, avgGrade: null, vsJapanAverage: null, topSource: null };
    }

    const avgKgPerDay = dailyPoints.reduce((sum, d) => sum + d.estimated_kg, 0) / dailyPoints.length;
    const avgGrade = calcCarbonGrade(avgKgPerDay);
    const vsJapanAverage = Math.round(((avgKgPerDay - 3.5) / 3.5) * 100);

    // 平均breakdown から最大排出源を特定
    const avgBreakdown = dailyPoints.reduce(
      (acc, d) => ({
        animal_protein_kg: acc.animal_protein_kg + d.breakdown.animal_protein_kg / dailyPoints.length,
        plant_food_kg: acc.plant_food_kg + d.breakdown.plant_food_kg / dailyPoints.length,
        processed_food_kg: acc.processed_food_kg + d.breakdown.processed_food_kg / dailyPoints.length,
        dairy_proxy_kg: acc.dairy_proxy_kg + d.breakdown.dairy_proxy_kg / dailyPoints.length,
      }),
      { animal_protein_kg: 0, plant_food_kg: 0, processed_food_kg: 0, dairy_proxy_kg: 0 },
    );

    const sourceLabels: Record<string, string> = {
      animal_protein_kg: '動物性タンパク質',
      plant_food_kg: '植物性食品',
      processed_food_kg: '加工食品',
      dairy_proxy_kg: '乳製品',
    };
    const topSource = (Object.entries(avgBreakdown) as Array<[string, number]>)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      dailyPoints,
      avgKgPerDay: Math.round(avgKgPerDay * 100) / 100,
      avgGrade,
      vsJapanAverage,
      topSource: topSource ? (sourceLabels[topSource[0]] ?? null) : null,
    };
  }, [summaries]);
}
