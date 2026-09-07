import { supabase } from '@lib/supabase';

/** Flips the global paywall switch on. RLS only allows admins to do this. */
export async function activatePaywall(): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('paywall_settings')
    .update({ enabled: true, enabled_at: new Date().toISOString(), enabled_by: userData.user?.id ?? null })
    .eq('id', true);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Flips it back off — e.g. to pause if something looks wrong right after going live. */
export async function deactivatePaywall(): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('paywall_settings')
    .update({ enabled: false })
    .eq('id', true);
  return error ? { ok: false, error: error.message } : { ok: true };
}
