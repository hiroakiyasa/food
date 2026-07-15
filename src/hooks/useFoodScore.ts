import { useMemo } from 'react';
import {
  calculateFoodScore,
  calculateMealScore,
  type FoodScoreInput,
  type FoodScoreResult,
} from '@/src/services/nutrition/foodScoreCalculator';
import type { Database } from '@/src/types/database';

type MealItem = Database['public']['Tables']['meal_items']['Row'];
type FoodItem = Database['public']['Tables']['food_items']['Row'];

/**
 * meal_items配列から食品スコアを計算するフック
 */
export function useMealScore(mealItems: MealItem[]): FoodScoreResult | null {
  return useMemo(() => {
    if (mealItems.length === 0) return null;

    const inputs: FoodScoreInput[] = mealItems.map((item) => ({
      energy_kcal: item.energy_kcal,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      carbohydrate_g: item.carbohydrate_g,
      fiber_g: item.fiber_g,
      sodium_mg: item.sodium_mg,
      portion_grams: item.portion_grams,
    }));

    return calculateMealScore(inputs);
  }, [mealItems]);
}

/**
 * food_itemsテーブルのデータから食品スコアを計算するフック
 */
export function useFoodItemScore(foodItem: FoodItem | null | undefined): FoodScoreResult | null {
  return useMemo(() => {
    if (!foodItem) return null;

    const input: FoodScoreInput = {
      energy_kcal: foodItem.energy_kcal,
      protein_g: foodItem.protein_g,
      fat_g: foodItem.fat_g,
      carbohydrate_g: foodItem.carbohydrate_g,
      fiber_g: foodItem.fiber_g,
      sodium_mg: foodItem.sodium_mg,
      nova_classification: foodItem.nova_classification,
      // food_score_valueが既にDBにある場合はそちらを使う
    };

    // food_score_valueが既にDBに保存済みの場合はそちらを優先
    if (foodItem.food_score_grade && foodItem.food_score_value != null) {
      return {
        grade: foodItem.food_score_grade,
        value: foodItem.food_score_value,
        breakdown: {
          positivePoints: 0,
          negativePoints: 0,
          fiberPoints: 0,
          proteinPoints: 0,
          energyPenalty: 0,
          sodiumPenalty: 0,
          satFatPenalty: 0,
          sugarPenalty: 0,
          novaPenalty: 0,
        },
      };
    }

    return calculateFoodScore(input);
  }, [foodItem]);
}

/**
 * AI解析アイテム（meal-detailのpendingMealから）のスコアを計算
 */
export function useAnalysisItemScore(item: {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  sodium_mg: number;
  portion_grams: number;
}): FoodScoreResult {
  return useMemo(() => {
    return calculateFoodScore({
      energy_kcal: item.energy_kcal,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      carbohydrate_g: item.carbohydrate_g,
      fiber_g: item.fiber_g,
      sodium_mg: item.sodium_mg,
      portion_grams: item.portion_grams,
    });
  }, [
    item.energy_kcal,
    item.protein_g,
    item.fat_g,
    item.carbohydrate_g,
    item.fiber_g,
    item.sodium_mg,
    item.portion_grams,
  ]);
}
