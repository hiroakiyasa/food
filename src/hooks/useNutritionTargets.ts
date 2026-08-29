import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { nutritionTargetsDb, activeConditionsDb, type LocalNutritionTarget } from '@/src/lib/localDb';
import { getToday } from '@/src/utils/formatters';
import { supabase } from '@/src/lib/supabase';
import { ALL_GUIDELINES } from '@/src/services/nutrition/conditionGoals';

const GLP1_CONDITION = 'GLP-1薬服用中';

// True when any active condition medically restricts protein (e.g. CKD) —
// the GLP-1 protein boost must never override such a restriction.
function hasProteinRestriction(conditions: string[]): boolean {
  return ALL_GUIDELINES.some(
    (g) =>
      conditions.includes(g.subCategoryName) &&
      g.focusNutrients.some((fn) => fn.nutrientKey === 'protein_g' && fn.action === 'limit'),
  );
}

export function useNutritionTargets() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['nutrition-targets', user?.id],
    queryFn: async (): Promise<LocalNutritionTarget | null> => {
      if (!user) return null;
      const [localTargets, conditions, cloudResponse] = await Promise.all([
        nutritionTargetsDb.getLatest(user.id),
        activeConditionsDb.get(user.id),
        supabase.from('nutrition_targets').select('*').eq('user_id', user.id)
          .order('effective_from', { ascending: false }).limit(1).maybeSingle(),
      ]);
      const cloud = cloudResponse.data as LocalNutritionTarget | null;
      let targets = localTargets;
      if (cloud && (!localTargets || cloud.effective_from > localTargets.effective_from)) {
        await nutritionTargetsDb.insert(user.id, {
          energy_kcal: Number(cloud.energy_kcal),
          protein_g: Number(cloud.protein_g),
          fat_g: Number(cloud.fat_g),
          carbohydrate_g: Number(cloud.carbohydrate_g),
          fiber_g: Number(cloud.fiber_g),
          sodium_mg: Number(cloud.sodium_mg),
          salt_g: Number(cloud.salt_g),
          cholesterol_mg: cloud.cholesterol_mg == null ? null : Number(cloud.cholesterol_mg),
          potassium_mg: cloud.potassium_mg == null ? null : Number(cloud.potassium_mg),
          calcium_mg: cloud.calcium_mg == null ? null : Number(cloud.calcium_mg),
          iron_mg: cloud.iron_mg == null ? null : Number(cloud.iron_mg),
          calculation_basis: cloud.calculation_basis,
          effective_from: cloud.effective_from,
        });
        targets = await nutritionTargetsDb.getLatest(user.id);
      }
      if (!targets) return null;
      // GLP-1薬服用中はタンパク質目標を1.2倍に増加（筋肉量維持）。
      // ただしタンパク質制限のある条件（腎臓病など）があるときは適用しない。
      if (
        conditions.includes(GLP1_CONDITION) &&
        targets.protein_g != null &&
        !hasProteinRestriction(conditions)
      ) {
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
      const value = {
        ...targets,
        effective_from: getToday(),
      };
      await nutritionTargetsDb.insert(user.id, value);
      const { error } = await supabase.from('nutrition_targets').insert({
        ...value,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-targets'] });
    },
  });
}
