-- ============================================================================
-- radio_streams — admin cannot toggle any station's live status.
--
-- Symptom: toggling the live switch (RadioPage "Jouw studio" quick-toggle, or
-- AdminPage's radio management panel) fails with "Live-status wijzigen
-- mislukt." for a super admin account. Reported 2026-07-22.
--
-- `radio_streams` has NO repo migration — table + RLS were dashboard-created
-- ([[schema-drift-dashboard-tables]] in memory). Its UPDATE policy almost
-- certainly only allows `auth.uid() = owner_id` (the "hosts manage only their
-- own station" rule from commit fdf8340, 2026-05-05) with no admin bypass —
-- unlike every other table in this project, which grants admins access via
-- `public.is_admin()` (see comments_and_hub_replies_edit_delete_migration.sql,
-- feedback_fixes_migration.sql, RUN_THIS_pending_migrations.sql). A super
-- admin whose uid isn't the station's owner_id gets silently blocked by RLS —
-- PostgREST returns 200 with an empty row set, which RadioPage.tsx and
-- AdminPage.tsx both correctly detect and surface as this toast.
--
-- Run in the Supabase Dashboard → SQL Editor.
-- ============================================================================

-- Step 1 — DIAGNOSE (read-only, run first to confirm the hypothesis)
-- Lists every RLS policy currently on radio_streams. If the UPDATE policy's
-- `qual`/`with_check` only reference owner_id (no is_admin() call), that
-- confirms admins have no bypass and Step 2 below is the fix.

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'radio_streams';

-- Step 2 — FIX
-- Adds a new, purely additive policy granting admins full access to
-- radio_streams. Postgres combines multiple permissive policies for the same
-- command with OR, so this does not touch or replace the existing
-- owner-based policy — DJs keep managing their own station exactly as before.
-- Safe to re-run (CREATE OR REPLACE / DROP POLICY IF EXISTS).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true);
$$;

DROP POLICY IF EXISTS "Admin manage all radio_streams" ON public.radio_streams;
CREATE POLICY "Admin manage all radio_streams"
  ON public.radio_streams FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
