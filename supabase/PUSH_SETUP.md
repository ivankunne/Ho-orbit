# Web Push setup (h-orbit)

OS-level push notifications for installed PWAs. Wired into the existing `notify`
Edge Function, so every new **chat message** and **new follower** now also fires
a push (alongside the in-app notification + email). Respects each user's
existing "Nieuw bericht" / "Nieuwe volger" preference.

## Architecture

```
client (pushService.ts)  ──subscribe──►  push_subscriptions  (one row / device)
        │
        ▼ saves endpoint + keys
notify Edge Function  ──reads subs, encrypts, signs with VAPID──►  Push Service
        │                                                              │
        └─ in-app row + email (unchanged)                             ▼
                                                            sw.js `push` handler → OS notification
                                                            sw.js `notificationclick` → opens the link
```

## One-time setup

### 1. Apply the database migration
Run `supabase/push_subscriptions_migration.sql` in the Supabase SQL editor
(or `supabase db push`). Creates the `push_subscriptions` table + RLS.

### 2. VAPID keys (already generated for this project)
Generated with a P-256 keypair. Regenerate any time with
`npx web-push generate-vapid-keys` — but if you do, **both** the frontend and
the function secret must use the new pair, and every existing subscription is
invalidated (users re-enable from Account → Meldingen).

The keypair is stored OUTSIDE git:
- **Public key** → `VITE_VAPID_PUBLIC_KEY` in `.env.local` (and Vercel env).
- **Private key** → the `notify` Edge Function secrets only (Supabase dashboard
  → Edge Functions → Secrets, or the gitignored `supabase/functions/.env`).

⚠️ Never commit the private key. If it leaks, regenerate the pair.

### 3. Frontend env
- **Local:** already set in `.env.local` as `VITE_VAPID_PUBLIC_KEY`.
- **Production (Vercel):** add `VITE_VAPID_PUBLIC_KEY` (the public key from
  `.env.local`) to the project's Environment Variables and redeploy.

### 4. Edge Function secrets
Add to `supabase/functions/.env` (copy from `.env.example`), then deploy:

```
RESEND_API_KEY=<your real resend key>
SITE_URL=https://h-orbit.nl
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:support@h-orbit.nl
```

Then from the `ho-orbit/` folder:

```
./supabase/deploy-notify.sh
```

(pushes the secrets and redeploys `notify`).

## How users turn it on
- **Account → Meldingen → "Pushmeldingen op dit apparaat"** toggle, or
- the **"Zet meldingen aan"** prompt that appears after installing the app.

The OS permission prompt fires on that tap (required by Safari/iOS).

## Platform notes
- **iOS/iPadOS:** push only works after the site is **added to the home screen**
  (iOS 16.4+). In a plain Safari tab the toggle/prompt is hidden — by design.
- **Android / desktop Chrome/Edge/Firefox:** works without installing, though
  the home-screen install is still encouraged.
- Dead subscriptions (HTTP 404/410) are pruned automatically on send.

## Quick test
1. Enable push on a device (Account → Meldingen).
2. From another account, send that user a chat message or follow them.
3. The OS notification should appear; tapping it opens the conversation/profile.
4. Watch logs: `supabase functions logs notify` — response includes `pushed`.
