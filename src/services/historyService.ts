import { supabase } from '@/lib/supabase';

export async function getHistory(userId: string) {
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

export async function addToHistory(userId: string, trackId: number) {
  if (!userId || !trackId) return;
  await supabase
    .from('play_history')
    .delete()
    .eq('user_id', userId)
    .eq('track_id', trackId);
  await supabase.from('play_history').insert({ user_id: userId, track_id: trackId });
}

export async function clearHistory(userId: string) {
  await supabase.from('play_history').delete().eq('user_id', userId);
}
