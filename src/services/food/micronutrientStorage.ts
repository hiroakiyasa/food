/**
 * Fetches nutritional data from Supabase Storage.
 * Data is stored as gzipped JSON in the food-data bucket.
 *
 * Storage structure:
 *   food-data/nutrients/{source}.json.gz   ← min + vit + fat + aa + g + ext
 *   food-data/details/{source}.json.gz    ← org + cho_d + fib_d + add + portions + ingr
 *   food-data/meta/{source}.json.gz       ← gtin + sz + dtype + brand
 */

import { supabase } from '@/src/lib/supabase';

// ─── Types ───

export interface NutrientsData {
  /** General components: water (h2o), cholesterol (cho), ash, alcohol (alc) */
  g?: Record<string, number>;
  /** Minerals (13 species): na, k, ca, mg_, p, fe, zn, cu, mn, i, se, cr, mo */
  min?: Record<string, number>;
  /** Vitamins (22 species): ret, rae, bcar, vd, at, vk, b1, b2, nia, b6, b12, fol, pa, bio, vc, etc. */
  vit?: Record<string, number>;
  /** Fatty acids (45 species): sfa, mufa, pufa, n3, n6, trans, epa, dha, c16, c18, c181, c182, etc. */
  fat?: Record<string, number>;
  /** Amino acids (25 species): ile, leu, lys, met, phe, trp, gly, arg, etc. */
  aa?: Record<string, number>;
  /** Extended nutrients (USDA only): lut, lyc, cho2, bet */
  ext?: Record<string, number>;
}

export interface DetailData {
  /** Organic acids: citric_acid, malic_acid, lactic_acid, etc. */
  org?: Record<string, number>;
  /** Carbohydrate details: fructose, glucose, sucrose, lactose, starch, fructan, sorbitol, etc. */
  cho_d?: Record<string, number>;
  /** Dietary fiber breakdown: soluble, insoluble, beta_glucan */
  fib_d?: Record<string, number>;
  /** Additional/special nutrients: isoflavones, purines, gaba, caffeine, plant_sterols, taurine, etc. */
  add?: Record<string, number>;
  /** Food portions */
  portions?: unknown[];
  /** Ingredients text */
  ingr?: string;
}

export interface MetaData {
  /** GTIN/UPC barcode */
  gtin?: string;
  /** Serving size */
  sz?: number;
  /** Serving size unit */
  sz_unit?: string;
  /** Data type */
  dtype?: string;
  /** Brand owner */
  brand?: string;
}

// Legacy alias for backward compatibility
export type MicronutrientData = NutrientsData;

type DataMap<T> = Record<string, T>;

const BUCKET = 'food-data';
const MAX_RETRIES = 2;

// In-memory caches (keyed by file path)
const nutrientsCache = new Map<string, DataMap<NutrientsData>>();
const detailCache = new Map<string, DataMap<DetailData>>();
let brandedNutrientsIndex: Record<string, number> | null = null;
let brandedDetailIndex: Record<string, number> | null = null;

const SOURCE_FILE_MAP: Record<string, string> = {
  mext: 'mext.json.gz',
  usda_foundation: 'usda_foundation.json.gz',
  usda_sr_legacy: 'usda_sr_legacy.json.gz',
  usda_survey: 'usda_survey.json.gz',
};

// ─── Download helpers ───

async function downloadWithRetry(path: string): Promise<Blob | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(path);

    if (data) return data;

    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      console.warn(`[micronutrientStorage] Retry ${attempt + 1}/${MAX_RETRIES} for ${path}: ${error?.message}`);
    } else {
      console.warn(`[micronutrientStorage] Failed to download ${path}:`, error?.message);
    }
  }
  return null;
}

async function decompressGzip(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(buffer));
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(merged);
}

// ─── Nutrients loading ───

async function downloadNutrientsFile(filePath: string): Promise<DataMap<NutrientsData>> {
  const cached = nutrientsCache.get(filePath);
  if (cached) return cached;

  const blob = await downloadWithRetry(`nutrients/${filePath}`);
  if (!blob) return {};

  const text = await decompressGzip(blob);
  const parsed: DataMap<NutrientsData> = JSON.parse(text);
  nutrientsCache.set(filePath, parsed);
  return parsed;
}

async function loadBrandedNutrientsIndex(): Promise<Record<string, number>> {
  if (brandedNutrientsIndex) return brandedNutrientsIndex;

  const blob = await downloadWithRetry('nutrients/usda_branded_index.json.gz');
  if (!blob) return {};

  const text = await decompressGzip(blob);
  brandedNutrientsIndex = JSON.parse(text);
  return brandedNutrientsIndex!;
}

// ─── Detail loading ───

async function downloadDetailFile(filePath: string): Promise<DataMap<DetailData>> {
  const cached = detailCache.get(filePath);
  if (cached) return cached;

  const blob = await downloadWithRetry(`details/${filePath}`);
  if (!blob) return {};

  const text = await decompressGzip(blob);
  const parsed: DataMap<DetailData> = JSON.parse(text);
  detailCache.set(filePath, parsed);
  return parsed;
}

