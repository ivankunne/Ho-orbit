// Edge Function: stripe-checkout
//
// Starts a Stripe Checkout Session (mode: subscription) for the logged-in
// user's H-orbit Pro plan. Creates the Stripe Customer on first use and
// caches it on profiles.stripe_customer_id. The webhook (stripe-webhook)
// is what actually flips profiles.plan to 'paid' once payment succeeds —
// this function only ever hands back a URL to redirect the browser to.
//
// Body: {} (no params — plan/price is fixed via the STRIPE_PRICE_ID secret)
// Response: { url: string }
//
// Deploy:  supabase functions deploy stripe-checkout
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { stripeRequest } from '../_shared/stripe.ts';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://h-orbit.nl';
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!STRIPE_PRICE_ID) return json({ error: 'STRIPE_PRICE_ID is not configured' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseAuthed = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();
  if (userError || !userData?.user) return json({ error: 'Niet ingelogd.' }, 401);
  const user = userData.user;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;

    let customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripeRequest<{ id: string }>('POST', '/customers', {
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if (updateError) throw updateError;
    }

    const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      // Managed Payments doesn't support iDEAL — essential for a Dutch
      // audience — and makes Stripe/Link the merchant of record (their
      // branding on statements/receipts, their support/refund flow). Opt
      // out to keep iDEAL, H-orbit's own branding, and full control.
      managed_payments: { enabled: false },
      // Requires an active Tax Registration (NL, added via the API) — see
      // stripe_subscriptions migration notes. The Price has
      // tax_behavior=inclusive, so the €10 total never changes for the
      // customer; 21% NL VAT is carved out of that for reporting/remittance.
      automatic_tax: { enabled: true },
      // We always pass an existing Customer (created above), which has no
      // address on file yet. Without this, Stripe refuses with
      // customer_tax_location_invalid instead of collecting one in Checkout —
      // this tells Stripe it's fine to collect + save the address entered
      // at checkout onto that Customer.
      customer_update: { address: 'auto' },
      success_url: `${SITE_URL}/account?upgrade=success`,
      cancel_url: `${SITE_URL}/account?upgrade=cancelled`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('stripe-checkout error:', err);
    return json({ error: 'Kon geen checkout starten. Probeer het later opnieuw.' }, 500);
  }
});
