/**
 * Sleep × Nutrition Analyzer
 *
 * HealthKitの睡眠データと食事記録を突合し、以下の相関を分析する:
 * - カフェイン摂取時刻 × 睡眠時間
 * - 夕食炭水化物量 × 睡眠スコア
 * - 最終食事時刻 × 睡眠品質
 * - 食物繊維量 × 深睡眠
 */

export interface SleepNutritionDataPoint {
  date: string;
  /** 睡眠時間（時間） */
  sleepHours: number | null;
  /** 睡眠スコア 0-100 (推定) */
  sleepScore: number | null;
  /** 総カロリー */
  totalKcal: number;
  /** 夕食以降の炭水化物(g) */
  eveningCarbsG: number;
  /** タンパク質(g) */
  proteinG: number;
  /** 食物繊維(g) */
  fiberG: number;
  /** ナトリウム(mg) */
  sodiumMg: number;
  /** 食事回数 */
  mealCount: number;
}

export interface SleepCorrelation {
  label: string;
  description: string;
  /** 相関係数 -1〜1 */
  coefficient: number;
  /** サンプル数 */
  sampleCount: number;
  /** 影響の方向 'positive'=睡眠改善, 'negative'=睡眠悪化, 'neutral'=影響なし */
  direction: 'positive' | 'negative' | 'neutral';
}

export interface SleepNutritionInsight {
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

/**
 * ピアソン相関係数を計算する
 */
function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i]! - meanY), 0);
  const denomX = Math.sqrt(xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0));
  const denomY = Math.sqrt(ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0));

  if (denomX === 0 || denomY === 0) return 0;
  return num / (denomX * denomY);
}

/**
 * 睡眠スコアを睡眠時間から推定する（実データがない場合のフォールバック）
 * 7〜9時間が最適
 */
export function estimateSleepScore(sleepHours: number): number {
  if (sleepHours >= 7 && sleepHours <= 9) return Math.round(80 + (sleepHours - 7) * 5);
  if (sleepHours >= 6 && sleepHours < 7) return Math.round(60 + (sleepHours - 6) * 20);
  if (sleepHours > 9 && sleepHours <= 10) return Math.round(85 - (sleepHours - 9) * 10);
  if (sleepHours < 6) return Math.round(Math.max(20, sleepHours * 10));
  return Math.round(Math.max(40, 85 - (sleepHours - 10) * 15));
}

/**
 * データポイント配列から相関を計算する
 */
export function analyzeSleepNutritionCorrelations(
  data: SleepNutritionDataPoint[],
): SleepCorrelation[] {
  const valid = data.filter((d) => d.sleepHours != null);
  if (valid.length < 3) return [];

  const sleepScores = valid.map((d) =>
    d.sleepScore ?? estimateSleepScore(d.sleepHours!)
  );

  const correlations: SleepCorrelation[] = [];

  // 夕食炭水化物 × 睡眠
  const eveningCarbsCoeff = pearsonCorrelation(
    valid.map((d) => d.eveningCarbsG),
    sleepScores,
  );
  correlations.push({
    label: '夕食炭水化物',
    description: '夕食以降の炭水化物摂取量と睡眠の関係',
    coefficient: eveningCarbsCoeff,
    sampleCount: valid.length,
    direction: eveningCarbsCoeff > 0.2 ? 'positive' : eveningCarbsCoeff < -0.2 ? 'negative' : 'neutral',
  });

  // 食物繊維 × 睡眠
  const fiberCoeff = pearsonCorrelation(
    valid.map((d) => d.fiberG),
    sleepScores,
  );
  correlations.push({
    label: '食物繊維',
    description: '1日の食物繊維摂取量と睡眠の関係',
    coefficient: fiberCoeff,
    sampleCount: valid.length,
    direction: fiberCoeff > 0.2 ? 'positive' : fiberCoeff < -0.2 ? 'negative' : 'neutral',
  });

  // タンパク質 × 睡眠
  const proteinCoeff = pearsonCorrelation(
    valid.map((d) => d.proteinG),
    sleepScores,
  );
  correlations.push({
    label: 'タンパク質',
    description: 'タンパク質摂取量と睡眠の関係',
    coefficient: proteinCoeff,
    sampleCount: valid.length,
    direction: proteinCoeff > 0.2 ? 'positive' : proteinCoeff < -0.2 ? 'negative' : 'neutral',
  });

  // ナトリウム × 睡眠
  const sodiumCoeff = pearsonCorrelation(
    valid.map((d) => d.sodiumMg),
    sleepScores,
  );
  correlations.push({
    label: '塩分',
    description: '塩分摂取量と睡眠の関係',
    coefficient: sodiumCoeff,
    sampleCount: valid.length,
    direction: sodiumCoeff < -0.2 ? 'negative' : sodiumCoeff > 0.2 ? 'positive' : 'neutral',
  });

  return correlations;
}

