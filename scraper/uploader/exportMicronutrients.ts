/**
 * Exports micronutrient JSONB data from food_items AND food_item_details
 * to Supabase Storage for complete nutritional data preservation.
 *
 * Exports:
 *   food-data/micronutrients/{source}.json.gz   (minerals, vitamins, etc.)
 *   food-data/details/{source}.json.gz           (amino_acids, fatty_acids, organic_acids, etc.)
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx tsx uploader/exportMicronutrients.ts
 *   SUPABASE_SERVICE_KEY=xxx tsx uploader/exportMicronutrients.ts --dry-run
 *   SUPABASE_SERVICE_KEY=xxx tsx uploader/exportMicronutrients.ts --verify
 */

import { gzipSync } from 'node:zlib';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://lhlaycxdejzxucqthchj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const BUCKET = 'food-data';
const BRANDED_CHUNK_SIZE = 50_000;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verifyOnly = args.includes('--verify');

// ─── Types ───

interface FoodItemMicro {
  food_code: string;
  source: string;
  minerals: Record<string, number> | null;
  vitamins: Record<string, number> | null;
  fatty_acids: Record<string, number> | null;
  amino_acids: Record<string, number> | null;
  nova_classification: number | null;
  traffic_light: Record<string, unknown> | null;
}

interface MicroEntry {
  minerals: Record<string, number> | null;
  vitamins: Record<string, number> | null;
  fatty_acids: Record<string, number> | null;
  amino_acids: Record<string, number> | null;
  nova_classification: number | null;
  traffic_light: Record<string, unknown> | null;
}

interface FoodItemDetailRow {
  food_item_id: string;
  food_code: string;
  source: string;
  amino_acids: Record<string, number> | null;
  fatty_acids: Record<string, number> | null;
  organic_acids: Record<string, number> | null;
  carbohydrate_details: Record<string, number> | null;
  dietary_fiber: Record<string, number> | null;
  additional_nutrients: Record<string, number> | null;
  food_portions: unknown[] | null;
  ingredients: string | null;
  meta_flags: Record<string, unknown> | null;
}

interface DetailEntry {
  amino_acids: Record<string, number> | null;
  fatty_acids: Record<string, number> | null;
  organic_acids: Record<string, number> | null;
  carbohydrate_details: Record<string, number> | null;
  dietary_fiber: Record<string, number> | null;
  additional_nutrients: Record<string, number> | null;
  food_portions: unknown[] | null;
  ingredients: string | null;
  meta_flags: Record<string, unknown> | null;
}

const ALL_SOURCES = ['mext', 'usda_foundation', 'usda_sr_legacy', 'usda_survey', 'usda_branded'] as const;

// ─── HTTP helpers ───

