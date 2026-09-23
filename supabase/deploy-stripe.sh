#!/usr/bin/env bash
#
# One-shot deploy for the Stripe Edge Functions (stripe-checkout, stripe-portal,
# stripe-webhook). Run from the ho-orbit/ project root:  ./supabase/deploy-stripe.sh
#
# Prerequisites:
#   - Supabase CLI installed   (brew install supabase/tap/supabase)
#   - Logged in                (supabase login)
#   - supabase/functions/.env  filled in with STRIPE_SECRET_KEY,
#                              STRIPE_PRICE_ID, STRIPE_PRICE_ID_YEARLY,
#                              STRIPE_WEBHOOK_SECRET en (optioneel, voor
#                              BandSpace-stoelen) STRIPE_SEAT_PRICE_ID +
#                              STRIPE_SEAT_PRICE_ID_YEARLY
#   - stripe_subscriptions_migration.sql already run in the Supabase SQL editor

set -euo pipefail

PROJECT_REF="ellezlbjqrjcxeifrwdo"
ENV_FILE="supabase/functions/.env"

if ! command -v supabase >/dev/null 2>&1; then
  echo "✗ Supabase CLI not found. Install it: brew install supabase/tap/supabase" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ Missing $ENV_FILE" >&2
  echo "  Run: cp supabase/functions/.env.example $ENV_FILE  and fill in the STRIPE_* keys" >&2
  exit 1
fi

if grep -q "_REPLACE_ME" "$ENV_FILE"; then
  echo "✗ One of STRIPE_SECRET_KEY / STRIPE_PRICE_ID / STRIPE_WEBHOOK_SECRET in $ENV_FILE is still the placeholder." >&2
  echo "  Paste your real values first (see $ENV_FILE.example for where to find each one)." >&2
  exit 1
fi

echo "→ Linking project ${PROJECT_REF} (no-op if already linked)…"
supabase link --project-ref "$PROJECT_REF" || true

# Only the Stripe keys, set by name — NOT --env-file, which pushes every
# secret in the file (Resend/VAPID included) and silently overwrites
# whatever is already live in Supabase with whatever happens to be sitting
# in this local file at the time, even a stale placeholder. That's exactly
# what broke RESEND_API_KEY in production once already.
echo "→ Pushing Stripe secrets from ${ENV_FILE}…"
STRIPE_SECRET_KEY_VAL=$(grep -E '^STRIPE_SECRET_KEY=' "$ENV_FILE" | cut -d= -f2-)
STRIPE_PRICE_ID_VAL=$(grep -E '^STRIPE_PRICE_ID=' "$ENV_FILE" | cut -d= -f2-)
STRIPE_PRICE_ID_YEARLY_VAL=$(grep -E '^STRIPE_PRICE_ID_YEARLY=' "$ENV_FILE" | cut -d= -f2-)
STRIPE_WEBHOOK_SECRET_VAL=$(grep -E '^STRIPE_WEBHOOK_SECRET=' "$ENV_FILE" | cut -d= -f2-)
STRIPE_SEAT_PRICE_ID_VAL=$(grep -E '^STRIPE_SEAT_PRICE_ID=' "$ENV_FILE" | cut -d= -f2-)
STRIPE_SEAT_PRICE_ID_YEARLY_VAL=$(grep -E '^STRIPE_SEAT_PRICE_ID_YEARLY=' "$ENV_FILE" | cut -d= -f2-)

# De stoelprijzen zijn optioneel: zolang ze leeg zijn draait de rest gewoon
# door, alleen het bijkopen van BandSpace-plekken werkt dan niet. Een lege
# waarde meesturen zou een eerder gezet secret overschrijven met niets.
#
# De omslachtige ${arr[@]+"${arr[@]}"} is nodig omdat dit script onder
# `set -u` draait en macOS nog bash 3.2 meelevert: daar breekt "${arr[@]}" op
# een lege array af met "unbound variable", precies in de situatie die hier
# normaal is — nog geen stoelprijzen ingevuld.
SEAT_SECRETS=()
if [ -n "$STRIPE_SEAT_PRICE_ID_VAL" ]; then
  SEAT_SECRETS+=("STRIPE_SEAT_PRICE_ID=$STRIPE_SEAT_PRICE_ID_VAL")
fi
if [ -n "$STRIPE_SEAT_PRICE_ID_YEARLY_VAL" ]; then
  SEAT_SECRETS+=("STRIPE_SEAT_PRICE_ID_YEARLY=$STRIPE_SEAT_PRICE_ID_YEARLY_VAL")
fi
if [ ${#SEAT_SECRETS[@]} -eq 0 ]; then
  echo "  ! STRIPE_SEAT_PRICE_ID(_YEARLY) is leeg — BandSpace-stoelen bijkopen werkt nog niet."
fi

supabase secrets set \
  "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY_VAL" \
  "STRIPE_PRICE_ID=$STRIPE_PRICE_ID_VAL" \
  "STRIPE_PRICE_ID_YEARLY=$STRIPE_PRICE_ID_YEARLY_VAL" \
  "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET_VAL" \
  ${SEAT_SECRETS[@]+"${SEAT_SECRETS[@]}"}

echo "→ Deploying stripe-checkout…"
supabase functions deploy stripe-checkout

echo "→ Deploying stripe-portal…"
supabase functions deploy stripe-portal

echo "→ Deploying stripe-cancel…"
supabase functions deploy stripe-cancel

echo "→ Deploying stripe-webhook (public, no JWT verification)…"
supabase functions deploy stripe-webhook --no-verify-jwt

echo "→ Deploying stripe-plan (public, no JWT verification)…"
supabase functions deploy stripe-plan --no-verify-jwt

echo "→ Deploying stripe-seats…"
supabase functions deploy stripe-seats

echo "✓ Done."
echo "  Now go to Stripe Dashboard → Developers → Webhooks and point an endpoint at:"
echo "    https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook"
echo "  Events to send: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted"
echo "  Watch logs with:  supabase functions logs stripe-webhook"
