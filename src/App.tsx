import { BrowserRouter, Routes, Route, Navigate, useLocation, useMatch } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { PaywallProvider } from '@context/PaywallContext';
import { AuthModalProvider } from '@context/AuthModalContext';
import AuthModal from '@components/AuthModal';
import { UpgradeModalProvider } from '@context/UpgradeModalContext';
import UpgradeModal from '@components/UpgradeModal';
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
import AiPolicyBanner from '@components/AiPolicyBanner';
import PaywallAnnouncementBanner from '@components/PaywallAnnouncementBanner';
import PaymentFailedBanner from '@components/PaymentFailedBanner';
import PageLoader from '@components/PageLoader';
import RequirePlan from '@components/RequirePlan';
import RouteSeo from '@components/RouteSeo';

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
const SceneLocationDetailPage = lazy(() => import('@pages/SceneLocationDetailPage'));
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
const AdminPage = lazy(() => import('@pages/AdminPage'));
const AdminLoginPage = lazy(() => import('@pages/AdminLoginPage'));
const RadioPage = lazy(() => import('@pages/RadioPage'));
const PodcastsPage = lazy(() => import('@pages/PodcastsPage'));
const PodcastDetailPage = lazy(() => import('@pages/PodcastDetailPage'));
const DropYourDemoPage = lazy(() => import('@pages/DropYourDemoPage'));
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

// /login en /signup blijven bestaan als volwaardige pagina's (deeplinks,
// e-mails, wachtwoordherstel). Ben je al ingelogd, dan heb je er niets te
// zoeken en ga je door naar waar je heen wilde.
function AuthRoute({ tab }: { tab: 'login' | 'signup' }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from || '/'} replace />;
  }
  return <AuthPage initialTab={tab} />;
}

