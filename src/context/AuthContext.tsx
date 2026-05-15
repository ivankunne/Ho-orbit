import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@lib/supabase';

const AuthContext = createContext<any>(null);

function mapProfile(profile: any, authUser: any) {
  return {
    id: authUser.id,
    username: profile?.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || '',
    displayName: profile?.display_name || profile?.username || authUser.user_metadata?.display_name || '',
    email: authUser.email || '',
    avatar: profile?.avatar_url || null,
    banner: profile?.banner_url || null,
    bio: profile?.bio || '',
    location: profile?.location || '',
    role: profile?.role || 'Luisteraar',
    verified: profile?.verified || false,
    isAdmin: profile?.is_admin || false,
    followers: profile?.followers_count || 0,
    following: profile?.following_count || 0,
    joinedDate: profile?.joined_date || '',
    likedTracks: profile?.liked_tracks || [],
    uploadedTracks: profile?.uploaded_tracks || [],
    attendingEvents: profile?.attending_events || [],
    preferredGenres: profile?.preferred_genres || [],
    notifications: profile?.notification_prefs || {},
    social: profile?.social || {},
    bookingInfo: profile?.booking_info || {},
    needsOnboarding: profile?.needs_onboarding ?? false,
    discoverPrefs: profile?.discover_prefs || {},
  };
}

function translateError(msg: string): string {
  if (!msg) return 'Er is een fout opgetreden.';
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) return 'Onjuiste inloggegevens.';
  if (lower.includes('email not confirmed')) return 'E-mail nog niet bevestigd. Controleer je inbox.';
  if (lower.includes('user already registered') || lower.includes('already been registered')) return 'Er bestaat al een account met dit e-mailadres.';
  if (lower.includes('password')) return 'Wachtwoord voldoet niet aan de vereisten (minimaal 6 tekens).';
  return msg;
}

function profileCacheKey(userId: string) { return `ho_profile_${userId}`; }

function saveProfileCache(userId: string, data: any) {
  try { localStorage.setItem(profileCacheKey(userId), JSON.stringify(data)); } catch {}
}

