export interface UsdaFoodCategory {
  id: number;
  code: string;
  description: string;
}

export interface UsdaNutrient {
  id: number;
  number: string;
  name: string;
  unitName: string;
}

export interface UsdaFoodNutrient {
  nutrient: UsdaNutrient;
  amount?: number;
}

export interface UsdaFoodPortion {
  amount: number;
  gramWeight: number;
  modifier?: string;
  measureUnit?: { name: string };
  portionDescription?: string;
}

export interface UsdaFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodClass: string;
  publicationDate: string;
  scientificName?: string;
  ndbNumber?: number;
  foodCategory?: UsdaFoodCategory;
  foodNutrients: UsdaFoodNutrient[];
  foodPortions?: UsdaFoodPortion[];
  // Branded-specific fields
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
}

export type UsdaDatasetKey =
  | "FoundationFoods"
  | "SRLegacyFoods"
  | "SurveyFoods"
  | "BrandedFoods";

export type UsdaSourceType =
  | "usda_foundation"
  | "usda_sr_legacy"
  | "usda_survey"
  | "usda_branded";
