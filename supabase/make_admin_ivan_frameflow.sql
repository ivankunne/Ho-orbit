-- Maakt het account met inlogadres ivan@frameflow.no admin, zodat het ook de
-- e-mails over uploads die op goedkeuring wachten ontvangt.
--
-- Zoekt op auth.users.email (het echte, actuele inlogadres) en niet op
-- profiles.email — dat laatste wordt alleen bij het aanmelden gezet en daarna
-- nooit meer bijgewerkt. Verandert niets en geeft een foutmelding als er niet
-- precies één account met dit adres bestaat.
--
-- Draai één keer in de Supabase SQL-editor.

do $$
declare
  v_ids uuid[];
begin
  select array_agg(id) into v_ids
  from auth.users
  where lower(email) = 'ivan@frameflow.no';

  if v_ids is null then
    raise exception 'Geen account gevonden met inlogadres ivan@frameflow.no — maak eerst een account aan en draai dit daarna opnieuw.';
  end if;
  if array_length(v_ids, 1) > 1 then
    raise exception 'Meer dan één account met dit adres (%): niets gewijzigd.', v_ids;
  end if;

  update public.profiles set is_admin = true where id = v_ids[1];
  if not found then
    raise exception 'Account bestaat in auth.users maar heeft geen profiel (%): niets gewijzigd.', v_ids[1];
  end if;

  raise notice 'Klaar: % is nu admin.', v_ids[1];
end
$$;

-- Controle: wie is er nu admin?
select p.username, p.display_name, u.email, p.is_admin
from public.profiles p
join auth.users u on u.id = p.id
where p.is_admin = true
order by p.username;
