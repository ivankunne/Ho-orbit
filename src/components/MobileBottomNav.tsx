import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, User, Library } from 'lucide-react';

const tabs = [
  { label: 'Ontdekken', path: '/',         icon: Home },
  { label: 'Artiesten', path: '/artists',  icon: Search },
  { label: 'Events',    path: '/events',   icon: Calendar },
  { label: 'Bibliotheek', path: '/library', icon: Library },
  { label: 'Profiel',   path: '/profiel',  icon: User },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a1528]/95 backdrop-blur-xl border-t border-white/8">
      <div className="flex items-center justify-around px-2 pt-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {tabs.map(({ label, path, icon: Icon }) => {
          const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-[44px] min-h-[44px] justify-center"
            >
              <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                active ? 'bg-violet-600/20' : ''
              }`}>
                <Icon size={20} className={active ? 'text-violet-400' : 'text-slate-500'} />
              </div>
              <span className={`text-[11px] font-medium transition-colors leading-none ${
                active ? 'text-violet-400' : 'text-slate-500'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
