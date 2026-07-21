-- ============================================================================
-- comments (edit) + hub_replies (edit/delete) — RLS was never granted for
-- these because no edit/delete feature existed for them before. Run once in
-- the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Without these, the new "edit your comment" and "edit/delete your Hub
-- reply" features would silently fail with a permission-denied error from
-- PostgREST — exactly the class of bug this whole audit has been about,
-- just caught before shipping instead of after.
--
-- Reuses the public.is_admin() helper already created in
-- feedback_fixes_migration.sql. Safe to re-run.
-- ============================================================================

-- ── comments: author (or admin) can edit their own comment ──────────────────
-- insert/select/delete already work per feedback_fixes_migration.sql; UPDATE
-- was simply never added because there was no edit feature until now.
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author or admin update comments" ON public.comments;
CREATE POLICY "Author or admin update comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

-- ── hub_replies: author (or admin) can edit or delete their own reply ───────
-- Previously only select/insert/update(unrestricted) existed — no delete
-- policy at all, and the update policy allowed ANY authenticated user to
-- edit ANY reply (`using (true)`), not just their own. Tightening update to
-- author-or-admin and adding the missing delete policy.
ALTER TABLE public.hub_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_replies_update" ON public.hub_replies;
DROP POLICY IF EXISTS "Author or admin update hub replies" ON public.hub_replies;
CREATE POLICY "Author or admin update hub replies"
  ON public.hub_replies FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "Author or admin delete hub replies" ON public.hub_replies;
CREATE POLICY "Author or admin delete hub replies"
  ON public.hub_replies FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());
