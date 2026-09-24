-- ============================================================================
-- scene_location_submissions: aanmeldingen van bezoekers voor een plek op de
-- scenekaart.
--
-- Iedereen (ook zonder account) kan via "Meld je locatie aan" een plek
-- voorstellen. Dat gaat via de edge function scene-submission, die de
-- aanvraag hier opslaat en de admins mailt met een link om hem te accepteren
-- of af te wijzen. Accepteren zet de plek in scene_locations.
--
-- Geen policies: alleen de edge function (service role) leest en schrijft.
-- De tabel bevat e-mailadressen van aanvragers, dus niets hiervan mag via de
-- publieke API leesbaar zijn. De `token` in de maillink is de enige sleutel
-- om een aanvraag te bekijken of te beoordelen.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

create table if not exists public.scene_location_submissions (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  -- De plek, in dezelfde vorm als scene_locations.
  name          text not null,
  type          text not null,
  address       text,
  city          text not null,
  province      text not null,
  website       text,
  notes         text,
  description   text,
  lat           double precision not null,
  lng           double precision not null,

  -- Wie het aanvraagt (niet zichtbaar op de kaart).
  contact_name  text not null,
  contact_email text not null,
  message       text,
  ip_hash       text,

  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  location_id   integer references public.scene_locations(id) on delete set null
);

create index if not exists scene_location_submissions_ip_idx
  on public.scene_location_submissions (ip_hash, created_at);

alter table public.scene_location_submissions enable row level security;
revoke all on public.scene_location_submissions from anon, authenticated;

commit;
