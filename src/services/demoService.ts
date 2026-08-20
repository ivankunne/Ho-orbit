import { supabase } from '@/lib/supabase';
import { getAudioDuration, uploadDemoTrack, uploadDemoVoiceNote } from './uploadService';
import { notifyAdminUpload } from './emailService';

export type VoteType = 'fire' | 'trash';

export interface DemoSubmission {
  id: string;
  userId: string | null;
  artistName: string;
  trackTitle: string;
  trackUrl: string;
  voiceNoteUrl: string;
  duration: string;
  fireCount: number;
  trashCount: number;
  createdAt: string;
  avatarUrl: string;
}

function mapDemo(d: Record<string, unknown>): DemoSubmission {
  const profile = d.profiles as { avatar_url?: string } | null;
  return {
    id: d.id as string,
    userId: (d.user_id as string) ?? null,
    artistName: d.artist_name as string,
    trackTitle: d.track_title as string,
    trackUrl: d.track_url as string,
    voiceNoteUrl: d.voice_note_url as string,
    duration: (d.duration as string) ?? '0:00',
    fireCount: (d.fire_count as number) ?? 0,
    trashCount: (d.trash_count as number) ?? 0,
    createdAt: d.created_at as string,
    avatarUrl: profile?.avatar_url ?? '',
  };
}

// ISO-8601 week number — no date-fns/dayjs dependency in this project.
export function getWeekLabel(dateString: string): string {
  const date = new Date(dateString);
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNr = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `Week ${weekNr}`;
}

export async function fetchDemos(): Promise<DemoSubmission[]> {
  const { data, error } = await supabase
    .from('demo_submissions')
    .select('*, profiles(avatar_url)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDemo);
}

export async function fetchMyVotes(userId: string): Promise<Record<string, VoteType>> {
  const { data, error } = await supabase
    .from('demo_votes')
    .select('submission_id, vote_type')
    .eq('user_id', userId);
  if (error) throw error;
  const votes: Record<string, VoteType> = {};
  for (const row of data ?? []) votes[row.submission_id as string] = row.vote_type as VoteType;
  return votes;
}

export async function submitDemo({
  userId, artistName, trackTitle, trackFile, voiceFile, onStep, onProgress,
}: {
  userId: string; artistName: string; trackTitle: string; trackFile: File; voiceFile: File;
  onStep?: (step: 'track' | 'voice' | 'saving') => void;
  onProgress?: (pct: number) => void;
}): Promise<DemoSubmission> {
  const duration = await getAudioDuration(trackFile);

  onStep?.('track');
  const trackUrl = await uploadDemoTrack(trackFile, userId, trackTitle, onProgress);

  onStep?.('voice');
  const voiceNoteUrl = await uploadDemoVoiceNote(voiceFile, userId, trackTitle, onProgress);

  onStep?.('saving');
  const { data, error } = await supabase
    .from('demo_submissions')
    .insert({
      user_id: userId,
      artist_name: artistName || 'Onbekend',
      track_title: trackTitle,
      track_url: trackUrl,
      voice_note_url: voiceNoteUrl,
      duration,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || 'Opslaan in database mislukt');

  // Only auto-promote a plain listener — never clobber a specialized role.
  await supabase.from('profiles').update({ role: 'Artiest' }).eq('id', userId).eq('role', 'Luisteraar');
  notifyAdminUpload('demo', trackTitle, '/drop-your-demo');

  return mapDemo(data);
}

export async function voteDemo(submissionId: string, userId: string, voteType: VoteType): Promise<{ fireCount: number; trashCount: number }> {
  const { data: existing } = await supabase
    .from('demo_votes')
    .select('vote_type')
    .eq('submission_id', submissionId)
    .eq('user_id', userId)
    .maybeSingle();

  const { data: current } = await supabase
    .from('demo_submissions')
    .select('fire_count, trash_count')
    .eq('id', submissionId)
    .single();
  let fireCount = (current?.fire_count as number) ?? 0;
  let trashCount = (current?.trash_count as number) ?? 0;

  if (existing?.vote_type === voteType) {
    // Same vote again — un-vote.
    await supabase.from('demo_votes').delete().eq('submission_id', submissionId).eq('user_id', userId);
    if (voteType === 'fire') fireCount = Math.max(0, fireCount - 1);
    else trashCount = Math.max(0, trashCount - 1);
  } else if (existing) {
    // Switching from one vote type to the other.
    await supabase.from('demo_votes').delete().eq('submission_id', submissionId).eq('user_id', userId);
    await supabase.from('demo_votes').insert({ submission_id: submissionId, user_id: userId, vote_type: voteType });
    if (voteType === 'fire') { fireCount += 1; trashCount = Math.max(0, trashCount - 1); }
    else { trashCount += 1; fireCount = Math.max(0, fireCount - 1); }
  } else {
    await supabase.from('demo_votes').insert({ submission_id: submissionId, user_id: userId, vote_type: voteType });
    if (voteType === 'fire') fireCount += 1;
    else trashCount += 1;
  }

  await supabase.from('demo_submissions').update({ fire_count: fireCount, trash_count: trashCount }).eq('id', submissionId);
  return { fireCount, trashCount };
}

export async function deleteDemo(submissionId: string): Promise<void> {
  const { error } = await supabase.from('demo_submissions').delete().eq('id', submissionId);
  if (error) throw error;
}
