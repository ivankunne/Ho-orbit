import { supabase } from '@/lib/supabase';

export interface SceneLocation {
  id: number;
  province: string;
  city: string;
  name: string;
  address: string | null;
  type: string;
  website: string | null;
  notes: string | null;
  description: string | null;
  lat: number;
  lng: number;
}

export type SceneLocationInput = Omit<SceneLocation, 'id'>;

export const PROVINCES = [
  'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg',
  'Noord-Brabant', 'Noord-Holland', 'Overijssel', 'Utrecht', 'Zeeland', 'Zuid-Holland',
];

/**
 * Schrijven mag alleen een admin (scene_locations_admin_migration.sql). Een
 * geweigerde write geeft bij RLS geen fout maar nul rijen terug, dus die
 * vertalen we zelf naar een foutmelding — anders meldt het formulier
 * "opgeslagen" terwijl er niets is veranderd.
 */
function assertRow<T>(data: T[] | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Alleen admins kunnen locaties op de kaart zetten.');
  return data[0];
}

export async function createSceneLocation(input: SceneLocationInput): Promise<SceneLocation> {
  const { data, error } = await supabase.from('scene_locations').insert(input).select('*');
  return assertRow(data as SceneLocation[] | null, error);
}

export async function updateSceneLocation(id: number, input: SceneLocationInput): Promise<SceneLocation> {
  const { data, error } = await supabase.from('scene_locations').update(input).eq('id', id).select('*');
  return assertRow(data as SceneLocation[] | null, error);
}

export async function deleteSceneLocation(id: number): Promise<void> {
  const { data, error } = await supabase.from('scene_locations').delete().eq('id', id).select('id');
  assertRow(data, error);
}

/** Bij een 4xx van de edge function zit onze eigen (Nederlandse) melding in de body. */
async function functionError(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  const msg = await ctx?.json?.().then((b: { error?: string }) => b?.error).catch(() => null);
  return msg || fallback;
}

/** Aanmelding van een bezoeker: gaat naar de admins, niet direct op de kaart. */
export async function submitSceneLocation(
  place: SceneLocationInput,
  contact: { name: string; email: string; message: string; website_confirm: string },
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('scene-submission', {
    body: {
      action: 'submit', place,
      contact: { name: contact.name, email: contact.email, message: contact.message },
      website_confirm: contact.website_confirm,
    },
  });
  if (error) throw new Error(await functionError(error, 'Versturen is mislukt. Probeer het later opnieuw.'));
  if (data?.error) throw new Error(data.error);
}

export interface Submission extends SceneLocationInput {
  status: 'pending' | 'approved' | 'rejected';
  expired: boolean;
  contact_name: string;
  contact_email: string;
  message: string | null;
  created_at: string;
  reviewed_at: string | null;
  location_id: number | null;
}

/** Beoordeelpagina (link uit de admin-mail): ophalen, accepteren, afwijzen. */
export async function submissionAction(action: 'get' | 'approve' | 'reject', token: string): Promise<Submission> {
  const { data, error } = await supabase.functions.invoke('scene-submission', { body: { action, token } });
  if (error) throw new Error(await functionError(error, 'Er ging iets mis. Probeer het opnieuw.'));
  if (data?.error) throw new Error(data.error);
  return data.submission as Submission;
}

export interface GeocodeHit {
  lat: number;
  lng: number;
  city: string | null;
  province: string | null;
  label: string;
}

// Nominatim noemt Friesland bij de Friese naam.
const PROVINCE_ALIASES: Record<string, string> = { 'Fryslân': 'Friesland' };

/**
 * Adres → coördinaten via OpenStreetMap (Nominatim). Eerst gestructureerd
 * (straat + plaats), anders vrij zoeken op "naam, plaats" — dat vindt ook
 * venues die in OSM onder hun eigen naam staan. Alleen Nederland.
 */
export async function geocodeAddress({ address, city, name }: { address?: string; city?: string; name?: string }): Promise<GeocodeHit | null> {
  const attempts: Record<string, string>[] = [];
  if (address?.trim() && city?.trim()) attempts.push({ street: address.trim(), city: city.trim() });
  if (name?.trim() && city?.trim()) attempts.push({ q: `${name.trim()}, ${city.trim()}` });
  if (address?.trim() && !city?.trim()) attempts.push({ q: address.trim() });

  for (const params of attempts) {
    const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
      ...params, format: 'json', limit: '1', countrycodes: 'nl', addressdetails: '1', 'accept-language': 'nl',
    });
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) continue;
    const [hit] = await res.json();
    if (!hit) continue;
    const a = hit.address ?? {};
    const province = a.state ? (PROVINCE_ALIASES[a.state] ?? a.state) : null;
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
      province: PROVINCES.includes(province) ? province : null,
      label: hit.display_name,
    };
  }
  return null;
}
