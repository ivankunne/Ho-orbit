-- ============================================================================
-- BandSpace: het Pro-slot ook in de database.
--
-- De app laat BandSpace alleen toe aan wie Pro heeft of als uitgenodigd lid
-- onder een Pro-eigenaar valt (RequireBandSpace / has_bandspace_access). In
-- de database stond dat slot nog niet: een gratis account kon via de API
-- gewoon bandchat, agenda, projecten enz. lezen en schrijven. Bij de
-- pre-launch-audit (sept 2026) is BandSpace bewust overgeslagen tot de vraag
-- "moet elk lid Pro hebben?" beantwoord was. Dat antwoord is er: Pro dekt de
-- eigenaar plus zijn uitgenodigde leden (band_seats_migration.sql).
--
-- De regel, per band:
--   toegang als has_paywalled_access() (paywall uit, admin, of zelf Pro)
--   óf je bent actief, niet-eigenaar lid van déze band.
-- Dat tweede kan alleen onder een betalende eigenaar: de stoeltrigger laat
-- geen actieve leden toe zonder abonnement en schorst ze als het wegvalt.
--
-- Bewust NIET op slot:
--   - bands:        de publieke bandlijst (zoeken, BandSpace-overzicht)
--   - band_members: nodig voor lidmaatschap, stoelen en uitnodigingen
--   - band_invites: je moet een uitnodiging kunnen zien vóór je lid bent
--
-- RESTRICTIVE policies: ze komen bovenop de bestaande (wie mag welke band
-- zien) en vervangen die niet. SECURITY DEFINER-functies en de service role
-- gaan er, zoals altijd, langs.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

create or replace function public.band_paywall_ok(p_band_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_paywalled_access()
      or exists (
        select 1 from public.band_members
        where band_id = p_band_id and user_id = auth.uid()
          and status = 'active' and role <> 'owner'
      );
$$;

revoke execute on function public.band_paywall_ok(uuid) from public, anon;
grant execute on function public.band_paywall_ok(uuid) to authenticated;

-- ─── Tabellen met een band_id ────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'band_events', 'band_messages', 'band_notes', 'band_notifications', 'band_posts',
    'band_projects', 'band_rehearsal_recordings', 'band_riders', 'band_todos'
  ] loop
    execute format('drop policy if exists "bandspace_paywall_gate" on public.%I', t);
    execute format(
      'create policy "bandspace_paywall_gate" on public.%I as restrictive for all
         using (public.band_paywall_ok(band_id)) with check (public.band_paywall_ok(band_id))', t);
  end loop;
end
$$;

-- ─── Tabellen die onder een ander hangen ─────────────────────────────────────

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('band_event_contacts',      'event_id',   'band_events'),
      ('band_event_profit_splits', 'event_id',   'band_events'),
      ('band_event_rsvps',         'event_id',   'band_events'),
      ('band_project_assignments', 'project_id', 'band_projects'),
      ('band_project_goals',       'project_id', 'band_projects'),
      ('band_project_ideas',       'project_id', 'band_projects'),
      ('band_rider_files',         'rider_id',   'band_riders')
    ) as v(child, fk, parent)
  loop
    execute format('drop policy if exists "bandspace_paywall_gate" on public.%I', r.child);
    execute format(
      'create policy "bandspace_paywall_gate" on public.%I as restrictive for all
         using (public.band_paywall_ok((select p.band_id from public.%I p where p.id = %I)))
         with check (public.band_paywall_ok((select p.band_id from public.%I p where p.id = %I)))',
      r.child, r.parent, r.fk, r.parent, r.fk);
  end loop;
end
$$;

commit;
