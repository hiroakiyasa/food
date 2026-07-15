/**
 * Delta uploader: streams branded JSON, checks DB in batches, inserts missing items.
 * Memory-efficient: processes in streaming batches of 500 items.
 */

import { createReadStream } from 'node:fs';
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
const BATCH_SIZE = 200;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

async function fetchRetry(url: string, opts: RequestInit, retries = 4): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res;
      if (res.status >= 500 || res.status === 429) {
        if (i < retries) { await new Promise(r => setTimeout(r, 2000 * (i + 1))); continue; }
      }
      return res;
    } catch {
      if (i < retries) { await new Promise(r => setTimeout(r, 3000 * (i + 1))); continue; }
      throw new Error(`Network error after ${retries} retries`);
    }
  }
  throw new Error('Unreachable');
}

async function checkExisting(codes: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < codes.length; i += 50) {
    const chunk = codes.slice(i, i + 50);
    const url = `${SUPABASE_URL}/rest/v1/food_items?select=food_code&food_code=in.(${chunk.map(c => `"${c}"`).join(',')})`;
    try {
      const res = await fetchRetry(url, {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
      });
      if (res.ok) {
        const rows = await res.json() as Array<{ food_code: string }>;
        for (const r of rows) found.add(r.food_code);
      }
    } catch (err) {
      console.error(`  Check error: ${err}`);
    }
  }
  return found;
}

async function insertItems(items: CompactedFoodItem[]): Promise<number> {
  try {
    const res = await fetchRetry(`${SUPABASE_URL}/rest/v1/food_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(items),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`  Insert error: ${res.status} ${text.slice(0, 150)}`);
      return 0;
    }
    return items.length;
  } catch (err) {
    console.error(`  Insert exception: ${err}`);
    return 0;
  }
}

async function main() {
  console.log('\n=== Delta Upload (streaming, memory-efficient) ===\n');

  const streamJsonMod = await import('stream-json');
  const streamArrayMod = await import('stream-json/streamers/StreamArray.js');
  const chainMod = await import('stream-chain');
  const jsonParserFn = streamJsonMod.parser ?? streamJsonMod.default?.parser ?? streamJsonMod.default;
  const streamArrayFn = streamArrayMod.streamArray ?? streamArrayMod.default?.streamArray ?? streamArrayMod.default;
  const chainFn = chainMod.chain ?? chainMod.default?.chain ?? chainMod.default;

  const filePath = join(OUTPUT_DIR, 'usda_branded_filtered.json');
  let parsed = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const startTime = Date.now();

  let batch: CompactedFoodItem[] = [];

  async function processBatch() {
    const items = batch;
    batch = [];

    // Check which codes already exist
    const codes = items.map(i => i.food_code);
    const existing = await checkExisting(codes);

    // Filter to only new items
    const newItems = items.filter(i => !existing.has(i.food_code));
    skipped += existing.size;

    if (newItems.length === 0) return;

    // Insert in sub-batches of BATCH_SIZE
    for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
      const sub = newItems.slice(i, i + BATCH_SIZE);
      const count = await insertItems(sub);
      inserted += count;
      if (count === 0) errors++;
    }
  }

  await new Promise<void>((resolve, reject) => {
    const pipeline = chainFn([
      createReadStream(filePath),
      jsonParserFn(),
      streamArrayFn(),
    ]);

    let processing = Promise.resolve();

    pipeline.on('data', ({ value }: { value: FoodItem }) => {
      parsed++;
      const { foodItem } = compact(value);
      batch.push(foodItem);

      if (batch.length >= 1000) {
        pipeline.pause();
        processing = processBatch().then(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = elapsed > 0 ? Math.round(inserted / elapsed) : 0;
          console.log(`  ${parsed.toLocaleString()} parsed | ${inserted.toLocaleString()} inserted | ${skipped.toLocaleString()} skipped (~${rate}/sec)`);
          pipeline.resume();
        }).catch(err => {
          console.error('Process error:', err);
          pipeline.resume();
        });
      }
    });

    pipeline.on('end', async () => {
      await processing;
      if (batch.length > 0) await processBatch();
      resolve();
    });

    pipeline.on('error', (err: Error) => reject(err));
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Delta Upload Complete ===`);
  console.log(`  Parsed:   ${parsed.toLocaleString()}`);
  console.log(`  Inserted: ${inserted.toLocaleString()}`);
  console.log(`  Skipped:  ${skipped.toLocaleString()}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Time:     ${totalTime}s`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
