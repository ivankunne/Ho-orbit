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
    followers_count: p.followers_count || p.followers || 0,
    monthly_listeners: p.followers_count || p.followers || 0,
    social: p.social || {},
    tags: genreIds.map(id => GENRE_MAP[id] || id),
    featured: false,
    tracks: [],
    albums: [],
  };
}

export async function fetchArtistProfiles(limit = 50): Promise<any[]> {
  // Collect IDs from two sources in parallel, then merge
  const [trackResult, roleResult] = await Promise.all([
    supabase
      .from('tracks')
      .select('uploaded_by')
      .eq('upload_status', 'approved')
      .not('uploaded_by', 'is', null),
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'Artiest')
      .order('followers_count', { ascending: false })
      .limit(limit),
  ]);

  const uploadIds = [...new Set(
    (trackResult.data ?? []).map((r: any) => r.uploaded_by).filter(Boolean)
  )];

  // Start with role-based profiles
  const seen = new Set<string>();
  const combined: any[] = [];
  for (const p of roleResult.data ?? []) {
    if (!seen.has(p.id)) { seen.add(p.id); combined.push(p); }
  }

  // Merge in profiles that have approved tracks but might lack the role
  if (uploadIds.length > 0) {
    const { data: uploadProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', uploadIds)
      .order('followers_count', { ascending: false })
      .limit(limit);
    for (const p of uploadProfiles ?? []) {
      if (!seen.has(p.id)) { seen.add(p.id); combined.push(p); }
    }
  }

  return combined.map(mapProfileToArtist);
}
