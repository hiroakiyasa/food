import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { DATASETS, OUTPUT_DIR, MEXT_FILE } from "./config.js";
import { downloadAndExtract } from "./downloader.js";
import { parseDataset } from "./parser.js";
import { parseBrandedDataset } from "./brandedParser.js";
import type { FoodItem } from "../types.js";

const args = process.argv.slice(2);
const testMode = args.includes("--test");
const downloadOnly = args.includes("--download-only");
const testLimit = testMode ? 10 : undefined;

interface MergedIndexEntry {
  source: string;
  file: string;
  count: number;
}

async function saveJson(filename: string, data: unknown): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const filePath = join(OUTPUT_DIR, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function patchMextData(): Promise<number> {
  console.log("\n=== Phase 6: Patching MEXT data with source field ===");

  let raw: string;
  try {
    raw = await readFile(MEXT_FILE, "utf-8");
  } catch {
    console.log("  MEXT file not found, skipping patch");
    return 0;
  }

  const foods: FoodItem[] = JSON.parse(raw);
  let patched = 0;

  for (const food of foods) {
    if (!food.source) {
      food.source = "mext";
      patched++;
    }
  }

  if (patched > 0) {
    await writeFile(MEXT_FILE, JSON.stringify(foods, null, 2));
    console.log(`  Patched ${patched} of ${foods.length} items with source:"mext"`);
  } else {
    console.log(`  All ${foods.length} items already have source field`);
  }

  return foods.length;
}

async function main() {
  console.log("===========================================");
  console.log("USDA FoodData Central → FoodItem Converter");
  console.log("===========================================");
  if (testMode) console.log("*** TEST MODE: Processing 10 items per dataset ***");
  if (downloadOnly) console.log("*** DOWNLOAD-ONLY MODE ***");
  console.log();

  // Phase 1: Download all datasets
  console.log("=== Phase 1: Download & Extract ===");
  for (const dataset of DATASETS) {
    console.log(`\n[${dataset.name}]`);
    await downloadAndExtract(dataset);
  }

  if (downloadOnly) {
    console.log("\nDownload complete. Exiting (--download-only mode).");
    return;
  }

  const index: MergedIndexEntry[] = [];

  // Phase 2: Foundation Foods
  console.log("\n=== Phase 2: Foundation Foods ===");
  const foundationConfig = DATASETS[0];
  const foundationFoods = await parseDataset(foundationConfig, testLimit);
  const foundationPath = await saveJson(foundationConfig.outputFilename, foundationFoods);
  console.log(`  Saved: ${foundationPath} (${foundationFoods.length} items)`);
  index.push({ source: "usda_foundation", file: foundationConfig.outputFilename, count: foundationFoods.length });

  // Phase 3: SR Legacy
  console.log("\n=== Phase 3: SR Legacy ===");
  const srConfig = DATASETS[1];
  const srFoods = await parseDataset(srConfig, testLimit);
  const srPath = await saveJson(srConfig.outputFilename, srFoods);
  console.log(`  Saved: ${srPath} (${srFoods.length} items)`);
  index.push({ source: "usda_sr_legacy", file: srConfig.outputFilename, count: srFoods.length });

  // Phase 4: Survey Foods
  console.log("\n=== Phase 4: Survey Foods ===");
  const surveyConfig = DATASETS[2];
  const surveyFoods = await parseDataset(surveyConfig, testLimit);
  const surveyPath = await saveJson(surveyConfig.outputFilename, surveyFoods);
  console.log(`  Saved: ${surveyPath} (${surveyFoods.length} items)`);
  index.push({ source: "usda_survey", file: surveyConfig.outputFilename, count: surveyFoods.length });

  // Phase 5: Branded Foods (streaming)
  console.log("\n=== Phase 5: Branded Foods (Streaming) ===");
  const brandedConfig = DATASETS[3];
  const brandedResult = await parseBrandedDataset(brandedConfig, testLimit);
  if (brandedResult.items) {
    // Test mode: save in-memory items
    const brandedPath = await saveJson(brandedConfig.outputFilename, brandedResult.items);
    console.log(`  Saved: ${brandedPath} (${brandedResult.count} items)`);
  }
  // Full mode: file already written by parseBrandedDataset
  index.push({ source: "usda_branded", file: brandedConfig.outputFilename, count: brandedResult.count });

  // Phase 6: Patch MEXT data
  const mextCount = await patchMextData();
  if (mextCount > 0) {
    index.unshift({ source: "mext", file: "food_composition.json", count: mextCount });
  }

  // Phase 7: Generate merged index
  console.log("\n=== Phase 7: Merged Index ===");
  const mergedIndex = {
    generatedAt: new Date().toISOString(),
    testMode,
    datasets: index,
    totalFoods: index.reduce((sum, d) => sum + d.count, 0),
  };
  const indexPath = await saveJson("merged_index.json", mergedIndex);
  console.log(`  Saved: ${indexPath}`);

  // Phase 8: Summary
  console.log("\n=== Summary ===");
  console.log("┌──────────────────────┬─────────┬──────────────────────────────────┐");
  console.log("│ Source               │ Count   │ File                             │");
  console.log("├──────────────────────┼─────────┼──────────────────────────────────┤");
  for (const entry of index) {
    const src = entry.source.padEnd(20);
    const cnt = String(entry.count).padStart(7);
    const file = entry.file.padEnd(32);
    console.log(`│ ${src} │ ${cnt} │ ${file} │`);
  }
  console.log("├──────────────────────┼─────────┼──────────────────────────────────┤");
  const totalStr = String(mergedIndex.totalFoods).padStart(7);
  console.log(`│ ${"TOTAL".padEnd(20)} │ ${totalStr} │                                  │`);
  console.log("└──────────────────────┴─────────┴──────────────────────────────────┘");

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
