-- Paywall: van "je mag het niet zien" naar "je mag het zien, niet gebruiken".
--
-- paywall_rls_enforcement_migration.sql sloot Pro-inhoud volledig af voor
-- gratis accounts. Dat werkte zolang de hele app achter een login zat, maar
-- sinds h-orbit vrij te doorlopen is (zie SEO.md) levert het lege secties op:
-- het blok "Maak connecties" op de homepage en de evenemententab op een
-- artiestenpagina halen hun gegevens rechtstreeks uit deze tabellen en staan
-- niet achter RequirePlan. Die zouden bij "Ga live" stilletjes leeglopen —
-- precies op de twee pagina's die een nieuwe bezoeker als eerste ziet.
--
-- Nieuwe lijn: kíjken mag, dóén niet. Lezen staat open, schrijven blijft
-- afgeschermd, en de contactgegevens bij een netwerkoproep — de eigenlijke
-- waarde van zo'n advertentie — blijven Pro.
--
-- Ongemoeid gelaten: hub_posts, hub_replies (de Hub-pagina bestaat niet meer)
-- en messages (DM's blijven Pro, met de bestaande fan↔artiest-uitzondering).
--
-- Draai dit handmatig één keer in de Supabase SQL-editor, ná
-- paywall_rls_enforcement_migration.sql.

begin;

-- ── Evenementen ───────────────────────────────────────────────────────────
-- Lezen mag iedereen; aanmaken, wijzigen en verwijderen blijft Pro. De oude
-- policy gold "for all" en sloot daarmee ook select af.
drop policy if exists "paywall_gate_events" on public.events;

create policy "paywall_gate_events_insert"
  on public.events as restrictive for insert
  with check (public.has_paywalled_access());

create policy "paywall_gate_events_update"
  on public.events as restrictive for update
  using (public.has_paywalled_access())
  with check (public.has_paywalled_access());

create policy "paywall_gate_events_delete"
  on public.events as restrictive for delete
  using (public.has_paywalled_access());

-- ── Venues ────────────────────────────────────────────────────────────────
-- Read-only feature zonder schrijfpad; de afscherming kan er helemaal af.
drop policy if exists "paywall_gate_venues_select" on public.venues;

-- ── Netwerken ─────────────────────────────────────────────────────────────
-- De tabel zelf blijft dicht: daar staat contact_info in, en dat is nu net
-- waar een Wanted-oproep om draait. In plaats daarvan komt er een view met
-- alleen de velden die de lijst nodig heeft, waarin contact_info pas wordt
-- ingevuld als je er recht op hebt. "paywall_gate_networking_posts" blijft dus
-- staan zoals hij is — de view is het publieke leespad.
--
-- Bewust GEEN security_invoker: de view moet juist langs de RLS van de
-- onderliggende tabel heen kunnen, anders valt er voor een gratis account nog
-- steeds niets te lezen. De maskering van contact_info gebeurt hier in de
-- kolom zelf, en er worden geen andere velden blootgelegd dan hieronder staan.
create or replace view public.networking_posts_public as
  select
    p.id,
    p.user_id,
    p.type,
    p.title,
    p.description,
    p.genre,
    p.location,
    p.tags,
    p.event_id,
    p.track_title,
    p.status,
    p.created_at,
    case
      when public.has_paywalled_access() then p.contact_info
      else null
    end as contact_info,
    -- Zodat de interface het verschil weet tussen "geen contact opgegeven" en
    -- "contact bestaat, maar is afgeschermd".
    (p.contact_info is not null and not public.has_paywalled_access()) as contact_locked
  from public.networking_posts p;

comment on view public.networking_posts_public is
  'Publiek leespad voor netwerkoproepen: iedereen ziet de oproep, contact_info alleen met Pro-toegang. Zie paywall_browse_gate_migration.sql.';

grant select on public.networking_posts_public to anon, authenticated;

commit;
