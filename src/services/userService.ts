// TODO: replace all functions with → api.patch/delete('/user/...') calls

/**
 * Update public profile fields.
 * Caller must also invoke AuthContext.updateProfile() to sync React state.
 */
export async function updateProfile(userId, updates) {
  // TODO: replace with → api.patch('/user/profile', updates)
  // Currently a no-op; AuthContext owns the in-memory + sessionStorage state.
  return { ok: true };
}

/**
 * Save notification preferences.
 * Caller must also invoke AuthContext.updateProfile({ notifications }) to sync.
 */
export async function updatePreferences(userId, preferences) {
  // TODO: replace with → api.patch('/user/preferences', preferences)
  return { ok: true };
}

/**
 * Change password.
 * @returns {{ ok: boolean, error?: string }}
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  // TODO: replace with → api.post('/user/change-password', { currentPassword, newPassword })
  // Simulate: accept any non-empty credentials locally
  if (!currentPassword || !newPassword) return { ok: false, error: 'Vul alle velden in.' };
  if (newPassword.length < 6) return { ok: false, error: 'Nieuw wachtwoord moet minimaal 6 tekens zijn.' };
  return { ok: true };
}

/**
 * Permanently delete account and all local data.
 * Caller must invoke AuthContext.logout() after success.
 * @returns {{ ok: boolean, error?: string }}
 */
export async function deleteAccount(userId, { username, confirmUsername }) {
  // TODO: replace with → api.delete('/user/account', { confirmUsername })
  if (confirmUsername !== username) {
    return { ok: false, error: 'Gebruikersnaam komt niet overeen.' };
  }
  // Wipe all ho_ localStorage keys for this user
  const keysToRemove = Object.keys(localStorage).filter(
    k => k.startsWith('ho_') && k.includes(userId)
  );
  // Also wipe generic keys
  ['ho_theme', 'ho_forum_threads', 'ho_uploaded_tracks'].forEach(k => keysToRemove.push(k));
  keysToRemove.forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem('ho_orbit_user');
  return { ok: true };
}
