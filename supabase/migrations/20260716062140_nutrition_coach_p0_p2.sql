-- P0-P2 nutrition coach foundation.
-- User data stays private; public reference food data is intentionally untouched.

alter table public.meals
  add column if not exists client_updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists analysis_metadata jsonb not null default '{}'::jsonb;

alter table public.meal_items
  add column if not exists estimate_basis text,
  add column if not exists database_source text,
  add column if not exists portion_min_grams numeric,
  add column if not exists portion_max_grams numeric,
  add column if not exists energy_min_kcal numeric,
  add column if not exists energy_max_kcal numeric,
  add column if not exists salt_equivalent_g numeric,
  add column if not exists hidden_ingredient_flags text[] not null default '{}';

create index if not exists meals_user_client_updated_idx
  on public.meals (user_id, client_updated_at desc);
create index if not exists meals_user_eaten_active_idx
  on public.meals (user_id, eaten_at desc) where deleted_at is null;

create table if not exists public.meal_analysis_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete cascade,
  event_type text not null check (event_type in ('analyzed', 'corrected', 'accepted', 'failed')),
  model text,
  detected_items integer,
  corrected_items integer not null default 0,
  latency_ms integer,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.nutrition_coaching_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  estimated_expenditure_kcal numeric,
  recommended_energy_kcal numeric not null,
  recommended_protein_g numeric not null,
  confidence numeric not null check (confidence between 0 and 1),
  weight_trend_kg numeric,
  logging_coverage numeric not null default 0,
  explanation text not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.behavior_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  hunger integer check (hunger between 1 and 5),
  energy integer check (energy between 1 and 5),
  mood integer check (mood between 1 and 5),
  context text,
  tiny_action text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create table if not exists public.user_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_url text,
  servings numeric not null default 1 check (servings > 0),
  cooked_weight_g numeric,
  ingredients jsonb not null default '[]'::jsonb,
  instructions text[] not null default '{}',
  nutrients_per_serving jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meal_analysis_events enable row level security;
alter table public.nutrition_coaching_checkins enable row level security;
alter table public.behavior_checkins enable row level security;
alter table public.user_recipes enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'meals', 'meal_analysis_events', 'nutrition_coaching_checkins',
    'behavior_checkins', 'user_recipes'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own', table_name
    );
  end loop;
end $$;

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

grant select, insert, update, delete on public.meals, public.meal_items,
  public.meal_analysis_events, public.nutrition_coaching_checkins,
  public.behavior_checkins, public.user_recipes to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-images', 'meal-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists meal_images_select_own on storage.objects;
drop policy if exists meal_images_insert_own on storage.objects;
drop policy if exists meal_images_update_own on storage.objects;
drop policy if exists meal_images_delete_own on storage.objects;
create policy meal_images_select_own on storage.objects for select to authenticated
  using (bucket_id = 'meal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy meal_images_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy meal_images_update_own on storage.objects for update to authenticated
  using (bucket_id = 'meal-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'meal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy meal_images_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'meal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
