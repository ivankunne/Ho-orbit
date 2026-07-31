-- ============================================================================
-- Band rehearsal recordings — lets any active band member upload an audio
-- clip from a rehearsal, browsable in its own "Opnames" tab in BandSpace.
--
-- Deliberately NOT bolted onto the existing "Repetities" chat channel:
-- band_messages.attachment_type is CHECKed to only 'image' | 'video' | 'file'
-- (see orbit_workspace_migration.sql), and the chat UI has no audio player —
-- an audio file dropped in chat today renders as a plain "Bijlage" download
-- link. A dedicated table + panel gives rehearsal clips a real list with
-- playback, mirroring how radio_recordings/podcast_episodes work.
--
-- Files reuse the existing public `audio` Storage bucket (already used for
-- tracks/podcasts/radio) via the same resumable/TUS uploadAudioFile() upload
-- path in src/services/uploadService.ts — rehearsal clips can run long and
-- that bucket already has the large-file-safe upload plumbing. Path prefix:
-- rehearsals/<band_id>/...
--
-- Permissions: any active band member can upload; only the uploader or a
-- band owner/admin can edit/delete — same pattern as band_project_ideas.
-- No platform-admin (is_admin()) bypass, unlike tracks/radio/podcasts —
-- rehearsal clips are band-private content, not platform-moderated.
--
-- Backs src/services/bandRehearsalService.ts and the "Opnames" section in
-- BandSpaceDetailPage.tsx (src/components/BandRehearsalsPanel.tsx).
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — every
-- statement is idempotent (CREATE TABLE IF NOT EXISTS / DROP POLICY IF
-- EXISTS + CREATE POLICY), except the ALTER PUBLICATION line at the bottom
-- which only needs to run once (matches the existing convention in
-- radio_recordings_migration.sql / podcasts_migration.sql).
-- ============================================================================

CREATE TABLE IF NOT EXISTS band_rehearsal_recordings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id     UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  uploaded_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  audio_url   TEXT        NOT NULL,
  duration    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_rehearsal_recordings_band ON band_rehearsal_recordings (band_id, created_at DESC);

ALTER TABLE band_rehearsal_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view rehearsal recordings" ON band_rehearsal_recordings;
CREATE POLICY "Members view rehearsal recordings" ON band_rehearsal_recordings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM band_members WHERE band_id = band_rehearsal_recordings.band_id AND user_id = auth.uid() AND status = 'active')
);

DROP POLICY IF EXISTS "Members upload rehearsal recordings" ON band_rehearsal_recordings;
CREATE POLICY "Members upload rehearsal recordings" ON band_rehearsal_recordings FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (SELECT 1 FROM band_members WHERE band_id = band_rehearsal_recordings.band_id AND user_id = auth.uid() AND status = 'active')
);

DROP POLICY IF EXISTS "Uploader or admin update rehearsal recordings" ON band_rehearsal_recordings;
CREATE POLICY "Uploader or admin update rehearsal recordings" ON band_rehearsal_recordings FOR UPDATE TO authenticated USING (
  uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM band_members WHERE band_id = band_rehearsal_recordings.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
) WITH CHECK (
  uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM band_members WHERE band_id = band_rehearsal_recordings.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
);

DROP POLICY IF EXISTS "Uploader or admin delete rehearsal recordings" ON band_rehearsal_recordings;
CREATE POLICY "Uploader or admin delete rehearsal recordings" ON band_rehearsal_recordings FOR DELETE TO authenticated USING (
  uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM band_members WHERE band_id = band_rehearsal_recordings.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON band_rehearsal_recordings TO authenticated;

-- ─── Realtime ────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE band_rehearsal_recordings;
