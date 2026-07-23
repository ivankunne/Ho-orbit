-- ============================================================================
-- Recurring events: never/daily/weekly/monthly/yearly, "every N", specific
-- weekdays, until-date or occurrence-count — with each occurrence stored as
-- a REAL band_events row (materialized), not an RRULE string expanded on the
-- fly. See supabase/band_events_enhancements_migration.sql for why: every
-- feature already added (contacts, financials, RSVP, profit splits) FKs to
-- band_events.id, so materialized rows mean "edit/skip one occurrence"
-- reuses the existing updateBandEvent/deleteBandEvent functions untouched.
--
-- Recurrence config columns are only meaningful on the parent row
-- (parent_event_id IS NULL) — occurrence rows are otherwise ordinary
-- band_events rows, so every RLS policy from band_events_enhancements
-- already covers them with zero changes.
--
-- Materialization is capped client-side (2 years / 200 occurrences,
-- whichever first, see src/lib/recurrence.ts) — this project has no cron/
-- task-runner infra for lazy horizon extension.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

ALTER TABLE band_events
  ADD COLUMN IF NOT EXISTS parent_event_id         UUID REFERENCES band_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recurrence_freq          TEXT CHECK (recurrence_freq IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS recurrence_interval       INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_days_of_week   INT[],
  ADD COLUMN IF NOT EXISTS recurrence_until          DATE,
  ADD COLUMN IF NOT EXISTS recurrence_count          INT,
  ADD COLUMN IF NOT EXISTS is_occurrence_modified    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cancelled              BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_band_events_parent
  ON band_events (parent_event_id) WHERE parent_event_id IS NOT NULL;
