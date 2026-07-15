import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { mealsDb, type LocalMeal, type LocalMealItem } from '@/src/lib/localDb';
import { upsertDailySummary } from '@/src/services/nutrition/dailySummary';
import { getToday } from '@/src/utils/formatters';

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
      await mealsDb.update(user.id, id, meal as Partial<LocalMeal>, items);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['meal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
    },
  });
}

export function useDeleteMeal() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await mealsDb.delete(user.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
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

      const now = new Date().toISOString();
      const mealData: Omit<LocalMeal, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        meal_type: meal.meal_type ?? 'lunch',
        eaten_at: meal.eaten_at ?? now,
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

      return mealsDb.create(user.id, mealData, items);
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
        eaten_at: meal.eaten_at ?? now,
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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });

      if (user) {
        const today = getToday();
        const todayMeals = await mealsDb.getByDate(user.id, today);
        await upsertDailySummary({
          userId: user.id,
          date: today,
          meals: todayMeals,
        });
        queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
        queryClient.invalidateQueries({ queryKey: ['streaks'] });
      }
    },
  });
}
