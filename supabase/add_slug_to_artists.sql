-- Add slug column for clean URLs like /artists/dj-khaled
ALTER TABLE artists ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slugs from existing artist names
UPDATE artists
SET slug = lower(
  regexp_replace(
    regexp_replace(
      unaccent(name),   -- remove diacritics (requires unaccent extension)
      '[^a-zA-Z0-9\s]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- If unaccent is not available, use this simpler version instead:
-- UPDATE artists
-- SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
-- WHERE slug IS NULL;
