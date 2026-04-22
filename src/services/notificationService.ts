import { supabase } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: unknown) => typeof id === 'string' && UUID_RE.test(id);

export async function getNotifications(userId: string) {
  if (!isUUID(userId)) return [];
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function addNotification(
  userId: string,
  { type, title, body, link = '' }: { type: string; title: string; body: string; link?: string }
) {
  if (!isUUID(userId)) return;
  const { data } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, body, link })
    .select()
    .single();
  return data;
}

export async function markAsRead(userId: string, notificationId: number) {
  if (!isUUID(userId)) return [];
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId);
  return getNotifications(userId);
}

export async function markAllAsRead(userId: string) {
  if (!isUUID(userId)) return [];
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  return getNotifications(userId);
}

export async function deleteNotification(userId: string, notificationId: number) {
  if (!isUUID(userId)) return [];
  await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', userId);
  return getNotifications(userId);
}
