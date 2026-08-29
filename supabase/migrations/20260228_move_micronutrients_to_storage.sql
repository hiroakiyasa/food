-- =============================================================
-- Move micronutrient JSONB data to Supabase Storage
-- Data has been exported to food-data bucket before running this.
-- =============================================================

-- Step 1: NULL out low-frequency JSONB columns
-- (data preserved in Supabase Storage food-data/micronutrients/)
UPDATE food_items SET
  minerals = NULL,
  vitamins = NULL,
  amino_acids = NULL,
  fatty_acids = NULL,
  nova_classification = NULL,
  traffic_light = NULL;

-- Step 2: NULL out USDA-only metadata columns
-- (barcode lookup uses commercial_products table, not food_items)
UPDATE food_items SET
  gtin_upc = NULL,
  serving_size = NULL,
  serving_size_unit = NULL,
  data_type = NULL
WHERE source LIKE 'usda_%';

-- Step 3: Drop unused gtin_upc index
DROP INDEX IF EXISTS idx_food_items_gtin;

-- Step 4: Reclaim disk space
-- VACUUM FULL requires exclusive lock - run during low traffic
VACUUM FULL food_items;
REINDEX TABLE food_items;
