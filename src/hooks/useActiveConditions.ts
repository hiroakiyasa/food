import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activeConditionsDb } from '@/src/lib/localDb';
import { useAuthStore } from '@/src/stores/authStore';
import { ALL_GUIDELINES } from '@/src/services/nutrition/conditionGoals';
import { useUpdateConditionsAndGoals } from '@/src/hooks/useNutritionGoals';
import type { FocusNutrient } from '@/src/types/nutritionConditions';
import type { QuantitativeCriteria } from '@/src/types/nutritionGuidelines';

export interface MergedFocusNutrient extends FocusNutrient {
  sourceCondition: string;
  // New fields from guideline format (optional for backward compatibility)
  nutrientKey?: string;
  quantitativeCriteria?: QuantitativeCriteria;
}

export function useActiveConditions() {
  const user = useAuthStore((s) => s.user);
  const updateConditionsAndGoals = useUpdateConditionsAndGoals();

  const { data: activeConditions = [] } = useQuery({
    queryKey: ['active-conditions', user?.id],
    queryFn: () => (user ? activeConditionsDb.get(user.id) : []),
    enabled: !!user,
  });

  // Build focusNutrients from new guidelines format, High → Medium → Low order
  // Deduplicate by nutrientName (first occurrence wins). A nutrient that any
  // active condition limits must never surface as "increase" — the
  // restriction wins regardless of priority order (e.g. CKD protein limit
  // vs muscle-gain protein increase).
  const focusNutrients = useMemo((): MergedFocusNutrient[] => {
    if (activeConditions.length === 0) return [];

    const matched = ALL_GUIDELINES.filter((g) =>
      activeConditions.includes(g.subCategoryName)
    );

    const limitedNutrients = new Set(
      matched.flatMap((g) =>
        g.focusNutrients.filter((fn) => fn.action === 'limit').map((fn) => fn.nutrientName),
      ),
    );

    const seen = new Set<string>();
    const result: MergedFocusNutrient[] = [];

    for (const priority of ['High', 'Medium', 'Low'] as const) {
      for (const guideline of matched) {
        for (const fn of guideline.focusNutrients) {
          if (fn.action === 'increase' && limitedNutrients.has(fn.nutrientName)) continue;
          if (fn.priority === priority && !seen.has(fn.nutrientName)) {
            seen.add(fn.nutrientName);
            result.push({
              // FocusNutrient compat fields
              nutrientName: fn.nutrientName,
              action: fn.action,
              priority: fn.priority,
              reason: fn.reason,
              evidenceBase: fn.evidenceBase,
              // New fields
              sourceCondition: guideline.subCategoryName,
              nutrientKey: fn.nutrientKey,
              quantitativeCriteria: fn.quantitativeCriteria,
            });
          }
        }
      }
    }

    return result;
  }, [activeConditions]);

  const updateActiveConditions = (conditions: string[]) => {
    if (!user) return Promise.resolve();
    return updateConditionsAndGoals.mutateAsync({ userId: user.id, conditions });
  };

  return {
    activeConditions,
    focusNutrients,
    updateActiveConditions,
    isPending: updateConditionsAndGoals.isPending,
  };
}
