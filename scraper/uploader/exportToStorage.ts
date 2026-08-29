/**
 * Exports all nutritional data directly from data/output/ raw files to Supabase Storage.
 *
 * Replaces exportMicronutrients.ts (which read from DB JSONB columns that are now NULL-ed).
 * Reads raw data files and builds compact Storage objects.
 *
 * Outputs:
 *   food-data/nutrients/{source}.json.gz   ← min + vit + fat + aa + g + ext
 *   food-data/details/{source}.json.gz    ← org + cho_d + fib_d + add + portions + ingr
 *   food-data/meta/{source}.json.gz       ← gtin_upc + serving_size + brand (branded only)
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=xxx tsx uploader/exportToStorage.ts
 *   SUPABASE_SERVICE_KEY=xxx tsx uploader/exportToStorage.ts --dry-run
 *   SUPABASE_SERVICE_KEY=xxx tsx uploader/exportToStorage.ts --source=mext
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://lhlaycxdejzxucqthchj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const BUCKET = 'food-data';
const BRANDED_CHUNK_SIZE = 50_000;
const DATA_DIR = join(process.cwd(), '../data/output');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceFilter = args.find(a => a.startsWith('--source='))?.split('=')[1];

// ─── Key maps (imported inline to avoid circular deps) ───

const MINERAL_KEY_MAP: Record<string, string> = {
  sodium: 'na', potassium: 'k', calcium: 'ca', magnesium: 'mg_',
  phosphorus: 'p', iron: 'fe', zinc: 'zn', copper: 'cu',
  manganese: 'mn', iodine: 'i', selenium: 'se', chromium: 'cr', molybdenum: 'mo',
};

const VITAMIN_KEY_MAP: Record<string, string> = {
  retinol: 'ret', alphaCarotene: 'acar', betaCarotene: 'bcar',
  betaCryptoxanthin: 'bcry', betaCaroteneEquiv: 'bce', retinolActivityEquiv: 'rae',
  vitaminD: 'vd', alphaTocopherol: 'at', betaTocopherol: 'bt',
  gammaTocopherol: 'gt', deltaTocopherol: 'dt', vitaminK: 'vk',
  vitaminB1: 'b1', vitaminB2: 'b2', niacin: 'nia', niacinEquiv: 'nie',
  vitaminB6: 'b6', vitaminB12: 'b12', folate: 'fol',
  pantothenicAcid: 'pa', biotin: 'bio', vitaminC: 'vc',
};

const FATTY_ACID_KEY_MAP: Record<string, string> = {
  saturatedTotal: 'sfa', monounsaturatedTotal: 'mufa', polyunsaturatedTotal: 'pufa',
  n3PolyunsaturatedTotal: 'n3', n6PolyunsaturatedTotal: 'n6',
  transFattyAcid: 'trans', fattyAcidTotal: 'fat',
  heptanoicAcid: 'c7', butyricAcid: 'c4', hexanoicAcid: 'c6',
  octanoicAcid: 'c8', decanoicAcid: 'c10', lauricAcid: 'c12',
  tridecanoicAcid: 'c13', myristicAcid: 'c14', pentadecanoicAcid: 'c15',
  palmiticAcid: 'c16', heptadecanoicAcid: 'c17', stearicAcid: 'c18',
  arachidocAcid: 'c20', behenicAcid: 'c22', lignocericAcid: 'c24',
  anteisoC15: 'ac15',
  myristoleicAcid: 'c141', pentadecenoicAcid: 'c151', palmitoleicAcid: 'c161',
  heptadecenoicAcid: 'c171', oleicAcid: 'c181', gondoicAcid: 'c201',
  erucicAcid: 'eru', nervicAcid: 'ner',
  linoleicAcid: 'c182', gammaLinolenicAcid: 'gla', alphaLinolenicAcid: 'c183n3',
  eicosadienoicAcid: 'c202', eicosatrienoicAcidN3: 'c203n3',
  eicosatrienoicAcidN9: 'c203n9', arachidonicAcid: 'c204n6',
  eicosapentaenoicAcid: 'epa', docosapentaenoicAcidN3: 'dpa_n3',
  docosapentaenoicAcidN6: 'dpa_n6', docosahexaenoicAcid: 'dha',
};

const AMINO_ACID_KEY_MAP: Record<string, string> = {
  isoleucine: 'ile', leucine: 'leu', lysine: 'lys', methionine: 'met',
  cystine: 'cys', phenylalanine: 'phe', tyrosine: 'tyr', threonine: 'thr',
  tryptophan: 'trp', valine: 'val', histidine: 'his', arginine: 'arg',
  alanine: 'ala', asparticAcid: 'asp', glutamicAcid: 'glu', glycine: 'gly',
  proline: 'pro', serine: 'ser', hydroxyproline: 'hyp',
};

const GENERAL_KEY_MAP: Record<string, string> = {
  water: 'h2o', cholesterol: 'cho', ash: 'ash', alcohol: 'alc',
};

// USDA additionalNutrients keys → ext section
const ADDITIONAL_NUTRIENT_KEY_MAP: Record<string, string> = {
  'usda_338_Lutein___zeaxanthin': 'lut',
  'usda_337_Lycopene': 'lyc',
  'usda_421_Choline__total': 'cho2',
  'usda_454_Betaine': 'bet',
};

// ─── Types ───

type NutrientValue = { value?: number; estimated?: boolean; trace?: boolean; unit?: string } | number | null;

interface RawFoodItem {
  food_code?: string;
  id?: string;
  source?: string;
  generalComponents?: Record<string, NutrientValue>;
  minerals?: Record<string, NutrientValue>;
  vitamins?: Record<string, NutrientValue>;
  aminoAcids?: Record<string, NutrientValue>;
  fattyAcids?: Record<string, NutrientValue>;
  carbohydrateDetails?: Record<string, NutrientValue>;
  dietaryFiber?: Record<string, NutrientValue>;
  organicAcids?: Record<string, NutrientValue>;
  additionalNutrients?: Record<string, NutrientValue>;
  foodPortions?: unknown[];
  ingredients?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  dataType?: string;
  brandOwner?: string;
}

interface NutrientsEntry {
  min?: Record<string, number>;
  vit?: Record<string, number>;
  fat?: Record<string, number>;
  aa?: Record<string, number>;
  g?: Record<string, number>;
  ext?: Record<string, number>;
}

interface DetailsEntry {
  org?: Record<string, number>;
  cho_d?: Record<string, number>;
  fib_d?: Record<string, number>;
  add?: Record<string, number>;
  portions?: unknown[];
  ingr?: string;
}

interface MetaEntry {
  gtin?: string;
  sz?: number;
  sz_unit?: string;
  dtype?: string;
  brand?: string;
}

// ─── Helpers ───

function getValue(val: NutrientValue): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object') {
    if (val.trace) return 0;
    if (val.value === null || val.value === undefined) return null;
    return val.value;
  }
  return null;
}

function compactMap(
  src: Record<string, NutrientValue> | undefined,
  keyMap: Record<string, string>,
): Record<string, number> | undefined {
  if (!src) return undefined;
  const result: Record<string, number> = {};
  for (const [rawKey, shortKey] of Object.entries(keyMap)) {
    const val = getValue(src[rawKey]);
    if (val !== null) {
      result[shortKey] = val;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function compactExtMap(
  additionalNutrients: Record<string, NutrientValue> | undefined,
): Record<string, number> | undefined {
  if (!additionalNutrients) return undefined;
  const result: Record<string, number> = {};
  for (const [usdaKey, shortKey] of Object.entries(ADDITIONAL_NUTRIENT_KEY_MAP)) {
    const val = getValue(additionalNutrients[usdaKey]);
    if (val !== null) {
      result[shortKey] = val;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function compactDetailsMap(
  src: Record<string, NutrientValue> | undefined,
): Record<string, number> | undefined {
  if (!src) return undefined;
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(src)) {
    const v = getValue(val);
    if (v !== null) {
      result[key] = v;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function buildNutrientsEntry(item: RawFoodItem): NutrientsEntry | null {
  const min = compactMap(item.minerals, MINERAL_KEY_MAP);
  const vit = compactMap(item.vitamins, VITAMIN_KEY_MAP);
  const fat = compactMap(item.fattyAcids, FATTY_ACID_KEY_MAP);
  const aa = compactMap(item.aminoAcids, AMINO_ACID_KEY_MAP);

  // General components (water, cholesterol, ash, alcohol)
  const g = compactMap(item.generalComponents, GENERAL_KEY_MAP);

  // ext section from USDA additionalNutrients
  const ext = compactExtMap(item.additionalNutrients);

  if (!min && !vit && !fat && !aa && !g && !ext) return null;

  const entry: NutrientsEntry = {};
  if (g) entry.g = g;
  if (min) entry.min = min;
  if (vit) entry.vit = vit;
  if (fat) entry.fat = fat;
  if (aa) entry.aa = aa;
  if (ext) entry.ext = ext;

  return entry;
}

function buildDetailsEntry(item: RawFoodItem): DetailsEntry | null {
  const org = compactDetailsMap(item.organicAcids);
  const cho_d = compactDetailsMap(item.carbohydrateDetails);
  const fib_d = compactDetailsMap(item.dietaryFiber);

  // Special additional nutrients (isoflavones, purines, GABA, caffeine, etc.)
  const addRaw: Record<string, number> = {};
  if (item.additionalNutrients) {
    for (const [key, val] of Object.entries(item.additionalNutrients)) {
      // Skip USDA ext keys (already in nutrients/ext)
      if (key in ADDITIONAL_NUTRIENT_KEY_MAP) continue;
      const v = getValue(val);
      if (v !== null) addRaw[key] = v;
    }
  }
  const add = Object.keys(addRaw).length > 0 ? addRaw : undefined;

  const portions = item.foodPortions && item.foodPortions.length > 0 ? item.foodPortions : undefined;
  const ingr = item.ingredients ?? undefined;

  if (!org && !cho_d && !fib_d && !add && !portions && !ingr) return null;

  const entry: DetailsEntry = {};
  if (org) entry.org = org;
  if (cho_d) entry.cho_d = cho_d;
  if (fib_d) entry.fib_d = fib_d;
  if (add) entry.add = add;
  if (portions) entry.portions = portions;
  if (ingr) entry.ingr = ingr;

  return entry;
}

function buildMetaEntry(item: RawFoodItem): MetaEntry | null {
  const hasAny = item.gtinUpc || item.servingSize !== undefined || item.dataType || item.brandOwner;
  if (!hasAny) return null;

  const entry: MetaEntry = {};
  if (item.gtinUpc) entry.gtin = item.gtinUpc;
  if (item.servingSize !== undefined) {
    entry.sz = item.servingSize;
    if (item.servingSizeUnit) entry.sz_unit = item.servingSizeUnit;
  }
  if (item.dataType) entry.dtype = item.dataType;
  if (item.brandOwner) entry.brand = item.brandOwner;
  return entry;
}

// ─── HTTP helpers ───

const authHeaders = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
};

async function fetchRetry(url: string, opts: RequestInit, retries = 4): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res;
      if ((res.status >= 500 || res.status === 429) && i < retries) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } catch (err) {
      if (i < retries && !(err instanceof Error && err.message.startsWith('HTTP'))) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

async function ensureBucket(): Promise<void> {
  const url = `${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`;
  const res = await fetch(url, { headers: authHeaders });
  if (res.status === 404) {
    const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
    if (!createRes.ok) throw new Error(`Failed to create bucket: ${await createRes.text()}`);
    console.log(`  Created bucket: ${BUCKET}`);
  }
}

async function uploadGzip(
  folder: string,
  fileName: string,
  data: unknown,
): Promise<{ originalMb: string; compressedMb: string }> {
  const json = JSON.stringify(data);
  const compressed = gzipSync(Buffer.from(json), { level: 9 });

  const originalMb = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
  const compressedMb = (compressed.length / 1024 / 1024).toFixed(2);
  console.log(`  [${folder}] ${fileName}: ${originalMb}MB → ${compressedMb}MB`);

  if (dryRun) {
    console.log(`  [DRY RUN] Skip upload`);
    return { originalMb, compressedMb };
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${folder}/${fileName}`;
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
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);

  return { originalMb, compressedMb };
}

// ─── Source processor ───

interface ProcessResult {
  source: string;
  total: number;
  nutrientsExported: number;
  nutrientsSkipped: number;
  detailsExported: number;
  metaExported: number;
}

async function processSource(
  sourceName: string,
  filePath: string,
  isBranded: boolean,
): Promise<ProcessResult> {
  console.log(`\n--- ${sourceName} ---`);

  if (!existsSync(filePath)) {
    console.warn(`  File not found: ${filePath}`);
    return { source: sourceName, total: 0, nutrientsExported: 0, nutrientsSkipped: 0, detailsExported: 0, metaExported: 0 };
  }

  console.log(`  Reading ${filePath}...`);
  const raw = readFileSync(filePath, 'utf-8');
  const items: RawFoodItem[] = JSON.parse(raw);
  console.log(`  Loaded ${items.length.toLocaleString()} items`);

  const nutrientsMap: Record<string, NutrientsEntry> = {};
  const detailsMap: Record<string, DetailsEntry> = {};
  const metaMap: Record<string, MetaEntry> = {};

  let nutrientsSkipped = 0;

  for (const item of items) {
    const code = item.food_code ?? item.id ?? '';
    if (!code) { nutrientsSkipped++; continue; }

    const ne = buildNutrientsEntry(item);
    if (ne) {
      nutrientsMap[code] = ne;
    } else {
      nutrientsSkipped++;
    }

    const de = buildDetailsEntry(item);
    if (de) detailsMap[code] = de;

    if (isBranded) {
      const me = buildMetaEntry(item);
      if (me) metaMap[code] = me;
    }
  }

  const nutrientsCount = Object.keys(nutrientsMap).length;
  const detailsCount = Object.keys(detailsMap).length;
  const metaCount = Object.keys(metaMap).length;

  console.log(`  Nutrients: ${nutrientsCount.toLocaleString()} (${nutrientsSkipped} skipped)`);
  console.log(`  Details: ${detailsCount.toLocaleString()}`);
  if (isBranded) console.log(`  Meta: ${metaCount.toLocaleString()}`);

  // Upload nutrients
  if (!isBranded) {
    await uploadGzip('nutrients', `${sourceName}.json.gz`, nutrientsMap);
  } else {
    // Chunk branded
    const allCodes = Object.keys(nutrientsMap).sort();
    const index: Record<string, number> = {};
    let chunkNum = 0;
    for (let i = 0; i < allCodes.length; i += BRANDED_CHUNK_SIZE) {
      const codes = allCodes.slice(i, i + BRANDED_CHUNK_SIZE);
      const chunk: Record<string, NutrientsEntry> = {};
      for (const c of codes) { chunk[c] = nutrientsMap[c]; index[c] = chunkNum; }
      await uploadGzip('nutrients', `usda_branded_${String(chunkNum).padStart(3, '0')}.json.gz`, chunk);
      chunkNum++;
    }
    await uploadGzip('nutrients', 'usda_branded_index.json.gz', index);
    console.log(`  Nutrients uploaded: ${chunkNum} chunks + index`);
  }

  // Upload details
  if (detailsCount > 0) {
    if (!isBranded || detailsCount <= BRANDED_CHUNK_SIZE) {
      await uploadGzip('details', `${sourceName}.json.gz`, detailsMap);
    } else {
      const codes = Object.keys(detailsMap).sort();
      const index: Record<string, number> = {};
      let chunkNum = 0;
      for (let i = 0; i < codes.length; i += BRANDED_CHUNK_SIZE) {
        const chunk: Record<string, DetailsEntry> = {};
        for (const c of codes.slice(i, i + BRANDED_CHUNK_SIZE)) {
          chunk[c] = detailsMap[c]; index[c] = chunkNum;
        }
        await uploadGzip('details', `usda_branded_${String(chunkNum).padStart(3, '0')}.json.gz`, chunk);
        chunkNum++;
      }
      await uploadGzip('details', 'usda_branded_index.json.gz', index);
    }
  }

  // Upload meta
  if (isBranded && metaCount > 0) {
    await uploadGzip('meta', 'usda_branded.json.gz', metaMap);
  } else if (!isBranded && metaCount > 0) {
    await uploadGzip('meta', `${sourceName}.json.gz`, metaMap);
  }

  return {
    source: sourceName,
    total: items.length,
    nutrientsExported: nutrientsCount,
    nutrientsSkipped,
    detailsExported: detailsCount,
    metaExported: metaCount,
  };
}

// ─── Source definitions ───

const SOURCES = [
  { name: 'mext',              file: 'food_composition.json',      branded: false },
  { name: 'usda_foundation',   file: 'usda_foundation.json',       branded: false },
  { name: 'usda_sr_legacy',    file: 'usda_sr_legacy.json',        branded: false },
  { name: 'usda_survey',       file: 'usda_survey.json',           branded: false },
  { name: 'usda_branded',      file: 'usda_branded_filtered.json', branded: true  },
] as const;

// ─── Main ───

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY environment variable is required.');
    console.error('Usage: SUPABASE_SERVICE_KEY=xxx tsx uploader/exportToStorage.ts');
    process.exit(1);
  }

  const selectedSources = sourceFilter
    ? SOURCES.filter(s => s.name === sourceFilter)
    : [...SOURCES];

  if (selectedSources.length === 0) {
    console.error(`Unknown source: ${sourceFilter}`);
    process.exit(1);
  }

  console.log(`\n=== Export to Storage: nutrients/ + details/ + meta/ ${dryRun ? '(DRY RUN)' : ''} ===`);
  console.log(`  Bucket: ${BUCKET}`);
  console.log(`  Data dir: ${DATA_DIR}`);
  console.log(`  Sources: ${selectedSources.map(s => s.name).join(', ')}`);
  console.log(`  45 fatty acids, ext (lut/lyc/cho2/bet), g (h2o/cho/ash/alc)`);

  const start = Date.now();
  await ensureBucket();

  const results: ProcessResult[] = [];
  for (const s of selectedSources) {
    results.push(await processSource(s.name, join(DATA_DIR, s.file), s.branded));
  }

  // Summary
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  EXPORT SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  ${'Source'.padEnd(22)} ${'Total'.padStart(8)} ${'Nutrients'.padStart(10)} ${'Skipped'.padStart(9)} ${'Details'.padStart(9)} ${'Meta'.padStart(7)}`);
  console.log(`  ${'-'.repeat(68)}`);

  let totalItems = 0, totalNutrients = 0, totalSkipped = 0, totalDetails = 0;
  for (const r of results) {
    console.log(
      `  ${r.source.padEnd(22)} ${r.total.toLocaleString().padStart(8)} ` +
      `${r.nutrientsExported.toLocaleString().padStart(10)} ` +
      `${r.nutrientsSkipped.toLocaleString().padStart(9)} ` +
      `${r.detailsExported.toLocaleString().padStart(9)} ` +
      `${r.metaExported.toLocaleString().padStart(7)}`
    );
    totalItems += r.total;
    totalNutrients += r.nutrientsExported;
    totalSkipped += r.nutrientsSkipped;
    totalDetails += r.detailsExported;
  }

  console.log(`  ${'-'.repeat(68)}`);
  console.log(
    `  ${'TOTAL'.padEnd(22)} ${totalItems.toLocaleString().padStart(8)} ` +
    `${totalNutrients.toLocaleString().padStart(10)} ` +
    `${totalSkipped.toLocaleString().padStart(9)} ` +
    `${totalDetails.toLocaleString().padStart(9)}`
  );

  // Data loss check
  if (totalNutrients + totalSkipped !== totalItems) {
    console.error(`\n  ERROR: Exported (${totalNutrients}) + Skipped (${totalSkipped}) ≠ Total (${totalItems})`);
    process.exit(1);
  } else {
    console.log(`\n  Verification: exported + skipped = total ✓`);
  }

  console.log(`\n  Coverage: ${totalNutrients.toLocaleString()} / ${totalItems.toLocaleString()} items (${((totalNutrients / totalItems) * 100).toFixed(1)}%)`);
  console.log(`  Time: ${elapsed}s`);

  console.log(`\nNext steps:`);
  console.log(`  1. Verify files in Supabase Dashboard > Storage > ${BUCKET}`);
  console.log(`     nutrients/ details/ meta/ フォルダを確認`);
  console.log(`  2. Run water_g migration: supabase/migrations/20260301_add_water_g.sql`);
  console.log(`  3. Run JSONB NULL migration: supabase/migrations/20260228_move_micronutrients_to_storage.sql`);
  console.log(`  4. VACUUM FULL food_items → DB ~350MB目標`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