/**
 * 相関データからインサイトメッセージを生成する
 */
export function generateSleepInsights(
  data: SleepNutritionDataPoint[],
  correlations: SleepCorrelation[],
): SleepNutritionInsight[] {
  const insights: SleepNutritionInsight[] = [];

  if (data.length < 3) {
    insights.push({
      type: 'info',
      title: 'データが不足しています',
      description: '睡眠×栄養の相関分析には3日以上の記録が必要です。',
      recommendation: '毎日食事を記録し、HealthKitと連携してください。',
    });
    return insights;
  }

  const valid = data.filter((d) => d.sleepHours != null);
  if (valid.length === 0) {
    insights.push({
      type: 'info',
      title: '睡眠データがありません',
      description: 'HealthKitと連携すると睡眠データを自動取得できます。',
      recommendation: '設定 > HealthKit連携 からデータを同期してください。',
    });
    return insights;
  }

  // 平均睡眠時間
  const avgSleep = valid.reduce((sum, d) => sum + d.sleepHours!, 0) / valid.length;
  if (avgSleep < 6) {
    insights.push({
      type: 'warning',
      title: '睡眠時間が短い傾向があります',
      description: `平均睡眠時間 ${avgSleep.toFixed(1)}時間。推奨は7〜9時間です。`,
      recommendation: 'マグネシウム（ナッツ、大豆）やGABA（玄米、発芽米）を含む食事が睡眠改善に役立ちます。',
    });
  } else if (avgSleep >= 7) {
    insights.push({
      type: 'positive',
      title: '良好な睡眠習慣です',
      description: `平均睡眠時間 ${avgSleep.toFixed(1)}時間。適切な睡眠が取れています。`,
      recommendation: '現在の食事パターンを継続しましょう。',
    });
  }

  // 夕食炭水化物の相関
  const carbCorr = correlations.find((c) => c.label === '夕食炭水化物');
  if (carbCorr && carbCorr.direction === 'negative' && Math.abs(carbCorr.coefficient) > 0.3) {
    insights.push({
      type: 'warning',
      title: '夕食の炭水化物が睡眠に影響している可能性があります',
      description: '夕食の炭水化物量が多い日は睡眠の質が低下する傾向があります。',
      recommendation: '夕食の炭水化物を少なめにし、タンパク質と野菜を中心にするとよいでしょう。',
    });
  } else if (carbCorr && carbCorr.direction === 'positive' && Math.abs(carbCorr.coefficient) > 0.3) {
    insights.push({
      type: 'positive',
      title: '夕食の炭水化物が睡眠改善に寄与しています',
      description: '適度な炭水化物がトリプトファンの脳への移行を助け、睡眠を促進しています。',
      recommendation: '玄米、さつまいもなど低GI食品を夕食に取り入れましょう。',
    });
  }

  // 食物繊維の相関
  const fiberCorr = correlations.find((c) => c.label === '食物繊維');
  if (fiberCorr && fiberCorr.direction === 'positive' && Math.abs(fiberCorr.coefficient) > 0.25) {
    insights.push({
      type: 'positive',
      title: '食物繊維の摂取が睡眠改善につながっています',
      description: '食物繊維が多い日ほど睡眠の質が良い傾向があります。',
      recommendation: '野菜、豆類、海藻をバランスよく取り入れましょう。',
    });
  }

  return insights;
}
