import type { NutrientCategory } from '@/src/lib/nutritionConstants';

export type NutrientStatus = 'deficient' | 'adequate' | 'excessive';

export interface NutrientBalanceItem {
  key: string;
  nameJa: string;
  unit: string;
  currentValue: number;
  targetValue: number;
  /** currentValue / targetValue */
  ratio: number;
  status: NutrientStatus;
  color: string;
  category: NutrientCategory;
  /** true if data is estimated/incomplete (e.g. no food_item_id) */
  isEstimated?: boolean;
}

export interface MacroRadarPoint {
  label: string;
  value: number;
  maxValue: number;
}

export interface NutrientBalanceData {
  viewType: 'daily' | 'meal';
  nutrients: NutrientBalanceItem[];
  macroRadar: MacroRadarPoint[];
}

export type BalanceDisplayMode = 'graph' | 'numeric';

export type ElementKey = 'earth' | 'water' | 'sun' | 'wind' | 'fire';

export type BeanGrowthStage = 'seed' | 'sprout' | 'leafy' | 'bloom' | 'shine';

export interface ElementNutrientContribution {
  key: string;
  nameJa: string;
  unit: string;
  ratio: number;
}

export interface ElementFountainState {
  key: ElementKey;
  labelJa: string;
  icon: string;
  color: string;
  ratio: number;
  clampedRatio: number;
  glowLevel: number;
  contributors: ElementNutrientContribution[];
}

export interface GardenBalanceData {
  elements: ElementFountainState[];
  growthScore: number;
  growthStage: BeanGrowthStage;
  hasEstimated: boolean;
}
