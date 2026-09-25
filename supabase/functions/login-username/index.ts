// Inloggen met een gebruikersnaam in plaats van een e-mailadres.
//
// Vroeger zocht de browser het e-mailadres zelf op in profiles.email — en
// daardoor kon iedereen, ook zonder account, van elke gebruiker het
// e-mailadres opvragen. Nu gebeurt de opzoeking hier, op de server: de
// function zoekt het inlogadres in auth.users, logt in met het wachtwoord en
// geeft alleen de sessie terug. Het e-mailadres verlaat de server nooit.
//
// Bij een onbekende gebruikersnaam en bij een fout wachtwoord komt precies
// dezelfde melding terug, zodat je niet kunt uitproberen welke namen bestaan.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const WRONG = { error: 'invalid_credentials' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const { username, password } = await req.json().catch(() => ({}));
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    return json(WRONG, 400);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: profile } = await admin.from('profiles').select('id').ilike('username', username.trim().replace(/[\\%_]/g, (c) => '\\' + c)).maybeSingle();
  if (!profile) return json(WRONG, 400);

  const { data: u } = await admin.auth.admin.getUserById(profile.id);
  const email = u?.user?.email;
  if (!email) return json(WRONG, 400);

  // Inloggen met de anon-key, net als de browser zou doen: zo gelden dezelfde
  // regels (bevestigd e-mailadres, geblokkeerde accounts, limieten).
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    // Geef "e-mail nog niet bevestigd" wel door: dat helpt de gebruiker en zegt niets over het adres.
    const code = error?.message?.toLowerCase().includes('not confirmed') ? 'email_not_confirmed' : WRONG.error;
    return json({ error: code }, 400);
  }
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
