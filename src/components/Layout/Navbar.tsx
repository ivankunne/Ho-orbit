import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search, Bell, ChevronDown, Menu, X,
  Upload, Home, Users, BookOpen, FileText, Globe, MessageSquare,
  Calendar, User, Settings, LogOut, Library, Sun, Moon, Zap,
  Mic2, Star, MapPin, Disc3, ExternalLink, ShieldCheck, Radio,
  Music2, Handshake, GraduationCap,
} from 'lucide-react';
import { useState as useThemeState } from 'react';
import { getTheme, toggleTheme } from '@utils/theme';
import { useAuth } from '@context/AuthContext';
import { useAuthModal } from '@context/AuthModalContext';
import UserAvatar from '@components/UserAvatar';
import { useRadio } from '@context/RadioContext';
import SearchOverlay from '../SearchOverlay';
import NotificationsPanel, { useNotificationCount } from '../NotificationsPanel';
import { getUnreadMessageCount } from '@services/chatService';

function useUnreadMessageCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) { setCount(0); return; }
    getUnreadMessageCount(userId).then(setCount);
    const interval = setInterval(() => getUnreadMessageCount(userId).then(setCount), 30000);
    return () => clearInterval(interval);
  }, [userId]);
  return count;
}

const navItems = [
  { label: 'Muziek', path: '/muziek', icon: Home },
  { label: 'Artiesten', path: '/artists', icon: Users },
  { label: 'Evenementen', path: '/events', icon: Calendar },
  { label: 'Magazine', path: '/magazine', icon: FileText },
  { label: 'Radio', path: '/radio', icon: Radio },
  { label: 'Community', path: '/dutch-scene', icon: Globe },
  { label: 'Leren', path: '/tutorials', icon: BookOpen },
];

const communityDropdown = [
  { label: 'Nederlandse Scene', sub: 'Venues & bewegingen', path: '/dutch-scene', icon: Globe },
  { label: 'Forums', sub: 'Discussie & community', path: '/forums', icon: MessageSquare },
  { label: 'Netwerken', sub: 'Samenwerken & uitwisselen', path: '/netwerken', icon: Handshake },
  { label: 'Band Space', sub: 'Werkruimte voor je band', path: '/bandspace', icon: Music2 },
];

const lerenDropdown = [
  { label: 'Tutorials', sub: 'Groei als muzikant', path: '/tutorials', icon: BookOpen },
  { label: 'Masterclass', sub: 'Van de groten leren', path: '/masterclass', icon: GraduationCap },
];

const magazineDropdown = [
  {
    label: 'h-orbit Magazine',
    sub: 'Alle artikelen & verhalen',
    path: '/magazine',
    icon: FileText,
    accent: false,
    divider: false,
  },
  {
    label: 'Interviews',
    sub: 'In gesprek met artiesten',
    path: '/magazine?cat=Interviews',
    icon: Mic2,
    accent: false,
    divider: false,
  },
  {
    label: 'Recensies',
    sub: 'Album & show reviews',
    path: '/magazine?cat=Recensies',
    icon: Star,
    accent: false,
    divider: false,
  },
  {
    label: 'Scènerapporten',
    sub: 'Updates uit de scene',
    path: '/magazine?cat=Scènerapporten',
    icon: MapPin,
    accent: false,
    divider: false,
  },
  {
    label: 'Genre Spotlights',
    sub: 'Deep dives per genre',
    path: '/magazine?cat=Genre Spotlights',
    icon: Disc3,
    accent: false,
    divider: true,
  },
  {
    label: 'h-orbit Hub',
    sub: 'Netwerk & samenwerking',
    path: '/hub',
    icon: Zap,
    accent: true,
    divider: false,
  },
];

