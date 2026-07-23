-- ============================================================================
-- Albums — lets an artist group their own tracks into an album (title, cover
-- art, release date, genre, description). Optional: a track can stay a
-- standalone single with no album. No new moderation — tracks inside an
-- album keep going through the existing per-track pending/approved/rejected
-- review, unchanged.
--
-- Mirrors the podcasts_migration.sql pattern (public read, owner-only write,
-- admin bypass) since albums are publicly viewable content, same as shows.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — every
-- statement is idempotent (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS / ADD COLUMN IF NOT EXISTS).
--
-- NOTE: an unrelated `albums` table already existed in this project (old,
-- unused dashboard scaffolding — never read/written by the app, which only
-- ever read a dead `artist.albums` JSONB field, not a real table). Because
-- `CREATE TABLE IF NOT EXISTS` no-ops when a table of that name already
-- exists — regardless of its columns — the first run of this migration
-- failed with `column "owner_id" does not exist`. The guard below drops that
-- old table ONLY if it's confirmed empty, then this migration creates the
-- real one fresh. If it ever has rows for some reason, the guard leaves it
-- alone (so re-running this file is always safe either way).
-- ============================================================================

do $$
begin
  if to_regclass('public.albums') is not null
     and (select count(*) from public.albums) = 0 then
    execute 'drop table public.albums cascade';
  end if;
end $$;

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists public.albums (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  genre        text,
  cover_url    text,
  release_date date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists albums_owner_id_idx on public.albums(owner_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.albums enable row level security;

-- Reuses the is_admin() helper already created by fix_radio_admin_rls_migration.sql / podcasts_migration.sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true);
$$;

drop policy if exists "Public read albums" on public.albums;
create policy "Public read albums"
  on public.albums for select
  using (true);

drop policy if exists "Owner manage own albums" on public.albums;
create policy "Owner manage own albums"
  on public.albums for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Admin manage all albums" on public.albums;
create policy "Admin manage all albums"
  on public.albums for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Table-level GRANTs from day one — supabase/fix_band_grants_migration.sql
-- exists specifically because earlier tables had correct RLS but no GRANT to
-- `authenticated`, causing blanket 403s (Postgres checks GRANTs before RLS).
-- Don't repeat that bug class here.
grant select on public.albums to anon, authenticated;
grant insert, update, delete on public.albums to authenticated;

-- ─── Link tracks → albums ────────────────────────────────────────────────────
-- ON DELETE SET NULL: deleting an album never deletes its tracks — they just
-- become ungrouped singles again, matching the "albums are optional" design.

alter table public.tracks
  add column if not exists album_id uuid references public.albums(id) on delete set null;

create index if not exists tracks_album_id_idx on public.tracks(album_id);
