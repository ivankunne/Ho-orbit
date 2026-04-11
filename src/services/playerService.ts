import { tracks } from '@data/mockData.js';

// Royalty-free demo audio URLs (SoundHelix)
const DEMO_URLS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
];

// TODO: replace with → stream from CDN or API endpoint per track ID
export async function getStreamUrl(trackId) {
  const index = (trackId - 1) % DEMO_URLS.length;
  return DEMO_URLS[index];
}

// TODO: replace with → api.get('/queue') or user-defined queue from backend
export async function getQueue(trackIds) {
  return tracks.filter(t => trackIds.includes(t.id));
}

// TODO: replace with → api.get('/tracks')
export async function getAllTracks() {
  return tracks;
}
