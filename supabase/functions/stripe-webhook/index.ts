// Edge Function: stripe-webhook
//
// Public endpoint Stripe calls directly (no Supabase auth header, so this
// must be deployed with --no-verify-jwt). Trust comes only from the
// Stripe-Signature header, verified against STRIPE_WEBHOOK_SECRET. This is
// the only thing allowed to write profiles.plan — see
// protect_subscription_columns() in stripe_subscriptions_migration.sql.
//
// Configure in Stripe Dashboard → Developers → Webhooks:
//   URL:    <project ref>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated,
//           customer.subscription.deleted
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { stripeRequest, verifyStripeSignature, subscriptionPeriodEnd } from '../_shared/stripe.ts';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

// De BandSpace-stoelprijzen. Alles op een abonnement dat hier niet in staat,
// is het plan zelf.
const SEAT_PRICE_IDS = new Set(
  [Deno.env.get('STRIPE_SEAT_PRICE_ID'), Deno.env.get('STRIPE_SEAT_PRICE_ID_YEARLY')].filter(
    (id): id is string => !!id,
  ),
);

/** Aantal bijgekochte stoelen op dit abonnement (0 als er geen stoel-regel is). */
function seatQuantity(subscription: {
  items?: { data?: { quantity?: number; price?: { id?: string } }[] };
}): number {
  const item = (subscription.items?.data ?? []).find(
    (entry) => entry.price?.id && SEAT_PRICE_IDS.has(entry.price.id),
  );
  return item?.quantity ?? 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Statuses that count as an active paid plan. Includes past_due on purpose:
// that's a failed renewal charge Stripe is still automatically retrying
// (Smart Retries, configured in Dashboard → Settings → Billing → Subscriptions
// and emails), not a final failure — access stays on through that retry
// window so a card hiccup doesn't instantly lock someone out. Only once
// Stripe exhausts retries and moves the subscription to unpaid/canceled does
// this fall back to free.
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function syncSubscriptionByCustomer(
  supabaseAdmin: ReturnType<typeof createClient>,
  customerId: string,
  subscriptionId: string | null,
  status: string,
  currentPeriodEnd: number | null,
  cancelAtPeriodEnd: boolean,
  extraSeats = 0,
) {
  const plan = subscriptionId && ACTIVE_STATUSES.has(status) ? 'paid' : 'free';
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null;

  const { data: rows, error } = await supabaseAdmin
    .from('profiles')
    .update({
      plan,
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      current_period_end: periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    })
    .eq('stripe_customer_id', customerId)
    .select('id');
  if (error) throw error;

  // Stoelen apart, ná het plan: band_seat_allowance leest profiles.plan, dus
  // die moet al kloppen. sync_band_seats zet het aantal en bepaalt of er
  // afgeschaald moet worden — met een waarschuwingstermijn, niet meteen.
  for (const row of rows ?? []) {
    const { error: seatError } = await supabaseAdmin.rpc('sync_band_seats', {
      p_user: (row as { id: string }).id,
      p_extra: plan === 'paid' ? extraSeats : 0,
      p_period_end: periodEnd,
    });
    if (seatError) throw seatError;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const signature = req.headers.get('Stripe-Signature') ?? '';
  const rawBody = await req.text();

  if (!STRIPE_WEBHOOK_SECRET || !(await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET))) {
    return json({ error: 'Invalid signature' }, 400);
  }

  const event = JSON.parse(rawBody);
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripeRequest<{
            id: string;
            status: string;
            cancel_at_period_end: boolean;
            items?: { data?: { current_period_end?: number; quantity?: number; price?: { id?: string } }[] };
          }>('GET', `/subscriptions/${session.subscription}`, { 'expand[]': 'items.data.price' });
          await syncSubscriptionByCustomer(
            supabaseAdmin,
            session.customer,
            subscription.id,
            subscription.status,
            subscriptionPeriodEnd(subscription),
            subscription.cancel_at_period_end,
            seatQuantity(subscription),
          );
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await syncSubscriptionByCustomer(
          supabaseAdmin,
          subscription.customer,
          event.type === 'customer.subscription.deleted' ? null : subscription.id,
          event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status,
          subscriptionPeriodEnd(subscription),
          event.type === 'customer.subscription.deleted' ? false : !!subscription.cancel_at_period_end,
          event.type === 'customer.subscription.deleted' ? 0 : seatQuantity(subscription),
        );
        break;
      }
      default:
        break; // Ignore everything else we didn't ask for.
    }
    return json({ received: true });
  } catch (err) {
    console.error('stripe-webhook error:', err);
    // Non-2xx makes Stripe retry with backoff — correct for a transient DB error.
    return json({ error: 'Webhook handling failed' }, 500);
  }
});
