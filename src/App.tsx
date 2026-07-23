import { BrowserRouter, Routes, Route, Navigate, useLocation, useMatch } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { AuthModalProvider } from '@context/AuthModalContext';
import AuthModal from '@components/AuthModal';
import { RadioProvider } from '@context/RadioContext';
import { PodcastProvider } from '@context/PodcastContext';
import { AppStateProvider, useAppState } from '@context/AppStateContext';
import { PlayerProvider, usePlayer } from '@context/PlayerContext';
import { GenreProvider } from '@context/GenreContext';
import { ToastProvider } from '@components/Toast';
import MusicPlayer from '@components/MusicPlayer';
import MobileBottomNav from '@components/MobileBottomNav';
import ErrorBoundary from '@components/ErrorBoundary';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import KeyboardShortcutsModal from '@components/KeyboardShortcutsModal';
import Navbar from '@components/Layout/Navbar';
import Footer from '@components/Layout/Footer';
import InviteResumer from '@components/InviteResumer';
import InstallPrompt from '@components/InstallPrompt';
import PushPrompt from '@components/PushPrompt';

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
const AlbumDetailPage = lazy(() => import('@pages/AlbumDetailPage'));
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
const OnboardingPage = lazy(() => import('@pages/OnboardingPage'));
const AuthPage = lazy(() => import('@pages/auth/AuthPage'));
const HubPage = lazy(() => import('@pages/HubPage'));
const AdminPage = lazy(() => import('@pages/AdminPage'));
const AdminLoginPage = lazy(() => import('@pages/AdminLoginPage'));
const RadioPage = lazy(() => import('@pages/RadioPage'));
const PodcastsPage = lazy(() => import('@pages/PodcastsPage'));
const PodcastDetailPage = lazy(() => import('@pages/PodcastDetailPage'));
const MessagesPage = lazy(() => import('@pages/MessagesPage'));
const ConversationPage = lazy(() => import('@pages/ConversationPage'));
const BandSpacePage = lazy(() => import('@pages/BandSpacePage'));
const BandSpaceDetailPage = lazy(() => import('@pages/BandSpaceDetailPage'));
const JoinBandPage = lazy(() => import('@pages/JoinBandPage'));
const PublicRiderPage = lazy(() => import('@pages/PublicRiderPage'));
const NetworkingPage = lazy(() => import('@pages/NetworkingPage'));
const MasterclassPage = lazy(() => import('@pages/MasterclassPage'));
const PrivacyPage     = lazy(() => import('@pages/legal/PrivacyPage'));
const TermsPage       = lazy(() => import('@pages/legal/TermsPage'));
const CookiesPage     = lazy(() => import('@pages/legal/CookiesPage'));
const ResetPasswordPage = lazy(() => import('@pages/auth/ResetPasswordPage'));

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

// Root: uitgelogd → inlog-/registratiescherm; ingelogd → door naar de app
// (of naar de pagina waar de bezoeker oorspronkelijk heen wilde).
function RootGate({ tab }: { tab?: 'login' | 'signup' }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from || '/muziek'} replace />;
  }
  return <AuthPage initialTab={tab ?? 'login'} />;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) {
    // Onthoud de bestemming zodat we er na het inloggen naartoe kunnen sturen.
    return <Navigate to="/" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

// Gate for /admin: show a real admin login screen instead of silently bouncing
// non-admins to the homepage. Admins (incl. the hardcoded master account) get the panel.
function AdminGate() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user?.isAdmin ? <AdminPage /> : <AdminLoginPage />;
}

