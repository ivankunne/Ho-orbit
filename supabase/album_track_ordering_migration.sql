-- ============================================================================
-- Manual ordering for albums (per artist) and tracks within an album.
--
-- Previously albums were always ordered by release_date/created_at and
-- album tracks by created_at (upload order) — no way for an artist to
-- choose their own order. Adds a sort_order column to both, backfilled to
-- match the CURRENT display order so nothing visibly reorders itself the
-- moment this runs.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — the backfill
-- only touches rows (harmless to redo) and every statement is idempotent.
-- ============================================================================

alter table public.albums add column if not exists sort_order integer not null default 0;

with ranked as (
  select id, row_number() over (
    partition by owner_id order by release_date desc nulls last, created_at desc
  ) - 1 as rn
  from public.albums
)
update public.albums a set sort_order = ranked.rn
from ranked where ranked.id = a.id;

create index if not exists albums_owner_sort_idx on public.albums(owner_id, sort_order);

-- Only meaningful for tracks that belong to an album (album_id is not null);
-- standalone singles keep their existing created_at ordering, unaffected.
alter table public.tracks add column if not exists sort_order integer not null default 0;

with ranked_tracks as (
  select id, row_number() over (partition by album_id order by created_at asc) - 1 as rn
  from public.tracks
  where album_id is not null
)
update public.tracks t set sort_order = ranked_tracks.rn
from ranked_tracks where ranked_tracks.id = t.id;

create index if not exists tracks_album_sort_idx on public.tracks(album_id, sort_order) where album_id is not null;
