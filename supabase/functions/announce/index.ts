// Eenmalige servicemail aan alle accounts (aankondiging "h-orbit is live").
//
// Alleen aan te roepen met de service-role key — niet vanuit de app, niet
// door gebruikers. Zo:
//   { mode: 'test', to: 'iemand@…', ... }  → één mail, om te controleren
//   { mode: 'dry-run', ... }               → alleen de ontvangerslijst tellen
//   { mode: 'all', ... }                   → iedereen met een bevestigd adres
//
// Ontvangers komen uit auth.users (het echte inlogadres), niet uit
// profiles.email. Overgeslagen: onbevestigde adressen, adressen zonder
// mailbox, testadressen en geschorste accounts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { NO_MAILBOX } from '../_shared/adminEmails.ts';
import { launchAnnouncementEmail } from '../_shared/emails.ts';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
const SKIP_DOMAINS = /@(example\.(com|org|net)|test\.|localhost)|\+test@/i;

Deno.serve(async (req) => {
  // Toegang = de aanroeper heeft een service-role key: daarmee (en alleen
  // daarmee) lukt auth.admin.listUsers. Een anon-key of gebruikerssessie faalt.
  const key = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!key) return json({ error: 'Forbidden' }, 403);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false } });
  const probe = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (probe.error) return json({ error: 'Forbidden' }, 403);

  const body = await req.json().catch(() => ({}));
  const { mode, to, skip = [], monthPrice, yearPrice, freeFeatures, proFeatures } = body;
  if (!monthPrice || !yearPrice || !Array.isArray(freeFeatures) || !Array.isArray(proFeatures)) {
    return json({ error: 'monthPrice, yearPrice, freeFeatures, proFeatures verplicht' }, 400);
  }
  const users: { id: string; email?: string; email_confirmed_at?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return json({ error: error.message }, 500);
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  const { data: profiles } = await admin.from('profiles').select('id, display_name, username, plan, suspended');
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const skipSet = new Set((skip as string[]).map((e) => e.toLowerCase()));

  const recipients = users
    .filter((u) => u.email && u.email_confirmed_at)
    .map((u) => ({ email: u.email!.toLowerCase(), p: byId.get(u.id) }))
    .filter((r) => !NO_MAILBOX.has(r.email) && !SKIP_DOMAINS.test(r.email) && !skipSet.has(r.email) && !r.p?.suspended);

  const build = (name: string, hasPro: boolean) =>
    launchAnnouncementEmail({ recipientName: name, hasPro, monthPrice, yearPrice, freeFeatures, proFeatures });

  if (mode === 'dry-run') {
    return json({ count: recipients.length, pro: recipients.filter((r) => r.p?.plan === 'paid').length });
  }
  if (mode === 'test') {
    if (!to) return json({ error: 'to verplicht' }, 400);
    const results = [];
    for (const hasPro of [false, true]) {
      const { subject, html } = build('Ivan', hasPro);
      results.push(await sendEmail({ to, subject: `[TEST${hasPro ? ' — Pro-versie' : ''}] ${subject}`, html }));
    }
    return json({ results });
  }
  if (mode === 'all') {
    let sent = 0; const failed: string[] = [];
    for (const r of recipients) {
      const { subject, html } = build(r.p?.display_name || r.p?.username || '', r.p?.plan === 'paid');
      const res = await sendEmail({ to: r.email, subject, html });
      if (res.ok) sent++; else failed.push(`${r.email}: ${res.error}`);
      await new Promise((ok) => setTimeout(ok, 600)); // Resend: max ~2 per seconde
    }
    return json({ sent, failed });
  }
  return json({ error: 'mode: test | dry-run | all' }, 400);
});
