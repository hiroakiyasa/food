-- Add water_g column to food_items for direct tracking of water content.
-- Water is a fundamental food science measurement and warrants a direct DB column.
--
-- Migration steps:
-- 1. Add the column
-- 2. Backfill from amino_acids JSONB (h2o key) before JSONB NULL migration
-- 3. (After exportToStorage.ts runs) JSONB columns will be NULL-ed via separate migration

ALTER TABLE food_items ADD COLUMN IF NOT EXISTS water_g NUMERIC;

-- Backfill from amino_acids JSONB while the data still exists
UPDATE food_items
  SET water_g = (amino_acids->>'h2o')::NUMERIC
  WHERE water_g IS NULL
    AND amino_acids IS NOT NULL
    AND amino_acids->>'h2o' IS NOT NULL;

-- Also try from general_components if amino_acids doesn't have it
-- (MEXT source stores water in generalComponents)
UPDATE food_items
  SET water_g = (minerals->>'h2o')::NUMERIC
  WHERE water_g IS NULL
    AND minerals IS NOT NULL
    AND minerals->>'h2o' IS NOT NULL;

COMMENT ON COLUMN food_items.water_g IS '水分 (g per 100g). Backfilled from JSONB before Storage migration.';
