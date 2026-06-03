-- ============================================================
-- FIX: "Creating a band is not possible" / 403 on band_* tables
-- ============================================================
-- Root cause: the `authenticated` Postgres role is missing table
-- privileges on the band_* tables. RLS is enabled and the policies
-- are correct, but Postgres checks table GRANTs BEFORE RLS — so a
-- logged-in user (role `authenticated`) is rejected with HTTP 403
-- (42501) before any policy is evaluated. `anon` still has the grant,
-- which is why logged-OUT browsing of public bands works but
-- logged-IN reads/creates fail.
--
-- A 403 (not 401) on a plain SELECT can ONLY be a table-privilege
-- denial: an expired/invalid token returns 401, and RLS row-filtering
-- returns 200 with fewer rows. So the fix is to (re)grant privileges
-- to `authenticated` and let RLS do the row-level gating.
--
-- Run once in the Supabase SQL editor.
-- ============================================================

-- 1. Table privileges. RLS still gates which ROWS each user sees;
--    these grants only let the role reach the policies at all.
GRANT SELECT                         ON bands              TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE         ON bands              TO authenticated;

GRANT SELECT                         ON band_members       TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE         ON band_members       TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON band_messages      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON band_events        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON band_notes         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON band_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON band_posts         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON band_todos         TO authenticated;

-- 2. Let a creator read back the band they just inserted.
--    Without this, creating a PRIVATE band succeeds but the
--    INSERT ... RETURNING (.select().single()) returns 0 rows
--    (no SELECT policy matches yet — the band isn't public and the
--    creator's band_members row doesn't exist at that instant),
--    so the app reports "Aanmaken mislukt" even though the row exists.
DROP POLICY IF EXISTS "Creators can view their bands" ON bands;
CREATE POLICY "Creators can view their bands" ON bands
  FOR SELECT USING (created_by = auth.uid());

-- 3. (Optional hardening) Ensure a user can only create bands owned
--    by themselves. The app always sets created_by = the current user.
DROP POLICY IF EXISTS "Authenticated users can create bands" ON bands;
CREATE POLICY "Authenticated users can create bands" ON bands
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ============================================================
-- Diagnostic: run this BEFORE and AFTER to confirm the grants.
-- `authenticated` should appear with SELECT/INSERT/UPDATE/DELETE.
-- ============================================================
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name = 'bands'
-- ORDER BY grantee, privilege_type;
