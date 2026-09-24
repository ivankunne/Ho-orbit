/**
 * Maakt van een Supabase-opslag-URL een verkleinde versie in het juiste
 * formaat.
 *
 * Waarom: gebruikers uploaden hun avatars en hoezen rechtstreeks van hun
 * telefoon. Eén hoes op de homepage was een PNG van 20 MB, getoond op 150 px;
 * de homepage haalde in totaal 85 MB aan afbeeldingen binnen. Via het
 * render-endpoint van Supabase Storage wordt dezelfde hoes op 320 px een WebP
 * van 37 KB — de browser krijgt WebP of AVIF automatisch als hij dat aangeeft.
 *
 * Alles wat geen Supabase-opslag-URL is (placeholders, data:, blob:,
 * externe links) komt ongewijzigd terug, dus dit is overal veilig om te
 * gebruiken.
 */

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

// Het endpoint zet een GIF om naar een stilstaand beeld en een SVG kan het
// niet verwerken: die laten we zoals ze zijn.
const PASSTHROUGH = /\.(gif|svg)(\?|$)/i;

// Afronden op een paar vaste breedtes: elke unieke combinatie is een aparte
// transformatie (en een aparte cache-entry). Honderd net-verschillende
// breedtes voor hetzelfde beeld zou de CDN-cache nutteloos maken.
const STEPS = [64, 96, 128, 160, 240, 320, 480, 640, 960, 1280, 1920];

function step(px: number): number {
  return STEPS.find(s => s >= px) ?? STEPS[STEPS.length - 1];
}

export interface ImageOptions {
  /** Weergavebreedte in CSS-pixels. Wordt ×2 gedaan voor retina-schermen. */
  width: number;
  /** Alleen meegeven voor een vast vierkant/uitsnede (avatars). */
  height?: number;
  quality?: number;
}

export function optimizedImage(url: string | null | undefined, opts: ImageOptions | number): string | undefined {
  // Geen lege string teruggeven: <img src=""> geeft in React 19 een
  // consolefout, terwijl undefined het attribuut gewoon weglaat.
  if (!url) return undefined;
  const { width, height, quality = 72 } = typeof opts === 'number' ? { width: opts } : opts;

  const at = url.indexOf(OBJECT_PATH);
  if (at === -1 || PASSTHROUGH.test(url)) return url;

  const dpr = 2;
  const [path, query = ''] = url.slice(at + OBJECT_PATH.length).split('?');
  // Eventuele bestaande parameters (bv. een cache-buster) blijven staan.
  const params = new URLSearchParams(query);
  params.set('width', String(step(width * dpr)));
  if (height) {
    // Vaste uitsnede (avatars): vullen en bijsnijden is hier juist de bedoeling.
    params.set('height', String(step(height * dpr)));
    params.set('resize', 'cover');
  } else {
    // Alleen een breedte: 'contain' is verplicht. De standaard is 'cover', en
    // zonder height neemt Supabase dan de óriginele hoogte — een vierkante hoes
    // van 2160 px werd zo een strook van 480×2160 uit het midden, die de pagina
    // daarna uitrekte tot een extreem ingezoomd beeld. 'contain' past binnen
    // breedte × originele hoogte, en omdat die hoogte nooit de beperkende is,
    // blijft de verhouding altijd behouden (en wordt er nooit vergroot).
    params.set('resize', 'contain');
  }
  params.set('quality', String(quality));

  return `${url.slice(0, at)}${RENDER_PATH}${path}?${params.toString()}`;
}
