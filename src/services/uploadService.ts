import { supabase } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: string) => UUID_RE.test(id);

export type UploadStatus = 'pending' | 'approved' | 'rejected';

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
}

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function uploadTrack({
  title, genre, description, tags, explicit, isPrivate, userId, artistName,
}: {
  title: string; genre: string; description: string; tags: string[];
  explicit: boolean; isPrivate: boolean; userId: string; artistName: string;
}): Promise<UploadedTrack> {
  const seed = hashStr(title + userId);
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
      cover_url: `https://picsum.photos/seed/${seed}/300/300`,
      plays: 0,
      duration: '3:00',
      is_user_upload: true,
      ...(userId && isUUID(userId) ? { uploaded_by: userId } : {}),
      upload_status: 'pending',
    })
    .select()
    .single();
  if (error || !data) throw error;
  return mapTrack(data);
}

export async function getUploadedTracks(userId?: string): Promise<UploadedTrack[]> {
  let query = supabase.from('tracks').select('*').eq('is_user_upload', true);
  if (userId) query = query.eq('uploaded_by', userId);
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
  await supabase
    .from('tracks')
    .update({ upload_status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: adminId, rejection_reason: null })
    .eq('id', trackId);
}

export async function rejectUpload(trackId: string, adminId: string, reason: string): Promise<void> {
  await supabase
    .from('tracks')
    .update({ upload_status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: adminId, rejection_reason: reason || null })
    .eq('id', trackId);
}

function mapTrack(d: Record<string, unknown>): UploadedTrack {
  return {
    id: String(d.id),
    title: d.title as string,
    artist: d.artist_name as string,
    artistId: d.uploaded_by as string,
    genre: d.genre as string,
    description: d.description as string ?? '',
    tags: (d.tags as string[]) ?? [],
    explicit: d.explicit as boolean,
    isPrivate: d.is_private as boolean,
    cover: d.cover_url as string ?? '',
    plays: d.plays as number,
    duration: d.duration as string ?? '',
    trending: d.trending as boolean,
    weeklyRank: null,
    uploadedAt: d.created_at as string,
    uploadedBy: d.uploaded_by as string,
    isUserUpload: true,
    status: d.upload_status as UploadStatus,
    rejectionReason: d.rejection_reason as string | null,
    reviewedAt: d.reviewed_at as string | null,
    reviewedBy: d.reviewed_by as string | null,
  };
}
