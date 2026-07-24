-- ============================================================================
-- Master admin — full control over other users' content (tracks, reviews).
-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run (drop-then-create).
--
-- Context: public.is_admin() already exists (see create_master_admin.sql /
-- albums_migration.sql / podcasts_migration.sql etc.) and already gates admin
-- bypass on albums, podcasts, radio_streams, comments, hub_posts/replies,
-- forum_threads/replies and networking_posts. tracks (the songs table) and
-- reviews never got the same treatment, so the master admin account
-- (15ec43df-fc26-43c4-94f8-5b4e63f5a75d, is_admin = true) could not edit or
-- delete content uploaded by other users there. This migration closes that
-- gap by OR-ing `public.is_admin()` into the existing owner-only policies —
-- purely additive, does not change what a non-admin can do.
-- ============================================================================

-- tracks: uploader OR admin may update/delete.
drop policy if exists "tracks_update_own" on public.tracks;
create policy "tracks_update_own" on public.tracks for update
  to authenticated
  using (uploaded_by = auth.uid() or public.is_admin())
  with check (uploaded_by = auth.uid() or public.is_admin());

drop policy if exists "tracks_delete_own" on public.tracks;
create policy "tracks_delete_own" on public.tracks for delete
  to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- reviews: author OR admin may delete.
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  using (user_id = auth.uid() or public.is_admin());
