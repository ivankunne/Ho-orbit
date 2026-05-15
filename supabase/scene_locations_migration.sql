-- Scene locations table: venues, studios, cultural spaces from the h-orbit spreadsheet
-- Run this FIRST in the Supabase SQL editor, THEN run scene_locations_data.sql

CREATE TABLE IF NOT EXISTS scene_locations (
  id         SERIAL PRIMARY KEY,
  province   TEXT NOT NULL,
  city       TEXT NOT NULL,
  name       TEXT NOT NULL,
  address    TEXT,
  type       TEXT,
  website    TEXT,
  notes      TEXT,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scene_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scene_locations"
  ON scene_locations FOR SELECT USING (true);

-- Index for province/city filtering
CREATE INDEX IF NOT EXISTS scene_locations_province_idx ON scene_locations(province);
CREATE INDEX IF NOT EXISTS scene_locations_type_idx ON scene_locations(type);
