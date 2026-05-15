import { supabase } from '@/lib/supabase';

export const GENRE_MAP: Record<string, string> = {
  nederpop: 'Nederpop',
  hiphop: 'Hip-Hop',
  elektronisch: 'Elektronisch',
  jazz: 'Jazz',
  indie: 'Indie',
  rnb: 'R&B',
  rock: 'Rock',
  folk: 'Folk',
  techno: 'Techno',
  klassiek: 'Klassiek',
};

export function mapProfileToArtist(p: any) {
  const genreIds: string[] = Array.isArray(p.preferred_genres) ? p.preferred_genres : [];
  const genre = genreIds.length > 0 ? (GENRE_MAP[genreIds[0]] || genreIds[0]) : 'Overig';
  const seed = encodeURIComponent(p.username || p.id);
  return {
    id: p.id,
    name: p.display_name || p.username || 'Artiest',
    username: p.username,
    image_url: p.avatar_url || `https://picsum.photos/seed/${seed}/200/200`,
    cover_url: p.banner_url || `https://picsum.photos/seed/${seed}_cover/800/300`,
    genre,
    location: p.location || 'Nederland',
    bio: p.bio || '',
    verified: p.verified || false,
    followers_count: p.followers || 0,
    monthly_listeners: p.followers || 0,
    social: p.social || {},
    tags: genreIds.map(id => GENRE_MAP[id] || id),
    featured: false,
    tracks: [],
    albums: [],
  };
}

export async function fetchArtistProfiles(limit = 50): Promise<any[]> {
  // Get uploaded_by IDs from all approved tracks
  const { data: trackRows } = await supabase
    .from('tracks')
    .select('uploaded_by')
    .eq('upload_status', 'approved')
    .not('uploaded_by', 'is', null);

  const uploadIds = [...new Set(
    (trackRows ?? []).map((r: any) => r.uploaded_by).filter(Boolean)
  )];

  // If there are uploaders with approved tracks, fetch their profiles directly —
  // no dependency on the role column at all
  if (uploadIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', uploadIds)
      .order('followers', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) return data.map(mapProfileToArtist);
  }

  // Fallback: profiles explicitly marked as Artiest (e.g. manually set)
  const { data: fallback } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'Artiest')
    .order('followers', { ascending: false })
    .limit(limit);

  return (fallback ?? []).map(mapProfileToArtist);
}
