// Aanmeldingen voor de scenekaart.
//
//   { action: 'submit', place, contact, website_confirm }   — iedereen, ook zonder account
//   { action: 'get', token }                                 — beoordeelpagina laadt de aanvraag
//   { action: 'approve' | 'reject', token }                  — admin beoordeelt vanuit de maillink
//
// verify_jwt staat uit: aanvragers hebben meestal geen account, en de admin
// komt binnen via de link in de mail. Die link bevat een lange willekeurige
// token; wie de token heeft, mag die ene aanvraag beoordelen — verder niets.
// Het accepteren gebeurt pas na een klik op de pagina, niet door het openen
// van de link: mailscanners (Outlook, Gmail) openen links automatisch.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { adminEmailRecipients } from '../_shared/adminEmails.ts';
import { sceneSubmissionEmail, sceneApprovedEmail } from '../_shared/emails.ts';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://h-orbit.nl';
const PROVINCES = new Set([
  'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg',
  'Noord-Brabant', 'Noord-Holland', 'Overijssel', 'Utrecht', 'Zeeland', 'Zuid-Holland',
]);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const TOKEN_RE = /^[0-9a-f]{64}$/;
const MAX_PER_HOUR = 5;           // per IP, tegen spam
const TOKEN_DAYS = 60;            // daarna verloopt de beoordeellink

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const text = (v: unknown, max: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function newToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

type Admin = ReturnType<typeof createClient>;

async function submit(admin: Admin, req: Request, body: Record<string, unknown>) {
  // Honeypot: een verborgen veld dat mensen niet zien en bots wel invullen.
  // Doe alsof het gelukt is, zodat een bot niet leert wat er misging.
  if (text(body.website_confirm, 10)) return json({ ok: true });

  const p = (body.place ?? {}) as Record<string, unknown>;
  const c = (body.contact ?? {}) as Record<string, unknown>;
  const place = {
    name: text(p.name, 120),
    type: text(p.type, 40),
    address: text(p.address, 160),
    city: text(p.city, 80),
    province: text(p.province, 40),
    website: text(p.website, 200)?.replace(/^https?:\/\//i, '').replace(/\/$/, '') ?? null,
    notes: text(p.notes, 120),
    description: text(p.description, 3000),
    lat: Number(p.lat),
    lng: Number(p.lng),
  };
  const contact = { name: text(c.name, 100), email: text(c.email, 200)?.toLowerCase() ?? null, message: text(c.message, 1000) };

  if (!place.name || !place.type || !place.city || !place.province || !PROVINCES.has(place.province)) {
    return json({ error: 'Vul naam, type, plaats en provincie in.' }, 400);
  }
  // Ruim om Nederland heen; alles daarbuiten is een verkeerd gezette pin.
  if (!(place.lat > 50.6 && place.lat < 53.7 && place.lng > 3.2 && place.lng < 7.3)) {
    return json({ error: 'Zet de pin op de kaart op de juiste plek in Nederland.' }, 400);
  }
  if (!contact.name || !contact.email || !EMAIL_RE.test(contact.email)) {
    return json({ error: 'Vul je naam en een geldig e-mailadres in.' }, 400);
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const ip_hash = ip ? await sha256(`scene:${ip}`) : null;
  if (ip_hash) {
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from('scene_location_submissions')
      .select('id', { count: 'exact', head: true }).eq('ip_hash', ip_hash).gte('created_at', since);
    if ((count ?? 0) >= MAX_PER_HOUR) return json({ error: 'Je hebt net al een paar locaties aangemeld. Probeer het over een uur nog eens.' }, 429);
  }

  const token = newToken();
  const { error } = await admin.from('scene_location_submissions').insert({
    token, ...place, contact_name: contact.name, contact_email: contact.email, message: contact.message, ip_hash,
  });
  if (error) {
    console.error('[scene-submission] insert failed:', error.message);
    return json({ error: 'Opslaan is mislukt. Probeer het later opnieuw.' }, 500);
  }

  const { data: admins } = await admin.from('profiles').select('id, display_name, username').eq('is_admin', true);
  const recipients = await adminEmailRecipients(
    admin, (admins ?? []).map((a) => ({ id: a.id as string, name: (a.display_name || a.username || '') as string })),
  );
  const reviewUrl = `${SITE_URL}/dutch-scene/aanvraag/${token}`;
  let emailed = 0;
  await Promise.all([...recipients].map(async ([to, name]) => {
    const { subject, html } = sceneSubmissionEmail({
      recipientName: name, reviewUrl, place, contactName: contact.name!, contactEmail: contact.email!, message: contact.message,
    });
    // Antwoorden op de mail gaan naar de aanvrager, handig bij vragen.
    const sent = await sendEmail({ to, subject, html, replyTo: contact.email! });
    if (sent.ok) emailed += 1; else console.warn('[scene-submission] admin email failed:', sent.error);
  }));

  return json({ ok: true, emailed });
}

async function load(admin: Admin, token: string) {
  const { data } = await admin.from('scene_location_submissions').select('*').eq('token', token).maybeSingle();
  if (!data) return null;
  const expired = data.status === 'pending' && Date.now() - new Date(data.created_at).getTime() > TOKEN_DAYS * 86400_000;
  return { ...data, expired };
}

// Wat de beoordeelpagina te zien krijgt. Geen token, IP-hash of interne id's.
const publicView = (s: Record<string, unknown>) => ({
  status: s.status, expired: s.expired, name: s.name, type: s.type, address: s.address, city: s.city,
  province: s.province, website: s.website, notes: s.notes, description: s.description, lat: s.lat, lng: s.lng,
  contact_name: s.contact_name, contact_email: s.contact_email, message: s.message,
  created_at: s.created_at, reviewed_at: s.reviewed_at, location_id: s.location_id,
});

async function review(admin: Admin, token: string, action: 'approve' | 'reject') {
  const s = await load(admin, token);
  if (!s) return json({ error: 'Deze aanvraag bestaat niet (meer).' }, 404);
  if (s.status !== 'pending') return json({ ok: true, already: true, submission: publicView(s) });
  if (s.expired) return json({ error: 'Deze link is verlopen.' }, 410);

  const now = new Date().toISOString();
  if (action === 'reject') {
    const { data } = await admin.from('scene_location_submissions')
      .update({ status: 'rejected', reviewed_at: now }).eq('id', s.id).eq('status', 'pending').select('*');
    return json({ ok: true, submission: publicView({ ...(data?.[0] ?? s), expired: false }) });
  }

  // Eerst de aanvraag claimen (alleen als hij nog pending is), dan pas de
  // locatie aanmaken: twee admins die tegelijk op "Accepteren" drukken maken
  // zo geen dubbele marker.
  const { data: claimed } = await admin.from('scene_location_submissions')
    .update({ status: 'approved', reviewed_at: now }).eq('id', s.id).eq('status', 'pending').select('id');
  if (!claimed?.length) return json({ ok: true, already: true, submission: publicView((await load(admin, token))!) });

  const { data: loc, error } = await admin.from('scene_locations').insert({
    name: s.name, type: s.type, address: s.address, city: s.city, province: s.province,
    website: s.website, notes: s.notes, description: s.description, lat: s.lat, lng: s.lng,
  }).select('id').single();
  if (error || !loc) {
    console.error('[scene-submission] location insert failed:', error?.message);
    await admin.from('scene_location_submissions').update({ status: 'pending', reviewed_at: null }).eq('id', s.id);
    return json({ error: 'Op de kaart zetten is mislukt. Probeer het opnieuw.' }, 500);
  }
  await admin.from('scene_location_submissions').update({ location_id: loc.id }).eq('id', s.id);

  const { subject, html } = sceneApprovedEmail({
    contactName: s.contact_name as string, placeName: s.name as string, mapUrl: `${SITE_URL}/dutch-scene`,
  });
  const sent = await sendEmail({ to: s.contact_email as string, subject, html });
  if (!sent.ok) console.warn('[scene-submission] approval email failed:', sent.error);

  return json({ ok: true, submission: publicView({ ...s, status: 'approved', reviewed_at: now, location_id: loc.id, expired: false }) });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const action = body.action;
  if (action === 'submit') return submit(admin, req, body);

  const token = String(body.token ?? '');
  if (!TOKEN_RE.test(token)) return json({ error: 'Ongeldige link.' }, 400);
  if (action === 'get') {
    const s = await load(admin, token);
    return s ? json({ submission: publicView(s) }) : json({ error: 'Deze aanvraag bestaat niet (meer).' }, 404);
  }
  if (action === 'approve' || action === 'reject') return review(admin, token, action);
  return json({ error: 'Unknown action' }, 400);
});
