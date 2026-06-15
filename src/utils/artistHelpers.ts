import { supabase } from '@/lib/supabase';
import { avatarPlaceholder, coverPlaceholder } from '@utils/placeholder';
import { genreLabelById } from '@data/genres';

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')      // non-alphanumeric → dash
    .replace(/^-+|-+$/g, '');         // trim leading/trailing dashes
}

function mapArtistRow(a: any) {
  const name = a.name || 'Artiest';
  return {
    id: a.id,
    slug: a.slug || toSlug(name),
    profile_id: a.profile_id ?? null,
    name,
    username: a.username || null,
    image_url: a.image_url || avatarPlaceholder(name),
    cover_url: a.cover_url || coverPlaceholder(String(a.id)),
    genre: a.genre || 'Overig',
    location: a.location || 'Nederland',
    bio: a.bio || '',
    verified: a.verified || false,
    followers_count: a.followers_count || 0,
    social: a.social || {},
    tags: a.genre ? [a.genre] : [],
    featured: a.featured || false,
    tracks: [],
    albums: [],
  };
}

// Still used by ProfilePage's followed-artists list (queries profiles directly)
export function mapProfileToArtist(p: any) {
  const genreIds: string[] = Array.isArray(p.preferred_genres) ? p.preferred_genres : [];
  const genre = genreIds.length > 0 ? genreLabelById(genreIds[0]) : 'Overig';
  const name = p.display_name || p.username || 'Artiest';
  return {
    id: p.id,
    profile_id: p.id,
    name,
    username: p.username,
    image_url: p.avatar_url || avatarPlaceholder(name),
    cover_url: p.banner_url || coverPlaceholder(String(p.username || p.id)),
    genre,
    location: p.location || 'Nederland',
    bio: p.bio || '',
    verified: p.verified || false,
    followers_count: p.followers_count ?? p.followers ?? 0,
    social: p.social || {},
    tags: genreIds.map(genreLabelById),
    featured: false,
    tracks: [],
    albums: [],
  };
}

// Live follower/following counts read straight from the user_following_artists
// junction table — the source of truth. The cached *_count columns on profiles
// and artists drift (they depend on RPCs that may not be deployed), so we never
// trust them for display.

// Count how many users follow any of the given entity ids. Pass both the artist
// row id and the linked profile id, since a musician can be followed via either
// (numeric artist id from the artist page, or profile UUID from the profile page).
export async function countFollowers(ids: (string | number | null | undefined)[]): Promise<number> {
  const keys = Array.from(new Set(ids.filter((v) => v !== null && v !== undefined && v !== '').map(String)));
  if (keys.length === 0) return 0;
  const { count, error } = await supabase
    .from('user_following_artists')
    .select('*', { count: 'exact', head: true })
    .in('artist_id', keys);
  if (error) { console.warn('[follows] follower count failed:', error.message); return 0; }
  return count ?? 0;
}

// Count how many entities this user follows.
export async function countFollowing(userId: string | null | undefined): Promise<number> {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from('user_following_artists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) { console.warn('[follows] following count failed:', error.message); return 0; }
  return count ?? 0;
}

// Resolve a list of followed ids into artist-shaped objects. A follow can be
// stored as a numeric artists-table id (followed from an artist page) or as a
// profile UUID (followed from a profile page), so we resolve against both tables
// and dedupe. Without this, profile-resolution alone silently drops every
// artist-page follow, leaving the following count and list out of sync.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchFollowedArtists(
  ids: (string | number | null | undefined)[]
): Promise<any[]> {
  const keys = Array.from(
    new Set(ids.filter((v) => v !== null && v !== undefined && v !== '').map(String))
  );
  if (keys.length === 0) return [];

  const profileIds = keys.filter((v) => UUID_RE.test(v));
  const artistIds = keys.filter((v) => !UUID_RE.test(v));

  const results: any[] = [];
  const seen = new Set<string>();

  if (artistIds.length > 0) {
    const { data, error } = await supabase.from('artists').select('*').in('id', artistIds);
    if (error) console.warn('[follows] artist resolve failed:', error.message);
    for (const a of data ?? []) {
      results.push(mapArtistRow(a));
      seen.add(String(a.id));
      if (a.profile_id) seen.add(String(a.profile_id));
    }
  }

  if (profileIds.length > 0) {
    const remaining = profileIds.filter((id) => !seen.has(id));
    if (remaining.length > 0) {
      const { data, error } = await supabase.from('profiles').select('*').in('id', remaining);
      if (error) console.warn('[follows] profile resolve failed:', error.message);
      for (const p of data ?? []) results.push(mapProfileToArtist(p));
    }
  }

  return results;
}

export async function fetchArtistProfiles(limit = 50): Promise<any[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .limit(limit);

  if (error) {
    console.warn('[artists] fetch failed:', error.message);
    return [];
  }

  return (data ?? [])
    .map(mapArtistRow)
    .sort((a, b) => b.followers_count - a.followers_count);
}

// Upsert a profile into the artists table whenever they upload or get approved
export async function upsertArtistFromProfile(
  userId: string,
  genre: string,
  artistName: string
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, banner_url, location, followers_count')
    .eq('id', userId)
    .single();

  const name = profile?.display_name || artistName || 'Artiest';
  const { error } = await supabase
    .from('artists')
    .upsert(
      {
        profile_id: userId,
        name,
        slug: toSlug(name),
        genre: genre || 'Overig',
        location: profile?.location || 'Nederland',
        followers_count: profile?.followers_count || 0,
        image_url: profile?.avatar_url || null,
        cover_url: profile?.banner_url || null,
      },
      { onConflict: 'profile_id' }
    );

  if (error) console.warn('[artists] upsert failed:', error.message);
}
