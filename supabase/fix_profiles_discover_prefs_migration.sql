-- ============================================================================
-- profiles.discover_prefs — missing column breaking onboarding completion
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Found during the same audit that turned up profiles.booking_info: the
-- onboarding flow's final "finish" step bundles discover_prefs into the same
-- profiles UPDATE as needs_onboarding/preferred_genres/location/role. Since
-- the column didn't exist, PostgREST rejected the WHOLE update every time —
-- so needs_onboarding never actually flipped to false in the database, and
-- none of the onboarding answers (genres, city, role) were ever persisted,
-- even though the app moved the user past the onboarding screen locally.
--
-- Mirrors the existing `preferred_genres` column (text[], default '{}').
-- Safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists discover_prefs text[] not null default '{}';
