-- ============================================================================
-- Band roles overhaul: Owner / Admin / Member
--
-- Introduces a real 'owner' tier on band_members.role (previously just
-- 'admin' | 'member' by convention, no DB constraint). Guarantees exactly
-- one active owner per band, and routes every membership-changing action
-- (leave, remove, promote, demote, transfer ownership, delete band) through
-- SECURITY DEFINER RPCs that raise specific, catchable errors — not bare
-- RLS-gated client writes, which silently affect 0 rows on a blocked
-- DELETE/UPDATE instead of failing loudly.
--
-- Backs src/lib/bandPermissions.ts and the membership functions added to
-- src/services/orbitService.ts, plus the role UI in BandSpaceDetailPage.tsx.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — every
-- statement is idempotent (DROP POLICY/CONSTRAINT IF EXISTS, CREATE OR
-- REPLACE, the backfill DO block guards itself with an EXISTS check).
-- ============================================================================

-- ─── 1. Backfill: ensure every band has exactly one active 'owner' ────────────
-- Preference order: the band's created_by row, else the earliest active
-- admin, else the earliest active member. Bands with no active members are
-- left as-is (nothing to own).

DO $$
DECLARE
  b RECORD;
  v_owner_member_id UUID;
BEGIN
  FOR b IN SELECT id, created_by FROM bands LOOP
    IF EXISTS (
      SELECT 1 FROM band_members
      WHERE band_id = b.id AND role = 'owner' AND status = 'active'
    ) THEN
      CONTINUE;
    END IF;

    v_owner_member_id := NULL;

    SELECT id INTO v_owner_member_id FROM band_members
      WHERE band_id = b.id AND user_id = b.created_by AND status = 'active'
      LIMIT 1;

    IF v_owner_member_id IS NULL THEN
      SELECT id INTO v_owner_member_id FROM band_members
        WHERE band_id = b.id AND role = 'admin' AND status = 'active'
        ORDER BY joined_at ASC LIMIT 1;
    END IF;

    IF v_owner_member_id IS NULL THEN
      SELECT id INTO v_owner_member_id FROM band_members
        WHERE band_id = b.id AND status = 'active'
        ORDER BY joined_at ASC LIMIT 1;
    END IF;

    IF v_owner_member_id IS NOT NULL THEN
      UPDATE band_members SET role = 'owner' WHERE id = v_owner_member_id;
    END IF;
  END LOOP;
END $$;

-- ─── 2. Constrain role to the three-tier model + enforce single active owner ──

ALTER TABLE band_members DROP CONSTRAINT IF EXISTS band_members_role_check;
ALTER TABLE band_members ADD CONSTRAINT band_members_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_band_members_one_active_owner
  ON band_members (band_id) WHERE role = 'owner' AND status = 'active';

-- ─── 3. Tighten band_members RLS ───────────────────────────────────────────────
-- SELECT: only active members of the same band (was previously USING (true)).
-- INSERT: unchanged self-request-to-join, tightened to explicitly pin
--         role/status so a direct REST call can't self-insert as an active
--         admin/owner.
-- UPDATE: column-grant restricted below to `status` only — role changes must
--         go through the SECURITY DEFINER RPCs, which run as the table owner
--         and bypass this restriction (same mechanism join_band_with_token
--         already relies on for RLS).
-- DELETE: only pending rows may be deleted directly (self-cancel or
--         admin/owner decline). Active-row removal (leave / kicked) must go
--         through leave_band() / remove_band_member() — a DELETE blocked by
--         RLS silently affects 0 rows, which is the wrong UX for a rule like
--         "the owner must transfer ownership first".

DROP POLICY IF EXISTS "Anyone can view band members" ON band_members;
CREATE POLICY "Active members can view their band's members" ON band_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM band_members bm2
      WHERE bm2.band_id = band_members.band_id
        AND bm2.user_id = auth.uid() AND bm2.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can join bands" ON band_members;
CREATE POLICY "Users can request to join as pending member" ON band_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND role = 'member' AND status = 'pending'
  );

DROP POLICY IF EXISTS "Admins can update member status" ON band_members;
CREATE POLICY "Owner or admin can update member status" ON band_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM band_members bm2
      WHERE bm2.band_id = band_members.band_id
        AND bm2.user_id = auth.uid() AND bm2.role IN ('owner', 'admin') AND bm2.status = 'active'
    )
  );

REVOKE UPDATE ON band_members FROM authenticated;
GRANT UPDATE (status) ON band_members TO authenticated;

DROP POLICY IF EXISTS "Users can leave bands" ON band_members;
DROP POLICY IF EXISTS "Admins can remove members" ON band_members;
DROP POLICY IF EXISTS "Admins or self can remove members" ON band_members;
CREATE POLICY "Pending requests can be cancelled or declined" ON band_members
  FOR DELETE USING (
    status = 'pending' AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM band_members bm2
        WHERE bm2.band_id = band_members.band_id
          AND bm2.user_id = auth.uid() AND bm2.role IN ('owner', 'admin') AND bm2.status = 'active'
      )
    )
  );

-- ─── 4. Regressions to fix: existing policies that only checked role='admin' ──
-- These bands/band_posts writes would otherwise break for every band whose
-- sole admin was just backfilled to 'owner' above.

