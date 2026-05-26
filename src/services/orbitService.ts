import { supabase } from '@/lib/supabase';

export type ChannelKey = 'rehearsals' | 'gigs' | 'socials' | 'magazine' | 'media';

export interface ChannelPreview {
  lastContent: string | null;
  lastAt: string | null;
  lastSender: string | null;
  hasUnread: boolean;
}

// ── Per-channel "last opened" tracking via localStorage ──────────────────────

function readKey(bandId: string, channel: ChannelKey) {
  return `orbit_read_${bandId}_${channel}`;
}

export function getLastRead(bandId: string, channel: ChannelKey): string | null {
  try { return localStorage.getItem(readKey(bandId, channel)); } catch { return null; }
}

export function markChannelRead(bandId: string, channel: ChannelKey): void {
  try { localStorage.setItem(readKey(bandId, channel), new Date().toISOString()); } catch {}
}

// ── Channel previews ──────────────────────────────────────────────────────────

export async function getChannelPreviews(
  bandId: string,
  currentUserId: string,
): Promise<Partial<Record<ChannelKey, ChannelPreview>>> {
  const KEYS: ChannelKey[] = ['rehearsals', 'gigs', 'socials', 'magazine', 'media'];

  const results = await Promise.all(
    KEYS.map(ch =>
      supabase
        .from('band_messages')
        .select('id, content, created_at, sender_id, sender:profiles(display_name, username)')
        .eq('band_id', bandId)
        .eq('channel', ch)
        .order('created_at', { ascending: false })
        .limit(1),
    ),
  );

  const previews: Partial<Record<ChannelKey, ChannelPreview>> = {};
  KEYS.forEach((ch, i) => {
    const msg = results[i].data?.[0] as any;
    const lastRead = getLastRead(bandId, ch);
    previews[ch] = {
      lastContent: msg?.content ?? null,
      lastAt: msg?.created_at ?? null,
      lastSender: msg ? (msg.sender?.display_name || msg.sender?.username || null) : null,
      hasUnread: !!(msg && msg.sender_id !== currentUserId && (!lastRead || msg.created_at > lastRead)),
    };
  });
  return previews;
}

// ── Media upload ──────────────────────────────────────────────────────────────

export async function uploadBandMedia(
  file: File,
  bandId: string,
): Promise<{ url: string; type: 'image' | 'video' | 'file' } | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${bandId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('band-media')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return null;

  const { data: { publicUrl } } = supabase.storage.from('band-media').getPublicUrl(path);
  const type: 'image' | 'video' | 'file' = file.type.startsWith('image/')
    ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
  return { url: publicUrl, type };
}

// ── Pin / unpin ───────────────────────────────────────────────────────────────

export async function setPinned(
  messageId: string, isPinned: boolean, pinnedBy: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from('band_messages')
    .update({ is_pinned: isPinned, pinned_by: isPinned ? pinnedBy : null })
    .eq('id', messageId);
  return !error;
}

// ── Band Posts (Home feed) ────────────────────────────────────────────────────

export interface BandPost {
  id: string;
  band_id: string;
  author_id: string;
  title: string | null;
  content: string;
  image_url: string | null;
  created_at: string;
  author?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

export async function getBandPosts(bandId: string): Promise<BandPost[]> {
  const { data } = await supabase
    .from('band_posts')
    .select('*, author:profiles(display_name, username, avatar_url)')
    .eq('band_id', bandId)
    .order('created_at', { ascending: false })
    .limit(30);
  return (data ?? []) as BandPost[];
}

export async function createBandPost(
  bandId: string, authorId: string, content: string,
  title?: string, imageUrl?: string,
): Promise<BandPost | null> {
  const { data, error } = await supabase
    .from('band_posts')
    .insert({ band_id: bandId, author_id: authorId, content, title: title || null, image_url: imageUrl || null })
    .select('*, author:profiles(display_name, username, avatar_url)')
    .single();
  if (error) return null;
  return data as BandPost;
}

export async function deleteBandPost(postId: string): Promise<boolean> {
  const { error } = await supabase.from('band_posts').delete().eq('id', postId);
  return !error;
}

// ── Band Calendar ─────────────────────────────────────────────────────────────

export type EventType = 'rehearsal' | 'gig' | 'deadline' | 'other';

export interface BandEvent {
  id: string;
  band_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  type: EventType;
  channel: string | null;
  created_by: string | null;
  is_pinned?: boolean;
  created_at: string;
}

export async function getBandEvents(
  bandId: string, year: number, month: number,
): Promise<BandEvent[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end   = `${year}-${String(month).padStart(2, '0')}-31`;
  const { data } = await supabase
    .from('band_events').select('*')
    .eq('band_id', bandId)
    .gte('event_date', start).lte('event_date', end)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true });
  return data ?? [];
}

