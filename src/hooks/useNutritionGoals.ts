import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activeConditionsDb, nutritionGoalsDb, type LocalNutritionGoal } from '@/src/lib/localDb';
import { computeNutritionGoals } from '@/src/services/nutrition/conditionGoals';
import { useAuthStore } from '@/src/stores/authStore';

export function useNutritionGoals(): LocalNutritionGoal[] {
  const user = useAuthStore((s) => s.user);

  const { data = [] } = useQuery({
    queryKey: ['nutrition-goals', user?.id],
    queryFn: () => (user ? nutritionGoalsDb.getAll(user.id) : []),
    enabled: !!user,
  });

  return data;
}

export function useUpdateConditionsAndGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, conditions }: { userId: string; conditions: string[] }) => {
      const goals = computeNutritionGoals(conditions);
      await Promise.all([
        activeConditionsDb.set(userId, conditions),
        nutritionGoalsDb.replaceAll(userId, goals),
      ]);
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['active-conditions', userId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-goals', userId] });
    },
  });
}
