import { supabase } from '@/lib/supabase';

export interface RpcResult {
  ok: boolean;
  error: { message?: string } | null;
}

async function callRpc(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  const { error } = await supabase.rpc(fn, args);
  return { ok: !error, error: error ? { message: error.message } : null };
}

export function leaveBand(bandId: string): Promise<RpcResult> {
  return callRpc('leave_band', { p_band_id: bandId });
}

export function removeBandMember(memberId: string): Promise<RpcResult> {
  return callRpc('remove_band_member', { p_member_id: memberId });
}

export function promoteToAdmin(memberId: string): Promise<RpcResult> {
  return callRpc('promote_to_admin', { p_member_id: memberId });
}

export function demoteToMember(memberId: string): Promise<RpcResult> {
  return callRpc('demote_to_member', { p_member_id: memberId });
}

export function transferBandOwnership(bandId: string, newOwnerUserId: string): Promise<RpcResult> {
  return callRpc('transfer_band_ownership', { p_band_id: bandId, p_new_owner_user_id: newOwnerUserId });
}

export async function deleteBand(bandId: string): Promise<RpcResult> {
  return callRpc('delete_band', { p_band_id: bandId });
}
