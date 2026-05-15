-- Masterclass archive (Producers, Mixers, Masters, Bookers)
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS masterclasses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL CHECK (category IN ('producer', 'mixer', 'master', 'booker')),
  video_url        TEXT,
  thumbnail_url    TEXT,
  instructor_name  TEXT,
  instructor_avatar TEXT,
  duration         TEXT,
  is_free          BOOLEAN DEFAULT true,
  views_count      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE masterclasses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view masterclasses" ON masterclasses FOR SELECT USING (true);
-- Only admins insert/update via Supabase dashboard or service role
