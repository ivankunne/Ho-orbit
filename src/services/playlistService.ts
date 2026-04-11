import { tracks } from '@data/mockData.js';

// TODO: replace with → api.get('/playlists?userId=X')
export async function getPlaylists(userId) {
  try {
    return JSON.parse(localStorage.getItem(`ho_playlists_${userId}`) || '[]');
  } catch {
    return [];
  }
}

// TODO: replace with → api.get('/playlists/:id')
export async function getPlaylist(userId, playlistId) {
  const playlists = await getPlaylists(userId);
  return playlists.find(p => String(p.id) === String(playlistId)) ?? null;
}

// TODO: replace with → api.post('/playlists', payload)
export async function createPlaylist({ name, userId }) {
  const playlists = await getPlaylists(userId);
  const playlist = {
    id: Date.now(),
    name,
    userId,
    createdAt: new Date().toISOString(),
    trackIds: [],
  };
  const next = [...playlists, playlist];
  localStorage.setItem(`ho_playlists_${userId}`, JSON.stringify(next));
  return playlist;
}

// TODO: replace with → api.patch('/playlists/:id', { name })
export async function renamePlaylist(userId, playlistId, name) {
  const playlists = await getPlaylists(userId);
  const next = playlists.map(p => String(p.id) === String(playlistId) ? { ...p, name } : p);
  localStorage.setItem(`ho_playlists_${userId}`, JSON.stringify(next));
  return next;
}

// TODO: replace with → api.delete('/playlists/:id')
export async function deletePlaylist(userId, playlistId) {
  const playlists = await getPlaylists(userId);
  const next = playlists.filter(p => String(p.id) !== String(playlistId));
  localStorage.setItem(`ho_playlists_${userId}`, JSON.stringify(next));
  return next;
}

// TODO: replace with → api.post('/playlists/:id/tracks', { trackId })
export async function addTrackToPlaylist(userId, playlistId, trackId) {
  const playlists = await getPlaylists(userId);
  const next = playlists.map(p => {
    if (String(p.id) !== String(playlistId)) return p;
    if (p.trackIds.includes(trackId)) return p;
    return { ...p, trackIds: [...p.trackIds, trackId] };
  });
  localStorage.setItem(`ho_playlists_${userId}`, JSON.stringify(next));
  return next;
}

// TODO: replace with → api.delete('/playlists/:id/tracks/:trackId')
export async function removeTrackFromPlaylist(userId, playlistId, trackId) {
  const playlists = await getPlaylists(userId);
  const next = playlists.map(p => {
    if (String(p.id) !== String(playlistId)) return p;
    return { ...p, trackIds: p.trackIds.filter(id => id !== trackId) };
  });
  localStorage.setItem(`ho_playlists_${userId}`, JSON.stringify(next));
  return next;
}

// TODO: replace with → api.patch('/playlists/:id/tracks/reorder', { trackIds })
export async function reorderPlaylistTracks(userId, playlistId, newTrackIds) {
  const playlists = await getPlaylists(userId);
  const next = playlists.map(p =>
    String(p.id) === String(playlistId) ? { ...p, trackIds: newTrackIds } : p
  );
  localStorage.setItem(`ho_playlists_${userId}`, JSON.stringify(next));
  return next;
}

// Helper: resolve trackIds to full track objects
export function resolveTrackObjects(trackIds) {
  return trackIds.map(id => tracks.find(t => t.id === id)).filter(Boolean);
}
