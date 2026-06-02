#!/usr/bin/env bash
#
# One-shot deploy for the `notify` Edge Function.
# Run from the ho-orbit/ project root:  ./supabase/deploy-notify.sh
#
# Prerequisites:
#   - Supabase CLI installed   (brew install supabase/tap/supabase)
#   - Logged in                (supabase login)
#   - supabase/functions/.env  created from .env.example with your RESEND_API_KEY

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

echo "→ Pushing function secrets from $ENV_FILE…"
supabase secrets set --env-file "$ENV_FILE"

echo "→ Deploying notify function…"
supabase functions deploy notify

echo "✓ Done. Watch logs with:  supabase functions logs notify"
