import { matchPath } from 'react-router-dom';

export type RouteSeo = {
  title: string;
  description: string;
  /** Alles achter de login of de paywall hoort niet in de index. */
  noindex?: boolean;
};

/**
 * Eén tabel voor de <head> van elke app-route, zodat geen enkele pagina
 * terugvalt op de generieke sitetitel. Volgorde telt: de eerste match wint,
 * dus specifieke paden staan boven hun ouder.
 *
 * `noindex` volgt drie regels:
 *  - je eigen omgeving (bibliotheek, berichten, account, BandSpace) → nooit;
 *  - wat achter de paywall zit (evenementen, netwerken, venues) → nooit, want
 *    een crawler ziet daar alleen de upgrade-pagina;
 *  - pagina's waarvan de inhoudstabel nu nog leeg is (magazine, tutorials,
 *    forums, podcasts) → voorlopig niet, dunne pagina's helpen niet. Zet ze aan
 *    zodra er inhoud staat.
 *
 * De rest — muziek, artiesten, albums en de Nederlandse scene — staat sinds de
 * open homepage vrij toegankelijk en mag dus gewoon de index in. De statische
 * pagina's daarnaast komen uit scripts/generate-seo.mjs.
 */
const ROUTES: [string, RouteSeo][] = [
  ['/', {
    title: 'H-orbit — het platform voor Nederlandse muziek en beginnende artiesten',
    description:
      'Ontdek nieuwe Nederlandse artiesten en muziek, verken de scene en vind bandleden en optredens. Rondkijken kan zonder account.',
  }],
  // Samengevoegd met '/'; de redirect mag zelf niet in de index belanden.
  ['/muziek', {
    title: 'Nieuwe Nederlandse muziek ontdekken',
    description: 'Luister naar nieuwe nummers van Nederlandse artiesten, ontdek genres en stel je eigen bibliotheek samen.',
    noindex: true,
  }],
  ['/login', {
    title: 'Inloggen',
    description: 'Log in op je H-orbit-account en ga verder met je muziek, je band en je netwerk.',
    noindex: true,
  }],
  ['/signup', {
    title: 'Account aanmaken',
    description: 'Maak gratis een H-orbit-account aan, upload je eerste nummer en word gevonden door luisteraars en muzikanten in Nederland.',
    noindex: true,
  }],
  ['/wachtwoord-herstellen', {
    title: 'Wachtwoord herstellen',
    description: 'Stel een nieuw wachtwoord in voor je H-orbit-account.',
    noindex: true,
  }],

  /* ── Publiek toegankelijk ──────────────────────────────────────────── */
  ['/privacy', {
    title: 'Privacybeleid',
    description: 'Hoe H-orbit omgaat met je persoonsgegevens, cookies en je rechten onder de AVG.',
  }],
  ['/voorwaarden', {
    title: 'Algemene voorwaarden',
    description: 'De gebruiksvoorwaarden van H-orbit: je account, je muziek, je rechten en onze verplichtingen.',
  }],
  ['/cookies', {
    title: 'Cookiebeleid',
    description: 'Welke cookies H-orbit gebruikt, waarvoor ze dienen en hoe je je voorkeuren aanpast.',
  }],

  /* ── Achter de login ───────────────────────────────────────────────── */
  ['/artists/:slug', {
    title: 'Artiest',
    description: 'Beluister de muziek van deze Nederlandse artiest op H-orbit.',
  }],
  ['/artists', {
    title: 'Nederlandse artiesten ontdekken',
    description: 'Blader door beginnende en gevestigde Nederlandse artiesten, per genre en per stad. Rondkijken kan zonder account.',
  }],
  ['/albums/:id', {
    title: 'Album',
    description: 'Beluister dit album van een Nederlandse artiest op H-orbit.',
  }],
  ['/radio', {
    title: 'Radio — non-stop Nederlandse muziek',
    description: 'Luister naar de radiostations van H-orbit met muziek van Nederlandse artiesten.',
    noindex: true,
  }],
  ['/podcasts/:id', {
    title: 'Podcast',
    description: 'Luister naar deze podcast over de Nederlandse muziekscene.',
    noindex: true,
  }],
  ['/podcasts', {
    title: 'Podcasts over de Nederlandse muziekscene',
    description: 'Gesprekken, verhalen en advies uit de Nederlandse muziekwereld.',
    noindex: true,
  }],
  ['/events/:id', {
    title: 'Evenement',
    description: 'Details, datum en locatie van dit optreden in Nederland.',
    noindex: true,
  }],
  ['/events', {
    title: 'Optredens en festivals in Nederland',
    description: 'Vind shows, festivals en open podia in heel Nederland.',
    noindex: true,
  }],
  ['/magazine/:id', {
    title: 'Artikel',
    description: 'Een verhaal uit de Nederlandse muziekscene.',
    noindex: true,
  }],
  ['/magazine', {
    title: 'Magazine — verhalen uit de Nederlandse scene',
    description: 'Interviews, achtergronden en nieuws over Nederlandse artiesten en de scene waarin ze werken.',
    noindex: true,
  }],
  ['/tutorials/:id', {
    title: 'Tutorial',
    description: 'Praktische uitleg voor muzikanten die verder willen komen.',
    noindex: true,
  }],
  ['/tutorials', {
    title: 'Tutorials voor muzikanten',
    description: 'Leer opnemen, mixen, releasen en promoten — uitleg op maat voor beginnende artiesten.',
    noindex: true,
  }],
  ['/dutch-scene/locatie/:id', {
    title: 'Locatie in de Nederlandse muziekscene',
    description: 'Podium, oefenruimte of broedplaats in Nederland — adres, type en wat je er kunt doen.',
  }],
  ['/dutch-scene/:slug', {
    title: 'Scene',
    description: 'Verken deze hoek van de Nederlandse muziekscene.',
  }],
  ['/dutch-scene', {
    title: 'De Nederlandse muziekscene op de kaart',
    description: 'Podia, oefenruimtes en broedplaatsen door heel Nederland — per provincie en per stad.',
  }],
  ['/venue/:id', {
    title: 'Venue',
    description: 'Informatie over dit podium in Nederland.',
    noindex: true,
  }],
  ['/forums/thread/:threadId', {
    title: 'Forumtopic',
    description: 'Meepraten met muzikanten uit heel Nederland.',
    noindex: true,
  }],
  ['/forums', {
    title: 'Forums voor Nederlandse muzikanten',
    description: 'Stel je vraag, deel je werk en praat mee met andere muzikanten in Nederland.',
    noindex: true,
  }],
  ['/netwerken', {
    title: 'Netwerken — muzikanten en samenwerkingen vinden',
    description: 'Wanted, Jump on a Track en open calls: vind muzikanten om mee te werken.',
    noindex: true,
  }],
  ['/masterclass', {
    title: 'Masterclasses voor muzikanten',
    description: 'Verdiepende sessies van mensen die het vak al doen.',
    noindex: true,
  }],
  ['/drop-your-demo', {
    title: 'Drop your demo',
    description: 'Stuur je demo in en krijg hem gehoord.',
    noindex: true,
  }],
  ['/bandspace/join/:token', {
    title: 'Uitnodiging voor een band',
    description: 'Je bent uitgenodigd om je aan te sluiten bij een band op H-orbit.',
    noindex: true,
  }],
  ['/bandspace/:id', {
    title: 'BandSpace',
    description: 'De werkruimte van je band.',
    noindex: true,
  }],
  ['/bandspace', {
    title: 'BandSpace — de werkruimte voor je band',
    description: 'Repetities, opnames, setlists en riders op één plek voor je hele band.',
    noindex: true,
  }],
  ['/rider/:token', {
    title: 'Rider',
    description: 'De technische rider van deze band.',
    noindex: true,
  }],
  ['/upload', { title: 'Muziek uploaden', description: 'Upload je nummer of album naar H-orbit.', noindex: true }],
  ['/library/playlists/:id', { title: 'Afspeellijst', description: 'Je afspeellijst op H-orbit.', noindex: true }],
  ['/library', { title: 'Mijn bibliotheek', description: 'Je opgeslagen muziek, albums en afspeellijsten.', noindex: true }],
  ['/profiel/:username', { title: 'Profiel', description: 'Profiel op H-orbit.', noindex: true }],
  ['/profiel', { title: 'Mijn profiel', description: 'Je profiel op H-orbit.', noindex: true }],
  ['/account', { title: 'Accountinstellingen', description: 'Beheer je account, abonnement en voorkeuren.', noindex: true }],
  ['/berichten/:id', { title: 'Gesprek', description: 'Je berichten op H-orbit.', noindex: true }],
  ['/berichten', { title: 'Berichten', description: 'Je berichten op H-orbit.', noindex: true }],
  ['/admin', { title: 'Beheer', description: 'Beheerpaneel.', noindex: true }],
];

const NOT_FOUND: RouteSeo = {
  title: 'Pagina niet gevonden',
  description: 'Deze pagina bestaat niet (meer). Ga terug naar H-orbit en ontdek Nederlandse muziek.',
  noindex: true,
};

export function resolveRouteSeo(pathname: string): RouteSeo {
  for (const [pattern, seo] of ROUTES) {
    if (matchPath({ path: pattern, end: true }, pathname)) return seo;
  }
  return NOT_FOUND;
}
