ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_conditions TEXT[] DEFAULT '{}';

COMMENT ON COLUMN profiles.active_conditions
  IS '選択中の栄養管理条件サブカテゴリ名の配列';
