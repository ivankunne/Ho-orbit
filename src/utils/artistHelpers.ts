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
