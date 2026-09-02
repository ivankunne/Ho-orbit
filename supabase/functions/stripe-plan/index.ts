// Edge Function: stripe-plan
//
// Returns display info (amount/currency/interval/taxInclusive) for the
// H-orbit Pro price so the Abonnement screen never has to hardcode a price
// that can drift from what's actually configured in Stripe.
//
// Body: {}
// Response: { amount: number (cents), currency: string, interval: string, taxInclusive: boolean }
//
// Deploy:  supabase functions deploy stripe-plan
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID

import { corsHeaders } from '../_shared/cors.ts';
import { stripeRequest } from '../_shared/stripe.ts';

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

  try {
    const price = await stripeRequest<{
      unit_amount: number;
      currency: string;
      recurring: { interval: string };
      tax_behavior: string;
    }>('GET', `/prices/${STRIPE_PRICE_ID}`);

    return json({
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval ?? 'month',
      taxInclusive: price.tax_behavior === 'inclusive',
    });
  } catch (err) {
    console.error('stripe-plan error:', err);
    return json({ error: 'Kon planinformatie niet ophalen.' }, 500);
  }
});
