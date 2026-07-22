-- ============================================================================
-- Podcasts feature — new tables for the /podcasts page.
--
-- Mirrors the radio_streams pattern: public read for listeners, owner-only
-- write for the hosting user (profiles.role = 'Podcast'), plus an admin
-- bypass so admins can manage every show. Unlike radio_streams this table
-- IS defined here in the repo (radio_streams/profiles were dashboard-created
-- — see [[schema-drift-dashboard-tables]] in memory — this migration avoids
-- repeating that drift for a brand-new feature).
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — every
-- statement is idempotent (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS).
-- ============================================================================

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  genre text,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  title text not null,
  description text,
  audio_url text not null,
  duration text,
  episode_number int,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists podcast_episodes_podcast_id_idx on public.podcast_episodes(podcast_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.podcasts enable row level security;
alter table public.podcast_episodes enable row level security;

-- Reuses the is_admin() helper already created by fix_radio_admin_rls_migration.sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true);
$$;

-- podcasts: public read
drop policy if exists "Public read podcasts" on public.podcasts;
create policy "Public read podcasts"
  on public.podcasts for select
  using (true);

-- podcasts: owner manages their own show(s)
drop policy if exists "Owner manage own podcasts" on public.podcasts;
create policy "Owner manage own podcasts"
  on public.podcasts for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- podcasts: admin bypass
drop policy if exists "Admin manage all podcasts" on public.podcasts;
create policy "Admin manage all podcasts"
  on public.podcasts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- podcast_episodes: public read
drop policy if exists "Public read podcast_episodes" on public.podcast_episodes;
create policy "Public read podcast_episodes"
  on public.podcast_episodes for select
  using (true);

-- podcast_episodes: owner manages episodes of their own show(s)
drop policy if exists "Owner manage own podcast_episodes" on public.podcast_episodes;
create policy "Owner manage own podcast_episodes"
  on public.podcast_episodes for all to authenticated
  using (exists (select 1 from public.podcasts p where p.id = podcast_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.podcasts p where p.id = podcast_id and p.owner_id = auth.uid()));

-- podcast_episodes: admin bypass
drop policy if exists "Admin manage all podcast_episodes" on public.podcast_episodes;
create policy "Admin manage all podcast_episodes"
  on public.podcast_episodes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Needed so PodcastContext's postgres_changes subscription receives events
-- (radio_streams already has this enabled from its dashboard setup).

alter publication supabase_realtime add table public.podcasts;
alter publication supabase_realtime add table public.podcast_episodes;
