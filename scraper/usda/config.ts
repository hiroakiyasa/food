import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { UsdaDatasetKey, UsdaSourceType } from "./types.js";

// Resolve to project root's data/ directory regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data");

export const USDA_RAW_DIR = join(DATA_DIR, "usda", "raw");
export const USDA_EXTRACTED_DIR = join(DATA_DIR, "usda", "extracted");
export const OUTPUT_DIR = join(DATA_DIR, "output");
export const MEXT_FILE = join(OUTPUT_DIR, "food_composition.json");

export interface DatasetConfig {
  name: string;
  url: string;
  zipFilename: string;
  jsonKey: UsdaDatasetKey;
  sourceType: UsdaSourceType;
  outputFilename: string;
  codePrefix: string;
  useNdbNumber: boolean;
}

export const DATASETS: DatasetConfig[] = [
  {
    name: "Foundation Foods",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2025-12-18.zip",
    zipFilename: "FoodData_Central_foundation_food_json_2025-12-18.zip",
    jsonKey: "FoundationFoods",
    sourceType: "usda_foundation",
    outputFilename: "usda_foundation.json",
    codePrefix: "UF",
    useNdbNumber: false,
  },
  {
    name: "SR Legacy",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip",
    zipFilename: "FoodData_Central_sr_legacy_food_json_2018-04.zip",
    jsonKey: "SRLegacyFoods",
    sourceType: "usda_sr_legacy",
    outputFilename: "usda_sr_legacy.json",
    codePrefix: "US",
    useNdbNumber: true,
  },
  {
    name: "Survey Foods (FNDDS)",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip",
    zipFilename: "FoodData_Central_survey_food_json_2024-10-31.zip",
    jsonKey: "SurveyFoods",
    sourceType: "usda_survey",
    outputFilename: "usda_survey.json",
    codePrefix: "UV",
    useNdbNumber: false,
  },
  {
    name: "Branded Foods",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_branded_food_json_2025-12-18.zip",
    zipFilename: "FoodData_Central_branded_food_json_2025-12-18.zip",
    jsonKey: "BrandedFoods",
    sourceType: "usda_branded",
    outputFilename: "usda_branded_filtered.json",
    codePrefix: "UB",
    useNdbNumber: false,
  },
];
