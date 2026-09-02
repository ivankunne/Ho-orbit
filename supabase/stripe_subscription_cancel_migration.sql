-- Adds cancel_at_period_end so the Abonnement screen can correctly show
-- "opgezegd, actief tot <datum>" after a user cancels, even across reloads
-- (Stripe keeps subscription_status = 'active' until the period actually
-- ends — only cancel_at_period_end flips immediately). Written only by the
-- stripe-webhook function, same protection as the other subscription columns.
-- Run manually once in the Supabase SQL editor, after
-- stripe_subscriptions_migration.sql.

alter table public.profiles
  add column if not exists cancel_at_period_end boolean not null default false;

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
    new.cancel_at_period_end := old.cancel_at_period_end;
  end if;
  return new;
end;
$$;
