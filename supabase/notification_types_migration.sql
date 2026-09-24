-- ============================================================================
-- notifications: de ontbrekende meldingstypes toestaan.
--
-- De check-constraint notifications_type_check (ooit in het dashboard
-- aangemaakt, niet in een migratie) kende drie types niet die de
-- notify-functie wél wegschrijft:
--
--   admin_upload  — "nieuw nummer wacht op goedkeuring", naar admins
--   message       — nieuw direct bericht
--   band_mention  — @vermelding in de bandchat
--
-- De insert faalde dus elke keer, en omdat notify het resultaat niet
-- controleerde, merkte niemand het: push en e-mail kwamen wel aan, de lijst
-- met meldingen in de app bleef voor deze drie altijd leeg. Sinds de
-- admin-uploadmeldingen in juli zijn toegevoegd is er er geen één
-- opgeslagen.
--
-- De nieuwe lijst wordt opgebouwd uit élk type dat nu al in de tabel staat,
-- aangevuld met de bekende types. Zo kan het vervangen van de constraint
-- niet mislukken op een bestaand type dat hier toevallig niet genoemd wordt.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

do $$
declare
  v_types text[];
begin
  select array_agg(distinct t order by t) into v_types
  from (
    select type as t from public.notifications where type is not null
    union
    select unnest(array[
      -- al toegestaan
      'system', 'follow', 'like', 'comment', 'forum_reply', 'rsvp', 'article',
      -- ontbraken
      'admin_upload', 'message', 'band_mention',
      -- gereserveerd, zodat een volgende functie niet weer stil faalt
      'band_invite'
    ])
  ) s;

  alter table public.notifications drop constraint if exists notifications_type_check;
  execute format(
    'alter table public.notifications add constraint notifications_type_check check (type = any (%L::text[]))',
    v_types
  );
  raise notice 'notifications_type_check staat nu toe: %', v_types;
end
$$;

commit;
