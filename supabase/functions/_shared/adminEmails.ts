import type { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Adressen zonder echte mailbox: niet naar mailen. Het superadmin-account logt
// in met een gegenereerd adres (zelfde als MASTER_ADMIN_EMAIL in
// src/pages/AdminLoginPage.tsx) waar geen post binnenkomt — elke mail erheen
// zou bouncen en de afzenderreputatie van h-orbit.nl bij Resend schaden.
// Meldingen in de app en push blijven voor dit account gewoon werken.
export const NO_MAILBOX = new Set(['ivan-master-2cc51a5f@h-orbit.nl']);

// Extra ontvangers van admin-mails die geen account hebben (en ook geen
// adminrechten nodig hebben): alleen de mail, geen melding in de app.
// Kommagescheiden, als secret op het project — niet in de code, want de repo
// staat op GitHub. Zet met: supabase secrets set ADMIN_NOTIFY_EMAILS=a@x.nl,b@y.nl
export const EXTRA_ADMIN_EMAILS = (Deno.env.get('ADMIN_NOTIFY_EMAILS') ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !NO_MAILBOX.has(e));

// Het adres van een account komt uit auth.users, niet uit profiles.email: dat
// veld wordt bij een e-mailwijziging nooit bijgewerkt.
export async function getUserEmail(admin: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    console.warn('[adminEmails] getUserEmail failed:', error.message);
    return null;
  }
  return data.user?.email ?? null;
}

/**
 * Alle adressen die een admin-mail krijgen: de admin-accounts (behalve wie er
 * in `exclude` staat) plus ADMIN_NOTIFY_EMAILS, ontdubbeld. Geeft adres →
 * aanhef (leeg voor de extra adressen).
 */
export async function adminEmailRecipients(
  admin: ReturnType<typeof createClient>,
  admins: { id: string; name: string }[],
): Promise<Map<string, string>> {
  const byAddress = new Map<string, string>();
  await Promise.all(
    admins.map(async (a) => {
      const to = (await getUserEmail(admin, a.id))?.toLowerCase();
      if (to && !NO_MAILBOX.has(to)) byAddress.set(to, a.name);
    }),
  );
  for (const to of EXTRA_ADMIN_EMAILS) if (!byAddress.has(to)) byAddress.set(to, '');
  return byAddress;
}
