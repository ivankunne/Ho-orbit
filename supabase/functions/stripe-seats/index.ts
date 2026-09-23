// Edge Function: stripe-seats
//
// Zet het aantal bijgekochte BandSpace-stoelen op het abonnement van de
// ingelogde gebruiker. Vijf stoelen zitten in Pro; elke stoel daarboven is een
// tweede regel op hetzelfde abonnement, met `quantity` als aantal.
//
// Body: { seats: number }  — het gewenste TOTAAL aan extra stoelen (0 = geen)
// Response: { seats: number, allowance: number, used: number }
//
// Niet de plek waar profiles.extra_seats wordt geschreven: dat doet
// stripe-webhook zodra Stripe customer.subscription.updated stuurt. Deze
// functie praat alleen met Stripe, zodat er één bron van waarheid blijft en
// een wijziging via het Customer Portal net zo goed doorkomt.
//
// Deploy:  supabase functions deploy stripe-seats
// Secrets: STRIPE_SECRET_KEY, STRIPE_SEAT_PRICE_ID, STRIPE_SEAT_PRICE_ID_YEARLY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { stripeRequest } from '../_shared/stripe.ts';

const SEAT_PRICE_IDS: Record<'month' | 'year', string> = {
  month: Deno.env.get('STRIPE_SEAT_PRICE_ID') ?? '',
  year: Deno.env.get('STRIPE_SEAT_PRICE_ID_YEARLY') ?? '',
};

// Een bovengrens tegen typefouten en tegen een onbedoeld enorme afschrijving.
const MAX_EXTRA_SEATS = 50;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface SubscriptionItem {
  id: string;
  quantity?: number;
  price?: { id: string; recurring?: { interval?: string } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let seats: number;
  try {
    const body = await req.json();
    seats = Math.floor(Number(body?.seats));
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400);
  }
  if (!Number.isFinite(seats) || seats < 0 || seats > MAX_EXTRA_SEATS) {
    return json({ error: `Kies tussen 0 en ${MAX_EXTRA_SEATS} extra stoelen.` }, 400);
  }

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
      .select('stripe_subscription_id, plan')
      .eq('id', userData.user.id)
      .single();
    if (profileError) throw profileError;

    if (!profile?.stripe_subscription_id || profile.plan !== 'paid') {
      return json({ error: 'Je hebt eerst een Pro-abonnement nodig om stoelen bij te kopen.' }, 400);
    }

    const subscription = await stripeRequest<{
      id: string;
      items: { data: SubscriptionItem[] };
    }>('GET', `/subscriptions/${profile.stripe_subscription_id}`, { 'expand[]': 'items.data.price' });

    const seatPriceIds = new Set(Object.values(SEAT_PRICE_IDS).filter(Boolean));
    const seatItem = subscription.items.data.find((item) => item.price && seatPriceIds.has(item.price.id));
    const planItem = subscription.items.data.find((item) => !item.price || !seatPriceIds.has(item.price.id));

    // De stoelprijs moet hetzelfde interval hebben als het plan — Stripe staat
    // geen abonnement toe met items die op een verschillend ritme lopen.
    const interval = planItem?.price?.recurring?.interval === 'year' ? 'year' : 'month';
    const seatPriceId = SEAT_PRICE_IDS[interval];
    if (!seatPriceId) {
      return json(
        { error: `STRIPE_SEAT_PRICE_ID${interval === 'year' ? '_YEARLY' : ''} is niet geconfigureerd.` },
        500,
      );
    }

    if (seats === 0 && seatItem) {
      await stripeRequest('DELETE', `/subscription_items/${seatItem.id}`, undefined);
    } else if (seats > 0 && seatItem) {
      await stripeRequest('POST', `/subscription_items/${seatItem.id}`, {
        quantity: seats,
        // Verrekenen op de eerstvolgende factuur in plaats van meteen
        // afschrijven: een losse incasso van € 2,50 is duur in kosten en
        // verwarrend op het afschrift.
        proration_behavior: 'create_prorations',
      });
    } else if (seats > 0) {
      await stripeRequest('POST', '/subscription_items', {
        subscription: subscription.id,
        price: seatPriceId,
        quantity: seats,
        proration_behavior: 'create_prorations',
      });
    }

    // De webhook schrijft extra_seats zodra Stripe het bevestigt. Hier alvast
    // synchroon bijwerken zodat de gebruiker het meteen terugziet in plaats
    // van te moeten wachten op een webhook die seconden later binnenkomt.
    const { data: state, error: syncError } = await supabaseAdmin.rpc('sync_band_seats', {
      p_user: userData.user.id,
      p_extra: seats,
      p_period_end: null,
    });
    if (syncError) throw syncError;

    return json({ seats, ...(state ?? {}) });
  } catch (err) {
    console.error('stripe-seats error:', err);
    return json({ error: 'Kon de stoelen niet bijwerken. Probeer het later opnieuw.' }, 500);
  }
});
