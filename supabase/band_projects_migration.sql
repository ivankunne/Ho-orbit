-- ============================================================================
-- Project tiles for BandSpace — replaces the fixed "Projecten" chat channel
-- and the flat, band-wide Taken (band_todos) list with bands creating their
-- own named project tiles, each with chat, assignments, goals and ideas.
--
-- Backs orbitService.ts's getBandProjects/createBandProject/updateBandProject/
-- deleteBandProject, getProjectAssignments/.../getProjectGoals/.../
-- getProjectIdeas/... and the Projecten grid + per-project tabs in
-- BandSpaceDetailPage.tsx.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — every
-- statement is idempotent (CREATE TABLE IF NOT EXISTS / DROP POLICY IF
-- EXISTS / the data-migration block below guards itself with NOT EXISTS
-- checks).
--
-- NOTE on GRANTs: supabase/fix_band_grants_migration.sql exists because
-- earlier band_* tables had correct RLS but no table-level GRANT to the
-- `authenticated` role — Postgres checks GRANTs BEFORE RLS, so that alone
-- caused blanket 403s. Every new table below grants `authenticated`
-- directly, from the start, so that bug class can't repeat here.
-- ============================================================================

-- ─── band_projects (the tiles) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS band_projects (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id      UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  created_by   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_projects_band
  ON band_projects (band_id, created_at);

ALTER TABLE band_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members manage projects" ON band_projects;
CREATE POLICY "Band members manage projects"
  ON band_projects FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM band_members
    WHERE band_members.band_id = band_projects.band_id
      AND band_members.user_id = auth.uid()
      AND band_members.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM band_members
    WHERE band_members.band_id = band_projects.band_id
      AND band_members.user_id = auth.uid()
      AND band_members.status = 'active'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON band_projects TO authenticated;

-- ─── band_project_assignments (assignee + due date + pin + complete) ──────────

CREATE TABLE IF NOT EXISTS band_project_assignments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL REFERENCES band_projects(id) ON DELETE CASCADE,
  created_by     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignee_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  content        TEXT        NOT NULL,
  due_date       DATE,
  is_pinned      BOOLEAN     NOT NULL DEFAULT false,
  completed      BOOLEAN     NOT NULL DEFAULT false,
  completed_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Lineage guard for the one-time data migration below — lets it be re-run
  -- safely without duplicating rows. Not used by the app otherwise.
  legacy_todo_id UUID        REFERENCES band_todos(id)
);

CREATE INDEX IF NOT EXISTS idx_band_project_assignments_project
  ON band_project_assignments (project_id, completed, is_pinned, due_date);

ALTER TABLE band_project_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members manage assignments" ON band_project_assignments;
CREATE POLICY "Band members manage assignments"
  ON band_project_assignments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM band_projects p
    JOIN band_members bm ON bm.band_id = p.band_id
    WHERE p.id = band_project_assignments.project_id
      AND bm.user_id = auth.uid() AND bm.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM band_projects p
    JOIN band_members bm ON bm.band_id = p.band_id
    WHERE p.id = band_project_assignments.project_id
      AND bm.user_id = auth.uid() AND bm.status = 'active'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON band_project_assignments TO authenticated;

-- ─── band_project_goals (simple checklist: text + optional due date) ──────────

CREATE TABLE IF NOT EXISTS band_project_goals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES band_projects(id) ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  due_date     DATE,
  completed    BOOLEAN     NOT NULL DEFAULT false,
  completed_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_project_goals_project
  ON band_project_goals (project_id, completed, created_at);

ALTER TABLE band_project_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members manage goals" ON band_project_goals;
CREATE POLICY "Band members manage goals"
  ON band_project_goals FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM band_projects p
    JOIN band_members bm ON bm.band_id = p.band_id
    WHERE p.id = band_project_goals.project_id
      AND bm.user_id = auth.uid() AND bm.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM band_projects p
    JOIN band_members bm ON bm.band_id = p.band_id
    WHERE p.id = band_project_goals.project_id
      AND bm.user_id = auth.uid() AND bm.status = 'active'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON band_project_goals TO authenticated;

-- ─── band_project_ideas (freeform pinnable notes) ──────────────────────────────

CREATE TABLE IF NOT EXISTS band_project_ideas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES band_projects(id) ON DELETE CASCADE,
  created_by UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  is_pinned  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_project_ideas_project
  ON band_project_ideas (project_id, is_pinned, created_at);

ALTER TABLE band_project_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members manage ideas" ON band_project_ideas;
CREATE POLICY "Band members manage ideas"
  ON band_project_ideas FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM band_projects p
    JOIN band_members bm ON bm.band_id = p.band_id
    WHERE p.id = band_project_ideas.project_id
      AND bm.user_id = auth.uid() AND bm.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM band_projects p
    JOIN band_members bm ON bm.band_id = p.band_id
    WHERE p.id = band_project_ideas.project_id
      AND bm.user_id = auth.uid() AND bm.status = 'active'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON band_project_ideas TO authenticated;

-- ─── band_messages: add project-scoped chat ────────────────────────────────────
-- A dedicated nullable column (not a repurposed `channel` value) so project
-- chat gets a real ON DELETE CASCADE and doesn't mix dynamic project UUIDs
-- into the fixed ChannelKey vocabulary used elsewhere (getChannelPreviews).
-- No RLS change needed: the existing active-member SELECT/INSERT policies
-- on band_messages are scoped by band_id, which project rows still carry.

ALTER TABLE band_messages
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES band_projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_band_messages_project
  ON band_messages (project_id) WHERE project_id IS NOT NULL;

-- ============================================================================
-- One-time data migration: re-home existing band_todos and existing
-- channel='projects' messages into a per-band "Algemeen" project, so nothing
-- is lost when the old Taken list and Projecten channel are retired from the
-- UI. Fully idempotent — safe to re-run. band_todos itself is left in place,
-- untouched, as a safety net.
-- ============================================================================

-- 1) Ensure one "Algemeen" project exists per band that has legacy data.
INSERT INTO band_projects (band_id, name, description, created_by)
SELECT DISTINCT b.id, 'Algemeen',
       'Automatisch aangemaakt bij de overstap naar projecttegels — bevat je oude taken en Projecten-berichten.',
       b.created_by
FROM bands b
WHERE (EXISTS (SELECT 1 FROM band_todos t WHERE t.band_id = b.id)
       OR EXISTS (SELECT 1 FROM band_messages m WHERE m.band_id = b.id AND m.channel = 'projects'))
  AND NOT EXISTS (SELECT 1 FROM band_projects p WHERE p.band_id = b.id AND p.name = 'Algemeen');

-- 2) Re-parent band_todos into that project as assignments (no assignee/
--    due-date on legacy rows — those fields didn't exist before).
INSERT INTO band_project_assignments
  (project_id, created_by, content, completed, completed_by, completed_at, created_at, legacy_todo_id)
SELECT p.id, t.created_by, t.content, t.completed, t.completed_by, t.completed_at, t.created_at, t.id
FROM band_todos t
JOIN band_projects p ON p.band_id = t.band_id AND p.name = 'Algemeen'
WHERE NOT EXISTS (
  SELECT 1 FROM band_project_assignments a WHERE a.legacy_todo_id = t.id
);

-- 3) Re-parent channel='projects' messages onto the project as chat history.
UPDATE band_messages m
SET project_id = p.id, channel = 'project'
FROM band_projects p
WHERE p.band_id = m.band_id AND p.name = 'Algemeen'
  AND m.channel = 'projects' AND m.project_id IS NULL;
