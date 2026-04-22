import { supabase } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: unknown) => typeof id === 'string' && UUID_RE.test(id);

export async function getHistory(userId: string) {
  if (!isUUID(userId)) return [];
  const { data } = await supabase
    .from('play_history')
    .select('track_id, played_at, tracks(*)')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(50);
  if (!data) return [];
  return data
    .filter((e) => e.tracks)
    .map((e) => ({ trackId: e.track_id, playedAt: e.played_at, track: e.tracks }));
}

export async function addToHistory(userId: string, trackId: number | string) {
  if (!isUUID(userId) || !trackId) return;
  await supabase
    .from('play_history')
    .delete()
    .eq('user_id', userId)
    .eq('track_id', trackId);
  await supabase.from('play_history').insert({ user_id: userId, track_id: trackId });
}

export async function clearHistory(userId: string) {
  if (!isUUID(userId)) return;
  await supabase.from('play_history').delete().eq('user_id', userId);
}
