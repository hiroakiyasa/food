-- Phase C: 特保DBと週間食事プラン
-- Feature 7: 特保（トクホ）・機能性表示食品データベース統合
-- Feature 5: AI週間適応型食事プラン生成

-- ────────────────────────────────────────────────
-- tokuho_products
-- ────────────────────────────────────────────────
CREATE TABLE tokuho_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number    TEXT UNIQUE,               -- 許可番号/届出番号
  product_name      TEXT NOT NULL,
  brand             TEXT,
  category          TEXT NOT NULL,             -- 'tokuho' | 'functional_claim'
  health_claims     TEXT[] NOT NULL DEFAULT '{}', -- 表示されている効能
  active_ingredients JSONB,                   -- 機能性関与成分 { name, amount_per_serving }
  jan_codes         TEXT[] NOT NULL DEFAULT '{}', -- JANコード (バーコード)
  expiry_date       DATE,                      -- 許可/届出有効期限
  product_url       TEXT,                      -- 消費者庁公式URL
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 検索インデックス
CREATE INDEX tokuho_products_jan_codes_idx ON tokuho_products USING GIN (jan_codes);
CREATE INDEX tokuho_products_category_idx ON tokuho_products (category);

-- RLS: 全ユーザー読み取り可能（マスタデータ）
ALTER TABLE tokuho_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokuho_products_readable_by_all"
  ON tokuho_products FOR SELECT
  USING (TRUE);

-- ────────────────────────────────────────────────
-- commercial_products に tokuho_id カラム追加
-- ────────────────────────────────────────────────
ALTER TABLE commercial_products
  ADD COLUMN IF NOT EXISTS tokuho_id UUID REFERENCES tokuho_products(id) ON DELETE SET NULL;

CREATE INDEX commercial_products_tokuho_id_idx
  ON commercial_products (tokuho_id)
  WHERE tokuho_id IS NOT NULL;

-- ────────────────────────────────────────────────
-- meal_plans (AI生成週間食事プラン)
-- ────────────────────────────────────────────────
CREATE TABLE meal_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,            -- 週の月曜日 (ISO week)
  plan_data     JSONB NOT NULL,           -- MealPlanDay[] 構造
  grocery_list  JSONB,                   -- GroceryCategory[] 構造
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, week_start)
);

CREATE INDEX meal_plans_user_week_idx ON meal_plans (user_id, week_start DESC);

-- RLS: 自分のプランのみ
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_plans_owner"
  ON meal_plans
  USING (auth.uid() = user_id);

CREATE POLICY "meal_plans_insert_owner"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);
