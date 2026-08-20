-- ============================================================================
-- Drop Your Demo feature — new tables for the /drop-your-demo page.
--
-- VIBEZ hiphop radio segment: artists upload a demo track + short voice-note
-- pitch, any logged-in user votes fire vs. vuilnisbak. Deliberately its own
-- tables (not a flag on `tracks`) so submissions never touch Muziek/search/
-- likes. Admins (profiles.is_admin = true) can delete any submission to
-- clear out a prior week's batch.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run — every
-- statement is idempotent (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS).
-- ============================================================================

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.demo_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  artist_name text not null,
  track_title text not null,
  track_url text not null,
  voice_note_url text not null,
  duration text,
  fire_count int not null default 0,
  trash_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.demo_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('fire', 'trash')),
  created_at timestamptz not null default now(),
  unique (submission_id, user_id)
);

create index if not exists demo_votes_submission_id_idx on public.demo_votes(submission_id);
create index if not exists demo_submissions_created_at_idx on public.demo_submissions(created_at);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.demo_submissions enable row level security;
alter table public.demo_votes enable row level security;

-- Reuses the is_admin() helper already created by fix_radio_admin_rls_migration.sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true);
$$;

-- demo_submissions: public read
drop policy if exists "Public read demo_submissions" on public.demo_submissions;
create policy "Public read demo_submissions"
  on public.demo_submissions for select
  using (true);

-- demo_submissions: any authenticated user submits their own demo
drop policy if exists "User insert own demo_submissions" on public.demo_submissions;
create policy "User insert own demo_submissions"
  on public.demo_submissions for insert to authenticated
  with check (auth.uid() = user_id);

-- demo_submissions: owner or admin can delete (weekly cleanup)
drop policy if exists "Owner or admin delete demo_submissions" on public.demo_submissions;
create policy "Owner or admin delete demo_submissions"
  on public.demo_submissions for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- demo_votes: user manages only their own vote row
drop policy if exists "User select own demo_votes" on public.demo_votes;
create policy "User select own demo_votes"
  on public.demo_votes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "User insert own demo_votes" on public.demo_votes;
create policy "User insert own demo_votes"
  on public.demo_votes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "User delete own demo_votes" on public.demo_votes;
create policy "User delete own demo_votes"
  on public.demo_votes for delete to authenticated
  using (auth.uid() = user_id);

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Fire/vuilnisbak counts update live across viewers during the show.

alter publication supabase_realtime add table public.demo_submissions;
