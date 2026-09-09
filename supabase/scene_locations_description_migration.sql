-- Adds a `description` field for the dedicated "Meer info" detail page per
-- Hub map location. Kept separate from the existing `notes` column, which
-- stays as the short blurb shown directly in the map popup — `description`
-- is the longer write-up shown only on /hub/locatie/:id, and the "Meer
-- info" button in the popup only appears once this is filled in. Content
-- to be added later per-location; this migration just adds the column.
--
-- Also closes the same paywall-RLS gap already fixed on every other Hub
-- table (see paywall_rls_enforcement_migration.sql) — scene_locations had
-- an open `true` SELECT policy with no plan check, even though /hub itself
-- is a paywalled route.
--
-- Run manually once in the Supabase SQL editor, after
-- paywall_rls_enforcement_migration.sql (needs has_paywalled_access()).

alter table public.scene_locations
  add column if not exists description text;

drop policy if exists "paywall_gate_scene_locations_select" on public.scene_locations;
create policy "paywall_gate_scene_locations_select"
  on public.scene_locations as restrictive for select
  using (public.has_paywalled_access());
