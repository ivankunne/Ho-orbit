import { supabase } from '@/lib/supabase';
import type { GenreGroup } from '@data/genres';
import { resolveGenreQuery, type GenreMatch } from '@lib/genreSearch';

export interface SearchResults {
  /** Herkend genre (met subgenres), of null als de zoekterm geen genre is. */
  genre: GenreMatch | null;
  artists:  { id: string; name: string; slug: string; genre: string; location: string; image_url: string | null }[];
  tracks:   { id: string; title: string; artist_name: string; genre: string; cover_url: string | null; artist_id: string; stream_url: string | null; duration?: string | null }[];
  events:   { id: string; name: string; date: string; venue: string; city: string; genre: string; poster_url?: string | null }[];
  tutorials:{ id: string; title: string; difficulty: string; instructor: string }[];
  articles: { id: string; title: string; category: string; author: string }[];
  bands:    { id: string; name: string; genre: string; location: string; image_url: string | null }[];
  users:    { id: string; display_name: string | null; username: string; avatar_url: string | null; location: string | null }[];
  threads:  { id: string; title: string }[];
  podcasts: { id: string; title: string; genre: string | null; cover_image_url: string | null }[];
  masterclasses: { id: string; title: string; category: string; instructor_name: string | null }[];
}

export const EMPTY_RESULTS: SearchResults = {
  genre: null, artists: [], tracks: [], events: [], tutorials: [], articles: [], bands: [],
  users: [], threads: [], podcasts: [], masterclasses: [],
};

/**
 * Een waarde veilig in een PostgREST-filter zetten. De zoekterm werd eerder
 * rauw in `.or(...)` geplakt: een komma of haakje in de zoekopdracht brak dan
 * de hele query en er kwam niets terug. Tussen dubbele aanhalingstekens is
 * alles letterlijk, op " en \ na.
 */
const quote = (v: string) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const like = (v: string) => quote(`%${v}%`);
const list = (vs: string[]) => vs.map(quote).join(',');

/** Filter voor een tekstkolom-set plus, als er een genre herkend is, de genres zelf. */
function textOr(q: string, columns: string[], extra: string[] = []) {
  return [...columns.map(c => `${c}.ilike.${like(q)}`), ...extra].join(',');
}

export interface SearchOptions {
  /** Genrecatalogus (uit GenreContext) om genres en subgenres te herkennen. */
  groups?: GenreGroup[];
  /** Resultaten per soort. De overlay toont er een paar, de zoekpagina alles. */
  limit?: number;
}

export async function search(query: string, { groups = [], limit = 5 }: SearchOptions = {}): Promise<SearchResults> {
  if (!query || query.trim().length < 2) return EMPTY_RESULTS;
  const q = query.trim();

  const genre = resolveGenreQuery(q, groups);
  // Een herkend genre zoekt op de exacte genrelabels (incl. subgenres) én op
  // de tags. Zonder genre blijft het een gewone tekstzoekopdracht.
  const g = genre?.labels ?? [];
  const genreIn  = g.length ? [`genre.in.(${list(g)})`] : [];
  const tagsHit  = g.length ? [`tags.ov.{${list(g)}}`] : [];
  const n = (x: number) => Math.max(1, Math.round(limit * x));

  const [artistRes, trackRes, eventRes, tutorialRes, articleRes, bandRes, userRes, threadRes, podcastRes, mcRes] = await Promise.all([
    supabase.from('artists')
      .select('id, name, slug, genre, location, image_url')
      .or(textOr(q, ['name', 'genre', 'location', 'bio'], [...genreIn, ...tagsHit]))
      .limit(n(1)),

    // Alleen wat openbaar te beluisteren is: goedgekeurd en niet privé.
    supabase.from('tracks')
      .select('id, title, artist_name, genre, cover_url, artist_id, stream_url, duration')
      .eq('upload_status', 'approved')
      .or('is_private.is.null,is_private.eq.false')
      .or(textOr(q, ['title', 'artist_name', 'genre', 'description'], [...genreIn, ...tagsHit]))
      .order('plays', { ascending: false })
      .limit(n(1.2)),

    supabase.from('events')
      .select('id, name, date, venue, city, genre, poster_url')
      .or(textOr(q, ['name', 'city', 'genre', 'venue', 'description'], genreIn))
      .order('date', { ascending: false })
      .limit(n(0.8)),

    supabase.from('tutorials')
      .select('id, title, difficulty, instructor')
      .or(textOr(q, ['title', 'instructor', 'description'], tagsHit))
      .limit(n(0.8)),

    supabase.from('articles')
      .select('id, title, category, author')
      .or(textOr(q, ['title', 'category', 'author']))
      .limit(n(0.6)),

    supabase.from('bands')
      .select('id, name, genre, location, image_url')
      .eq('is_public', true)
      .or(textOr(q, ['name', 'genre', 'location', 'description'], genreIn))
      .limit(n(0.8)),

    // Expliciete kolommen: profiles bevat ook e-mailadressen.
    supabase.from('profiles')
      .select('id, display_name, username, avatar_url, location')
      .or(textOr(q, ['display_name', 'username']))
      .limit(n(0.8)),

    supabase.from('forum_threads')
      .select('id, title')
      .ilike('title', `%${q}%`)
      .limit(n(0.6)),

    supabase.from('podcasts')
      .select('id, title, genre, cover_image_url')
      .or(textOr(q, ['title', 'genre', 'description'], genreIn))
      .limit(n(0.6)),

    supabase.from('masterclasses')
      .select('id, title, category, instructor_name')
      .or(textOr(q, ['title', 'description', 'instructor_name']))
      .limit(n(0.6)),
  ]);

  // Een mislukte deelquery mag de rest niet meenemen, maar wel in de console.
  const pick = <T,>(res: { data: unknown; error: { message: string } | null }, name: string): T[] => {
    if (res.error) console.warn(`[search] ${name}:`, res.error.message);
    return (res.data ?? []) as T[];
  };

  return {
    genre,
    artists:   pick(artistRes, 'artists'),
    tracks:    pick(trackRes, 'tracks'),
    events:    pick(eventRes, 'events'),
    tutorials: pick(tutorialRes, 'tutorials'),
    articles:  pick(articleRes, 'articles'),
    bands:     pick(bandRes, 'bands'),
    users:     pick(userRes, 'users'),
    threads:   pick(threadRes, 'threads'),
    podcasts:  pick(podcastRes, 'podcasts'),
    masterclasses: pick(mcRes, 'masterclasses'),
  };
}
