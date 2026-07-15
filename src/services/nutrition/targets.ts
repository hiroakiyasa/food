import { supabase } from '@/src/lib/supabase';
import { nutritionTargetsDb, type LocalNutritionTarget } from '@/src/lib/localDb';
import { useAuthStore } from '@/src/stores/authStore';
import { getToday } from '@/src/utils/formatters';

export async function recalculateTargets(): Promise<LocalNutritionTarget> {
  const { data, error } = await supabase.functions.invoke('calculate-daily-targets', {
    body: {},
  });
  if (error) throw new Error(error.message);

  const result = data as LocalNutritionTarget;

  // Persist result locally
  const user = useAuthStore.getState().user;
  if (user) {
    await nutritionTargetsDb.insert(user.id, {
      energy_kcal: result.energy_kcal,
      protein_g: result.protein_g,
      fat_g: result.fat_g,
      carbohydrate_g: result.carbohydrate_g,
      fiber_g: result.fiber_g,
      sodium_mg: result.sodium_mg,
      salt_g: result.salt_g,
      cholesterol_mg: result.cholesterol_mg ?? null,
      potassium_mg: result.potassium_mg ?? null,
      calcium_mg: result.calcium_mg ?? null,
      iron_mg: result.iron_mg ?? null,
      calculation_basis: result.calculation_basis ?? null,
      effective_from: getToday(),
    });
  }

  return result;
}
