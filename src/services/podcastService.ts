import { supabase } from '@/lib/supabase';
import { getAudioDuration, uploadAudioFile, uploadCoverFile } from '@services/uploadService';
import { notifyAdminUpload } from '@services/emailService';
import type { Podcast, PodcastEpisode } from '@context/PodcastContext';

export type EpisodeStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewEpisode extends PodcastEpisode {
  upload_status: EpisodeStatus;
  rejection_reason: string | null;
  podcast: { id: string; title: string; cover_image_url: string | null } | null;
}

/** Podcasts van deze gebruiker (om een aflevering aan toe te voegen). */
export async function getMyPodcasts(userId: string): Promise<Podcast[]> {
  const { data } = await supabase.from('podcasts').select('*').eq('owner_id', userId).order('created_at');
  return (data ?? []) as Podcast[];
}

/** Nieuwe podcast (show). Vereist de Podcast-rol; de database controleert dat. */
export async function createPodcast(userId: string, input: { title: string; genre?: string; description?: string; cover?: File | null }): Promise<Podcast> {
  const cover_image_url = input.cover ? await uploadCoverFile(input.cover, input.title) : null;
  const { data, error } = await supabase.from('podcasts').insert({
    owner_id: userId,
    title: input.title.trim(),
    genre: input.genre || null,
    description: input.description?.trim() || null,
    cover_image_url,
  }).select('*');
  if (error) throw new Error(error.message.includes('row-level security')
    ? 'Je hebt de rol Podcaster nodig om een podcast te maken.'
    : 'Podcast aanmaken mislukt. Probeer het opnieuw.');
  if (!data?.length) throw new Error('Podcast aanmaken mislukt.');
  notifyAdminUpload('podcast', input.title, '/podcasts');
  return data[0] as Podcast;
}

/**
 * Aflevering uploaden. Van een gewone gebruiker staat hij daarna op
 * 'pending' tot een admin hem goedkeurt (trigger in
 * podcast_episode_approval_migration.sql); van een admin staat hij meteen live.
 * Geeft de status terug die de database heeft gekozen.
 */
export async function submitEpisode(
  podcastId: string,
  input: { title: string; description?: string; file: File },
  onProgress?: (pct: number) => void,
): Promise<EpisodeStatus> {
  const duration = await getAudioDuration(input.file);
  const audio_url = await uploadAudioFile(input.file, input.title, onProgress);
  const { count } = await supabase.from('podcast_episodes')
    .select('id', { count: 'exact', head: true }).eq('podcast_id', podcastId);
  const { data, error } = await supabase.from('podcast_episodes').insert({
    podcast_id: podcastId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    audio_url,
    duration,
    episode_number: (count ?? 0) + 1,
  }).select('upload_status');
  if (error || !data?.length) throw new Error('Aflevering opslaan mislukt. Probeer het opnieuw.');
  const status = (data[0].upload_status ?? 'approved') as EpisodeStatus;
  // Zelfde melding als bij muziek: bij 'pending' krijgen de admins ook een mail.
  notifyAdminUpload('podcast_episode', input.title, status === 'pending' ? '/admin' : `/podcasts/${podcastId}`);
  return status;
}

/* ── Beheer (admins) ─────────────────────────────────────────────────────── */

export async function getEpisodesForReview(): Promise<ReviewEpisode[]> {
  const { data } = await supabase.from('podcast_episodes')
    .select('*, podcast:podcasts(id, title, cover_image_url)')
    .order('created_at', { ascending: false });
  return (data ?? []) as ReviewEpisode[];
}

export async function reviewEpisode(id: string, adminId: string, status: 'approved' | 'rejected', reason?: string) {
  const { data, error } = await supabase.from('podcast_episodes').update({
    upload_status: status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
    rejection_reason: status === 'rejected' ? reason ?? null : null,
  }).eq('id', id).select('id');
  if (error || !data?.length) throw new Error('Beoordelen mislukt.');
}
