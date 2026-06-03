-- ============================================================================
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- to create the two tables the app needs but that don't exist yet:
--   • reviews     → venue/scene rating widgets
--   • band_todos  → BandSpace "Taken"
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

-- ── reviews ─────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('venue', 'scene')),
  resource_id   text not null,
  rating        int  not null check (rating between 1 and 5),
  review_text   text not null default '',
  user_id       uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists reviews_resource_idx on public.reviews (resource_type, resource_id);
alter table public.reviews enable row level security;

drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all" on public.reviews for select using (true);

drop policy if exists "reviews_insert_any" on public.reviews;
create policy "reviews_insert_any" on public.reviews for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews for delete using (user_id = auth.uid());

-- ── band_todos ──────────────────────────────────────────────────────────────
create table if not exists public.band_todos (
  id           uuid        primary key default gen_random_uuid(),
  band_id      uuid        not null references bands(id) on delete cascade,
  created_by   uuid        not null references profiles(id) on delete cascade,
  content      text        not null,
  completed    boolean     not null default false,
  completed_by uuid        references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_band_todos_band on band_todos (band_id, completed, created_at);
alter table public.band_todos enable row level security;

drop policy if exists "Band members manage todos" on band_todos;
create policy "Band members manage todos" on band_todos for all to authenticated
  using (exists (
    select 1 from band_members
    where band_members.band_id = band_todos.band_id
      and band_members.user_id = auth.uid()
      and band_members.status = 'active'
  ))
  with check (exists (
    select 1 from band_members
    where band_members.band_id = band_todos.band_id
      and band_members.user_id = auth.uid()
      and band_members.status = 'active'
  ));
