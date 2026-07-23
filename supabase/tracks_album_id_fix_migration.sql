-- ============================================================================
-- FIX: adding a track to an album fails with
--   invalid input syntax for type bigint: "<album uuid>"
--
-- albums_migration.sql ran:
--   alter table public.tracks add column if not exists album_id uuid ...
-- but `tracks` already had a legacy `album_id bigint` column from earlier
-- dashboard scaffolding (same class of pre-existing-table conflict already
-- documented for the `albums` table itself in albums_migration.sql).
-- ADD COLUMN IF NOT EXISTS no-ops when the column already exists regardless
-- of its type, so `album_id` stayed `bigint` while the app has always tried
-- to write a real album UUID into it.
--
-- That legacy bigint column was never read or written by the app (uploadService.ts
-- only ever writes/reads it as a UUID, added alongside the new albums feature),
-- so any values currently in it are orphaned leftovers, not real data —
-- safe to drop and recreate with the correct type.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.tracks drop column if exists album_id;

alter table public.tracks
  add column if not exists album_id uuid references public.albums(id) on delete set null;

create index if not exists tracks_album_id_idx on public.tracks(album_id);
