import { supabase } from '@/lib/supabase';

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const fieldMap: Record<string, string> = {
    displayName: 'display_name',
    bio: 'bio',
    location: 'location',
    avatar: 'avatar_url',
    banner: 'banner_url',
    social: 'social',
    bookingInfo: 'booking_info',
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

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `avatars/${userId}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('audio').upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('audio').getPublicUrl(path);
  await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);
  return data.publicUrl;
}

export async function uploadBanner(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `banners/${userId}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('audio').upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('audio').getPublicUrl(path);
  await supabase.from('profiles').update({ banner_url: data.publicUrl }).eq('id', userId);
  return data.publicUrl;
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
