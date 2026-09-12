import { supabase } from '@/lib/supabase';

export interface NetworkingPost {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  genre: string;
  location: string;
  tags: string[];
  event_id?: string | null;
  track_title: string;
  status: string;
  created_at: string;
  /** Null zolang je geen Pro hebt — zie contact_locked. */
  contact_info: string | null;
  /** Er zijn contactgegevens, maar je mag ze (nog) niet zien. */
  contact_locked?: boolean;
  poster?: { username: string; display_name: string; avatar_url: string };
}

const PUBLIC_VIEW = 'networking_posts_public';

/**
 * Oproepen lezen gaat via networking_posts_public. Die view laat de oproep
 * zelf aan iedereen zien maar vult contact_info alleen in voor wie Pro heeft —
 * de tabel eronder blijft dicht (paywall_browse_gate_migration.sql).
 *
 * Twee losse queries in plaats van een embed: PostgREST kan relaties op een
 * view niet altijd afleiden, en dat stil laten mislukken is erger dan één
 * extra rondje. Draait de migratie nog niet, dan valt hij terug op de tabel,
 * zodat een deploy vóór de migratie de homepage niet leeghaalt.
 */
export async function fetchNetworkingPosts({
  limit,
  types,
}: { limit?: number; types?: string[] } = {}): Promise<NetworkingPost[]> {
  const select = (from: string) =>
    supabase.from(from).select('*').eq('status', 'open').order('created_at', { ascending: false });

  const run = (from: string) => {
    let q = select(from);
    if (types?.length) q = q.in('type', types);
    if (limit) q = q.limit(limit);
    return q;
  };

  let { data, error } = await run(PUBLIC_VIEW);

  if (error) {
    // Bestaat de view nog niet, dan is de migratie simpelweg nog niet gedraaid:
    // terugvallen op de tabel. PostgREST meldt dat als PGRST205 ("Could not
    // find the table ... in the schema cache"), Postgres zelf als 42P01.
    const missingView =
      error.code === 'PGRST205' ||
      error.code === '42P01' ||
      /could not find|does not exist/i.test(error.message ?? '');
    if (!missingView) {
      console.warn('[networking] posts ophalen mislukt:', error.message);
      return [];
    }
    ({ data, error } = await run('networking_posts'));
    if (error) {
      console.warn('[networking] posts ophalen mislukt:', error.message);
      return [];
    }
  }

  const posts = (data ?? []) as NetworkingPost[];
  if (!posts.length) return posts;

  const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
  if (!userIds.length) return posts;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url')
    .in('id', userIds);

  const byId = new Map((profiles ?? []).map(p => [p.id, p]));
  return posts.map(p => ({ ...p, poster: byId.get(p.user_id) as NetworkingPost['poster'] }));
}
