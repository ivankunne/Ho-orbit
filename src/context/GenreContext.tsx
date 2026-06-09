import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FALLBACK_GENRE_GROUPS,
  FILTER_GENRES,
  buildGenreOptions,
  buildOptionGroups,
  buildLabelById,
  buildColorByLabel,
  type GenreGroup,
  type GenreOption,
} from '@data/genres';
import { colorClassesByName, getGenreColor as staticGenreColor, type GenreColor } from '@data/genreColors';
import { fetchGenreCatalog } from '@services/genreService';

interface GenreContextValue {
  /** The grouped taxonomy (DB catalog, or bundled fallback until/if it loads). */
  groups: GenreGroup[];
  /** Flat `{ id, label }` options across all groups. */
  options: GenreOption[];
  /** Grouped `{ id, label }` options for grouped chip selectors. */
  optionGroups: { label: string; options: GenreOption[] }[];
  /** Curated short list of main genres for filter tab bars. */
  filterGenres: string[];
  /** Resolve a stored genre id to its display label. */
  labelById: (id: string) => string;
  /** Resolve a genre label to its chip colour classes (DB colour aware). */
  getGenreColor: (genre?: string) => GenreColor;
  /** True while the DB catalog is still loading (fallback is shown meanwhile). */
  loading: boolean;
}

const GenreContext = createContext<GenreContextValue | null>(null);

export function GenreProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<GenreGroup[]>(FALLBACK_GENRE_GROUPS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchGenreCatalog()
      .then(catalog => {
        if (active && catalog?.length) setGroups(catalog);
      })
      .catch(err => console.warn('Genre catalog load error:', err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo<GenreContextValue>(() => {
    const labelMap = buildLabelById(groups);
    const colorMap = buildColorByLabel(groups);
    return {
      groups,
      options: buildGenreOptions(groups),
      optionGroups: buildOptionGroups(groups),
      filterGenres: FILTER_GENRES,
      labelById: (id: string) => labelMap[id] ?? id,
      getGenreColor: (genre = '') => {
        const lc = genre.toLowerCase();
        if (colorMap[lc]) return colorClassesByName(colorMap[lc]);
        for (const [label, color] of Object.entries(colorMap)) {
          if (lc.includes(label)) return colorClassesByName(color);
        }
        return staticGenreColor(genre);
      },
      loading,
    };
  }, [groups, loading]);

  return <GenreContext.Provider value={value}>{children}</GenreContext.Provider>;
}

export function useGenres(): GenreContextValue {
  const ctx = useContext(GenreContext);
  if (!ctx) throw new Error('useGenres must be used within a GenreProvider');
  return ctx;
}
