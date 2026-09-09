// Edge Function: stripe-plan
//
// Returns display info (amount/currency/interval/taxInclusive) for both
// H-orbit Pro prices — monthly and yearly — so the Abonnement screen never
// has to hardcode a price that can drift from what's actually configured in
// Stripe.
//
// Body: {}
// Response: { month: PlanInfo | null, year: PlanInfo | null }
//   PlanInfo = { amount: number (cents), currency: string, interval: string, taxInclusive: boolean }
//
// Deploy:  supabase functions deploy stripe-plan
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_PRICE_ID_YEARLY

import { corsHeaders } from '../_shared/cors.ts';
import { stripeRequest } from '../_shared/stripe.ts';

const PRICE_IDS: Record<'month' | 'year', string> = {
  month: Deno.env.get('STRIPE_PRICE_ID') ?? '',
  year: Deno.env.get('STRIPE_PRICE_ID_YEARLY') ?? '',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface StripePrice {
  unit_amount: number;
  currency: string;
  recurring: { interval: string };
  tax_behavior: string;
}

async function fetchPlanInfo(priceId: string) {
  if (!priceId) return null;
  const price = await stripeRequest<StripePrice>('GET', `/prices/${priceId}`);
  return {
    amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval ?? 'month',
    taxInclusive: price.tax_behavior === 'inclusive',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const [month, year] = await Promise.all([
      fetchPlanInfo(PRICE_IDS.month),
      fetchPlanInfo(PRICE_IDS.year),
    ]);
    return json({ month, year });
  } catch (err) {
    console.error('stripe-plan error:', err);
    return json({ error: 'Kon planinformatie niet ophalen.' }, 500);
  }
});
