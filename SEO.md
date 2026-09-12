# SEO — h-orbit

Hoe de vindbaarheid van h-orbit in elkaar zit, wat er bewust wél en niet
geïndexeerd wordt, en wat je moet aanraken als je iets wilt veranderen.

---

## Het uitgangspunt: de app is niet indexeerbaar

Vrijwel elke route in `src/App.tsx` zit achter `<ProtectedRoute>`. Een crawler
is per definitie uitgelogd en wordt dus doorgestuurd naar het inlogscherm. Daar
komt bij dat de app een client-side SPA is zonder server-rendering: het eerste
document dat over de lijn komt is een lege shell.

Gevolg: `/muziek`, `/artists`, `/magazine`, `/forums` en de rest kúnnen niet
ranken, hoeveel metadata je er ook op plakt. Ze staan daarom in `robots.txt` op
`Disallow` en krijgen `noindex` mee — anders levert het alleen duplicate content
van hetzelfde inlogscherm op.

De indexeerbare kant van h-orbit is een **aparte, statische laag** die bij het
bouwen wordt gegenereerd.

## De statische laag

`scripts/generate-seo.mjs` draait na `vite build` (zie `package.json`) en
schrijft echte HTML naar `dist/`:

| Uitvoer | Inhoud |
|---|---|
| `dist/<slug>/index.html` | Redactionele pagina's uit `scripts/seo/content.mjs` |
| `dist/podia/index.html` | Overzicht van alle provincies |
| `dist/podia/<provincie>/index.html` | Locaties per provincie, uit `scene_locations` in Supabase |
| `dist/sitemap.xml` | Alleen URL's die echt indexeerbaar zijn |
| `dist/robots.txt` | Gegenereerd, niet met de hand bijhouden |

Vercel controleert het bestandssysteem vóór de rewrites in `vercel.json`, dus
deze pagina's gaan langs de SPA-catch-all heen en worden direct als HTML
uitgeleverd. Geen JavaScript nodig om ze te lezen.

**Tekst aanpassen of een pagina toevoegen:** alles staat in
`scripts/seo/content.mjs`. Een nieuwe pagina is een nieuw object in `PAGES`.
Voeg het pad daarna toe aan `STATIC_PAGES` in `public/sw.js` (zie hieronder) en
aan de linklijst in `src/pages/auth/AuthPage.tsx`.

**Lokaal draaien:** `npm run build:seo` (leest `.env.local` zelf in).

### Let op: de service worker

`public/sw.js` cachet bij elke navigatie de respons als app-shell. Zou dat ook
voor de statische pagina's gebeuren, dan serveert een koudstart van de PWA een
marketingpagina in plaats van de app. Daarom staan die paden in `STATIC_PAGES`
en laat de service worker ze ongemoeid. Bump `CACHE` (`horbit-vN`) bij elke
wijziging in `sw.js`.

## De app-kant

- `src/lib/seo.ts` — constanten, `absoluteUrl`, `pageTitle`, JSON-LD-bouwers.
- `src/components/Seo.tsx` — schrijft de `<head>`. Bewust imperatief: `index.html`
  levert al een volledige set tags, en die werken we bij in plaats van te
  verdubbelen. Twee `<title>`'s is erger dan geen.
- `src/lib/routeSeo.ts` — één tabel met titel, beschrijving en `noindex` per route.
- `src/components/RouteSeo.tsx` — staat vóór `<Routes>` in de boom, zodat een
  pagina die zelf een `<Seo>` rendert de waarden daarna overschrijft.
- `seo.config.json` — host, merknaam, standaardbeschrijving en OG-afbeelding.
  Gedeeld door de app en het generatiescript.

## Canonieke host

Alles hangt aan `https://www.h-orbit.nl`. De apex (`h-orbit.nl`) stuurt door met
een **307** — tijdelijk. Voor zoekmachines is een permanente **308** beter; dat
is een instelling in het Vercel-dashboard onder Domains, niet iets in deze repo.

## Na een deploy

1. Dien `https://www.h-orbit.nl/sitemap.xml` (opnieuw) in in Google Search
   Console — onder de **www**-property, niet de apex.
2. Controleer een provinciepagina met de Rich Results Test op `ItemList` en
   `BreadcrumbList`.
3. Vraag indexering aan voor `/voor-artiesten` en `/podia`; de rest volgt via de
   interne links.

## Wat hierna de meeste winst oplevert

1. **Publieke artiestenpagina's.** `profiles`, `tracks` en `albums` zijn nu al
   leesbaar voor anonieme bezoekers, dus technisch kan het meteen. Het is een
   product- en privacybesluit, geen technisch probleem: het betekent dat de
   profielen van je gebruikers in Google komen. Zet het pas aan als dat een
   bewuste keuze is, en geef gebruikers de mogelijkheid zich af te melden.
2. **Redactionele inhoud publiek maken.** `articles` en `tutorials` zijn nu leeg.
   Zodra daar inhoud in staat, is dat het sterkste materiaal om mee te ranken —
   mits die pagina's niet achter de login blijven.
3. **Stadspagina's onder `/podia`.** Nu per provincie; per stad (`/podia/utrecht/
   amersfoort`) sluit dichter aan op hoe mensen zoeken, zodra er meer locaties
   per stad zijn.
