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
import { stripeRequest, verifyStripeSignature } from '../_shared/stripe.ts';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Statuses that count as an active paid plan. Anything else (canceled,
// unpaid, incomplete_expired, past_due after grace, ...) falls back to free.
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

async function syncSubscriptionByCustomer(
  supabaseAdmin: ReturnType<typeof createClient>,
  customerId: string,
  subscriptionId: string | null,
  status: string,
  currentPeriodEnd: number | null,
) {
  const plan = subscriptionId && ACTIVE_STATUSES.has(status) ? 'paid' : 'free';
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      plan,
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    })
    .eq('stripe_customer_id', customerId);
  if (error) throw error;
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
            current_period_end: number;
          }>('GET', `/subscriptions/${session.subscription}`);
          await syncSubscriptionByCustomer(
            supabaseAdmin,
            session.customer,
            subscription.id,
            subscription.status,
            subscription.current_period_end,
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
          subscription.current_period_end ?? null,
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
