// Central source of truth for music genres across h-orbit.
//
// Everywhere that lists genres — upload, signup, onboarding, account, networking,
// band space, discovery filters — imports from here so the taxonomy stays in sync.
// Genres are grouped for selection menus; a curated short list drives filter tabs.

export interface GenreNode {
  name: string;
  /** Optional subgenres, shown indented under the parent in selection menus. */
  sub?: string[];
}

export interface GenreGroup {
  label: string;
  genres: GenreNode[];
}

export const GENRE_GROUPS: GenreGroup[] = [
  {
    label: 'Pop, Hip-Hop & Urban',
    genres: [
      { name: 'Pop' },
      { name: 'Hip-Hop', sub: ['Boombap', 'Trap', 'Drill', 'Trip-Hop'] },
      { name: 'R&B', sub: ['Contemporary R&B', 'Neo-Soul'] },
      { name: 'Amapiano' },
      { name: 'Reggae' },
      { name: 'Dancehall' },
      { name: 'Afrobeats' },
      { name: 'Grime' },
    ],
  },
  {
    label: 'Jazz, Blues & Soul',
    genres: [
      { name: 'Jazz', sub: ['Traditionele Jazz', 'Bebop', 'Cool Jazz', 'Jazz Fusion'] },
      { name: 'Blues', sub: ['Delta Blues', 'Chicago Blues', 'Blues Rock'] },
      { name: 'Soul' },
      { name: 'Funk' },
      { name: 'Gospel' },
    ],
  },
  {
    label: 'Rock, Indie & Metal',
    genres: [
      { name: 'Classic Rock' },
      { name: 'Hard Rock' },
      { name: 'Indie', sub: ['Indie Rock', 'Indie Pop'] },
      { name: 'Alternative Rock' },
      { name: 'Punk Rock' },
      { name: 'Pop-Punk' },
      { name: 'Post-Punk' },
      { name: 'Metal', sub: ['Heavy Metal', 'Thrash Metal', 'Progressive Metal'] },
      { name: 'Grunge' },
      { name: 'Ska' },
    ],
  },
  {
    label: 'Elektronisch',
    genres: [
      { name: 'Techno', sub: ['Acid Techno', 'Peak Time Techno', 'Minimal Techno'] },
      { name: 'House', sub: ['Deep House', 'Tech House', 'Acid House'] },
      { name: 'Psytrance' },
      { name: 'Hardcore', sub: ['Gabber', 'Happy Hardcore', 'Frenchcore'] },
      { name: 'Trance', sub: ['Vocal Trance', 'Progressive Trance'] },
      { name: 'Drum & Bass', sub: ['Liquid Drum & Bass', 'Jump Up'] },
      { name: 'Dubstep' },
    ],
  },
  {
    label: 'Overig',
    genres: [
      { name: 'Oriental' },
      { name: 'Eurodance' },
      { name: 'Medicine music' },
      { name: 'Adult contemporary' },
      { name: 'Yacht music' },
      { name: 'Vape wave' },
    ],
  },
];

/** Flat, ordered list of every genre and subgenre label. */
export const ALL_GENRES: string[] = GENRE_GROUPS.flatMap(g =>
  g.genres.flatMap(node => [node.name, ...(node.sub ?? [])]),
);

/** Stable, URL/storage-safe id for a genre label (e.g. "R&B" → "r-b"). */
export function genreId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface GenreOption {
  id: string;
  label: string;
}

/** Flat `{ id, label }` options for chip-style multi-selects that store ids. */
export const GENRE_OPTIONS: GenreOption[] = ALL_GENRES.map(name => ({
  id: genreId(name),
  label: name,
}));

const GENRE_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  GENRE_OPTIONS.map(g => [g.id, g.label]),
);

/** Resolve a stored genre id to its display label (falls back to the id itself). */
export function genreLabelById(id: string): string {
  return GENRE_LABEL_BY_ID[id] ?? id;
}

/** Grouped `{ id, label }` options for grouped chip-style selectors. */
export const GENRE_OPTION_GROUPS: { label: string; options: GenreOption[] }[] =
  GENRE_GROUPS.map(group => ({
    label: group.label,
    options: group.genres.flatMap(node =>
      [node.name, ...(node.sub ?? [])].map(name => ({ id: genreId(name), label: name })),
    ),
  }));

/**
 * Curated short list of the main genres used for discovery filter tab bars,
 * where the full ~100-entry taxonomy would be unusable. Consumers prepend their
 * own "all" entry (e.g. "Alles"/"Alle").
 */
export const FILTER_GENRES: string[] = [
  'Pop',
  'Hip-Hop',
  'R&B',
  'Afrobeats',
  'Jazz',
  'Soul',
  'Blues',
  'Rock',
  'Indie',
  'Metal',
  'Techno',
  'House',
  'Drum & Bass',
  'Reggae',
];
