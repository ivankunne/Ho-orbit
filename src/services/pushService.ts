import { supabase } from '@/lib/supabase';

/**
 * Web Push opt-in/opt-out for the current device.
 *
 * Each browser/device has at most one push subscription, keyed in the database
 * by its `endpoint`. Enabling: ask permission → subscribe via the SW's
 * PushManager with our VAPID public key → upsert the subscription row.
 * The `notify` Edge Function fans pushes out to every row a user owns.
 *
 * iOS note: web push only works once the site is installed to the home screen
 * (iOS 16.4+). `pushSupported()` returns false in a plain iOS Safari tab.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export type PushState = 'unsupported' | 'unconfigured' | 'default' | 'granted' | 'denied';

/** Coarse capability/permission state for rendering the toggle. */
export function pushPermission(): PushState {
  if (!pushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'unconfigured';
  return Notification.permission as 'default' | 'granted' | 'denied';
}

/** True when this device currently holds an active push subscription. */
export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Get the active SW registration, registering on demand (e.g. in dev). */
async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing.active ? existing : navigator.serviceWorker.ready;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

interface Result {
  ok: boolean;
  error?: string;
}

/**
 * Request permission, subscribe this device, and persist the subscription.
 * Must be called from a user gesture (Safari/iOS require it for the prompt).
 */
export async function enablePush(userId: string): Promise<Result> {
  if (!pushSupported()) {
    return { ok: false, error: 'Pushmeldingen worden niet ondersteund op dit apparaat.' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, error: 'Pushmeldingen zijn nog niet geconfigureerd.' };
  }

  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Je hebt geen toestemming gegeven voor meldingen.' };
  }

  try {
    const reg = await getRegistration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: 'Kon geen geldig abonnement aanmaken.' };
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' },
      );
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Onbekende fout.' };
  }
}

/** Unsubscribe this device and remove its stored subscription. */
export async function disablePush(userId: string): Promise<Result> {
  if (!pushSupported()) return { ok: true };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Onbekende fout.' };
  }
}
