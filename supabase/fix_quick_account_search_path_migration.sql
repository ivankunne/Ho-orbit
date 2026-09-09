-- create_quick_account() has two independent bugs that, together, meant the
-- "Snel account maken" quick-signup flow has never worked in production:
--
-- 1. It calls crypt()/gen_salt() from pgcrypto, but pgcrypto lives in the
--    `extensions` schema (Supabase's default) while the function's
--    search_path was only 'public','auth' — every call failed with
--    "function gen_salt(unknown) does not exist".
--
-- 2. Once (1) is fixed, the function's own explicit
--    `insert into public.profiles (...)` collides with the row the
--    existing `on_auth_user_created` trigger (handle_new_user()) already
--    creates for every new auth.users row — "duplicate key value violates
--    unique constraint profiles_pkey". The trigger already sets
--    username/display_name/email correctly from raw_user_meta_data, and
--    every other column the function wanted already matches the table's
--    default (role='Luisteraar', is_admin/verified=false, counts=0) —
--    except needs_onboarding, which defaults to true but quick accounts
--    should skip onboarding. So: drop the redundant insert, just update
--    that one column on the trigger-created row instead.
--
-- Run manually once via the Supabase SQL editor.

create or replace function public.create_quick_account(p_username text, p_password text)
returns table(user_id uuid, user_email text)
language plpgsql
security definer
set search_path to 'public', 'auth', 'extensions'
as $function$
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

  -- on_auth_user_created already inserted a matching public.profiles row
  -- (username/display_name/email from raw_user_meta_data above); just fix
  -- up the one field that needs a non-default value for quick accounts.
  update public.profiles set needs_onboarding = false where id = v_uid;

  return query select v_uid, v_email;
end;
$function$;
