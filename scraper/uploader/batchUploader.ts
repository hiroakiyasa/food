/**
 * High-speed parallel batch uploader for Supabase REST API.
 * Runs multiple concurrent upsert requests for maximum throughput.
 */

import type { CompactedFoodItem, CompactedDetails } from './compactor.js';

const BATCH_SIZE = 500; // Smaller batches to avoid statement timeouts on large tables
const CONCURRENCY = 6; // Parallel HTTP requests

interface UploaderConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

let config: UploaderConfig | null = null;

export function initUploader(cfg: UploaderConfig): void {
  config = cfg;
}

function getConfig(): UploaderConfig {
  if (!config) throw new Error('Uploader not initialized. Call initUploader() first.');
  return config;
}

async function supabaseRequest(
  path: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
  retries = 3,
): Promise<{ data: unknown; error: string | null; status: number }> {
  const cfg = getConfig();
  const url = `${cfg.supabaseUrl}/rest/v1/${path}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.supabaseServiceKey,
          'Authorization': `Bearer ${cfg.supabaseServiceKey}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.ok) {
        return { data: null, error: null, status: res.status };
      }

      // Retry on 5xx or 429
      if ((res.status >= 500 || res.status === 429) && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      const text = await res.text();
      return { data: null, error: `${res.status} ${text}`, status: res.status };
    } catch (err) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return { data: null, error: `Network error: ${err}`, status: 0 };
    }
  }

  return { data: null, error: 'Max retries exceeded', status: 0 };
}

/**
 * Runs async tasks with limited concurrency.
 */
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Upserts food_items in parallel batches for maximum speed.
 */
export async function upsertFoodItems(
  items: CompactedFoodItem[],
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  // Split into batches
  const batches: CompactedFoodItem[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  // Run batches in parallel
  const tasks = batches.map((batch, idx) => async () => {
    const { error } = await supabaseRequest(
      'food_items?on_conflict=food_code',
      'POST',
      batch,
      { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    );

    if (error) {
      return { ok: false as const, count: 0, error: `Batch ${idx + 1}: ${error}` };
    }
    return { ok: true as const, count: batch.length, error: null };
  });

  const results = await parallelLimit(tasks, CONCURRENCY);

  for (const r of results) {
    if (r.ok) {
      inserted += r.count;
    } else if (r.error) {
      errors.push(r.error);
    }
  }

  return { inserted, errors };
}

/**
 * Upserts food_item_details in parallel batches.
 */
export async function upsertFoodItemDetails(
  details: Array<{ food_code: string; details: CompactedDetails }>,
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  const cfg = getConfig();

  // Split into batches
  const batches: Array<Array<{ food_code: string; details: CompactedDetails }>> = [];
  for (let i = 0; i < details.length; i += BATCH_SIZE) {
    batches.push(details.slice(i, i + BATCH_SIZE));
  }

  const ID_LOOKUP_CHUNK = 100; // Keep URL short to avoid headers overflow

  const tasks = batches.map((batch, idx) => async () => {
    const foodCodes = batch.map((d) => d.food_code);

    // Fetch food_item IDs in smaller chunks with retry
    const codeToId = new Map<string, string>();
    for (let c = 0; c < foodCodes.length; c += ID_LOOKUP_CHUNK) {
      const chunk = foodCodes.slice(c, c + ID_LOOKUP_CHUNK);
      const idsUrl = `${cfg.supabaseUrl}/rest/v1/food_items?select=id,food_code&food_code=in.(${chunk.map((code) => `"${code}"`).join(',')})`;

      let idsRes: Response | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          idsRes = await fetch(idsUrl, {
            headers: {
              'apikey': cfg.supabaseServiceKey,
              'Authorization': `Bearer ${cfg.supabaseServiceKey}`,
            },
          });
          if (idsRes.ok) break;
        } catch {
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
            continue;
          }
        }
      }

      if (!idsRes || !idsRes.ok) {
        return { ok: false as const, count: 0, error: `ID lookup batch ${idx + 1} chunk failed after retries` };
      }

      const idRows = (await idsRes.json()) as Array<{ id: string; food_code: string }>;
      for (const r of idRows) codeToId.set(r.food_code, r.id);
    }

    const detailRows = batch
      .map((d) => {
        const foodItemId = codeToId.get(d.food_code);
        if (!foodItemId) return null;
        return {
          food_item_id: foodItemId,
          ...d.details,
        };
      })
      .filter(Boolean);

    if (detailRows.length === 0) return { ok: true as const, count: 0, error: null };

    const { error } = await supabaseRequest(
      'food_item_details?on_conflict=food_item_id',
      'POST',
      detailRows,
      { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    );

    if (error) {
      return { ok: false as const, count: 0, error: `Details batch ${idx + 1}: ${error}` };
    }
    return { ok: true as const, count: detailRows.length, error: null };
  });

  const results = await parallelLimit(tasks, CONCURRENCY);

  for (const r of results) {
    if (r.ok) {
      inserted += r.count;
    } else if (r.error) {
      errors.push(r.error);
    }
  }

  return { inserted, errors };
}

export async function getRowCount(table: string): Promise<number> {
  const cfg = getConfig();
  const url = `${cfg.supabaseUrl}/rest/v1/${table}?select=count`;
  const res = await fetch(url, {
    headers: {
      'apikey': cfg.supabaseServiceKey,
      'Authorization': `Bearer ${cfg.supabaseServiceKey}`,
      'Prefer': 'count=exact',
      'Range': '0-0',
    },
  });

  const contentRange = res.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}