async function loadBrandedDetailIndex(): Promise<Record<string, number>> {
  if (brandedDetailIndex) return brandedDetailIndex;

  const blob = await downloadWithRetry('details/usda_branded_index.json.gz');
  if (!blob) {
    brandedDetailIndex = {};
    return brandedDetailIndex;
  }

  const text = await decompressGzip(blob);
  brandedDetailIndex = JSON.parse(text);
  return brandedDetailIndex!;
}

// ─── Public API ───

/**
 * Fetches nutrients data (min/vit/fat/aa/g/ext) for a food item from Storage.
 */
export async function fetchMicronutrients(
  foodCode: string,
  source: string | null,
): Promise<NutrientsData | null> {
  if (!source) return null;

  try {
    if (source === 'usda_branded') {
      const index = await loadBrandedNutrientsIndex();
      const chunkNum = index[foodCode];
      if (chunkNum === undefined) return null;

      const chunkFile = `usda_branded_${String(chunkNum).padStart(3, '0')}.json.gz`;
      const data = await downloadNutrientsFile(chunkFile);
      return data[foodCode] ?? null;
    }

    const fileName = SOURCE_FILE_MAP[source];
    if (!fileName) return null;

    const data = await downloadNutrientsFile(fileName);
    return data[foodCode] ?? null;
  } catch (err) {
    console.warn(`[micronutrientStorage] Error fetching nutrients ${foodCode}:`, err);
    return null;
  }
}

/**
 * Fetches detail data (org/cho_d/fib_d/add/portions/ingr) for a food item from Storage.
 */
export async function fetchFoodDetail(
  foodCode: string,
  source: string | null,
): Promise<DetailData | null> {
  if (!source) return null;

  try {
    if (source === 'usda_branded') {
      const index = await loadBrandedDetailIndex();
      if (Object.keys(index).length === 0) {
        const data = await downloadDetailFile('usda_branded.json.gz');
        return data[foodCode] ?? null;
      }
      const chunkNum = index[foodCode];
      if (chunkNum === undefined) return null;

      const chunkFile = `usda_branded_${String(chunkNum).padStart(3, '0')}.json.gz`;
      const data = await downloadDetailFile(chunkFile);
      return data[foodCode] ?? null;
    }

    const fileName = SOURCE_FILE_MAP[source];
    if (!fileName) return null;

    const data = await downloadDetailFile(fileName);
    return data[foodCode] ?? null;
  } catch (err) {
    console.warn(`[micronutrientStorage] Error fetching detail ${foodCode}:`, err);
    return null;
  }
}

/**
 * Batch fetch nutrients data for multiple food items.
 * Groups by source to minimize Storage downloads.
 */
export async function fetchMicronutrientsBatch(
  items: Array<{ id: string; food_code: string; source: string | null }>,
): Promise<Map<string, NutrientsData>> {
  const result = new Map<string, NutrientsData>();

  const bySource = new Map<string, Array<{ id: string; food_code: string }>>();
  for (const item of items) {
    const src = item.source ?? '';
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(item);
  }

  const tasks: Promise<void>[] = [];

  for (const [source, group] of bySource) {
    if (!source) continue;

    if (source === 'usda_branded') {
      tasks.push((async () => {
        const index = await loadBrandedNutrientsIndex();
        const neededChunks = new Set<number>();
        for (const item of group) {
          const chunkNum = index[item.food_code];
          if (chunkNum !== undefined) neededChunks.add(chunkNum);
        }

        await Promise.all([...neededChunks].map(async (chunkNum) => {
          const chunkFile = `usda_branded_${String(chunkNum).padStart(3, '0')}.json.gz`;
          await downloadNutrientsFile(chunkFile);
        }));

        for (const item of group) {
          const chunkNum = index[item.food_code];
          if (chunkNum === undefined) continue;
          const chunkFile = `usda_branded_${String(chunkNum).padStart(3, '0')}.json.gz`;
          const data = nutrientsCache.get(chunkFile);
          if (data?.[item.food_code]) {
            result.set(item.id, data[item.food_code]);
          }
        }
      })());
    } else {
      const fileName = SOURCE_FILE_MAP[source];
      if (!fileName) continue;

      tasks.push((async () => {
        const data = await downloadNutrientsFile(fileName);
        for (const item of group) {
          if (data[item.food_code]) {
            result.set(item.id, data[item.food_code]);
          }
        }
      })());
    }
  }

  await Promise.all(tasks);
  return result;
}

/**
 * Clears all in-memory caches.
 */
export function clearMicronutrientCache(): void {
  nutrientsCache.clear();
  detailCache.clear();
  brandedNutrientsIndex = null;
  brandedDetailIndex = null;
}