DROP POLICY IF EXISTS "Band admins can update" ON bands;
CREATE POLICY "Band admins can update" ON bands FOR UPDATE USING (
  id IN (SELECT band_id FROM band_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active')
);

DROP POLICY IF EXISTS "Owner can delete band" ON bands;
CREATE POLICY "Owner can delete band" ON bands FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = bands.id AND user_id = auth.uid() AND role = 'owner' AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins manage band posts" ON band_posts;
CREATE POLICY "Admins manage band posts" ON band_posts FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_members bm
    WHERE bm.band_id = band_posts.band_id
      AND bm.user_id = auth.uid() AND bm.status = 'active' AND bm.role IN ('admin', 'owner')
  )
);

-- ─── 5. Membership RPCs ────────────────────────────────────────────────────────
-- All SECURITY DEFINER (bypass RLS/column-grants, same mechanism as the
-- existing join_band_with_token). Each raises a specific, catchable
-- exception string on an invariant violation; the service layer maps these
-- to Dutch toast copy.

CREATE OR REPLACE FUNCTION leave_band(p_band_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_role text;
  v_other_leaders int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, role INTO v_member_id, v_role
    FROM band_members WHERE band_id = p_band_id AND user_id = auth.uid() AND status = 'active';

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  IF v_role = 'owner' THEN
    RAISE EXCEPTION 'owner_must_transfer_first';
  END IF;

  IF v_role = 'admin' THEN
    SELECT count(*) INTO v_other_leaders FROM band_members
      WHERE band_id = p_band_id AND status = 'active' AND role IN ('owner', 'admin') AND id <> v_member_id;
    IF v_other_leaders = 0 THEN
      RAISE EXCEPTION 'last_admin_cannot_leave';
    END IF;
  END IF;

  DELETE FROM band_members WHERE id = v_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION leave_band(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION remove_band_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_band_id uuid;
  v_target_role text;
  v_target_user uuid;
  v_caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT band_id, role, user_id INTO v_band_id, v_target_role, v_target_user
    FROM band_members WHERE id = p_member_id;

  IF v_band_id IS NULL THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  IF v_target_user = auth.uid() THEN
    RAISE EXCEPTION 'cannot_remove_self';
  END IF;

  SELECT role INTO v_caller_role FROM band_members
    WHERE band_id = v_band_id AND user_id = auth.uid() AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'cannot_remove_owner';
  END IF;

  IF v_target_role = 'admin' AND v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'only_owner_can_remove_admin';
  END IF;

  DELETE FROM band_members WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_band_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION promote_to_admin(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_band_id uuid;
  v_target_role text;
  v_target_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT band_id, role, status INTO v_band_id, v_target_role, v_target_status
    FROM band_members WHERE id = p_member_id;

  IF v_band_id IS NULL THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = v_band_id AND user_id = auth.uid() AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only_owner_can_promote';
  END IF;

  IF v_target_status <> 'active' THEN
    RAISE EXCEPTION 'member_not_active';
  END IF;

  IF v_target_role <> 'member' THEN
    RAISE EXCEPTION 'already_admin_or_owner';
  END IF;

  UPDATE band_members SET role = 'admin' WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION promote_to_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION demote_to_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_band_id uuid;
  v_target_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT band_id, role INTO v_band_id, v_target_role
    FROM band_members WHERE id = p_member_id;

  IF v_band_id IS NULL THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = v_band_id AND user_id = auth.uid() AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only_owner_can_demote';
  END IF;

  IF v_target_role <> 'admin' THEN
    RAISE EXCEPTION 'not_an_admin';
  END IF;

  UPDATE band_members SET role = 'member' WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION demote_to_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION transfer_band_ownership(p_band_id uuid, p_new_owner_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_member_id uuid;
  v_target_member_id uuid;
  v_target_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_new_owner_user_id = auth.uid() THEN
    RAISE EXCEPTION 'already_owner';
  END IF;

  SELECT id INTO v_caller_member_id FROM band_members
    WHERE band_id = p_band_id AND user_id = auth.uid() AND role = 'owner' AND status = 'active';

  IF v_caller_member_id IS NULL THEN
    RAISE EXCEPTION 'only_owner_can_transfer';
  END IF;

  SELECT id, status INTO v_target_member_id, v_target_status FROM band_members
    WHERE band_id = p_band_id AND user_id = p_new_owner_user_id;

  IF v_target_member_id IS NULL OR v_target_status <> 'active' THEN
    RAISE EXCEPTION 'target_not_active_member';
  END IF;

  -- Order matters: demote the old owner first so the partial unique index
  -- (one active owner per band) never has to hold two owner rows at once.
  UPDATE band_members SET role = 'admin' WHERE id = v_caller_member_id;
  UPDATE band_members SET role = 'owner' WHERE id = v_target_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_band_ownership(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION delete_band(p_band_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = p_band_id AND user_id = auth.uid() AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only_owner_can_delete_band';
  END IF;

  -- Cascades to band_members/band_messages/band_events/band_posts/band_projects/
  -- etc. via their existing ON DELETE CASCADE foreign keys.
  DELETE FROM bands WHERE id = p_band_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_band(uuid) TO authenticated;

-- ============================================================================
-- Diagnostic: run after backfill to confirm every band has exactly one
-- active owner (should return zero rows).
-- ============================================================================
-- SELECT b.id, b.name, count(*) FILTER (WHERE bm.role = 'owner' AND bm.status = 'active') AS owners
-- FROM bands b LEFT JOIN band_members bm ON bm.band_id = b.id
-- GROUP BY b.id, b.name HAVING count(*) FILTER (WHERE bm.role = 'owner' AND bm.status = 'active') <> 1;
