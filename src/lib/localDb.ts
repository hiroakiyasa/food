/**
 * localDb.ts — AsyncStorage ベースのローカルデータベース
 *
 * 食事・栄養目標・日次集計・ストリーク・サジェスト・週次バッファを
 * デバイス内に保存する。Supabase は認証と Edge Functions のみ使用。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── ID generation (crypto.randomUUID() の代替) ───────────────────────────

export function generateId(): string {
  const ts = Date.now().toString(36);
  const r1 = Math.random().toString(36).substring(2, 7);
  const r2 = Math.random().toString(36).substring(2, 7);
  return `${ts}-${r1}-${r2}`;
}

// ─── Storage keys ─────────────────────────────────────────────────────────

const KEYS = {
  meals: '@localDb:meals',
  mealItems: '@localDb:mealItems',
  nutritionTargets: '@localDb:nutritionTargets',
  dailySummaries: '@localDb:dailySummaries',
  streaks: '@localDb:streaks',
  suggestions: '@localDb:suggestions',
  weeklyBuffers: '@localDb:weeklyBuffers',
  activeConditions: '@localDb:activeConditions',
  nutritionGoals: '@localDb:nutritionGoals',
} as const;

// ─── Generic helpers ──────────────────────────────────────────────────────

async function readAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function writeAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

// ─── Meal types ──────────────────────────────────────────────────────────

export interface LocalMeal {
  id: string;
  user_id: string;
  meal_type: string;
  eaten_at: string;
  image_url: string | null;
  total_energy_kcal: number | null;
  total_protein_g: number | null;
  total_fat_g: number | null;
  total_carbohydrate_g: number | null;
  total_fiber_g: number | null;
  total_sodium_mg: number | null;
  meal_score: number | null;
  traffic_light_overall: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalMealItem {
  id: string;
  meal_id: string;
  food_item_id: string | null;
  commercial_product_id: string | null;
  ai_detected_name: string;
  portion_grams: number | null;
  confidence: number | null;
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbohydrate_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  created_at: string;
}

// ─── Meals ────────────────────────────────────────────────────────────────

export const mealsDb = {
  async getByDate(userId: string, date: string): Promise<(LocalMeal & { meal_items: LocalMealItem[] })[]> {
    const [allMeals, allItems] = await Promise.all([
      readAll<LocalMeal>(KEYS.meals),
      readAll<LocalMealItem>(KEYS.mealItems),
    ]);
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    const meals = allMeals
      .filter((m) => m.user_id === userId && m.eaten_at >= start && m.eaten_at <= end)
      .sort((a, b) => a.eaten_at.localeCompare(b.eaten_at));
    return meals.map((m) => ({
      ...m,
      meal_items: allItems.filter((i) => i.meal_id === m.id),
    }));
  },

  async getById(userId: string, id: string): Promise<(LocalMeal & { meal_items: LocalMealItem[] }) | null> {
    const [allMeals, allItems] = await Promise.all([
      readAll<LocalMeal>(KEYS.meals),
      readAll<LocalMealItem>(KEYS.mealItems),
    ]);
    const meal = allMeals.find((m) => m.id === id && m.user_id === userId);
    if (!meal) return null;
    return { ...meal, meal_items: allItems.filter((i) => i.meal_id === id) };
  },

  async create(
    userId: string,
    meal: Omit<LocalMeal, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string },
    items: Partial<Omit<LocalMealItem, 'id' | 'meal_id' | 'created_at'> & { ai_detected_name: string }>[],
  ): Promise<LocalMeal> {
    const now = new Date().toISOString();
    const { id: providedId, ...mealWithoutId } = meal as typeof meal & { id?: string };
    const id = providedId ?? generateId();
    const mealData = mealWithoutId;
    const newMeal: LocalMeal = {
      ...mealData,
      id,
      user_id: userId,
      created_at: now,
      updated_at: now,
    };

    const [allMeals, allItems] = await Promise.all([
      readAll<LocalMeal>(KEYS.meals),
      readAll<LocalMealItem>(KEYS.mealItems),
    ]);

    const newItems: LocalMealItem[] = items.map((item) => ({
      id: generateId(),
      meal_id: id,
      created_at: now,
      food_item_id: item.food_item_id ?? null,
      commercial_product_id: item.commercial_product_id ?? null,
      ai_detected_name: item.ai_detected_name ?? '',
      portion_grams: item.portion_grams ?? null,
      confidence: item.confidence ?? null,
      energy_kcal: item.energy_kcal ?? null,
      protein_g: item.protein_g ?? null,
      fat_g: item.fat_g ?? null,
      carbohydrate_g: item.carbohydrate_g ?? null,
      fiber_g: item.fiber_g ?? null,
      sodium_mg: item.sodium_mg ?? null,
    }));

    await Promise.all([
      writeAll(KEYS.meals, [...allMeals, newMeal]),
      writeAll(KEYS.mealItems, [...allItems, ...newItems]),
    ]);

    return newMeal;
  },

  async update(
    userId: string,
    id: string,
    updates: Partial<LocalMeal>,
    items?: Partial<Omit<LocalMealItem, 'id' | 'meal_id' | 'created_at'>>[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const [allMeals, allItems] = await Promise.all([
      readAll<LocalMeal>(KEYS.meals),
      readAll<LocalMealItem>(KEYS.mealItems),
    ]);

    const updatedMeals = allMeals.map((m) =>
      m.id === id && m.user_id === userId ? { ...m, ...updates, updated_at: now } : m
    );

    let updatedItems = allItems;
    if (items !== undefined) {
      const remaining = allItems.filter((i) => i.meal_id !== id);
      const newItems: LocalMealItem[] = items.map((item) => ({
        id: generateId(),
        meal_id: id,
        created_at: now,
        food_item_id: item.food_item_id ?? null,
        commercial_product_id: item.commercial_product_id ?? null,
        ai_detected_name: item.ai_detected_name ?? '',
        portion_grams: item.portion_grams ?? null,
        confidence: item.confidence ?? null,
        energy_kcal: item.energy_kcal ?? null,
        protein_g: item.protein_g ?? null,
        fat_g: item.fat_g ?? null,
        carbohydrate_g: item.carbohydrate_g ?? null,
        fiber_g: item.fiber_g ?? null,
        sodium_mg: item.sodium_mg ?? null,
      }));
      updatedItems = [...remaining, ...newItems];
    }

    await Promise.all([
      writeAll(KEYS.meals, updatedMeals),
      writeAll(KEYS.mealItems, updatedItems),
    ]);
  },

  async delete(userId: string, id: string): Promise<void> {
    const [allMeals, allItems] = await Promise.all([
      readAll<LocalMeal>(KEYS.meals),
      readAll<LocalMealItem>(KEYS.mealItems),
    ]);
    await Promise.all([
      writeAll(KEYS.meals, allMeals.filter((m) => !(m.id === id && m.user_id === userId))),
      writeAll(KEYS.mealItems, allItems.filter((i) => i.meal_id !== id)),
    ]);
  },

  async getByUserAndPeriod(userId: string, from: string, to: string): Promise<LocalMeal[]> {
    const all = await readAll<LocalMeal>(KEYS.meals);
    return all
      .filter((m) => m.user_id === userId && m.eaten_at >= from && m.eaten_at <= to)
      .sort((a, b) => a.eaten_at.localeCompare(b.eaten_at));
  },
};

// ─── Nutrition Targets ────────────────────────────────────────────────────

export interface LocalNutritionTarget {
  id: string;
  user_id: string;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  sodium_mg: number;
  salt_g: number;
  cholesterol_mg: number | null;
  potassium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  calculation_basis: unknown | null;
  effective_from: string;
  created_at: string;
}

export const nutritionTargetsDb = {
  async getLatest(userId: string): Promise<LocalNutritionTarget | null> {
    const all = await readAll<LocalNutritionTarget>(KEYS.nutritionTargets);
    const userTargets = all
      .filter((t) => t.user_id === userId)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    return userTargets[0] ?? null;
  },

  async insert(userId: string, target: Omit<LocalNutritionTarget, 'id' | 'user_id' | 'created_at'>): Promise<void> {
    const all = await readAll<LocalNutritionTarget>(KEYS.nutritionTargets);
    const now = new Date().toISOString();
    const newTarget: LocalNutritionTarget = {
      ...target,
      id: generateId(),
      user_id: userId,
      created_at: now,
    };
    await writeAll(KEYS.nutritionTargets, [...all, newTarget]);
  },
};

// ─── Daily Summaries ──────────────────────────────────────────────────────

export interface LocalDailySummary {
  id: string;
  user_id: string;
  date: string;
  total_energy_kcal: number;
  total_protein_g: number;
  total_fat_g: number;
  total_carbohydrate_g: number;
  total_fiber_g: number;
  total_sodium_mg: number;
  meal_count: number;
  daily_score: number | null;
  buffer_used_kcal: number | null;
  feedback_message: string | null;
  /** 日次平均食品スコア */
  avg_food_score: number | null;
  /** 日次食事品質グレード */
  diet_quality_grade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  /** カフェイン摂取量(mg) */
  caffeine_mg: number | null;
  /** 最終食事時刻 HH:MM */
  last_meal_time: string | null;
  /** 夕食以降の炭水化物(g) */
  evening_carbs_g: number | null;
  /** 日次合計CO₂排出量(kg) */
  total_carbon_kg: number | null;
  /** CO₂グレード A〜E */
  carbon_grade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  created_at: string;
  updated_at: string;
}

