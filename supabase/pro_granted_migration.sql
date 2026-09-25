-- ============================================================================
-- profiles.pro_granted: Pro gekregen van h-orbit, zonder te betalen.
--
-- `plan` wordt bijgehouden door de stripe-webhook: loopt een abonnement af,
-- dan zet die hem terug op 'free'. Voor iemand die Pro cadeau krijgt (team,
-- partners) moet dat niet gebeuren. Zolang pro_granted aan staat, houdt een
-- trigger `plan` op 'paid' — wat Stripe ook meldt. Daardoor werken alle
-- bestaande Pro-controles (paywall, BandSpace-stoelen, berichten) zonder
-- aanpassing.
--
-- Alleen een admin zet dit aan of uit (admin_set_pro_granted of het
-- beheerpaneel). Gaat hij uit, dan volgt `plan` weer het echte abonnement.
--
-- Draai handmatig één keer in de Supabase SQL-editor. Veilig om opnieuw te
-- draaien.
-- ============================================================================

begin;

alter table public.profiles add column if not exists pro_granted boolean not null default false;

create or replace function public.apply_pro_granted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_privileged boolean := auth.role() = 'service_role'
                          or session_user in ('postgres', 'supabase_admin')
                          or public.is_admin();
begin
  -- Alleen een admin of de service role mag de vlag zelf wijzigen.
  if not v_privileged then
    if tg_op = 'INSERT' then
      new.pro_granted := false;
    else
      new.pro_granted := old.pro_granted;
    end if;
  end if;

  if new.pro_granted then
    new.plan := 'paid';
  elsif tg_op = 'UPDATE' and old.pro_granted and not new.pro_granted then
    -- Cadeau ingetrokken: terug naar wat het abonnement zegt.
    new.plan := case when new.subscription_status in ('active', 'trialing', 'past_due') then 'paid' else 'free' end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_pro_granted on public.profiles;
create trigger trg_apply_pro_granted
  before insert or update on public.profiles
  for each row execute function public.apply_pro_granted();

revoke execute on function public.apply_pro_granted() from public, anon, authenticated;

create or replace function public.admin_set_pro_granted(target_user_id uuid, granted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Alleen admins kunnen Pro cadeau geven.';
  end if;
  update public.profiles set pro_granted = granted where id = target_user_id;
  if not found then
    raise exception 'Gebruiker niet gevonden.';
  end if;
end;
$$;

revoke execute on function public.admin_set_pro_granted(uuid, boolean) from public, anon;
grant execute on function public.admin_set_pro_granted(uuid, boolean) to authenticated;

-- Tete2Tete: Pro zonder te betalen.
update public.profiles set pro_granted = true where id = 'bf90fe8f-dfd5-4369-b17c-a2aa6756dc02';

commit;
