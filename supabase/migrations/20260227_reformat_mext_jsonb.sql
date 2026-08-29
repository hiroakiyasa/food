-- Reformat existing MEXT food_items minerals/vitamins JSONB to use shortened keys.
-- Converts: { "calcium": { "value": 160, ... } } → { "ca": 160 }
-- Strips null values. Moves amino_acids/fatty_acids data to food_item_details.

-- 1. Reformat minerals JSONB (13 keys)
UPDATE food_items
SET minerals = (
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'na',  (minerals->'sodium'->>'value')::numeric,
    'k',   (minerals->'potassium'->>'value')::numeric,
    'ca',  (minerals->'calcium'->>'value')::numeric,
    'mg_', (minerals->'magnesium'->>'value')::numeric,
    'p',   (minerals->'phosphorus'->>'value')::numeric,
    'fe',  (minerals->'iron'->>'value')::numeric,
    'zn',  (minerals->'zinc'->>'value')::numeric,
    'cu',  (minerals->'copper'->>'value')::numeric,
    'mn',  (minerals->'manganese'->>'value')::numeric,
    'i',   (minerals->'iodine'->>'value')::numeric,
    'se',  (minerals->'selenium'->>'value')::numeric,
    'cr',  (minerals->'chromium'->>'value')::numeric,
    'mo',  (minerals->'molybdenum'->>'value')::numeric
  ))
)
WHERE source = 'mext'
  AND minerals IS NOT NULL
  AND minerals ? 'sodium';

-- 2. Reformat vitamins JSONB (22 keys)
UPDATE food_items
SET vitamins = (
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'ret',  (vitamins->'retinol'->>'value')::numeric,
    'acar', (vitamins->'alphaCarotene'->>'value')::numeric,
    'bcar', (vitamins->'betaCarotene'->>'value')::numeric,
    'bcry', (vitamins->'betaCryptoxanthin'->>'value')::numeric,
    'bce',  (vitamins->'betaCaroteneEquiv'->>'value')::numeric,
    'rae',  (vitamins->'retinolActivityEquiv'->>'value')::numeric,
    'vd',   (vitamins->'vitaminD'->>'value')::numeric,
    'at',   (vitamins->'alphaTocopherol'->>'value')::numeric,
    'bt',   (vitamins->'betaTocopherol'->>'value')::numeric,
    'gt',   (vitamins->'gammaTocopherol'->>'value')::numeric,
    'dt',   (vitamins->'deltaTocopherol'->>'value')::numeric,
    'vk',   (vitamins->'vitaminK'->>'value')::numeric,
    'b1',   (vitamins->'vitaminB1'->>'value')::numeric,
    'b2',   (vitamins->'vitaminB2'->>'value')::numeric,
    'nia',  (vitamins->'niacin'->>'value')::numeric,
    'nie',  (vitamins->'niacinEquiv'->>'value')::numeric,
    'b6',   (vitamins->'vitaminB6'->>'value')::numeric,
    'b12',  (vitamins->'vitaminB12'->>'value')::numeric,
    'fol',  (vitamins->'folate'->>'value')::numeric,
    'pa',   (vitamins->'pantothenicAcid'->>'value')::numeric,
    'bio',  (vitamins->'biotin'->>'value')::numeric,
    'vc',   (vitamins->'vitaminC'->>'value')::numeric
  ))
)
WHERE source = 'mext'
  AND vitamins IS NOT NULL
  AND vitamins ? 'retinol';

-- 3. Move existing amino_acids and fatty_acids to food_item_details for MEXT items
INSERT INTO food_item_details (food_item_id, amino_acids, fatty_acids)
SELECT
  id,
  amino_acids,
  fatty_acids
FROM food_items
WHERE source = 'mext'
  AND (amino_acids IS NOT NULL OR fatty_acids IS NOT NULL)
ON CONFLICT (food_item_id) DO UPDATE SET
  amino_acids = EXCLUDED.amino_acids,
  fatty_acids = EXCLUDED.fatty_acids;

-- 4. Clear amino_acids and fatty_acids from food_items (now in details)
UPDATE food_items
SET amino_acids = NULL, fatty_acids = NULL
WHERE source = 'mext'
  AND (amino_acids IS NOT NULL OR fatty_acids IS NOT NULL);
