-- ============================================================================
-- h-orbit — migrate legacy genres to the new taxonomy
-- ----------------------------------------------------------------------------
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent) and safe if
-- some tables/columns don't exist — every step is guarded, so it never errors
-- on a missing table or column.
--
-- It does two things:
--   1. Rewrites legacy free-text `genre` values (artists, tracks, bands, …) to
--      the new taxonomy labels.
--   2. Rewrites legacy `profiles.preferred_genres` ids (the onboarding/account
--      multi-select) to the new id scheme, dropping ids that no longer exist.
--
-- Mapping choices for genres with no direct successor (change here if you like):
--   Elektronisch / Electronic → Techno     (electronic umbrella)
--   Reggaeton                 → Dancehall   (closest neighbour)
--   Rap                       → Hip-Hop
--   Bluesrock                 → Blues Rock
--   Psych                     → Indie
--   Folk / Klassiek / Classical / Latin / Spoken / Akoestisch → Overig ("Other")
--   preferred-genre id `rock` → `classic-rock`
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Free-text `genre` columns
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  candidate_tables text[] := ARRAY[
    'artists', 'tracks', 'bands', 'networking_posts', 'events', 'hub_posts', 'posts', 'albums'
  ];
BEGIN
  CREATE TEMP TABLE _genre_label_map (old text PRIMARY KEY, new text) ON COMMIT DROP;
  INSERT INTO _genre_label_map (old, new) VALUES
    ('Nederpop',                 'Pop'),
    ('Nederlandstalige Hip-Hop', 'Hip-Hop'),
    ('Hip-hop',                  'Hip-Hop'),
    ('HipHop',                   'Hip-Hop'),
    ('Rap',                      'Hip-Hop'),
    ('Bluesrock',                'Blues Rock'),
    ('Elektronisch',             'Techno'),
    ('Electronic',               'Techno'),
    ('Reggaeton',                'Dancehall'),
    ('Psych',                    'Indie'),
    ('Spoken',                   'Overig'),
    ('Akoestisch',               'Overig'),
    ('Folk',                     'Overig'),
    ('Klassiek',                 'Overig'),
    ('Classical',                'Overig'),
    ('Latin',                    'Overig');

  FOREACH t IN ARRAY candidate_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'genre'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I AS tgt
            SET genre = m.new
           FROM _genre_label_map m
          WHERE tgt.genre = m.old
            AND tgt.genre IS DISTINCT FROM m.new', t);
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2) `profiles.preferred_genres` (array of ids) — remap + drop unknown ids
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferred_genres';

  IF col_type IS NULL THEN
    RAISE NOTICE 'profiles.preferred_genres not found — skipping preference remap';
    RETURN;
  END IF;

  -- Legacy id -> new id (only ids whose value actually changes)
  CREATE TEMP TABLE _genre_id_map (old text PRIMARY KEY, new text) ON COMMIT DROP;
  INSERT INTO _genre_id_map (old, new) VALUES
    ('hiphop',       'hip-hop'),
    ('rnb',          'r-b'),
    ('rb',           'r-b'),
    ('nederpop',     'pop'),
    ('elektronisch', 'techno'),
    ('rock',         'classic-rock');
    -- 'folk' and 'klassiek' have no successor and are dropped below.

  -- The complete set of valid new ids (must match src/data/genres.ts).
  CREATE TEMP TABLE _valid_ids (id text PRIMARY KEY) ON COMMIT DROP;
  INSERT INTO _valid_ids (id) VALUES
    ('pop'),('hip-hop'),('boombap'),('trap'),('drill'),('trip-hop'),
    ('r-b'),('contemporary-r-b'),('neo-soul'),('amapiano'),('reggae'),
    ('dancehall'),('afrobeats'),('grime'),('jazz'),('traditionele-jazz'),
    ('bebop'),('cool-jazz'),('jazz-fusion'),('blues'),('delta-blues'),
    ('chicago-blues'),('blues-rock'),('soul'),('funk'),('gospel'),
    ('classic-rock'),('hard-rock'),('indie'),('indie-rock'),('indie-pop'),
    ('alternative-rock'),('punk-rock'),('pop-punk'),('post-punk'),('metal'),
    ('heavy-metal'),('thrash-metal'),('progressive-metal'),('grunge'),('ska'),
    ('techno'),('acid-techno'),('peak-time-techno'),('minimal-techno'),('house'),
    ('deep-house'),('tech-house'),('acid-house'),('psytrance'),('hardcore'),
    ('gabber'),('happy-hardcore'),('frenchcore'),('trance'),('vocal-trance'),
    ('progressive-trance'),('drum-bass'),('liquid-drum-bass'),('jump-up'),('dubstep'),
    ('oriental'),('eurodance'),('medicine-music'),('adult-contemporary'),
    ('yacht-music'),('vape-wave');

  IF col_type = 'ARRAY' THEN
    UPDATE public.profiles p
       SET preferred_genres = sub.arr
      FROM (
        SELECT pr.id,
               COALESCE(
                 array_agg(DISTINCT v.id) FILTER (WHERE v.id IS NOT NULL),
                 '{}'
               )::text[] AS arr
          FROM public.profiles pr
          LEFT JOIN LATERAL unnest(pr.preferred_genres) AS old_id ON true
          LEFT JOIN _genre_id_map gm ON gm.old = old_id
          LEFT JOIN _valid_ids   v  ON v.id   = COALESCE(gm.new, old_id)
         WHERE pr.preferred_genres IS NOT NULL
         GROUP BY pr.id
      ) sub
     WHERE p.id = sub.id
       AND p.preferred_genres IS DISTINCT FROM sub.arr;

  ELSIF col_type = 'jsonb' THEN
    UPDATE public.profiles p
       SET preferred_genres = sub.arr
      FROM (
        SELECT pr.id,
               COALESCE(
                 jsonb_agg(DISTINCT v.id) FILTER (WHERE v.id IS NOT NULL),
                 '[]'::jsonb
               ) AS arr
          FROM public.profiles pr
          LEFT JOIN LATERAL jsonb_array_elements_text(pr.preferred_genres) AS old_id ON true
          LEFT JOIN _genre_id_map gm ON gm.old = old_id
          LEFT JOIN _valid_ids   v  ON v.id   = COALESCE(gm.new, old_id)
         WHERE pr.preferred_genres IS NOT NULL
           AND jsonb_typeof(pr.preferred_genres) = 'array'
         GROUP BY pr.id
      ) sub
     WHERE p.id = sub.id
       AND p.preferred_genres IS DISTINCT FROM sub.arr;

  ELSE
    RAISE NOTICE 'profiles.preferred_genres has unexpected type "%": skipping', col_type;
  END IF;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- Verification (optional — run separately after committing)
-- ----------------------------------------------------------------------------
-- SELECT genre, count(*) FROM public.artists GROUP BY genre ORDER BY 2 DESC;
-- SELECT genre, count(*) FROM public.tracks  GROUP BY genre ORDER BY 2 DESC;
-- SELECT DISTINCT unnest(preferred_genres) AS id FROM public.profiles ORDER BY 1;