async function fetchRetry(url: string, opts: RequestInit, retries = 4): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res;
      if ((res.status >= 500 || res.status === 429) && i < retries) {
        const delay = 2000 * (i + 1) + Math.random() * 500;
        console.warn(`    Retry ${i + 1}/${retries} after ${res.status}...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } catch (err) {
      if (i < retries && !(err instanceof Error && err.message.startsWith('HTTP'))) {
        const delay = 2000 * (i + 1);
        console.warn(`    Retry ${i + 1}/${retries} after network error...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

const authHeaders = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
};

// ─── DB Query helpers ───

/**
 * Get exact row count for a source using Supabase's count header.
 */
async function getRowCount(table: string, sourceFilter?: string): Promise<number> {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=count`;
  if (sourceFilter) {
    if (table === 'food_items') {
      url += `&source=eq.${sourceFilter}`;
    }
  }
  const res = await fetchRetry(url, {
    headers: { ...authHeaders, 'Prefer': 'count=exact', 'Range': '0-0' },
  });
  const contentRange = res.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

/**
 * Fetch food_items micronutrient data using keyset pagination (food_code order).
 * More reliable than offset pagination for large tables.
 */
async function fetchMicronutrientsForSource(source: string): Promise<FoodItemMicro[]> {
  const SELECT = 'food_code,source,minerals,vitamins,fatty_acids,amino_acids,nova_classification,traffic_light';
  const PAGE_SIZE = 1000;
  const all: FoodItemMicro[] = [];
  let lastFoodCode = '';

  while (true) {
    let url = `${SUPABASE_URL}/rest/v1/food_items?select=${SELECT}&source=eq.${source}&order=food_code.asc&limit=${PAGE_SIZE}`;
    if (lastFoodCode) {
      url += `&food_code=gt.${encodeURIComponent(lastFoodCode)}`;
    }
    const res = await fetchRetry(url, { headers: authHeaders });
    const page = (await res.json()) as FoodItemMicro[];
    all.push(...page);

    if (page.length < PAGE_SIZE) break;
    lastFoodCode = page[page.length - 1].food_code;

    if (all.length % 10000 === 0) {
      console.log(`    Fetched ${all.length.toLocaleString()} rows...`);
    }
  }

  return all;
}

/**
 * Fetch food_item_details joined with food_items for source/food_code.
 */
async function fetchDetailsForSource(source: string): Promise<FoodItemDetailRow[]> {
  const SELECT = 'food_item_id,amino_acids,fatty_acids,organic_acids,carbohydrate_details,dietary_fiber,additional_nutrients,food_portions,ingredients,meta_flags,food_items!inner(food_code,source)';
  const PAGE_SIZE = 1000;
  const all: FoodItemDetailRow[] = [];
  let offset = 0;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/food_item_details?select=${SELECT}&food_items.source=eq.${source}&order=food_item_id.asc&offset=${offset}&limit=${PAGE_SIZE}`;
    const res = await fetchRetry(url, { headers: authHeaders });
    const page = await res.json() as Array<Record<string, unknown>>;

    for (const row of page) {
      const fi = row.food_items as { food_code: string; source: string } | undefined;
      if (!fi) continue;
      all.push({
        food_item_id: row.food_item_id as string,
        food_code: fi.food_code,
        source: fi.source,
        amino_acids: row.amino_acids as Record<string, number> | null,
        fatty_acids: row.fatty_acids as Record<string, number> | null,
        organic_acids: row.organic_acids as Record<string, number> | null,
        carbohydrate_details: row.carbohydrate_details as Record<string, number> | null,
        dietary_fiber: row.dietary_fiber as Record<string, number> | null,
        additional_nutrients: row.additional_nutrients as Record<string, number> | null,
        food_portions: row.food_portions as unknown[] | null,
        ingredients: row.ingredients as string | null,
        meta_flags: row.meta_flags as Record<string, unknown> | null,
      });
    }

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;

    if (all.length % 5000 === 0) {
      console.log(`    Fetched ${all.length.toLocaleString()} detail rows...`);
    }
  }

  return all;
}

// ─── Data builders ───

function buildMicroMap(items: FoodItemMicro[]): { map: Record<string, MicroEntry>; skipped: number } {
  const map: Record<string, MicroEntry> = {};
  let skipped = 0;

  for (const item of items) {
    const hasAny = item.minerals || item.vitamins || item.fatty_acids ||
      item.amino_acids || item.nova_classification !== null || item.traffic_light;

    if (!hasAny) {
      skipped++;
      continue;
    }

    map[item.food_code] = {
      minerals: item.minerals,
      vitamins: item.vitamins,
      fatty_acids: item.fatty_acids,
      amino_acids: item.amino_acids,
      nova_classification: item.nova_classification,
      traffic_light: item.traffic_light,
    };
  }

  return { map, skipped };
}

function buildDetailMap(items: FoodItemDetailRow[]): Record<string, DetailEntry> {
  const map: Record<string, DetailEntry> = {};

  for (const item of items) {
    const hasAny = item.amino_acids || item.fatty_acids || item.organic_acids ||
      item.carbohydrate_details || item.dietary_fiber || item.additional_nutrients ||
      item.food_portions || item.ingredients || item.meta_flags;

    if (!hasAny) continue;

    map[item.food_code] = {
      amino_acids: item.amino_acids,
      fatty_acids: item.fatty_acids,
      organic_acids: item.organic_acids,
      carbohydrate_details: item.carbohydrate_details,
      dietary_fiber: item.dietary_fiber,
      additional_nutrients: item.additional_nutrients,
      food_portions: item.food_portions,
      ingredients: item.ingredients,
      meta_flags: item.meta_flags,
    };
  }

  return map;
}

// ─── Storage upload ───

async function ensureBucket(): Promise<void> {
  const url = `${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`;
  const res = await fetch(url, { headers: authHeaders });

  if (res.status === 404) {
    const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create bucket: ${await createRes.text()}`);
    }
    console.log(`  Created bucket: ${BUCKET}`);
  }
}

async function uploadGzip(basePath: string, remotePath: string, data: unknown): Promise<{ originalMb: string; compressedMb: string }> {
  const json = JSON.stringify(data);
  const compressed = gzipSync(Buffer.from(json), { level: 9 });

  const compressedMb = (compressed.length / 1024 / 1024).toFixed(2);
  const originalMb = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
  console.log(`  Uploading ${remotePath} (${originalMb}MB -> ${compressedMb}MB gzipped)`);

  if (dryRun) {
    console.log(`  [DRY RUN] Skipping upload`);
    return { originalMb, compressedMb };
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${basePath}/${remotePath}`;
  const res = await fetchRetry(url, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/gzip',
      'Content-Encoding': 'gzip',
      'x-upsert': 'true',
    },
    body: compressed,
  });

  if (!res.ok) {
    throw new Error(`Upload failed for ${remotePath}: ${res.status} ${await res.text()}`);
  }

  return { originalMb, compressedMb };
}

