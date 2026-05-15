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
  // DB column is followers_count; some rows may expose it as followers — handle both
  const followersCount = p.followers_count ?? p.followers ?? 0;
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
    followers_count: followersCount,
    monthly_listeners: followersCount,
    social: p.social || {},
    tags: genreIds.map(id => GENRE_MAP[id] || id),
    featured: false,
    tracks: [],
    albums: [],
  };
}

export async function fetchArtistProfiles(limit = 50): Promise<any[]> {
  // Step 1: get uploaded_by IDs from approved tracks
  const { data: trackRows } = await supabase
    .from('tracks')
    .select('uploaded_by')
    .eq('upload_status', 'approved')
    .not('uploaded_by', 'is', null);

  const uploadIds = [...new Set(
    (trackRows ?? []).map((r: any) => r.uploaded_by).filter(Boolean)
  )];

  const seen = new Set<string>();
  const combined: any[] = [];

  // Step 2: fetch profiles for uploaders (no ORDER BY — sort client-side)
  if (uploadIds.length > 0) {
    const { data: uploadProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', uploadIds)
      .limit(limit);

    for (const p of uploadProfiles ?? []) {
      if (!seen.has(p.id)) { seen.add(p.id); combined.push(p); }
    }
  }

  // Step 3: also include any profiles manually marked as Artiest
  const { data: roleProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'Artiest')
    .limit(limit);

  for (const p of roleProfiles ?? []) {
    if (!seen.has(p.id)) { seen.add(p.id); combined.push(p); }
  }

  // Sort client-side — avoids any DB column name dependency
  combined.sort((a, b) =>
    (b.followers_count ?? b.followers ?? 0) - (a.followers_count ?? a.followers ?? 0)
  );

  return combined.map(mapProfileToArtist);
}
