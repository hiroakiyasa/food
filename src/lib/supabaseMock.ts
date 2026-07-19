/**
 * Mock Supabase client for offline development.
 * Simulates auth, database, and storage operations using in-memory data.
 *
 * Enabled when EXPO_PUBLIC_USE_MOCK=true in .env.local
 */

import {
  MOCK_SESSION,
  MOCK_PROFILE,
  MOCK_NUTRITION_TARGET,
  MOCK_FOOD_ITEMS,
  MOCK_USER_ID,
} from './mockData';

// ─── In-memory DB ───

type Row = Record<string, unknown>;

const db: Record<string, Row[]> = {
  profiles: [MOCK_PROFILE as unknown as Row],
  nutrition_targets: [MOCK_NUTRITION_TARGET as unknown as Row],
  food_items: MOCK_FOOD_ITEMS as unknown as Row[],
  meals: [],
  meal_items: [],
  food_item_details: [],
  daily_summaries: [],
  weekly_buffers: [],
  push_tokens: [],
  subscriptions: [],
  disease_profiles: [],
  taste_preferences: [],
  commercial_products: [],
  badges: [],
  user_badges: [],
};

function getTable(table: string): Row[] {
  if (!db[table]) db[table] = [];
  return db[table];
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  return rows.filter((row) => {
    for (const f of filters) {
      const val = row[f.col];
      if (f.op === 'eq' && val !== f.val) return false;
      if (f.op === 'neq' && val === f.val) return false;
      if (f.op === 'gte' && (val as string) < (f.val as string)) return false;
      if (f.op === 'lte' && (val as string) > (f.val as string)) return false;
      if (f.op === 'gt' && (val as string) <= (f.val as string)) return false;
      if (f.op === 'lt' && (val as string) >= (f.val as string)) return false;
      if (f.op === 'in') {
        const arr = f.val as unknown[];
        if (!arr.includes(val)) return false;
      }
      if (f.op === 'ilike') {
        const pattern = (f.val as string).replace(/%/g, '').toLowerCase();
        if (!String(val ?? '').toLowerCase().includes(pattern)) return false;
      }
    }
    return true;
  });
}

function generateId(): string {
  return 'mock-' + Math.random().toString(36).slice(2, 11);
}

// ─── Query Builder ───

interface Filter {
  col: string;
  op: string;
  val: unknown;
}

class MockQueryBuilder {
  private _table: string;
  private _filters: Filter[] = [];
  private _orFilters: Array<{ col: string; op: string; val: string }[]> = [];
  private _orderBy: { col: string; ascending: boolean }[] = [];
  private _limitCount: number | null = null;
  private _isSingle = false;
  private _selectCols = '*';
  private _mutation: 'insert' | 'update' | 'upsert' | 'delete' | null = null;
  private _mutationData: Row | Row[] | null = null;
  private _afterSelect = false;

  constructor(table: string) {
    this._table = table;
  }

  select(cols = '*') {
    this._selectCols = cols;
    this._afterSelect = true;
    return this;
  }

  eq(col: string, val: unknown) {
    this._filters.push({ col, op: 'eq', val });
    return this;
  }

  neq(col: string, val: unknown) {
    this._filters.push({ col, op: 'neq', val });
    return this;
  }

  gte(col: string, val: unknown) {
    this._filters.push({ col, op: 'gte', val });
    return this;
  }

  lte(col: string, val: unknown) {
    this._filters.push({ col, op: 'lte', val });
    return this;
  }

  gt(col: string, val: unknown) {
    this._filters.push({ col, op: 'gt', val });
    return this;
  }

