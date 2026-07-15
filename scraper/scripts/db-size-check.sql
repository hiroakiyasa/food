-- =============================================================
-- DB Size Check Script
-- Run in Supabase Dashboard SQL Editor to diagnose storage usage.
-- =============================================================

-- 1. Overall database size
SELECT pg_size_pretty(pg_database_size(current_database())) AS total_db_size;

-- 2. Table sizes (data + toast, excluding indexes)
SELECT
  schemaname,
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_and_toast_size,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- 3. Index sizes for food_items
SELECT
  indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS scans,
  idx_tup_read AS tuples_read
FROM pg_stat_user_indexes
WHERE relname = 'food_items'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4. TOAST table size for food_items (JSONB columns stored here)
SELECT
  c.relname AS table_name,
  pg_size_pretty(pg_relation_size(t.oid)) AS toast_size
FROM pg_class c
JOIN pg_class t ON t.relname = 'pg_toast_' || c.oid
WHERE c.relname = 'food_items';

-- 5. Dead tuples estimate (vacuum needed?)
SELECT
  relname,
  n_live_tup,
  n_dead_tup,
  CASE WHEN n_live_tup > 0
    THEN round(100.0 * n_dead_tup / n_live_tup, 1)
    ELSE 0
  END AS dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 6. Column-level size estimate for food_items JSONB columns
SELECT
  'minerals' AS column_name,
  pg_size_pretty(sum(pg_column_size(minerals))) AS total_size,
  count(*) FILTER (WHERE minerals IS NOT NULL) AS non_null_count
FROM food_items
UNION ALL
SELECT
  'vitamins',
  pg_size_pretty(sum(pg_column_size(vitamins))),
  count(*) FILTER (WHERE vitamins IS NOT NULL)
FROM food_items
UNION ALL
SELECT
  'amino_acids',
  pg_size_pretty(sum(pg_column_size(amino_acids))),
  count(*) FILTER (WHERE amino_acids IS NOT NULL)
FROM food_items
UNION ALL
SELECT
  'fatty_acids',
  pg_size_pretty(sum(pg_column_size(fatty_acids))),
  count(*) FILTER (WHERE fatty_acids IS NOT NULL)
FROM food_items
UNION ALL
SELECT
  'traffic_light',
  pg_size_pretty(sum(pg_column_size(traffic_light))),
  count(*) FILTER (WHERE traffic_light IS NOT NULL)
FROM food_items;

-- 7. Estimated savings if JSONB columns are set to NULL
SELECT
  pg_size_pretty(
    sum(pg_column_size(minerals)) +
    sum(pg_column_size(vitamins)) +
    sum(pg_column_size(amino_acids)) +
    sum(pg_column_size(fatty_acids)) +
    sum(pg_column_size(nova_classification)) +
    sum(pg_column_size(traffic_light))
  ) AS estimated_savings_from_null;
