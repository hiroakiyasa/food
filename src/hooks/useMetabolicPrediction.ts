import { useMemo } from 'react';
import { useLatestCheckup } from '@/src/hooks/useHealthData';
import type { Database } from '@/src/types/database';

type MealItem = Database['public']['Tables']['meal_items']['Row'];

export type SpikeRisk = 'low' | 'moderate' | 'high';

export interface MetabolicPrediction {
  spikeRisk: SpikeRisk;
  reasons: string[];
  tips: string[];
}

// High-GI keywords (simplified rule-based check)
const HIGH_GI_KEYWORDS = [
  '白米', 'ごはん', 'ご飯', 'パン', 'うどん', 'そうめん',
  'ラーメン', 'カレー', 'ケーキ', 'クッキー', 'ジュース',
  'チョコ', 'アイス', '菓子', '砂糖', 'rice', 'bread', 'noodle',
];

function isHighGI(name: string): boolean {
  const lower = name.toLowerCase();
  return HIGH_GI_KEYWORDS.some((kw) => lower.includes(kw));
}

export function useMetabolicPrediction(mealItems: MealItem[]): MetabolicPrediction | null {
  const { data: checkup } = useLatestCheckup();

  return useMemo(() => {
    if (mealItems.length === 0) return null;

    const reasons: string[] = [];
    const tips: string[] = [];
    let riskScore = 0;

    // Check HbA1c
    const hba1c = checkup?.hba1c;
    if (hba1c != null && hba1c >= 6.0) {
      riskScore += 2;
      reasons.push(`HbA1c ${hba1c}% (基準値上限付近)`);
    } else if (hba1c != null && hba1c >= 5.6) {
      riskScore += 1;
      reasons.push(`HbA1c ${hba1c}% (要注意範囲)`);
    }

    // Check fasting glucose
    const glucose = checkup?.fasting_glucose;
    if (glucose != null && glucose >= 110) {
      riskScore += 2;
      reasons.push(`空腹時血糖 ${glucose} mg/dL (高め)`);
    } else if (glucose != null && glucose >= 100) {
      riskScore += 1;
    }

    // Check meal items for high-GI foods
    const highGIItems = mealItems.filter((item) => isHighGI(item.ai_detected_name));
    if (highGIItems.length > 0) {
      riskScore += highGIItems.length;
      reasons.push(`高GI食品: ${highGIItems.map((i) => i.ai_detected_name).join(', ')}`);
      tips.push('野菜やタンパク質を先に食べると血糖値の上昇を穏やかにできます');
    }

    // Check total carbs
    const totalCarbs = mealItems.reduce((sum, i) => sum + (i.carbohydrate_g ?? 0), 0);
    if (totalCarbs > 80) {
      riskScore += 1;
      reasons.push(`炭水化物が多め (${totalCarbs.toFixed(0)}g)`);
      tips.push('食後15分の散歩が血糖値の急上昇を抑える効果があります');
    }

    // Check fiber (protective factor)
    const totalFiber = mealItems.reduce((sum, i) => sum + (i.fiber_g ?? 0), 0);
    if (totalFiber >= 5) {
      riskScore = Math.max(0, riskScore - 1);
      if (reasons.length > 0) {
        tips.push('食物繊維が含まれているため、血糖値の上昇は緩やかになりそうです');
      }
    }

    if (reasons.length === 0) return null;

    let spikeRisk: SpikeRisk = 'low';
    if (riskScore >= 4) {
      spikeRisk = 'high';
    } else if (riskScore >= 2) {
      spikeRisk = 'moderate';
    }

    if (tips.length === 0) {
      tips.push('バランスの良い食事を心がけましょう');
    }

    return { spikeRisk, reasons, tips };
  }, [mealItems, checkup]);
}
