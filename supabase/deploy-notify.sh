#!/usr/bin/env bash
#
# One-shot deploy for the `notify` Edge Function.
# Run from the ho-orbit/ project root:  ./supabase/deploy-notify.sh
#
# Prerequisites:
#   - Supabase CLI installed   (brew install supabase/tap/supabase)
#   - Logged in                (supabase login)
#   - supabase/functions/.env  created from .env.example with your RESEND_API_KEY
#                              and the VAPID_* keys for Web Push (see PUSH_SETUP.md)

set -euo pipefail

PROJECT_REF="ellezlbjqrjcxeifrwdo"
ENV_FILE="supabase/functions/.env"

if ! command -v supabase >/dev/null 2>&1; then
  echo "✗ Supabase CLI not found. Install it: brew install supabase/tap/supabase" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ Missing $ENV_FILE" >&2
  echo "  Run: cp supabase/functions/.env.example $ENV_FILE  and fill in RESEND_API_KEY" >&2
  exit 1
fi

if grep -q "re_xxxxxxxx" "$ENV_FILE"; then
  echo "✗ RESEND_API_KEY in $ENV_FILE is still the placeholder. Paste your real key first." >&2
  exit 1
fi

echo "→ Linking project $PROJECT_REF (no-op if already linked)…"
supabase link --project-ref "$PROJECT_REF" || true

# Only this function's own keys, set by name — NOT --env-file, which pushes
# every secret in the file (Stripe keys included) and silently overwrites
# whatever is already live in Supabase with whatever's sitting in this local
# file at the time. That's exactly what broke RESEND_API_KEY in production
# once already, via the equivalent mistake in deploy-stripe.sh.
echo "→ Pushing notify secrets from $ENV_FILE…"
RESEND_API_KEY_VAL=$(grep -E '^RESEND_API_KEY=' "$ENV_FILE" | cut -d= -f2-)
SITE_URL_VAL=$(grep -E '^SITE_URL=' "$ENV_FILE" | cut -d= -f2-)
VAPID_PUBLIC_KEY_VAL=$(grep -E '^VAPID_PUBLIC_KEY=' "$ENV_FILE" | cut -d= -f2-)
VAPID_PRIVATE_KEY_VAL=$(grep -E '^VAPID_PRIVATE_KEY=' "$ENV_FILE" | cut -d= -f2-)
VAPID_SUBJECT_VAL=$(grep -E '^VAPID_SUBJECT=' "$ENV_FILE" | cut -d= -f2-)
supabase secrets set \
  "RESEND_API_KEY=$RESEND_API_KEY_VAL" \
  "SITE_URL=$SITE_URL_VAL" \
  "VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY_VAL" \
  "VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY_VAL" \
  "VAPID_SUBJECT=$VAPID_SUBJECT_VAL"

echo "→ Deploying notify function…"
supabase functions deploy notify

echo "✓ Done. Watch logs with:  supabase functions logs notify"
