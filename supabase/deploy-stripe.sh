#!/usr/bin/env bash
#
# One-shot deploy for the Stripe Edge Functions (stripe-checkout, stripe-portal,
# stripe-webhook). Run from the ho-orbit/ project root:  ./supabase/deploy-stripe.sh
#
# Prerequisites:
#   - Supabase CLI installed   (brew install supabase/tap/supabase)
#   - Logged in                (supabase login)
#   - supabase/functions/.env  filled in with STRIPE_SECRET_KEY,
#                              STRIPE_PRICE_ID and STRIPE_WEBHOOK_SECRET
#                              (see .env.example)
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

echo "→ Pushing function secrets from ${ENV_FILE}…"
supabase secrets set --env-file "$ENV_FILE"

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

echo "✓ Done."
echo "  Now go to Stripe Dashboard → Developers → Webhooks and point an endpoint at:"
echo "    https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook"
echo "  Events to send: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted"
echo "  Watch logs with:  supabase functions logs stripe-webhook"
