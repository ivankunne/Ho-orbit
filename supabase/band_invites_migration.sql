-- ============================================================================
-- Secure band invites — replaces the single static, non-expiring,
-- non-approved bands.invite_token (band_invite_token_migration.sql) with a
-- real per-invite row: expiring (7 days), single-use, email-bound, plus a
-- direct-add path for users who already have an account.
--
-- join_band_with_token(p_token text) KEEPS its exact name and signature —
-- only its body changes to read band_invites instead of bands.invite_token.
-- This means src/pages/JoinBandPage.tsx, src/components/InviteResumer.tsx and
-- src/lib/invite.ts need ZERO code changes; the route
-- /bandspace/join/:token keeps working exactly as before.
--
-- Backs src/services/bandInviteService.ts and the invite UI in
-- BandSpaceDetailPage.tsx's share modal.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — every
-- statement is idempotent.
-- ============================================================================

-- ─── 1. band_invites table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS band_invites (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id      UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  token        TEXT        NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  email        TEXT        NOT NULL,
  invited_name TEXT,
  role         TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at  TIMESTAMPTZ,
  accepted_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_invites_band_status
  ON band_invites (band_id, status);

CREATE INDEX IF NOT EXISTS idx_band_invites_email_status
  ON band_invites (email, status);

ALTER TABLE band_invites ENABLE ROW LEVEL SECURITY;

-- Only owner/admin of the band may see or manage its invites — a plain
-- member seeing pending invites (and their tokens) would let them bypass
-- "admin decides who joins". This is deliberately narrower than the usual
-- "any active member" template used elsewhere (e.g. band_projects).
DROP POLICY IF EXISTS "Band admins manage invites" ON band_invites;
CREATE POLICY "Band admins manage invites" ON band_invites FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_invites.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_invites.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON band_invites TO authenticated;

-- ─── 2. Drop the old static link — no more public/guessable join links ────────

ALTER TABLE bands DROP COLUMN IF EXISTS invite_token;

-- ─── 3. Rewrite join_band_with_token — same name/signature, new backing store ─

CREATE OR REPLACE FUNCTION join_band_with_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite band_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_invite FROM band_invites WHERE token = p_token;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  -- Idempotent for the caller who already redeemed it: the auto-link trigger
  -- (profiles AFTER INSERT) may have already accepted this same invite for
  -- this same user moments earlier during registration, before JoinBandPage/
  -- InviteResumer got a chance to call this RPC with the stashed token.
  IF v_invite.status = 'accepted' AND v_invite.accepted_by = auth.uid() THEN
    RETURN v_invite.band_id;
  END IF;

  IF v_invite.status = 'accepted' OR v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;

  IF v_invite.status = 'expired' OR v_invite.expires_at < now() THEN
    UPDATE band_invites SET status = 'expired' WHERE id = v_invite.id AND status = 'pending';
    RAISE EXCEPTION 'invite_expired';
  END IF;

  INSERT INTO band_members (band_id, user_id, role, status)
  VALUES (v_invite.band_id, auth.uid(), v_invite.role, 'active')
  ON CONFLICT (band_id, user_id) DO UPDATE SET status = 'active';

  UPDATE band_invites
    SET status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
    WHERE id = v_invite.id;

  RETURN v_invite.band_id;
END;
$$;

GRANT EXECUTE ON FUNCTION join_band_with_token(text) TO authenticated;

-- ─── 4. Invite management RPCs ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_band_invite(
  p_band_id uuid, p_email text, p_invited_name text, p_role text DEFAULT 'member'
)
RETURNS band_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_row band_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = p_band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_email IS NULL OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM band_members bm JOIN profiles pr ON pr.id = bm.user_id
    WHERE bm.band_id = p_band_id AND bm.status = 'active' AND lower(pr.email) = v_email
  ) THEN
    RAISE EXCEPTION 'already_a_member';
  END IF;

  -- Resend: refresh an existing pending invite (and rotate its token) instead
  -- of creating a duplicate row.
  UPDATE band_invites
    SET role = p_role, invited_name = p_invited_name, invited_by = auth.uid(),
        expires_at = now() + interval '7 days',
        token = replace(gen_random_uuid()::text, '-', '')
    WHERE band_id = p_band_id AND email = v_email AND status = 'pending'
    RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    INSERT INTO band_invites (band_id, email, invited_name, role, invited_by)
    VALUES (p_band_id, v_email, p_invited_name, p_role, auth.uid())
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION create_band_invite(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION revoke_band_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_band_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT band_id INTO v_band_id FROM band_invites WHERE id = p_invite_id;
  IF v_band_id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = v_band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE band_invites SET status = 'revoked' WHERE id = p_invite_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_band_invite(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION add_band_member_direct(p_band_id uuid, p_user_id uuid, p_role text DEFAULT 'member')
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
    WHERE band_id = p_band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM band_members WHERE band_id = p_band_id AND user_id = p_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'already_a_member';
  END IF;

  INSERT INTO band_members (band_id, user_id, role, status)
  VALUES (p_band_id, p_user_id, p_role, 'active')
  ON CONFLICT (band_id, user_id) DO UPDATE
    SET status = 'active', role = EXCLUDED.role
    WHERE band_members.role <> 'owner';
END;
$$;

GRANT EXECUTE ON FUNCTION add_band_member_direct(uuid, uuid, text) TO authenticated;

-- Search existing users to add directly (Option A). Never echoes email back —
-- only public profile fields — even when the match was by email.
CREATE OR REPLACE FUNCTION search_profiles_for_invite(p_query text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;

  IF p_query ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN QUERY
      SELECT p.id, p.username, p.display_name, p.avatar_url
      FROM profiles p WHERE lower(p.email) = lower(trim(p_query)) LIMIT 5;
  ELSE
    RETURN QUERY
      SELECT p.id, p.username, p.display_name, p.avatar_url
      FROM profiles p
      WHERE p.username ILIKE '%' || trim(p_query) || '%'
         OR p.display_name ILIKE '%' || trim(p_query) || '%'
      ORDER BY p.username LIMIT 8;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION search_profiles_for_invite(text) TO authenticated;

-- ─── 5. Auto-link on registration ──────────────────────────────────────────────
-- Fallback for people who register with the invited email directly (e.g. via
-- plain /signup) instead of clicking the invite link. Wrapped in its own
-- exception handler so a bug here can never break signup itself.

CREATE OR REPLACE FUNCTION auto_link_pending_band_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  IF NEW.email IS NOT NULL THEN
    BEGIN
      FOR inv IN
        SELECT * FROM band_invites
        WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND expires_at > now()
      LOOP
        INSERT INTO band_members (band_id, user_id, role, status)
        VALUES (inv.band_id, NEW.id, inv.role, 'active')
        ON CONFLICT (band_id, user_id) DO UPDATE SET status = 'active';

        UPDATE band_invites
          SET status = 'accepted', accepted_at = now(), accepted_by = NEW.id
          WHERE id = inv.id;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'auto_link_pending_band_invites failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_band_invites ON profiles;
CREATE TRIGGER trg_auto_link_band_invites
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_link_pending_band_invites();
