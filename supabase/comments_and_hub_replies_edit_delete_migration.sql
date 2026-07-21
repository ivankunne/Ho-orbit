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
-- Defines public.is_admin() itself (CREATE OR REPLACE, so this is safe even
-- if feedback_fixes_migration.sql already created it elsewhere) rather than
-- assuming that migration was run — turns out it wasn't (confirmed: running
-- this file standalone hit "function public.is_admin() does not exist", and
-- user_following_artists.artist_id is still numeric, not text, which that
-- migration was also supposed to change). If feedback_fixes_migration.sql
-- has genuinely never been applied, run that one too — it also adds the
-- delete policy for hub_posts and the author/admin update+delete policies
-- for networking_posts and forum_threads/forum_replies, which may currently
-- be silently broken in production the same way this was.
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true);
$$;

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
