// Thin wrapper around the Stripe REST API — same pattern as _shared/resend.ts:
// plain `fetch`, no SDK, to keep Edge Function bundles small and avoid
// Node/Deno SDK-compat issues.

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_API_VERSION = '2026-06-24.dahlia';

function toFormParams(input: Record<string, unknown>, prefix = ''): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          pairs.push(...toFormParams(item as Record<string, unknown>, `${paramKey}[${i}]`));
        } else {
          pairs.push([`${paramKey}[${i}]`, String(item)]);
        }
      });
    } else if (typeof value === 'object') {
      pairs.push(...toFormParams(value as Record<string, unknown>, paramKey));
    } else {
      pairs.push([paramKey, String(value)]);
    }
  }
  return pairs;
}

export async function stripeRequest<T = any>(
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');

  const auth = btoa(`${STRIPE_SECRET_KEY}:`);
  let url = `https://api.stripe.com/v1${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Stripe-Version': STRIPE_API_VERSION,
    },
  };

  if (params && method === 'POST') {
    const body = new URLSearchParams(toFormParams(params));
    init.headers = { ...init.headers, 'Content-Type': 'application/x-www-form-urlencoded' };
    init.body = body.toString();
  } else if (params && method === 'GET') {
    url += `?${new URLSearchParams(toFormParams(params)).toString()}`;
  }

  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `Stripe ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

// Verifies a Stripe-Signature header per
// https://docs.stripe.com/webhooks#verify-events — implemented by hand
// (rather than the Stripe SDK's constructEvent) since it's a few lines of Web
// Crypto and keeps this function dependency-free.
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.split('=') as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signedPayload = `${timestamp}.${rawBody}`;
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
