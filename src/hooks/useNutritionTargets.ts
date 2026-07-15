import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { nutritionTargetsDb, activeConditionsDb, type LocalNutritionTarget } from '@/src/lib/localDb';
import { getToday } from '@/src/utils/formatters';

const GLP1_CONDITION = 'GLP-1薬服用中';

export function useNutritionTargets() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['nutrition-targets', user?.id],
    queryFn: async (): Promise<LocalNutritionTarget | null> => {
      if (!user) return null;
      const [targets, conditions] = await Promise.all([
        nutritionTargetsDb.getLatest(user.id),
        activeConditionsDb.get(user.id),
      ]);
      if (!targets) return null;
      // GLP-1薬服用中はタンパク質目標を1.2倍に増加（筋肉量維持）
      if (conditions.includes(GLP1_CONDITION) && targets.protein_g != null) {
        return { ...targets, protein_g: Math.round(targets.protein_g * 1.2) };
      }
      return targets;
    },
    enabled: !!user,
  });
}

export function useUpdateNutritionTargets() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      targets: Omit<LocalNutritionTarget, 'id' | 'user_id' | 'effective_from' | 'created_at'>
    ) => {
      if (!user) throw new Error('Not authenticated');
      await nutritionTargetsDb.insert(user.id, {
        ...targets,
        effective_from: getToday(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-targets'] });
    },
  });
}
