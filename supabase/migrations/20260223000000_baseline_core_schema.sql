-- Baseline core schema.
--
-- The core tables were originally created via the Supabase dashboard and never
-- versioned, so their RLS was unverifiable and a fresh `supabase db reset`
-- failed (later migrations ALTER tables that did not exist yet). This migration
-- reconstructs those tables from src/types/database.ts (the source of truth).
--
-- SAFETY: every statement is idempotent and safe to run against the LIVE
-- database where these tables already exist:
--   * CREATE TABLE IF NOT EXISTS  — skipped when the table already exists, so
--     inline constraints/uniques only shape a fresh reset and never touch live.
--   * ALTER TABLE ... ENABLE ROW LEVEL SECURITY — idempotent.
--   * DROP POLICY IF EXISTS before each CREATE POLICY.
--   * CREATE INDEX IF NOT EXISTS.
--
-- SCHEMA RECONSTRUCTION: tables are created with their ORIGINAL column set only.
-- Columns added by later migrations (annotated in database.ts, e.g. profiles
-- fasting_*/cycle_*, food_items food_score_*/carbon_*, commercial_products
-- tokuho_id, daily_summaries carbon/sleep columns, health_checkups advice_json)
-- are intentionally omitted here so those later migrations add them WITH their
-- CHECK/FK/index definitions on a fresh reset. Tables already created by other
-- migrations (push_tokens, food_item_details, fasting_sessions, sleep_records,
-- menstrual_cycles, tokuho_products, meal_plans, and the P0-P2 tables) are NOT
-- recreated here. badge_definitions/user_badges live in the release-hardening
-- migration.
--
-- KEY DECISION — profiles.id == auth.uid():
-- Every app write uses `user_id = auth.uid()`, and the later migrations declare
-- child tables (fasting_sessions, sleep_records, menstrual_cycles, meal_plans)
-- as `user_id references profiles(id)` while their RLS checks `auth.uid() =
-- user_id`. Both only hold when profiles.id equals the auth user id, so
-- profiles.id defaults to auth.uid(). Other user-owned tables reference
-- auth.users(id) directly, matching their `auth.uid() = user_id` policies.

-- ─── profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  height_cm numeric,
  weight_kg numeric,
  birth_date date,
  gender text check (gender in ('male', 'female', 'other')),
  activity_level text not null default 'moderate',
  goal text,
  target_weight_kg numeric,
  pace text,
  approach text,
  health_concerns text[] not null default '{}',
  is_premium boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── reference data: food_items (original columns; 20260227/0301/0303 add more) ─
create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  food_code text not null,
  food_name text not null,
  category_name text not null,
  energy_kcal numeric,
  protein_g numeric,
  fat_g numeric,
  carbohydrate_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  salt_equivalent_g numeric,
  cholesterol_mg numeric,
  minerals jsonb,
  vitamins jsonb,
  amino_acids jsonb,
  fatty_acids jsonb,
  nova_classification integer,
  traffic_light jsonb,
  created_at timestamptz not null default now()
);

-- ─── reference data: commercial_products (tokuho_id added by 20260303) ─────────
create table if not exists public.commercial_products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  product_name text not null,
  brand text,
  energy_kcal numeric,
  protein_g numeric,
  fat_g numeric,
  carbohydrate_g numeric,
  sodium_mg numeric,
  additives text[],
  upf_score numeric,
  nova_classification integer,
  image_url text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── meals (P0-P2 columns added by 20260716) ──────────────────────────────────
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null,
  eaten_at timestamptz not null default now(),
  image_url text,
  total_energy_kcal numeric,
  total_protein_g numeric,
  total_fat_g numeric,
  total_carbohydrate_g numeric,
  total_fiber_g numeric,
  total_sodium_mg numeric,
  meal_score numeric,
  traffic_light_overall text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_meals_user_eaten on public.meals (user_id, eaten_at desc);

-- ─── meal_items (P0-P2 columns added by 20260716) ─────────────────────────────
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  commercial_product_id uuid references public.commercial_products(id) on delete set null,
  ai_detected_name text not null,
  portion_grams numeric,
  confidence numeric,
  energy_kcal numeric,
  protein_g numeric,
  fat_g numeric,
  carbohydrate_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_meal_items_meal on public.meal_items (meal_id);

