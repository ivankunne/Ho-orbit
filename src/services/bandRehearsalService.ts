import { supabase } from '@/lib/supabase';
import { getAudioDuration, uploadRehearsalRecording } from '@services/uploadService';

// DB table defined in supabase/band_rehearsal_recordings_migration.sql

export interface BandRehearsalRecording {
  id: string;
  band_id: string;
  uploaded_by: string | null;
  title: string;
  description: string | null;
  audio_url: string;
  duration: string | null;
  created_at: string;
}

export async function getBandRehearsalRecordings(bandId: string): Promise<BandRehearsalRecording[]> {
  const { data } = await supabase
    .from('band_rehearsal_recordings').select('*')
    .eq('band_id', bandId).order('created_at', { ascending: false });
  return data ?? [];
}

export async function createBandRehearsalRecording(
  file: File, bandId: string, title: string, description: string, uploadedBy: string,
  onProgress?: (pct: number) => void,
): Promise<BandRehearsalRecording | null> {
  const duration = await getAudioDuration(file);
  const audioUrl = await uploadRehearsalRecording(file, bandId, title, onProgress);
  const { data, error } = await supabase
    .from('band_rehearsal_recordings')
    .insert({
      band_id: bandId, uploaded_by: uploadedBy, title,
      description: description.trim() || null, audio_url: audioUrl, duration,
    })
    .select().single();
  if (error) return null;
  return data;
}

export async function deleteBandRehearsalRecording(recordingId: string): Promise<boolean> {
  const { error } = await supabase.from('band_rehearsal_recordings').delete().eq('id', recordingId);
  return !error;
}
