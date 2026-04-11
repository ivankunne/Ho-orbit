// Simple hash from a string for generating deterministic picsum seeds
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

// TODO: replace with → api.post('/tracks/upload', formData) with multipart/form-data
export async function uploadTrack({ title, genre, description, tags, explicit, isPrivate, userId, artistName }) {
  // Simulate a short delay
  await new Promise(r => setTimeout(r, 400));

  const seed = hashStr(title + userId);
  const track = {
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
  };

  const stored = _loadUploads();
  const next = [track, ...stored];
  localStorage.setItem('ho_uploaded_tracks', JSON.stringify(next));
  return track;
}

// TODO: replace with → api.get('/tracks/uploaded?userId=X')
export async function getUploadedTracks(userId) {
  const stored = _loadUploads();
  return userId ? stored.filter(t => t.uploadedBy === userId) : stored;
}

function _loadUploads() {
  try { return JSON.parse(localStorage.getItem('ho_uploaded_tracks') || '[]'); }
  catch { return []; }
}
