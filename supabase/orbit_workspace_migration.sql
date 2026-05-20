-- ============================================================
-- Orbit Workspace Migration
-- Extends band_messages with media attachments + pinned messages.
-- Run once in Supabase SQL editor before deploying the new UI.
-- ============================================================

-- 1. Media attachment support (used by all channels; drag-drop in Orbit - Media)
ALTER TABLE band_messages
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT
    CHECK (attachment_type IN ('image', 'video', 'file'));

-- 2. Pinned message support (admins can pin; everyone sees the pin bar)
ALTER TABLE band_messages
  ADD COLUMN IF NOT EXISTS is_pinned  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_by  UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Index to efficiently fetch pinned messages per channel
CREATE INDEX IF NOT EXISTS idx_band_messages_pinned
  ON band_messages (band_id, channel, is_pinned)
  WHERE is_pinned = TRUE;

-- ============================================================
-- Supabase Storage bucket for band media
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('band-media', 'band-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Auth users upload band media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'band-media');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Auth users delete own band media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'band-media' AND auth.uid() = owner);

-- Allow public read
CREATE POLICY "Public read band media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'band-media');