function ProtectedApp() {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Het inlog-/registratiescherm is chroomloos: geen navbar, footer of speler.
  // Elke useMatch onvoorwaardelijk aanroepen — met || ertussen zou React's
  // hook-volgorde breken zodra de route wisselt (error #310, wit scherm).
  const matchRoot = useMatch('/');
  const matchLogin = useMatch('/login');
  const matchSignup = useMatch('/signup');
  const isLanding = !!(matchRoot || matchLogin || matchSignup);
  // The band workspace is a full-height app shell with its own internal scroll.
  // Drop the page footer + bottom padding here so the window doesn't scroll on
  // top of it (which produced a nested scrollbar).
  const isWorkspace = !!useMatch('/bandspace/:id');
  // Public rider share page: same "no login, no app chrome" treatment as the
  // invite landing page — external, logged-out visitors land here directly.
  const isRiderShare = !!useMatch('/rider/:token');

  if (user?.needsOnboarding && sessionStorage.getItem('ho_show_onboarding') === 'true') {
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
      {!isLanding && !isRiderShare && <Navbar externalShowSearch={showSearch} onExternalSearchClose={() => setShowSearch(false)} onMobileMenuChange={setMobileMenuOpen} />}
      <main className={isLanding || isRiderShare ? '' : isWorkspace ? 'flex flex-col' : 'pb-28 lg:pb-20 flex flex-col'}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Inlog-/registratiescherm — het startpunt voor uitgelogde bezoekers */}
              <Route path="/" element={<RootGate />} />
              <Route path="/login" element={<RootGate tab="login" />} />
              <Route path="/signup" element={<RootGate tab="signup" />} />

              {/* Publiek — nodig zonder account */}
              <Route path="/wachtwoord-herstellen" element={<ResetPasswordPage />} />
              <Route path="/bandspace/join/:token" element={<JoinBandPage />} />
              <Route path="/rider/:token" element={<PublicRiderPage />} />
              <Route path="/privacy"     element={<PrivacyPage />} />
              <Route path="/voorwaarden" element={<TermsPage />} />
              <Route path="/cookies"     element={<CookiesPage />} />
              <Route path="/admin" element={<AdminGate />} />

              {/* Alles hieronder vereist een account */}
              <Route path="/radio" element={<ProtectedRoute><RadioPage /></ProtectedRoute>} />
              <Route path="/podcasts" element={<ProtectedRoute><PodcastsPage /></ProtectedRoute>} />
              <Route path="/podcasts/:id" element={<ProtectedRoute><PodcastDetailPage /></ProtectedRoute>} />
              <Route path="/muziek" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/artists" element={<ProtectedRoute><ArtistsPage /></ProtectedRoute>} />
              <Route path="/artists/:slug" element={<ProtectedRoute><ArtistDetailPage /></ProtectedRoute>} />
              <Route path="/albums/:id" element={<ProtectedRoute><AlbumDetailPage /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
              <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
              <Route path="/magazine" element={<ProtectedRoute><MagazinePage /></ProtectedRoute>} />
              <Route path="/magazine/:id" element={<ProtectedRoute><ArticleDetailPage /></ProtectedRoute>} />
              <Route path="/tutorials" element={<ProtectedRoute><TutorialsPage /></ProtectedRoute>} />
              <Route path="/tutorials/:id" element={<ProtectedRoute><TutorialDetailPage /></ProtectedRoute>} />
              <Route path="/dutch-scene" element={<ProtectedRoute><DutchScenePage /></ProtectedRoute>} />
              <Route path="/dutch-scene/:slug" element={<ProtectedRoute><SceneDetailPage /></ProtectedRoute>} />
              <Route path="/venue/:id" element={<ProtectedRoute><VenueDetailPage /></ProtectedRoute>} />
              <Route path="/forums" element={<ProtectedRoute><ForumsPage /></ProtectedRoute>} />
              <Route path="/forums/thread/:threadId" element={<ProtectedRoute><ForumThreadPage /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
              <Route path="/library/playlists/:id" element={<ProtectedRoute><PlaylistDetailPage /></ProtectedRoute>} />
              <Route path="/hub" element={<ProtectedRoute><HubPage /></ProtectedRoute>} />
              <Route path="/profiel" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profiel/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="/berichten" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/berichten/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
              <Route path="/bandspace" element={<ProtectedRoute><BandSpacePage /></ProtectedRoute>} />
              <Route path="/bandspace/:id" element={<ProtectedRoute><BandSpaceDetailPage /></ProtectedRoute>} />
              <Route path="/netwerken"   element={<ProtectedRoute><NetworkingPage /></ProtectedRoute>} />
              <Route path="/masterclass" element={<ProtectedRoute><MasterclassPage /></ProtectedRoute>} />

              {/* Onbekende URL's: uitgelogd → inlogscherm, ingelogd → 404 */}
              <Route path="*" element={<ProtectedRoute><NotFoundPage /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        {!isLanding && !isWorkspace && !isRiderShare && <Footer />}
      </main>
      {!isLanding && !isRiderShare && <MusicPlayer hidden={mobileMenuOpen} />}
      {!isLanding && !isRiderShare && <MobileBottomNav />}

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
      <InviteResumer />
      <InstallPrompt />
      <PushPrompt />
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <GenreProvider>
        <PlayerProvider>
        <RadioProvider>
        <PodcastProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthModalProvider>
              <ScrollToTop />
              <PlayerUserBridge />
              <AppStateUserBridge />
              <ProtectedApp />
            </AuthModalProvider>
          </BrowserRouter>
        </ToastProvider>
        </PodcastProvider>
        </RadioProvider>
        </PlayerProvider>
        </GenreProvider>
      </AppStateProvider>
    </AuthProvider>
  );
}
