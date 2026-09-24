-- ============================================================================
-- Podcastafleveringen: eerst goedkeuren, dan online — net als muziek.
--
-- Tot nu toe stond een aflevering meteen live en kregen admins alleen een
-- melding. Nu:
--   - een nieuwe aflevering van een gewone gebruiker staat op 'pending' en is
--     alleen zichtbaar voor de maker (en admins);
--   - een admin keurt goed of af in het beheerpaneel;
--   - afleveringen die een admin zelf toevoegt, staan meteen live.
--
-- Een trigger bepaalt de status, niet de app: wie via de API zelf
-- upload_status = 'approved' meestuurt, krijgt toch 'pending'. Alle
-- bestaande afleveringen blijven gewoon online.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

alter table public.podcast_episodes add column if not exists upload_status text not null default 'approved';
alter table public.podcast_episodes add column if not exists rejection_reason text;
alter table public.podcast_episodes add column if not exists reviewed_at timestamptz;
alter table public.podcast_episodes add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.podcast_episodes drop constraint if exists podcast_episodes_upload_status_check;
alter table public.podcast_episodes add constraint podcast_episodes_upload_status_check
  check (upload_status in ('pending', 'approved', 'rejected'));

-- Nieuwe rijen: pending, tenzij een admin ze toevoegt (dat regelt de trigger).
alter table public.podcast_episodes alter column upload_status set default 'pending';

create index if not exists podcast_episodes_status_idx on public.podcast_episodes (upload_status);

-- ─── Status: alleen een admin beslist ────────────────────────────────────────

create or replace function public.guard_podcast_episode_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean := auth.role() = 'service_role'
                     or session_user in ('postgres', 'supabase_admin')
                     or public.is_admin();
begin
  if tg_op = 'INSERT' then
    if v_admin then
      new.upload_status := coalesce(nullif(new.upload_status, 'pending'), 'approved');
    else
      new.upload_status := 'pending';
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.rejection_reason := null;
    end if;
  elsif not v_admin then
    new.upload_status := old.upload_status;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.rejection_reason := old.rejection_reason;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_podcast_episode_status on public.podcast_episodes;
create trigger trg_guard_podcast_episode_status
  before insert or update on public.podcast_episodes
  for each row execute function public.guard_podcast_episode_status();

revoke execute on function public.guard_podcast_episode_status() from public, anon, authenticated;

-- ─── Lezen: iedereen ziet goedgekeurde, de maker ook zijn eigen ──────────────

drop policy if exists "Public read podcast_episodes" on public.podcast_episodes;
create policy "Public read podcast_episodes"
  on public.podcast_episodes for select
  using (
    upload_status = 'approved'
    or public.is_admin()
    or exists (select 1 from public.podcasts p where p.id = podcast_id and p.owner_id = auth.uid())
  );

commit;