  lt(col: string, val: unknown) {
    this._filters.push({ col, op: 'lt', val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this._filters.push({ col, op: 'in', val: vals });
    return this;
  }

  or(query: string) {
    // Parse simple "col.ilike.%val%,col2.ilike.%val2%" patterns
    const parts = query.split(',');
    const orGroup: { col: string; op: string; val: string }[] = [];
    for (const part of parts) {
      const [col, op, ...rest] = part.trim().split('.');
      if (col && op) {
        orGroup.push({ col, op, val: rest.join('.') });
      }
    }
    if (orGroup.length > 0) this._orFilters.push(orGroup);
    return this;
  }

  ilike(col: string, pattern: string) {
    this._filters.push({ col, op: 'ilike', val: pattern });
    return this;
  }

  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this._orderBy.push({ col, ascending: opts.ascending !== false });
    return this;
  }

  limit(n: number) {
    this._limitCount = n;
    return this;
  }

  single() {
    this._isSingle = true;
    return this;
  }

  insert(data: Row | Row[]) {
    this._mutation = 'insert';
    this._mutationData = data;
    return this;
  }

  update(data: Row) {
    this._mutation = 'update';
    this._mutationData = data;
    return this;
  }

  upsert(data: Row | Row[]) {
    this._mutation = 'upsert';
    this._mutationData = data;
    return this;
  }

  delete() {
    this._mutation = 'delete';
    return this;
  }

  // Execute the query
  then(
    resolve: (value: { data: unknown; error: null }) => void,
    _reject?: (reason: unknown) => void,
  ) {
    const result = this._execute();
    return Promise.resolve(result).then(resolve);
  }

  private _execute(): { data: unknown; error: null } {
    const table = getTable(this._table);
    const now = new Date().toISOString();

    // Mutations
    if (this._mutation === 'delete') {
      const before = table.length;
      const filtered = applyFilters(table, this._filters);
      const toDelete = new Set(filtered.map((r) => r.id));
      db[this._table] = table.filter((r) => !toDelete.has(r.id));
      return { data: { count: before - db[this._table].length }, error: null };
    }

    if (this._mutation === 'insert') {
      const items = Array.isArray(this._mutationData)
        ? this._mutationData
        : [this._mutationData!];
      const inserted: Row[] = [];
      for (const item of items) {
        const newRow = { id: generateId(), created_at: now, updated_at: now, ...item };
        table.push(newRow);
        inserted.push(newRow);
      }
      if (this._afterSelect) {
        const result = inserted.length === 1 && this._isSingle ? inserted[0] : inserted;
        return { data: result, error: null };
      }
      return { data: this._isSingle ? inserted[0] : inserted, error: null };
    }

    if (this._mutation === 'upsert') {
      const items = Array.isArray(this._mutationData)
        ? this._mutationData
        : [this._mutationData!];
      const upserted: Row[] = [];
      for (const item of items) {
        const existingIdx = table.findIndex(
          (r) => r.id === item.id ||
            (item.user_id && r.user_id === item.user_id && this._table === 'profiles'),
        );
        if (existingIdx >= 0) {
          table[existingIdx] = { ...table[existingIdx], ...item, updated_at: now };
          upserted.push(table[existingIdx]);
        } else {
          const newRow = { id: generateId(), created_at: now, updated_at: now, ...item };
          table.push(newRow);
          upserted.push(newRow);
        }
      }
      if (this._afterSelect) {
        const result = upserted.length === 1 && this._isSingle ? upserted[0] : upserted;
        return { data: result, error: null };
      }
      return { data: this._isSingle ? upserted[0] : upserted, error: null };
    }

    if (this._mutation === 'update') {
      const matched = applyFilters(table, this._filters);
      const updated: Row[] = [];
      for (const row of matched) {
        const idx = table.indexOf(row);
        table[idx] = { ...row, ...this._mutationData as Row, updated_at: now };
        updated.push(table[idx]);
      }
      if (this._afterSelect) {
        const result = updated.length === 1 && this._isSingle ? updated[0] : updated;
        return { data: result, error: null };
      }
      return { data: this._isSingle ? updated[0] ?? null : updated, error: null };
    }

    // SELECT
    let results = applyFilters(table, this._filters);

    // Apply OR filters
    if (this._orFilters.length > 0) {
      results = results.filter((row) => {
        return this._orFilters.every((group) => {
          return group.some(({ col, op, val }) => {
            const rowVal = row[col];
            if (op === 'ilike') {
              const pattern = val.replace(/%/g, '').toLowerCase();
              return String(rowVal ?? '').toLowerCase().includes(pattern);
            }
            if (op === 'eq') return rowVal === val;
            return false;
          });
        });
      });
    }

    // Apply joins for select patterns like "*, meal_items(*)"
    if (this._selectCols.includes('meal_items(')) {
      results = results.map((row) => ({
        ...row,
        meal_items: getTable('meal_items').filter((mi) => mi.meal_id === row.id),
      }));
    }

    // Sort
    for (const { col, ascending } of this._orderBy) {
      results.sort((a, b) => {
        const av = a[col] as string;
        const bv = b[col] as string;
        if (av < bv) return ascending ? -1 : 1;
        if (av > bv) return ascending ? 1 : -1;
        return 0;
      });
    }

    // Limit
    if (this._limitCount !== null) {
      results = results.slice(0, this._limitCount);
    }

    if (this._isSingle) {
      if (results.length === 0) return { data: null, error: null };
      return { data: results[0], error: null };
    }

    return { data: results, error: null };
  }
}

// ─── Mock Storage ───

const mockStorage = {
  from: (_bucket: string) => ({
    download: async (_path: string) => ({ data: null, error: { message: 'Mock: storage not available' } }),
    upload: async (_path: string, _data: unknown) => ({ data: { path: _path }, error: null }),
    getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
    remove: async (_paths: string[]) => ({ data: null, error: null }),
    list: async (_path?: string) => ({ data: [], error: null }),
  }),
};

// ─── Mock Auth ───

type AuthCallback = (event: string, session: typeof MOCK_SESSION | null) => void;
const authCallbacks: AuthCallback[] = [];

const mockAuth = {
  getSession: async () => ({
    data: { session: MOCK_SESSION },
    error: null,
  }),

  onAuthStateChange: (callback: AuthCallback) => {
    authCallbacks.push(callback);
    // Immediately fire with current session
    setTimeout(() => callback('SIGNED_IN', MOCK_SESSION), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const idx = authCallbacks.indexOf(callback);
            if (idx >= 0) authCallbacks.splice(idx, 1);
          },
        },
      },
    };
  },

  signInWithPassword: async (_credentials: unknown) => ({
    data: { session: MOCK_SESSION, user: MOCK_SESSION.user },
    error: null,
  }),

  signUp: async (_credentials: unknown) => ({
    data: { session: MOCK_SESSION, user: MOCK_SESSION.user },
    error: null,
  }),

  signOut: async () => {
    for (const cb of authCallbacks) cb('SIGNED_OUT', null);
    return { error: null };
  },

  getUser: async () => ({ data: { user: MOCK_SESSION.user }, error: null }),

  updateUser: async (attrs: Record<string, unknown>) => ({
    data: { user: { ...MOCK_SESSION.user, ...attrs } },
    error: null,
  }),

  resetPasswordForEmail: async (_email: string) => ({ data: {}, error: null }),
  signInWithOtp: async (_opts: unknown) => ({ data: {}, error: null }),
  verifyOtp: async (_opts: unknown) => ({
    data: { session: MOCK_SESSION, user: MOCK_SESSION.user },
    error: null,
  }),
};

