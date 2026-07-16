import { create } from 'zustand';
import type { AIFoodAnalysis } from '@/src/types/nutrition';
import type { MealType } from '@/src/lib/constants';

interface PendingMeal {
  imageUri: string;
  imageBase64: string;
  analysis: AIFoodAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  mealType?: MealType;
}

interface MealState {
  pendingMeal: PendingMeal | null;
  setPendingMeal: (meal: PendingMeal | null) => void;
  setAnalysis: (analysis: AIFoodAnalysis) => void;
  setAnalysisItemPortion: (index: number, portionGrams: number) => void;
  removeAnalysisItem: (index: number) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  clearPending: () => void;
}

export const useMealStore = create<MealState>((set) => ({
  pendingMeal: null,
  setPendingMeal: (pendingMeal) => set({ pendingMeal }),
  setAnalysis: (analysis) =>
    set((state) => ({
      pendingMeal: state.pendingMeal
        ? { ...state.pendingMeal, analysis, isAnalyzing: false, error: null }
        : null,
    })),
  setAnalysisItemPortion: (index, portionGrams) =>
    set((state) => {
      if (!state.pendingMeal?.analysis) return state;
      const nextPortion = Math.max(1, Math.min(2000, Math.round(portionGrams)));
      const items = state.pendingMeal.analysis.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const currentPortion = Math.max(1, item.portion_grams);
        const ratio = nextPortion / currentPortion;
        return {
          ...item,
          portion_grams: nextPortion,
          energy_kcal: item.energy_kcal * ratio,
          protein_g: item.protein_g * ratio,
          fat_g: item.fat_g * ratio,
          carbohydrate_g: item.carbohydrate_g * ratio,
          fiber_g: item.fiber_g * ratio,
          sodium_mg: item.sodium_mg * ratio,
          salt_equivalent_g: item.salt_equivalent_g * ratio,
        };
      });
      return {
        pendingMeal: {
          ...state.pendingMeal,
          analysis: { ...state.pendingMeal.analysis, items },
        },
      };
    }),
  removeAnalysisItem: (index) =>
    set((state) => {
      if (!state.pendingMeal?.analysis) return state;
      return {
        pendingMeal: {
          ...state.pendingMeal,
          analysis: {
            ...state.pendingMeal.analysis,
            items: state.pendingMeal.analysis.items.filter((_, itemIndex) => itemIndex !== index),
          },
        },
      };
    }),
  setAnalyzing: (isAnalyzing) =>
    set((state) => ({
      pendingMeal: state.pendingMeal
        ? { ...state.pendingMeal, isAnalyzing }
        : null,
    })),
  setError: (error) =>
    set((state) => ({
      pendingMeal: state.pendingMeal
        ? { ...state.pendingMeal, error, isAnalyzing: false }
        : null,
    })),
  clearPending: () => set({ pendingMeal: null }),
}));
