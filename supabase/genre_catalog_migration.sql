-- ============================================================================
-- h-orbit — genre catalog (taxonomy in the database)
-- ----------------------------------------------------------------------------
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent): the seed
-- upserts, so editing labels/colours/order here and re-running re-syncs the
-- catalog. The frontend reads this catalog and falls back to the bundled
-- taxonomy (src/data/genres.ts) if the tables are missing or unreachable.
--
-- Model:
--   genre_groups  — the five big buckets shown as section headers
--   genres        — every genre + subgenre. parent_id NULL = a main genre;
--                   parent_id set = a subgenre nested under that main genre.
--                   `color` is a base colour name (e.g. 'purple') set on main
--                   genres only; subgenres inherit their parent's colour.
--
-- This keeps the taxonomy "in the database so it is clear" while the frontend
-- owns how each colour name maps to actual styling (Tailwind classes).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.genre_groups (
  id         text PRIMARY KEY,
  label      text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.genres (
  id         text PRIMARY KEY,
  label      text NOT NULL,
  group_id   text REFERENCES public.genre_groups(id) ON DELETE CASCADE,
  parent_id  text REFERENCES public.genres(id)       ON DELETE CASCADE,
  color      text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS genres_group_id_idx  ON public.genres (group_id);
CREATE INDEX IF NOT EXISTS genres_parent_id_idx ON public.genres (parent_id);

-- ----------------------------------------------------------------------------
-- Row Level Security: world-readable, no public writes.
-- The catalog is curated by admins via the SQL editor / service role.
-- ----------------------------------------------------------------------------
ALTER TABLE public.genre_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "genre_groups read" ON public.genre_groups;
CREATE POLICY "genre_groups read" ON public.genre_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "genres read" ON public.genres;
CREATE POLICY "genres read" ON public.genres
  FOR SELECT USING (true);

GRANT SELECT ON public.genre_groups TO anon, authenticated;
GRANT SELECT ON public.genres       TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- Seed groups
-- ----------------------------------------------------------------------------
INSERT INTO public.genre_groups (id, label, sort_order) VALUES
  ('pop-hip-hop-urban', 'Pop, Hip-Hop & Urban', 0),
  ('jazz-blues-soul',   'Jazz, Blues & Soul',   1),
  ('rock-indie-metal',  'Rock, Indie & Metal',  2),
  ('elektronisch',      'Elektronisch',         3),
  ('overig',            'Overig',               4)
ON CONFLICT (id) DO UPDATE
  SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------------------
-- Seed genres (main genres carry a colour; subgenres inherit via parent_id)
-- ----------------------------------------------------------------------------
INSERT INTO public.genres (id, label, group_id, parent_id, color, sort_order) VALUES
  -- Pop, Hip-Hop & Urban
  ('pop',                'Pop',               'pop-hip-hop-urban', NULL,      'amber',   0),
  ('hip-hop',            'Hip-Hop',           'pop-hip-hop-urban', NULL,      'purple',  1),
  ('boombap',            'Boombap',           'pop-hip-hop-urban', 'hip-hop', NULL,      2),
  ('trap',               'Trap',              'pop-hip-hop-urban', 'hip-hop', NULL,      3),
  ('drill',              'Drill',             'pop-hip-hop-urban', 'hip-hop', NULL,      4),
  ('trip-hop',           'Trip-Hop',          'pop-hip-hop-urban', 'hip-hop', NULL,      5),
  ('r-b',                'R&B',               'pop-hip-hop-urban', NULL,      'pink',    6),
  ('contemporary-r-b',   'Contemporary R&B',  'pop-hip-hop-urban', 'r-b',     NULL,      7),
  ('neo-soul',           'Neo-Soul',          'pop-hip-hop-urban', 'r-b',     NULL,      8),
  ('amapiano',           'Amapiano',          'pop-hip-hop-urban', NULL,      'orange',  9),
  ('reggae',             'Reggae',            'pop-hip-hop-urban', NULL,      'green',   10),
  ('dancehall',          'Dancehall',         'pop-hip-hop-urban', NULL,      'emerald', 11),
  ('afrobeats',          'Afrobeats',         'pop-hip-hop-urban', NULL,      'orange',  12),
  ('grime',              'Grime',             'pop-hip-hop-urban', NULL,      'fuchsia', 13),
  -- Jazz, Blues & Soul
  ('jazz',               'Jazz',              'jazz-blues-soul',   NULL,      'blue',    0),
  ('traditionele-jazz',  'Traditionele Jazz', 'jazz-blues-soul',   'jazz',    NULL,      1),
  ('bebop',              'Bebop',             'jazz-blues-soul',   'jazz',    NULL,      2),
  ('cool-jazz',          'Cool Jazz',         'jazz-blues-soul',   'jazz',    NULL,      3),
  ('jazz-fusion',        'Jazz Fusion',       'jazz-blues-soul',   'jazz',    NULL,      4),
  ('blues',              'Blues',             'jazz-blues-soul',   NULL,      'sky',     5),
  ('delta-blues',        'Delta Blues',       'jazz-blues-soul',   'blues',   NULL,      6),
  ('chicago-blues',      'Chicago Blues',     'jazz-blues-soul',   'blues',   NULL,      7),
  ('blues-rock',         'Blues Rock',        'jazz-blues-soul',   'blues',   NULL,      8),
  ('soul',               'Soul',              'jazz-blues-soul',   NULL,      'yellow',  9),
  ('funk',               'Funk',              'jazz-blues-soul',   NULL,      'amber',   10),
  ('gospel',             'Gospel',            'jazz-blues-soul',   NULL,      'yellow',  11),
  -- Rock, Indie & Metal
  ('classic-rock',       'Classic Rock',      'rock-indie-metal',  NULL,      'red',     0),
  ('hard-rock',          'Hard Rock',         'rock-indie-metal',  NULL,      'red',     1),
  ('indie',              'Indie',             'rock-indie-metal',  NULL,      'violet',  2),
  ('indie-rock',         'Indie Rock',        'rock-indie-metal',  'indie',   NULL,      3),
  ('indie-pop',          'Indie Pop',         'rock-indie-metal',  'indie',   NULL,      4),
  ('alternative-rock',   'Alternative Rock',  'rock-indie-metal',  NULL,      'rose',    5),
  ('punk-rock',          'Punk Rock',         'rock-indie-metal',  NULL,      'red',     6),
  ('pop-punk',           'Pop-Punk',          'rock-indie-metal',  NULL,      'rose',    7),
  ('post-punk',          'Post-Punk',         'rock-indie-metal',  NULL,      'violet',  8),
  ('metal',              'Metal',             'rock-indie-metal',  NULL,      'red',     9),
  ('heavy-metal',        'Heavy Metal',       'rock-indie-metal',  'metal',   NULL,      10),
  ('thrash-metal',       'Thrash Metal',      'rock-indie-metal',  'metal',   NULL,      11),
  ('progressive-metal',  'Progressive Metal', 'rock-indie-metal',  'metal',   NULL,      12),
  ('grunge',             'Grunge',            'rock-indie-metal',  NULL,      'orange',  13),
  ('ska',                'Ska',               'rock-indie-metal',  NULL,      'lime',    14),
  -- Elektronisch
  ('techno',             'Techno',            'elektronisch',      NULL,      'cyan',    0),
  ('acid-techno',        'Acid Techno',       'elektronisch',      'techno',  NULL,      1),
  ('peak-time-techno',   'Peak Time Techno',  'elektronisch',      'techno',  NULL,      2),
  ('minimal-techno',     'Minimal Techno',    'elektronisch',      'techno',  NULL,      3),
  ('house',              'House',             'elektronisch',      NULL,      'cyan',    4),
  ('deep-house',         'Deep House',        'elektronisch',      'house',   NULL,      5),
  ('tech-house',         'Tech House',        'elektronisch',      'house',   NULL,      6),
  ('acid-house',         'Acid House',        'elektronisch',      'house',   NULL,      7),
  ('psytrance',          'Psytrance',         'elektronisch',      NULL,      'fuchsia', 8),
  ('hardcore',           'Hardcore',          'elektronisch',      NULL,      'rose',    9),
  ('gabber',             'Gabber',            'elektronisch',      'hardcore',NULL,      10),
  ('happy-hardcore',     'Happy Hardcore',    'elektronisch',      'hardcore',NULL,      11),
  ('frenchcore',         'Frenchcore',        'elektronisch',      'hardcore',NULL,      12),
  ('trance',             'Trance',            'elektronisch',      NULL,      'sky',     13),
  ('vocal-trance',       'Vocal Trance',      'elektronisch',      'trance',  NULL,      14),
  ('progressive-trance', 'Progressive Trance','elektronisch',      'trance',  NULL,      15),
  ('drum-bass',          'Drum & Bass',       'elektronisch',      NULL,      'indigo',  16),
  ('liquid-drum-bass',   'Liquid Drum & Bass','elektronisch',      'drum-bass',NULL,     17),
  ('jump-up',            'Jump Up',           'elektronisch',      'drum-bass',NULL,     18),
  ('dubstep',            'Dubstep',           'elektronisch',      NULL,      'indigo',  19),
  -- Overig
  ('oriental',           'Oriental',          'overig',            NULL,      'teal',    0),
  ('eurodance',          'Eurodance',         'overig',            NULL,      'fuchsia', 1),
  ('medicine-music',     'Medicine music',    'overig',            NULL,      'emerald', 2),
  ('adult-contemporary', 'Adult contemporary','overig',            NULL,      'slate',   3),
  ('yacht-music',        'Yacht music',       'overig',            NULL,      'sky',     4),
  ('vape-wave',          'Vape wave',         'overig',            NULL,      'fuchsia', 5)
ON CONFLICT (id) DO UPDATE
  SET label     = EXCLUDED.label,
      group_id  = EXCLUDED.group_id,
      parent_id = EXCLUDED.parent_id,
      color     = EXCLUDED.color,
      sort_order = EXCLUDED.sort_order;

COMMIT;

-- ----------------------------------------------------------------------------
-- Verification (optional — run separately after committing)
-- ----------------------------------------------------------------------------
-- SELECT g.label AS "group", ge.label, ge.parent_id, ge.color
--   FROM public.genres ge
--   JOIN public.genre_groups g ON g.id = ge.group_id
--  ORDER BY g.sort_order, ge.sort_order;
