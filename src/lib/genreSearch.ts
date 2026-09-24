import type { GenreGroup } from '@data/genres';

/**
 * Herkent een genre in een zoekterm en breidt het uit tot alles wat erbij
 * hoort.
 *
 * - Schrijfwijzen maken niet uit: "hip hop", "hiphop" en "Hip-Hop" zijn
 *   hetzelfde. Genres staan als label in de database ("Hip-Hop"), dus een
 *   gewone tekstmatch op "hip hop" vond niets.
 * - Een hoofdgenre neemt zijn subgenres mee: "hip hop" vindt ook Boombap, Trap,
 *   Drill en Trip-Hop.
 * - Een genrefamilie neemt alles eronder mee: "elektronisch" vindt Techno,
 *   House, Dubstep…
 *
 * Werkt op de catalogus uit GenreContext (database, of de meegeleverde
 * fallback), dus nieuwe genres doen vanzelf mee.
 */

export interface GenreMatch {
  /** Wat er herkend is, voor de kop in de zoekresultaten. */
  label: string;
  kind: 'genre' | 'group';
  /** Alle genrelabels waarop gezocht wordt (incl. subgenres). */
  labels: string[];
}

/** "Hip-Hop" → "hiphop", "R&B" → "rb", "Électro" → "electro". */
export function normalizeGenre(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

// Gangbare schrijfwijzen die niet vanzelf op het label uitkomen.
const ALIASES: Record<string, string> = {
  rnb: 'rb',
  randb: 'rb',
  dnb: 'drumbass',
  drumandbass: 'drumbass',
  drumnbass: 'drumbass',
  hiphoprap: 'hiphop',
  nederhop: 'hiphop',
  electronic: 'elektronisch',
  electronica: 'elektronisch',
  elektronica: 'elektronisch',
};

export function resolveGenreQuery(query: string, groups: GenreGroup[]): GenreMatch | null {
  let q = normalizeGenre(query);
  q = ALIASES[q] ?? q;
  // Te kort om betrouwbaar een genre te zijn ("r", "po"), behalve het
  // bekende "rb".
  if (q.length < 3 && q !== 'rb') return null;

  // 1. Precies een genre (hoofd- of subgenre).
  for (const group of groups) {
    for (const g of group.genres) {
      if (normalizeGenre(g.name) === q) {
        return { label: g.name, kind: 'genre', labels: [g.name, ...(g.sub ?? [])] };
      }
      const sub = (g.sub ?? []).find(s => normalizeGenre(s) === q);
      if (sub) return { label: sub, kind: 'genre', labels: [sub] };
    }
  }

  // 2. Een genrefamilie ("Elektronisch", of het eerste woord van
  //    "Rock, Indie & Metal" als dat geen losse genrenaam is).
  for (const group of groups) {
    const whole = normalizeGenre(group.label);
    if (whole === q || whole.startsWith(q) && q.length >= 5) {
      const labels = group.genres.flatMap(g => [g.name, ...(g.sub ?? [])]);
      return { label: group.label, kind: 'group', labels };
    }
  }

  // 3. Tijdens het typen: het begin van een genrenaam ("count" → Country).
  //    Alleen bij één eenduidige treffer, anders is het giswerk.
  if (q.length >= 4) {
    const hits: GenreMatch[] = [];
    for (const group of groups) {
      for (const g of group.genres) {
        if (normalizeGenre(g.name).startsWith(q)) hits.push({ label: g.name, kind: 'genre', labels: [g.name, ...(g.sub ?? [])] });
      }
    }
    if (hits.length === 1) return hits[0];
  }

  return null;
}
