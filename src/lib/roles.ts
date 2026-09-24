import { supabase } from '@/lib/supabase';

/**
 * Wat iemand maakt op h-orbit (profiles.roles, zie profile_roles_migration.sql).
 * Meerdere tegelijk kan: een muzikant met een podcast heeft er twee.
 *
 * - Artiest: muziek uploaden, artiestenpagina.
 * - Podcast: een eigen podcast met afleveringen.
 * - Radio:   een radiostation — alleen een admin kent dit toe (de database
 *            weigert het anders).
 *
 * `profiles.role` is sindsdien alleen nog het label uit de onboarding
 * ("Muziekliefhebber", "Organisator", …) en geeft geen rechten.
 */
export type CreatorRole = 'Artiest' | 'Podcast' | 'Radio';

export const SELF_SERVICE_ROLES: { id: CreatorRole; label: string; desc: string }[] = [
  { id: 'Artiest', label: 'Ik maak muziek',      desc: 'Nummers en albums uploaden, met een eigen artiestenpagina' },
  { id: 'Podcast', label: 'Ik maak een podcast', desc: 'Een eigen podcast met afleveringen' },
];

const CREATOR_LABELS = new Set(['Artiest', 'Podcast', 'Radio']);

type WithRoles = { roles?: string[] | null; role?: string | null } | null | undefined;

/** Rollen van een profiel of ingelogde gebruiker. Valt terug op het oude
 *  `role`-veld voor een profiel uit de cache van vóór de migratie. */
export function rolesOf(u: WithRoles): CreatorRole[] {
  if (!u) return [];
  if (Array.isArray(u.roles)) return u.roles.filter(r => CREATOR_LABELS.has(r)) as CreatorRole[];
  return u.role && CREATOR_LABELS.has(u.role) ? [u.role as CreatorRole] : [];
}

export const hasRole = (u: WithRoles, r: CreatorRole) => rolesOf(u).includes(r);

/**
 * Het label (`role`) volgt mee als het nog een oude rolnaam was: wie "Artiest"
 * uitzet en verder niets heeft, heet daarna "Luisteraar", niet nog steeds
 * "Artiest". Een zelfgekozen label als "Organisator" blijft staan.
 */
export function labelFor(currentLabel: string | null | undefined, roles: CreatorRole[]): string {
  if (currentLabel && !CREATOR_LABELS.has(currentLabel) && currentLabel !== 'Luisteraar') return currentLabel;
  return roles[0] ?? 'Luisteraar';
}

/** Eigen rollen opslaan. Controleert dat de rij echt is bijgewerkt: een
 *  geweigerde update geeft bij RLS geen fout maar nul rijen. */
export async function saveMyRoles(userId: string, roles: CreatorRole[], currentLabel?: string | null) {
  const role = labelFor(currentLabel, roles);
  const { data, error } = await supabase.from('profiles').update({ roles, role }).eq('id', userId).select('roles, role');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Opslaan is mislukt. Log opnieuw in en probeer het nog eens.');
  return { roles: rolesOf(data[0]), role: data[0].role as string };
}