export default function Navbar({ externalShowSearch = false, onExternalSearchClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const { isLive } = useRadio();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [magazineOpen, setMagazineOpen] = useState(false);
  const [mobileMagazineOpen, setMobileMagazineOpen] = useState(false);
  const magazineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [mobileCommunityOpen, setMobileCommunityOpen] = useState(false);
  const communityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lerenOpen, setLerenOpen] = useState(false);
  const [mobileLerenOpen, setMobileLerenOpen] = useState(false);
  const lerenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (externalShowSearch) setShowSearch(true);
  }, [externalShowSearch]);

  const unreadCount = useNotificationCount(user?.id);
  const unreadMessages = useUnreadMessageCount(user?.id);
  const [theme, setThemeState] = useThemeState(() => getTheme());

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setThemeState(next);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
  };

  const openMagazine = () => {
    if (magazineTimer.current) clearTimeout(magazineTimer.current);
    setMagazineOpen(true);
  };

  const closeMagazine = () => {
    magazineTimer.current = setTimeout(() => setMagazineOpen(false), 120);
  };

  const openCommunity = () => { if (communityTimer.current) clearTimeout(communityTimer.current); setCommunityOpen(true); };
  const closeCommunity = () => { communityTimer.current = setTimeout(() => setCommunityOpen(false), 120); };
  const openLeren = () => { if (lerenTimer.current) clearTimeout(lerenTimer.current); setLerenOpen(true); };
  const closeLeren = () => { lerenTimer.current = setTimeout(() => setLerenOpen(false), 120); };

  const isMagazineActive =
    location.pathname === '/magazine' ||
    location.pathname === '/hub' ||
    location.pathname.startsWith('/magazine/');
  const isCommunityActive = ['/dutch-scene', '/forums', '/netwerken', '/bandspace'].some(p => location.pathname.startsWith(p));
  const isLerenActive = ['/tutorials', '/masterclass'].some(p => location.pathname.startsWith(p));

  return (
    <nav className="sticky top-0 z-50 bg-[#1a1528]/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src="/H-orbit-logo.png" alt="h-orbit" className="h-9 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1 ml-4">
            {navItems.map(item => {
              if (item.label === 'Magazine') {
                return (
                  <div
                    key={item.path}
                    className="relative"
                    onMouseEnter={openMagazine}
                    onMouseLeave={closeMagazine}
                  >
                    <button
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isMagazineActive
                          ? 'bg-violet-600/15 text-violet-400'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${magazineOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {magazineOpen && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-[#1e1833] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                        {/* Arrow */}
                        <div className="absolute -top-1.5 left-5 w-3 h-3 bg-[#1e1833] border-l border-t border-white/10 rotate-45" />

                        <div className="p-1.5 pt-3">
                          {magazineDropdown.map(drop => {
                            const Icon = drop.icon;
                            return (
                              <div key={drop.path}>
                                {drop.divider && (
                                  <div className="my-1.5 border-t border-white/8" />
                                )}
                                <Link
                                  to={drop.path}
                                  onClick={() => setMagazineOpen(false)}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                                    drop.accent
                                      ? 'hover:bg-violet-600/15'
                                      : 'hover:bg-white/5'
                                  }`}
                                >
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                      drop.accent
                                        ? 'bg-violet-600/20 group-hover:bg-violet-600/30'
                                        : 'bg-white/5 group-hover:bg-white/10'
                                    }`}
                                  >
                                    <Icon
                                      size={14}
                                      className={drop.accent ? 'text-violet-400' : 'text-slate-400 group-hover:text-white'}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className={`text-sm font-medium leading-tight ${
                                        drop.accent ? 'text-violet-300' : 'text-slate-200'
                                      }`}
                                    >
                                      {drop.label}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">{drop.sub}</p>
                                  </div>
                                  {drop.accent && (
                                    <ExternalLink size={11} className="ml-auto text-violet-500/60 shrink-0" />
                                  )}
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (item.label === 'Radio') {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'bg-violet-600/15 text-violet-400'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                    {isLive && (
                      <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 rounded-full px-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                        <span className="text-[9px] font-bold text-red-400 uppercase">live</span>
                      </span>
                    )}
                  </Link>
                );
              }

              if (item.label === 'Community') {
                return (
                  <div key="community" className="relative" onMouseEnter={openCommunity} onMouseLeave={closeCommunity}>
                    <button className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isCommunityActive ? 'bg-violet-600/15 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                      Community
                      <ChevronDown size={12} className={`transition-transform duration-200 ${communityOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {communityOpen && (
                      <div className="absolute top-full left-0 mt-2 w-60 bg-[#1e1833] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                        <div className="absolute -top-1.5 left-5 w-3 h-3 bg-[#1e1833] border-l border-t border-white/10 rotate-45" />
                        <div className="p-1.5 pt-3">
                          {communityDropdown.map(drop => {
                            const Icon = drop.icon;
                            return (
                              <Link key={drop.path} to={drop.path} onClick={() => setCommunityOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors">
                                  <Icon size={14} className="text-slate-400 group-hover:text-white" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-200 leading-tight">{drop.label}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">{drop.sub}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (item.label === 'Leren') {
                return (
                  <div key="leren" className="relative" onMouseEnter={openLeren} onMouseLeave={closeLeren}>
                    <button className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isLerenActive ? 'bg-violet-600/15 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                      Leren
                      <ChevronDown size={12} className={`transition-transform duration-200 ${lerenOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {lerenOpen && (
                      <div className="absolute top-full left-0 mt-2 w-52 bg-[#1e1833] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                        <div className="absolute -top-1.5 left-5 w-3 h-3 bg-[#1e1833] border-l border-t border-white/10 rotate-45" />
                        <div className="p-1.5 pt-3">
                          {lerenDropdown.map(drop => {
                            const Icon = drop.icon;
                            return (
                              <Link key={drop.path} to={drop.path} onClick={() => setLerenOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors">
                                  <Icon size={14} className="text-slate-400 group-hover:text-white" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-200 leading-tight">{drop.label}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">{drop.sub}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-violet-600/15 text-violet-400'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Zoekknop (mobiel) */}
            <button
              onClick={() => setShowSearch(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Search size={18} />
            </button>

            {/* Uploadknop — altijd zichtbaar, route vereist login */}
            <Link
              to="/upload"
              className="hidden sm:flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Upload size={14} />
              Uploaden
            </Link>

            {user ? (
              <>
                {/* Admin knop */}
                {user.isAdmin && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ShieldCheck size={14} />
                    Admin
                  </Link>
                )}

                {/* Thema toggle */}
                <button
                  onClick={handleToggleTheme}
                  className="hidden md:block p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title={theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Meldingen */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-violet-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
                </div>

                {/* Gebruikersmenu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <UserAvatar
                      src={user.avatar}
                      name={user.displayName || user.username}
                      size={32}
                      className="ring-2 ring-violet-500/30"
                    />
                    <span className="hidden sm:block text-sm text-slate-300 font-medium">
                      {user.displayName?.split(' ')[0] || user.username}
                    </span>
                    <ChevronDown size={14} className="hidden sm:block text-slate-500" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 max-w-[calc(100vw-1rem)] bg-[#231d3a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="p-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <UserAvatar src={user.avatar} name={user.displayName || user.username} size={40} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                            <p className="text-xs text-slate-500">@{user.username}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <Link
                          to={`/profiel/${user.username}`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <User size={15} className="text-slate-500" /> Mijn profiel
                        </Link>
                        <Link
                          to="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Settings size={15} className="text-slate-500" /> Instellingen
                        </Link>
                        <Link
                          to="/library"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Library size={15} className="text-slate-500" /> Mijn bibliotheek
                        </Link>
                        <Link
                          to="/berichten"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <MessageSquare size={15} className="text-slate-500" />
                          <span className="flex-1">Berichten</span>
                          {unreadMessages > 0 && (
                            <span className="min-w-[18px] h-[18px] bg-violet-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                              {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/upload"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Upload size={15} className="text-slate-500" /> Muziek uploaden
                        </Link>
                        {user.isAdmin && (
                          <div className="border-t border-white/5 mt-1 pt-1">
                            <Link
                              to="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <ShieldCheck size={15} /> Admin Panel
                            </Link>
                          </div>
                        )}
                        <div className="border-t border-white/5 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <LogOut size={15} /> Uitloggen
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Niet ingelogd: toon login / aanmelden knoppen */
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
                >
                  Inloggen
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:scale-105"
                >
                  Aanmelden
                </button>
              </div>
            )}

            {/* Mobiel menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Zoekbalk tweede rij */}
      <div className="hidden md:flex justify-center px-4 lg:px-6 pb-4">
        <button
          onClick={() => setShowSearch(true)}
          className="w-full max-w-2xl flex items-center gap-3 bg-white/[0.06] border border-white/10 hover:border-violet-500/50 hover:bg-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:text-slate-300 transition-all duration-200 group"
        >
          <Search size={16} className="text-violet-400 shrink-0" />
          <span className="flex-1 text-left">Zoek artiesten, nummers, evenementen...</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-600 border border-white/10 rounded-md px-1.5 py-0.5 shrink-0 font-sans">⌘K</kbd>
        </button>
      </div>

      {/* Mobiel menu uitklapbaar */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#231d3a] border-t border-white/5 px-4 py-3">
          <div className="mb-3">
            <button
              onClick={() => { setMobileMenuOpen(false); setShowSearch(true); }}
              className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-500 hover:border-violet-500/40 transition-all"
            >
              <Search size={15} className="shrink-0" />
              <span>Zoeken...</span>
            </button>
          </div>
          <div className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;

              if (item.label === 'Magazine') {
                return (
                  <div key={item.path}>
                    <button
                      onClick={() => setMobileMagazineOpen(v => !v)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isMagazineActive
                          ? 'bg-violet-600/15 text-violet-400'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${mobileMagazineOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {mobileMagazineOpen && (
                      <div className="ml-3 mt-1 pl-3 border-l border-white/8 space-y-0.5">
                        {magazineDropdown.map(drop => {
                          const DropIcon = drop.icon;
                          return (
                            <div key={drop.path}>
                              {drop.divider && <div className="my-1 border-t border-white/8" />}
                              <Link
                                to={drop.path}
                                onClick={() => { setMobileMenuOpen(false); setMobileMagazineOpen(false); }}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                                  drop.accent
                                    ? 'text-violet-400 hover:bg-violet-600/10'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <DropIcon size={14} className="shrink-0" />
                                {drop.label}
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (item.label === 'Community') {
                return (
                  <div key="community">
                    <button
                      onClick={() => setMobileCommunityOpen(v => !v)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isCommunityActive ? 'bg-violet-600/15 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <Globe size={16} />
                      <span className="flex-1 text-left">Community</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${mobileCommunityOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileCommunityOpen && (
                      <div className="ml-3 mt-1 pl-3 border-l border-white/8 space-y-0.5">
                        {communityDropdown.map(drop => {
                          const DropIcon = drop.icon;
                          return (
                            <Link key={drop.path} to={drop.path}
                              onClick={() => { setMobileMenuOpen(false); setMobileCommunityOpen(false); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                              <DropIcon size={14} className="shrink-0" />
                              {drop.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (item.label === 'Leren') {
                return (
                  <div key="leren">
                    <button
                      onClick={() => setMobileLerenOpen(v => !v)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isLerenActive ? 'bg-violet-600/15 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <BookOpen size={16} />
                      <span className="flex-1 text-left">Leren</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${mobileLerenOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileLerenOpen && (
                      <div className="ml-3 mt-1 pl-3 border-l border-white/8 space-y-0.5">
                        {lerenDropdown.map(drop => {
                          const DropIcon = drop.icon;
                          return (
                            <Link key={drop.path} to={drop.path}
                              onClick={() => { setMobileMenuOpen(false); setMobileLerenOpen(false); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                              <DropIcon size={14} className="shrink-0" />
                              {drop.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-violet-600/15 text-violet-400'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.label === 'Radio' && isLive && (
                    <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 rounded-full px-1.5 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                      <span className="text-[9px] font-bold text-red-400 uppercase">live</span>
                    </span>
                  )}
                </Link>
              );
            })}
            {user ? (
              <>
                <Link
                  to="/profiel"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <User size={16} /> Mijn profiel
                </Link>
                <Link
                  to="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Library size={16} /> Mijn bibliotheek
                </Link>
                <Link
                  to="/berichten"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <MessageSquare size={16} />
                  <span className="flex-1">Berichten</span>
                  {unreadMessages > 0 && (
                    <span className="min-w-[18px] h-[18px] bg-violet-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  to="/upload"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-violet-600 text-white mt-2"
                >
                  <Upload size={16} />
                  Muziek uploaden
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-colors mt-1"
                >
                  <LogOut size={16} /> Uitloggen
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => { setMobileMenuOpen(false); openAuthModal('login'); }}
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
                >
                  Inloggen
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); openAuthModal('signup'); }}
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                >
                  Gratis aanmelden
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showSearch && (
        <SearchOverlay onClose={() => {
          setShowSearch(false);
          onExternalSearchClose?.();
        }} />
      )}
    </nav>
  );
}
