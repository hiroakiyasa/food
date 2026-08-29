-- Release hardening: gamification tables, AI rate-limit counters, checkup bucket.
--
-- All statements are idempotent and safe against the live database.
--
-- NOTE — badge_definitions column shape:
-- The client (src/hooks/useBadges.ts) does `select('*')` and casts rows to
-- Database['public']['Tables']['badge_definitions']['Row'], which is
-- {id, name, description, icon, category, requirement (jsonb), created_at}.
-- database.ts is the source of truth, so this table matches that shape. The
-- badge emoji is stored in `icon` and the earn threshold in `requirement`
-- (rather than separate emoji/threshold/sort_order columns) so the existing
-- client keeps working unchanged.

-- ─── badge_definitions (public reference data) ────────────────────────────────
create table if not exists public.badge_definitions (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  category text not null,
  requirement jsonb not null,
  created_at timestamptz not null default now()
);

insert into public.badge_definitions (id, name, description, icon, category, requirement) values
  ('first-meal',     '初めての記録',       '最初の食事を記録しました',                 '🌱', 'milestone', '{"type": "meal_count", "threshold": 1}'),
  ('streak-3',       '3日連続',           '3日続けて記録しました',                     '🔥', 'streak',    '{"type": "streak_days", "threshold": 3}'),
  ('streak-7',       '7日連続',           '1週間続けて記録しました',                   '⭐', 'streak',    '{"type": "streak_days", "threshold": 7}'),
  ('streak-30',      '30日連続',          '30日続けて記録しました',                    '🏆', 'streak',    '{"type": "streak_days", "threshold": 30}'),
  ('meals-50',       '50食記録',          '合計50食を記録しました',                    '🍱', 'milestone', '{"type": "meal_count", "threshold": 50}'),
  ('meals-100',      '100食記録',         '合計100食を記録しました',                   '👑', 'milestone', '{"type": "meal_count", "threshold": 100}'),
  ('balance-day',    '栄養バランス達成日',  '1日の栄養バランス目標を達成しました',        '🌈', 'nutrition', '{"type": "balanced_day", "threshold": 1}'),
  ('early-bird',     '朝食マスター',       '朝食を7日記録しました',                     '🌅', 'habit',     '{"type": "breakfast_days", "threshold": 7}'),
  ('veggie-lover',   '野菜たっぷり',       '1週間しっかり野菜を摂りました',              '🥗', 'nutrition', '{"type": "veggie_week", "threshold": 7}'),
  ('checkup-import', '健診取り込み',       '健康診断の結果を取り込みました',             '📋', 'health',    '{"type": "checkup_import", "threshold": 1}')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  requirement = excluded.requirement;

alter table public.badge_definitions enable row level security;
drop policy if exists badge_definitions_read_all on public.badge_definitions;
create policy badge_definitions_read_all on public.badge_definitions for select to anon, authenticated
  using (true);

-- ─── user_badges (earned badges; one row per user per badge) ──────────────────
-- Keeps the `id` column from database.ts while enforcing one-badge-per-user via
-- the composite primary key.
create table if not exists public.user_badges (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badge_definitions(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id),
  unique (id)
);

alter table public.user_badges enable row level security;
drop policy if exists user_badges_select_own on public.user_badges;
drop policy if exists user_badges_insert_own on public.user_badges;
create policy user_badges_select_own on public.user_badges for select to authenticated
  using ((select auth.uid()) = user_id);
create policy user_badges_insert_own on public.user_badges for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ─── ai_usage_counters (per-user daily AI call counters) ──────────────────────
-- Service-role only: RLS is enabled with NO policies, so clients cannot read or
-- write it. Edge Functions increment it through increment_ai_usage() below.
create table if not exists public.ai_usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  function_name text not null,
  call_count integer not null default 0,
  primary key (user_id, usage_date, function_name)
);

alter table public.ai_usage_counters enable row level security;

-- Atomically bump today's counter for (user, function) and return the new count.
-- SECURITY DEFINER so it can write past RLS; callers are the service-role Edge
-- Functions. EXECUTE is granted to service_role only.
create or replace function public.increment_ai_usage(p_user_id uuid, p_function text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count integer;
begin
  insert into public.ai_usage_counters (user_id, usage_date, function_name, call_count)
  values (p_user_id, current_date, p_function, 1)
  on conflict (user_id, usage_date, function_name)
  do update set call_count = public.ai_usage_counters.call_count + 1
  returning call_count into new_count;
  return new_count;
end;
$$;

revoke execute on function public.increment_ai_usage(uuid, text) from public;
grant execute on function public.increment_ai_usage(uuid, text) to service_role;

-- ─── grants ───────────────────────────────────────────────────────────────────
grant select on public.badge_definitions to anon, authenticated;
grant select, insert on public.user_badges to authenticated;

-- ─── storage: checkup-images bucket (private, per-user folders) ───────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkup-images', 'checkup-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists checkup_images_select_own on storage.objects;
drop policy if exists checkup_images_insert_own on storage.objects;
drop policy if exists checkup_images_update_own on storage.objects;
drop policy if exists checkup_images_delete_own on storage.objects;
create policy checkup_images_select_own on storage.objects for select to authenticated
  using (bucket_id = 'checkup-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy checkup_images_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'checkup-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy checkup_images_update_own on storage.objects for update to authenticated
  using (bucket_id = 'checkup-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'checkup-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy checkup_images_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'checkup-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
