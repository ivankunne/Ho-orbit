// Genre taxonomy for h-orbit.
//
// The canonical taxonomy lives in the database (see
// supabase/genre_catalog_migration.sql) and is loaded at runtime through
// GenreContext. The list below is the bundled FALLBACK: it seeds the DB and is
// used directly whenever the catalog tables are missing or unreachable, so the
// app always has a full, grouped genre list to render.
//
// Genres are grouped into big buckets; each main genre may have subgenres and a
// base colour name. The pure helpers and builder functions here work on ANY
// GenreGroup[], so the context can rebuild the derived structures (flat list,
// option groups, label/colour lookups) from the DB-loaded catalog.

export interface GenreNode {
  name: string;
  /** Base colour name (e.g. "purple") for main genres; subgenres inherit it. */
  color?: string;
  /** Optional subgenres, shown nested under the parent in selection menus. */
  sub?: string[];
}

export interface GenreGroup {
  label: string;
  genres: GenreNode[];
}

/** Bundled fallback taxonomy. Mirrors the seed in genre_catalog_migration.sql. */
export const FALLBACK_GENRE_GROUPS: GenreGroup[] = [
  {
    label: 'Pop, Hip-Hop & Urban',
    genres: [
      { name: 'Pop', color: 'amber' },
      { name: 'Hip-Hop', color: 'purple', sub: ['Boombap', 'Trap', 'Drill', 'Trip-Hop'] },
      { name: 'R&B', color: 'pink', sub: ['Contemporary R&B', 'Neo-Soul'] },
      { name: 'Amapiano', color: 'orange' },
      { name: 'Reggae', color: 'green' },
      { name: 'Dancehall', color: 'emerald' },
      { name: 'Afrobeats', color: 'orange' },
      { name: 'Grime', color: 'fuchsia' },
    ],
  },
  {
    label: 'Jazz, Blues & Soul',
    genres: [
      { name: 'Jazz', color: 'blue', sub: ['Traditionele Jazz', 'Bebop', 'Cool Jazz', 'Jazz Fusion'] },
      { name: 'Blues', color: 'sky', sub: ['Delta Blues', 'Chicago Blues', 'Blues Rock'] },
      { name: 'Soul', color: 'yellow' },
      { name: 'Funk', color: 'amber' },
      { name: 'Gospel', color: 'yellow' },
    ],
  },
  {
    label: 'Rock, Indie & Metal',
    genres: [
      { name: 'Classic Rock', color: 'red' },
      { name: 'Hard Rock', color: 'red' },
      { name: 'Indie', color: 'violet', sub: ['Indie Rock', 'Indie Pop'] },
      { name: 'Alternative Rock', color: 'rose' },
      { name: 'Punk Rock', color: 'red' },
      { name: 'Pop-Punk', color: 'rose' },
      { name: 'Post-Punk', color: 'violet' },
      { name: 'Metal', color: 'red', sub: ['Heavy Metal', 'Thrash Metal', 'Progressive Metal'] },
      { name: 'Grunge', color: 'orange' },
      { name: 'Ska', color: 'lime' },
    ],
  },
  {
    label: 'Elektronisch',
    genres: [
      { name: 'Techno', color: 'cyan', sub: ['Acid Techno', 'Peak Time Techno', 'Minimal Techno'] },
      { name: 'House', color: 'cyan', sub: ['Deep House', 'Tech House', 'Acid House'] },
      { name: 'Psytrance', color: 'fuchsia' },
      { name: 'Hardcore', color: 'rose', sub: ['Gabber', 'Happy Hardcore', 'Frenchcore'] },
      { name: 'Trance', color: 'sky', sub: ['Vocal Trance', 'Progressive Trance'] },
      { name: 'Drum & Bass', color: 'indigo', sub: ['Liquid Drum & Bass', 'Jump Up'] },
      { name: 'Dubstep', color: 'indigo' },
    ],
  },
  {
    label: 'Overig',
    genres: [
      { name: 'Oriental', color: 'teal' },
      { name: 'Eurodance', color: 'fuchsia' },
      { name: 'Medicine music', color: 'emerald' },
      { name: 'Adult contemporary', color: 'slate' },
      { name: 'Yacht music', color: 'sky' },
      { name: 'Vape wave', color: 'fuchsia' },
    ],
  },
];

/** @deprecated Prefer `useGenres().groups`; this is the static fallback. */
export const GENRE_GROUPS = FALLBACK_GENRE_GROUPS;

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

// ── Builders: derive structures from any GenreGroup[] ───────────────────────

/** Flat, ordered list of every genre and subgenre label. */
export function flattenGenres(groups: GenreGroup[]): string[] {
  return groups.flatMap(g => g.genres.flatMap(node => [node.name, ...(node.sub ?? [])]));
}

/** Flat `{ id, label }` options for chip-style selects that store ids. */
export function buildGenreOptions(groups: GenreGroup[]): GenreOption[] {
  return flattenGenres(groups).map(name => ({ id: genreId(name), label: name }));
}

/** Grouped `{ id, label }` options for grouped chip-style selectors. */
export function buildOptionGroups(groups: GenreGroup[]): { label: string; options: GenreOption[] }[] {
  return groups.map(group => ({
    label: group.label,
    options: group.genres.flatMap(node =>
      [node.name, ...(node.sub ?? [])].map(name => ({ id: genreId(name), label: name })),
    ),
  }));
}

/** Map of genre id → display label. */
export function buildLabelById(groups: GenreGroup[]): Record<string, string> {
  return Object.fromEntries(buildGenreOptions(groups).map(g => [g.id, g.label]));
}

/**
 * Map of lowercased genre/subgenre label → base colour name. Subgenres inherit
 * their parent genre's colour.
 */
export function buildColorByLabel(groups: GenreGroup[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const group of groups) {
    for (const node of group.genres) {
      if (node.color) {
        map[node.name.toLowerCase()] = node.color;
        for (const sub of node.sub ?? []) map[sub.toLowerCase()] = node.color;
      }
    }
  }
  return map;
}

// ── Static exports derived from the fallback taxonomy ───────────────────────

export const ALL_GENRES: string[] = flattenGenres(FALLBACK_GENRE_GROUPS);
export const GENRE_OPTIONS: GenreOption[] = buildGenreOptions(FALLBACK_GENRE_GROUPS);
export const GENRE_OPTION_GROUPS = buildOptionGroups(FALLBACK_GENRE_GROUPS);

const FALLBACK_LABEL_BY_ID = buildLabelById(FALLBACK_GENRE_GROUPS);

/** Resolve a stored genre id to its display label (falls back to the id). */
export function genreLabelById(id: string): string {
  return FALLBACK_LABEL_BY_ID[id] ?? id;
}

/**
 * Curated short list of main genres for discovery filter tab bars, where the
 * full taxonomy would be unusable. Consumers prepend their own "all" entry.
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
