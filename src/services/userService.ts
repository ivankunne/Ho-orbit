import { supabase } from '@/lib/supabase';

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const fieldMap: Record<string, string> = {
    displayName: 'display_name',
    bio: 'bio',
    location: 'location',
    avatar: 'avatar_url',
    banner: 'banner_url',
  };
  const dbUpdates: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (fieldMap[key]) dbUpdates[fieldMap[key]] = val;
  }
  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updatePreferences(userId: string, preferences: Record<string, unknown>) {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: preferences })
    .eq('id', userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function changePassword(_userId: string, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
  if (!currentPassword || !newPassword) return { ok: false, error: 'Vul alle velden in.' };
  if (newPassword.length < 6) return { ok: false, error: 'Nieuw wachtwoord moet minimaal 6 tekens zijn.' };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteAccount(userId: string, { username, confirmUsername }: { username: string; confirmUsername: string }) {
  if (confirmUsername !== username) return { ok: false, error: 'Gebruikersnaam komt niet overeen.' };
  const { error } = await supabase.auth.admin.deleteUser(userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