// ─── Source processors ───

interface ExportResult {
  source: string;
  dbRows: number;
  microEntries: number;
  microSkipped: number;
  detailEntries: number;
}

async function processSmallSource(source: string): Promise<ExportResult> {
  console.log(`\n--- ${source} ---`);

  // 1. Get DB row count for verification
  const dbRows = await getRowCount('food_items', source);
  console.log(`  DB row count: ${dbRows.toLocaleString()}`);

  // 2. Fetch all micronutrient data
  const items = await fetchMicronutrientsForSource(source);
  console.log(`  Fetched: ${items.length.toLocaleString()} rows`);

  if (items.length !== dbRows) {
    console.warn(`  WARNING: Fetched ${items.length} but DB has ${dbRows} rows!`);
  }

  // 3. Build map and upload micronutrients
  const { map: microMap, skipped } = buildMicroMap(items);
  const microEntries = Object.keys(microMap).length;
  console.log(`  Micro entries: ${microEntries.toLocaleString()} (${skipped} all-null skipped)`);

  await uploadGzip('micronutrients', `${source}.json.gz`, microMap);

  // 4. Fetch and upload food_item_details
  const details = await fetchDetailsForSource(source);
  const detailMap = buildDetailMap(details);
  const detailEntries = Object.keys(detailMap).length;

  if (detailEntries > 0) {
    console.log(`  Detail entries: ${detailEntries.toLocaleString()}`);
    await uploadGzip('details', `${source}.json.gz`, detailMap);
  } else {
    console.log(`  Detail entries: 0 (no details for this source)`);
  }

  return { source, dbRows, microEntries, microSkipped: skipped, detailEntries };
}

async function processBrandedSource(): Promise<ExportResult> {
  console.log(`\n--- usda_branded ---`);

  // 1. Get DB row count
  const dbRows = await getRowCount('food_items', 'usda_branded');
  console.log(`  DB row count: ${dbRows.toLocaleString()}`);

  // 2. Fetch all micronutrient data (keyset pagination)
  const items = await fetchMicronutrientsForSource('usda_branded');
  console.log(`  Fetched: ${items.length.toLocaleString()} rows`);

  if (items.length !== dbRows) {
    console.warn(`  WARNING: Fetched ${items.length} but DB has ${dbRows} rows!`);
  }

  // 3. Build map
  const { map: microMap, skipped } = buildMicroMap(items);
  const allCodes = Object.keys(microMap);
  console.log(`  Micro entries: ${allCodes.length.toLocaleString()} (${skipped.toLocaleString()} all-null skipped)`);

  // 4. Sort and chunk
  allCodes.sort();

  const index: Record<string, number> = {};
  let chunkNum = 0;
  let totalUploaded = 0;

  for (let i = 0; i < allCodes.length; i += BRANDED_CHUNK_SIZE) {
    const chunkCodes = allCodes.slice(i, i + BRANDED_CHUNK_SIZE);
    const chunk: Record<string, MicroEntry> = {};

    for (const code of chunkCodes) {
      chunk[code] = microMap[code];
      index[code] = chunkNum;
    }

    const fileName = `usda_branded_${String(chunkNum).padStart(3, '0')}.json.gz`;
    await uploadGzip('micronutrients', fileName, chunk);
    totalUploaded += chunkCodes.length;
    chunkNum++;
  }

  // 5. Upload index
  await uploadGzip('micronutrients', 'usda_branded_index.json.gz', index);
  console.log(`  Uploaded ${chunkNum} chunks + index`);

  // 6. Verify index completeness
  const indexSize = Object.keys(index).length;
  if (indexSize !== allCodes.length) {
    console.error(`  ERROR: Index has ${indexSize} entries but expected ${allCodes.length}!`);
  }

  // 7. Fetch and upload food_item_details for branded
  const details = await fetchDetailsForSource('usda_branded');
  const detailMap = buildDetailMap(details);
  const detailEntries = Object.keys(detailMap).length;

  if (detailEntries > 0) {
    console.log(`  Detail entries: ${detailEntries.toLocaleString()}`);

    // Split details into chunks too if large
    const detailCodes = Object.keys(detailMap).sort();
    if (detailCodes.length > BRANDED_CHUNK_SIZE) {
      const detailIndex: Record<string, number> = {};
      let detailChunkNum = 0;
      for (let i = 0; i < detailCodes.length; i += BRANDED_CHUNK_SIZE) {
        const codes = detailCodes.slice(i, i + BRANDED_CHUNK_SIZE);
        const chunk: Record<string, DetailEntry> = {};
        for (const code of codes) {
          chunk[code] = detailMap[code];
          detailIndex[code] = detailChunkNum;
        }
        const fileName = `usda_branded_${String(detailChunkNum).padStart(3, '0')}.json.gz`;
        await uploadGzip('details', fileName, chunk);
        detailChunkNum++;
      }
      await uploadGzip('details', 'usda_branded_index.json.gz', detailIndex);
    } else {
      await uploadGzip('details', 'usda_branded.json.gz', detailMap);
    }
  } else {
    console.log(`  Detail entries: 0`);
  }

  return { source: 'usda_branded', dbRows, microEntries: totalUploaded, microSkipped: skipped, detailEntries };
}

