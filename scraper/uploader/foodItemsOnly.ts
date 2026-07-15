/**
 * Food items only uploader - skips details to avoid timeout on large table.
 * Streams branded JSON, upserts food_items in small batches.
 */

import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FoodItem } from '../types.js';
import { compact } from './compactor.js';
import type { CompactedFoodItem } from './compactor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'data', 'output');

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://lhlaycxdejzxucqthchj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const BATCH_SIZE = 300;
const CONCURRENCY = 4;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

async function fetchRetry(url: string, opts: RequestInit, retries = 4): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res;
      if ((res.status >= 500 || res.status === 429) && i < retries) {
        await new Promise(r => setTimeout(r, 3000 * (i + 1)));
        continue;
      }
      return res;
    } catch {
      if (i < retries) { await new Promise(r => setTimeout(r, 3000 * (i + 1))); continue; }
      throw new Error(`Network error after ${retries} retries`);
    }
  }
  throw new Error('Unreachable');
}

async function upsertBatch(items: CompactedFoodItem[]): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const res = await fetchRetry(`${SUPABASE_URL}/rest/v1/food_items?on_conflict=food_code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(items),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, count: 0, error: `${res.status}: ${text.slice(0, 150)}` };
    }
    return { ok: true, count: items.length };
  } catch (err) {
    return { ok: false, count: 0, error: String(err) };
  }
}

async function parallelUpsert(batches: CompactedFoodItem[][]): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;
  let idx = 0;

  async function worker() {
    while (idx < batches.length) {
      const i = idx++;
      const result = await upsertBatch(batches[i]);
      if (result.ok) {
        inserted += result.count;
      } else {
        errors++;
        if (errors <= 5) console.error(`  Error: ${result.error}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()));
  return { inserted, errors };
}

function elapsed(start: number): string {
  const s = (Date.now() - start) / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${(s / 60).toFixed(1)}m`;
}

async function main() {
  console.log('\n=== Food Items Only Upload (no details) ===');
  console.log(`  Batch: ${BATCH_SIZE}, Concurrency: ${CONCURRENCY}\n`);

  const globalStart = Date.now();

  // Process small files first
  const smallFiles = [
    { source: 'mext', file: 'food_composition.json' },
    { source: 'usda_foundation', file: 'usda_foundation.json' },
    { source: 'usda_sr_legacy', file: 'usda_sr_legacy.json' },
    { source: 'usda_survey', file: 'usda_survey.json' },
  ];

  for (const ds of smallFiles) {
    const start = Date.now();
    const raw = await readFile(join(OUTPUT_DIR, ds.file), 'utf-8');
    const items: FoodItem[] = JSON.parse(raw);
    const compacted = items.map(i => compact(i).foodItem);

    const batches: CompactedFoodItem[][] = [];
    for (let i = 0; i < compacted.length; i += BATCH_SIZE) {
      batches.push(compacted.slice(i, i + BATCH_SIZE));
    }

    const result = await parallelUpsert(batches);
    console.log(`  ${ds.source}: ${result.inserted.toLocaleString()} items [${elapsed(start)}]${result.errors ? ` (${result.errors} errors)` : ''}`);
  }

  // Stream branded
  console.log('\n  Streaming branded...');
  const streamJsonMod = await import('stream-json');
  const streamArrayMod = await import('stream-json/streamers/StreamArray.js');
  const chainMod = await import('stream-chain');
  const jsonParserFn = streamJsonMod.parser ?? streamJsonMod.default?.parser ?? streamJsonMod.default;
  const streamArrayFn = streamArrayMod.streamArray ?? streamArrayMod.default?.streamArray ?? streamArrayMod.default;
  const chainFn = chainMod.chain ?? chainMod.default?.chain ?? chainMod.default;

  const filePath = join(OUTPUT_DIR, 'usda_branded_filtered.json');
  let totalInserted = 0;
  let totalErrors = 0;
  let parsed = 0;
  const brandedStart = Date.now();

  await new Promise<void>((resolve, reject) => {
    let batch: CompactedFoodItem[] = [];
    let flushPromise = Promise.resolve();
    let resolved = false;

    const pipeline = chainFn([
      createReadStream(filePath),
      jsonParserFn(),
      streamArrayFn(),
    ]);

    async function flush() {
      const items = batch;
      batch = [];

      const batches: CompactedFoodItem[][] = [];
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
      }

      try {
        const result = await parallelUpsert(batches);
        totalInserted += result.inserted;
        totalErrors += result.errors;
      } catch (err) {
        console.error(`  Flush error (continuing): ${err}`);
      }

      const rate = ((Date.now() - brandedStart) / 1000) > 0
        ? Math.round(totalInserted / ((Date.now() - brandedStart) / 1000))
        : 0;
      console.log(`  ${parsed.toLocaleString()} parsed | ${totalInserted.toLocaleString()} upserted | ${totalErrors} errors (~${rate}/sec)`);
    }

    async function finalize() {
      if (resolved) return;
      resolved = true;
      await flushPromise;
      if (batch.length > 0) await flush();
      resolve();
    }

    pipeline.on('data', ({ value }: { value: FoodItem }) => {
      parsed++;
      batch.push(compact(value).foodItem);

      if (batch.length >= 3000) {
        pipeline.pause();
        flushPromise = flush().then(() => pipeline.resume()).catch(() => pipeline.resume());
      }
    });

    pipeline.on('end', () => finalize());
    pipeline.on('close', () => finalize());
    pipeline.on('error', (err: Error) => {
      if (!resolved) { resolved = true; reject(err); }
    });
  });

  console.log(`\n=== Complete [${elapsed(globalStart)}] ===`);
  console.log(`  Total upserted: ${totalInserted.toLocaleString()}`);
  console.log(`  Total errors: ${totalErrors}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
