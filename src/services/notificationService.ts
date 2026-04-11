// Notification types: 'like', 'follow', 'rsvp', 'comment', 'forum_reply', 'system'

// TODO: replace with → api.get('/notifications?userId=X')
export async function getNotifications(userId) {
  try {
    return JSON.parse(localStorage.getItem(`ho_notifications_${userId}`) || '[]');
  } catch {
    return [];
  }
}

// TODO: replace with → api.post('/notifications', payload) — triggered by backend events
export async function addNotification(userId, { type, title, body, link = '' }) {
  if (!userId) return;
  const stored = await getNotifications(userId);
  const notification = {
    id: Date.now(),
    type,
    title,
    body,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const next = [notification, ...stored].slice(0, 50); // cap at 50
  localStorage.setItem(`ho_notifications_${userId}`, JSON.stringify(next));
  return notification;
}

// TODO: replace with → api.patch('/notifications/:id/read')
export async function markAsRead(userId, notificationId) {
  const stored = await getNotifications(userId);
  const next = stored.map(n => n.id === notificationId ? { ...n, read: true } : n);
  localStorage.setItem(`ho_notifications_${userId}`, JSON.stringify(next));
  return next;
}

// TODO: replace with → api.patch('/notifications/read-all?userId=X')
export async function markAllAsRead(userId) {
  const stored = await getNotifications(userId);
  const next = stored.map(n => ({ ...n, read: true }));
  localStorage.setItem(`ho_notifications_${userId}`, JSON.stringify(next));
  return next;
}

// TODO: replace with → api.delete('/notifications/:id')
export async function deleteNotification(userId, notificationId) {
  const stored = await getNotifications(userId);
  const next = stored.filter(n => n.id !== notificationId);
  localStorage.setItem(`ho_notifications_${userId}`, JSON.stringify(next));
  return next;
}
