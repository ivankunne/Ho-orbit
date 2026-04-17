import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Music, Search, Bell, ChevronDown, Menu, X,
  Upload, Home, Users, BookOpen, FileText, Globe, MessageSquare,
  Calendar, User, Settings, LogOut, Library, Sun, Moon, Zap
} from 'lucide-react';
import { useState as useThemeState } from 'react';
import { getTheme, toggleTheme } from '@utils/theme';
import { useAuth } from '@context/AuthContext';
import SearchOverlay from '../SearchOverlay';
import NotificationsPanel, { useNotificationCount } from '../NotificationsPanel';

const navItems = [
  { label: 'Muziek', path: '/muziek', icon: Home },
  { label: 'Artiesten', path: '/artists', icon: Users },
  { label: 'Evenementen', path: '/events', icon: Calendar },
  { label: 'Magazine', path: '/magazine', icon: FileText },
  { label: 'Tutorials', path: '/tutorials', icon: BookOpen },
  { label: 'Nederlandse Scene', path: '/dutch-scene', icon: Globe },
  { label: 'Forums', path: '/forums', icon: MessageSquare },
  // { label: 'Musician Network', path: '/hub', icon: Zap }, // Hidden for now
];

export default function Navbar({ externalShowSearch = false, onExternalSearchClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Allow App-level shortcuts to open search
  useEffect(() => {
    if (externalShowSearch) setShowSearch(true);
  }, [externalShowSearch]);
  const unreadCount = useNotificationCount(user?.id);
  const [theme, setThemeState] = useThemeState(() => getTheme());

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setThemeState(next);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#1a1528]/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link to="/muziek" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Music size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">h-orbit</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1 ml-4">
            {navItems.map(item => (
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
            ))}
          </div>


          <div className="flex items-center gap-2 ml-auto">
            {/* Zoekknop (mobiel) */}
            <button
              onClick={() => setShowSearch(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Search size={18} />
            </button>

            {/* Uploadknop */}
            <Link
              to="/upload"
              className="hidden sm:flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Upload size={14} />
              Uploaden
            </Link>

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
                <img
                  src={user?.avatar}
                  alt={user?.displayName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-violet-500/30"
                />
                <span className="hidden sm:block text-sm text-slate-300 font-medium">
                  {user?.displayName?.split(' ')[0] || user?.username}
                </span>
                <ChevronDown size={14} className="hidden sm:block text-slate-500" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 max-w-[calc(100vw-1rem)] bg-[#231d3a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  {/* Gebruikersinfo */}
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={user?.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user?.displayName}</p>
                        <p className="text-xs text-slate-500">@{user?.username}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menuopties */}
                  <div className="p-2">
                    <Link
                      to={`/profiel/${user?.username}`}
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
                      to="/upload"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Upload size={15} className="text-slate-500" /> Muziek uploaden
                    </Link>
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

            {/* Mobiel menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Zoekbalk tweede rij — tablet en desktop */}
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
                  {item.label}
                </Link>
              );
            })}
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
