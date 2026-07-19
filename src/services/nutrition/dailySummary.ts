import { dailySummariesDb, streaksDb, type LocalMeal } from '@/src/lib/localDb';
import { getToday } from '@/src/utils/formatters';

interface DailySummaryInput {
  userId: string;
  date: string;
  meals: LocalMeal[];
  targetKcal?: number;
}

function generateFeedback(
  totalKcal: number,
  targetKcal: number,
  mealCount: number,
  proteinG: number,
  fiberG: number,
): string {
  const messages: string[] = [];

  const ratio = totalKcal / targetKcal;
  if (ratio >= 0.8 && ratio <= 1.1) {
    messages.push('カロリー摂取がちょうど良い範囲です。');
  } else if (ratio < 0.8) {
    messages.push('もう少し食べても大丈夫です。');
  }

  if (proteinG >= 50) {
    messages.push('タンパク質をしっかり摂れています。');
  }

  if (fiberG >= 15) {
    messages.push('食物繊維が十分です。');
  } else if (mealCount >= 2 && fiberG < 10) {
    messages.push('野菜や果物を追加すると食物繊維が補えます。');
  }

  if (mealCount >= 3) {
    messages.push(`${mealCount}食しっかり記録できました。`);
  }

  return messages.length > 0 ? messages.join(' ') : '食事記録を続けましょう。';
}

export async function upsertDailySummary({ userId, date, meals, targetKcal = 2000 }: DailySummaryInput) {
  const totalKcal = meals.reduce((sum, m) => sum + (m.total_energy_kcal ?? 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.total_protein_g ?? 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.total_fat_g ?? 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.total_carbohydrate_g ?? 0), 0);
  const totalFiber = meals.reduce((sum, m) => sum + (m.total_fiber_g ?? 0), 0);
  const totalSodium = meals.reduce((sum, m) => sum + (m.total_sodium_mg ?? 0), 0);

  const calorieScore = Math.max(0, 100 - Math.abs(1 - totalKcal / targetKcal) * 100);
  const fiberScore = Math.min(100, (totalFiber / 21) * 100);
  const dailyScore = Math.round(calorieScore * 0.5 + fiberScore * 0.3 + Math.min(100, meals.length * 25) * 0.2);

  const bufferUsedKcal = Math.max(0, totalKcal - targetKcal);
  const feedbackMessage = generateFeedback(totalKcal, targetKcal, meals.length, totalProtein, totalFiber);

  await dailySummariesDb.upsert(userId, date, {
    total_energy_kcal: totalKcal,
    total_protein_g: totalProtein,
    total_fat_g: totalFat,
    total_carbohydrate_g: totalCarbs,
    total_fiber_g: totalFiber,
    total_sodium_mg: totalSodium,
    meal_count: meals.length,
    daily_score: dailyScore,
    buffer_used_kcal: bufferUsedKcal,
    feedback_message: feedbackMessage,
    avg_food_score: null,
    diet_quality_grade: null,
    caffeine_mg: null,
    last_meal_time: null,
    evening_carbs_g: null,
    total_carbon_kg: null,
    carbon_grade: null,
  });

  // Update streak when meals are recorded. Only for today — recomputing a
  // past day (edit/delete of an old meal) must not rewind the streak.
  if (meals.length > 0 && date === getToday()) {
    await streaksDb.upsertDailyLogging(userId, date);
  }
}
