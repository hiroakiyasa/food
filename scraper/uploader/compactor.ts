/**
 * Compacts FoodItem JSON data for DB insertion.
 * - Converts NutrientEntry { value, estimated, trace, unit } → numeric value only
 * - Applies short key mappings
 * - Strips null values from JSONB
 * - Separates food_items row from food_item_details row
 */

import type { FoodItem, NutrientEntry } from '../types.js';
import {
  MINERAL_KEY_MAP,
  VITAMIN_KEY_MAP,
  AMINO_ACID_KEY_MAP,
  FATTY_ACID_KEY_MAP,
} from './keyMapping.js';

export interface CompactedFoodItem {
  food_code: string;
  food_name: string;
  food_name_en: string | null;
  category_name: string;
  source: string;
  data_type: string | null;
  brand_owner: string | null;
  gtin_upc: string | null;
  serving_size: number | null;
  serving_size_unit: string | null;
  data_quality: number;
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbohydrate_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  salt_equivalent_g: number | null;
  cholesterol_mg: number | null;
  minerals: Record<string, number> | null;
  vitamins: Record<string, number> | null;
}

export interface CompactedDetails {
  amino_acids: Record<string, number> | null;
  fatty_acids: Record<string, number> | null;
  organic_acids: Record<string, number> | null;
  carbohydrate_details: Record<string, number> | null;
  dietary_fiber: Record<string, number> | null;
  additional_nutrients: Record<string, number> | null;
  food_portions: Array<{ amount: number; gramWeight: number; description: string }> | null;
  ingredients: string | null;
  meta_flags: Record<string, Record<string, boolean>> | null;
}

function extractValue(entry: NutrientEntry | null | undefined): number | null {
  if (!entry || entry.value === null || entry.value === undefined) return null;
  return entry.value;
}

