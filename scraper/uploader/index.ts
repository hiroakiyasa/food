/**
 * High-speed parallel upload pipeline.
 * Reads JSON food data, compacts, and upserts to Supabase with parallel batches.
 *
 * Usage:
 *   tsx uploader/index.ts                  # Full upload (all datasets)
 *   tsx uploader/index.ts --test           # Test mode (10 items per dataset)
 *   tsx uploader/index.ts --verify-only    # Only verify row counts
 */

import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve data directory relative to project root (not cwd)
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'data', 'output');
import type { FoodItem } from '../types.js';
import { compact, compactSlim } from './compactor.js';
import type { CompactedFoodItem, CompactedDetails } from './compactor.js';
import {
  initUploader,
  upsertFoodItems,
  upsertFoodItemDetails,
  getRowCount,
} from './batchUploader.js';

// Streaming JSON parser for large files (dynamic imports for ESM compat)

// --- Config ---

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://lhlaycxdejzxucqthchj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const TEST_LIMIT = 10;
const FLUSH_SIZE = 5000; // Flush every 5000 items for large files

const DATASETS = [
  { source: 'mext', file: 'food_composition.json' },
  { source: 'usda_foundation', file: 'usda_foundation.json' },
  { source: 'usda_sr_legacy', file: 'usda_sr_legacy.json' },
  { source: 'usda_survey', file: 'usda_survey.json' },
  { source: 'usda_branded', file: 'usda_branded_filtered.json' },
];

// --- CLI flags ---

const args = process.argv.slice(2);
const testMode = args.includes('--test');
const verifyOnly = args.includes('--verify-only');
const slimMode = args.includes('--slim');

// Choose compactor: --slim excludes minerals/vitamins (stored in Storage)
const compactFn = slimMode ? compactSlim : compact;

