-- ============================================================================
-- FIX: infinite recursion in band_members RLS (breaks bands, band creation,
-- and everything band-related with a 500)
--
-- band_roles_migration.sql's SELECT policy on band_members
-- ("Active members can view their band's members") queries band_members
-- from inside its own USING clause. Because every read of band_members must
-- satisfy that same SELECT policy — including the subquery inside the
-- policy itself — Postgres recurses into it forever:
--   ERROR: infinite recursion detected in policy for relation "band_members"
-- This also takes down every OTHER table whose RLS subqueries band_members
-- (e.g. bands' "Members can view private bands" policy), since their
-- subqueries inherit the same broken gate.
--
-- The previous policy ("Anyone can view band members", USING (true)) never
-- hit this because `true` has no self-reference to resolve — and the old
-- self-joining UPDATE/DELETE policies were safe only because THAT trivial
-- SELECT policy was what gated their inner subqueries, not a recursive one.
--
-- Fix: move the membership checks into SECURITY DEFINER functions, which
-- bypass RLS internally and so terminate immediately instead of recursing.
-- Applied to every band_members policy that self-references the table.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION is_active_band_member(p_band_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = p_band_id AND user_id = p_user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_active_band_admin(p_band_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = p_band_id AND user_id = p_user_id AND role IN ('owner', 'admin') AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION is_active_band_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_active_band_admin(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Active members can view their band's members" ON band_members;
CREATE POLICY "Active members can view their band's members" ON band_members
  FOR SELECT USING (is_active_band_member(band_id, auth.uid()));

DROP POLICY IF EXISTS "Owner or admin can update member status" ON band_members;
CREATE POLICY "Owner or admin can update member status" ON band_members
  FOR UPDATE USING (is_active_band_admin(band_id, auth.uid()));

DROP POLICY IF EXISTS "Pending requests can be cancelled or declined" ON band_members;
CREATE POLICY "Pending requests can be cancelled or declined" ON band_members
  FOR DELETE USING (
    status = 'pending' AND (auth.uid() = user_id OR is_active_band_admin(band_id, auth.uid()))
  );
