#!/usr/bin/env node
/**
 * Genereert de publieke, indexeerbare laag van h-orbit na `vite build`.
 *
 * Waarom dit bestaat: de app is een client-side SPA waarvan vrijwel elke route
 * achter een login zit. Een crawler krijgt daar één leeg shell-document en een
 * inlogscherm te zien — er valt niets te indexeren. Deze stap schrijft echte,
 * statische HTML weg naar dist/, met volledige metadata en structured data.
 * Vercel serveert bestanden vóór rewrites, dus deze pagina's gaan langs de
 * SPA-catch-all heen en worden direct als HTML uitgeleverd.
 *
 * Uitvoer:
 *   dist/<slug>/index.html      redactionele pagina's (scripts/seo/content.mjs)
 *   dist/podia/index.html       overzicht van alle provincies
 *   dist/podia/<prov>/index.html  locaties per provincie, uit Supabase
 *   dist/sitemap.xml            alleen URL's die echt indexeerbaar zijn
 *   dist/robots.txt
 *
 * Faalt de databasefetch, dan worden de redactionele pagina's alsnog gebouwd:
 * een SEO-stap mag nooit een deploy tegenhouden.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES, PODIA_HUB, PROVINCE_COPY } from './seo/content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'seo.config.json'), 'utf8'));

/* Op Vercel staan de VITE_-variabelen al in process.env; lokaal draait dit
   script buiten Vite om, dus lezen we .env.local zelf even in. */
function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

loadLocalEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

