function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

export type UploadStatus = 'pending' | 'approved' | 'rejected';

export interface UploadedTrack {
  id: string;
  title: string;
  artist: string;
  artistId: number;
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
  uploadedBy: number;
  isUserUpload: boolean;
  status: UploadStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: number | null;
}

// TODO: replace with → api.post('/tracks/upload', formData)
export async function uploadTrack({ title, genre, description, tags, explicit, isPrivate, userId, artistName }): Promise<UploadedTrack> {
  await new Promise(r => setTimeout(r, 400));

  const seed = hashStr(title + userId);
  const track: UploadedTrack = {
    id: `upload-${Date.now()}`,
    title,
    artist: artistName || 'Jij',
    artistId: userId,
    genre: genre || 'Overig',
    description,
    tags,
    explicit,
    isPrivate,
    cover: `https://picsum.photos/seed/${seed}/300/300`,
    plays: 0,
    duration: '3:00',
    trending: false,
    weeklyRank: null,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userId,
    isUserUpload: true,
    status: 'pending',
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null,
  };

  const stored = _loadUploads();
  localStorage.setItem('ho_uploaded_tracks', JSON.stringify([track, ...stored]));
  return track;
}

// TODO: replace with → api.get('/tracks/uploaded?userId=X')
export async function getUploadedTracks(userId?: number): Promise<UploadedTrack[]> {
  const stored = _loadUploads();
  return userId ? stored.filter(t => t.uploadedBy === userId) : stored;
}

export async function getAllUploads(): Promise<UploadedTrack[]> {
  return _loadUploads();
}

export async function approveUpload(trackId: string, adminId: number): Promise<void> {
  const stored = _loadUploads();
  const updated = stored.map(t =>
    t.id === trackId
      ? { ...t, status: 'approved' as UploadStatus, reviewedAt: new Date().toISOString(), reviewedBy: adminId, rejectionReason: null }
      : t
  );
  localStorage.setItem('ho_uploaded_tracks', JSON.stringify(updated));
}

export async function rejectUpload(trackId: string, adminId: number, reason: string): Promise<void> {
  const stored = _loadUploads();
  const updated = stored.map(t =>
    t.id === trackId
      ? { ...t, status: 'rejected' as UploadStatus, reviewedAt: new Date().toISOString(), reviewedBy: adminId, rejectionReason: reason || null }
      : t
  );
  localStorage.setItem('ho_uploaded_tracks', JSON.stringify(updated));
}

function _loadUploads(): UploadedTrack[] {
  try { return JSON.parse(localStorage.getItem('ho_uploaded_tracks') || '[]'); }
  catch { return []; }
}
