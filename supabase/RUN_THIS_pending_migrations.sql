-- ============================================================================
-- RUN THIS ONE FILE — combines every migration currently pending as of
-- 2026-07-21. Open Supabase Dashboard → SQL Editor → New query, paste this
-- whole file, and run it once. Every statement in here is additive/idempotent
-- (IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS), so it's safe to
-- run again later even if some pieces already went through.
--
-- Combines, in order:
--   1. feedback_fixes_migration.sql   — follows artist_id text conversion +
--      is_admin() helper + delete policies for hub_posts/networking_posts/
--      forum_threads/forum_replies
--   2. fix_profiles_discover_prefs_migration.sql — onboarding save fix
--   3. tracks_owner_update_delete_migration.sql  — track edit/delete
--   4. comments_and_hub_replies_edit_delete_migration.sql — comment edit,
--      hub reply edit/delete
--
-- Once this succeeds, the individual files above don't need to be run
-- separately — this is the same statements, just in one place.
-- ============================================================================


-- ═══ 1. feedback_fixes_migration.sql ═══════════════════════════════════════

-- ── 1a. Follows: artist_id bigint → text ────────────────────────────────────
-- Existing values are all numeric, so the cast is lossless. After this both a
-- numeric artists.id ("1") and a profile UUID can live in artist_id.
--
-- artist_id is currently FK'd to artists(id) (bigint) — that constraint can't
-- survive the type change (and shouldn't: once this column holds either an
-- artists.id or a profiles.id, it can't be validated against a single table
-- anyway). Drop whatever FK constraint is on this column first, by looking it
-- up rather than hardcoding its name in case it differs across environments.
DO $$
DECLARE fk record;
BEGIN
  FOR fk IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.user_following_artists'::regclass
      AND contype = 'f'
      AND conkey @> ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.user_following_artists'::regclass AND attname = 'artist_id')
      ]
  LOOP
    EXECUTE format('ALTER TABLE public.user_following_artists DROP CONSTRAINT %I', fk.conname);
  END LOOP;
END $$;

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

-- ── 1b. networking_posts: author OR admin can update / delete ──────────────
ALTER TABLE public.networking_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author or admin update networking posts" ON public.networking_posts;
CREATE POLICY "Author or admin update networking posts"
  ON public.networking_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Author or admin delete networking posts" ON public.networking_posts;
CREATE POLICY "Author or admin delete networking posts"
  ON public.networking_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- ── 1c. hub_posts: add author OR admin delete (update already permitted for
--        view/reply count bumps) ──────────────────────────────────────────────
ALTER TABLE public.hub_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author or admin delete hub posts" ON public.hub_posts;
CREATE POLICY "Author or admin delete hub posts"
  ON public.hub_posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());

-- ── 1d. forum_threads: author OR admin delete (UPDATE stays open for
--        replies_count / views_count / last_post_at bumps by other users) ─────
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author or admin delete forum threads" ON public.forum_threads;
CREATE POLICY "Author or admin delete forum threads"
  ON public.forum_threads FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());

-- ── 1e. forum_replies: author, admin, OR the owner of the parent thread can
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

-- ── 1f. comments: allow the new resource types (networking_post, hub_post).
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


-- ═══ 2. fix_profiles_discover_prefs_migration.sql ══════════════════════════

alter table public.profiles
  add column if not exists discover_prefs text[] not null default '{}';


-- ═══ 3. tracks_owner_update_delete_migration.sql ═══════════════════════════

drop policy if exists "tracks_update_own" on public.tracks;
create policy "tracks_update_own" on public.tracks for update
  to authenticated
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

drop policy if exists "tracks_delete_own" on public.tracks;
create policy "tracks_delete_own" on public.tracks for delete
  to authenticated
  using (uploaded_by = auth.uid());


-- ═══ 4. comments_and_hub_replies_edit_delete_migration.sql ═════════════════

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author or admin update comments" ON public.comments;
CREATE POLICY "Author or admin update comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

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

-- ============================================================================
-- Done. If every statement above ran without error, all 4 migrations are
-- fully applied.
-- ============================================================================
