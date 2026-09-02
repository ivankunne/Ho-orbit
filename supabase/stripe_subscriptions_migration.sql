-- Adds subscription/plan state to profiles, written only by the stripe-webhook
-- Edge Function (service role). Run manually once in the Supabase SQL editor.
--
-- Why columns on `profiles` instead of a separate table: AuthContext already
-- does `select('*')` on profiles and maps the row onto `user` on every load,
-- so `user.plan` becomes available everywhere in the app for free. The
-- trigger below is what keeps that safe — see notes inline.

alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free', 'paid')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Client-side profile updates (avatar, bio, social links, etc.) must never be
-- able to flip `plan` to 'paid' by hand. Rather than re-deriving every column
-- the client is allowed to touch (fragile, and this table has drifted before
-- — see fix_profiles_update_rls_migration.sql), a trigger just pins these five
-- columns back to their old values unless the request is running as the
-- service role. The stripe-webhook function uses the service-role key, so it
-- passes through untouched; anon/authenticated requests can never change them,
-- no matter what RLS policy exists on the table.
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
  end if;
  return new;
end;
$$;

drop trigger if exists protect_subscription_columns on public.profiles;
create trigger protect_subscription_columns
  before update on public.profiles
  for each row execute function public.protect_subscription_columns();
