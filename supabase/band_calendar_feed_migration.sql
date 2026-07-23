-- ============================================================================
-- Read-only calendar export (ICS): a per-band feed token backing a public
-- webcal/ICS subscription URL served by the ics-feed Edge Function. External
-- calendars (Google/Outlook/Apple) can only ever READ this feed — there is
-- no write path back into the app, so h-orbit stays the single source of
-- truth, per the request.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

ALTER TABLE bands
  ADD COLUMN IF NOT EXISTS calendar_feed_token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');

UPDATE bands SET calendar_feed_token = replace(gen_random_uuid()::text, '-', '') WHERE calendar_feed_token IS NULL;

ALTER TABLE bands ALTER COLUMN calendar_feed_token SET NOT NULL;

CREATE OR REPLACE FUNCTION regenerate_calendar_feed_token(p_band_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token text := replace(gen_random_uuid()::text, '-', '');
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

  UPDATE bands SET calendar_feed_token = v_new_token WHERE id = p_band_id;
  RETURN v_new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION regenerate_calendar_feed_token(uuid) TO authenticated;
