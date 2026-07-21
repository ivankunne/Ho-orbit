import * as tus from 'tus-js-client';
import { supabase } from '@/lib/supabase';
import { upsertArtistFromProfile } from '@utils/artistHelpers';
import { coverPlaceholder } from '@utils/placeholder';

// Resumable uploads go straight to the storage host, not the API host.
const STORAGE_PROJECT_REF = new URL(import.meta.env.VITE_SUPABASE_URL as string).hostname.split('.')[0];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: string | null | undefined) => !!id && UUID_RE.test(id);

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
  stream_url: string;
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

function getAudioDuration(file: File): Promise<string> {
  // Read duration from the streamed metadata via an <audio> element. We must NOT
  // decode the whole file into PCM (decodeAudioData) here: a normal song decodes
  // to hundreds of MB of memory and OOM-crashes the tab on mobile — which is the
  // majority of our users — making uploads silently fail. The element streams the
  // file instead, and the player refines the duration via 'durationchange' anyway.
  return new Promise(resolve => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    let done = false;

    const finish = (value: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      resolve(value);
    };

    const format = (secs: number) =>
      `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`;

    // Never block the upload on duration detection — resolve after 10s regardless.
    const timer = setTimeout(() => finish('0:00'), 10_000);

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        finish(format(audio.duration));
      } else {
        // VBR file without an accurate header — seek past the end so the browser
        // scans the file and reports the real duration via the 'seeked' event.
        // This streams, it does not allocate the decoded file in memory.
        audio.currentTime = 1e101;
      }
    };
    audio.onseeked = () => {
      finish(isFinite(audio.duration) && audio.duration > 0 ? format(audio.duration) : '0:00');
    };
    audio.onerror = () => finish('0:00');
    audio.src = url;
  });
}

async function uploadAudioFile(file: File, trackTitle: string, onProgress?: (pct: number) => void): Promise<string> {
  const ext = (file.name.split('.').pop() ?? 'mp3').toLowerCase();
  const safeName = trackTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const path = `${Date.now()}_${safeName}.${ext}`;
  // Map extension → a canonical MIME type. The browser-reported file.type is
  // inconsistent for some formats (.wav can be audio/x-wav, audio/wave, or empty),
  // so prefer a known type by extension and only fall back to file.type.
  const EXT_MIME: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
  };
  const contentType = EXT_MIME[ext] || file.type || `audio/${ext}`;
  console.log('[upload] starting resumable storage upload', { path, size: file.size, contentType });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Je bent uitgelogd — log opnieuw in en probeer het nogmaals.');

  // Songs (and especially long-form uploads like radio shows) can run into the
  // hundreds of MB — a single-shot upload has no way to recover from a dropped
  // mobile connection partway through. Resumable (TUS) uploads retry in 6MB
  // chunks and can resume a previous attempt instead of restarting from zero.
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${STORAGE_PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'audio',
        objectName: path,
        contentType,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // required by Supabase's resumable endpoint — do not change
      onProgress: (bytesUploaded, bytesTotal) => onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100)),
      onSuccess: () => resolve(),
      onError: reject,
    });

    upload.findPreviousUploads().then(previousUploads => {
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    });
  });

  console.log('[upload] storage upload complete');
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

export async function uploadEventPoster(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `posters/${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from('audio').upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('audio').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadTrack({
  title, genre, description, tags, explicit, isPrivate, userId, artistName, audioFile, coverFile, isrc, upc, onStep, onAudioProgress,
}: {
  title: string; genre: string; description: string; tags: string[];
  explicit: boolean; isPrivate: boolean; userId: string; artistName: string;
  audioFile?: File; coverFile?: File; isrc?: string; upc?: string;
  onStep?: (step: 'audio' | 'cover' | 'saving') => void;
  onAudioProgress?: (pct: number) => void;
}): Promise<UploadedTrack> {
  let streamUrl = '';
  let duration = '0:00';
  if (audioFile) {
    duration = await getAudioDuration(audioFile);
    onStep?.('audio');
    streamUrl = await uploadAudioFile(audioFile, title, onAudioProgress);
  }

  let coverUrl = coverPlaceholder(title);
  if (coverFile) {
    onStep?.('cover');
    try {
      coverUrl = await uploadCoverFile(coverFile, title);
    } catch (e) {
      console.warn('Cover upload failed, using placeholder:', e);
    }
  }

  onStep?.('saving');
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
      duration,
      is_user_upload: true,
      ...(isUUID(userId) ? { uploaded_by: userId } : {}),
      upload_status: 'pending',
      isrc: isrc?.trim() || null,
      upc: upc?.trim() || null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || 'Opslaan in database mislukt');

  // Upsert into artists table and promote role
  if (isUUID(userId)) {
    await Promise.all([
      upsertArtistFromProfile(userId, genre, artistName),
      supabase.from('profiles').update({ role: 'Artiest' }).eq('id', userId).neq('role', 'Artiest'),
    ]);
  }

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
  const { error, data: track } = await supabase
    .from('tracks')
    .update({
      upload_status: 'approved',
      reviewed_at: new Date().toISOString(),
      ...(isUUID(adminId) ? { reviewed_by: adminId } : {}),
      rejection_reason: null,
    })
    .eq('id', trackId)
    .select('uploaded_by')
    .single();
  if (error) throw error;

  // Upsert into artists table and promote role at approval time
  if (track?.uploaded_by && isUUID(track.uploaded_by)) {
    const { data: fullTrack } = await supabase.from('tracks').select('genre, artist_name').eq('id', trackId).single();
    await Promise.all([
      upsertArtistFromProfile(track.uploaded_by, fullTrack?.genre || 'Overig', fullTrack?.artist_name || 'Artiest'),
      supabase.from('profiles').update({ role: 'Artiest' }).eq('id', track.uploaded_by).neq('role', 'Artiest'),
    ]);
  }
}

export async function rejectUpload(trackId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('tracks')
    .update({
      upload_status: 'rejected',
      rejection_reason: reason ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', trackId);
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
    stream_url: (d.stream_url as string) ?? '',
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