/**
 * Voor je eigen hoekjes van de app: bibliotheek, berichten, account, uploads,
 * BandSpace. Daar valt uitgelogd niets te bekijken — er ís geen inhoud zonder
 * account — dus dat blijft een harde grens.
 *
 * De rest van de app is bewust wél vrij te doorlopen: alles wat inhoud toont
 * (muziek, artiesten, de scene, forums, agenda) staat open, en pas zodra je
 * iets wilt dóén verschijnt het inlogvenster. Die gate zit in de actie zelf
 * (zie useRequireAuth), niet in de route.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) {
    // Onthoud de bestemming zodat we er na het inloggen naartoe kunnen sturen.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
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
  // '/' hoort daar sinds de open homepage níét meer bij — dat is nu gewoon de
  // startpagina, mét navigatie, ook voor wie niet is ingelogd.
  // Elke useMatch onvoorwaardelijk aanroepen — met || ertussen zou React's
  // hook-volgorde breken zodra de route wisselt (error #310, wit scherm).
  const matchLogin = useMatch('/login');
  const matchSignup = useMatch('/signup');
  const isLanding = !!(matchLogin || matchSignup);
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
      {!isLanding && !isRiderShare && <PaymentFailedBanner />}
      {!isLanding && !isRiderShare && <PaywallAnnouncementBanner />}
      {!isLanding && !isRiderShare && <AiPolicyBanner />}
      {!isLanding && !isRiderShare && <Navbar externalShowSearch={showSearch} onExternalSearchClose={() => setShowSearch(false)} onMobileMenuChange={setMobileMenuOpen} />}
      <main className={isLanding || isRiderShare ? '' : isWorkspace ? 'flex flex-col' : 'pb-28 lg:pb-20 flex flex-col'}>
        <RouteSeo />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Open voor iedereen ───────────────────────────────────
                  Rondkijken kan zonder account; pas bij een handeling
                  (afspelen, liken, reageren) komt het inlogvenster. */}
              <Route path="/" element={<HomePage />} />
              {/* Oude startpagina — samengevoegd met '/' zodat er één
                  homepage-URL overblijft in plaats van twee identieke. */}
              <Route path="/muziek" element={<Navigate to="/" replace />} />
              <Route path="/artists" element={<ArtistsPage />} />
              <Route path="/artists/:slug" element={<ArtistDetailPage />} />
              <Route path="/albums/:id" element={<AlbumDetailPage />} />
              <Route path="/radio" element={<RadioPage />} />
              <Route path="/podcasts" element={<PodcastsPage />} />
              <Route path="/podcasts/:id" element={<PodcastDetailPage />} />
              <Route path="/magazine" element={<MagazinePage />} />
              <Route path="/magazine/:id" element={<ArticleDetailPage />} />
              <Route path="/tutorials" element={<TutorialsPage />} />
              <Route path="/tutorials/:id" element={<TutorialDetailPage />} />
              <Route path="/dutch-scene" element={<DutchScenePage />} />
              <Route path="/dutch-scene/locatie/:id" element={<SceneLocationDetailPage />} />
              <Route path="/dutch-scene/:slug" element={<SceneDetailPage />} />
              <Route path="/forums" element={<ForumsPage />} />
              <Route path="/forums/thread/:threadId" element={<ForumThreadPage />} />
              <Route path="/masterclass" element={<MasterclassPage />} />
              <Route path="/drop-your-demo" element={<DropYourDemoPage />} />
              {/* Pro-onderdelen: de lijst is te bekijken, de handelingen erin
                  (aanmelden, plaatsen, contact opnemen) vragen een abonnement.
                  Zie useRequirePlan — geen RequirePlan om de route heen, want
                  dat zou de pagina in zijn geheel wegnemen. */}
              <Route path="/netwerken"   element={<NetworkingPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/venue/:id" element={<VenueDetailPage />} />

              {/* Inloggen/registreren als losse pagina */}
              <Route path="/login" element={<AuthRoute tab="login" />} />
              <Route path="/signup" element={<AuthRoute tab="signup" />} />

              {/* Publiek — nodig zonder account */}
              <Route path="/wachtwoord-herstellen" element={<ResetPasswordPage />} />
              <Route path="/bandspace/join/:token" element={<JoinBandPage />} />
              <Route path="/rider/:token" element={<PublicRiderPage />} />
              <Route path="/privacy"     element={<PrivacyPage />} />
              <Route path="/voorwaarden" element={<TermsPage />} />
              <Route path="/cookies"     element={<CookiesPage />} />
              <Route path="/admin" element={<AdminGate />} />

              {/* ── Je eigen omgeving: zonder account valt hier niets te zien ── */}
              <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
              <Route path="/library/playlists/:id" element={<ProtectedRoute><PlaylistDetailPage /></ProtectedRoute>} />
              <Route path="/profiel" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profiel/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="/berichten" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/berichten/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
              <Route path="/bandspace" element={<ProtectedRoute><RequirePlan title="BandSpace is een Pro-functie" description="Upgrade naar H-orbit Pro om je band-workspace te gebruiken."><BandSpacePage /></RequirePlan></ProtectedRoute>} />
              <Route path="/bandspace/:id" element={<ProtectedRoute><RequirePlan title="BandSpace is een Pro-functie" description="Upgrade naar H-orbit Pro om je band-workspace te gebruiken."><BandSpaceDetailPage /></RequirePlan></ProtectedRoute>} />

              {/* Onbekende URL's tonen gewoon een 404 — ook uitgelogd. */}
              <Route path="*" element={<NotFoundPage />} />
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
      <UpgradeModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      {/* Staat bewust boven de overige providers: PlayerContext en
          AppStateContext openen het inlogvenster zodra een uitgelogde
          bezoeker iets probeert te doen, dus zij moeten erbij kunnen. */}
      <AuthModalProvider>
      <UpgradeModalProvider>
      <PaywallProvider>
      <AppStateProvider>
        <GenreProvider>
        <PlayerProvider>
        <RadioProvider>
        <PodcastProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <PlayerUserBridge />
            <AppStateUserBridge />
            <ProtectedApp />
          </BrowserRouter>
        </ToastProvider>
        </PodcastProvider>
        </RadioProvider>
        </PlayerProvider>
        </GenreProvider>
      </AppStateProvider>
      </PaywallProvider>
      </UpgradeModalProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}
