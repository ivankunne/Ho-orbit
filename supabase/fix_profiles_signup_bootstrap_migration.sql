-- ============================================================================
-- profiles — signup broke after fix_profiles_update_rls_migration.sql
--
-- That migration (correctly) locked UPDATE down to auth.uid() = id OR
-- is_admin(). But AuthContext.tsx's signup() calls .upsert() on `profiles`
-- for the *just-created* auth user BEFORE they confirm their email — at
-- that point there is no session yet, so the request is unauthenticated.
-- Something (a dashboard-configured trigger on auth.users, not tracked in
-- this repo — profiles itself was always dashboard-created) apparently
-- already inserts a bare stub profiles row at signup, so the client's own
-- upsert — the one that actually saves the role/location/etc the user just
-- chose — lands as an UPDATE, not an INSERT, and got blocked outright.
--
-- Confirmed against a real affected row (BLESZ, signed up 2026-07-30): he
-- picked "Artiest" on the signup form, but the saved row has role =
-- 'Luisteraar' (the bare stub) — his actual choice never landed, and the
-- app showed "profiel kon niet worden opgeslagen" on top of that.
--
-- Fix: widen the restrictive UPDATE policy with one narrow, safe exception —
-- a row is only bootstrap-writable by anon while created_at = updated_at,
-- i.e. it has never been touched since the instant it was created. Any real
-- account (logged in at least once, edited their profile, had a follower
-- count change, etc.) permanently fails that condition within moments of
-- creation, so this can never be used to touch an established profile — it
-- only ever lets a brand-new signup fill in its own still-pristine row
-- before it has a session to prove ownership normally.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

DROP POLICY IF EXISTS "profiles_update_self_or_admin_restrictive" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin_restrictive"
  ON public.profiles AS RESTRICTIVE FOR UPDATE
  TO public
  USING (auth.uid() = id OR public.is_admin() OR created_at = updated_at)
  WITH CHECK (auth.uid() = id OR public.is_admin() OR created_at = updated_at);
