import AsyncStorage from '@react-native-async-storage/async-storage';

import { mealsDb, isUuid, type LocalMeal, type LocalMealItem } from '@/src/lib/localDb';
import { supabase } from '@/src/lib/supabase';

type SyncOperation = {
  mealId: string;
  type: 'upsert' | 'delete';
  queuedAt: string;
  attempts: number;
};

export type MealSyncStatus = {
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const queueKey = (userId: string) => `@mealSync:queue:${userId}`;
const statusKey = (userId: string) => `@mealSync:status:${userId}`;
const MAX_ATTEMPTS = 8;

async function readQueue(userId: string): Promise<SyncOperation[]> {
  const value = await AsyncStorage.getItem(queueKey(userId));
  if (!value) return [];
  try {
    return JSON.parse(value) as SyncOperation[];
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, operations: SyncOperation[]): Promise<void> {
  await AsyncStorage.setItem(queueKey(userId), JSON.stringify(operations));
}

async function writeStatus(userId: string, status: MealSyncStatus): Promise<void> {
  await AsyncStorage.setItem(statusKey(userId), JSON.stringify(status));
}

export async function getMealSyncStatus(userId: string): Promise<MealSyncStatus> {
  const value = await AsyncStorage.getItem(statusKey(userId));
  if (!value) return { pending: 0, lastSyncedAt: null, lastError: null };
  try {
    return JSON.parse(value) as MealSyncStatus;
  } catch {
    return { pending: 0, lastSyncedAt: null, lastError: null };
  }
}

export async function enqueueMealSync(
  userId: string,
  mealId: string,
  type: SyncOperation['type'],
): Promise<void> {
  const queue = await readQueue(userId);
  const next = queue.filter((operation) => operation.mealId !== mealId);
  next.push({ mealId, type, queuedAt: new Date().toISOString(), attempts: 0 });
  await writeQueue(userId, next);
  const previous = await getMealSyncStatus(userId);
  await writeStatus(userId, { ...previous, pending: next.length });
}

function mealPayload(meal: LocalMeal) {
  return {
    id: meal.id,
    user_id: meal.user_id,
    meal_type: meal.meal_type,
    eaten_at: meal.eaten_at,
    image_url: meal.image_url,
    total_energy_kcal: meal.total_energy_kcal,
    total_protein_g: meal.total_protein_g,
    total_fat_g: meal.total_fat_g,
    total_carbohydrate_g: meal.total_carbohydrate_g,
    total_fiber_g: meal.total_fiber_g,
    total_sodium_mg: meal.total_sodium_mg,
    meal_score: meal.meal_score,
    traffic_light_overall: meal.traffic_light_overall,
    notes: meal.notes,
    client_updated_at: meal.updated_at,
    updated_at: meal.updated_at,
    deleted_at: null,
  };
}

function itemPayload(item: LocalMealItem) {
  return {
    id: isUuid(item.id) ? item.id : undefined,
    meal_id: item.meal_id,
    food_item_id: item.food_item_id && isUuid(item.food_item_id) ? item.food_item_id : null,
    commercial_product_id: item.commercial_product_id && isUuid(item.commercial_product_id)
      ? item.commercial_product_id
      : null,
    ai_detected_name: item.ai_detected_name,
    portion_grams: item.portion_grams,
    confidence: item.confidence,
    energy_kcal: item.energy_kcal,
    protein_g: item.protein_g,
    fat_g: item.fat_g,
    carbohydrate_g: item.carbohydrate_g,
    fiber_g: item.fiber_g,
    sodium_mg: item.sodium_mg,
    estimate_basis: item.estimate_basis ?? null,
    database_source: item.database_source ?? null,
    portion_min_grams: item.portion_min_grams ?? null,
    portion_max_grams: item.portion_max_grams ?? null,
    energy_min_kcal: item.energy_min_kcal ?? null,
    energy_max_kcal: item.energy_max_kcal ?? null,
    salt_equivalent_g: item.salt_equivalent_g ?? null,
    hidden_ingredient_flags: item.hidden_ingredient_flags ?? [],
  };
}

async function pushOperation(userId: string, operation: SyncOperation): Promise<void> {
  if (operation.type === 'delete') {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('meals')
      .update({ deleted_at: now, client_updated_at: now, updated_at: now })
      .eq('id', operation.mealId)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const meals = await mealsDb.getAllWithItems(userId);
  const meal = meals.find((candidate) => candidate.id === operation.mealId);
  if (!meal) return;
  const { error: mealError } = await supabase.from('meals').upsert(mealPayload(meal));
  if (mealError) throw mealError;

  const { error: deleteError } = await supabase.from('meal_items').delete().eq('meal_id', meal.id);
  if (deleteError) throw deleteError;
  if (meal.meal_items.length > 0) {
    const { error: itemError } = await supabase
      .from('meal_items')
      .insert(meal.meal_items.map(itemPayload));
    if (itemError) throw itemError;
  }
}

async function pullCloudMeals(userId: string, protectedMealIds: Set<string>): Promise<void> {
  const { data, error } = await supabase
    .from('meals')
    .select('*, meal_items(*)')
    .eq('user_id', userId)
    .order('eaten_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const deletedIds = rows
    .filter((row) => row.deleted_at && !protectedMealIds.has(String(row.id)))
    .map((row) => String(row.id));
  const remoteMeals = rows.filter((row) => !row.deleted_at).map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    meal_type: String(row.meal_type),
    eaten_at: String(row.eaten_at),
    image_url: row.image_url ? String(row.image_url) : null,
    total_energy_kcal: row.total_energy_kcal == null ? null : Number(row.total_energy_kcal),
    total_protein_g: row.total_protein_g == null ? null : Number(row.total_protein_g),
    total_fat_g: row.total_fat_g == null ? null : Number(row.total_fat_g),
    total_carbohydrate_g: row.total_carbohydrate_g == null ? null : Number(row.total_carbohydrate_g),
    total_fiber_g: row.total_fiber_g == null ? null : Number(row.total_fiber_g),
    total_sodium_mg: row.total_sodium_mg == null ? null : Number(row.total_sodium_mg),
    meal_score: row.meal_score == null ? null : Number(row.meal_score),
    traffic_light_overall: row.traffic_light_overall ? String(row.traffic_light_overall) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.client_updated_at ?? row.updated_at),
    meal_items: ((row.meal_items ?? []) as Record<string, unknown>[]).map((item) => ({
      id: String(item.id),
      meal_id: String(item.meal_id),
      food_item_id: item.food_item_id ? String(item.food_item_id) : null,
      commercial_product_id: item.commercial_product_id ? String(item.commercial_product_id) : null,
      ai_detected_name: String(item.ai_detected_name ?? ''),
      portion_grams: item.portion_grams == null ? null : Number(item.portion_grams),
      confidence: item.confidence == null ? null : Number(item.confidence),
      energy_kcal: item.energy_kcal == null ? null : Number(item.energy_kcal),
      protein_g: item.protein_g == null ? null : Number(item.protein_g),
      fat_g: item.fat_g == null ? null : Number(item.fat_g),
      carbohydrate_g: item.carbohydrate_g == null ? null : Number(item.carbohydrate_g),
      fiber_g: item.fiber_g == null ? null : Number(item.fiber_g),
      sodium_mg: item.sodium_mg == null ? null : Number(item.sodium_mg),
      estimate_basis: item.estimate_basis ? String(item.estimate_basis) : null,
      database_source: item.database_source ? String(item.database_source) : null,
      portion_min_grams: item.portion_min_grams == null ? null : Number(item.portion_min_grams),
      portion_max_grams: item.portion_max_grams == null ? null : Number(item.portion_max_grams),
      energy_min_kcal: item.energy_min_kcal == null ? null : Number(item.energy_min_kcal),
      energy_max_kcal: item.energy_max_kcal == null ? null : Number(item.energy_max_kcal),
      salt_equivalent_g: item.salt_equivalent_g == null ? null : Number(item.salt_equivalent_g),
      hidden_ingredient_flags: Array.isArray(item.hidden_ingredient_flags)
        ? item.hidden_ingredient_flags.map(String)
        : [],
      created_at: String(item.created_at),
    })),
  }));
  await mealsDb.deleteMany(userId, deletedIds);
  await mealsDb.upsertFromCloud(userId, remoteMeals);
}

