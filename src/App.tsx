import { BrowserRouter, Routes, Route, Navigate, useLocation, useMatch } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { RadioProvider } from '@context/RadioContext';
import { AppStateProvider, useAppState } from '@context/AppStateContext';
import { PlayerProvider, usePlayer } from '@context/PlayerContext';
import { ToastProvider } from '@components/Toast';
import MusicPlayer from '@components/MusicPlayer';
import MobileBottomNav from '@components/MobileBottomNav';
import ErrorBoundary from '@components/ErrorBoundary';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import KeyboardShortcutsModal from '@components/KeyboardShortcutsModal';
import Navbar from '@components/Layout/Navbar';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function PlayerUserBridge() {
  const { user } = useAuth();
  const { setUserId } = usePlayer();
  useEffect(() => { setUserId(user?.id ?? null); }, [user, setUserId]);
  return null;
}

function AppStateUserBridge() {
  const { user } = useAuth();
  const { setCurrentUserId } = useAppState();
  useEffect(() => { setCurrentUserId(user?.id ?? null); }, [user, setCurrentUserId]);
  return null;
}

const HomePage = lazy(() => import('@pages/HomePage'));
const ArtistsPage = lazy(() => import('@pages/ArtistsPage'));
const ArtistDetailPage = lazy(() => import('@pages/ArtistDetailPage'));
const UploadPage = lazy(() => import('@pages/UploadPage'));
const TutorialsPage = lazy(() => import('@pages/TutorialsPage'));
const TutorialDetailPage = lazy(() => import('@pages/TutorialDetailPage'));
const MagazinePage = lazy(() => import('@pages/MagazinePage'));
const ArticleDetailPage = lazy(() => import('@pages/ArticleDetailPage'));
const LibraryPage = lazy(() => import('@pages/LibraryPage'));
const DutchScenePage = lazy(() => import('@pages/DutchScenePage'));
const SceneDetailPage = lazy(() => import('@pages/SceneDetailPage'));
const VenueDetailPage = lazy(() => import('@pages/VenueDetailPage'));
const ForumsPage = lazy(() => import('@pages/ForumsPage'));
const ForumThreadPage = lazy(() => import('@pages/ForumThreadPage'));
const EventsPage = lazy(() => import('@pages/EventsPage'));
const EventDetailPage = lazy(() => import('@pages/EventDetailPage'));
const ProfilePage = lazy(() => import('@pages/user/ProfilePage'));
const AccountPage = lazy(() => import('@pages/user/AccountPage'));
const PlaylistDetailPage = lazy(() => import('@pages/PlaylistDetailPage'));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'));
const LoginPage = lazy(() => import('@pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@pages/auth/SignupPage'));
const OnboardingPage = lazy(() => import('@pages/OnboardingPage'));
const LandingPage = lazy(() => import('@pages/LandingPage'));
const HubPage = lazy(() => import('@pages/HubPage'));
const AdminPage = lazy(() => import('@pages/AdminPage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#1a1528] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full bg-violet-600/30 animate-ping" />
          <div className="relative w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-violet-500 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">Laden…</p>
      </div>
    </div>
  );
}

function GlobalShortcuts({ onOpenSearch, onToggleShortcutsModal }) {
  const { track, isPlaying, togglePlay, skipForward, skipBack, toggleShuffle } = usePlayer();
  const { toggleLike, currentUserId } = useAppState();

  useKeyboardShortcuts([
    {
      key: ' ',
      description: 'Afspelen / Pauzeren',
      action: () => { if (track) togglePlay(); },
    },
    {
      key: 'ArrowRight',
      description: 'Volgend nummer',
      action: skipForward,
    },
    {
      key: 'ArrowLeft',
      description: 'Vorig nummer',
      action: skipBack,
    },
    {
      key: 's',
      description: 'Shuffle aan/uit',
      action: toggleShuffle,
    },
    {
      key: 'l',
      description: 'Nummer liken',
      action: () => { if (track && currentUserId) toggleLike(track.id); },
    },
    {
      key: 'k',
      meta: true,
      description: 'Zoeken openen',
      action: onOpenSearch,
    },
    {
      key: '?',
      description: 'Sneltoetsen tonen',
      action: onToggleShortcutsModal,
    },
  ]);

  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function ProtectedApp() {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const isLanding = !!useMatch('/');

  if (user?.needsOnboarding) {
    return (
      <Suspense fallback={<PageLoader />}>
        <OnboardingPage />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#1a1528] text-slate-100">
      {user && (
        <GlobalShortcuts
          onOpenSearch={() => setShowSearch(true)}
          onToggleShortcutsModal={() => setShowShortcuts(v => !v)}
        />
      )}
      {!isLanding && <Navbar externalShowSearch={showSearch} onExternalSearchClose={() => setShowSearch(false)} />}
      <main className={isLanding ? '' : 'pb-28 lg:pb-20'}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public landing */}
              <Route path="/" element={<LandingPage />} />

              {/* Auth pages — redirect to /muziek if already logged in */}
              <Route path="/login" element={user ? <Navigate to="/muziek" replace /> : <LoginPage />} />
              <Route path="/signup" element={user ? <Navigate to="/muziek" replace /> : <SignupPage />} />

              {/* Publicly browsable */}
              <Route path="/muziek" element={<HomePage />} />
              <Route path="/artists" element={<ArtistsPage />} />
              <Route path="/artists/:id" element={<ArtistDetailPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/magazine" element={<MagazinePage />} />
              <Route path="/magazine/:id" element={<ArticleDetailPage />} />
              <Route path="/tutorials" element={<TutorialsPage />} />
              <Route path="/tutorials/:id" element={<TutorialDetailPage />} />
              <Route path="/dutch-scene" element={<DutchScenePage />} />
              <Route path="/dutch-scene/:slug" element={<SceneDetailPage />} />
              <Route path="/venue/:id" element={<VenueDetailPage />} />
              <Route path="/forums" element={<ForumsPage />} />
              <Route path="/forums/thread/:threadId" element={<ForumThreadPage />} />

              {/* Requires login */}
              <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
              <Route path="/library/playlists/:id" element={<ProtectedRoute><PlaylistDetailPage /></ProtectedRoute>} />
              <Route path="/hub" element={<ProtectedRoute><HubPage /></ProtectedRoute>} />
              <Route path="/profiel" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profiel/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="/admin" element={user?.isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!isLanding && <MusicPlayer />}
      {!isLanding && <MobileBottomNav />}

      {/* Floating ? badge — desktop only, logged-in only */}
      {user && (
        <button
          onClick={() => setShowShortcuts(true)}
          className={`fixed bottom-24 right-5 z-50 items-center justify-center w-8 h-8 rounded-full bg-white/8 border border-white/15 text-slate-400 hover:text-white hover:bg-white/15 transition-colors text-sm font-bold ${isLanding ? 'hidden' : 'hidden lg:flex'}`}
          title="Sneltoetsen tonen (?)"
        >
          ?
        </button>
      )}

      <KeyboardShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <PlayerProvider>
        <RadioProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <PlayerUserBridge />
            <AppStateUserBridge />
            <ProtectedApp />
          </BrowserRouter>
        </ToastProvider>
        </RadioProvider>
        </PlayerProvider>
      </AppStateProvider>
    </AuthProvider>
  );
}
