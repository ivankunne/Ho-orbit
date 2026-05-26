import { supabase } from '@/lib/supabase';

export interface SearchResults {
  artists:  { id: string; name: string; slug: string; genre: string; location: string; image_url: string | null }[];
  tracks:   { id: string; title: string; artist_name: string; genre: string; cover_url: string | null; artist_id: string; stream_url: string | null }[];
  events:   { id: string; name: string; date: string; venue: string; city: string; genre: string }[];
  tutorials:{ id: string; title: string; difficulty: string; instructor: string }[];
  articles: { id: string; title: string; category: string; author: string }[];
  bands:    { id: string; name: string; genre: string; location: string; image_url: string | null }[];
  users:    { id: string; display_name: string | null; username: string; avatar_url: string | null; location: string | null }[];
  threads:  { id: string; title: string }[];
}

export async function search(query: string): Promise<SearchResults> {
  const empty: SearchResults = { artists: [], tracks: [], events: [], tutorials: [], articles: [], bands: [], users: [], threads: [] };
  if (!query || query.trim().length < 2) return empty;

  const q = query.trim();

  const [artistRes, trackRes, eventRes, tutorialRes, articleRes, bandRes, userRes, threadRes] = await Promise.all([
    supabase
      .from('artists')
      .select('id, name, slug, genre, location, image_url')
      .or(`name.ilike.%${q}%,genre.ilike.%${q}%,location.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('tracks')
      .select('id, title, artist_name, genre, cover_url, artist_id, stream_url')
      .or(`title.ilike.%${q}%,artist_name.ilike.%${q}%,genre.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('events')
      .select('id, name, date, venue, city, genre')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%,genre.ilike.%${q}%,venue.ilike.%${q}%`)
      .limit(4),

    supabase
      .from('tutorials')
      .select('id, title, difficulty, instructor')
      .or(`title.ilike.%${q}%,instructor.ilike.%${q}%`)
      .limit(4),

    supabase
      .from('articles')
      .select('id, title, category, author')
      .or(`title.ilike.%${q}%,category.ilike.%${q}%,author.ilike.%${q}%`)
      .limit(3),

    supabase
      .from('bands')
      .select('id, name, genre, location, image_url')
      .eq('is_public', true)
      .or(`name.ilike.%${q}%,genre.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(4),

    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, location')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(4),

    supabase
      .from('forum_threads')
      .select('id, title')
      .ilike('title', `%${q}%`)
      .limit(3),
  ]);

  return {
    artists:  (artistRes.data  ?? []) as SearchResults['artists'],
    tracks:   (trackRes.data   ?? []) as SearchResults['tracks'],
    events:   (eventRes.data   ?? []) as SearchResults['events'],
    tutorials:(tutorialRes.data ?? []) as SearchResults['tutorials'],
    articles: (articleRes.data ?? []) as SearchResults['articles'],
    bands:    (bandRes.data    ?? []) as SearchResults['bands'],
    users:    (userRes.data    ?? []) as SearchResults['users'],
    threads:  (threadRes.data  ?? []) as SearchResults['threads'],
  };
}
