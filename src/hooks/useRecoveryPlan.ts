import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';

export interface RecoveryDay {
  day: number;
  target_kcal: number;
  meals: { meal_type: string; description: string; kcal: number }[];
  tips: string[];
}

export interface RecoveryPlan {
  days: RecoveryDay[];
  message: string;
}

export function useRecoveryPlan() {
  return useMutation({
    mutationFn: async (): Promise<RecoveryPlan> => {
      const { data, error } = await supabase.functions.invoke('generate-recovery-plan', {
        body: {},
      });
      if (error) throw new Error(error.message);
      return data as RecoveryPlan;
    },
  });
}