/* ── helpers ─────────────────────────────────────────────────────────────── */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function slugify(input = '') {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Suffix nooit dubbel: "Over H-orbit | H-orbit" leest als spam. */
const withBrand = (title) =>
  title.toLowerCase().includes(SITE.siteName.toLowerCase()) ? title : `${title} | ${SITE.titleSuffix}`;

const url = (p = '/') => `${SITE.siteUrl}${p === '/' ? '/' : `/${String(p).replace(/^\/+|\/+$/g, '')}`}`;

function write(relPath, contents) {
  const full = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

/** Externe websites staan in de database zonder schema ("www.viadukt.nl"). */
function normalizeWebsite(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return { href, label: new URL(href).hostname.replace(/^www\./, '') };
  } catch {
    return null;
  }
}

/* ── template ────────────────────────────────────────────────────────────── */

const STYLES = `
:root{color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#1a1528;color:#cbd5e1;
  font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased}
a{color:#c4b5fd}
a:hover{color:#ddd6fe}
img{max-width:100%;height:auto}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.site{border-bottom:1px solid rgba(255,255,255,.08);padding-block:16px}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px}
header.site img{height:32px;width:auto}
.cta{display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600;
  padding:10px 18px;border-radius:12px;border:1px solid rgba(139,92,246,.5)}
.cta:hover{background:#8b5cf6;color:#fff}
nav.crumbs{font-size:13px;color:#9aa6bc;padding-block:18px 0}
nav.crumbs a{color:#9aa6bc}
main{padding-block:8px 48px}
h1{font-size:clamp(28px,5vw,40px);line-height:1.2;margin:14px 0 16px;color:#fff;letter-spacing:-.02em}
h2{font-size:clamp(20px,3.4vw,26px);line-height:1.3;margin:40px 0 12px;color:#fff;letter-spacing:-.01em}
h3{font-size:18px;margin:28px 0 6px;color:#fff}
.lead{font-size:18px;color:#e2e8f0}
ul{padding-left:22px}
li{margin:6px 0}
.card{background:#1e1833;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 20px;margin:14px 0}
.card h3{margin-top:0}
.meta{font-size:14px;color:#9aa6bc;margin:4px 0 0}
.grid{display:grid;gap:12px;grid-template-columns:1fr;margin:18px 0;padding:0;list-style:none}
@media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
.grid a{display:block;background:#1e1833;border:1px solid rgba(255,255,255,.08);border-radius:14px;
  padding:14px 16px;text-decoration:none;color:#e2e8f0;font-weight:600;min-width:0}
.grid a:hover{border-color:rgba(139,92,246,.5)}
.grid span{display:block;font-weight:400;font-size:14px;color:#9aa6bc;margin-top:2px}
.banner{background:linear-gradient(135deg,rgba(124,58,237,.25),rgba(236,72,153,.15));
  border:1px solid rgba(139,92,246,.35);border-radius:18px;padding:22px;margin:44px 0 8px}
.banner h2{margin-top:0}
footer.site{border-top:1px solid rgba(255,255,255,.08);padding-block:22px 40px;
  font-size:13px;color:#9aa6bc}
footer.site a{color:#9aa6bc}
footer.site ul{list-style:none;padding:0;margin:0 0 12px;display:flex;flex-wrap:wrap;gap:8px 16px}
`.replace(/\n\s*/g, '\n').trim();

function layout({ title, description, canonicalPath, h1, crumbs = [], body, jsonLd = [] }) {
  const canonical = url(canonicalPath);
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      inLanguage: 'nl-NL',
      isPartOf: { '@type': 'WebSite', name: SITE.siteName, url: url('/') },
      publisher: { '@type': 'Organization', name: SITE.siteName, url: url('/') },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [{ name: 'Home', path: '/' }, ...crumbs, { name: h1, path: canonicalPath }].map(
        (c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: url(c.path) }),
      ),
    },
    ...jsonLd,
  ];

  const crumbHtml = [{ name: 'Home', path: '/' }, ...crumbs]
    .map((c) => `<a href="${url(c.path)}">${esc(c.name)}</a>`)
    .join(' <span aria-hidden="true">›</span> ');

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="nl-nl" href="${canonical}">
<link rel="alternate" hreflang="x-default" href="${canonical}">
<meta name="theme-color" content="#1a1528">
<link rel="icon" type="image/png" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(SITE.siteName)}">
<meta property="og:locale" content="nl_NL">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${url(SITE.defaultImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${url(SITE.defaultImage)}">
<style>${STYLES}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="site">
  <div class="wrap">
    <a href="/" aria-label="H-orbit — naar de homepage"><img src="/H-orbit-logo-email.png" width="35" height="32" alt="H-orbit"></a>
    <a class="cta" href="/signup">Gratis account</a>
  </div>
</header>
<div class="wrap">
  <nav class="crumbs" aria-label="Kruimelpad">${crumbHtml}</nav>
  <main>
    <h1>${esc(h1)}</h1>
${body}
    <section class="banner">
      <h2>Aan de slag op H-orbit</h2>
      <p>Upload je muziek, vind bandleden en optredens en ontdek wat er in de Nederlandse scene gebeurt. Een account aanmaken is gratis.</p>
      <p><a class="cta" href="/signup">Maak een gratis account</a></p>
    </section>
  </main>
</div>
<footer class="site">
  <div class="wrap">
    <ul>
      <li><a href="/voor-artiesten">Voor artiesten</a></li>
      <li><a href="/muziek-uploaden">Muziek uploaden</a></li>
      <li><a href="/bandleden-vinden">Bandleden vinden</a></li>
      <li><a href="/optredens-vinden">Optredens vinden</a></li>
      <li><a href="/muziek-promoten">Muziek promoten</a></li>
      <li><a href="/podia">Podia in Nederland</a></li>
      <li><a href="/veelgestelde-vragen">Veelgestelde vragen</a></li>
      <li><a href="/over-h-orbit">Over H-orbit</a></li>
    </ul>
    <ul>
      <li><a href="/privacy">Privacybeleid</a></li>
      <li><a href="/voorwaarden">Voorwaarden</a></li>
      <li><a href="/cookies">Cookies</a></li>
      <li><a href="mailto:${esc(SITE.contactEmail)}">${esc(SITE.contactEmail)}</a></li>
    </ul>
    <p>© ${new Date().getFullYear()} H-orbit. Nederlands muziekplatform voor artiesten en de mensen om hen heen.</p>
  </div>
</footer>
</body>
</html>
`;
}

const faqBlock = (faq) =>
  !faq?.length
    ? ''
    : `    <h2>Veelgestelde vragen</h2>\n` +
      faq
        .map((f) => `    <div class="card"><h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p></div>`)
        .join('\n');

const relatedBlock = (slugs, index) => {
  const items = (slugs || []).map((s) => index[s]).filter(Boolean);
  if (!items.length) return '';
  return (
    `    <h2>Verder lezen</h2>\n    <ul class="grid">\n` +
    items
      .map(
        (p) =>
          `      <li><a href="/${p.slug}">${esc(p.h1)}<span>${esc(p.description.split('.')[0])}.</span></a></li>`,
      )
      .join('\n') +
    `\n    </ul>`
  );
};

/* ── redactionele pagina's ───────────────────────────────────────────────── */

function buildEditorialPages() {
  const index = Object.fromEntries([...PAGES, PODIA_HUB].map((p) => [p.slug, p]));

  for (const page of PAGES) {
    const sections = (page.sections || [])
      .map((s) => {
        const paras = (s.body || []).map((p) => `    <p>${esc(p)}</p>`).join('\n');
        const list = s.list?.length
          ? `    <ul>\n${s.list.map((li) => `      <li>${esc(li)}</li>`).join('\n')}\n    </ul>`
          : '';
        return `    <h2>${esc(s.heading)}</h2>\n${paras}${list ? `\n${list}` : ''}`;
      })
      .join('\n');

    const body = [
      `    <p class="lead">${esc(page.intro)}</p>`,
      sections,
      faqBlock(page.faq),
      relatedBlock(page.related, index),
    ]
      .filter(Boolean)
      .join('\n');

    const jsonLd = page.faq?.length
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: page.faq.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ]
      : [];

    write(
      `${page.slug}/index.html`,
      layout({
        title: withBrand(page.title),
        description: page.description,
        canonicalPath: `/${page.slug}`,
        h1: page.h1,
        body,
        jsonLd,
      }),
    );
  }

  return PAGES.map((p) => `/${p.slug}`);
}

/* ── podia: hub + provinciepagina's uit de database ──────────────────────── */

async function fetchLocations() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[seo] Geen Supabase-credentials — podia-pagina\'s worden overgeslagen.');
    return [];
  }
  const endpoint =
    `${SUPABASE_URL}/rest/v1/scene_locations` +
    `?select=id,name,city,province,type,address,website,notes,description&order=province.asc,city.asc,name.asc&limit=2000`;
  try {
    const res = await fetch(endpoint, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows.filter((r) => r?.name && r?.province) : [];
  } catch (err) {
    console.warn(`[seo] Locaties ophalen mislukt (${err.message}) — podia-pagina's worden overgeslagen.`);
    return [];
  }
}

