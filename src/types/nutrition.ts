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

export interface AIFoodAnalysis {
  items: {
    name: string;
    portion_grams: number;
    confidence: number;
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    carbohydrate_g: number;
    fiber_g: number;
    sodium_mg: number;
  }[];
  meal_type_guess: string;
}
