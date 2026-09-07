-- Global paywall on/off switch. Starts disabled — RequirePlan lets everyone
-- through regardless of plan until an admin flips this on from the Admin
-- panel. Singleton row (id can only ever be `true`) so there's exactly one
-- switch, never a second row to accidentally read the wrong one.
--
-- Run manually once in the Supabase SQL editor.

create table if not exists public.paywall_settings (
  id boolean primary key default true check (id = true),
  enabled boolean not null default false,
  enabled_at timestamptz,
  enabled_by uuid references auth.users(id)
);

insert into public.paywall_settings (id, enabled)
values (true, false)
on conflict (id) do nothing;

alter table public.paywall_settings enable row level security;

drop policy if exists "paywall_settings_select_all" on public.paywall_settings;
create policy "paywall_settings_select_all"
  on public.paywall_settings for select
  using (true);

drop policy if exists "paywall_settings_update_admin" on public.paywall_settings;
create policy "paywall_settings_update_admin"
  on public.paywall_settings for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Realtime, so flipping the switch takes effect immediately in every open
-- tab/session — no refresh needed for "the paywalls automatically go up".
alter publication supabase_realtime add table public.paywall_settings;
