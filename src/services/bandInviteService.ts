import { supabase } from '@/lib/supabase';
import { notifyBandInvite } from '@services/emailService';

export type InviteRole = 'admin' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface BandInvite {
  id: string;
  band_id: string;
  token: string;
  email: string;
  invited_name: string | null;
  role: InviteRole;
  invited_by: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

export interface InviteCandidate {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface RpcResult<T = undefined> {
  ok: boolean;
  data: T | null;
  error: { message?: string } | null;
}

export async function listBandInvites(bandId: string): Promise<BandInvite[]> {
  const { data } = await supabase
    .from('band_invites')
    .select('*')
    .eq('band_id', bandId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function searchProfilesForInvite(query: string): Promise<InviteCandidate[]> {
  const { data, error } = await supabase.rpc('search_profiles_for_invite', { p_query: query });
  if (error) return [];
  return data ?? [];
}

export async function addBandMemberDirect(
  bandId: string, userId: string, role: InviteRole = 'member',
): Promise<RpcResult> {
  const { error } = await supabase.rpc('add_band_member_direct', {
    p_band_id: bandId, p_user_id: userId, p_role: role,
  });
  return { ok: !error, data: undefined, error: error ? { message: error.message } : null };
}

// Creates (or resends, refreshing the 7-day expiry and rotating the token)
// an invite, then best-effort emails it — email failure doesn't undo the
// invite, matching the notify service's existing best-effort convention.
export async function createBandInvite(
  bandId: string, email: string, invitedName: string, role: InviteRole = 'member',
): Promise<RpcResult<BandInvite>> {
  const { data, error } = await supabase.rpc('create_band_invite', {
    p_band_id: bandId, p_email: email, p_invited_name: invitedName, p_role: role,
  });
  if (error) return { ok: false, data: null, error: { message: error.message } };
  await notifyBandInvite(data.id);
  return { ok: true, data, error: null };
}

export async function revokeBandInvite(inviteId: string): Promise<RpcResult> {
  const { error } = await supabase.rpc('revoke_band_invite', { p_invite_id: inviteId });
  return { ok: !error, data: undefined, error: error ? { message: error.message } : null };
}
