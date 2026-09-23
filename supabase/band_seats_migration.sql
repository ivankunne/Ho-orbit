-- ============================================================================
-- BandSpace-stoelen: één Pro-abonnement dekt de eigenaar + 5 uitgenodigde
-- leden. Daarboven kost elke extra persoon € 2,50 per maand (of € 30 per jaar).
--
-- Waarom een trigger en niet alleen een controle in de RPC's: er zijn vijf
-- verschillende wegen waarlangs iemand een actief bandlid wordt —
--   1. create_band_invite → join_band_with_token (uitnodiging per e-mail)
--   2. add_band_member_direct (bestaande gebruiker direct toevoegen)
--   3. de auto-link-trigger op profiles, die een uitnodiging tijdens het
--      registreren al accepteert
--   4. BandSpacePage.handleCreate — een directe insert vanuit de client
--   5. BandSpacePage.handleRequestJoin + goedkeuring, status pending → active
-- — en nummers 3 t/m 5 gaan langs de RPC's heen. Een controle per functie is
-- dus per definitie lek. Een BEFORE-trigger op band_members vuurt bij élke
-- weg, ook bij een rechtstreekse REST-insert en ook onder de service-role
-- sleutel. Dát is de grens; de rest van deze migratie hangt eraan.
--
-- De stoelen horen bij het ábonnement, niet bij de band: iemand kan
-- onbeperkt bands aanmaken, dus "5 per band" zou betekenen dat één plan van
-- € 10 via tien bands vijftig mensen dekt. Het zijn vijf plekken in totaal,
-- over alle bands die je bezit.
--
-- Draai handmatig één keer in de Supabase SQL-editor.
-- ============================================================================

begin;

-- ─── 1. Stoelen op het profiel ────────────────────────────────────────────
-- extra_seats wordt uitsluitend door de stripe-webhook (service role)
-- geschreven en meelift op protect_subscription_columns hieronder, zodat een
-- gebruiker zijn eigen aantal niet kan ophogen.
alter table public.profiles
  add column if not exists extra_seats int not null default 0 check (extra_seats >= 0),
  -- Wanneer de bandleden boven het toegestane aantal worden gedeactiveerd.
  -- Gezet zodra iemand over zijn limiet komt te zitten (opzegging of minder
  -- stoelen); tot die datum verandert er niets en toont de app een
  -- waarschuwing.
  add column if not exists seat_downgrade_at timestamptz;

create or replace function public.protect_subscription_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.plan := old.plan;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.subscription_status := old.subscription_status;
    new.current_period_end := old.current_period_end;
    new.extra_seats := old.extra_seats;
    new.seat_downgrade_at := old.seat_downgrade_at;
  end if;
  return new;
end;
$$;

-- ─── 2. Leden kunnen ook geschorst zijn ───────────────────────────────────
-- Niet verwijderd: het lidmaatschap blijft bestaan, alleen niet actief. Alle
-- bestaande queries en policies filteren al op status = 'active', dus een
-- geschorst lid verdwijnt overal vanzelf uit — en komt in één update weer
-- terug zodra er weer betaald wordt. Niemand raakt het werk van zijn band
-- kwijt door een verlopen kaart.
alter table public.band_members drop constraint if exists band_members_status_check;
alter table public.band_members
  add constraint band_members_status_check
  check (status in ('pending', 'active', 'suspended'));

-- ─── 3. Rekenen ───────────────────────────────────────────────────────────

-- Op één plek, zodat het aantal niet door de codebase heen gestrooid staat.
create or replace function public.band_included_seats()
returns int language sql immutable as $$ select 5 $$;

create or replace function public.band_owner_id(p_band_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select user_id from public.band_members
      where band_id = p_band_id and role = 'owner' limit 1),
    (select created_by from public.bands where id = p_band_id)
  );
$$;

-- Hoeveel plekken deze abonnee te vergeven heeft. Zonder betaald plan nul:
-- BandSpace is een Pro-functie, dus zonder abonnement zijn er geen bandleden
-- om te dekken.
create or replace function public.band_seat_allowance(p_owner uuid)
returns int language sql stable security definer set search_path = public as $$
  select case
    when p_owner is null then 0
    else coalesce((
      select case when p.plan = 'paid'
                  then public.band_included_seats() + p.extra_seats
                  else 0 end
      from public.profiles p where p.id = p_owner
    ), 0)
  end;
$$;

