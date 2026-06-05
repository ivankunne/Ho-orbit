# H-orbit email setup

Everything email-related for h-orbit, and the steps to get it live.

## Addresses

| Address              | Used for                                                        |
| -------------------- | --------------------------------------------------------------- |
| `no-reply@h-orbit.nl`| Notification emails (new chat message, new follower) — sent via the `notify` Edge Function + Resend. |
| `support@h-orbit.nl` | Reply-to on notification emails, and the **sender** for all Supabase Auth emails (signup confirm, password reset). |
| `info@h-orbit.nl`    | General contact (footer link + legal pages).                    |

The domain `h-orbit.nl` is verified in Resend, so all three addresses send fine.

---

## Logo / branding

All four emails (signup confirm, password reset, new message, new follower) lead with
the H-orbit logo so recipients immediately recognise the email as genuine.

- The logo is referenced by absolute URL: `https://h-orbit.nl/H-orbit-logo-email.png`
  (an email-optimised 256px / ~82 KB copy of `public/H-orbit-logo.png`). It must be
  reachable on production — i.e. **the frontend has to be deployed to Vercel** for the
  image to load in inboxes. The `h-orbit` wordmark + tagline still render as a text
  fallback if a client blocks images.
- After changing the logo file, regenerate the email copy:
  `sips -Z 256 public/H-orbit-logo.png --out public/H-orbit-logo-email.png`.

> **Auth templates are dashboard-managed.** Editing `email-templates/*.html` in the repo
> does **not** change live emails — you must re-paste the updated HTML into the Supabase
> dashboard (step 3 below) for the signup-confirm and password-reset emails. The two
> notification emails update automatically on the next `notify` deploy.

---

## 1. Password reset & signup confirmation (Supabase Auth → Resend SMTP)

These emails are sent by **Supabase Auth itself** through the Resend SMTP you configured. No code deploy needed — the app already calls `supabase.auth.resetPasswordForEmail(...)`.

In the Supabase dashboard:

1. **Authentication → Emails → SMTP Settings** — confirm Resend SMTP is enabled and set:
   - **Sender email:** `support@h-orbit.nl`
   - **Sender name:** `H-orbit`
2. **Authentication → URL Configuration:**
   - **Site URL:** `https://h-orbit.nl`  ← must be exact, **no trailing slash** (the reset link is built from it).
   - **Redirect URLs:** add `https://h-orbit.nl/wachtwoord-herstellen` (and `http://localhost:5173/wachtwoord-herstellen` for local dev).
3. **Authentication → Emails → Templates:**
   - **Reset Password** → paste `email-templates/reset-password.html`.
   - **Confirm signup** → paste `email-templates/confirm-signup.html`.

The reset email links **directly to your site** using a `token_hash`:
`{{ .SiteURL }}/wachtwoord-herstellen?token_hash={{ .TokenHash }}&type=recovery`.
The page (`src/pages/auth/ResetPasswordPage.tsx`) calls `verifyOtp({ token_hash, type: 'recovery' })`
to establish the session, then lets the user set a new password. This is cross-device safe
(works when the email is opened on a different device than the request) and doesn't depend on
URL-fragment redirects. The page also still accepts PKCE `?code=` and implicit-hash links as
fallbacks, so older links keep working.

---

## 2. Notification emails (Edge Function → Resend API)

New chat messages and new followers are handled by the **`notify`** Edge Function
(`supabase/functions/notify/`). The browser invokes it after a message is sent or a
follow is created; the function writes the recipient's in-app notification **and**
emails them (unless they opted out in Account → Meldingen).

> **Not a Vercel variable.** `RESEND_API_KEY` does **not** go in Vercel. Vercel
> only runs the frontend (the `VITE_*` vars). This function runs on Supabase's
> servers, so its key is a **Supabase Edge Function secret**. Putting it in
> Vercel does nothing and would expose it in the public frontend bundle.
>
> Set it either via the deploy script below (reads `supabase/functions/.env`),
> or in the dashboard: **Edge Functions → Secrets → add `RESEND_API_KEY`**
> (and optionally `SITE_URL`). `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are
> injected automatically — never set those yourself.

### Deploy (everything is scaffolded — you only paste the key)

The CLI config (`supabase/config.toml`), secrets template, deploy script, and
`.gitignore` rule are already in place. Three steps:

```bash
# 1. install + log in (one-time)
brew install supabase/tap/supabase
supabase login

# 2. add your Resend key
cp supabase/functions/.env.example supabase/functions/.env
#    then edit supabase/functions/.env and paste your RESEND_API_KEY (starts with re_)

# 3. deploy (links project, pushes secrets, deploys) — run from ho-orbit/
./supabase/deploy-notify.sh
```

The script links project `ellezlbjqrjcxeifrwdo`, pushes the secrets from
`supabase/functions/.env`, and deploys the function. `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the platform — don't
add them to the env file (they're rejected as reserved). The real `.env` is
gitignored so your key never gets committed.

### How opt-out works

The function only emails when the recipient's `profiles.notification_prefs` allows it
(opt-out model — sends unless the toggle is explicitly `false`):

- New follower → respects the **"Nieuwe volger"** toggle.
- New message → respects the **"Nieuw bericht"** toggle.

Both toggles live in **Account → Meldingen** (`src/pages/user/AccountPage.tsx`).
In-app notification rows are always written, even when the email is suppressed.

---

## Testing

- **Password reset:** Login modal → "Vergeten?" → enter your email → check inbox →
  follow link → set a new password → log in.
- **New follower:** follow a user from another account; the followed user should get an
  in-app notification and (if enabled) an email from `no-reply@h-orbit.nl`.
- **New message:** send a chat message; the recipient should get the same.
- Edge Function logs: `supabase functions logs notify` (or the dashboard) to debug
  Resend errors.
