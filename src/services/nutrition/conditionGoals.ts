/**
 * conditionGoals.ts — 選択された栄養管理条件から栄養目標を計算する
 *
 * 複数条件に同じ nutrientKey が存在する場合のマージ戦略:
 *   - target_min: max(全条件のtargetMin) — 最も厳しい下限
 *   - target_max: min(全条件のtargetMax) — 最も厳しい上限
 *   - priority: High > Medium > Low の最高値
 *   - action: increase優先 (同キーでlimitとincreaseが共存する場合は別エントリ)
 *   - source_conditions: 全条件名の配列
 *   - reason: 最高優先度の条件のreason
 */
import guidelinesP1 from '@/nutrition_guidelines_part1.json';
import guidelinesP2 from '@/nutrition_guidelines_part2.json';
import guidelinesP3 from '@/nutrition_guidelines_part3.json';
import type { NutritionGuideline } from '@/src/types/nutritionGuidelines';
import type { LocalNutritionGoal } from '@/src/lib/localDb';

const GLP1_GUIDELINE: NutritionGuideline = {
  categoryId: '4_ChronicDisease',
  subCategoryName: 'GLP-1薬服用中',
  description: 'GLP-1受容体作動薬（マンジャロ・オゼンピック等）服用中の栄養管理。食欲抑制による筋肉量減少を防ぎ、微量栄養素不足を予防する。',
  focusNutrients: [
    {
      nutrientKey: 'protein_g',
      nutrientName: 'タンパク質',
      action: 'increase',
      priority: 'High',
      quantitativeCriteria: { targetMin: 75, targetMax: null, unit: 'g', per: 'day' },
      reason: '食欲抑制による摂取量減少時も筋肉量を維持するため、体重1kg当たり1.2g以上を目標とする',
      evidenceBase: 'GLP-1薬服用者における除脂肪体重保持プロトコル（Wilding et al. 2021参照）',
      evidenceUrl: null,
    },
    {
      nutrientKey: 'vitaminB12',
      nutrientName: 'ビタミンB12',
      action: 'increase',
      priority: 'Medium',
      quantitativeCriteria: { targetMin: 2.4, targetMax: null, unit: 'μg', per: 'day' },
      reason: '一部のGLP-1薬・Metformin併用でビタミンB12吸収低下が報告されている',
      evidenceBase: 'Metformin長期服用とB12欠乏リスク（de Jager et al. 2010）',
      evidenceUrl: null,
    },
    {
      nutrientKey: 'calcium_mg',
      nutrientName: 'カルシウム',
      action: 'increase',
      priority: 'Medium',
      quantitativeCriteria: { targetMin: 800, targetMax: null, unit: 'mg', per: 'day' },
      reason: 'カロリー制限下での骨密度維持のため十分なカルシウムを確保する',
      evidenceBase: '低カロリー食と骨密度の関係（肥満症診療ガイドライン2022）',
      evidenceUrl: null,
    },
    {
      nutrientKey: 'iron_mg',
      nutrientName: '鉄',
      action: 'increase',
      priority: 'Low',
      quantitativeCriteria: { targetMin: 10, targetMax: null, unit: 'mg', per: 'day' },
      reason: '食事量減少による鉄分不足を予防する',
      evidenceBase: '減量介入における微量栄養素欠乏の系統的レビュー',
      evidenceUrl: null,
    },
  ],
};

const ALL_GUIDELINES: NutritionGuideline[] = [
  ...(guidelinesP1 as NutritionGuideline[]),
  ...(guidelinesP2 as NutritionGuideline[]),
  ...(guidelinesP3 as NutritionGuideline[]),
  GLP1_GUIDELINE,
];

type GoalDraft = Omit<LocalNutritionGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const PRIORITY_ORDER: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function higherPriority(a: 'High' | 'Medium' | 'Low', b: 'High' | 'Medium' | 'Low'): 'High' | 'Medium' | 'Low' {
  return PRIORITY_ORDER[a]! >= PRIORITY_ORDER[b]! ? a : b;
}

/**
 * 選択されたサブカテゴリ名の配列から LocalNutritionGoal[] を計算する。
 */
export function computeNutritionGoals(selectedConditions: string[]): GoalDraft[] {
  if (selectedConditions.length === 0) return [];

  const matched = ALL_GUIDELINES.filter((g) =>
    selectedConditions.includes(g.subCategoryName)
  );

  // nutrientKey + action をキーにしてマージ
  // key: `${nutrientKey}::${action}`
  const draftMap = new Map<string, GoalDraft>();

  for (const guideline of matched) {
    for (const fn of guideline.focusNutrients) {
      const key = `${fn.nutrientKey}::${fn.action}`;
      const existing = draftMap.get(key);

      if (!existing) {
        draftMap.set(key, {
          nutrient_key: fn.nutrientKey,
          nutrient_name: fn.nutrientName,
          action: fn.action,
          priority: fn.priority,
          target_min: fn.quantitativeCriteria.targetMin,
          target_max: fn.quantitativeCriteria.targetMax,
          unit: fn.quantitativeCriteria.unit,
          per: fn.quantitativeCriteria.per,
          source_conditions: [guideline.subCategoryName],
          reason: fn.reason,
          evidence_base: fn.evidenceBase,
          evidence_url: fn.evidenceUrl,
        });
      } else {
        // Merge: strictest limits win
        const newPriority = higherPriority(existing.priority, fn.priority);
        const newMin =
          existing.target_min !== null && fn.quantitativeCriteria.targetMin !== null
            ? Math.max(existing.target_min, fn.quantitativeCriteria.targetMin)
            : existing.target_min ?? fn.quantitativeCriteria.targetMin;
        const newMax =
          existing.target_max !== null && fn.quantitativeCriteria.targetMax !== null
            ? Math.min(existing.target_max, fn.quantitativeCriteria.targetMax)
            : existing.target_max ?? fn.quantitativeCriteria.targetMax;

        // Use reason from the highest priority condition
        const reason =
          PRIORITY_ORDER[fn.priority]! > PRIORITY_ORDER[existing.priority]!
            ? fn.reason
            : existing.reason;
        const evidenceBase =
          PRIORITY_ORDER[fn.priority]! > PRIORITY_ORDER[existing.priority]!
            ? fn.evidenceBase
            : existing.evidence_base;
        const evidenceUrl =
          PRIORITY_ORDER[fn.priority]! > PRIORITY_ORDER[existing.priority]!
            ? fn.evidenceUrl
            : existing.evidence_url;

        draftMap.set(key, {
          ...existing,
          priority: newPriority,
          target_min: newMin,
          target_max: newMax,
          source_conditions: [...existing.source_conditions, guideline.subCategoryName],
          reason,
          evidence_base: evidenceBase,
          evidence_url: evidenceUrl,
        });
      }
    }
  }

  // Sort by priority descending, then nutrient_key ascending for stable ordering
  return Array.from(draftMap.values()).sort((a, b) => {
    const pd = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
    if (pd !== 0) return pd;
    return a.nutrient_key.localeCompare(b.nutrient_key);
  });
}

/**
 * 全ガイドラインを返す (条件選択UI用)
 */
export { ALL_GUIDELINES };
