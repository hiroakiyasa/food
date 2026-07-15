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
