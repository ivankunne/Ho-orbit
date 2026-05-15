-- Step 1: add profile_id to link artists rows to profiles
ALTER TABLE artists ADD COLUMN IF NOT EXISTS profile_id UUID UNIQUE;

-- Step 2: insert all users with approved tracks into artists
INSERT INTO artists (name, genre, location, followers_count, image_url, cover_url, profile_id)
SELECT
  COALESCE(p.display_name, p.username, 'Artiest'),
  COALESCE(p.location, 'Nederland'),
  0,
  p.avatar_url,
  p.banner_url,
  p.id
FROM profiles p
WHERE p.id IN (
  SELECT DISTINCT uploaded_by FROM tracks
  WHERE upload_status = 'approved' AND uploaded_by IS NOT NULL
)
ON CONFLICT (profile_id) DO UPDATE SET
  name      = EXCLUDED.name,
  image_url = EXCLUDED.image_url,
  cover_url = EXCLUDED.cover_url;