-- ─── nutrition_targets (history table, keyed by effective_from) ───────────────
create table if not exists public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  energy_kcal numeric not null,
  protein_g numeric not null,
  fat_g numeric not null,
  carbohydrate_g numeric not null,
  fiber_g numeric not null,
  sodium_mg numeric not null,
  salt_g numeric not null,
  cholesterol_mg numeric,
  potassium_mg numeric,
  calcium_mg numeric,
  iron_mg numeric,
  calculation_basis jsonb,
  effective_from date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_nutrition_targets_user_effective
  on public.nutrition_targets (user_id, effective_from desc);

-- ─── taste_preferences (one row per user) ─────────────────────────────────────
create table if not exists public.taste_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  salt_preference integer not null default 3,
  sweet_preference integer not null default 3,
  spicy_preference integer not null default 3,
  umami_preference integer not null default 3,
  dietary_restrictions text[] not null default '{}',
  disliked_ingredients text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── disease_profiles ─────────────────────────────────────────────────────────
create table if not exists public.disease_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  disease_type text not null,
  severity text check (severity in ('mild', 'moderate', 'severe')),
  diagnosed_at date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_disease_profiles_user on public.disease_profiles (user_id);

-- ─── health_checkups (advice_json added by 20260303) ──────────────────────────
create table if not exists public.health_checkups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkup_date date not null,
  image_url text,
  ldl_cholesterol numeric,
  hdl_cholesterol numeric,
  triglycerides numeric,
  systolic_bp integer,
  diastolic_bp integer,
  hba1c numeric,
  fasting_glucose numeric,
  uric_acid numeric,
  alt numeric,
  ast numeric,
  gamma_gtp numeric,
  creatinine numeric,
  egfr numeric,
  hemoglobin numeric,
  bmi numeric,
  raw_ocr_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_health_checkups_user_date
  on public.health_checkups (user_id, checkup_date desc);

-- ─── daily_health_data (one row per user per day) ─────────────────────────────
create table if not exists public.daily_health_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps integer,
  active_energy_kcal numeric,
  resting_heart_rate integer,
  sleep_hours numeric,
  weight_kg numeric,
  source text not null default 'healthkit',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ─── daily_summaries (carbon/sleep columns added by 20260303) ─────────────────
create table if not exists public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  total_energy_kcal numeric not null default 0,
  total_protein_g numeric not null default 0,
  total_fat_g numeric not null default 0,
  total_carbohydrate_g numeric not null default 0,
  total_fiber_g numeric not null default 0,
  total_sodium_mg numeric not null default 0,
  meal_count integer not null default 0,
  daily_score numeric,
  buffer_used_kcal numeric,
  feedback_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ─── weekly_buffers (one row per user per ISO week) ───────────────────────────
create table if not exists public.weekly_buffers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  buffer_total_kcal numeric not null default 0,
  buffer_used_kcal numeric not null default 0,
  buffer_total_sodium_mg numeric not null default 0,
  buffer_used_sodium_mg numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ─── suggestions ──────────────────────────────────────────────────────────────
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suggestion_type text not null
    check (suggestion_type in ('addition', 'cooking_hack', 'alternative', 'recovery')),
  title text not null,
  description text not null,
  reasoning text,
  related_meal_id uuid references public.meals(id) on delete set null,
  suggested_foods jsonb,
  is_dismissed boolean not null default false,
  is_applied boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_suggestions_user on public.suggestions (user_id, created_at desc);

-- ─── streaks (one row per user per streak type) ───────────────────────────────
create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  streak_type text not null,
  current_count integer not null default 0,
  longest_count integer not null default 0,
  last_recorded_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, streak_type)
);

-- ─── subscriptions (one row per user; writes via service-role webhook only) ───
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  revenucat_app_user_id text,
  plan text not null default 'free'
    check (plan in ('free', 'monthly', 'yearly', 'half_yearly')),
  status text not null default 'active'
    check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── RLS: user-owned tables ───────────────────────────────────────────────────
