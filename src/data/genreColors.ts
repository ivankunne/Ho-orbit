import { FALLBACK_GENRE_GROUPS, buildColorByLabel } from './genres';

// Base colour name → Tailwind utility classes for a genre chip/badge.
// These class strings are written out in full so Tailwind keeps them at build
// time. The genre catalog (DB or fallback) stores only the colour *name*; this
// is where the agency frontend owns the actual styling.
export interface GenreColor {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const COLOR_CLASSES: Record<string, GenreColor> = {
  purple:  { bg: 'bg-purple-500/20',  text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-500'  },
  violet:  { bg: 'bg-violet-500/20',  text: 'text-violet-400',  border: 'border-violet-500/30',  dot: 'bg-violet-500'  },
  fuchsia: { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', dot: 'bg-fuchsia-500' },
  pink:    { bg: 'bg-pink-500/20',    text: 'text-pink-400',    border: 'border-pink-500/30',    dot: 'bg-pink-500'    },
  rose:    { bg: 'bg-rose-500/20',    text: 'text-rose-400',    border: 'border-rose-500/30',    dot: 'bg-rose-500'    },
  red:     { bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500'     },
  orange:  { bg: 'bg-orange-500/20',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-500'  },
  amber:   { bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-500'   },
  yellow:  { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-500'  },
  lime:    { bg: 'bg-lime-500/20',    text: 'text-lime-400',    border: 'border-lime-500/30',    dot: 'bg-lime-500'    },
  green:   { bg: 'bg-green-500/20',   text: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-500'   },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  teal:    { bg: 'bg-teal-500/20',    text: 'text-teal-400',    border: 'border-teal-500/30',    dot: 'bg-teal-500'    },
  cyan:    { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-500'    },
  sky:     { bg: 'bg-sky-500/20',     text: 'text-sky-400',     border: 'border-sky-500/30',     dot: 'bg-sky-500'     },
  blue:    { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-500'    },
  indigo:  { bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  border: 'border-indigo-500/30',  dot: 'bg-indigo-500'  },
  slate:   { bg: 'bg-slate-500/20',   text: 'text-slate-400',   border: 'border-slate-500/30',   dot: 'bg-slate-500'   },
};

export const fallbackColor: GenreColor = COLOR_CLASSES.slate;

/** Resolve a base colour name to its classes (slate fallback for unknown). */
export function colorClassesByName(name?: string | null): GenreColor {
  return (name && COLOR_CLASSES[name]) || fallbackColor;
}

// Lowercased label → colour name, from the bundled fallback taxonomy. Used by
// the static getGenreColor(); the catalog-aware resolver lives in GenreContext.
const FALLBACK_COLOR_BY_LABEL = buildColorByLabel(FALLBACK_GENRE_GROUPS);

/**
 * Static colour lookup for a genre label. Tries an exact match, then a
 * substring match (handles values like "Hip-Hop / Trap"). Prefer
 * `useGenres().getGenreColor` in components so DB colours are honoured.
 */
export function getGenreColor(genre = ''): GenreColor {
  const lc = genre.toLowerCase();
  if (FALLBACK_COLOR_BY_LABEL[lc]) return colorClassesByName(FALLBACK_COLOR_BY_LABEL[lc]);
  for (const [label, color] of Object.entries(FALLBACK_COLOR_BY_LABEL)) {
    if (lc.includes(label)) return colorClassesByName(color);
  }
  return fallbackColor;
}
