import { createContext, useContext, useState } from 'react';

// Mock users database
// TODO: Replace with API call to POST /api/auth/login
const MOCK_USERS = [
  {
    id: 1,
    username: 'Test123',
    password: 'Test123',
    displayName: 'Test Gebruiker',
    email: 'test@h-orbit.nl',
    avatar: 'https://picsum.photos/seed/test123/200/200',
    banner: 'https://picsum.photos/seed/test123-banner/1200/400',
    bio: 'Muziekliefhebber en amateur producer uit Amsterdam. Altijd op zoek naar nieuwe Nederlandse muziek.',
    location: 'Amsterdam, Nederland',
    role: 'Luisteraar',
    verified: false,
    isAdmin: false,
    followers: 42,
    following: 118,
    joinedDate: 'Maart 2025',
    likedTracks: [1, 3, 5],
    uploadedTracks: [],
    attendingEvents: [4, 5],
  },
  {
    id: 99,
    username: 'admin',
    password: 'admin',
    displayName: 'h-orbit Admin',
    email: 'admin@h-orbit.nl',
    avatar: 'https://picsum.photos/seed/horbiteadmin/200/200',
    banner: 'https://picsum.photos/seed/admin-banner/1200/400',
    bio: 'Platform beheerder.',
    location: 'Nederland',
    role: 'Beheerder',
    verified: true,
    isAdmin: true,
    followers: 0,
    following: 0,
    joinedDate: 'Januari 2024',
    likedTracks: [],
    uploadedTracks: [],
    attendingEvents: [],
  },
  {
    id: 2,
    username: 'sander_h',
    password: 'wachtwoord',
    displayName: 'Sander Hoekstra',
    email: 'sander@h-orbit.nl',
    avatar: 'https://picsum.photos/seed/currentuser/200/200',
    banner: 'https://picsum.photos/seed/sander-banner/1200/400',
    bio: 'Producer & blogger gebaseerd in Rotterdam. Ik schrijf over de Nederlandse muziekscene en maak beats in mijn thuisstudio.',
    location: 'Rotterdam, Nederland',
    role: 'Producer & Blogger',
    verified: true,
    followers: 1840,
    following: 420,
    joinedDate: 'Januari 2024',
    likedTracks: [2, 4, 6],
    uploadedTracks: [],
    attendingEvents: [1, 3],
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('h_orbit_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem('h_orbit_user');
      return null;
    }
  });
  const [error, setError] = useState('');

  const login = (username, password) => {
    // TODO: Replace with API call to POST /api/auth/login
    const found = MOCK_USERS.find(
      u => u.username === username && u.password === password
    );
    if (found) {
      const { password: _pw, ...safeUser } = found;
      setUser(safeUser);
      sessionStorage.setItem('h_orbit_user', JSON.stringify(safeUser));
      setError('');
      return true;
    }
    setError('Onjuiste gebruikersnaam of wachtwoord.');
    return false;
  };

  const signup = (data) => {
    // TODO: Replace with API call to POST /api/auth/registreren
    const newUser = {
      id: Date.now(),
      username: data.username,
      displayName: data.displayName || data.username,
      email: data.email,
      avatar: `https://picsum.photos/seed/${data.username}/200/200`,
      banner: `https://picsum.photos/seed/${data.username}-banner/1200/400`,
      bio: '',
      location: data.location || '',
      role: data.isArtist ? 'Artiest' : 'Luisteraar',
      verified: false,
      followers: 0,
      following: 0,
      joinedDate: 'Maart 2026',
      likedTracks: [],
      uploadedTracks: [],
      attendingEvents: [],
      needsOnboarding: true,
    };
    setUser(newUser);
    sessionStorage.setItem('h_orbit_user', JSON.stringify(newUser));
    setError('');
    return true;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('h_orbit_user');
  };

  const updateProfile = (updates) => {
    // Whitelist editable fields — never allow overwriting id, role, verified, etc.
    const EDITABLE = ['displayName', 'bio', 'location', 'email', 'avatar', 'banner', 'preferredGenres', 'notifications', 'social', 'bookingInfo', 'needsOnboarding', 'role', 'discoverPrefs'];
    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => EDITABLE.includes(k)));
    const updated = { ...user, ...safe };
    setUser(updated);
    sessionStorage.setItem('h_orbit_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, error, setError, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
