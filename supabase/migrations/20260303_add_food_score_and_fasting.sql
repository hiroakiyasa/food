-- ================================================================
-- Migration: Feature A - 食品スコア (Nutri-Score型) + 断食タイマー
-- ================================================================

-- ---- 1. food_items: スコア列追加 --------------------------------
ALTER TABLE food_items
  ADD COLUMN IF NOT EXISTS food_score_grade TEXT CHECK (food_score_grade IN ('A','B','C','D','E')),
  ADD COLUMN IF NOT EXISTS food_score_value NUMERIC CHECK (food_score_value >= 0 AND food_score_value <= 100),
  ADD COLUMN IF NOT EXISTS processing_level INTEGER CHECK (processing_level BETWEEN 1 AND 4);

CREATE INDEX IF NOT EXISTS idx_food_items_food_score_grade
  ON food_items (food_score_grade);

-- ---- 2. daily_summaries: 平均食品スコア列追加 -------------------
ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS avg_food_score NUMERIC,
  ADD COLUMN IF NOT EXISTS diet_quality_grade TEXT CHECK (diet_quality_grade IN ('A','B','C','D','E'));

-- ---- 3. fasting_sessions: 断食セッションテーブル ---------------
CREATE TABLE IF NOT EXISTS fasting_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  protocol      TEXT NOT NULL,               -- '16:8','18:6','20:4','OMAD','5:2','custom'
  window_start  TIMESTAMPTZ,                 -- 断食開始時刻
  window_end    TIMESTAMPTZ,                 -- 断食終了時刻（予定）
  eating_start  TIMESTAMPTZ,                 -- 食事ウィンドウ開始（実績）
  eating_end    TIMESTAMPTZ,                 -- 食事ウィンドウ終了（実績）
  fast_hours    INTEGER NOT NULL DEFAULT 16, -- 断食時間（時間）
  eat_hours     INTEGER NOT NULL DEFAULT 8,  -- 食事ウィンドウ（時間）
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fasting_sessions_user_id
  ON fasting_sessions (user_id, created_at DESC);

-- RLS設定
ALTER TABLE fasting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own fasting sessions"
  ON fasting_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- 4. profiles: 断食設定列追加 --------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS fasting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fasting_protocol TEXT DEFAULT '16:8',
  ADD COLUMN IF NOT EXISTS fasting_eat_start_hour INTEGER DEFAULT 12, -- 食事ウィンドウ開始 (0-23)
  ADD COLUMN IF NOT EXISTS fasting_eat_end_hour INTEGER DEFAULT 20;   -- 食事ウィンドウ終了 (0-23)
