-- ============================================================================
-- tracks — allow the uploader to edit/delete their own track
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- The app never had an edit/delete flow for uploaded tracks, so there was no
-- way to notice `tracks` had no owner-scoped UPDATE/DELETE policy. Adding
-- policies here is additive (RLS policies are OR'd per action) — if a
-- dashboard-made policy already grants this, this changes nothing; if none
-- exists, this is what makes the new edit/delete feature actually work
-- instead of silently failing like the profiles.booking_info bug did.
-- Safe to re-run.
--
-- Deliberately NOT touching `enable row level security` here — tracks is
-- already publicly browsable and upload works today, so RLS is either
-- already on with working SELECT/INSERT policies, or off entirely (in which
-- case these new policies are inert but harmless). Flipping it on blind,
-- without knowing the existing SELECT/INSERT policies, risks breaking public
-- track browsing and uploads outright. Check current status first if you
-- want RLS enabled — this migration only adds to what's already enforced.
-- ============================================================================

drop policy if exists "tracks_update_own" on public.tracks;
create policy "tracks_update_own" on public.tracks for update
  to authenticated
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

drop policy if exists "tracks_delete_own" on public.tracks;
create policy "tracks_delete_own" on public.tracks for delete
  to authenticated
  using (uploaded_by = auth.uid());
