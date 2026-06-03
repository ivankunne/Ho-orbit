import { supabase } from '@/lib/supabase';
import { coverPlaceholder } from '@utils/placeholder';

export async function getStreamUrl(_trackId, streamUrl?: string): Promise<string | null> {
  // No audio stored for this track — nothing to play.
  if (!streamUrl) return null;

  // For Supabase storage public URLs, generate a signed URL so they work
  // regardless of whether the bucket has public or private access configured.
  const storageMatch = streamUrl.match(/\/storage\/v1\/object\/public\/([^/?]+)\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    const [, bucket, path] = storageMatch;
    try {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(decodeURIComponent(path), 3600);
      if (data?.signedUrl) return data.signedUrl;
    } catch {
      // Signing failed — fall through to original URL
    }
  }

  return streamUrl;
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
    const cover = t.cover_url || coverPlaceholder(String(t.title || t.id));
    return {
      ...t,
      cover_url: cover,
      cover,
      // Uploads store the artist in artist_name; normalize so all code can read track.artist
      artist: t.artist || t.artist_name || '',
    };
  });
}
