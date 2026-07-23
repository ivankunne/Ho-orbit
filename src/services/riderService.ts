import { supabase } from '@/lib/supabase';

// Kept separate from orbitService.ts on purpose: PublicRiderPage (no login)
// only ever imports getPublicRider from this file, so its bundle doesn't
// pull in the rest of the auth-dependent BandSpace surface.

export type RiderType = 'technical' | 'hospitality' | 'stage_plot' | 'input_list' | 'lighting' | 'other';

export interface BandRider {
  id: string;
  band_id: string;
  type: RiderType;
  title: string;
  description: string | null;
  share_token: string;
  is_share_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BandRiderFile {
  id: string;
  rider_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface PublicRiderFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  size_bytes: number | null;
}

export interface PublicRider {
  id: string;
  type: RiderType;
  title: string;
  description: string | null;
  band_name: string;
  band_image_url: string | null;
  files: PublicRiderFile[];
}

export async function getBandRiders(bandId: string): Promise<BandRider[]> {
  const { data } = await supabase
    .from('band_riders').select('*')
    .eq('band_id', bandId).order('created_at', { ascending: true });
  return data ?? [];
}

export async function createRider(
  bandId: string, type: RiderType, title: string, description: string, createdBy: string,
): Promise<BandRider | null> {
  const { data, error } = await supabase
    .from('band_riders')
    .insert({ band_id: bandId, type, title, description: description || null, created_by: createdBy })
    .select().single();
  if (error) return null;
  return data;
}

export async function updateRider(
  riderId: string, updates: Partial<Pick<BandRider, 'type' | 'title' | 'description' | 'is_share_enabled'>>,
): Promise<boolean> {
  const { error } = await supabase
    .from('band_riders').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', riderId);
  return !error;
}

export async function deleteRider(riderId: string): Promise<boolean> {
  const { error } = await supabase.from('band_riders').delete().eq('id', riderId);
  return !error;
}

export async function regenerateRiderShareToken(riderId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('regenerate_rider_share_token', { p_rider_id: riderId });
  if (error) return null;
  return data;
}

export async function getRiderFiles(riderId: string): Promise<BandRiderFile[]> {
  const { data } = await supabase
    .from('band_rider_files').select('*')
    .eq('rider_id', riderId).order('created_at', { ascending: true });
  return data ?? [];
}

// Reuses the existing public band-media bucket (see uploadBandMedia in
// orbitService.ts) under a riders/ prefix — no private-bucket precedent
// exists in this app; the share_token is the actual security boundary.
export async function uploadRiderFile(
  file: File, riderId: string, uploadedBy: string,
): Promise<BandRiderFile | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `riders/${riderId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('band-media').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return null;

  const { data: { publicUrl } } = supabase.storage.from('band-media').getPublicUrl(path);

  const { data, error } = await supabase
    .from('band_rider_files')
    .insert({
      rider_id: riderId, file_url: publicUrl, file_name: file.name,
      file_type: file.type || null, size_bytes: file.size, uploaded_by: uploadedBy,
    })
    .select().single();
  if (error) return null;
  return data;
}

export async function deleteRiderFile(fileId: string, fileUrl: string): Promise<boolean> {
  const marker = '/band-media/';
  const idx = fileUrl.indexOf(marker);
  if (idx !== -1) {
    const path = decodeURIComponent(fileUrl.slice(idx + marker.length));
    try { await supabase.storage.from('band-media').remove([path]); } catch { /* best-effort */ }
  }
  const { error } = await supabase.from('band_rider_files').delete().eq('id', fileId);
  return !error;
}

export async function getPublicRider(token: string): Promise<PublicRider | null> {
  const { data, error } = await supabase.rpc('get_public_rider', { p_token: token });
  if (error || !data) return null;
  return data as PublicRider;
}
