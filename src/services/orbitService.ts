import { supabase } from '@/lib/supabase';

export type ChannelKey = 'rehearsals' | 'gigs' | 'socials' | 'magazine' | 'media';

export interface ChannelPreview {
  lastContent: string | null;
  lastAt: string | null;
  lastSender: string | null;
  /** True when the latest message is from someone else and was sent after the user last opened this channel. */
  hasUnread: boolean;
}

// ── Per-channel "last opened" tracking via localStorage ──────────────────────
// Avoids a DB round-trip; unread state is device-local (acceptable for MVP).

function readKey(bandId: string, channel: ChannelKey) {
  return `orbit_read_${bandId}_${channel}`;
}

export function getLastRead(bandId: string, channel: ChannelKey): string | null {
  try { return localStorage.getItem(readKey(bandId, channel)); } catch { return null; }
}

export function markChannelRead(bandId: string, channel: ChannelKey): void {
  try { localStorage.setItem(readKey(bandId, channel), new Date().toISOString()); } catch {}
}

// ── Channel previews (last message per channel) ───────────────────────────────
// Fires 5 lightweight queries in parallel (limit 1 each).
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
      // Unread: last message is from someone else and was sent after we last opened this channel.
      hasUnread: !!(
        msg &&
        msg.sender_id !== currentUserId &&
        (!lastRead || msg.created_at > lastRead)
      ),
    };
  });

  return previews;
}

// ── Media upload to Supabase Storage ─────────────────────────────────────────
// Requires the 'band-media' bucket to exist (see orbit_workspace_migration.sql).
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
    ? 'image'
    : file.type.startsWith('video/')
    ? 'video'
    : 'file';

  return { url: publicUrl, type };
}

// ── Pin / unpin a message (admin-gated in the UI) ─────────────────────────────
export async function setPinned(
  messageId: string,
  isPinned: boolean,
  pinnedBy: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from('band_messages')
    .update({ is_pinned: isPinned, pinned_by: isPinned ? pinnedBy : null })
    .eq('id', messageId);
  return !error;
}
