export interface NutrientValues {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  sodium_mg: number;
  salt_equivalent_g?: number;
  cholesterol_mg?: number;
}

export interface NutrientTarget extends NutrientValues {
  potassium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
}

export interface TrafficLight {
  fat: 'green' | 'amber' | 'red';
  saturated_fat: 'green' | 'amber' | 'red';
  sugar: 'green' | 'amber' | 'red';
  salt: 'green' | 'amber' | 'red';
}

export interface MealScore {
  overall: number; // 0-100
  pfc_balance: number;
  fiber_score: number;
  sodium_score: number;
  variety_score: number;
}

export interface DailySummaryData {
  nutrients: NutrientValues;
  target: NutrientTarget;
  score: number;
  mealCount: number;
  bufferUsedKcal: number;
}

export type NutritionEstimateBasis = 'database' | 'ai_estimate' | 'mock';

export interface AIFoodAnalysisItem {
  name: string;
  detected_name?: string;
  matched_food_name?: string | null;
  food_item_id?: string | null;
  food_code?: string | null;
  database_source?: string | null;
  estimate_basis: NutritionEstimateBasis;
  portion_grams: number;
  confidence: number;
  database_match_score?: number;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  sodium_mg: number;
  salt_equivalent_g: number;
  portion_min_grams: number;
  portion_max_grams: number;
  energy_min_kcal: number;
  energy_max_kcal: number;
  hidden_ingredient_flags: string[];
  confirmation_prompt: string | null;
}

export interface AIFoodAnalysis {
  items: AIFoodAnalysisItem[];
  meal_type_guess: string;
  summary?: string;
  disclaimer?: string;
  analysis_source?: 'gemini+database' | 'mock';
  model?: string;
}
