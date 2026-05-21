-- ============================================================
-- Orbit Band Home Migration
-- Adds band_posts table for the Band Home page (announcements,
-- updates, setlists — posted by admins, visible to all members
-- and to the public if the band is public).
-- Run once in Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS band_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id    UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT,
  content    TEXT        NOT NULL,
  image_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_posts_band
  ON band_posts (band_id, created_at DESC);

ALTER TABLE band_posts ENABLE ROW LEVEL SECURITY;

-- Public bands: anyone can read posts. Private bands: active members only.
CREATE POLICY "Read band posts"
  ON band_posts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM bands b WHERE b.id = band_posts.band_id AND b.is_public = true)
    OR
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_posts.band_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
    )
  );

-- Only admins can create/delete posts
CREATE POLICY "Admins manage band posts"
  ON band_posts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM band_members bm
      WHERE bm.band_id = band_posts.band_id
        AND bm.user_id = auth.uid()
        AND bm.status  = 'active'
        AND bm.role    = 'admin'
    )
  );