// ─── Verification ───

async function verifyExport(): Promise<void> {
  console.log(`\n=== Verification ===`);

  for (const source of ALL_SOURCES) {
    const count = await getRowCount('food_items', source);
    console.log(`  ${source}: ${count.toLocaleString()} rows in DB`);
  }

  const totalFoodItems = await getRowCount('food_items');
  const totalDetails = await getRowCount('food_item_details');
  console.log(`\n  Total food_items: ${totalFoodItems.toLocaleString()}`);
  console.log(`  Total food_item_details: ${totalDetails.toLocaleString()}`);
}

// ─── Main ───

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY environment variable is required.');
    process.exit(1);
  }

  if (verifyOnly) {
    await verifyExport();
    return;
  }

  console.log(`\n=== Export Micronutrients + Details to Storage ${dryRun ? '(DRY RUN)' : ''} ===`);
  console.log(`  Bucket: ${BUCKET}`);
  console.log(`  Paths: micronutrients/ (food_items JSONB) + details/ (food_item_details)`);
  const start = Date.now();

  await ensureBucket();

  const results: ExportResult[] = [];

  // Process small sources
  for (const source of ['mext', 'usda_foundation', 'usda_sr_legacy', 'usda_survey']) {
    results.push(await processSmallSource(source));
  }

  // Process branded (chunked)
  results.push(await processBrandedSource());

  // ─── Summary report ───
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  EXPORT SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  ${'Source'.padEnd(20)} ${'DB Rows'.padStart(10)} ${'Micro'.padStart(10)} ${'Skipped'.padStart(10)} ${'Details'.padStart(10)}`);
  console.log(`  ${'-'.repeat(60)}`);

  let totalDb = 0;
  let totalMicro = 0;
  let totalSkipped = 0;
  let totalDetails = 0;

  for (const r of results) {
    console.log(`  ${r.source.padEnd(20)} ${r.dbRows.toLocaleString().padStart(10)} ${r.microEntries.toLocaleString().padStart(10)} ${r.microSkipped.toLocaleString().padStart(10)} ${r.detailEntries.toLocaleString().padStart(10)}`);
    totalDb += r.dbRows;
    totalMicro += r.microEntries;
    totalSkipped += r.microSkipped;
    totalDetails += r.detailEntries;
  }

  console.log(`  ${'-'.repeat(60)}`);
  console.log(`  ${'TOTAL'.padEnd(20)} ${totalDb.toLocaleString().padStart(10)} ${totalMicro.toLocaleString().padStart(10)} ${totalSkipped.toLocaleString().padStart(10)} ${totalDetails.toLocaleString().padStart(10)}`);
  console.log(`\n  Time: ${elapsed}s`);
  console.log(`  Coverage: ${totalMicro.toLocaleString()} / ${totalDb.toLocaleString()} items have micronutrient data (${((totalMicro / totalDb) * 100).toFixed(1)}%)`);
  console.log(`  All-null items skipped: ${totalSkipped.toLocaleString()} (no micronutrient data to export)`);

  // Warn if coverage seems low
  if (totalMicro + totalSkipped !== totalDb) {
    console.error(`\n  ERROR: Exported + skipped (${(totalMicro + totalSkipped).toLocaleString()}) does not match DB total (${totalDb.toLocaleString()})!`);
    console.error(`  Some rows may have been missed. Check pagination and retry.`);
    process.exit(1);
  } else {
    console.log(`\n  Verification: Exported + skipped = DB total. No data loss.`);
  }

  console.log(`\nNext steps:`);
  console.log(`  1. Verify files in Supabase Dashboard > Storage > ${BUCKET}`);
  console.log(`  2. Run migration: supabase/migrations/20260228_move_micronutrients_to_storage.sql`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
