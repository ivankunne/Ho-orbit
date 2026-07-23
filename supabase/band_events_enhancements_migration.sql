-- ============================================================================
-- Band calendar enhancements: general info, contacts, financials, agreements,
-- RSVP — and finally enabling real RLS on band_events.
--
-- band_events RLS was NEVER actually turned on: the policy block in
-- orbit_features_migration.sql (lines 60-96) was left entirely commented
-- out, while fix_band_grants_migration.sql grants full table privileges to
-- `authenticated`. Net effect until this migration: any logged-in user could
-- read/write/delete ANY band's calendar, not just their own. This migration
-- splits it into member-read / admin-write, as originally intended.
--
-- Backs the extended BandEvent type + new contact/RSVP functions in
-- src/services/orbitService.ts, and the tabbed event modal in
-- BandSpaceDetailPage.tsx.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- ─── 1. Enable RLS on band_events (member-read / admin-write) ─────────────────

ALTER TABLE band_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members view events" ON band_events;
CREATE POLICY "Band members view events" ON band_events FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_events.band_id AND user_id = auth.uid() AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins create events" ON band_events;
CREATE POLICY "Admins create events" ON band_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_events.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins update events" ON band_events;
CREATE POLICY "Admins update events" ON band_events FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_events.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_events.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins delete events" ON band_events;
CREATE POLICY "Admins delete events" ON band_events FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_members
    WHERE band_id = band_events.band_id AND user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- ─── 2. General info, financial, agreements columns ────────────────────────────

ALTER TABLE band_events
  ADD COLUMN IF NOT EXISTS end_time     TIME,
  ADD COLUMN IF NOT EXISTS location     TEXT,
  ADD COLUMN IF NOT EXISTS address      TEXT,
  ADD COLUMN IF NOT EXISTS maps_link    TEXT,
  ADD COLUMN IF NOT EXISTS gage         NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS travel_cost  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS other_costs  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS is_paid      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreements   TEXT;

-- ─── 3. Contacts (one-to-many, normalized like band_project_assignments) ──────

CREATE TABLE IF NOT EXISTS band_event_contacts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES band_events(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  role       TEXT,
  phone      TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_event_contacts_event ON band_event_contacts (event_id);

ALTER TABLE band_event_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view event contacts" ON band_event_contacts;
CREATE POLICY "Members view event contacts" ON band_event_contacts FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_contacts.event_id AND bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins create event contacts" ON band_event_contacts;
CREATE POLICY "Admins create event contacts" ON band_event_contacts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_contacts.event_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins update event contacts" ON band_event_contacts;
CREATE POLICY "Admins update event contacts" ON band_event_contacts FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_contacts.event_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_contacts.event_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins delete event contacts" ON band_event_contacts;
CREATE POLICY "Admins delete event contacts" ON band_event_contacts FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_contacts.event_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON band_event_contacts TO authenticated;

-- ─── 4. RSVPs — every member manages their own row; admins/owner see all ──────

CREATE TABLE IF NOT EXISTS band_event_rsvps (
  event_id   UUID        NOT NULL REFERENCES band_events(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL CHECK (status IN ('yes', 'no', 'maybe')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE band_event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view event rsvps" ON band_event_rsvps;
CREATE POLICY "Members view event rsvps" ON band_event_rsvps FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_rsvps.event_id AND bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Members create own rsvp" ON band_event_rsvps;
CREATE POLICY "Members create own rsvp" ON band_event_rsvps FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_rsvps.event_id AND bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Members update own rsvp" ON band_event_rsvps;
CREATE POLICY "Members update own rsvp" ON band_event_rsvps FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members delete own rsvp" ON band_event_rsvps;
CREATE POLICY "Members delete own rsvp" ON band_event_rsvps FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON band_event_rsvps TO authenticated;
