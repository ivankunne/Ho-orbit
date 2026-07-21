-- ============================================================================
-- profiles.booking_info — missing column breaking every profile settings save
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- AccountPage's "Profielgegevens" save (ProfielSection.handleSave) always
-- includes booking_info in a single `profiles` UPDATE, even when the user
-- only changed something else (display name, bio, social links, genres…).
-- Because that column didn't exist, PostgREST rejected the WHOLE update —
-- not just the booking fields — so nothing on that form actually persisted,
-- even though the app showed a false "Opgeslagen!" success message (that
-- silent-failure bug is fixed separately in AccountPage.tsx).
--
-- Mirrors the existing `social` column (jsonb, default '{}'). Safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists booking_info jsonb not null default '{}'::jsonb;
