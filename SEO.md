# SEO — h-orbit

Hoe de vindbaarheid van h-orbit in elkaar zit, wat er bewust wél en niet
geïndexeerd wordt, en wat je moet aanraken als je iets wilt veranderen.

---

## Twee lagen

**1. De app zelf staat sinds september 2026 open.** Rondkijken kan zonder
account: de homepage, artiesten, albums, de Nederlandse scene, radio, forums en
de agenda zijn vrij te bekijken. Pas bij een hándeling — afspelen, liken,
volgen, reageren, uploaden — verschijnt het inlogvenster. Die grens zit in
`src/hooks/useRequireAuth.ts` en wordt centraal afgedwongen in `PlayerContext`,
`RadioContext`, `PodcastContext` en `AppStateContext`, niet bij elke losse knop.

Alleen je eigen omgeving (bibliotheek, berichten, account, uploads, BandSpace)
zit nog achter `ProtectedRoute`: daar valt zonder account niets te zien.

Gevolg voor SEO: muziek-, artiesten-, album- en scenepagina's kunnen nu echt
geïndexeerd worden. Het blijft client-side gerenderd, dus Google moet er
JavaScript voor draaien — trager en minder betrouwbaar dan server-rendering,
maar het wérkt, wat daarvoor niet zo was.

**2. Daarnaast staat er een statische laag** die geen JavaScript nodig heeft.
Die is er voor de zoekopdrachten waar nog geen pagina in de app bij past
("poppodium Groningen", "bandleden vinden"), en is sowieso robuuster dan een
SPA-pagina.

## Wat wel en niet de index in mag

`noindex` volgt drie regels (zie `src/lib/routeSeo.ts`, en houd
`robots.txt` in `scripts/generate-seo.mjs` daaraan gelijk):

- **je eigen omgeving** — nooit indexeren;
- **achter de paywall** (`/events`, `/netwerken`, `/venue`) — nooit, een crawler
  ziet daar alleen de upgrade-pagina;
- **lege inhoudstabellen** (`/magazine`, `/tutorials`, `/forums`, `/podcasts`,
  `/masterclass`) — voorlopig niet; dunne pagina's helpen niet. Haal ze uit
  `robots.txt` en zet `noindex` uit zodra er inhoud staat.

Artiestenpagina's krijgen hun eigen titel, omschrijving en `MusicGroup`-markup
(`ArtistDetailPage`), albums `MusicAlbum` (`AlbumDetailPage`). Ze staan ook in
de sitemap, opgehaald uit de `artists`-tabel.

**De paywall werkt dezelfde kant op.** Ook daar geldt: kijken mag, dóén niet.
`/events`, `/netwerken` en `/venue/:id` zijn gewoon te bekijken; je aanmelden,
een oproep plaatsen of contactgegevens inzien vraagt Pro (`useRequirePlan` →
`UpgradeModal`). Dat is bewust zo: anders zouden het blok "Maak connecties" op
de startpagina en de evenemententab op een artiestenpagina leeglopen zodra de
schakelaar omgaat — uitgerekend op de twee pagina's die een nieuwe bezoeker
als eerste ziet.

Aan de databasekant hoort daar `paywall_browse_gate_migration.sql` bij: lezen
open, schrijven dicht, en `contact_info` bij een netwerkoproep alleen zichtbaar
met Pro (via de view `networking_posts_public`). **Die migratie moet nog
handmatig gedraaid worden.** Zolang dat niet is gebeurd valt de frontend terug
op de tabel — dat werkt, maar levert één 404 in de console op en de
contactgegevens zijn dan nog niet afgeschermd.

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
- `src/hooks/useRequireAuth.ts` — de grens tussen kijken en meedoen.
- `src/components/AuthPrompt.tsx` — staat waar anders een invoerveld zou staan.
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

1. **Inhoud.** `articles`, `tutorials`, `forum_threads` en `podcasts` zijn leeg.
   Die pagina's staan al open en zijn al ingericht; ze wachten alleen op tekst.
   Dat is verreweg het sterkste materiaal om mee te ranken.
2. **Gebruikersprofielen (`/profiel/:username`).** Bewust nog achter de login:
   artiestenpagina's zijn een etalage, persoonlijke profielen niet. Openzetten
   betekent dat de profielen van je leden in Google komen — een keuze om bewust
   te maken, liefst met een opt-out voor je gebruikers.
3. **Stadspagina's onder `/podia`.** Nu per provincie; per stad
   (`/podia/utrecht/amersfoort`) sluit dichter aan op hoe mensen zoeken, zodra
   er meer locaties per stad zijn.
4. **Prerendering van de app-routes.** Artiestenpagina's zijn nu afhankelijk van
   Google's JavaScript-rendering. Wil je dat robuuster, dan is een prerender-stap
   voor `/artists/*` de volgende stap.