// --- Timing helper ---
function elapsed(start: number): string {
  const s = (Date.now() - start) / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${(s / 60).toFixed(1)}m`;
}

// --- Main ---

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY environment variable is required.');
    console.error('  export SUPABASE_SERVICE_KEY="your-service-role-key"');
    process.exit(1);
  }

  initUploader({ supabaseUrl: SUPABASE_URL, supabaseServiceKey: SUPABASE_SERVICE_KEY });

  if (verifyOnly) {
    await verify();
    return;
  }

  const globalStart = Date.now();
  console.log(`\n=== Food Data Upload ${testMode ? '(TEST MODE)' : '(FULL)'}${slimMode ? ' [SLIM]' : ''} ===`);
  console.log(`  Concurrency: 8 parallel batches, 1000 items/batch${slimMode ? ', minerals/vitamins excluded' : ''}\n`);

  let totalFoodItems = 0;
  let totalDetails = 0;

  for (const dataset of DATASETS) {
    const filePath = join(OUTPUT_DIR, dataset.file);
    console.log(`--- ${dataset.source} (${dataset.file}) ---`);

    const start = Date.now();
    const isLargeFile = dataset.source === 'usda_branded';

    let result: { foodItemCount: number; detailCount: number };
    if (isLargeFile) {
      result = await processLargeFile(filePath);
    } else {
      result = await processSmallFile(filePath);
    }

    totalFoodItems += result.foodItemCount;
    totalDetails += result.detailCount;
    console.log(`  Done: ${result.foodItemCount.toLocaleString()} items, ${result.detailCount} details [${elapsed(start)}]\n`);
  }

  console.log(`=== Upload Complete [${elapsed(globalStart)}] ===`);
  console.log(`  Food items: ${totalFoodItems.toLocaleString()}`);
  console.log(`  Details:    ${totalDetails.toLocaleString()}\n`);

  await verify();
}

async function processSmallFile(
  filePath: string,
): Promise<{ foodItemCount: number; detailCount: number }> {
  const raw = await readFile(filePath, 'utf-8');
  let items: FoodItem[] = JSON.parse(raw);

  if (testMode) {
    items = items.slice(0, TEST_LIMIT);
  }

  console.log(`  Items: ${items.length.toLocaleString()}`);

  const compacted = items.map((item) => compactFn(item));
  const foodItems = compacted.map((c) => c.foodItem);
  const detailEntries = compacted
    .filter((c) => c.details !== null)
    .map((c) => ({
      food_code: c.foodItem.food_code,
      details: c.details as CompactedDetails,
    }));

  // Upsert food items (parallel internally)
  const { inserted, errors } = await upsertFoodItems(foodItems);
  if (errors.length > 0) {
    console.error(`  Errors (${errors.length}):`, errors.slice(0, 3));
  }

  // Upsert details (parallel internally)
  let detailCount = 0;
  if (detailEntries.length > 0) {
    const detailResult = await upsertFoodItemDetails(detailEntries);
    detailCount = detailResult.inserted;
    if (detailResult.errors.length > 0) {
      console.error(`  Detail errors:`, detailResult.errors.slice(0, 3));
    }
  }

  return { foodItemCount: inserted, detailCount };
}

async function processLargeFile(
  filePath: string,
): Promise<{ foodItemCount: number; detailCount: number }> {
  // Dynamic imports for ESM compatibility
  const streamJsonMod = await import('stream-json');
  const streamArrayMod = await import('stream-json/streamers/StreamArray.js');
  const chainMod = await import('stream-chain');

  const jsonParserFn = streamJsonMod.parser ?? streamJsonMod.default?.parser ?? streamJsonMod.default;
  const streamArrayFn = streamArrayMod.streamArray ?? streamArrayMod.default?.streamArray ?? streamArrayMod.default;
  const chainFn = chainMod.chain ?? chainMod.default?.chain ?? chainMod.default;

  return new Promise((resolve, reject) => {
    let count = 0;
    let foodItemCount = 0;
    let detailCount = 0;
    let foodItemBatch: CompactedFoodItem[] = [];
    let detailBatch: Array<{ food_code: string; details: CompactedDetails }> = [];
    let flushPromise: Promise<void> = Promise.resolve();

    const pipeline = chainFn([
      createReadStream(filePath),
      jsonParserFn(),
      streamArrayFn(),
    ]);

    async function flush() {
      const items = foodItemBatch;
      const details = detailBatch;
      foodItemBatch = [];
      detailBatch = [];

      try {
        const { inserted, errors } = await upsertFoodItems(items);
        foodItemCount += inserted;
        if (errors.length > 0) console.error(`  Batch errors (${errors.length}):`, errors.slice(0, 2));
      } catch (err) {
        console.error(`  Fatal upsert error (continuing):`, (err as Error).message);
      }

      if (details.length > 0) {
        try {
          const dr = await upsertFoodItemDetails(details);
          detailCount += dr.inserted;
          if (dr.errors.length > 0) console.error(`  Detail errors:`, dr.errors.slice(0, 2));
        } catch (err) {
          console.error(`  Fatal detail error (continuing):`, (err as Error).message);
        }
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const rate = elapsed > 0 ? Math.round(foodItemCount / elapsed) : 0;
      console.log(`  Progress: ${count.toLocaleString()} parsed, ${foodItemCount.toLocaleString()} uploaded (~${rate}/sec)`);
    }

    const startTime = Date.now();

    let resolved = false;

    async function finalize() {
      if (resolved) return;
      resolved = true;
      await flushPromise;
      if (foodItemBatch.length > 0) {
        await flush();
      }
      console.log(`  Total parsed: ${count.toLocaleString()}`);
      resolve({ foodItemCount, detailCount });
    }

    pipeline.on('data', ({ value }: { value: FoodItem }) => {
      if (testMode && count >= TEST_LIMIT) {
        pipeline.destroy();
        finalize();
        return;
      }

      count++;
      const { foodItem, details } = compactFn(value);
      foodItemBatch.push(foodItem);

      if (details) {
        detailBatch.push({ food_code: foodItem.food_code, details });
      }

      if (foodItemBatch.length >= FLUSH_SIZE) {
        pipeline.pause();
        flushPromise = flush().then(() => {
          pipeline.resume();
        }).catch((err) => {
          console.error('Flush error:', err);
          pipeline.resume();
        });
      }
    });

    pipeline.on('end', () => finalize());
    pipeline.on('close', () => finalize());

    pipeline.on('error', async (err: Error) => {
      if (testMode && count >= TEST_LIMIT) {
        await finalize();
        return;
      }
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
  });
}

async function verify() {
  console.log(`--- Verification ---`);
  try {
    const foodCount = await getRowCount('food_items');
    const detailCount = await getRowCount('food_item_details');
    console.log(`  food_items:        ${foodCount.toLocaleString()} rows`);
    console.log(`  food_item_details: ${detailCount.toLocaleString()} rows`);

    if (foodCount >= 468000) {
      console.log(`  ✓ Target reached (468,905 expected)`);
    } else {
      console.log(`  ✗ Below target (468,905 expected)`);
    }
  } catch (err) {
    console.error(`  Verification failed:`, err);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
