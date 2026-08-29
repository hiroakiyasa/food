import { createReadStream, createWriteStream } from "node:fs";
import { writeFile, mkdir, readdir, rm, readFile as rf } from "node:fs/promises";
import { join } from "node:path";
import type { FoodItem } from "../types.js";
import type { UsdaFood } from "./types.js";
import type { DatasetConfig } from "./config.js";
import { convertUsdaFood } from "./converter.js";
import { findJsonFile } from "./downloader.js";
import { OUTPUT_DIR } from "./config.js";

// Required nutrient numbers for filtering
const REQUIRED_NUTRIENTS = new Set(["208", "203", "204", "205"]);

function hasBasicNutrients(food: UsdaFood): boolean {
  if (!food.description || food.description.trim() === "") return false;

  for (const fn of food.foodNutrients) {
    if (REQUIRED_NUTRIENTS.has(fn.nutrient.number) && fn.amount != null) {
      return true;
    }
  }
  return false;
}

/**
 * For test mode (limit set): returns FoodItem[] in memory.
 * For full mode: streams results to outputPath and returns count only.
 */
export async function parseBrandedDataset(
  config: DatasetConfig,
  limit?: number,
): Promise<{ count: number; items?: FoodItem[] }> {
  const jsonPath = await findJsonFile(config);
  console.log(`  Reading branded foods with streaming: ${jsonPath}`);

  const streamJsonMod = await import("stream-json");
  const parserFn = streamJsonMod.default?.parser ?? streamJsonMod.parser;
  const streamArrayMod = await import("stream-json/streamers/StreamArray.js");
  const streamArrayFn = streamArrayMod.default?.streamArray ?? streamArrayMod.streamArray ?? streamArrayMod.default;
  const pickMod = await import("stream-json/filters/Pick.js");
  const pickFn = pickMod.default?.pick ?? pickMod.pick ?? pickMod.default;
  const chainMod = await import("stream-chain");
  const chainFn = chainMod.default?.chain ?? chainMod.chain ?? chainMod.default;

  // In test mode, collect in memory
  if (limit) {
    const results: FoodItem[] = [];
    let processed = 0;
    let total = 0;

    return new Promise((resolve, reject) => {
      let resolved = false;
      const stream = chainFn([
        createReadStream(jsonPath),
        parserFn(),
        pickFn({ filter: config.jsonKey }),
        streamArrayFn(),
      ]);

      stream.on("data", (data: { key: number; value: UsdaFood }) => {
        total++;
        if (processed >= limit) { stream.destroy(); return; }
        if (hasBasicNutrients(data.value)) {
          results.push(convertUsdaFood(data.value, config));
          processed++;
        }
      });

      const done = () => {
        if (resolved) return;
        resolved = true;
        console.log(`  Stream complete: ${total} total, ${results.length} accepted`);
        resolve({ count: results.length, items: results });
      };
      stream.on("end", done);
      stream.on("close", done);
      stream.on("error", (err: Error) => { if (!resolved) reject(err); });
    });
  }

  // Full mode: write directly to output file in streaming fashion
  const outputPath = join(OUTPUT_DIR, config.outputFilename);
  await mkdir(OUTPUT_DIR, { recursive: true });

  let filtered = 0;
  let total = 0;
  const BATCH_SIZE = 5000;
  let batch: FoodItem[] = [];
  let batchNum = 0;
  const tempDir = join(OUTPUT_DIR, "_branded_batches");
  await mkdir(tempDir, { recursive: true });

  // Phase A: stream-parse and write batches to temp files
  await new Promise<void>((resolve, reject) => {
    let resolved = false;

    const flushBatch = async () => {
      if (batch.length === 0) return;
      const batchPath = join(tempDir, `batch_${String(batchNum++).padStart(6, "0")}.json`);
      const data = JSON.stringify(batch);
      batch = [];
      await writeFile(batchPath, data);
    };

    const stream = chainFn([
      createReadStream(jsonPath),
      parserFn(),
      pickFn({ filter: config.jsonKey }),
      streamArrayFn(),
    ]);

    stream.on("data", (data: { key: number; value: UsdaFood }) => {
      total++;
      if (hasBasicNutrients(data.value)) {
        batch.push(convertUsdaFood(data.value, config));
        filtered++;

        if (batch.length >= BATCH_SIZE) {
          stream.pause();
          flushBatch().then(() => stream.resume()).catch(reject);
        }
      }

      if (total % 50000 === 0) {
        console.log(`  Processed: ${total} items, accepted: ${filtered}`);
      }
    });

    const done = async () => {
      if (resolved) return;
      resolved = true;
      await flushBatch();
      resolve();
    };
    stream.on("end", done);
    stream.on("close", done);
    stream.on("error", (err: Error) => { if (!resolved) { resolved = true; reject(err); } });
  });

  console.log(`  Stream complete: ${total} total, ${filtered} accepted`);
  console.log(`  Concatenating ${batchNum} batch files into ${outputPath}...`);

  // Phase B: concatenate batch files into a single JSON array using streams
  const outStream = createWriteStream(outputPath);
  outStream.write("[\n");

  const batchFiles = await readdir(tempDir);
  batchFiles.sort();
  let firstItem = true;

  for (const file of batchFiles) {
    const batchData: FoodItem[] = JSON.parse(await rf(join(tempDir, file), "utf-8"));
    for (const item of batchData) {
      if (!firstItem) outStream.write(",\n");
      outStream.write(JSON.stringify(item));
      firstItem = false;
    }
  }

  outStream.write("\n]");
  outStream.end();

  await new Promise<void>((resolve, reject) => {
    outStream.on("finish", resolve);
    outStream.on("error", reject);
  });

  // Clean up temp directory
  await rm(tempDir, { recursive: true, force: true });

  console.log(`  Written: ${outputPath} (${filtered} items)`);
  return { count: filtered };
}
