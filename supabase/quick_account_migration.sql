-- ============================================================================
-- Quick account — username + password only, no email required.
--
-- For listeners who just want to listen and vote (e.g. Drop Your Demo's
-- fire/vuilnisbak voting) without the full artist-style signup wizard.
-- Supabase Auth always keys on email, so this generalizes the same technique
-- create_master_admin.sql already uses: insert straight into auth.users /
-- auth.identities with a synthetic, pre-confirmed email, bypassing GoTrue's
-- signup/confirmation pipeline entirely. The resulting account is a normal
-- Luisteraar profile — every existing feature works for it unmodified.
--
-- Callable by anonymous visitors (grant to `anon` below), so — like
-- create_master_admin.sql — it deliberately has no CAPTCHA hook and no
-- GoTrue-level rate limiting. Accepted trade-off for a low-friction "quick
-- account" on a niche community platform; add rate-limiting later if abuse
-- shows up.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run (CREATE OR
-- REPLACE FUNCTION).
-- ============================================================================

create extension if not exists pgcrypto;

create or replace function public.create_quick_account(p_username text, p_password text)
returns table(user_id uuid, user_email text)
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := gen_random_uuid();
  v_email text := lower(regexp_replace(p_username, '[^a-zA-Z0-9]', '', 'g')) || '-' || substr(v_uid::text, 1, 8) || '@quick.h-orbit.nl';
begin
  if length(p_username) < 3 then
    raise exception 'Gebruikersnaam moet minstens 3 tekens zijn.';
  end if;
  if not (p_username ~ '^[a-zA-Z0-9_]+$') then
    raise exception 'Gebruikersnaam mag alleen letters, cijfers en _ bevatten.';
  end if;
  if length(p_password) < 6 then
    raise exception 'Wachtwoord moet minstens 6 tekens zijn.';
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(p_username)) then
    raise exception 'Deze gebruikersnaam is al in gebruik.';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_uid, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', p_username, 'display_name', p_username),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email),
    'email', v_email, now(), now(), now()
  );

  insert into public.profiles (
    id, username, display_name, email, role, is_admin, verified, needs_onboarding,
    followers_count, following_count
  ) values (
    v_uid, p_username, p_username, v_email, 'Luisteraar', false, false, false, 0, 0
  );

  return query select v_uid, v_email;
end;
$$;

grant execute on function public.create_quick_account(text, text) to anon, authenticated;