export const dailySummariesDb = {
  async get(userId: string, date: string): Promise<LocalDailySummary | null> {
    const all = await readAll<LocalDailySummary>(KEYS.dailySummaries);
    return all.find((s) => s.user_id === userId && s.date === date) ?? null;
  },

  async getRange(userId: string, from: string, to: string): Promise<LocalDailySummary[]> {
    const all = await readAll<LocalDailySummary>(KEYS.dailySummaries);
    return all
      .filter((s) => s.user_id === userId && s.date >= from && s.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async upsert(userId: string, date: string, data: Omit<LocalDailySummary, 'id' | 'user_id' | 'date' | 'created_at' | 'updated_at'>): Promise<void> {
    const all = await readAll<LocalDailySummary>(KEYS.dailySummaries);
    const now = new Date().toISOString();
    const existing = all.findIndex((s) => s.user_id === userId && s.date === date);
    if (existing >= 0) {
      all[existing] = { ...all[existing]!, ...data, updated_at: now };
    } else {
      all.push({ ...data, id: generateId(), user_id: userId, date, created_at: now, updated_at: now });
    }
    await writeAll(KEYS.dailySummaries, all);
  },
};

// ─── Streaks ──────────────────────────────────────────────────────────────

export interface LocalStreak {
  id: string;
  user_id: string;
  streak_type: string;
  current_count: number;
  longest_count: number;
  last_recorded_date: string;
  created_at: string;
  updated_at: string;
}

export const streaksDb = {
  async getAll(userId: string): Promise<LocalStreak[]> {
    const all = await readAll<LocalStreak>(KEYS.streaks);
    return all.filter((s) => s.user_id === userId);
  },

  async upsertDailyLogging(userId: string, date: string): Promise<void> {
    const all = await readAll<LocalStreak>(KEYS.streaks);
    const now = new Date().toISOString();
    const idx = all.findIndex((s) => s.user_id === userId && s.streak_type === 'daily_logging');
    const today = date;
    const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];

    if (idx >= 0) {
      const s = all[idx]!;
      if (s.last_recorded_date === today) return; // already recorded today
      const newCount = s.last_recorded_date === yesterday ? s.current_count + 1 : 1;
      all[idx] = {
        ...s,
        current_count: newCount,
        longest_count: Math.max(s.longest_count, newCount),
        last_recorded_date: today,
        updated_at: now,
      };
    } else {
      all.push({
        id: generateId(),
        user_id: userId,
        streak_type: 'daily_logging',
        current_count: 1,
        longest_count: 1,
        last_recorded_date: today,
        created_at: now,
        updated_at: now,
      });
    }
    await writeAll(KEYS.streaks, all);
  },
};

// ─── Suggestions ──────────────────────────────────────────────────────────

export interface LocalSuggestion {
  id: string;
  user_id: string;
  suggestion_type: 'addition' | 'cooking_hack' | 'alternative' | 'recovery';
  title: string;
  description: string;
  reasoning: string | null;
  related_meal_id: string | null;
  suggested_foods: Record<string, unknown> | null;
  is_dismissed: boolean;
  is_applied: boolean;
  created_at: string;
}

export const suggestionsDb = {
  async getActive(userId: string, limit = 10): Promise<LocalSuggestion[]> {
    const all = await readAll<LocalSuggestion>(KEYS.suggestions);
    return all
      .filter((s) => s.user_id === userId && !s.is_dismissed)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async dismiss(id: string): Promise<void> {
    const all = await readAll<LocalSuggestion>(KEYS.suggestions);
    await writeAll(KEYS.suggestions, all.map((s) => s.id === id ? { ...s, is_dismissed: true } : s));
  },

  async insert(suggestion: Omit<LocalSuggestion, 'id' | 'created_at'>): Promise<void> {
    const all = await readAll<LocalSuggestion>(KEYS.suggestions);
    const now = new Date().toISOString();
    await writeAll(KEYS.suggestions, [...all, { ...suggestion, id: generateId(), created_at: now }]);
  },
};

// ─── Weekly Buffers ───────────────────────────────────────────────────────

export interface LocalWeeklyBuffer {
  id: string;
  user_id: string;
  week_start: string;
  buffer_total_kcal: number;
  buffer_used_kcal: number;
  buffer_total_sodium_mg: number;
  buffer_used_sodium_mg: number;
  created_at: string;
  updated_at: string;
}

// ─── Active Conditions ────────────────────────────────────────────────────

interface LocalActiveConditions {
  user_id: string;
  conditions: string[];
  updated_at: string;
}

export const activeConditionsDb = {
  async get(userId: string): Promise<string[]> {
    const all = await readAll<LocalActiveConditions>(KEYS.activeConditions);
    return all.find((r) => r.user_id === userId)?.conditions ?? [];
  },

  async set(userId: string, conditions: string[]): Promise<void> {
    const all = await readAll<LocalActiveConditions>(KEYS.activeConditions);
    const now = new Date().toISOString();
    const idx = all.findIndex((r) => r.user_id === userId);
    if (idx >= 0) {
      all[idx] = { user_id: userId, conditions, updated_at: now };
    } else {
      all.push({ user_id: userId, conditions, updated_at: now });
    }
    await writeAll(KEYS.activeConditions, all);
  },
};

// ─── Nutrition Goals ──────────────────────────────────────────────────────

export interface LocalNutritionGoal {
  id: string;
  user_id: string;
  nutrient_key: string;
  nutrient_name: string;
  action: 'increase' | 'limit';
  priority: 'High' | 'Medium' | 'Low';
  target_min: number | null;
  target_max: number | null;
  unit: string;
  per: string;
  source_conditions: string[];
  reason: string;
  evidence_base: string | null;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
}

export const nutritionGoalsDb = {
  async getAll(userId: string): Promise<LocalNutritionGoal[]> {
    const all = await readAll<LocalNutritionGoal>(KEYS.nutritionGoals);
    return all.filter((g) => g.user_id === userId);
  },

  async replaceAll(
    userId: string,
    goals: Omit<LocalNutritionGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>[],
  ): Promise<void> {
    const all = await readAll<LocalNutritionGoal>(KEYS.nutritionGoals);
    const now = new Date().toISOString();
    const remaining = all.filter((g) => g.user_id !== userId);
    const newGoals: LocalNutritionGoal[] = goals.map((g) => ({
      ...g,
      id: generateId(),
      user_id: userId,
      created_at: now,
      updated_at: now,
    }));
    await writeAll(KEYS.nutritionGoals, [...remaining, ...newGoals]);
  },
};

// ─── Weekly Buffers ───────────────────────────────────────────────────────

export const weeklyBuffersDb = {
  async get(userId: string, weekStart: string): Promise<LocalWeeklyBuffer | null> {
    const all = await readAll<LocalWeeklyBuffer>(KEYS.weeklyBuffers);
    return all.find((b) => b.user_id === userId && b.week_start === weekStart) ?? null;
  },

  async upsert(userId: string, weekStart: string, data: Partial<Omit<LocalWeeklyBuffer, 'id' | 'user_id' | 'week_start' | 'created_at' | 'updated_at'>>): Promise<void> {
    const all = await readAll<LocalWeeklyBuffer>(KEYS.weeklyBuffers);
    const now = new Date().toISOString();
    const idx = all.findIndex((b) => b.user_id === userId && b.week_start === weekStart);
    const defaults = {
      buffer_total_kcal: 1400,
      buffer_used_kcal: 0,
      buffer_total_sodium_mg: 5600,
      buffer_used_sodium_mg: 0,
    };
    if (idx >= 0) {
      all[idx] = { ...all[idx]!, ...data, updated_at: now };
    } else {
      all.push({ ...defaults, ...data, id: generateId(), user_id: userId, week_start: weekStart, created_at: now, updated_at: now });
    }
    await writeAll(KEYS.weeklyBuffers, all);
  },
};
