import { Link, useLocation } from 'react-router-dom';
import { Home, Users, User, Zap, MessageSquare } from 'lucide-react';
import { useAuth } from '@context/AuthContext';

const tabs = [
  { label: 'Ontdekken', path: '/muziek',    icon: Home },
  { label: 'Band',      path: '/bandspace', icon: Users },
  { label: 'Hub',       path: '/hub',       icon: Zap,           accent: true },
  { label: 'Berichten', path: '/berichten', icon: MessageSquare },
  { label: 'Profiel',   path: '/profiel',   icon: User },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a1528]/95 backdrop-blur-xl border-t border-white/8">
      <div className="flex items-center px-1 pt-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {tabs.map(({ label, path, icon: Icon, accent }) => {
          const resolvedPath = path === '/profiel' && user?.username ? `/profiel/${user.username}` : path;
          const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
          if (accent) {
            return (
              <Link
                key={path}
                to={resolvedPath}
                className="flex-1 flex flex-col items-center gap-0.5 py-1 min-h-[44px] justify-center"
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  active ? 'bg-amber-400 shadow-lg shadow-amber-400/30' : 'bg-amber-400/15 border border-amber-400/30'
                }`}>
                  <Icon size={20} className={active ? 'text-[#1a1528]' : 'text-amber-400'} />
                </div>
                <span className={`text-[11px] font-semibold transition-colors leading-none ${
                  active ? 'text-amber-400' : 'text-amber-400/70'
                }`}>
                  {label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={path}
              to={resolvedPath}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl transition-all min-h-[44px] justify-center"
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
