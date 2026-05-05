import { supabase } from '@/lib/supabase';

const DEMO_URLS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
];

export async function getStreamUrl(trackId, streamUrl?: string) {
  if (streamUrl) return streamUrl;
  // Hash the id so both integer and UUID ids map to a valid demo index
  const str = String(trackId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  return DEMO_URLS[Math.abs(hash) % DEMO_URLS.length];
}

export async function getQueue(trackIds) {
  if (!trackIds.length) return [];
  const { data } = await supabase.from('tracks').select('*').in('id', trackIds);
  return data ?? [];
}

export async function incrementPlays(trackId: string | number) {
  await supabase.rpc('increment_track_plays', { track_id: trackId });
}

export async function getAllTracks() {
  const { data } = await supabase
    .from('tracks')
    .select('*')
    .or('is_user_upload.is.null,is_user_upload.eq.false,upload_status.eq.approved');
  return (data ?? []).map(t => {
    const cover = t.cover_url || `https://picsum.photos/seed/${encodeURIComponent(String(t.title || t.id))}/300/300`;
    return { ...t, cover_url: cover, cover };
  });
}
