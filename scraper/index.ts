import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { DETAILS_URL, MODES, OUTPUT_DIR, PROGRESS_FILE } from "./config.js";
import { fetchHtml } from "./utils/httpClient.js";
import { fetchAllFoodItems } from "./scrapers/foodListScraper.js";
import { parseGeneralComponents } from "./parsers/generalParser.js";
import { parseAminoAcids } from "./parsers/aminoAcidParser.js";
import { parseFattyAcids } from "./parsers/fattyAcidParser.js";
import { parseCarbohydrateDetails } from "./parsers/carbohydrateParser.js";
import { parseDietaryFiber } from "./parsers/dietaryFiberParser.js";
import { parseOrganicAcids } from "./parsers/organicAcidParser.js";
import type { FoodItem, FoodListEntry, ProgressState } from "./types.js";

const isTestMode = process.argv.includes("--test");
const TEST_LIMIT = 5;

async function loadProgress(): Promise<ProgressState> {
  if (existsSync(PROGRESS_FILE)) {
    const data = await readFile(PROGRESS_FILE, "utf-8");
    return JSON.parse(data);
  }
  return { completedItems: [], totalItems: 0, lastUpdated: new Date().toISOString() };
}

async function saveProgress(state: ProgressState): Promise<void> {
  await writeFile(PROGRESS_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function detailUrl(itemNo: string, mode: number): string {
  return `${DETAILS_URL}?ITEM_NO=${itemNo}&MODE=${mode}`;
}

function extractFoodNumber(foodCode: string): string {
  // foodCode like "01001" -> "01001"
  return foodCode;
}

async function scrapeFoodItem(entry: FoodListEntry): Promise<FoodItem> {
  const { itemNo, categoryNumber, categoryName, foodCode, foodName } = entry;

  // Fetch all modes
  const [generalHtml, aminoHtml, fattyHtml, carboHtml, fiberHtml, organicHtml] =
    await Promise.all([
      fetchHtml(detailUrl(itemNo, MODES.general)),
      fetchHtml(detailUrl(itemNo, MODES.aminoAcid)),
      fetchHtml(detailUrl(itemNo, MODES.fattyAcid)),
      fetchHtml(detailUrl(itemNo, MODES.carbohydrate)),
      fetchHtml(detailUrl(itemNo, MODES.dietaryFiber)),
      fetchHtml(detailUrl(itemNo, MODES.organicAcid)),
    ]);

  // Parse
  const { generalComponents, minerals, vitamins } = parseGeneralComponents(generalHtml);

  return {
    foodCode,
    foodNumber: extractFoodNumber(foodCode),
    categoryNumber,
    categoryName,
    foodName,
    itemNo,
    generalComponents,
    minerals,
    vitamins,
    aminoAcids: parseAminoAcids(aminoHtml),
    fattyAcids: parseFattyAcids(fattyHtml),
    carbohydrateDetails: parseCarbohydrateDetails(carboHtml),
    dietaryFiber: parseDietaryFiber(fiberHtml),
    organicAcids: parseOrganicAcids(organicHtml),
  };
}

async function main() {
  console.log("=== Food Composition Database Scraper ===");
  if (isTestMode) {
    console.log(`Test mode: processing only first ${TEST_LIMIT} items from category 1`);
  }

  // Step 1: Fetch food list
  console.log("\n[Step 1] Fetching food list...");
  let allItems = await fetchAllFoodItems();

  if (isTestMode) {
    allItems = allItems.filter((item) => item.categoryNumber === 1).slice(0, TEST_LIMIT);
    console.log(`Test mode: ${allItems.length} items selected`);
  }

  // Step 2: Load progress
  const progress = await loadProgress();
  progress.totalItems = allItems.length;

  const completedSet = new Set(progress.completedItems);
  const pendingItems = allItems.filter((item) => !completedSet.has(item.itemNo));
  console.log(
    `\n[Step 2] Progress: ${progress.completedItems.length}/${allItems.length} completed, ${pendingItems.length} remaining`
  );

  // Step 3: Load existing results
  const outputPath = `${OUTPUT_DIR}/food_composition.json`;
  let results: FoodItem[] = [];
  if (existsSync(outputPath)) {
    const data = await readFile(outputPath, "utf-8");
    results = JSON.parse(data);
  }
  const resultMap = new Map(results.map((r) => [r.itemNo, r]));

  // Step 4: Scrape
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  console.log("\n[Step 3] Scraping food items...");
  let processed = 0;
  const startTime = Date.now();

  for (const entry of pendingItems) {
    try {
      const item = await scrapeFoodItem(entry);
      resultMap.set(item.itemNo, item);

      progress.completedItems.push(entry.itemNo);
      progress.lastUpdated = new Date().toISOString();
      processed++;

      // Save progress and results periodically
      if (processed % 10 === 0 || processed === pendingItems.length) {
        await saveProgress(progress);
        const sortedResults = Array.from(resultMap.values()).sort((a, b) =>
          a.foodCode.localeCompare(b.foodCode)
        );
        await writeFile(outputPath, JSON.stringify(sortedResults, null, 2), "utf-8");
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const totalDone = progress.completedItems.length;
      console.log(
        `  [${totalDone}/${allItems.length}] ${entry.foodName} (${elapsed}s elapsed)`
      );
    } catch (err) {
      console.error(`  ERROR processing ${entry.itemNo} (${entry.foodName}):`, err);
    }
  }

  // Final save
  const sortedResults = Array.from(resultMap.values()).sort((a, b) =>
    a.foodCode.localeCompare(b.foodCode)
  );
  await writeFile(outputPath, JSON.stringify(sortedResults, null, 2), "utf-8");
  await saveProgress(progress);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Total foods: ${sortedResults.length}`);
  console.log(`Output: ${outputPath}`);

  // Validation
  if (sortedResults.length > 0) {
    const sample = sortedResults[0];
    console.log(`\nSample: ${sample.foodName} (${sample.foodCode})`);
    console.log(`  Energy: ${sample.generalComponents?.energyKcal.value} kcal`);
    console.log(`  Protein: ${sample.generalComponents?.protein.value} g`);
    console.log(`  Fat: ${sample.generalComponents?.totalFat.value} g`);
    console.log(`  Carbohydrate: ${sample.generalComponents?.carbohydrate.value} g`);
  }
}

main().catch(console.error);
