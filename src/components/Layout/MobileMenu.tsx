import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  Search, ChevronDown, User, Library, MessageSquare, Upload, LogOut, ChevronRight,
} from 'lucide-react';
import { navItems, communityDropdown, lerenDropdown, communityPaths, lerenPaths } from './navConfig';

/** Zo lang duurt de sluitanimatie; pas daarna verdwijnt het menu uit de DOM. */
const EXIT_MS = 320;

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  /** De hamburgerknop — krijgt de focus terug zodra het menu dicht is. */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  user: { username?: string; displayName?: string } | null;
  unreadMessages: number;
  isLive: boolean;
  onSearch: () => void;
  onLogout: () => void;
  onAuth: (tab: 'login' | 'signup') => void;
  onUpload: (e: React.MouseEvent) => void;
}

/**
 * Het mobiele menu, schermvullend.
 *
 * Staat via een portal direct onder <body> en níet binnen de <nav>: die heeft
 * backdrop-blur, en een element met een backdrop-filter wordt het
 * "containing block" voor elke position:fixed daarbinnen. Een inset-0 overlay
 * in de nav zou dus precies zo groot worden als de navbalk zelf, niet als het
 * scherm.
 *
 * Het menu blijft na het sluiten nog EXIT_MS in de DOM hangen zodat de
 * uitgaande animatie kan afspelen; `visible` stuurt de overgangen, `mounted`
 * of het er überhaupt is.
 */