function compactSection(
  section: Record<string, NutrientEntry> | null | undefined,
  keyMap: Record<string, string>,
): Record<string, number> | null {
  if (!section) return null;
  const result: Record<string, number> = {};
  for (const [fullKey, shortKey] of Object.entries(keyMap)) {
    const entry = section[fullKey];
    const val = extractValue(entry);
    if (val !== null) {
      result[shortKey] = val;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function compactSectionRaw(
  section: Record<string, NutrientEntry> | null | undefined,
): Record<string, number> | null {
  if (!section) return null;
  const result: Record<string, number> = {};
  for (const [key, entry] of Object.entries(section)) {
    const val = extractValue(entry);
    if (val !== null) {
      result[key] = val;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Collects estimated/trace flags (non-default only) for meta_flags.
 */
function collectMetaFlags(
  section: Record<string, NutrientEntry> | null | undefined,
  sectionName: string,
): Record<string, boolean> | null {
  if (!section) return null;
  const flags: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(section)) {
    if (entry?.estimated) flags[`${key}.e`] = true;
    if (entry?.trace) flags[`${key}.t`] = true;
  }
  return Object.keys(flags).length > 0 ? flags : null;
}

function getGeneralValue(
  item: FoodItem,
  fieldName: string,
): number | null {
  const gc = item.generalComponents;
  if (!gc) return null;
  const entry = (gc as unknown as Record<string, NutrientEntry>)[fieldName];
  return extractValue(entry);
}

function computeDataQuality(item: FoodItem): number {
  const src = item.source ?? 'mext';
  if (src === 'mext') return 5;
  if (src === 'usda_foundation') return 4;

  // Count non-null minerals+vitamins
  let nutrientCount = 0;
  if (item.minerals) {
    for (const entry of Object.values(item.minerals)) {
      if (entry?.value !== null && entry?.value !== undefined) nutrientCount++;
    }
  }
  if (item.vitamins) {
    for (const entry of Object.values(item.vitamins)) {
      if (entry?.value !== null && entry?.value !== undefined) nutrientCount++;
    }
  }

  if (src === 'usda_sr_legacy') {
    return nutrientCount >= 10 ? 3 : 2;
  }
  if (src === 'usda_branded') {
    return nutrientCount >= 8 ? 3 : 2;
  }
  // usda_survey
  return nutrientCount >= 5 ? 2 : 1;
}

/**
 * Compacts food item without micronutrient JSONB columns.
 * Used with --slim flag to avoid re-bloating DB after Storage migration.
 */
export function compactSlim(item: FoodItem): {
  foodItem: CompactedFoodItem;
  details: CompactedDetails | null;
} {
  const result = compact(item);
  return {
    foodItem: {
      ...result.foodItem,
      minerals: null,
      vitamins: null,
    },
    details: result.details,
  };
}

export function compact(item: FoodItem): {
  foodItem: CompactedFoodItem;
  details: CompactedDetails | null;
} {
  const source = item.source ?? 'mext';

  const minerals = compactSection(
    item.minerals as unknown as Record<string, NutrientEntry> | null,
    MINERAL_KEY_MAP,
  );
  const vitamins = compactSection(
    item.vitamins as unknown as Record<string, NutrientEntry> | null,
    VITAMIN_KEY_MAP,
  );

  const foodItem: CompactedFoodItem = {
    food_code: item.foodCode,
    food_name: item.foodName,
    food_name_en: item.foodNameEn ?? null,
    category_name: item.categoryName,
    source,
    data_type: item.dataType ?? null,
    brand_owner: item.brandOwner ?? null,
    gtin_upc: item.gtinUpc ?? null,
    serving_size: item.servingSize ?? null,
    serving_size_unit: item.servingSizeUnit ?? null,
    data_quality: computeDataQuality(item),
    energy_kcal: getGeneralValue(item, 'energyKcal'),
    protein_g: getGeneralValue(item, 'protein'),
    fat_g: getGeneralValue(item, 'totalFat'),
    carbohydrate_g: getGeneralValue(item, 'carbohydrate'),
    fiber_g: getGeneralValue(item, 'dietaryFiberTotal'),
    sodium_mg: item.minerals?.sodium ? extractValue(item.minerals.sodium) : null,
    salt_equivalent_g: getGeneralValue(item, 'saltEquivalent'),
    cholesterol_mg: getGeneralValue(item, 'cholesterol'),
    minerals,
    vitamins,
  };

  // Build details (only if any detail data exists)
  const aminoAcids = compactSection(
    item.aminoAcids as unknown as Record<string, NutrientEntry> | null,
    AMINO_ACID_KEY_MAP,
  );
  const fattyAcids = compactSection(
    item.fattyAcids as unknown as Record<string, NutrientEntry> | null,
    FATTY_ACID_KEY_MAP,
  );
  const organicAcids = compactSectionRaw(
    item.organicAcids as unknown as Record<string, NutrientEntry> | null,
  );
  const carbohydrateDetails = compactSectionRaw(
    item.carbohydrateDetails as unknown as Record<string, NutrientEntry> | null,
  );
  const dietaryFiber = compactSectionRaw(
    item.dietaryFiber as unknown as Record<string, NutrientEntry> | null,
  );
  const additionalNutrients = compactSectionRaw(
    item.additionalNutrients as unknown as Record<string, NutrientEntry> | null,
  );

  // Collect meta flags from minerals and vitamins
  const mineralFlags = collectMetaFlags(
    item.minerals as unknown as Record<string, NutrientEntry> | null,
    'minerals',
  );
  const vitaminFlags = collectMetaFlags(
    item.vitamins as unknown as Record<string, NutrientEntry> | null,
    'vitamins',
  );
  let metaFlags: Record<string, Record<string, boolean>> | null = null;
  if (mineralFlags || vitaminFlags) {
    metaFlags = {};
    if (mineralFlags) metaFlags.minerals = mineralFlags;
    if (vitaminFlags) metaFlags.vitamins = vitaminFlags;
  }

  const hasDetails =
    aminoAcids ||
    fattyAcids ||
    organicAcids ||
    carbohydrateDetails ||
    dietaryFiber ||
    additionalNutrients ||
    item.foodPortions ||
    item.ingredients;

  const details: CompactedDetails | null = hasDetails
    ? {
        amino_acids: aminoAcids,
        fatty_acids: fattyAcids,
        organic_acids: organicAcids,
        carbohydrate_details: carbohydrateDetails,
        dietary_fiber: dietaryFiber,
        additional_nutrients: additionalNutrients,
        food_portions: item.foodPortions ?? null,
        ingredients: item.ingredients ?? null,
        meta_flags: metaFlags,
      }
    : null;

  return { foodItem, details };
}
