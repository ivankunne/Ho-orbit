import { supabase } from '@/lib/supabase';

const DEMO_URLS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
];

export async function getStreamUrl(trackId) {
  const index = (trackId - 1) % DEMO_URLS.length;
  return DEMO_URLS[index];
}

export async function getQueue(trackIds) {
  if (!trackIds.length) return [];
  const { data } = await supabase.from('tracks').select('*').in('id', trackIds);
  return data ?? [];
}

export async function getAllTracks() {
  const { data } = await supabase
    .from('tracks')
    .select('*')
    .or('is_user_upload.is.null,is_user_upload.eq.false,upload_status.eq.approved');
  return data ?? [];
}