export default function MobileMenu({
  open, onClose, returnFocusRef, user, unreadMessages, isLive,
  onSearch, onLogout, onAuth, onUpload,
}: MobileMenuProps) {
  const location = useLocation();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [section, setSection] = useState<'community' | 'leren' | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mount → volgende frame zichtbaar maken (anders is er geen beginstand om
  // vanaf te animeren). Sluiten → eerst uitfaden, dan pas unmounten.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => { setMounted(false); setSection(null); }, EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Pagina eronder niet laten meescrollen.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  // Focus naar de sluitknop bij openen, terug naar de hamburger bij sluiten.
  useEffect(() => {
    if (visible) closeRef.current?.focus({ preventScroll: true });
  }, [visible]);
  useEffect(() => {
    if (!open && mounted) returnFocusRef.current?.focus({ preventScroll: true });
  }, [open, mounted, returnFocusRef]);

  // Escape sluit; Tab blijft binnen het menu (het is een modaal venster).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Navigeren sluit het menu — ook via de terugknop van de browser.
  const firstPath = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname !== firstPath.current) {
      firstPath.current = location.pathname;
      onClose();
    }
  }, [location.pathname, onClose]);

  // Telefoon gedraaid of venster breder gemaakt: op desktop hoort dit menu niet.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => { if (mq.matches) onClose(); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [open, onClose]);

  if (!mounted) return null;

  // Elk item schuift iets later binnen dan het vorige. Bij sluiten gaat alles
  // tegelijk weg — een getrapte uitgang voelt traag.
  let order = 0;
  const stagger = () => {
    const i = order++;
    return {
      className: `transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`,
      style: { transitionDelay: visible ? `${140 + i * 35}ms` : '0ms' },
    };
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const rowBase =
    'group flex items-center gap-4 w-full min-h-[52px] px-4 rounded-2xl text-[17px] font-semibold transition-colors';
  const rowIdle = 'text-slate-200 hover:bg-white/[0.06] active:bg-white/10';
  const rowActive = 'bg-violet-600/20 text-white';

  const renderSection = (key: 'community' | 'leren', label: string, Icon: typeof Search, items: typeof communityDropdown, activePaths: string[]) => {
    const expanded = section === key;
    const active = activePaths.some(p => location.pathname.startsWith(p));
    const s = stagger();
    return (
      <li key={key} className={s.className} style={s.style}>
        <button
          type="button"
          onClick={() => setSection(expanded ? null : key)}
          aria-expanded={expanded}
          className={`${rowBase} ${active ? rowActive : rowIdle}`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-violet-500/30 text-violet-200' : 'bg-white/[0.06] text-violet-300'}`}>
            <Icon size={18} />
          </span>
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown
            size={18}
            className={`text-slate-500 transition-transform duration-300 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {/* grid-rows 0fr → 1fr: een soepele hoogte-animatie zonder de hoogte
            van de inhoud te hoeven meten. */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden" aria-hidden={!expanded}>
            <ul className="ml-[34px] mt-1 mb-2 space-y-1 border-l border-white/10 pl-4">
              {items.map(drop => {
                const DropIcon = drop.icon;
                return (
                  <li key={drop.path}>
                    <Link
                      to={drop.path}
                      onClick={onClose}
                      tabIndex={expanded ? 0 : -1}
                      className={`flex items-center gap-3 min-h-[48px] px-3 rounded-xl transition-colors ${
                        isActive(drop.path) ? 'bg-white/[0.08] text-white' : 'text-slate-300 hover:bg-white/[0.05] active:bg-white/10'
                      }`}
                    >
                      <DropIcon size={16} className="shrink-0 text-violet-300" />
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold leading-tight">{drop.label}</span>
                        <span className="block text-xs text-slate-500 leading-tight mt-0.5">{drop.sub}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </li>
    );
  };

  return createPortal(
    <div
      id="mobiel-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      // Het héle paneel — achtergrond én inhoud — zakt als één gordijn van
      // boven in. Stond de clip alleen op de achtergrond, dan verschenen logo,
      // kruisje en zoekveld al vóór hun achtergrond en zweefden ze even over
      // de banners van de pagina eronder.
      className={`lg:hidden fixed inset-0 z-[150] transition-[clip-path] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        visible ? '[clip-path:inset(0_0_0_0)]' : '[clip-path:inset(0_0_100%_0)]'
      }`}
    >
      {/* Achtergrond: donker vlak met de merkgloed. */}
      <div className="absolute inset-0 bg-[#140f22]">
        <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/15 blur-3xl" />
      </div>

      <div ref={panelRef} className="relative flex h-full flex-col">
        {/* Kopregel met dezelfde hoogte als de navbalk. */}
        <div
          className="shrink-0 px-4"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex h-16 items-center justify-between">
            <Link to="/" onClick={onClose} className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
              <img src="/H-orbit-logo.png" alt="H-orbit" className="h-9 w-auto" />
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Menu sluiten"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              {/* Twee streepjes die van hamburger naar kruis draaien. */}
              <span aria-hidden className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${visible ? 'rotate-45' : '-translate-y-1.5'}`} />
              <span aria-hidden className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${visible ? '-rotate-45' : 'translate-y-1.5'}`} />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          {(() => {
            const s = stagger();
            return (
              <button
                type="button"
                onClick={() => { onClose(); onSearch(); }}
                className={`mt-2 mb-5 flex w-full items-center gap-3 min-h-[52px] rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-[15px] text-slate-400 hover:border-violet-500/40 active:bg-white/10 transition-colors ${s.className}`}
                style={s.style}
              >
                <Search size={18} className="shrink-0 text-violet-300" />
                <span className="min-w-0 flex-1 truncate text-left">Zoek artiesten, nummers, evenementen…</span>
              </button>
            );
          })()}

          <nav aria-label="Hoofdmenu">
            <ul className="space-y-1">
              {navItems.map(item => {
                if (item.label === 'Community') {
                  return renderSection('community', 'Community', item.icon, communityDropdown, communityPaths);
                }
                if (item.label === 'Leren') {
                  return renderSection('leren', 'Leren', item.icon, lerenDropdown, lerenPaths);
                }
                const Icon = item.icon;
                const active = isActive(item.path);
                const s = stagger();
                return (
                  <li key={item.path} className={s.className} style={s.style}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={`${rowBase} ${active ? rowActive : rowIdle}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-violet-500/30 text-violet-200' : 'bg-white/[0.06] text-violet-300'}`}>
                        <Icon size={18} />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.label === 'Radio' && isLive ? (
                        <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-red-300">live</span>
                        </span>
                      ) : (
                        <ChevronRight size={16} className="text-slate-600 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="my-5 h-px bg-white/[0.08]" />

          {user ? (
            <ul className="space-y-1">
              {[
                { to: '/profiel', label: 'Mijn profiel', Icon: User },
                { to: '/library', label: 'Mijn bibliotheek', Icon: Library },
                { to: '/berichten', label: 'Berichten', Icon: MessageSquare, badge: unreadMessages },
              ].map(({ to, label, Icon, badge }) => {
                const s = stagger();
                return (
                  <li key={to} className={s.className} style={s.style}>
                    <Link to={to} onClick={onClose} className={`${rowBase} ${isActive(to) ? rowActive : rowIdle}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-slate-300">
                        <Icon size={18} />
                      </span>
                      <span className="flex-1">{label}</span>
                      {!!badge && badge > 0 && (
                        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-xs font-bold text-white">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              {(() => {
                const s = stagger();
                return (
                  <li className={`pt-3 ${s.className}`} style={s.style}>
                    <Link
                      to="/upload"
                      onClick={(e) => { onClose(); onUpload(e); }}
                      className="flex w-full items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-violet-600 text-[16px] font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 active:scale-[0.98] transition-[background-color,transform]"
                    >
                      <Upload size={18} /> Muziek uploaden
                    </Link>
                  </li>
                );
              })()}
              {(() => {
                const s = stagger();
                return (
                  <li className={s.className} style={s.style}>
                    <button
                      type="button"
                      onClick={() => { onClose(); onLogout(); }}
                      className="flex w-full items-center justify-center gap-2 min-h-[48px] rounded-2xl text-[15px] font-medium text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
                    >
                      <LogOut size={16} /> Uitloggen
                    </button>
                  </li>
                );
              })()}
            </ul>
          ) : (
            (() => {
              const s = stagger();
              return (
                <div className={`rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 p-5 ${s.className}`} style={s.style}>
                  <p className="text-[17px] font-bold text-white">Doe mee met H-orbit</p>
                  <p className="mt-1 text-sm text-slate-300">Upload je muziek, volg artiesten en vind je band. Gratis.</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { onClose(); onAuth('login'); }}
                      className="min-h-[48px] rounded-xl border border-white/15 text-[15px] font-semibold text-slate-200 hover:bg-white/5 active:bg-white/10 transition-colors"
                    >
                      Inloggen
                    </button>
                    <button
                      type="button"
                      onClick={() => { onClose(); onAuth('signup'); }}
                      className="min-h-[48px] rounded-xl bg-violet-600 text-[15px] font-semibold text-white hover:bg-violet-500 active:scale-[0.98] transition-[background-color,transform]"
                    >
                      Aanmelden
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
