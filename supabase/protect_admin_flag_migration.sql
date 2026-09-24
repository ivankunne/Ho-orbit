-- ============================================================================
-- profiles: gewone gebruikers mogen hun eigen is_admin en verified niet meer
-- aanpassen.
--
-- fix_profiles_update_rls_migration.sql dichtte het gat waardoor iedereen —
-- ook uitgelogd — elk profiel kon overschrijven. Wat bleef: je mag je éígen
-- rij bijwerken, en de policy zegt niets over wélke kolommen. Een ingelogde
-- gebruiker kon dus met één API-verzoek zichzelf admin maken:
--
--   PATCH /rest/v1/profiles?id=eq.<eigen id>   {"is_admin": true}
--
-- en daarmee alles wat achter is_admin() zit: tutorials en masterclasses,
-- het beheerpaneel, goedkeuren van uploads, de stoellimiet omzeilen. Zelfde
-- voor de verified-badge.
--
-- De app zelf schrijft is_admin en verified alleen bij het aanmelden (als
-- false) en heeft geen scherm om iemand admin te maken — deze trigger breekt
-- dus niets. Toegestaan blijft:
--   - de service role (edge functions)
--   - de SQL-editor en migraties (session_user postgres / supabase_admin)
--   - bestaande admins (om later eventueel anderen admin te maken)
--
-- LET OP session_user, niet current_user: deze functie is SECURITY DEFINER,
-- en daarbinnen is current_user altijd de eigenaar (postgres). Een check op
-- current_user zou dus ieder verzoek doorlaten.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_admin := false;
    new.verified := false;
  else
    new.is_admin := old.is_admin;
    new.verified := old.verified;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_privileged_profile_columns on public.profiles;
create trigger trg_protect_privileged_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_privileged_profile_columns();

revoke execute on function public.protect_privileged_profile_columns() from public, anon, authenticated;

commit;
