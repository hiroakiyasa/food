import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/lib/supabase';
import type { Database } from '@/src/types/database';

type MealPlanRow = Database['public']['Tables']['meal_plans']['Row'];

// ─── JSONB 型定義 ─────────────────────────────────────────────────────────────

export interface MealPlanMeal {
  name: string;
  description: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: string[];
  recipe: string;
}

export interface MealPlanDay {
  date: string;
  day_name: string;
  meals: {
    breakfast: MealPlanMeal;
    lunch: MealPlanMeal;
    dinner: MealPlanMeal;
    snack: MealPlanMeal | null;
  };
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface WeeklyMealPlan {
  days: MealPlanDay[];
  week_summary: {
    avg_kcal: number;
    avg_protein_g: number;
    avg_carbs_g: number;
    avg_fat_g: number;
    theme: string;
    highlights: string[];
  };
}

export interface GroceryItem {
  name: string;
  amount: string;
  estimated_cost_yen?: number;
}

export interface GroceryCategory {
  name: string;
  emoji: string;
  items: GroceryItem[];
}

export interface GroceryList {
  categories: GroceryCategory[];
  total_estimated_cost_yen?: number;
}

export type MealPlan = Omit<MealPlanRow, 'plan_data' | 'grocery_list'> & {
  plan_data: WeeklyMealPlan;
  grocery_list: GroceryList | null;
};

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

function getWeekStart(offsetWeeks = 0): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offsetWeeks * 7);
  return monday.toISOString().split('T')[0]!;
}

// ─── フック ───────────────────────────────────────────────────────────────────

/**
 * 特定週の食事プランを取得するフック
 * @param weekOffset 0=今週, 1=来週, -1=先週
 */
export function useWeeklyMealPlan(weekOffset = 0) {
  const user = useAuthStore((s) => s.user);
  const weekStart = getWeekStart(weekOffset);

  return useQuery({
    queryKey: ['meal-plan', user?.id, weekStart],
    queryFn: async (): Promise<MealPlan | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (error) throw error;
      return data as MealPlan | null;
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1時間
  });
}

/**
 * AI食事プランを生成するミューテーション
 */
export function useGenerateMealPlan() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ weekOffset = 0, force = false }: { weekOffset?: number; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: { week_offset: weekOffset, force },
      });
      if (error) throw new Error(error.message);
      return data as { plan: MealPlan; cached: boolean };
    },
    onSuccess: (result) => {
      const weekStart = result.plan.week_start;
      queryClient.setQueryData(['meal-plan', user?.id, weekStart], result.plan);
    },
  });
}

/**
 * プランを承認（accepted=true）するミューテーション
 */
export function useAcceptMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('meal_plans')
        .update({ accepted: true })
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
    },
  });
}
