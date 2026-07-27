-- ============================================================================
-- tracks — add a `lyrics` column
--
-- Adds static (non-synced) song lyrics: entered on upload/edit, shown in the
-- player's expanded "Nu aan het spelen" panel while the track plays. Purely
-- additive — nullable, no backfill needed, existing rows are unaffected.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.tracks
  add column if not exists lyrics text;
