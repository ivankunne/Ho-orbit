-- ============================================================================
-- Profit calculator for band_events: gage - travel - other costs, split
-- equally (computed on the fly, never persisted) or manually per member
-- (persisted in band_event_profit_splits).
--
-- Depends on band_events_enhancements_migration.sql (gage/travel_cost/
-- other_costs columns).
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

ALTER TABLE band_events
  ADD COLUMN IF NOT EXISTS profit_split_mode TEXT NOT NULL DEFAULT 'equal'
    CHECK (profit_split_mode IN ('equal', 'manual'));

CREATE TABLE IF NOT EXISTS band_event_profit_splits (
  event_id   UUID        NOT NULL REFERENCES band_events(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE band_event_profit_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view profit splits" ON band_event_profit_splits;
CREATE POLICY "Members view profit splits" ON band_event_profit_splits FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_profit_splits.event_id AND bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins create profit splits" ON band_event_profit_splits;
CREATE POLICY "Admins create profit splits" ON band_event_profit_splits FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_profit_splits.event_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins update profit splits" ON band_event_profit_splits;
CREATE POLICY "Admins update profit splits" ON band_event_profit_splits FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_profit_splits.event_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_profit_splits.event_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins delete profit splits" ON band_event_profit_splits;
CREATE POLICY "Admins delete profit splits" ON band_event_profit_splits FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM band_events e JOIN band_members bm ON bm.band_id = e.band_id
    WHERE e.id = band_event_profit_splits.event_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin') AND bm.status = 'active'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON band_event_profit_splits TO authenticated;