/** Artiestenpagina's draaien in de SPA, maar staan sinds de open homepage vrij
 *  toegankelijk — dus horen ze in de sitemap, zodat Google ze überhaupt vindt. */
async function fetchArtists() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/artists?select=slug,id&order=created_at.desc&limit=2000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map((r) => r.slug || r.id).filter(Boolean) : [];
  } catch (err) {
    console.warn(`[seo] Artiesten ophalen mislukt (${err.message}) — niet in de sitemap.`);
    return [];
  }
}

function buildPodiaPages(locations) {
  if (!locations.length) return [];

  const byProvince = new Map();
  for (const loc of locations) {
    const key = loc.province.trim();
    if (!byProvince.has(key)) byProvince.set(key, []);
    byProvince.get(key).push(loc);
  }

  const provinces = [...byProvince.entries()]
    .map(([name, rows]) => ({ name, slug: slugify(name), rows }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'));

  /* Hub */
  const hubBody = [
    `    <p class="lead">${esc(PODIA_HUB.intro)}</p>`,
    `    <h2>Kies een provincie</h2>`,
    `    <ul class="grid">`,
    ...provinces.map(
      (p) =>
        `      <li><a href="/podia/${p.slug}">${esc(p.name)}<span>${p.rows.length} ${
          p.rows.length === 1 ? 'locatie' : 'locaties'
        }</span></a></li>`,
    ),
    `    </ul>`,
    `    <h2>Wat je hier vindt</h2>`,
    `    <p>Het overzicht bevat poppodia en zalen waar regelmatig live muziek staat, maar ook dorpshuizen, cultuurcentra, erfgoedlocaties en broedplaatsen. Die laatste categorie wordt door beginnende artiesten vaak overgeslagen, terwijl daar juist ruimte is voor een eerste optreden, een try-out of een open podium.</p>`,
    `    <p>Per locatie staan de plaats, het type en — waar bekend — het adres en de eigen website, zodat je rechtstreeks contact kunt opnemen met de programmeur. Lees ook hoe je <a href="/optredens-vinden">je eerste optredens regelt</a>.</p>`,
  ].join('\n');

  write(
    'podia/index.html',
    layout({
      title: withBrand(PODIA_HUB.title),
      description: PODIA_HUB.description,
      canonicalPath: '/podia',
      h1: PODIA_HUB.h1,
      body: hubBody,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: PODIA_HUB.h1,
          numberOfItems: provinces.length,
          itemListElement: provinces.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.name,
            url: url(`/podia/${p.slug}`),
          })),
        },
      ],
    }),
  );

  /* Provincies */
  for (const province of provinces) {
    const cities = [...new Set(province.rows.map((r) => (r.city || '').trim()).filter(Boolean))];
    const cityList = cities.slice().sort((a, b) => a.localeCompare(b, 'nl'));

    const cards = province.rows
      .map((loc) => {
        const site = normalizeWebsite(loc.website);
        const facts = [loc.city, loc.type].filter(Boolean).map(esc).join(' · ');
        const lines = [
          `      <h3>${esc(loc.name)}</h3>`,
          facts ? `      <p class="meta">${facts}</p>` : '',
          loc.address ? `      <p class="meta">${esc(loc.address)}</p>` : '',
          loc.description ? `      <p>${esc(loc.description)}</p>` : '',
          loc.notes ? `      <p class="meta">${esc(loc.notes)}</p>` : '',
          site
            ? `      <p class="meta"><a href="${esc(site.href)}" rel="nofollow noopener" target="_blank">${esc(site.label)}</a></p>`
            : '',
        ].filter(Boolean);
        return `    <div class="card">\n${lines.join('\n')}\n    </div>`;
      })
      .join('\n');

    const body = [
      `    <p class="lead">${esc(PROVINCE_COPY.intro(province.name, province.rows.length, cityList.length))}</p>`,
      `    <p>Zoek je een plek voor een eerste optreden, een open podium of een repetitie? Neem rechtstreeks contact op met de locatie — de meeste kleinere podia programmeren zelf en reageren sneller dan je verwacht. Hoe je zo'n aanvraag opstelt, staat op <a href="/optredens-vinden">optredens vinden</a>.</p>`,
      cityList.length > 1
        ? `    <h2>Plaatsen in ${esc(province.name)}</h2>\n    <p>${cityList.map(esc).join(' · ')}</p>`
        : '',
      `    <h2>Locaties in ${esc(province.name)}</h2>`,
      cards,
      `    <h2>Andere provincies</h2>`,
      `    <ul class="grid">`,
      ...provinces
        .filter((p) => p.slug !== province.slug)
        .map((p) => `      <li><a href="/podia/${p.slug}">${esc(p.name)}<span>${p.rows.length} locaties</span></a></li>`),
      `    </ul>`,
    ]
      .filter(Boolean)
      .join('\n');

    write(
      `podia/${province.slug}/index.html`,
      layout({
        title: withBrand(`Podia, oefenruimtes en zalen in ${province.name}`),
        description: `${province.rows.length} podia, dorpshuizen, cultuurcentra en broedplaatsen in ${province.name} waar live muziek wordt geprogrammeerd — met plaats, type en contactgegevens.`,
        canonicalPath: `/podia/${province.slug}`,
        h1: `Podia en oefenruimtes in ${province.name}`,
        crumbs: [{ name: 'Podia in Nederland', path: '/podia' }],
        body,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `Podia en oefenruimtes in ${province.name}`,
            numberOfItems: province.rows.length,
            itemListElement: province.rows.map((loc, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'MusicVenue',
                name: loc.name,
                ...(normalizeWebsite(loc.website) ? { url: normalizeWebsite(loc.website).href } : {}),
                address: {
                  '@type': 'PostalAddress',
                  ...(loc.address ? { streetAddress: loc.address } : {}),
                  ...(loc.city ? { addressLocality: loc.city } : {}),
                  addressRegion: province.name,
                  addressCountry: 'NL',
                },
              },
            })),
          },
        ],
      }),
    );
  }

  return ['/podia', ...provinces.map((p) => `/podia/${p.slug}`)];
}

