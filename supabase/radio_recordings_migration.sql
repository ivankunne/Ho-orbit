-- ============================================================================
-- Radio recordings — lets a station's host upload a recording of a past show
-- so listeners can play it back on-demand from the /radio page, separate from
-- the live stream_url on radio_streams.
--
-- Mirrors podcasts_migration.sql: public read, owner-only write (via the
-- owning station's owner_id), admin bypass. radio_streams itself has no repo
-- migration (dashboard-created — see [[schema-drift-dashboard-tables]]), but
-- this new table is defined here since it's a brand-new feature.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — every
-- statement is idempotent (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS).
-- ============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists public.radio_recordings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.radio_streams(id) on delete cascade,
  title text not null,
  description text,
  audio_url text not null,
  duration text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists radio_recordings_station_id_idx on public.radio_recordings(station_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.radio_recordings enable row level security;

-- Reuses the is_admin() helper already created by fix_radio_admin_rls_migration.sql / podcasts_migration.sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true);
$$;

-- public read
drop policy if exists "Public read radio_recordings" on public.radio_recordings;
create policy "Public read radio_recordings"
  on public.radio_recordings for select
  using (true);

-- owner manages recordings of their own station(s)
drop policy if exists "Owner manage own radio_recordings" on public.radio_recordings;
create policy "Owner manage own radio_recordings"
  on public.radio_recordings for all to authenticated
  using (exists (select 1 from public.radio_streams rs where rs.id = station_id and rs.owner_id = auth.uid()))
  with check (exists (select 1 from public.radio_streams rs where rs.id = station_id and rs.owner_id = auth.uid()));

-- admin bypass
drop policy if exists "Admin manage all radio_recordings" on public.radio_recordings;
create policy "Admin manage all radio_recordings"
  on public.radio_recordings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Realtime ────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.radio_recordings;
