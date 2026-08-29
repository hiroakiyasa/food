import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import {
  mealsDb,
  dailySummariesDb,
  weeklyBuffersDb,
  nutritionTargetsDb,
  type LocalMeal,
  type LocalMealItem,
} from '@/src/lib/localDb';
import { upsertDailySummary } from '@/src/services/nutrition/dailySummary';
import { evaluateAndAwardBadges } from '@/src/services/gamification/badgeService';
import { eatenAtForDate, getToday, getWeekStart, addDays } from '@/src/utils/formatters';
import { enqueueMealSync, syncMealsForUser } from '@/src/services/sync/mealSyncService';

const WEEKLY_BUFFER_TOTAL_KCAL = 1400; // 200 kcal/day of flexible budget
const WEEKLY_BUFFER_TOTAL_SODIUM_MG = 5600;

// Recompute the aggregates a meal mutation affects: the day's summary (score,
// totals, feedback) and the ISO week's buffer usage. Must run after create,
// update AND delete — otherwise the home score and insights keep stale values.
async function recomputeDayAggregates(
  userId: string,
  date: string,
  queryClient: QueryClient,
): Promise<void> {
  const [meals, target] = await Promise.all([
    mealsDb.getByDate(userId, date),
    nutritionTargetsDb.getLatest(userId),
  ]);
  const targetKcal = target?.energy_kcal ?? 2000;
  await upsertDailySummary({ userId, date, meals, targetKcal });

  // Weekly buffer: accumulated overage across the week vs the daily targets.
  const weekStart = getWeekStart(date);
  const weekEnd = addDays(weekStart, 6);
  const summaries = await dailySummariesDb.getRange(userId, weekStart, weekEnd);
  const targetSodium = target?.sodium_mg ?? 2300;
  const usedKcal = summaries.reduce(
    (sum, s) => sum + Math.max(0, (s.total_energy_kcal ?? 0) - targetKcal),
    0,
  );
  const usedSodium = summaries.reduce(
    (sum, s) => sum + Math.max(0, (s.total_sodium_mg ?? 0) - targetSodium),
    0,
  );
  await weeklyBuffersDb.upsert(userId, weekStart, {
    buffer_total_kcal: WEEKLY_BUFFER_TOTAL_KCAL,
    buffer_used_kcal: Math.round(usedKcal),
    buffer_total_sodium_mg: WEEKLY_BUFFER_TOTAL_SODIUM_MG,
    buffer_used_sodium_mg: Math.round(usedSodium),
  });

  queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
  queryClient.invalidateQueries({ queryKey: ['weekly-buffer'] });
  queryClient.invalidateQueries({ queryKey: ['streaks'] });
  queryClient.invalidateQueries({ queryKey: ['insights-data'] });
}

function dateOfMeal(meal: { eaten_at: string } | null | undefined): string {
  const eatenAt = meal?.eaten_at;
  return eatenAt && eatenAt.length >= 10 ? eatenAt.slice(0, 10) : getToday();
}

// Re-export types that downstream components expect (shape-compatible with DB types)
export type Meal = LocalMeal;
export type MealWithItems = LocalMeal & { meal_items: LocalMealItem[] };

type MealInsert = Omit<LocalMeal, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string };
// food_item_id, commercial_product_id, confidence, and fiber_g are optional at the call site
type MealItemInsert = Omit<LocalMealItem, 'id' | 'meal_id' | 'created_at' | 'food_item_id' | 'commercial_product_id' | 'confidence' | 'fiber_g'> & {
  food_item_id?: string | null;
  commercial_product_id?: string | null;
  fiber_g?: number | null;
  confidence?: number | null;
};

export function useMealsByDate(date: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['meals', user?.id, date],
    queryFn: async (): Promise<MealWithItems[]> => {
      if (!user) return [];
      await syncMealsForUser(user.id).catch(() => undefined);
      return mealsDb.getByDate(user.id, date);
    },
    enabled: !!user,
  });
}

export function useMealById(id: string | undefined) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['meal', id],
    queryFn: async (): Promise<MealWithItems | null> => {
      if (!user || !id) return null;
      return mealsDb.getById(user.id, id);
    },
    enabled: !!user && !!id,
  });
}

