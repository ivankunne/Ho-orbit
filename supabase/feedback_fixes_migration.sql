-- ============================================================================
-- Feedback fixes migration (2026-06)
--  1. Follows: make user_following_artists.artist_id text so one table can hold
--     both numeric artist ids and profile UUIDs (artist + user-to-user follows).
--  2. Post moderation: let a post's author OR an admin edit/delete posts, and
--     allow comments under networking / hub posts.
--
-- Safe to run more than once. Run in the Supabase SQL editor.
-- All policy changes are ADDITIVE (extra permissive policies are OR'd with any
-- existing ones), so existing reads / like-count / view-count updates keep
-- working. Authorization for editing is also enforced in the UI.
-- ============================================================================

-- ── 1. Follows: artist_id bigint → text ─────────────────────────────────────
-- Existing values are all numeric, so the cast is lossless. After this both a
-- numeric artists.id ("1") and a profile UUID can live in artist_id.
ALTER TABLE public.user_following_artists
  ALTER COLUMN artist_id TYPE text USING artist_id::text;

-- Make (user_id, artist_id) unique so the follow upsert is idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.user_following_artists'::regclass
      AND c.contype IN ('p', 'u')
      AND c.conkey @> ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_following_artists'::regclass AND attname = 'user_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_following_artists'::regclass AND attname = 'artist_id')
      ]
  ) THEN
    ALTER TABLE public.user_following_artists
      ADD CONSTRAINT user_following_artists_user_artist_key UNIQUE (user_id, artist_id);
  END IF;
END $$;

-- ── helper: is the current user an admin? ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true);
$$;

-- ── 2a. networking_posts: author OR admin can update / delete ───────────────
ALTER TABLE public.networking_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author or admin update networking posts" ON public.networking_posts;
CREATE POLICY "Author or admin update networking posts"
  ON public.networking_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Author or admin delete networking posts" ON public.networking_posts;
CREATE POLICY "Author or admin delete networking posts"
  ON public.networking_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- ── 2b. hub_posts: add author OR admin delete (update already permitted for
--        view/reply count bumps) ──────────────────────────────────────────────
ALTER TABLE public.hub_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author or admin delete hub posts" ON public.hub_posts;
CREATE POLICY "Author or admin delete hub posts"
  ON public.hub_posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());

-- ── 2c. forum_threads: author OR admin delete (UPDATE stays open for
--        replies_count / views_count / last_post_at bumps by other users) ─────
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author or admin delete forum threads" ON public.forum_threads;
CREATE POLICY "Author or admin delete forum threads"
  ON public.forum_threads FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());

-- ── 2d. forum_replies: author, admin, OR the owner of the parent thread can
--        delete (so deleting a thread can clean up everyone's replies). UPDATE
--        stays open for likes_count bumps. ─────────────────────────────────────
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author admin or thread owner delete forum replies" ON public.forum_replies;
CREATE POLICY "Author admin or thread owner delete forum replies"
  ON public.forum_replies FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.forum_threads t
      WHERE t.id = forum_replies.thread_id AND t.author_id = auth.uid()
    )
  );

-- Make sure deleting a thread cascades to its replies regardless of who owns
-- them (covers any replies an author-only delete policy can't reach).
DO $$
DECLARE fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.forum_replies'::regclass
    AND contype = 'f'
    AND confrelid = 'public.forum_threads'::regclass
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.forum_replies DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.forum_replies
    ADD CONSTRAINT forum_replies_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES public.forum_threads(id) ON DELETE CASCADE;
EXCEPTION WHEN others THEN
  -- If thread_id has a different name/shape, skip silently — the policy above
  -- already lets the thread owner delete the replies directly.
  NULL;
END $$;

-- ── 2e. comments: allow the new resource types (networking_post, hub_post).
--        The generic comments table is shared by events/tutorials/articles and
--        already has working insert/select/delete policies. The only thing that
--        could block new types is a CHECK constraint on resource_type — drop it
--        so any resource_type string is accepted. ──────────────────────────────
DO $$
DECLARE chk record;
BEGIN
  FOR chk IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.comments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%resource_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.comments DROP CONSTRAINT %I', chk.conname);
  END LOOP;
END $$;