export async function getUpcomingEvents(bandId: string, limit = 5): Promise<BandEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('band_events').select('*')
    .eq('band_id', bandId)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function createBandEvent(
  event: Omit<BandEvent, 'id' | 'created_at'>,
): Promise<BandEvent | null> {
  const { data, error } = await supabase.from('band_events').insert(event).select().single();
  if (error) return null;
  return data;
}

export async function deleteBandEvent(eventId: string): Promise<boolean> {
  const { error } = await supabase.from('band_events').delete().eq('id', eventId);
  return !error;
}

export async function getPinnedEvents(bandId: string): Promise<BandEvent[]> {
  const { data } = await supabase
    .from('band_events').select('*')
    .eq('band_id', bandId).eq('is_pinned', true)
    .order('event_date', { ascending: true });
  return data ?? [];
}

export async function pinBandEvent(eventId: string, isPinned: boolean): Promise<boolean> {
  const { error } = await supabase.from('band_events').update({ is_pinned: isPinned }).eq('id', eventId);
  return !error;
}

// ── Shared Notes ──────────────────────────────────────────────────────────────

export interface BandNote {
  content: string;
  updated_by: string | null;
  updated_at: string;
  updater?: { display_name: string | null; username: string | null } | null;
}

export async function getBandNote(bandId: string, channel: ChannelKey): Promise<BandNote | null> {
  const { data } = await supabase
    .from('band_notes')
    .select('content, updated_by, updated_at, updater:profiles(display_name, username)')
    .eq('band_id', bandId).eq('channel', channel)
    .maybeSingle();
  if (!data) return null;
  return data as BandNote;
}

export async function saveBandNote(
  bandId: string, channel: ChannelKey, content: string, userId: string,
): Promise<boolean> {
  const { error } = await supabase.from('band_notes').upsert(
    { band_id: bandId, channel, content, updated_by: userId, updated_at: new Date().toISOString() },
    { onConflict: 'band_id,channel' },
  );
  return !error;
}

// ── @mention Notifications ────────────────────────────────────────────────────

export async function getMentionCounts(
  bandId: string, userId: string,
): Promise<Partial<Record<ChannelKey, number>>> {
  const { data } = await supabase
    .from('band_notifications')
    .select('channel')
    .eq('band_id', bandId).eq('recipient_id', userId).is('read_at', null);
  const counts: Partial<Record<ChannelKey, number>> = {};
  (data ?? []).forEach((row: any) => {
    counts[row.channel as ChannelKey] = (counts[row.channel as ChannelKey] ?? 0) + 1;
  });
  return counts;
}

export async function markMentionsRead(
  bandId: string, channel: ChannelKey, userId: string,
): Promise<void> {
  await supabase.from('band_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('band_id', bandId).eq('channel', channel).eq('recipient_id', userId).is('read_at', null);
}

// ── Band Todos ────────────────────────────────────────────────────────────────
// Requires DB table: band_todos(id uuid pk, band_id uuid fk bands, created_by uuid fk profiles,
//   content text, completed bool default false, completed_by uuid nullable fk profiles,
//   completed_at timestamptz nullable, created_at timestamptz default now())

export interface BandTodo {
  id: string;
  band_id: string;
  created_by: string;
  content: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  creator?: { display_name: string | null; username: string | null } | null;
}

export async function getBandTodos(bandId: string): Promise<BandTodo[]> {
  const { data } = await supabase
    .from('band_todos')
    .select('*, creator:profiles!created_by(display_name, username)')
    .eq('band_id', bandId)
    .order('completed', { ascending: true })
    .order('created_at', { ascending: true });
  return (data ?? []) as BandTodo[];
}

export async function createBandTodo(bandId: string, userId: string, content: string): Promise<BandTodo | null> {
  const { data, error } = await supabase
    .from('band_todos')
    .insert({ band_id: bandId, created_by: userId, content, completed: false })
    .select('*, creator:profiles!created_by(display_name, username)')
    .single();
  if (error) return null;
  return data as BandTodo;
}

export async function toggleBandTodo(todoId: string, completed: boolean, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('band_todos')
    .update({ completed, completed_by: completed ? userId : null, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', todoId);
  return !error;
}

export async function deleteBandTodo(todoId: string): Promise<boolean> {
  const { error } = await supabase.from('band_todos').delete().eq('id', todoId);
  return !error;
}

export async function createMentionNotifications(
  messageId: string, bandId: string, channel: string,
  senderId: string, recipientIds: string[],
): Promise<void> {
  if (recipientIds.length === 0) return;
  await supabase.from('band_notifications').insert(
    recipientIds.map(recipientId => ({
      band_id: bandId, message_id: messageId, channel, sender_id: senderId, recipient_id: recipientId,
    })),
  );
}
