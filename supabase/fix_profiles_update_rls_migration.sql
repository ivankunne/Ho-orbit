-- ============================================================================
-- profiles — CRITICAL: anyone (including unauthenticated visitors) can
-- currently overwrite ANY user's profile row, e.g. their `role` or
-- `is_admin` flag, via the public anon API key.
--
-- Discovered while investigating why VIBEZ (a "Radio" role DJ) lost access
-- to their station's Studio panel. The station's radio_streams.owner_id
-- was intact — the real cause was profiles.role having been silently reset
-- to 'Artiest' (RadioPage.tsx gates the Studio UI on role === 'Radio').
-- That reset is explained by uploadService.ts unconditionally setting
-- role = 'Artiest' on any track upload/approval (fixed separately in the
-- app code — see uploadTrack()/approveUpload()), but confirming the fix
-- required writing to `profiles` directly with only the public anon key,
-- with no authenticated session at all:
--
--   curl -X PATCH ".../rest/v1/profiles?id=eq.<any-user>" \
--     -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>" \
--     -d '{"role":"Radio"}'
--
-- That request succeeded. This means `profiles` either has RLS disabled,
-- or an existing UPDATE policy with a `USING (true)`-style condition open
-- to the `anon`/`public` role — i.e. profiles is NOT the "hand-created but
-- otherwise fine" case that radio_streams/tracks were; its UPDATE policy
-- (or lack of RLS) is a live privilege-escalation bug. Any visitor can
-- currently grant themselves is_admin = true.
--
-- Step 1 — DIAGNOSE (read-only, run first). Confirms exactly what's open.
-- ============================================================================

select relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'profiles' and relnamespace = 'public'::regnamespace;

select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'profiles';

-- ============================================================================
-- Step 2 — FIX
--
-- Adds a RESTRICTIVE policy (not a permissive one) for UPDATE. Restrictive
-- policies are AND-combined with every existing permissive policy rather
-- than replacing anything — so this locks the gap shut regardless of how
-- open the current (unknown-by-name) policy is, without needing to find
-- and drop it, and without touching SELECT (profiles are meant to be
-- publicly browsable) or breaking any legitimate self-edit / admin-edit
-- flow already in the app (both always run as an authenticated user
-- updating their own row, or as an admin).
--
-- Enables RLS if it was actually off entirely (harmless if already on).
-- Safe to re-run.
-- ============================================================================

alter table public.profiles enable row level security;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true);
$$;

DROP POLICY IF EXISTS "profiles_update_self_or_admin_restrictive" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin_restrictive"
  ON public.profiles AS RESTRICTIVE FOR UPDATE
  TO public
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ============================================================================
-- Step 3 — VERIFY (re-run the anon PATCH from the top of this file, or the
-- curl command in the comment above, against a real row). It must now fail
-- with a permission/RLS error instead of returning the updated row.
-- ============================================================================
