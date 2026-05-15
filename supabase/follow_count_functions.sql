CREATE OR REPLACE FUNCTION increment_profile_followers(profile_uuid UUID, delta INTEGER)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles
  SET followers_count = GREATEST(0, COALESCE(followers_count, 0) + delta)
  WHERE id = profile_uuid;
$$;

CREATE OR REPLACE FUNCTION increment_profile_following(profile_uuid UUID, delta INTEGER)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles
  SET following_count = GREATEST(0, COALESCE(following_count, 0) + delta)
  WHERE id = profile_uuid;
$$;
