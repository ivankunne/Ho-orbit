import { useMemo } from 'react';

export type BandRole = 'owner' | 'admin' | 'member';

export interface BandMemberLike {
  user_id: string;
  role: string;
  status: string;
}

export function getBandRole(members: BandMemberLike[], userId: string | undefined): BandRole | null {
  if (!userId) return null;
  const mine = members.find(m => m.user_id === userId && m.status === 'active');
  if (!mine) return null;
  return (mine.role as BandRole) ?? 'member';
}

export function isOwner(role: BandRole | null): boolean {
  return role === 'owner';
}

export function isAdminOrOwner(role: BandRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

// Every permission below currently maps 1:1 to "admin or owner" — kept as
// named functions (rather than inlining isAdminOrOwner everywhere) so a
// future split (e.g. riders manageable by a new role) only touches one line.
export function canManageEvents(role: BandRole | null): boolean {
  return isAdminOrOwner(role);
}

export function canManageMembers(role: BandRole | null): boolean {
  return isAdminOrOwner(role);
}

export function canManageRiders(role: BandRole | null): boolean {
  return isAdminOrOwner(role);
}

export function canPromoteOrDemote(role: BandRole | null): boolean {
  return isOwner(role);
}

export function canTransferOwnership(role: BandRole | null): boolean {
  return isOwner(role);
}

export function canDeleteBand(role: BandRole | null): boolean {
  return isOwner(role);
}

// Whether `callerRole` may remove a member currently holding `targetRole`.
// Owners can remove admins or members but never another owner (there's only
// ever one). Admins may only remove plain members. Self-removal always goes
// through leaveBand(), not this check.
export function canRemoveRole(callerRole: BandRole | null, targetRole: BandRole | string): boolean {
  if (targetRole === 'owner') return false;
  if (callerRole === 'owner') return true;
  if (callerRole === 'admin') return targetRole === 'member';
  return false;
}

export function useBandRole(members: BandMemberLike[], userId: string | undefined): BandRole | null {
  return useMemo(() => getBandRole(members, userId), [members, userId]);
}

// Maps the specific error strings raised by the membership RPCs
// (supabase/band_roles_migration.sql) to Dutch messages for toasts.
const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'Je bent niet ingelogd.',
  not_a_member: 'Je bent geen lid van deze band.',
  owner_must_transfer_first: 'Je bent eigenaar. Draag eerst het eigenaarschap over voordat je de band verlaat.',
  last_admin_cannot_leave: 'Je bent de enige admin. Maak eerst een ander lid admin of eigenaar.',
  member_not_found: 'Lid niet gevonden.',
  cannot_remove_self: 'Gebruik "Band verlaten" om jezelf te verwijderen.',
  not_authorized: 'Je hebt geen rechten om dit te doen.',
  cannot_remove_owner: 'De eigenaar kan niet verwijderd worden.',
  only_owner_can_remove_admin: 'Alleen de eigenaar kan een admin verwijderen.',
  only_owner_can_promote: 'Alleen de eigenaar kan leden promoveren.',
  only_owner_can_demote: 'Alleen de eigenaar kan admins degraderen.',
  member_not_active: 'Dit lid is niet actief.',
  already_admin_or_owner: 'Dit lid is al admin of eigenaar.',
  not_an_admin: 'Dit lid is geen admin.',
  already_owner: 'Dit lid is al eigenaar.',
  only_owner_can_transfer: 'Alleen de eigenaar kan het eigenaarschap overdragen.',
  target_not_active_member: 'Dit lid is geen actief bandlid.',
  only_owner_can_delete_band: 'Alleen de eigenaar kan de band verwijderen.',
  invalid_email: 'Vul een geldig e-mailadres in.',
  invalid_role: 'Ongeldige rol.',
  already_a_member: 'Deze persoon is al lid van de band.',
  invite_not_found: 'Uitnodiging niet gevonden.',
  invalid_token: 'Deze uitnodigingslink is ongeldig.',
  invite_already_used: 'Deze uitnodiging is al gebruikt.',
  invite_expired: 'Deze uitnodiging is verlopen. Vraag om een nieuwe.',
};

export function describeBandError(error: { message?: string } | null | undefined, fallback: string): string {
  const code = error?.message?.trim();
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallback;
}
