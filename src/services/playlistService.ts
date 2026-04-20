import { supabase } from '@/lib/supabase';

export async function getPlaylists(userId: string) {
  const { data } = await supabase
    .from('playlists')
    .select('*, playlist_tracks(track_id, position)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    userId: p.user_id,
    createdAt: p.created_at,
    trackIds: (p.playlist_tracks as { track_id: number; position: number }[])
      .sort((a, b) => a.position - b.position)
      .map((t) => t.track_id),
  }));
}

export async function getPlaylist(userId: string, playlistId: string | number) {
  const playlists = await getPlaylists(userId);
  return playlists.find((p) => String(p.id) === String(playlistId)) ?? null;
}

export async function createPlaylist({ name, userId }: { name: string; userId: string }) {
  const { data, error } = await supabase
    .from('playlists')
    .insert({ name, user_id: userId })
    .select()
    .single();
  if (error || !data) throw error;
  return { id: data.id, name: data.name, userId: data.user_id, createdAt: data.created_at, trackIds: [] };
}

export async function renamePlaylist(userId: string, playlistId: string | number, name: string) {
  await supabase.from('playlists').update({ name }).eq('id', playlistId).eq('user_id', userId);
  return getPlaylists(userId);
}

export async function deletePlaylist(userId: string, playlistId: string | number) {
  await supabase.from('playlists').delete().eq('id', playlistId).eq('user_id', userId);
  return getPlaylists(userId);
}

export async function addTrackToPlaylist(userId: string, playlistId: string | number, trackId: number) {
  const existing = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = existing.data?.length ? (existing.data[0].position + 1) : 0;
  await supabase.from('playlist_tracks').upsert({ playlist_id: playlistId, track_id: trackId, position: nextPos });
  return getPlaylists(userId);
}

export async function removeTrackFromPlaylist(userId: string, playlistId: string | number, trackId: number) {
  await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId).eq('track_id', trackId);
  return getPlaylists(userId);
}

export async function reorderPlaylistTracks(userId: string, playlistId: string | number, newTrackIds: number[]) {
  await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId);
  if (newTrackIds.length) {
    await supabase.from('playlist_tracks').insert(
      newTrackIds.map((track_id, position) => ({ playlist_id: playlistId, track_id, position }))
    );
  }
  return getPlaylists(userId);
}

export async function resolveTrackObjects(trackIds: (number | string)[]) {
  if (!trackIds.length) return [];
  const { data } = await supabase.from('tracks').select('*').in('id', trackIds);
  const map = new Map((data ?? []).map(t => [String(t.id), t]));
  return trackIds.map(id => map.get(String(id))).filter(Boolean);
}
