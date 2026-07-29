-- ============================================================================
-- radio_streams — add a `cover_url` column
--
-- Lets a station upload/change a cover image, shown wherever the station
-- appears (station list, studio row, "now playing" radio player). Purely
-- additive — nullable, no backfill needed; falls back to the Radio icon
-- everywhere in the UI when null, same as before this migration.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.radio_streams
  add column if not exists cover_url text;
