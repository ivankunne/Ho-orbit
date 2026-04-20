import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Music, Play, Users, Calendar, Upload, ArrowRight, Star, BookOpen } from 'lucide-react';
import { useAuth } from '@context/AuthContext';

const features = [
  {
    icon: Play,
    color: '#7c3aed',
    title: 'Luister gratis',
    desc: 'Ontdek Nederlandse artiesten en hun muziek, zonder account.',
  },
  {
    icon: Users,
    color: '#3b82f6',
    title: 'Volg artiesten',
    desc: 'Blijf op de hoogte van je favorieten en hun nieuwe releases.',
  },
  {
    icon: Calendar,
    color: '#f59e0b',
    title: 'Evenementen',
    desc: 'Vind shows en festivals bij jou in de buurt en meld je aan.',
  },
  {
    icon: Upload,
    color: '#10b981',
    title: 'Upload je muziek',
    desc: 'Deel je tracks met de community en groei als artiest.',
  },
  {
    icon: BookOpen,
    color: '#ec4899',
    title: 'Leer & groei',
    desc: 'Tutorials van ervaren muzikanten over productie en meer.',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (user && !user.needsOnboarding) return <Navigate to="/muziek" replace />;

  return (
    <div className="min-h-screen bg-[#0c0916] text-white overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-700/10 blur-[130px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-violet-900/12 blur-[110px] animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full bg-amber-600/6 blur-[90px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
      </div>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 lg:px-10 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
            <Music size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">h-orbit</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/5"
          >
            Inloggen
          </Link>
          <Link
            to="/signup"
            className="text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl transition-all hover:scale-105"
          >
            Aanmelden
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-5 lg:px-10 pt-20 pb-24 text-center">
        <div
          className="transition-all duration-700"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)' }}
        >
          <div className="inline-flex items-center gap-2 bg-violet-600/15 border border-violet-500/25 text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 tracking-widest uppercase">
            <Star size={10} />
            Nederlands muziekplatform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.06] tracking-tight mb-6">
            Ontdek de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400">
              Nederlandse muziek
            </span>
            <br />scene
          </h1>

          <p className="text-lg lg:text-xl text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Luister naar opkomende artiesten, vind events in jouw stad en deel je eigen muziek met de community.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:scale-[1.03] shadow-xl shadow-violet-600/25 w-full sm:w-auto justify-center"
            >
              Gratis beginnen <ArrowRight size={15} />
            </Link>
            <Link
              to="/muziek"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 font-semibold px-8 py-3.5 rounded-xl transition-colors w-full sm:w-auto justify-center"
            >
              <Play size={14} /> Muziek verkennen
            </Link>
          </div>

          <p className="text-xs text-slate-600 mt-5">Gratis · Geen creditcard nodig · Altijd te stoppen</p>
        </div>
      </section>

      {/* Features grid */}
      <section
        className="relative z-10 max-w-6xl mx-auto px-5 lg:px-10 pb-24 transition-all duration-700"
        style={{ transitionDelay: '150ms', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)' }}
      >
        <h2 className="text-center text-xl font-semibold text-white mb-8 opacity-70">Alles op één plek</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="relative p-6 rounded-2xl border overflow-hidden group cursor-default"
                style={{
                  background: `${f.color}0d`,
                  borderColor: `${f.color}22`,
                  transitionDelay: `${i * 60}ms`,
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 20% 20%, ${f.color}18 0%, transparent 65%)` }}
                />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 relative"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
                >
                  <Icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-white mb-1.5 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA strip */}
      <section
        className="relative z-10 max-w-7xl mx-auto px-5 lg:px-10 pb-16 transition-all duration-700"
        style={{ transitionDelay: '250ms', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)' }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.03] border border-white/8 rounded-2xl px-6 py-5">
          <div>
            <p className="text-white font-semibold">Klaar om te beginnen?</p>
            <p className="text-sm text-slate-500">Maak een gratis account aan en ontdek de scene.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Inloggen
            </Link>
            <Link
              to="/signup"
              className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl transition-all hover:scale-105"
            >
              Gratis aanmelden <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
