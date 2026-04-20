import { supabase } from '@/lib/supabase';

export async function search(query: string) {
  if (!query || query.trim().length < 2) {
    return { artists: [], tracks: [], events: [], tutorials: [], articles: [] };
  }

  const q = query.trim();

  const [artistRes, trackRes, eventRes, tutorialRes, articleRes] = await Promise.all([
    supabase
      .from('artists')
      .select('id, name, genre, location, image_url')
      .or(`name.ilike.%${q}%,genre.ilike.%${q}%,location.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('tracks')
      .select('id, title, artist, genre, cover_url, artist_id')
      .or(`title.ilike.%${q}%,artist.ilike.%${q}%,genre.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('events')
      .select('id, name, date, venue, city, genre')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%,genre.ilike.%${q}%`)
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
  ]);

  return {
    artists: artistRes.data ?? [],
    tracks: trackRes.data ?? [],
    events: eventRes.data ?? [],
    tutorials: tutorialRes.data ?? [],
    articles: articleRes.data ?? [],
  };
}