-- Bezette plekken: alle actieve niet-eigenaren in álle bands van deze
-- eigenaar. De eigenaar zelf kost geen stoel.
create or replace function public.band_seats_used(p_owner uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.band_members bm
  join public.band_members o
    on o.band_id = bm.band_id and o.role = 'owner'
  where o.user_id = p_owner
    and bm.status = 'active'
    and bm.role <> 'owner';
$$;

-- ─── 4. De grens zelf ─────────────────────────────────────────────────────
create or replace function public.enforce_band_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_used  int;
  v_allow int;
begin
  -- Alleen een áctief, niet-eigenaar lidmaatschap kost een stoel.
  if new.status <> 'active' or new.role = 'owner' then
    return new;
  end if;

  -- Was deze rij al een actief lid, dan verandert het aantal niet. Zonder dit
  -- zou elke onschuldige update (rol wijzigen, een kolom bijwerken) opnieuw
  -- tegen de limiet aanlopen zodra de band precies vol zit.
  if tg_op = 'UPDATE' and old.status = 'active' and old.role <> 'owner' then
    return new;
  end if;

  v_owner := public.band_owner_id(new.band_id);

  -- Band bestaat nog niet helemaal (de eigenaarsrij wordt net aangemaakt),
  -- of het lid ís de eigenaar: niets te rekenen.
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;

  v_allow := public.band_seat_allowance(v_owner);
  v_used  := public.band_seats_used(v_owner);

  if v_used >= v_allow then
    raise exception 'band_seat_limit_reached'
      using errcode = '23514',
            detail  = format('allowance=%s used=%s', v_allow, v_used),
            hint    = 'Koop een extra stoel of verwijder eerst een lid.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_band_seat_limit on public.band_members;
create trigger trg_enforce_band_seat_limit
  before insert or update on public.band_members
  for each row execute function public.enforce_band_seat_limit();

-- ─── 5. Afschalen en herstellen ───────────────────────────────────────────

-- Schorst de nieuwste leden tot het er weer evenveel zijn als toegestaan.
-- Nieuwste eerst: wie er het langst bij zit, blijft.
create or replace function public.apply_band_seat_downgrade(p_owner uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_over int;
begin
  v_over := public.band_seats_used(p_owner) - public.band_seat_allowance(p_owner);
  if v_over <= 0 then
    return 0;
  end if;

  update public.band_members
     set status = 'suspended'
   where id in (
     select bm.id
     from public.band_members bm
     join public.band_members o
       on o.band_id = bm.band_id and o.role = 'owner'
     where o.user_id = p_owner
       and bm.status = 'active'
       and bm.role <> 'owner'
     order by bm.joined_at desc nulls first
     limit v_over
   );

  update public.profiles set seat_downgrade_at = null where id = p_owner;
  return v_over;
end;
$$;

-- Haalt geschorste leden terug zodra er weer plek is — oudste eerst, de
-- omgekeerde volgorde van het schorsen. De trigger bewaakt de bovengrens.
create or replace function public.restore_band_seats(p_owner uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room int;
begin
  v_room := public.band_seat_allowance(p_owner) - public.band_seats_used(p_owner);
  if v_room <= 0 then
    return 0;
  end if;

  update public.band_members
     set status = 'active'
   where id in (
     select bm.id
     from public.band_members bm
     join public.band_members o
       on o.band_id = bm.band_id and o.role = 'owner'
     where o.user_id = p_owner
       and bm.status = 'suspended'
       and bm.role <> 'owner'
     order by bm.joined_at asc nulls last
     limit v_room
   );

  return v_room;
end;
$$;

-- ─── 6. Wat de app opvraagt ───────────────────────────────────────────────

-- Alles wat de interface over stoelen moet weten in één rondje, voor de
-- ingelogde gebruiker. Ook meteen de plek waar een verlopen afschaaldatum
-- alsnog wordt uitgevoerd: geen cron nodig, het gebeurt zodra de eigenaar
-- zijn eigen BandSpace opent, en raakt alleen zijn eigen bands.
create or replace function public.my_band_seats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me       uuid := auth.uid();
  v_due      timestamptz;
  v_suspended int;
begin
  if v_me is null then
    raise exception 'not_authenticated';
  end if;

  select seat_downgrade_at into v_due from public.profiles where id = v_me;

  -- Datum verstreken? Dan nu afschalen.
  if v_due is not null and v_due <= now() then
    perform public.apply_band_seat_downgrade(v_me);
  end if;

  -- Weer ruimte (bijgekocht of opnieuw geabonneerd)? Dan geschorste leden
  -- terughalen, zodat niemand handmatig opnieuw uitgenodigd hoeft te worden.
  if public.band_seats_used(v_me) < public.band_seat_allowance(v_me) then
    perform public.restore_band_seats(v_me);
  end if;

  select count(*)::int into v_suspended
  from public.band_members bm
  join public.band_members o on o.band_id = bm.band_id and o.role = 'owner'
  where o.user_id = v_me and bm.status = 'suspended' and bm.role <> 'owner';

  return jsonb_build_object(
    'included',      public.band_included_seats(),
    'extra',         coalesce((select extra_seats from public.profiles where id = v_me), 0),
    'allowance',     public.band_seat_allowance(v_me),
    'used',          public.band_seats_used(v_me),
    'suspended',     v_suspended,
    'downgrade_at',  (select seat_downgrade_at from public.profiles where id = v_me)
  );
end;
$$;

grant execute on function public.my_band_seats() to authenticated;

-- Dezelfde cijfers voor één band, voor wie er beheerder van is maar niet de
-- eigenaar — die moet ook kunnen zien dat de band vol zit.
create or replace function public.band_seat_state(p_band_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.band_members
    where band_id = p_band_id and user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'not_authorized';
  end if;

  v_owner := public.band_owner_id(p_band_id);

  return jsonb_build_object(
    'included',  public.band_included_seats(),
    'allowance', public.band_seat_allowance(v_owner),
    'used',      public.band_seats_used(v_owner),
    'is_owner',  v_owner = auth.uid()
  );
end;
$$;

grant execute on function public.band_seat_state(uuid) to authenticated;

-- ─── 7. Uitnodigingen reserveren een plek ─────────────────────────────────
-- De trigger houdt de grens hoe dan ook, maar zonder deze controle kun je bij
-- één vrije plek drie uitnodigingen versturen: de eerste die klikt komt
-- binnen, de andere twee krijgen een foutmelding ná het aanmaken van hun
-- account. Openstaande uitnodigingen tellen daarom mee als bezet.
create or replace function public.band_seats_reserved(p_owner uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.band_invites bi
  join public.band_members o
    on o.band_id = bi.band_id and o.role = 'owner'
  where o.user_id = p_owner
    and bi.status = 'pending'
    and bi.expires_at > now();
$$;

-- Zelfde functie als in band_invites_migration.sql, met de stoelcontrole
-- ertussen. De rest van de body is ongewijzigd.
create or replace function public.create_band_invite(
  p_band_id uuid, p_email text, p_invited_name text, p_role text default 'member'
)
returns band_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_row   band_invites%rowtype;
  v_owner uuid;
  v_taken int;
  v_allow int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from band_members
    where band_id = p_band_id and user_id = auth.uid()
      and role in ('owner', 'admin') and status = 'active'
  ) then
    raise exception 'not_authorized';
  end if;

  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'invalid_role';
  end if;

  if exists (
    select 1 from band_members bm join profiles pr on pr.id = bm.user_id
    where bm.band_id = p_band_id and bm.status = 'active' and lower(pr.email) = v_email
  ) then
    raise exception 'already_a_member';
  end if;

  -- Een bestaande openstaande uitnodiging opnieuw versturen mag altijd: die
  -- plek was al gereserveerd, er komt er geen bij.
  if not exists (
    select 1 from band_invites
    where band_id = p_band_id and email = v_email and status = 'pending'
  ) then
    v_owner := public.band_owner_id(p_band_id);
    v_allow := public.band_seat_allowance(v_owner);
    v_taken := public.band_seats_used(v_owner) + public.band_seats_reserved(v_owner);
    if v_taken >= v_allow then
      raise exception 'band_seat_limit_reached'
        using errcode = '23514',
              detail  = format('allowance=%s used=%s', v_allow, v_taken);
    end if;
  end if;

  update band_invites
    set role = p_role, invited_name = p_invited_name, invited_by = auth.uid(),
        expires_at = now() + interval '7 days',
        token = replace(gen_random_uuid()::text, '-', '')
    where band_id = p_band_id and email = v_email and status = 'pending'
    returning * into v_row;

  if v_row.id is null then
    insert into band_invites (band_id, email, invited_name, role, invited_by)
    values (p_band_id, v_email, p_invited_name, p_role, auth.uid())
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.create_band_invite(uuid, text, text, text) to authenticated;

-- ─── 8. Wat de webhook schrijft ───────────────────────────────────────────
-- Aangeroepen door stripe-webhook (service role) na elke wijziging aan een
-- abonnement. Zet het aantal bijgekochte stoelen en bepaalt of er afgeschaald
-- moet worden — met een waarschuwingstermijn in plaats van meteen ingrijpen.
create or replace function public.sync_band_seats(p_user uuid, p_extra int, p_period_end timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allow int;
  v_used  int;
  v_due   timestamptz;
begin
  update public.profiles set extra_seats = greatest(coalesce(p_extra, 0), 0) where id = p_user;

  v_allow := public.band_seat_allowance(p_user);
  v_used  := public.band_seats_used(p_user);

  if v_used > v_allow then
    -- Te veel leden voor het nieuwe plan. Niet meteen schorsen: de eigenaar
    -- krijgt tot het einde van de betaalde periode (of een week, als die al
    -- voorbij is) om leden te verwijderen of stoelen bij te kopen. De app
    -- toont die datum; my_band_seats() voert het daarna uit.
    v_due := greatest(coalesce(p_period_end, now() + interval '7 days'), now() + interval '24 hours');
    update public.profiles set seat_downgrade_at = v_due where id = p_user;
  else
    -- Weer genoeg ruimte: waarschuwing weg en geschorste leden terughalen.
    update public.profiles set seat_downgrade_at = null where id = p_user;
    perform public.restore_band_seats(p_user);
  end if;

  return jsonb_build_object(
    'allowance', public.band_seat_allowance(p_user),
    'used',      public.band_seats_used(p_user),
    'downgrade_at', (select seat_downgrade_at from public.profiles where id = p_user)
  );
end;
$$;


-- ─── 9. Toegang tot BandSpace ─────────────────────────────────────────────
-- BandSpace is een Pro-functie, maar een uitgenodigd lid betaalt niet zelf —
-- die valt onder het abonnement van de eigenaar. Zonder deze functie zou
-- RequirePlan precies de vijf mensen buitensluiten voor wie de stoel gekocht
-- is.
--
-- Actief, niet-eigenaar lid zijn ís het bewijs van dekking: de trigger laat
-- zo'n rij alleen bestaan binnen de ruimte van een betalende eigenaar, en
-- zodra die ruimte wegvalt wordt de rij geschorst (en telt hij dus niet meer).
create or replace function public.has_bandspace_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select plan = 'paid' from public.profiles where id = auth.uid()),
    false
  )
  or exists (
    select 1 from public.band_members
    where user_id = auth.uid() and status = 'active' and role <> 'owner'
  );
$$;

grant execute on function public.has_bandspace_access() to authenticated;

-- ─── 10. Afsluiten ────────────────────────────────────────────────────────
-- Postgres geeft een nieuwe functie standaard EXECUTE aan PUBLIC. Alleen
-- intrekken bij `authenticated` en `anon` helpt dus niet — de rechten komen
-- via PUBLIC alsnog binnen. Dat is hier niet theoretisch:
-- apply_band_seat_downgrade(<iemand anders>) zou elke ingelogde gebruiker de
-- bandleden van een willekeurige andere eigenaar op non-actief laten zetten.
--
-- Dus: alles wat de app niet rechtstreeks nodig heeft gaat dicht. De
-- SECURITY DEFINER-functies die wél open staan (my_band_seats,
-- band_seat_state, has_bandspace_access, create_band_invite) roepen deze
-- hulpfuncties intern aan en draaien daarbij met de rechten van de eigenaar,
-- dus die blijven gewoon werken.
revoke execute on function public.sync_band_seats(uuid, int, timestamptz) from public, authenticated, anon;
revoke execute on function public.apply_band_seat_downgrade(uuid) from public, authenticated, anon;
revoke execute on function public.restore_band_seats(uuid) from public, authenticated, anon;
revoke execute on function public.band_seats_used(uuid) from public, authenticated, anon;
revoke execute on function public.band_seats_reserved(uuid) from public, authenticated, anon;
revoke execute on function public.band_seat_allowance(uuid) from public, authenticated, anon;
revoke execute on function public.band_owner_id(uuid) from public, authenticated, anon;
revoke execute on function public.enforce_band_seat_limit() from public, authenticated, anon;

-- Deze drie zijn het publieke oppervlak, en meer niet.
grant execute on function public.my_band_seats() to authenticated;
grant execute on function public.band_seat_state(uuid) to authenticated;
grant execute on function public.has_bandspace_access() to authenticated;
grant execute on function public.create_band_invite(uuid, text, text, text) to authenticated;

commit;
