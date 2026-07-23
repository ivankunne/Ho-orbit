-- ============================================================================
-- Band riders: unlimited typed documents per band (technical/hospitality/
-- stage plot/input list/lighting/other), each with one or more uploaded
-- files, plus a public no-login share page.
--
-- Files reuse the existing public `band-media` Storage bucket (created in
-- orbit_workspace_migration.sql) under a `riders/` path prefix — this app has
-- no signed-URL/private-bucket precedent anywhere, and riders exist
-- specifically to be shared externally, so a public bucket is consistent
-- with every other upload in the app. The actual security boundary is the
-- unguessable per-rider `share_token`, same trust model as band invites.
--
-- Public reads go ONLY through get_public_rider(token) — deliberately no
-- anon RLS policy on band_riders/band_rider_files. A plain
-- `USING (is_share_enabled = true)` policy would look safe (this app's own
-- queries always filter by token) but RLS filters rows, not query shape: a
-- direct anon PostgREST call with no token filter would enumerate every
-- band's shared riders. Requiring the token as a function argument closes
-- that off structurally.
--
-- Backs src/services/riderService.ts, the Riders section in
-- BandSpaceDetailPage.tsx, and src/pages/PublicRiderPage.tsx.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS band_riders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id          UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL DEFAULT 'other'
                               CHECK (type IN ('technical', 'hospitality', 'stage_plot', 'input_list', 'lighting', 'other')),
  title            TEXT        NOT NULL,
  description      TEXT,
  share_token      TEXT        NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  is_share_enabled BOOLEAN     NOT NULL DEFAULT true,
  created_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_riders_band ON band_riders (band_id, type);

ALTER TABLE band_riders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view riders" ON band_riders;
CREATE POLICY "Members view riders" ON band_riders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM band_members WHERE band_id = band_riders.band_id AND user_id = auth.uid() AND status = 'active')
);

DROP POLICY IF EXISTS "Admins create riders" ON band_riders;
CREATE POLICY "Admins create riders" ON band_riders FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM band_members WHERE band_id = band_riders.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
);

DROP POLICY IF EXISTS "Admins update riders" ON band_riders;
CREATE POLICY "Admins update riders" ON band_riders FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM band_members WHERE band_id = band_riders.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM band_members WHERE band_id = band_riders.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
);

DROP POLICY IF EXISTS "Admins delete riders" ON band_riders;
CREATE POLICY "Admins delete riders" ON band_riders FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM band_members WHERE band_id = band_riders.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON band_riders TO authenticated;

CREATE TABLE IF NOT EXISTS band_rider_files (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id    UUID        NOT NULL REFERENCES band_riders(id) ON DELETE CASCADE,
  file_url    TEXT        NOT NULL,
  file_name   TEXT        NOT NULL,
  file_type   TEXT,
  size_bytes  BIGINT,
  uploaded_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_rider_files_rider ON band_rider_files (rider_id);

ALTER TABLE band_rider_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view rider files" ON band_rider_files;
CREATE POLICY "Members view rider files" ON band_rider_files FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_riders r JOIN band_members bm ON bm.band_id = r.band_id
    WHERE r.id = band_rider_files.rider_id AND bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins create rider files" ON band_rider_files;
CREATE POLICY "Admins create rider files" ON band_rider_files FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM band_riders r JOIN band_members bm ON bm.band_id = r.band_id
    WHERE r.id = band_rider_files.rider_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins delete rider files" ON band_rider_files;
CREATE POLICY "Admins delete rider files" ON band_rider_files FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_riders r JOIN band_members bm ON bm.band_id = r.band_id
    WHERE r.id = band_rider_files.rider_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
);

GRANT SELECT, INSERT, DELETE ON band_rider_files TO authenticated;

-- ─── Public share RPC ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_public_rider(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', r.id,
    'type', r.type,
    'title', r.title,
    'description', r.description,
    'band_name', b.name,
    'band_image_url', b.image_url,
    'files', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('id', f.id, 'file_url', f.file_url, 'file_name', f.file_name, 'file_type', f.file_type, 'size_bytes', f.size_bytes)
        ORDER BY f.created_at
      )
      FROM band_rider_files f WHERE f.rider_id = r.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM band_riders r JOIN bands b ON b.id = r.band_id
  WHERE r.share_token = p_token AND r.is_share_enabled = true;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_rider(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION regenerate_rider_share_token(p_rider_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_band_id uuid;
  v_new_token text := replace(gen_random_uuid()::text, '-', '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT band_id INTO v_band_id FROM band_riders WHERE id = p_rider_id;
  IF v_band_id IS NULL THEN
    RAISE EXCEPTION 'rider_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = v_band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE band_riders SET share_token = v_new_token, updated_at = now() WHERE id = p_rider_id;
  RETURN v_new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION regenerate_rider_share_token(uuid) TO authenticated;
