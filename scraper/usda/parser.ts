import { readFile } from "node:fs/promises";
import type { FoodItem } from "../types.js";
import type { UsdaFood } from "./types.js";
import type { DatasetConfig } from "./config.js";
import { convertUsdaFood } from "./converter.js";
import { findJsonFile } from "./downloader.js";

export async function parseDataset(
  config: DatasetConfig,
  limit?: number,
): Promise<FoodItem[]> {
  const jsonPath = await findJsonFile(config);
  console.log(`  Reading: ${jsonPath}`);

  const raw = await readFile(jsonPath, "utf-8");
  console.log(`  Parsing JSON (${(Buffer.byteLength(raw) / (1024 * 1024)).toFixed(1)} MB)...`);

  const data = JSON.parse(raw);

  // The top-level key varies by dataset
  const foods: UsdaFood[] = data[config.jsonKey];
  if (!foods || !Array.isArray(foods)) {
    throw new Error(
      `Key "${config.jsonKey}" not found or not an array in ${jsonPath}. ` +
      `Available keys: ${Object.keys(data).join(", ")}`,
    );
  }

  console.log(`  Found ${foods.length} foods in "${config.jsonKey}"`);

  const toProcess = limit ? foods.slice(0, limit) : foods;
  const results: FoodItem[] = [];

  for (const food of toProcess) {
    results.push(convertUsdaFood(food, config));
  }

  console.log(`  Converted ${results.length} foods`);
  return results;
}
