// Web Push sender for Edge Functions.
//
// Encrypts and delivers a push payload to every device a user has subscribed
// from, signing with our VAPID keypair. Subscriptions the push service reports
// as gone (HTTP 404/410) are pruned so the table stays clean.
//
// Secrets (set via `supabase secrets set --env-file …`):
//   VAPID_PUBLIC_KEY   — base64url, same value as the client's VITE_VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY  — base64url
//   VAPID_SUBJECT      — mailto: or https: contact (defaults to support@h-orbit.nl)

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@h-orbit.nl';

let configured = false;
function ensureConfigured(): boolean {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  if (!configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Push to all of a user's subscribed devices. Best-effort: never throws, so
 * callers can fire it alongside in-app/email without guarding. Returns counts
 * for logging.
 */
export async function sendPushToUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (s) => {
      const subscription = {
        endpoint: s.endpoint as string,
        keys: { p256dh: s.p256dh as string, auth: s.auth as string },
      };
      try {
        await webpush.sendNotification(subscription, body);
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // Subscription is dead — drop it.
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          removed++;
        } else {
          console.warn('[push] send failed:', status, (e as { body?: string })?.body ?? e);
        }
      }
    }),
  );

  return { sent, removed };
}
