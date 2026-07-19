import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { dailySummariesDb } from '@/src/lib/localDb';
import { supabase } from '@/src/lib/supabase';
import { toLocalDateString } from '@/src/utils/formatters';
import {
  analyzeSleepNutritionCorrelations,
  generateSleepInsights,
  estimateSleepScore,
  type SleepNutritionDataPoint,
  type SleepCorrelation,
  type SleepNutritionInsight,
} from '@/src/services/health/sleepNutritionAnalyzer';

export interface SleepNutritionAnalysis {
  dataPoints: SleepNutritionDataPoint[];
  correlations: SleepCorrelation[];
  insights: SleepNutritionInsight[];
  avgSleepHours: number | null;
  avgSleepScore: number | null;
  hasHealthData: boolean;
}

/**
 * 睡眠データと栄養データを結合し、相関分析を返すフック
 * @param days 取得日数 (デフォルト14日)
 */
export function useSleepNutritionCorrelation(days: number = 14) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['sleep-nutrition-correlation', user?.id, days],
    queryFn: async (): Promise<SleepNutritionAnalysis> => {
      if (!user) {
        return {
          dataPoints: [],
          correlations: [],
          insights: [],
          avgSleepHours: null,
          avgSleepScore: null,
          hasHealthData: false,
        };
      }

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      const startStr = toLocalDateString(start);
      const endStr = toLocalDateString(end);

      // 日次サマリーと健康データを並行取得
      const [summaries, healthResult] = await Promise.all([
        dailySummariesDb.getRange(user.id, startStr, endStr),
        supabase
          .from('daily_health_data')
          .select('date, sleep_hours')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true }),
      ]);

      const healthMap = new Map<string, number>();
      for (const h of healthResult.data ?? []) {
        if (h.sleep_hours != null) {
          healthMap.set(h.date, h.sleep_hours);
        }
      }

      const dataPoints: SleepNutritionDataPoint[] = summaries.map((s) => {
        const sleepHours = healthMap.get(s.date) ?? null;
        return {
          date: s.date,
          sleepHours,
          sleepScore: sleepHours != null ? estimateSleepScore(sleepHours) : null,
          totalKcal: s.total_energy_kcal ?? 0,
          // evening_carbs_g がある場合はそれを使用、なければ炭水化物の30%を推定
          eveningCarbsG: s.evening_carbs_g ?? (s.total_carbohydrate_g ?? 0) * 0.3,
          proteinG: s.total_protein_g ?? 0,
          fiberG: s.total_fiber_g ?? 0,
          sodiumMg: s.total_sodium_mg ?? 0,
          mealCount: s.meal_count ?? 0,
        };
      });

      const correlations = analyzeSleepNutritionCorrelations(dataPoints);
      const insights = generateSleepInsights(dataPoints, correlations);

      const validSleep = dataPoints.filter((d) => d.sleepHours != null);
      const avgSleepHours = validSleep.length > 0
        ? validSleep.reduce((sum, d) => sum + d.sleepHours!, 0) / validSleep.length
        : null;
      const avgSleepScore = validSleep.length > 0
        ? validSleep.reduce((sum, d) => sum + (d.sleepScore ?? 0), 0) / validSleep.length
        : null;

      return {
        dataPoints,
        correlations,
        insights,
        avgSleepHours,
        avgSleepScore,
        hasHealthData: healthMap.size > 0,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5分
  });
}