// ─── Mock RPC ───

function mockRpc(fn: string, _args?: unknown) {
  if (fn === 'get_food_categories') {
    const categories = new Map<string, number>();
    for (const item of MOCK_FOOD_ITEMS) {
      categories.set(item.category_name, (categories.get(item.category_name) ?? 0) + 1);
    }
    const data = [...categories.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return Promise.resolve({ data, error: null });
  }
  return Promise.resolve({ data: null, error: null });
}

function mockFoodAnalysis() {
  const portions = [
    { id: 'food-0001', grams: 150, confidence: 0.94 },
    { id: 'food-0013', grams: 90, confidence: 0.88 },
    { id: 'food-0060', grams: 180, confidence: 0.82 },
  ];
  const items = portions.flatMap(({ id, grams, confidence }) => {
    const food = MOCK_FOOD_ITEMS.find((candidate) => candidate.id === id);
    if (!food) return [];
    const ratio = grams / 100;
    const sodiumMg = (food.sodium_mg ?? 0) * ratio;
    return [{
      name: food.food_name,
      detected_name: food.food_name,
      matched_food_name: food.food_name,
      food_item_id: food.id,
      food_code: food.food_code,
      database_source: food.source,
      estimate_basis: 'mock',
      portion_grams: grams,
      confidence,
      database_match_score: 1,
      energy_kcal: (food.energy_kcal ?? 0) * ratio,
      protein_g: (food.protein_g ?? 0) * ratio,
      fat_g: (food.fat_g ?? 0) * ratio,
      carbohydrate_g: (food.carbohydrate_g ?? 0) * ratio,
      fiber_g: (food.fiber_g ?? 0) * ratio,
      sodium_mg: sodiumMg,
      salt_equivalent_g: food.salt_equivalent_g == null
        ? sodiumMg * 2.54 / 1000
        : food.salt_equivalent_g * ratio,
    }];
  });
  return {
    items,
    meal_type_guess: 'lunch',
    summary: 'ご飯、主菜、汁物を検出しました。分量を確認して保存してください。',
    disclaimer: '開発用モック結果です。実運用では写真認識と食品データベース照合を行います。',
    analysis_source: 'mock',
    model: 'mock-food-vision',
  };
}

// ─── Mock Channel (Realtime) ───

const mockChannel = {
  on: () => mockChannel,
  subscribe: () => mockChannel,
  unsubscribe: async () => {},
};

// ─── Public Mock Client ───

export const mockSupabase = {
  from: (table: string) => new MockQueryBuilder(table),
  auth: mockAuth,
  storage: mockStorage,
  rpc: mockRpc,
  channel: (_name: string) => mockChannel,
  removeChannel: async (_channel: unknown) => {},
  functions: {
    invoke: async (fn: string, _opts?: unknown) => {
      if (fn === 'analyze-food-image') return { data: mockFoodAnalysis(), error: null };
      return { data: null, error: null };
    },
  },
};

// Seed initial data helper (call in dev to add test meals)
export function seedMockMeal() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const mealId = generateId();
  const mealItemId = generateId();

  db.meals.push({
    id: mealId,
    user_id: MOCK_USER_ID,
    meal_type: 'lunch',
    eaten_at: `${today}T12:30:00`,
    total_energy_kcal: 168,
    total_protein_g: 2.5,
    total_fat_g: 0.3,
    total_carbohydrate_g: 37.1,
    total_fiber_g: 0.3,
    total_sodium_mg: 1,
    meal_score: null,
    traffic_light_overall: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  db.meal_items.push({
    id: mealItemId,
    meal_id: mealId,
    food_item_id: 'food-0001',
    food_name: '精白米（炊いたもの）',
    ai_detected_name: null,
    portion_grams: 150,
    energy_kcal: 252,
    protein_g: 3.75,
    fat_g: 0.45,
    carbohydrate_g: 55.65,
    fiber_g: 0.45,
    sodium_mg: 1.5,
    salt_equivalent_g: 0,
    cholesterol_mg: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
