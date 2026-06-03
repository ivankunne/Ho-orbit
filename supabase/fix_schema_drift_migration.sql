-- ============================================================================
-- Schema-drift fixes — run once in the Supabase SQL editor
-- (Dashboard → SQL Editor → New query).
--
-- Fixes "Could not find the X column of <table> in the schema cache" errors
-- caused by tables that were hand-created in the dashboard and drifted away
-- from what the app code expects.
--
-- Covered here:
--   • hub_posts    → Hub forum threads (HubPage)  — missing author_id FK + columns
--   • hub_replies  → Hub forum replies            — missing author_id FK
--   • band_events  → BandSpace calendar pinning    — missing is_pinned/pinned_by
--
-- NOT covered (already fixed in code): the `events` create form now writes
-- `submitted_by_username` / `submitted_at` (the columns that actually exist),
-- so no DB change is needed there.
--
-- All three tables below are currently EMPTY, so this migration changes no data.
-- Safe to re-run (guarded with IF [NOT] EXISTS and catalog checks).
-- ============================================================================

-- ── hub_posts ────────────────────────────────────────────────────────────────
-- Code (HubPage.tsx) reads/writes: section, title, author_id (→profiles),
-- tags, replies_count, views_count, last_post_at, created_at and embeds
-- `profiles:author_id`. The table had `user_id` (no FK) and was missing the rest.

-- 1. Rename user_id → author_id to match the code and the rest of the app
--    (forum_threads, comments, band_posts all use author_id).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'hub_posts'
               and column_name = 'user_id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'hub_posts'
               and column_name = 'author_id')
  then
    alter table public.hub_posts rename column user_id to author_id;
  end if;
end $$;

-- 2. Add the columns the code expects.
alter table public.hub_posts
  add column if not exists author_id     uuid,
  add column if not exists title         text        not null default '',
  add column if not exists tags          text[]      not null default '{}',
  add column if not exists replies_count integer     not null default 0,
  add column if not exists views_count   integer     not null default 0,
  add column if not exists last_post_at  timestamptz;

-- `content` is not written by the post-create form; make sure it never blocks inserts.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'hub_posts'
               and column_name = 'content')
  then
    alter table public.hub_posts alter column content drop not null;
  end if;
end $$;

-- 3. FK so PostgREST can resolve the `profiles:author_id` embed.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hub_posts_author_id_fkey')
  then
    alter table public.hub_posts
      add constraint hub_posts_author_id_fkey
      foreign key (author_id) references public.profiles(id) on delete set null;
  end if;
end $$;

-- ── hub_replies ──────────────────────────────────────────────────────────────
-- Code reads/writes: post_id (→hub_posts), content, author_id (→profiles),
-- created_at. Embeds `profiles:author_id`. Table had user_id (no FK).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'hub_replies'
               and column_name = 'user_id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'hub_replies'
               and column_name = 'author_id')
  then
    alter table public.hub_replies rename column user_id to author_id;
  end if;
end $$;

alter table public.hub_replies
  add column if not exists author_id   uuid,
  add column if not exists likes_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hub_replies_author_id_fkey')
  then
    alter table public.hub_replies
      add constraint hub_replies_author_id_fkey
      foreign key (author_id) references public.profiles(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hub_replies_post_id_fkey')
  then
    alter table public.hub_replies
      add constraint hub_replies_post_id_fkey
      foreign key (post_id) references public.hub_posts(id) on delete cascade;
  end if;
end $$;

-- ── Row Level Security for the Hub tables ────────────────────────────────────
-- Mirrors the project pattern (see reviews / band_todos): public read,
-- authenticated users post as themselves. profiles.id == auth.uid() in this app.
alter table public.hub_posts   enable row level security;
alter table public.hub_replies enable row level security;

drop policy if exists "hub_posts_select"  on public.hub_posts;
create policy "hub_posts_select"  on public.hub_posts  for select using (true);

drop policy if exists "hub_posts_insert"  on public.hub_posts;
create policy "hub_posts_insert"  on public.hub_posts  for insert to authenticated
  with check (author_id = auth.uid());

-- Any authenticated user may bump replies_count / last_post_at when they reply.
drop policy if exists "hub_posts_update"  on public.hub_posts;
create policy "hub_posts_update"  on public.hub_posts  for update to authenticated
  using (true) with check (true);

drop policy if exists "hub_replies_select" on public.hub_replies;
create policy "hub_replies_select" on public.hub_replies for select using (true);

drop policy if exists "hub_replies_insert" on public.hub_replies;
create policy "hub_replies_insert" on public.hub_replies for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "hub_replies_update" on public.hub_replies;
create policy "hub_replies_update" on public.hub_replies for update to authenticated
  using (true) with check (true);

-- ── band_events : pinning ────────────────────────────────────────────────────
-- orbitService.pinBandEvent() / getPinnedEvents() use is_pinned; pin metadata
-- via pinned_by (matches band_messages pinning).
alter table public.band_events
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_band_events_pinned
  on public.band_events (band_id, is_pinned) where is_pinned = true;