export function useUpdateMeal() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      meal,
      items,
    }: {
      id: string;
      meal: Partial<MealInsert>;
      items?: MealItemInsert[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      const before = await mealsDb.getById(user.id, id);
      await mealsDb.update(user.id, id, meal as Partial<LocalMeal>, items);
      const after = await mealsDb.getById(user.id, id);
      await enqueueMealSync(user.id, id, 'upsert');
      await syncMealsForUser(user.id).catch(() => undefined);
      return { beforeDate: dateOfMeal(before), afterDate: dateOfMeal(after) };
    },
    onSuccess: async (dates, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['meal', variables.id] });
      if (user) {
        await recomputeDayAggregates(user.id, dates.afterDate, queryClient);
        if (dates.beforeDate !== dates.afterDate) {
          await recomputeDayAggregates(user.id, dates.beforeDate, queryClient);
        }
      }
    },
  });
}

export function useDeleteMeal() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const meal = await mealsDb.getById(user.id, id);
      await mealsDb.delete(user.id, id);
      await enqueueMealSync(user.id, id, 'delete');
      await syncMealsForUser(user.id).catch(() => undefined);
      return { date: dateOfMeal(meal) };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      if (user) {
        await recomputeDayAggregates(user.id, result.date, queryClient);
      }
    },
  });
}

export function useCreateMeal() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meal,
      items,
    }: {
      meal: Partial<MealInsert>;
      items: MealItemInsert[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const mealData: Omit<LocalMeal, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        meal_type: meal.meal_type ?? 'lunch',
        eaten_at: meal.eaten_at ?? eatenAtForDate(getToday()),
        image_url: meal.image_url ?? null,
        total_energy_kcal: meal.total_energy_kcal ?? null,
        total_protein_g: meal.total_protein_g ?? null,
        total_fat_g: meal.total_fat_g ?? null,
        total_carbohydrate_g: meal.total_carbohydrate_g ?? null,
        total_fiber_g: meal.total_fiber_g ?? null,
        total_sodium_mg: meal.total_sodium_mg ?? null,
        meal_score: meal.meal_score ?? null,
        traffic_light_overall: meal.traffic_light_overall ?? null,
        notes: meal.notes ?? null,
      };

      const created = await mealsDb.create(user.id, mealData, items);
      await enqueueMealSync(user.id, created.id, 'upsert');
      await syncMealsForUser(user.id).catch(() => undefined);
      return created;
    },
    onMutate: async ({ meal, items }) => {
      if (!user) return;

      const today = getToday();
      const queryKey = ['meals', user.id, today];
      await queryClient.cancelQueries({ queryKey });
      const previousMeals = queryClient.getQueryData<MealWithItems[]>(queryKey);

      const optimisticId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticMeal: MealWithItems = {
        id: optimisticId,
        user_id: user.id,
        meal_type: meal.meal_type ?? 'lunch',
        eaten_at: meal.eaten_at ?? eatenAtForDate(today),
        image_url: meal.image_url ?? null,
        total_energy_kcal: meal.total_energy_kcal ?? null,
        total_protein_g: meal.total_protein_g ?? null,
        total_fat_g: meal.total_fat_g ?? null,
        total_carbohydrate_g: meal.total_carbohydrate_g ?? null,
        total_fiber_g: meal.total_fiber_g ?? null,
        total_sodium_mg: meal.total_sodium_mg ?? null,
        meal_score: meal.meal_score ?? null,
        traffic_light_overall: meal.traffic_light_overall ?? null,
        notes: meal.notes ?? null,
        created_at: now,
        updated_at: now,
        meal_items: items.map((item, i): LocalMealItem => ({
          id: `temp-item-${Date.now()}-${i}`,
          meal_id: optimisticId,
          food_item_id: item.food_item_id ?? null,
          commercial_product_id: item.commercial_product_id ?? null,
          ai_detected_name: item.ai_detected_name,
          portion_grams: item.portion_grams ?? null,
          confidence: item.confidence ?? null,
          energy_kcal: item.energy_kcal ?? null,
          protein_g: item.protein_g ?? null,
          fat_g: item.fat_g ?? null,
          carbohydrate_g: item.carbohydrate_g ?? null,
          fiber_g: item.fiber_g ?? null,
          sodium_mg: item.sodium_mg ?? null,
          created_at: now,
        })),
      };

      queryClient.setQueryData<MealWithItems[]>(queryKey, (old) => [
        ...(old ?? []),
        optimisticMeal,
      ]);

      return { previousMeals, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMeals !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousMeals);
      }
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });

      if (user) {
        const date = variables.meal.eaten_at?.slice(0, 10) ?? getToday();
        await recomputeDayAggregates(user.id, date, queryClient);
        evaluateAndAwardBadges(user.id)
          .then((newBadges) => {
            if (newBadges.length > 0) {
              queryClient.invalidateQueries({ queryKey: ['badges'] });
            }
          })
          .catch(() => {});
      }
    },
  });
}
