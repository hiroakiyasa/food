import conditionsJson from '@/data/nutrition_conditions.json';

export interface FocusNutrient {
  nutrientName: string;
  action: 'increase' | 'limit';
  priority: 'High' | 'Medium' | 'Low';
  reason: string;
  evidenceBase: string;
  dbKey?: string;
  isTrackable?: boolean;
}

export interface NutritionCondition {
  categoryId: string;
  subCategoryName: string;
  description: string;
  focusNutrients: FocusNutrient[];
}

export const NUTRITION_CONDITIONS = conditionsJson as NutritionCondition[];

/** カテゴリID → 表示名 (数字プレフィックスと英数略称を除去) */
export function getCategoryLabel(categoryId: string): string {
  return categoryId.replace(/^\d+_/, '').replace(/_/g, ' ');
}

/** カテゴリIDでグループ化したマップを返す */
export function groupByCategory(
  conditions: NutritionCondition[]
): Map<string, NutritionCondition[]> {
  const map = new Map<string, NutritionCondition[]>();
  for (const c of conditions) {
    if (!map.has(c.categoryId)) map.set(c.categoryId, []);
    map.get(c.categoryId)!.push(c);
  }
  return map;
}
