-- ================================================================
-- Migration: Feature B — 睡眠×栄養相関 + 月経周期×栄養管理
-- ================================================================

-- ---- 1. sleep_records: 詳細睡眠データ --------------------------------
CREATE TABLE IF NOT EXISTS sleep_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date                 DATE NOT NULL,
  duration_minutes     INTEGER,
  deep_sleep_minutes   INTEGER,
  rem_sleep_minutes    INTEGER,
  sleep_score          INTEGER CHECK (sleep_score BETWEEN 0 AND 100),
  source               TEXT NOT NULL DEFAULT 'healthkit',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sleep_records_user_date
  ON sleep_records (user_id, date DESC);

ALTER TABLE sleep_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sleep records"
  ON sleep_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- 2. daily_summaries: 睡眠相関列追加 --------------------------------
ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS caffeine_mg       NUMERIC,
  ADD COLUMN IF NOT EXISTS last_meal_time    TIME,
  ADD COLUMN IF NOT EXISTS evening_carbs_g   NUMERIC;

-- ---- 3. menstrual_cycles: 月経サイクル --------------------------------
CREATE TABLE IF NOT EXISTS menstrual_cycles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cycle_start    DATE NOT NULL,
  cycle_length   INTEGER NOT NULL DEFAULT 28,
  period_length  INTEGER NOT NULL DEFAULT 5,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menstrual_cycles_user_start
  ON menstrual_cycles (user_id, cycle_start DESC);

ALTER TABLE menstrual_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cycle records"
  ON menstrual_cycles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- 4. profiles: 月経周期設定列追加 --------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cycle_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS avg_cycle_length       INTEGER DEFAULT 28,
  ADD COLUMN IF NOT EXISTS last_period_start      DATE;
