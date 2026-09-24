-- ============================================================================
-- Tutorials en masterclasses: alleen admins (en de superadmin) mogen ze
-- toevoegen, wijzigen of verwijderen. Iedereen mag ze lezen.
--
-- Waarom alle bestaande policies eerst weg: `masterclasses` had alleen een
-- lees-policy (niemand kon iets toevoegen behalve via het dashboard), en
-- `tutorials` is ooit in het dashboard aangemaakt zonder migratie — welke
-- policies daar nu op staan is uit de repo niet op te maken. Stond daar een
-- ruime schrijf-policy (of stond RLS uit), dan zou een extra admin-policy
-- er niets aan veranderen: permissive policies worden OF'd. Door ze allemaal
-- te verwijderen en precies de gewenste set terug te zetten, geldt "alleen
-- admins" ongeacht wat er eerder stond.
--
-- "Admin" = public.is_admin() = profiles.is_admin. De superadmin
-- (ivanmaster) heeft is_admin = true en valt daar dus ook onder.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

-- Tutorials hadden geen videokolom: de detailpagina toonde daardoor altijd
-- "Video — binnenkort beschikbaar". Nullable, dus bestaande rijen blijven geldig.
alter table public.tutorials add column if not exists video_url text;

alter table public.tutorials     alter column views_count set default 0;
alter table public.masterclasses alter column views_count set default 0;

alter table public.tutorials     enable row level security;
alter table public.masterclasses enable row level security;

-- Alle bestaande policies op beide tabellen verwijderen, wat hun naam ook is.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename in ('tutorials', 'masterclasses')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;

-- Lezen: iedereen, ook uitgelogd (de app is vrij te doorlopen).
create policy "Iedereen leest tutorials"     on public.tutorials     for select using (true);
create policy "Iedereen leest masterclasses" on public.masterclasses for select using (true);

-- Schrijven: alleen admins.
create policy "Admins voegen tutorials toe"  on public.tutorials for insert to authenticated with check (public.is_admin());
create policy "Admins wijzigen tutorials"    on public.tutorials for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins verwijderen tutorials" on public.tutorials for delete to authenticated using (public.is_admin());

create policy "Admins voegen masterclasses toe"  on public.masterclasses for insert to authenticated with check (public.is_admin());
create policy "Admins wijzigen masterclasses"    on public.masterclasses for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins verwijderen masterclasses" on public.masterclasses for delete to authenticated using (public.is_admin());

-- Zonder deze grants helpen de policies niet: een rol zonder INSERT-recht
-- komt niet eens tot de policy-controle.
grant select on public.tutorials, public.masterclasses to anon, authenticated;
grant insert, update, delete on public.tutorials, public.masterclasses to authenticated;

commit;
