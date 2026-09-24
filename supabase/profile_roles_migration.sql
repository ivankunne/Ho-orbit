-- ============================================================================
-- profiles.roles: wat iemand maakt op h-orbit — Artiest, Podcast en/of Radio.
--
-- Tot nu toe had een profiel precies één `role` (tekst). Dat veld deed twee
-- dingen tegelijk: het label uit de onboarding ("Muziekliefhebber",
-- "Organisator", …) én de toegang tot de studio's (Radio, Podcast). Een
-- muzikant met een podcast kon dus niet bestaan, en een admin die iemand de
-- Podcast-rol gaf, wiste daarmee "Artiest".
--
-- Nu:
--   - `roles` (text[]) bepaalt wat je mag: muziek uploaden (Artiest),
--     een podcast maken (Podcast), een radiostation beheren (Radio).
--     Meerdere tegelijk kan.
--   - `role` blijft het label dat je in de onboarding kiest; het geeft geen
--     rechten meer.
--
-- Artiest en Podcast kies je zelf (bij het aanmelden of in je instellingen).
-- Radio blijft iets wat alleen een admin toekent — een trigger houdt dat
-- tegen, ook bij een rechtstreeks API-verzoek.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

-- ─── Kolom + vullen vanuit wat er nu is ──────────────────────────────────────

alter table public.profiles add column if not exists roles text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_roles_check;
alter table public.profiles add constraint profiles_roles_check
  check (roles <@ array['Artiest', 'Podcast', 'Radio']::text[]);

-- Alleen toevoegen, nooit weghalen: opnieuw draaien verandert niets aan wat
-- mensen intussen zelf hebben ingesteld.
update public.profiles p
set roles = (
  select coalesce(array_agg(distinct r order by r), '{}')
  from unnest(
    p.roles
    || case when p.role in ('Artiest', 'Podcast', 'Radio') then array[p.role] else '{}'::text[] end
    -- Wie al muziek heeft geüpload of een artiestenpagina heeft, is artiest.
    || case when exists (select 1 from public.artists a where a.profile_id = p.id)
              or exists (select 1 from public.tracks t where t.uploaded_by = p.id)
            then array['Artiest'] else '{}'::text[] end
    -- Wie al een podcast of radiostation heeft, houdt die toegang.
    || case when exists (select 1 from public.podcasts pc where pc.owner_id = p.id)
            then array['Podcast'] else '{}'::text[] end
    || case when exists (select 1 from public.radio_streams rs where rs.owner_id = p.id)
            then array['Radio'] else '{}'::text[] end
  ) as r
);

-- ─── Radio alleen via een admin ──────────────────────────────────────────────

create or replace function public.protect_radio_role()
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
    new.roles := array_remove(new.roles, 'Radio');
  elsif ('Radio' = any(new.roles)) is distinct from ('Radio' = any(old.roles)) then
    new.roles := case when 'Radio' = any(old.roles)
                      then array_append(array_remove(new.roles, 'Radio'), 'Radio')
                      else array_remove(new.roles, 'Radio') end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_radio_role on public.profiles;
create trigger trg_protect_radio_role
  before insert or update of roles on public.profiles
  for each row execute function public.protect_radio_role();

revoke execute on function public.protect_radio_role() from public, anon, authenticated;

-- ─── Admin: één rol aan- of uitzetten ────────────────────────────────────────
-- Vervangt voor Radio/Podcast het oude admin_set_user_role, dat het hele
-- `role`-veld overschreef (Podcast geven wiste Artiest). Dit zet alleen de
-- gekozen rol aan of uit en laat de rest staan.

create or replace function public.admin_toggle_user_role(target_user_id uuid, toggled_role text, enabled boolean)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roles text[];
begin
  if not public.is_admin() then
    raise exception 'Alleen admins kunnen rollen wijzigen.';
  end if;
  if toggled_role not in ('Artiest', 'Podcast', 'Radio') then
    raise exception 'Onbekende rol: %', toggled_role;
  end if;

  update public.profiles
  set roles = case when enabled
                   then (select array_agg(distinct r order by r) from unnest(array_append(roles, toggled_role)) r)
                   else array_remove(roles, toggled_role) end
  where id = target_user_id
  returning roles into v_roles;

  if not found then
    raise exception 'Gebruiker niet gevonden.';
  end if;

  -- Het label volgt mee als het nog een oude rolnaam was (zie labelFor in src/lib/roles.ts).
  update public.profiles
  set role = coalesce(v_roles[1], 'Luisteraar')
  where id = target_user_id and (role is null or role in ('Artiest', 'Podcast', 'Radio', 'Luisteraar'));

  return v_roles;
end;
$$;

revoke execute on function public.admin_toggle_user_role(uuid, text, boolean) from public, anon;
grant execute on function public.admin_toggle_user_role(uuid, text, boolean) to authenticated;

-- ─── Gratis chat: artiest ↔ niet-artiest, nu op basis van roles ──────────────
-- Zelfde regel als isFreeConversation() in chatService.ts.

create or replace function public.can_access_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_p1 uuid;
  v_p2 uuid;
  v_other_id uuid;
  v_me_artist boolean;
  v_other_artist boolean;
begin
  select participant_1, participant_2 into v_p1, v_p2
  from public.conversations where id = p_conversation_id;

  if v_p1 is null then
    return false;
  end if;

  if public.has_paywalled_access() then
    return true;
  end if;

  v_other_id := case when v_p1 = auth.uid() then v_p2 else v_p1 end;

  select coalesce('Artiest' = any(roles), false) into v_me_artist    from public.profiles where id = auth.uid();
  select coalesce('Artiest' = any(roles), false) into v_other_artist from public.profiles where id = v_other_id;

  return coalesce(v_me_artist, false) is distinct from coalesce(v_other_artist, false);
end;
$$;

-- ─── Podcasts: een nieuwe show alleen met de Podcast-rol ─────────────────────
-- De oude policy "Owner manage own podcasts" gold voor alles (ook insert) en
-- keek niet naar de rol: elke ingelogde gebruiker kon via de API een podcast
-- op eigen naam aanmaken. Bestaande shows beheren blijft gewoon mogelijk.

drop policy if exists "Owner manage own podcasts" on public.podcasts;
drop policy if exists "Podcasters maken een podcast" on public.podcasts;
drop policy if exists "Eigenaar wijzigt eigen podcast" on public.podcasts;
drop policy if exists "Eigenaar verwijdert eigen podcast" on public.podcasts;

create policy "Podcasters maken een podcast" on public.podcasts
  for insert to authenticated
  with check (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and 'Podcast' = any(p.roles))
  );
create policy "Eigenaar wijzigt eigen podcast" on public.podcasts
  for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Eigenaar verwijdert eigen podcast" on public.podcasts
  for delete to authenticated
  using (auth.uid() = owner_id);

commit;
