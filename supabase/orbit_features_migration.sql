-- ============================================================
-- Orbit Features Migration
-- Adds: Band Calendar, Shared Notes, @mention Notifications
-- Run once in Supabase SQL editor.
-- ============================================================

-- 1. Band Calendar events
CREATE TABLE IF NOT EXISTS band_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id     UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  event_date  DATE        NOT NULL,
  event_time  TIME,
  type        TEXT        NOT NULL DEFAULT 'other'
                          CHECK (type IN ('rehearsal', 'gig', 'deadline', 'other')),
  channel     TEXT,
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_events_lookup
  ON band_events (band_id, event_date);

-- 2. Per-channel shared notes (one note per channel per band)
CREATE TABLE IF NOT EXISTS band_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id     UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  channel     TEXT        NOT NULL,
  content     TEXT        NOT NULL DEFAULT '',
  updated_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (band_id, channel)
);

-- 3. @mention notifications
CREATE TABLE IF NOT EXISTS band_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id      UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  message_id   UUID        REFERENCES band_messages(id) ON DELETE CASCADE,
  channel      TEXT        NOT NULL,
  sender_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_notifications_recipient
  ON band_notifications (recipient_id, band_id, read_at)
  WHERE read_at IS NULL;

-- 4. Mentions array on band_messages (user IDs of @mentioned members)
ALTER TABLE band_messages
  ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';

-- ============================================================
-- RLS policies (enable RLS on the new tables if not using
-- service role — paste in SQL editor or Dashboard → Auth → Policies)
-- ============================================================
-- ALTER TABLE band_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE band_notes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE band_notifications ENABLE ROW LEVEL SECURITY;
--
-- Band members can read/write events and notes for their band:
-- CREATE POLICY "Band members manage events"
--   ON band_events FOR ALL TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM band_members
--     WHERE band_members.band_id = band_events.band_id
--       AND band_members.user_id = auth.uid()
--       AND band_members.status = 'active'
--   ));
--
-- CREATE POLICY "Band members manage notes"
--   ON band_notes FOR ALL TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM band_members
--     WHERE band_members.band_id = band_notes.band_id
--       AND band_members.user_id = auth.uid()
--       AND band_members.status = 'active'
--   ));
--
-- Users can read their own notifications:
-- CREATE POLICY "Users read own notifications"
--   ON band_notifications FOR SELECT TO authenticated
--   USING (recipient_id = auth.uid());
--
-- Authenticated users can insert notifications:
-- CREATE POLICY "Auth users insert notifications"
--   ON band_notifications FOR INSERT TO authenticated
--   WITH CHECK (true);
--
-- Users can mark their own notifications as read:
-- CREATE POLICY "Users update own notifications"
--   ON band_notifications FOR UPDATE TO authenticated
--   USING (recipient_id = auth.uid());
