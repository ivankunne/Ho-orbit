import { supabase } from '@lib/supabase';
import type { GenreGroup, GenreNode } from '@data/genres';

interface GroupRow { id: string; label: string; sort_order: number }
interface GenreRow {
  id: string;
  label: string;
  group_id: string | null;
  parent_id: string | null;
  color: string | null;
  sort_order: number;
}

/**
 * Load the genre catalog from Supabase and assemble it into the nested
 * GenreGroup[] shape the app renders. Returns null if the tables are missing or
 * unreachable, so callers fall back to the bundled taxonomy.
 */
export async function fetchGenreCatalog(): Promise<GenreGroup[] | null> {
  const [{ data: groups, error: gErr }, { data: genres, error: geErr }] = await Promise.all([
    supabase.from('genre_groups').select('id,label,sort_order').order('sort_order'),
    supabase.from('genres').select('id,label,group_id,parent_id,color,sort_order').order('sort_order'),
  ]);

  if (gErr || geErr || !groups?.length || !genres?.length) {
    if (gErr || geErr) console.warn('Genre catalog load failed, using fallback:', gErr ?? geErr);
    return null;
  }

  const rows = genres as GenreRow[];

  // Subgenre labels grouped by parent id (kept in sort order).
  const subsByParent = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const list = subsByParent.get(r.parent_id) ?? [];
    list.push(r.label);
    subsByParent.set(r.parent_id, list);
  }

  // Main genres (parent_id null) grouped by group id.
  const nodesByGroup = new Map<string, GenreNode[]>();
  for (const r of rows) {
    if (r.parent_id || !r.group_id) continue;
    const node: GenreNode = { name: r.label };
    if (r.color) node.color = r.color;
    const subs = subsByParent.get(r.id);
    if (subs?.length) node.sub = subs;
    const list = nodesByGroup.get(r.group_id) ?? [];
    list.push(node);
    nodesByGroup.set(r.group_id, list);
  }

  return (groups as GroupRow[])
    .map(g => ({ label: g.label, genres: nodesByGroup.get(g.id) ?? [] }))
    .filter(g => g.genres.length > 0);
}
