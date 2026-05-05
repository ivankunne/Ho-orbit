import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Music, Users, Calendar, FileText, BookOpen,
  Globe, MessageSquare, Upload, ChevronRight, Radio,
} from 'lucide-react';
import { useRadio } from '@context/RadioContext';

const tiles = [
  {
    area: 'a',
    label: 'Muziek',
    sub: 'Ontdek · Luister · Beleef',
    path: '/muziek',
    Icon: Music,
    color: '#7c3aed',
    featured: true,
  },
  {
    area: 'b',
    label: 'Artiesten',
    sub: 'Vind je nieuwe favorieten',
    path: '/artists',
    Icon: Users,
    color: '#3b82f6',
    featured: false,
  },
  {
    area: 'c',
    label: 'Evenementen',
    sub: 'Shows & festivals',
    path: '/events',
    Icon: Calendar,
    color: '#f59e0b',
    featured: false,
  },
  {
    area: 'd',
    label: 'Magazine',
    sub: 'Verhalen uit de scene',
    path: '/magazine',
    Icon: FileText,
    color: '#ec4899',
    featured: false,
  },
  {
    area: 'e',
    label: 'Tutorials',
    sub: 'Groei als muzikant',
    path: '/tutorials',
    Icon: BookOpen,
    color: '#10b981',
    featured: false,
  },
  {
    area: 'f',
    label: 'Nederlandse Scene',
    sub: 'Verken steden, venues & bewegingen',
    path: '/dutch-scene',
    Icon: Globe,
    color: '#06b6d4',
    featured: false,
  },
  {
    area: 'g',
    label: 'Forums',
    sub: 'Praat mee met de community',
    path: '/forums',
    Icon: MessageSquare,
    color: '#a855f7',
    featured: false,
  },
  {
    area: 'h',
    label: 'Uploaden',
    sub: 'Deel je muziek',
    path: '/upload',
    Icon: Upload,
    color: '#f97316',
    featured: false,
  },
] as const;

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { isLive } = useRadio();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col relative bg-[#0c0916]">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-700/12 blur-[100px] animate-pulse"
          style={{ animationDuration: '6s' }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-900/15 blur-[90px] animate-pulse"
          style={{ animationDuration: '8s', animationDelay: '2s' }}
        />
        <div
          className="absolute top-1/3 -right-20 w-[300px] h-[300px] rounded-full bg-amber-600/8 blur-[80px] animate-pulse"
          style={{ animationDuration: '10s', animationDelay: '4s' }}
        />
      </div>

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Logo */}
      <div
        className={`relative z-10 shrink-0 flex items-center gap-2 px-5 py-4 transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
          <Music size={16} className="text-white" />
        </div>
        <span className="font-bold text-white tracking-tight">h-orbit</span>
      </div>

      {/* Bento grid */}
      <div className="relative z-10 flex-1 min-h-0 grid gap-2 px-3 pb-3 grid-cols-2 md:px-5 md:pb-5 md:gap-3 landing-grid">
        {/* Radio tile — area i */}
        {(() => {
          const color = '#ef4444';
          return (
            <Link
              to="/radio"
              className={`
                landing-tile-i
                group relative flex flex-col justify-end
                rounded-2xl overflow-hidden border
                p-4 md:p-5 min-h-[140px] md:min-h-0
                transition-all duration-700 ease-out
                hover:scale-[1.012] hover:z-10
                ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
              `}
              style={{
                background: `linear-gradient(145deg, ${color}1e 0%, rgba(12, 9, 22, 0.88) 65%)`,
                borderColor: isLive ? `${color}50` : `${color}28`,
                transitionDelay: mounted ? `${8 * 55}ms` : '0ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 40px -8px ${color}40`;
                (e.currentTarget as HTMLElement).style.borderColor = `${color}60`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 0 ${color}00`;
                (e.currentTarget as HTMLElement).style.borderColor = isLive ? `${color}50` : `${color}28`;
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 25% 25%, ${color}1a 0%, transparent 60%)` }} />
              <div className="absolute top-0 left-0 w-20 h-px opacity-50" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
              <div className="absolute top-0 left-0 h-20 w-px opacity-50" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />

              {/* Live badge */}
              {isLive && (
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-500/20 border border-red-500/40 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Live</span>
                </div>
              )}

              <div className="absolute top-4 right-4 md:top-5 md:right-5 w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6"
                style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
                <Radio size={18} style={{ color }} />
              </div>

              <div className="relative z-10">
                <p className="text-xs font-medium mb-0.5 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: `${color}cc` }}>
                  {isLive ? 'Nu live — druk om te beluisteren' : 'Luister naar live radio'}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-white leading-tight tracking-tight text-sm md:text-lg">Radio</h2>
                  <ChevronRight size={14} className="shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-white" />
                </div>
              </div>
            </Link>
          );
        })()}

        {tiles.map((tile, i) => {
          const Icon = tile.Icon;
          return (
            <Link
              key={tile.area}
              to={tile.path}
              className={`
                landing-tile-${tile.area}
                group relative flex flex-col justify-end
                rounded-2xl overflow-hidden border
                p-4 md:p-5 min-h-[140px] md:min-h-0
                transition-all duration-700 ease-out
                hover:scale-[1.012] hover:z-10
                ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
              `}
              style={{
                background: `linear-gradient(145deg, ${tile.color}1e 0%, rgba(12, 9, 22, 0.88) 65%)`,
                borderColor: `${tile.color}28`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 0 ${tile.color}00`,
                transitionDelay: mounted ? `${i * 55}ms` : '0ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 40px -8px ${tile.color}40`;
                (e.currentTarget as HTMLElement).style.borderColor = `${tile.color}50`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 0 ${tile.color}00`;
                (e.currentTarget as HTMLElement).style.borderColor = `${tile.color}28`;
              }}
            >
              {/* Hover radial glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 25% 25%, ${tile.color}1a 0%, transparent 60%)`,
                }}
              />

              {/* Top-left corner accent lines */}
              <div
                className="absolute top-0 left-0 w-20 h-px opacity-50 group-hover:opacity-90 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, ${tile.color}, transparent)` }}
              />
              <div
                className="absolute top-0 left-0 h-20 w-px opacity-50 group-hover:opacity-90 transition-opacity duration-300"
                style={{ background: `linear-gradient(180deg, ${tile.color}, transparent)` }}
              />

              {/* Icon */}
              <div
                className="absolute top-4 right-4 md:top-5 md:right-5 w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6"
                style={{
                  background: `${tile.color}18`,
                  border: `1px solid ${tile.color}35`,
                }}
              >
                <Icon size={18} style={{ color: tile.color }} />
              </div>

              {/* Featured tile: spinning vinyl decoration */}
              {tile.featured && (
                <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
                  <div
                    className="relative w-44 h-44 rounded-full opacity-[0.06] animate-spin group-hover:opacity-[0.12] transition-opacity duration-500"
                    style={{ borderWidth: 2, borderStyle: 'solid', borderColor: tile.color, animationDuration: '28s' }}
                  >
                    <div
                      className="absolute inset-8 rounded-full"
                      style={{ borderWidth: 2, borderStyle: 'solid', borderColor: tile.color }}
                    />
                    <div
                      className="absolute inset-[70px] rounded-full"
                      style={{ background: tile.color, opacity: 0.5 }}
                    />
                    {[0, 90, 180, 270].map(deg => (
                      <div
                        key={deg}
                        className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                        style={{
                          background: tile.color,
                          top: `${50 + 47 * Math.sin((deg * Math.PI) / 180)}%`,
                          left: `${50 + 47 * Math.cos((deg * Math.PI) / 180)}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Text content */}
              <div className="relative z-10">
                <p
                  className="text-xs font-medium mb-0.5 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: `${tile.color}cc` }}
                >
                  {tile.sub}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className={`font-bold text-white leading-tight tracking-tight ${
                      tile.featured ? 'text-xl md:text-3xl' : 'text-sm md:text-lg'
                    }`}
                  >
                    {tile.label}
                  </h2>
                  <ChevronRight
                    size={14}
                    className="shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-white"
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
