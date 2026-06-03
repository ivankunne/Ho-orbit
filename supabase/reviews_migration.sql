-- Reviews for venues and Dutch-scene cities.
-- Backs VenueDetailPage and SceneDetailPage rating widgets + breakdown bars.
--
-- resource_id is text so it can reference either venues.id (uuid) or
-- dutch_cities.id (integer) without a typed FK.

create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('venue', 'scene')),
  resource_id   text not null,
  rating        int  not null check (rating between 1 and 5),
  review_text   text not null default '',
  user_id       uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists reviews_resource_idx
  on public.reviews (resource_type, resource_id);

alter table public.reviews enable row level security;

-- Anyone may read reviews (public detail pages, logged-in or not).
drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all"
  on public.reviews for select
  using (true);

-- Anyone may submit a review (the rating widget is shown to anonymous
-- visitors too). When logged in, the row is stamped with their user_id.
drop policy if exists "reviews_insert_any" on public.reviews;
create policy "reviews_insert_any"
  on public.reviews for insert
  with check (
    user_id is null or user_id = auth.uid()
  );

-- Authors may delete their own review.
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  using (user_id = auth.uid());
