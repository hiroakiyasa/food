import { palette } from '@/src/lib/theme';
import type {
  BeanGrowthStage,
  ElementFountainState,
  GardenBalanceData,
  NutrientBalanceItem,
} from '@/src/types/nutrientBalance';

interface ElementDefinition {
  key: ElementFountainState['key'];
  labelJa: string;
  icon: string;
  color: string;
  nutrientKeys: string[];
}

export const ELEMENT_DEFINITIONS: ElementDefinition[] = [
  {
    key: 'earth',
    labelJa: '土',
    icon: '⛰',
    color: '#8B5A2B',
    nutrientKeys: ['protein', 'fiber', 'calcium'],
  },
  {
    key: 'water',
    labelJa: '水',
    icon: '💧',
    color: '#0EA5E9',
    nutrientKeys: ['vitaminA', 'vitaminE', 'vitaminB1', 'vitaminB2', 'vitaminC'],
  },
  {
    key: 'sun',
    labelJa: '太陽',
    icon: '☀',
    color: '#F59E0B',
    nutrientKeys: ['carbohydrate', 'energy'],
  },
  {
    key: 'wind',
    labelJa: '風',
    icon: '🌀',
    color: '#06B6D4',
    nutrientKeys: ['iron', 'salt'],
  },
  {
    key: 'fire',
    labelJa: '火',
    icon: '🔥',
    color: palette.fat,
    nutrientKeys: ['fat', 'saturatedFat', 'cholesterol'],
  },
];

export const GARDEN_NUTRIENT_KEYS = ELEMENT_DEFINITIONS.flatMap((def) => def.nutrientKeys);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getBeanGrowthStage(growthScore: number): BeanGrowthStage {
  if (growthScore <= 0.2) return 'seed';
  if (growthScore <= 0.4) return 'sprout';
  if (growthScore <= 0.6) return 'leafy';
  if (growthScore <= 0.8) return 'bloom';
  return 'shine';
}

export function buildGardenBalance(nutrients: NutrientBalanceItem[]): GardenBalanceData {
  const nutrientMap = new Map(nutrients.map((item) => [item.key, item]));

  const elements: ElementFountainState[] = ELEMENT_DEFINITIONS.map((def) => {
    const contributors = def.nutrientKeys
      .map((key) => nutrientMap.get(key))
      .filter((item): item is NutrientBalanceItem => !!item)
      .map((item) => ({
        key: item.key,
        nameJa: item.nameJa,
        unit: item.unit,
        ratio: item.ratio,
      }));

    const rawRatio = contributors.length > 0
      ? contributors.reduce((sum, item) => sum + clamp(item.ratio, 0, 1.2), 0) / contributors.length
      : 0;
    const clampedRatio = clamp(rawRatio, 0, 1);

    return {
      key: def.key,
      labelJa: def.labelJa,
      icon: def.icon,
      color: def.color,
      ratio: rawRatio,
      clampedRatio,
      glowLevel: clamp((clampedRatio - 0.2) / 0.8, 0, 1),
      contributors,
    };
  });

  const growthScore = elements.length > 0
    ? elements.reduce((sum, element) => sum + element.clampedRatio, 0) / elements.length
    : 0;

  return {
    elements,
    growthScore,
    growthStage: getBeanGrowthStage(growthScore),
    hasEstimated: nutrients.some((item) => item.isEstimated),
  };
}
