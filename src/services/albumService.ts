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
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  };
}

export async function getArtistAlbums(ownerId: string): Promise<Album[]> {
  const { data } = await supabase
    .from('albums')
    .select('*')
    .eq('owner_id', ownerId)
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapAlbum);
}

// .maybeSingle(), not .single() — .single() errors (406) on zero rows.
export async function getAlbum(albumId: string): Promise<Album | null> {
  const { data } = await supabase.from('albums').select('*').eq('id', albumId).maybeSingle();
  return data ? mapAlbum(data) : null;
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

  const { data, error } = await supabase
    .from('albums')
    .insert({
      owner_id: ownerId,
      title: input.title,
      description: input.description?.trim() || null,
      genre: input.genre || null,
      release_date: input.releaseDate || null,
      cover_url: coverUrl,
    })
    .select()
    .single();
  if (error || !data) return null;
  return mapAlbum(data);
}

export async function updateAlbum(albumId: string, ownerId: string, updates: {
  title?: string; description?: string; genre?: string; releaseDate?: string | null; coverFile?: File;
}): Promise<Album | null> {
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

  const { data, error } = await supabase
    .from('albums')
    .update(dbUpdates)
    .eq('id', albumId)
    .eq('owner_id', ownerId)
    .select()
    .single();
  if (error || !data) return null;
  return mapAlbum(data);
}

export async function deleteAlbum(albumId: string, ownerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId)
    .eq('owner_id', ownerId);
  return !error;
}
