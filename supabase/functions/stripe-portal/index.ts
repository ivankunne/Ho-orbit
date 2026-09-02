// Edge Function: stripe-portal
//
// Opens a Stripe Customer Portal session for the logged-in user so they can
// manage or cancel their own subscription, update payment method, etc.
// Requires the Customer Portal to be configured once in the Stripe Dashboard
// (Settings → Billing → Customer portal).
//
// Body: {}
// Response: { url: string }
//
// Deploy:  supabase functions deploy stripe-portal
// Secrets: STRIPE_SECRET_KEY, SITE_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { stripeRequest } from '../_shared/stripe.ts';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://h-orbit.nl';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseAuthed = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();
  if (userError || !userData?.user) return json({ error: 'Niet ingelogd.' }, 401);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userData.user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile?.stripe_customer_id) return json({ error: 'Geen abonnement gevonden.' }, 404);

    const session = await stripeRequest<{ url: string }>('POST', '/billing_portal/sessions', {
      customer: profile.stripe_customer_id,
      return_url: `${SITE_URL}/account`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('stripe-portal error:', err);
    return json({ error: 'Kon geen beheerpagina openen. Probeer het later opnieuw.' }, 500);
  }
});