function loadProfileCache(userId: string): any | null {
  try {
    const s = localStorage.getItem(profileCacheKey(userId));
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function clearProfileCache(userId: string) {
  try { localStorage.removeItem(profileCacheKey(userId)); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function applySession(session: any) {
      if (!session?.user) {
        if (active) { setUser(null); setLoading(false); }
        return;
      }
      const uid = session.user.id;
      try {
        const result = await Promise.race([
          supabase.from('profiles').select('*').eq('id', uid).single(),
          new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 4_000)),
        ]);
        if (active) {
          if (result.error) {
            // DB error — use cache or auth metadata, retry profile in background
            const cached = loadProfileCache(uid);
            setUser(mapProfile(cached, session.user));
            setLoading(false);
            supabase.from('profiles').select('*').eq('id', uid).single()
              .then(({ data }) => {
                if (active && data) {
                  saveProfileCache(uid, data);
                  setUser(mapProfile(data, session.user));
                }
              })
              .catch(() => {});
          } else {
            saveProfileCache(uid, result.data);
            setUser(mapProfile(result.data, session.user));
            setLoading(false);
          }
        }
      } catch {
        // Timeout — use cache immediately so avatar/role don't flash, retry in background
        if (active) {
          const cached = loadProfileCache(uid);
          setUser(mapProfile(cached, session.user));
          setLoading(false);
          supabase.from('profiles').select('*').eq('id', uid).single()
            .then(({ data }) => {
              if (active && data) {
                saveProfileCache(uid, data);
                setUser(mapProfile(data, session.user));
              }
            })
            .catch(() => {});
        }
      }
    }

    // Read session from localStorage directly — fast, no network round-trip for valid sessions.
    // This avoids the hard-refresh race where onAuthStateChange temporarily fires with null.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) applySession(session);
    }).catch(() => {
      if (active) setLoading(false);
    });

    // Handle real-time auth changes: sign-in, sign-out, token refresh.
    // Skip INITIAL_SESSION — already handled by getSession above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event === 'INITIAL_SESSION') return;
      applySession(session);
    });

    const safetyTimer = setTimeout(() => { if (active) setLoading(false); }, 5_000);
    return () => { active = false; subscription.unsubscribe(); clearTimeout(safetyTimer); };
  }, []);

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    setError('');
    let email = emailOrUsername.trim();

    try {
      if (!email.includes('@')) {
        const res = await Promise.race([
          supabase.from('profiles').select('email').eq('username', email).maybeSingle(),
          new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 10_000)),
        ]);
        if (!res.data?.email) {
          setError('Onjuiste gebruikersnaam of wachtwoord.');
          return false;
        }
        email = res.data.email;
      }

      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 15_000)),
      ]);
      if (result.error) {
        setError(translateError(result.error.message));
        return false;
      }
      return true;
    } catch (e: any) {
      if (e?.message === 'timeout') {
        setError('Verbinding met de server duurt te lang. Controleer je internet of probeer later opnieuw.');
      } else {
        setError(translateError(e?.message || 'Inloggen mislukt.'));
      }
      return false;
    }
  };

  const signup = async (data: any): Promise<{ ok: boolean; needsConfirmation?: boolean }> => {
    setError('');
    let authData: any, authError: any;
    try {
      const result = await Promise.race([
        supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { username: data.username, display_name: data.displayName || data.username } },
        }),
        new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 20_000)),
      ]);
      authData = result.data;
      authError = result.error;
    } catch (e: any) {
      setError(e?.message === 'timeout'
        ? 'Verbinding met de server duurt te lang. Controleer je internet of probeer later opnieuw.'
        : translateError(e?.message || 'Aanmelden mislukt.'));
      return { ok: false };
    }

    if (authError) {
      setError(translateError(authError.message));
      return { ok: false };
    }

    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        username: data.username,
        display_name: data.displayName || data.username,
        email: data.email,
        location: data.location || null,
        role: data.isArtist ? 'Artiest' : 'Luisteraar',
        needs_onboarding: authData.session ? true : false,
        followers_count: 0,
        following_count: 0,
        verified: false,
        is_admin: false,
      });

      // Only set onboarding flag when user gets an immediate session (no email confirmation needed)
      if (authData.session) {
        sessionStorage.setItem('ho_show_onboarding', 'true');
      }

      // Upload avatar if provided and the user has an active session
      if (authData.session && data.avatarFile instanceof File) {
        try {
          const ext = data.avatarFile.name.split('.').pop() ?? 'jpg';
          const path = `avatars/${authData.user.id}_${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('audio')
            .upload(path, data.avatarFile, { contentType: data.avatarFile.type, upsert: true });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(path);
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', authData.user.id);
          }
        } catch {
          // Avatar upload is non-critical — user can set it later from account settings
        }
      }
    }

    return { ok: true, needsConfirmation: !authData.session };
  };

  const logout = async () => {
    if (user?.id) clearProfileCache(user.id);
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = (updates: Record<string, any>) => {
    const EDITABLE = [
      'displayName', 'bio', 'location', 'email', 'avatar', 'banner',
      'preferredGenres', 'notifications', 'social', 'bookingInfo',
      'needsOnboarding', 'role', 'discoverPrefs',
    ];
    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => EDITABLE.includes(k)));
    setUser((prev: any) => {
      const next = { ...prev, ...safe };
      // Keep cache in sync so avatar/role survive hard refreshes
      if (prev?.id) {
        const cached = loadProfileCache(prev.id);
        if (cached) {
          const fieldMap: Record<string, string> = {
            avatar: 'avatar_url', banner: 'banner_url', displayName: 'display_name',
            bio: 'bio', location: 'location', role: 'role',
            preferredGenres: 'preferred_genres', social: 'social',
            bookingInfo: 'booking_info', needsOnboarding: 'needs_onboarding',
          };
          for (const [k, v] of Object.entries(safe)) {
            if (fieldMap[k]) cached[fieldMap[k]] = v;
          }
          saveProfileCache(prev.id, cached);
        }
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, error, setError, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
