import { supabase } from '@/lib/supabase';
import { mapProfileToArtist } from '@utils/artistHelpers';

export async function search(query: string) {
  if (!query || query.trim().length < 2) {
    return { artists: [], tracks: [], events: [], tutorials: [], articles: [] };
  }

  const q = query.trim();

  const [artistRes, trackRes, eventRes, tutorialRes, articleRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%,location.ilike.%${q}%,bio.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('tracks')
      .select('id, title, artist_name, genre, cover_url, artist_id')
      .or(`title.ilike.%${q}%,artist_name.ilike.%${q}%,genre.ilike.%${q}%`)
      .or('is_user_upload.is.null,is_user_upload.eq.false,upload_status.eq.approved')
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
    artists: (artistRes.data ?? []).map(mapProfileToArtist),
    tracks: trackRes.data ?? [],
    events: eventRes.data ?? [],
    tutorials: tutorialRes.data ?? [],
    articles: articleRes.data ?? [],
  };
}