/* ── sitemap + robots ────────────────────────────────────────────────────── */

/** Alleen paden die een crawler echt kan indexeren. Sinds de open homepage zijn
 *  dat ook de app-routes die zonder account te bekijken zijn — de rest (je eigen
 *  omgeving, alles achter de paywall, en pagina's waarvan de tabel nog leeg is)
 *  blijft er bewust buiten. Houd dit gelijk aan `noindex` in src/lib/routeSeo.ts. */
const PUBLIC_APP_ROUTES = [
  '/',
  '/artists',
  '/dutch-scene',
  '/privacy',
  '/voorwaarden',
  '/cookies',
];

function buildSitemap(paths) {
  const today = new Date().toISOString().slice(0, 10);
  const priority = (p) => (p === '/' ? '1.0' : p.split('/').length <= 2 ? '0.8' : '0.6');
  const changefreq = (p) => (p === '/' ? 'daily' : p.startsWith('/podia') ? 'monthly' : 'monthly');

  const body = paths
    .map(
      (p) =>
        `  <url>\n    <loc>${url(p)}</loc>\n    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${changefreq(p)}</changefreq>\n    <priority>${priority(p)}</priority>\n  </url>`,
    )
    .join('\n');

  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}

function buildRobots() {
  write(
    'robots.txt',
    `# h-orbit — gegenereerd door scripts/generate-seo.mjs
User-agent: *
Allow: /

# Je eigen omgeving: zonder account valt hier niets te zien, dus ook niets
# te indexeren. Niet crawlen scheelt crawl budget en duplicate content.
Disallow: /login
Disallow: /signup
Disallow: /wachtwoord-herstellen
Disallow: /account
Disallow: /profiel
Disallow: /berichten
Disallow: /library
Disallow: /upload
Disallow: /bandspace
Disallow: /rider
Disallow: /admin

# Achter de paywall: een crawler ziet hier alleen de upgrade-pagina.
Disallow: /events
Disallow: /netwerken
Disallow: /venue

# Wel vrij te bekijken, maar de inhoudstabel is nog leeg — dunne pagina's
# helpen niets. Haal deze regels weg zodra er inhoud staat.
Disallow: /magazine
Disallow: /tutorials
Disallow: /forums
Disallow: /podcasts
Disallow: /masterclass
Disallow: /drop-your-demo

# Intern — huisstijlgids
Disallow: /huisstijl.html

Sitemap: ${url('/sitemap.xml')}
`,
  );
}

/* ── main ────────────────────────────────────────────────────────────────── */

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error('[seo] dist/ bestaat niet — draai eerst `vite build`.');
    process.exit(1);
  }

  const editorial = buildEditorialPages();
  const [locations, artists] = await Promise.all([fetchLocations(), fetchArtists()]);
  const podia = buildPodiaPages(locations);
  const artistPaths = artists.map((slug) => `/artists/${slug}`);

  const paths = [...PUBLIC_APP_ROUTES, ...editorial, ...podia, ...artistPaths];
  buildSitemap(paths);
  buildRobots();

  console.log(
    `[seo] ${editorial.length} redactionele pagina's, ${podia.length ? podia.length - 1 : 0} provinciepagina's ` +
      `(${locations.length} locaties), ${artistPaths.length} artiesten, sitemap met ${paths.length} URL's.`,
  );
}

main().catch((err) => {
  console.error('[seo] Genereren mislukt:', err);
  process.exit(1);
});