-- Standard ownership: the signed-in user may read/write only their own rows.
alter table public.profiles           enable row level security;
alter table public.nutrition_targets  enable row level security;
alter table public.taste_preferences  enable row level security;
alter table public.disease_profiles   enable row level security;
alter table public.meals              enable row level security;
alter table public.meal_items         enable row level security;
alter table public.health_checkups    enable row level security;
alter table public.daily_health_data  enable row level security;
alter table public.daily_summaries    enable row level security;
alter table public.weekly_buffers     enable row level security;
alter table public.suggestions        enable row level security;
alter table public.streaks            enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.food_items         enable row level security;
alter table public.commercial_products enable row level security;

do $$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'profiles', 'nutrition_targets', 'taste_preferences', 'disease_profiles',
    'meals', 'health_checkups', 'daily_health_data', 'daily_summaries',
    'weekly_buffers', 'suggestions', 'streaks'
  ] loop
    execute format('drop policy if exists %I on public.%I', owned_table || '_select_own', owned_table);
    execute format('drop policy if exists %I on public.%I', owned_table || '_insert_own', owned_table);
    execute format('drop policy if exists %I on public.%I', owned_table || '_update_own', owned_table);
    execute format('drop policy if exists %I on public.%I', owned_table || '_delete_own', owned_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      owned_table || '_select_own', owned_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      owned_table || '_insert_own', owned_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      owned_table || '_update_own', owned_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      owned_table || '_delete_own', owned_table
    );
  end loop;
end $$;

-- meal_items ownership is derived from the parent meal (no direct user_id).
-- These policies are also (re)created identically by 20260716; kept here so the
-- table is secured the moment it is created on a fresh reset.
drop policy if exists meal_items_select_own on public.meal_items;
drop policy if exists meal_items_insert_own on public.meal_items;
drop policy if exists meal_items_update_own on public.meal_items;
drop policy if exists meal_items_delete_own on public.meal_items;
create policy meal_items_select_own on public.meal_items for select to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));
create policy meal_items_insert_own on public.meal_items for insert to authenticated
  with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));
create policy meal_items_update_own on public.meal_items for update to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));
create policy meal_items_delete_own on public.meal_items for delete to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));

-- subscriptions: users may read their own row only. All writes go through the
-- service-role RevenueCat webhook (which bypasses RLS), so no write policy.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

-- ─── RLS: public reference data (read-only for everyone; writes via service role) ─
drop policy if exists food_items_read_all on public.food_items;
create policy food_items_read_all on public.food_items for select to anon, authenticated
  using (true);

drop policy if exists commercial_products_read_all on public.commercial_products;
create policy commercial_products_read_all on public.commercial_products for select to anon, authenticated
  using (true);

-- ─── is_premium protection ────────────────────────────────────────────────────
-- is_premium is billing-controlled. RLS lets a user UPDATE their own profile
-- row, but nothing must let them flip is_premium (that would grant premium for
-- free). A BEFORE UPDATE trigger reverts any is_premium change unless the caller
-- is the service role. This is more robust than column-level GRANTs because it
-- keeps protecting is_premium even as later migrations ADD new profile columns
-- (a column GRANT allowlist would have to be updated for every new column).
create or replace function public.enforce_profile_premium_lock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
begin
  if new.is_premium is distinct from old.is_premium and jwt_role <> 'service_role' then
    new.is_premium := old.is_premium;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_premium_lock on public.profiles;
create trigger profiles_enforce_premium_lock
  before update on public.profiles
  for each row execute function public.enforce_profile_premium_lock();

-- ─── get_food_categories RPC ──────────────────────────────────────────────────
-- The client calls supabase.rpc('get_food_categories') (src/services/food/
-- searchFood.ts) and falls back to manual aggregation if it is missing. Provide
-- it so a fresh reset matches the live behaviour: category name + item count.
create or replace function public.get_food_categories()
returns table (name text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select category_name as name, count(*) as count
  from public.food_items
  group by category_name
  order by count(*) desc;
$$;

-- ─── grants (mirror 20260716 style) ───────────────────────────────────────────
grant select, insert, update, delete on
  public.profiles, public.nutrition_targets, public.taste_preferences,
  public.disease_profiles, public.meals, public.meal_items,
  public.health_checkups, public.daily_health_data, public.daily_summaries,
  public.weekly_buffers, public.suggestions, public.streaks
  to authenticated;

grant select on public.subscriptions to authenticated;
grant select on public.food_items, public.commercial_products to anon, authenticated;
grant execute on function public.get_food_categories() to anon, authenticated;
