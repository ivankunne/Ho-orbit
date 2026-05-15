-- Atomic increment for profiles.followers
CREATE OR REPLACE FUNCTION increment_profile_followers(profile_uuid UUID, delta INTEGER)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles
  SET followers = GREATEST(0, COALESCE(followers, 0) + delta)
  WHERE id = profile_uuid;
$$;

-- Atomic increment for profiles.following
CREATE OR REPLACE FUNCTION increment_profile_following(profile_uuid UUID, delta INTEGER)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles
  SET following = GREATEST(0, COALESCE(following, 0) + delta)
  WHERE id = profile_uuid;
$$;
