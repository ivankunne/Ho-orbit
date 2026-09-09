-- forum_categories was empty (never seeded), so the "Categorie" dropdown
-- in ForumsPage's NewThreadModal had zero <option>s — nothing to pick,
-- looked like the field "didn't do anything". The frontend already has
-- icon/color maps built for exactly these 5 categories (see iconMap /
-- colorMap in ForumsPage.tsx), so seed the ones it expects.
--
-- Run manually once via the Supabase SQL editor.

insert into public.forum_categories (name, description, icon, color, sort_order)
select * from (values
  ('Algemeen', 'Algemene discussies over muziek en de scene', 'MessageSquare', 'blue', 1),
  ('Gear & Productie', 'Instrumenten, plugins, opname- en producetips', 'Sliders', 'green', 2),
  ('Samenwerkingen', 'Zoek bandleden, features of co-writes', 'Users', 'orange', 3),
  ('Evenementen', 'Concerten, open mics en meetups', 'Calendar', 'purple', 4),
  ('Koffiehoek', 'Vrij gesprek, offtopic en klets', 'Coffee', 'gray', 5)
) as v(name, description, icon, color, sort_order)
where not exists (select 1 from public.forum_categories);
