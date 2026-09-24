import { supabase } from '@/lib/supabase';

/**
 * Tutorials en masterclasses aanmaken. Alleen admins: de knop verschijnt
 * alleen voor hen, maar de echte grens is RLS (learning_admin_migration.sql)
 * — een niet-admin die deze functies toch aanroept krijgt een fout terug.
 */

export type Difficulty = 'Beginner' | 'Gevorderd' | 'Expert';
export type MasterclassCategory = 'producer' | 'mixer' | 'master' | 'booker';

export interface TutorialInput {
  title: string;
  description?: string;
  instructor?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: string;
  difficulty: Difficulty;
  tags: string[];
  tools: string[];
  steps: { title: string; body: string }[];
  chapters: { time: string; title: string }[];
}

export interface MasterclassInput {
  title: string;
  description?: string;
  category: MasterclassCategory;
  instructor_name?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: string;
  is_free: boolean;
}

/** Lege strings en lege lijsten als null opslaan, zodat de pagina's hun
 *  "als het er is"-checks (tutorial.steps && …) correct blijven doen. */
function clean(input: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v.trim() || null;
    else if (Array.isArray(v)) out[k] = v.length ? v : null;
    else out[k] = v;
  }
  return out;
}

function describe(error: { message?: string; code?: string } | null): string {
  if (!error) return 'Opslaan is mislukt.';
  if (error.code === '42501' || /row-level security|permission denied/i.test(error.message ?? '')) {
    return 'Alleen admins kunnen dit toevoegen.';
  }
  return 'Opslaan is mislukt. Probeer het opnieuw.';
}

export async function createTutorial(input: TutorialInput) {
  const { data, error } = await supabase.from('tutorials').insert(clean(input)).select().single();
  if (error) throw new Error(describe(error));
  return data;
}

export async function createMasterclass(input: MasterclassInput) {
  const { data, error } = await supabase.from('masterclasses').insert(clean(input)).select().single();
  if (error) throw new Error(describe(error));
  return data;
}

export async function uploadLearningThumbnail(file: File, folder: 'tutorials' | 'masterclasses'): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Kies een afbeelding.');
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${folder}/${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from('audio').upload(path, file, { contentType: file.type });
  if (error) throw new Error('Uploaden van de afbeelding is mislukt.');
  return supabase.storage.from('audio').getPublicUrl(path).data.publicUrl;
}
