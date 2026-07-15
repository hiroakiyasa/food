-- Phase D: CO₂フットプリント + 健診AIアドバイス

-- ────────────────────────────────────────────────
-- food_items: 環境負荷データ列
-- ────────────────────────────────────────────────
ALTER TABLE food_items
  ADD COLUMN IF NOT EXISTS carbon_kg_per_100g  NUMERIC,  -- CO₂換算 kg / 食品100g
  ADD COLUMN IF NOT EXISTS water_liter_per_100g NUMERIC; -- 仮想水使用量 L / 食品100g

CREATE INDEX food_items_carbon_idx
  ON food_items (carbon_kg_per_100g)
  WHERE carbon_kg_per_100g IS NOT NULL;

-- ────────────────────────────────────────────────
-- daily_summaries: 日次CO₂集計
-- ────────────────────────────────────────────────
ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS total_carbon_kg NUMERIC,      -- 日次合計CO₂(kg)
  ADD COLUMN IF NOT EXISTS carbon_grade    TEXT;         -- 'A'〜'E'

-- ────────────────────────────────────────────────
-- health_checkups: AIアドバイスJSON
-- ────────────────────────────────────────────────
ALTER TABLE health_checkups
  ADD COLUMN IF NOT EXISTS advice_json JSONB;            -- CheckupAdvice 構造

-- ────────────────────────────────────────────────
-- profiles: GLP-1モード有効フラグ（条件で管理するため不要だが参照用）
-- ────────────────────────────────────────────────
-- GLP-1は active_conditions 配列で管理するため追加列は不要
