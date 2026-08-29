-- Food Data Integration: 468K food items support
-- Adds columns to food_items, creates food_item_details, adds indexes

-- 0. Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Add columns to food_items
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'mext';
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS food_name_en TEXT;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS data_type TEXT;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS brand_owner TEXT;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS gtin_upc TEXT;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS serving_size NUMERIC;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS serving_size_unit TEXT;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS data_quality SMALLINT DEFAULT 3;

-- 2. Create food_item_details table (detailed nutrients for ~16K items)
CREATE TABLE IF NOT EXISTS food_item_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  food_item_id UUID REFERENCES food_items(id) ON DELETE CASCADE UNIQUE,
  amino_acids JSONB,
  fatty_acids JSONB,
  organic_acids JSONB,
  carbohydrate_details JSONB,
  dietary_fiber JSONB,
  additional_nutrients JSONB,
  food_portions JSONB,
  ingredients TEXT,
  meta_flags JSONB
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_food_items_source ON food_items(source);
CREATE INDEX IF NOT EXISTS idx_food_items_gtin ON food_items(gtin_upc)
  WHERE gtin_upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category_name);
CREATE INDEX IF NOT EXISTS idx_food_items_name_trgm
  ON food_items USING gin(food_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_food_items_data_quality
  ON food_items(data_quality DESC);

-- 4. RLS for food_item_details
ALTER TABLE food_item_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read food_item_details"
  ON food_item_details FOR SELECT USING (true);

-- 5. Backfill source column for existing MEXT records
UPDATE food_items SET source = 'mext' WHERE source IS NULL;
