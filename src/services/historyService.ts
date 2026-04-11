import { tracks as allTracks } from '@data/mockData.js';

const MAX_HISTORY = 50;

// TODO: replace with → api.get('/listening-history?userId=X')
export async function getHistory(userId) {
  try {
    const entries = JSON.parse(localStorage.getItem(`ho_history_${userId}`) || '[]');
    // Resolve track objects
    return entries
      .map(e => ({ ...e, track: allTracks.find(t => t.id === e.trackId) }))
      .filter(e => e.track);
  } catch {
    return [];
  }
}

// TODO: replace with → api.post('/listening-history', { trackId, userId, playedAt })
export async function addToHistory(userId, trackId) {
  if (!userId || !trackId) return;
  try {
    const stored = JSON.parse(localStorage.getItem(`ho_history_${userId}`) || '[]');
    // Deduplicate — remove existing entry for this track
    const deduped = stored.filter(e => e.trackId !== trackId);
    const next = [{ trackId, playedAt: new Date().toISOString() }, ...deduped].slice(0, MAX_HISTORY);
    localStorage.setItem(`ho_history_${userId}`, JSON.stringify(next));
  } catch {
    // Silent fail — history is non-critical
  }
}

// TODO: replace with → api.delete('/listening-history?userId=X')
export async function clearHistory(userId) {
  localStorage.removeItem(`ho_history_${userId}`);
}
