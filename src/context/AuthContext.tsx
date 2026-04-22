import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setUser({
        id: userId,
        username: data.username,
        displayName: data.display_name,
        email: data.email,
        avatar: data.avatar_url,
        banner: data.banner_url,
        bio: data.bio,
        location: data.location,
        role: data.role,
        verified: data.verified,
        isAdmin: data.is_admin,
        followers: data.followers_count,
        following: data.following_count,
        joinedDate: data.joined_date,
        likedTracks: [],
        uploadedTracks: [],
        attendingEvents: [],
        preferredGenres: data.preferred_genres ?? [],
        notifications: data.notification_prefs,
        needsOnboarding: data.needs_onboarding,
      });
    }
    setLoading(false);
  }

  const login = async (username: string, password: string) => {
    setError('');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      setError('Onjuiste gebruikersnaam of wachtwoord.');
      return false;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (authError) {
      setError('Onjuiste gebruikersnaam of wachtwoord.');
      return false;
    }
    return true;
  };

  const signup = async (data: {
    username: string;
    displayName?: string;
    email: string;
    password: string;
    location?: string;
    isArtist?: boolean;
  }) => {
    setError('');
    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          display_name: data.displayName || data.username,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      return false;
    }

    if (data.location || data.isArtist) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase.from('profiles').update({
          location: data.location ?? '',
          role: data.isArtist ? 'Artiest' : 'Luisteraar',
        }).eq('id', authUser.id);
      }
    }

    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = async (updates: Record<string, unknown>) => {
    if (!user) return;
    const fieldMap: Record<string, string> = {
      displayName: 'display_name',
      bio: 'bio',
      location: 'location',
      email: 'email',
      avatar: 'avatar_url',
      banner: 'banner_url',
      preferredGenres: 'preferred_genres',
      notifications: 'notification_prefs',
    };
    const dbUpdates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (fieldMap[key]) dbUpdates[fieldMap[key]] = val;
    }
    await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
    setUser((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, error, setError, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
