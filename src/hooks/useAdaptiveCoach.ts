import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/src/stores/authStore';
import { mealsDb, nutritionTargetsDb, type LocalNutritionTarget } from '@/src/lib/localDb';
import { supabase } from '@/src/lib/supabase';
import { calculateAdaptiveEnergy, type AdaptiveEnergyResult } from '@/src/services/coaching/adaptiveEnergy';

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function weekStart(): string {
  const date = new Date();
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function useAdaptiveCoach() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['adaptive-coach', user?.id, weekStart()],
    queryFn: async (): Promise<{ result: AdaptiveEnergyResult; target: LocalNutritionTarget } | null> => {
      if (!user) return null;
      const from = `${dateDaysAgo(20)}T00:00:00`;
      const to = `${new Date().toISOString().slice(0, 10)}T23:59:59`;
      const [meals, target, healthResponse, profileResponse] = await Promise.all([
        mealsDb.getByUserAndPeriod(user.id, from, to),
        nutritionTargetsDb.getLatest(user.id),
        supabase.from('daily_health_data').select('date, weight_kg').eq('user_id', user.id)
          .gte('date', dateDaysAgo(20)).not('weight_kg', 'is', null).order('date'),
        supabase.from('profiles').select('goal').eq('user_id', user.id).maybeSingle(),
      ]);
      const effectiveTarget = target ?? {
        id: 'adaptive-default',
        user_id: user.id,
        energy_kcal: 2000,
        protein_g: 75,
        fat_g: 60,
        carbohydrate_g: 275,
        fiber_g: 21,
        sodium_mg: 2600,
        salt_g: 6.5,
        cholesterol_mg: null,
        potassium_mg: null,
        calcium_mg: null,
        iron_mg: null,
        calculation_basis: null,
        effective_from: dateDaysAgo(0),
        created_at: new Date().toISOString(),
      } satisfies LocalNutritionTarget;
      const energyByDate = new Map<string, number>();
      for (const meal of meals) {
        const date = meal.eaten_at.slice(0, 10);
        energyByDate.set(date, (energyByDate.get(date) ?? 0) + (meal.total_energy_kcal ?? 0));
      }
      const result = calculateAdaptiveEnergy({
        dailyIntakes: [...energyByDate].map(([date, energyKcal]) => ({ date, energyKcal })),
        weights: (healthResponse.data ?? []).map((row) => ({ date: row.date, weightKg: Number(row.weight_kg) })),
        currentTargetKcal: effectiveTarget.energy_kcal,
        currentProteinG: effectiveTarget.protein_g,
        goal: profileResponse.data?.goal ?? null,
      });
      return { result, target: effectiveTarget };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAcceptAdaptiveTarget() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ result, target }: { result: AdaptiveEnergyResult; target: LocalNutritionTarget }) => {
      if (!user) throw new Error('Not authenticated');
      const today = dateDaysAgo(0);
      const nextTarget = {
        ...target,
        energy_kcal: result.recommendedEnergyKcal,
        protein_g: result.recommendedProteinG,
        calculation_basis: {
          method: 'adherence_neutral_weight_trend',
          estimated_expenditure_kcal: result.estimatedExpenditureKcal,
          confidence: result.confidence,
          logging_coverage: result.loggingCoverage,
        },
        effective_from: today,
      };
      await nutritionTargetsDb.insert(user.id, nextTarget);
      const { error: targetError } = await supabase.from('nutrition_targets').insert({
        user_id: user.id,
        energy_kcal: nextTarget.energy_kcal,
        protein_g: nextTarget.protein_g,
        fat_g: nextTarget.fat_g,
        carbohydrate_g: nextTarget.carbohydrate_g,
        fiber_g: nextTarget.fiber_g,
        sodium_mg: nextTarget.sodium_mg,
        salt_g: nextTarget.salt_g,
        cholesterol_mg: nextTarget.cholesterol_mg,
        potassium_mg: nextTarget.potassium_mg,
        calcium_mg: nextTarget.calcium_mg,
        iron_mg: nextTarget.iron_mg,
        calculation_basis: nextTarget.calculation_basis,
        effective_from: nextTarget.effective_from,
      });
      if (targetError) throw targetError;
      const { error } = await supabase.from('nutrition_coaching_checkins').upsert({
        user_id: user.id,
        week_start: weekStart(),
        estimated_expenditure_kcal: result.estimatedExpenditureKcal,
        recommended_energy_kcal: result.recommendedEnergyKcal,
        recommended_protein_g: result.recommendedProteinG,
        confidence: result.confidence,
        weight_trend_kg: result.weightTrendKgPerWeek,
        logging_coverage: result.loggingCoverage,
        explanation: result.explanation,
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-targets'] });
      queryClient.invalidateQueries({ queryKey: ['adaptive-coach'] });
    },
  });
}
