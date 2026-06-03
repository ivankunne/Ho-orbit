-- Band task list ("Taken") for BandSpace.
-- Backs orbitService.getBandTodos / createBandTodo / toggleBandTodo / deleteBandTodo
-- and the Taken view + home tile in BandSpaceDetailPage.

CREATE TABLE IF NOT EXISTS band_todos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id      UUID        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  completed    BOOLEAN     NOT NULL DEFAULT false,
  completed_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_band_todos_band
  ON band_todos (band_id, completed, created_at);

-- ============================================================
-- RLS: only active members of the band can read/write its todos.
-- ============================================================
ALTER TABLE band_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Band members manage todos" ON band_todos;
CREATE POLICY "Band members manage todos"
  ON band_todos FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM band_members
    WHERE band_members.band_id = band_todos.band_id
      AND band_members.user_id = auth.uid()
      AND band_members.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM band_members
    WHERE band_members.band_id = band_todos.band_id
      AND band_members.user_id = auth.uid()
      AND band_members.status = 'active'
  ));
