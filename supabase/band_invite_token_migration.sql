-- ============================================================
-- Band Invite Links
-- Gives every band a stable invite token and a secure RPC that
-- lets the invited person join DIRECTLY as an active member —
-- no admin approval, and works for private bands too.
-- Run once in the Supabase SQL editor.
-- ============================================================

-- 1. Token column on bands (random, unique, dependency-free generator)
ALTER TABLE bands ADD COLUMN IF NOT EXISTS invite_token TEXT;

UPDATE bands
  SET invite_token = replace(gen_random_uuid()::text, '-', '')
  WHERE invite_token IS NULL;

ALTER TABLE bands
  ALTER COLUMN invite_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');
ALTER TABLE bands
  ALTER COLUMN invite_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bands_invite_token ON bands (invite_token);

-- 2. Secure direct-join via token.
--    SECURITY DEFINER so it can bypass RLS to add the caller as an
--    ACTIVE member (and re-activate a previously pending/declined row).
--    The token is the authorization: without it you cannot join.
CREATE OR REPLACE FUNCTION join_band_with_token(p_token text)
RETURNS uuid
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

  SELECT id INTO v_band_id FROM bands WHERE invite_token = p_token;
  IF v_band_id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  INSERT INTO band_members (band_id, user_id, role, status)
  VALUES (v_band_id, auth.uid(), 'member', 'active')
  ON CONFLICT (band_id, user_id)
  DO UPDATE SET status = 'active';

  RETURN v_band_id;
END;
$$;

GRANT EXECUTE ON FUNCTION join_band_with_token(text) TO authenticated;
