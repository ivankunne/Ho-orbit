-- ============================================================================
-- radio_streams.owner_id — pre-existing stations left unowned after the
-- "hosts manage only their own station" change (commit fdf8340, 2026-05-05).
--
-- That change started filtering the Radio page's Studio section by
-- owner_id = auth.uid(), but only NEW stations (created via the app's
-- "Zender toevoegen" form) get owner_id set on insert. Any station that
-- existed before that commit — e.g. the original "Vibez" station — still
-- has owner_id = NULL, so its host no longer sees it (or its live switch)
-- on the Radio page at all. They see the "connect your station" onboarding
-- prompt instead, which looks like the station disappeared.
--
-- Run in the Supabase Dashboard → SQL Editor.
-- ============================================================================

-- Step 1 — DIAGNOSE (read-only, run first)
-- Lists every unowned station next to every "Radio" role profile so you can
-- confirm which profile should own which station before changing anything.

select id, name, is_live, owner_id, created_at
from public.radio_streams
where owner_id is null
order by created_at;

select id, username, display_name, role
from public.profiles
where role = 'Radio'
order by created_at;

-- Step 2 — FIX (run only after confirming the match from Step 1)
-- Replace the placeholders below with the actual station id and profile id,
-- then run this single line per unowned station. Safe and reversible —
-- it only sets a foreign key, no data is deleted.

-- update public.radio_streams
--   set owner_id = '<profile-id-from-step-1>'
--   where id = '<station-id-from-step-1>';