let activeSync: Promise<void> | null = null;

export async function syncMealsForUser(userId: string): Promise<void> {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    await mealsDb.migrateLegacyIds(userId);
    let queue = await readQueue(userId);
    const hasSyncedBefore = await AsyncStorage.getItem(statusKey(userId));
    if (!hasSyncedBefore && queue.length === 0) {
      const localMeals = await mealsDb.getAllWithItems(userId);
      queue = localMeals.map((meal) => ({
        mealId: meal.id,
        type: 'upsert' as const,
        queuedAt: new Date().toISOString(),
        attempts: 0,
      }));
      await writeQueue(userId, queue);
    }
    const failed: SyncOperation[] = [];
    try {
      for (const operation of queue) {
        try {
          await pushOperation(userId, operation);
        } catch (error) {
          failed.push({ ...operation, attempts: operation.attempts + 1 });
          if (operation.attempts + 1 >= MAX_ATTEMPTS) {
            console.warn(`Meal sync paused for ${operation.mealId}`, error);
          }
        }
      }
      queue = failed;
      await writeQueue(userId, queue);
      await pullCloudMeals(userId, new Set(queue.map((operation) => operation.mealId)));
      await writeStatus(userId, {
        pending: queue.length,
        lastSyncedAt: new Date().toISOString(),
        lastError: queue.length ? '一部の記録を再同期します' : null,
      });
    } catch (error) {
      await writeStatus(userId, {
        pending: queue.length,
        lastSyncedAt: null,
        lastError: error instanceof Error ? error.message : '同期できませんでした',
      });
      throw error;
    }
  })().finally(() => {
    activeSync = null;
  });
  return activeSync;
}

export async function queueAllLocalMeals(userId: string): Promise<void> {
  const meals = await mealsDb.getAllWithItems(userId);
  await writeQueue(userId, meals.map((meal) => ({
    mealId: meal.id,
    type: 'upsert' as const,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  })));
}
