// Edge Function: stripe-cancel
//
// Cancels the logged-in user's subscription at the end of the current
// billing period (they keep access until then, no further charges after).
// This is the direct in-app "Opzeggen" button — the Customer Portal
// (stripe-portal) also offers cancellation for users who go that route.
// profiles.plan/cancel_at_period_end update via the stripe-webhook once
// Stripe sends customer.subscription.updated for this change.
//
// Body: {}
// Response: { currentPeriodEnd: string | null }
//
// Deploy:  supabase functions deploy stripe-cancel
// Secrets: STRIPE_SECRET_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { stripeRequest } from '../_shared/stripe.ts';

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
      .select('stripe_subscription_id')
      .eq('id', userData.user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile?.stripe_subscription_id) return json({ error: 'Geen actief abonnement gevonden.' }, 404);

    const subscription = await stripeRequest<{ current_period_end: number }>(
      'POST',
      `/subscriptions/${profile.stripe_subscription_id}`,
      { cancel_at_period_end: true },
    );

    return json({ currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString() });
  } catch (err) {
    console.error('stripe-cancel error:', err);
    return json({ error: 'Opzeggen is niet gelukt. Probeer het later opnieuw.' }, 500);
  }
});
