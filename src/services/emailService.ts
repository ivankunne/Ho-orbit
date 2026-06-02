import { supabase } from '@/lib/supabase';

/**
 * Triggers the `notify` Edge Function, which writes an in-app notification for
 * the recipient and (if they haven't opted out) emails them via Resend.
 *
 * These calls are best-effort: the message/follow has already been persisted,
 * so a failed notification must never surface as a user-facing error.
 */

async function invokeNotify(body: Record<string, unknown>) {
  try {
    const { error } = await supabase.functions.invoke('notify', { body });
    if (error) console.warn('[notify] invoke failed:', error.message);
  } catch (e) {
    console.warn('[notify] invoke threw:', e);
  }
}

/** Notify the other participant that they received a chat message. */
export function notifyNewMessage(conversationId: string, messageId: string) {
  return invokeNotify({ kind: 'message', conversationId, messageId });
}

/** Notify a user that someone started following them. */
export function notifyNewFollower(targetUserId: string) {
  return invokeNotify({ kind: 'follow', targetUserId });
}
