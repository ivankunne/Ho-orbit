import { supabase } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: string | null | undefined) => !!id && UUID_RE.test(id);

export type UploadStatus = 'pending' | 'approved';

export interface UploadedTrack {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  genre: string;
  description: string;
  tags: string[];
  explicit: boolean;
  isPrivate: boolean;
  cover: string;
  streamUrl: string;
  plays: number;
  duration: string;
  trending: boolean;
  weeklyRank: null;
  uploadedAt: string;
  uploadedBy: string;
  isUserUpload: boolean;
  status: UploadStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  isrc: string | null;
  upc: string | null;
}

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function uploadAudioFile(file: File, trackTitle: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'mp3';
  const safeName = trackTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const path = `${Date.now()}_${safeName}.${ext}`;
  const { error } = await supabase.storage.from('audio').upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('audio').getPublicUrl(path);
  return data.publicUrl;
}

async function uploadCoverFile(file: File, trackTitle: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const safeName = trackTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const path = `covers/${Date.now()}_${safeName}.${ext}`;
  const { error } = await supabase.storage.from('audio').upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('audio').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadTrack({
  title, genre, description, tags, explicit, isPrivate, userId, artistName, audioFile, coverFile, isrc, upc,
}: {
  title: string; genre: string; description: string; tags: string[];
  explicit: boolean; isPrivate: boolean; userId: string; artistName: string;
  audioFile?: File; coverFile?: File; isrc?: string; upc?: string;
}): Promise<UploadedTrack> {
  const seed = hashStr(title + userId);

  let streamUrl = '';
  if (audioFile) {
    try {
      streamUrl = await uploadAudioFile(audioFile, title);
    } catch (e) {
      console.warn('Audio upload to storage failed, saving metadata only:', e);
    }
  }

  let coverUrl = `https://picsum.photos/seed/${seed}/300/300`;
  if (coverFile) {
    try {
      coverUrl = await uploadCoverFile(coverFile, title);
    } catch (e) {
      console.warn('Cover upload to storage failed, using placeholder:', e);
    }
  }

  const { data, error } = await supabase
    .from('tracks')
    .insert({
      title,
      artist_name: artistName || 'Onbekend',
      genre: genre || 'Overig',
      description,
      tags,
      explicit,
      is_private: isPrivate,
      cover_url: coverUrl,
      stream_url: streamUrl,
      plays: 0,
      duration: '3:00',
      is_user_upload: true,
      ...(isUUID(userId) ? { uploaded_by: userId } : {}),
      upload_status: 'pending',
      isrc: isrc?.trim() || null,
      upc: upc?.trim() || null,
    })
    .select()
    .single();
  if (error || !data) throw error;
  return mapTrack(data);
}

export async function getUploadedTracks(userId?: string): Promise<UploadedTrack[]> {
  let query = supabase.from('tracks').select('*').eq('is_user_upload', true);
  if (userId && isUUID(userId)) query = query.eq('uploaded_by', userId);
  const { data } = await query.order('created_at', { ascending: false });
  return (data ?? []).map(mapTrack);
}

export async function getAllUploads(): Promise<UploadedTrack[]> {
  const { data } = await supabase
    .from('tracks')
    .select('*')
    .eq('is_user_upload', true)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapTrack);
}

export async function approveUpload(trackId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('tracks')
    .update({
      upload_status: 'approved',
      reviewed_at: new Date().toISOString(),
      ...(isUUID(adminId) ? { reviewed_by: adminId } : {}),
      rejection_reason: null,
    })
    .eq('id', trackId);
  if (error) throw error;
}

export async function rejectUpload(trackId: string): Promise<void> {
  const { error } = await supabase.from('tracks').delete().eq('id', trackId);
  if (error) throw error;
}

function mapTrack(d: Record<string, unknown>): UploadedTrack {
  return {
    id: String(d.id),
    title: d.title as string,
    artist: (d.artist_name as string) ?? '',
    artistId: (d.uploaded_by as string) ?? '',
    genre: (d.genre as string) ?? '',
    description: (d.description as string) ?? '',
    tags: (d.tags as string[]) ?? [],
    explicit: (d.explicit as boolean) ?? false,
    isPrivate: (d.is_private as boolean) ?? false,
    cover: (d.cover_url as string) ?? '',
    streamUrl: (d.stream_url as string) ?? '',
    plays: (d.plays as number) ?? 0,
    duration: (d.duration as string) ?? '',
    trending: (d.trending as boolean) ?? false,
    weeklyRank: null,
    uploadedAt: d.created_at as string,
    uploadedBy: (d.uploaded_by as string) ?? '',
    isUserUpload: true,
    status: (d.upload_status as UploadStatus) ?? 'pending',
    rejectionReason: (d.rejection_reason as string) ?? null,
    reviewedAt: (d.reviewed_at as string) ?? null,
    reviewedBy: (d.reviewed_by as string) ?? null,
    isrc: (d.isrc as string) ?? null,
    upc: (d.upc as string) ?? null,
  };
}
