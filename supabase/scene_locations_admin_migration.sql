-- ============================================================================
-- scene_locations: admins (en de superadmin) mogen locaties op de scenekaart
-- toevoegen, wijzigen en verwijderen vanuit de app.
--
-- Tot nu toe had de tabel alleen lees-policies ("Anyone can read" plus de
-- restrictieve paywall-gate), dus nieuwe plekken kwamen er alleen via de
-- SQL-editor of de service role op. Lezen verandert niet.
--
-- "Admin" = public.is_admin() = profiles.is_admin. De superadmin heeft
-- is_admin = true en valt daar dus ook onder. Admins komen ook altijd door de
-- paywall-gate (has_paywalled_access() geeft true voor is_admin), dus ze zien
-- de rij die ze net hebben opgeslagen terug.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

alter table public.scene_locations enable row level security;

drop policy if exists "Admins voegen locaties toe"  on public.scene_locations;
drop policy if exists "Admins wijzigen locaties"    on public.scene_locations;
drop policy if exists "Admins verwijderen locaties" on public.scene_locations;

create policy "Admins voegen locaties toe"  on public.scene_locations for insert to authenticated with check (public.is_admin());
create policy "Admins wijzigen locaties"    on public.scene_locations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins verwijderen locaties" on public.scene_locations for delete to authenticated using (public.is_admin());

-- Zonder deze grants komt een rol niet eens tot de policy-controle. De id is
-- een SERIAL, dus de insert heeft ook de sequence nodig.
grant select on public.scene_locations to anon, authenticated;
grant insert, update, delete on public.scene_locations to authenticated;
grant usage, select on sequence public.scene_locations_id_seq to authenticated;

commit;
