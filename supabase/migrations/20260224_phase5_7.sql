-- Phase 5-B: Push Notifications
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Phase 6-A: RevenueCat IAP
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS revenucat_app_user_id TEXT;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'monthly', 'yearly', 'half_yearly'));
