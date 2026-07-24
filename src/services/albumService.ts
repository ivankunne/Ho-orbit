import { supabase } from '@/lib/supabase';
import { uploadAlbumCoverFile } from '@services/uploadService';

// DB table defined in supabase/albums_migration.sql

export interface Album {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  genre: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function mapAlbum(d: Record<string, unknown>): Album {
  return {
    id: String(d.id),
    ownerId: (d.owner_id as string) ?? '',
    title: d.title as string,
    description: (d.description as string) ?? null,
    genre: (d.genre as string) ?? null,
    coverUrl: (d.cover_url as string) ?? null,
    releaseDate: (d.release_date as string) ?? null,
    sortOrder: (d.sort_order as number) ?? 0,
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  };
}

export async function getArtistAlbums(ownerId: string): Promise<Album[]> {
  const { data } = await supabase
    .from('albums')
    .select('*')
    .eq('owner_id', ownerId)
    .order('sort_order', { ascending: true });
  return (data ?? []).map(mapAlbum);
}

// .maybeSingle(), not .single() — .single() errors (406) on zero rows.
export async function getAlbum(albumId: string): Promise<Album | null> {
  const { data } = await supabase.from('albums').select('*').eq('id', albumId).maybeSingle();
  return data ? mapAlbum(data) : null;
}

// Persists a new album order (index in the array = new sort_order). Scoped
// to ownerId both in the filter (defense in depth) and via RLS, unless
// isAdmin (master admin reordering another user's albums).
export async function reorderAlbums(ownerId: string, orderedAlbumIds: string[], isAdmin = false): Promise<boolean> {
  const results = await Promise.all(
    orderedAlbumIds.map((albumId, index) => {
      let query = supabase.from('albums').update({ sort_order: index }).eq('id', albumId);
      if (!isAdmin) query = query.eq('owner_id', ownerId);
      return query;
    }),
  );
  return results.every(r => !r.error);
}

export async function createAlbum(ownerId: string, input: {
  title: string; description?: string; genre?: string; releaseDate?: string; coverFile?: File;
}): Promise<Album | null> {
  let coverUrl: string | null = null;
  if (input.coverFile) {
    try {
      coverUrl = await uploadAlbumCoverFile(input.coverFile, input.title);
    } catch (e) {
      console.warn('Album cover upload failed, continuing without artwork:', e);
    }
  }

  // New albums go to the end of the manually-ordered list, not sort_order's
  // default of 0 (which would collide with whatever is currently first).
  const { count } = await supabase
    .from('albums').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId);

  const { data, error } = await supabase
    .from('albums')
    .insert({
      owner_id: ownerId,
      title: input.title,
      description: input.description?.trim() || null,
      genre: input.genre || null,
      release_date: input.releaseDate || null,
      cover_url: coverUrl,
      sort_order: count ?? 0,
    })
    .select()
    .single();
  if (error || !data) return null;
  return mapAlbum(data);
}

export async function updateAlbum(albumId: string, ownerId: string, updates: {
  title?: string; description?: string; genre?: string; releaseDate?: string | null; coverFile?: File;
}, isAdmin = false): Promise<Album | null> {
  let coverUrl: string | undefined;
  if (updates.coverFile) {
    try {
      coverUrl = await uploadAlbumCoverFile(updates.coverFile, updates.title || 'album');
    } catch (e) {
      console.warn('Album cover upload failed, keeping existing artwork:', e);
    }
  }

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description?.trim() || null;
  if (updates.genre !== undefined) dbUpdates.genre = updates.genre || null;
  if (updates.releaseDate !== undefined) dbUpdates.release_date = updates.releaseDate;
  if (coverUrl) dbUpdates.cover_url = coverUrl;

  let query = supabase.from('albums').update(dbUpdates).eq('id', albumId);
  if (!isAdmin) query = query.eq('owner_id', ownerId);
  const { data, error } = await query.select().single();
  if (error || !data) return null;
  return mapAlbum(data);
}

export async function deleteAlbum(albumId: string, ownerId: string, isAdmin = false): Promise<boolean> {
  let query = supabase.from('albums').delete().eq('id', albumId);
  if (!isAdmin) query = query.eq('owner_id', ownerId);
  const { error } = await query;
  return !error;
}
