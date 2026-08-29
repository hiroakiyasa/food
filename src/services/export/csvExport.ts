import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { mealsDb } from '@/src/lib/localDb';
import { MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import { getToday } from '@/src/utils/formatters';

const CSV_HEADER = '日付,食事タイプ,食品名,分量(g),エネルギー(kcal),P(g),F(g),C(g),食物繊維(g),Na(mg)';
const BOM = '\uFEFF';

interface ExportOptions {
  userId: string;
  months?: number; // undefined = all time
}

export async function exportMealsToCSV({ userId, months }: ExportOptions): Promise<void> {
  const now = new Date();
  const from = months
    ? new Date(now.getFullYear(), now.getMonth() - months, now.getDate()).toISOString()
    : '2000-01-01T00:00:00';
  const to = now.toISOString();

  const rawMeals = await mealsDb.getByUserAndPeriod(userId, from, to);
  if (rawMeals.length === 0) throw new Error('エクスポートするデータがありません');

  // Fetch items for each meal
  const allMealsWithItems = await Promise.all(
    rawMeals.map((m) => mealsDb.getById(userId, m.id))
  );
  const meals = allMealsWithItems.filter(Boolean);

  const rows: string[] = [CSV_HEADER];

  for (const meal of meals) {
    if (!meal) continue;
    const date = meal.eaten_at ? new Date(meal.eaten_at).toLocaleDateString('ja-JP') : '';
    const mealType = MEAL_TYPE_LABELS[meal.meal_type as MealType] ?? meal.meal_type;
    const items = meal.meal_items ?? [];

    if (items.length === 0) {
      rows.push(formatRow(date, mealType, '-', null, meal.total_energy_kcal, meal.total_protein_g, meal.total_fat_g, meal.total_carbohydrate_g, meal.total_fiber_g, meal.total_sodium_mg));
    } else {
      for (const item of items) {
        rows.push(formatRow(
          date,
          mealType,
          item.ai_detected_name ?? '-',
          item.portion_grams,
          item.energy_kcal,
          item.protein_g,
          item.fat_g,
          item.carbohydrate_g,
          item.fiber_g,
          item.sodium_mg,
        ));
      }
    }
  }

  const csvContent = BOM + rows.join('\n');
  const fileName = `meals_export_${getToday()}.csv`;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csvContent);

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('共有機能が利用できません');

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}

function escapeCSV(value: string): string {
  // Neutralize spreadsheet formula injection: a leading =, +, -, @, tab or CR
  // would be executed as a formula by Excel/Numbers/Sheets.
  const neutralized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (neutralized.includes(',') || neutralized.includes('"') || neutralized.includes('\n')) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

function formatRow(
  date: string,
  mealType: string,
  foodName: string,
  portion: number | null,
  energy: number | null,
  protein: number | null,
  fat: number | null,
  carbs: number | null,
  fiber: number | null,
  sodium: number | null,
): string {
  return [
    escapeCSV(date),
    escapeCSV(mealType),
    escapeCSV(foodName),
    portion?.toFixed(0) ?? '',
    energy?.toFixed(0) ?? '',
    protein?.toFixed(1) ?? '',
    fat?.toFixed(1) ?? '',
    carbs?.toFixed(1) ?? '',
    fiber?.toFixed(1) ?? '',
    sodium?.toFixed(0) ?? '',
  ].join(',');
}
