-- Web Push subscriptions.
--
-- One row per browser/device a user has opted in from. The endpoint URL is the
-- unique identity of a push subscription (re-subscribing yields the same
-- endpoint), so it carries the UNIQUE constraint and is the upsert key.
--
-- The `notify` Edge Function (service role) reads every row for a recipient to
-- fan a push out to all their devices, and prunes rows the push service reports
-- as gone (HTTP 404/410). Clients only ever touch their own rows via RLS.
--
-- Apply in the Supabase SQL editor or:  supabase db push  (run once).

create table if not exists public.push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- A user may only see and manage their own subscriptions. The Edge Function
-- uses the service-role key, which bypasses RLS, so it can read every row.
drop policy if exists "own push subscriptions - select" on public.push_subscriptions;
create policy "own push subscriptions - select"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "own push subscriptions - insert" on public.push_subscriptions;
create policy "own push subscriptions - insert"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "own push subscriptions - update" on public.push_subscriptions;
create policy "own push subscriptions - update"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own push subscriptions - delete" on public.push_subscriptions;
create policy "own push subscriptions - delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
