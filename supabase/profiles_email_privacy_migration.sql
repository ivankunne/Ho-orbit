-- ============================================================================
-- profiles.email: niet meer publiek.
--
-- De tabel profiles is voor iedereen leesbaar (profielpagina's, artiesten,
-- zoeken) — en daarmee ook de kolom email. Iedereen, zonder account, kon zo
-- van elke gebruiker het e-mailadres opvragen. Dat is een AVG-datalek.
--
-- Waarom de kolom er stond: inloggen met een gebruikersnaam zocht in de
-- browser het bijbehorende e-mailadres op. Dat gebeurt nu op de server
-- (edge function login-username), die het adres uit auth.users haalt. Verder
-- leest niets deze kolom: meldingen en mails gebruiken al auth.users.
--
-- Deze migratie maakt de kolom leeg en houdt hem leeg (trigger), ook als een
-- oude app-versie of databasefunctie er nog iets in schrijft. De kolom zelf
-- blijft bestaan, zodat bestaande queries (select *) niet breken.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien. Draai hem NA het live zetten van de nieuwe inlog (anders werkt
-- inloggen met gebruikersnaam even niet).
-- ============================================================================

begin;

create or replace function public.clear_profile_email()
returns trigger
language plpgsql
as $$
begin
  new.email := null;
  return new;
end;
$$;

drop trigger if exists trg_clear_profile_email on public.profiles;
create trigger trg_clear_profile_email
  before insert or update on public.profiles
  for each row execute function public.clear_profile_email();

update public.profiles set email = null where email is not null;

commit;
