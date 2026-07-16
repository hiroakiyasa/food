export type DailyIntake = { date: string; energyKcal: number };
export type WeightPoint = { date: string; weightKg: number };

export type AdaptiveEnergyResult = {
  estimatedExpenditureKcal: number;
  recommendedEnergyKcal: number;
  recommendedProteinG: number;
  weightTrendKgPerWeek: number | null;
  loggingCoverage: number;
  confidence: number;
  explanation: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function calculateAdaptiveEnergy(input: {
  dailyIntakes: DailyIntake[];
  weights: WeightPoint[];
  currentTargetKcal: number;
  currentProteinG: number;
  goal?: string | null;
}): AdaptiveEnergyResult {
  const uniqueDays = new Set(input.dailyIntakes.filter((day) => day.energyKcal > 0).map((day) => day.date));
  const observationDays = 21;
  const loggingCoverage = clamp(uniqueDays.size / observationDays, 0, 1);
  const validIntakes = input.dailyIntakes.filter((day) => day.energyKcal >= 500);
  const averageIntake = validIntakes.length
    ? validIntakes.reduce((sum, day) => sum + day.energyKcal, 0) / validIntakes.length
    : input.currentTargetKcal;
  const sortedWeights = [...input.weights]
    .filter((point) => Number.isFinite(point.weightKg))
    .sort((a, b) => a.date.localeCompare(b.date));
  let weightTrendKgPerWeek: number | null = null;
  if (sortedWeights.length >= 2) {
    const first = sortedWeights[0];
    const last = sortedWeights[sortedWeights.length - 1];
    const elapsedDays = Math.max(1, (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000);
    weightTrendKgPerWeek = ((last.weightKg - first.weightKg) / elapsedDays) * 7;
  }

  // Body-energy change closes the loop: expenditure = intake - stored-energy change.
  const dailyStoredEnergy = weightTrendKgPerWeek == null ? 0 : (weightTrendKgPerWeek / 7) * 7700;
  const rawExpenditure = averageIntake - dailyStoredEnergy;
  const evidenceWeight = clamp(loggingCoverage * (sortedWeights.length >= 3 ? 1 : 0.55), 0, 1);
  const estimatedExpenditureKcal = Math.round(clamp(
    rawExpenditure * evidenceWeight + input.currentTargetKcal * (1 - evidenceWeight),
    1200,
    5000,
  ));
  const goalDelta = input.goal === 'lose_weight' || input.goal === 'weight_loss'
    ? -300
    : input.goal === 'gain_weight' || input.goal === 'muscle_gain'
      ? 220
      : 0;
  const desired = estimatedExpenditureKcal + goalDelta;
  // Avoid large weekly jumps that make the plan hard to live with.
  const recommendedEnergyKcal = Math.round(clamp(
    desired,
    input.currentTargetKcal - 180,
    input.currentTargetKcal + 180,
  ));
  const recommendedProteinG = Math.round(Math.max(input.currentProteinG, recommendedEnergyKcal * 0.2 / 4));
  const confidence = clamp(0.2 + loggingCoverage * 0.45 + Math.min(sortedWeights.length, 5) * 0.07, 0.2, 0.95);
  const explanation = loggingCoverage < 0.5
    ? 'まだ記録が少ないため、現在の目標を大きく変えずに提案しています。完璧な記録でなくても、続けるほど調整が安定します。'
    : weightTrendKgPerWeek == null
      ? '食事記録をもとに小さく調整しました。体重データが増えると、実際の消費量に合わせて更新できます。'
      : `直近の摂取量と体重トレンド（週${weightTrendKgPerWeek >= 0 ? '+' : ''}${weightTrendKgPerWeek.toFixed(2)}kg）から、無理のない幅で調整しました。`;
  return {
    estimatedExpenditureKcal,
    recommendedEnergyKcal,
    recommendedProteinG,
    weightTrendKgPerWeek,
    loggingCoverage,
    confidence,
    explanation,
  };
}
