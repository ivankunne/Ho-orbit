import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { LoginForm, SignupForm, QuickSignupForm } from '@components/AuthModal';

type Tab = 'login' | 'signup' | 'quick';

// Full-screen inlog-/registratiescherm — het eerste dat bezoekers zien.
// Na succesvol inloggen stuurt RootGate (App.tsx) automatisch door.
export default function AuthPage({ initialTab = 'login' }: { initialTab?: 'login' | 'signup' }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { setError } = useAuth();

  const switchTab = (t: Tab) => {
    setError('');
    setTab(t);
  };

  return (
    <div className="min-h-screen bg-[#1a1528] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Achtergronddecoratie */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-violet-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-fuchsia-600/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/H-orbit-logo.png" alt="h-orbit" className="h-10 w-auto" />
        </div>

        <div className="bg-[#1e1833] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 p-6 sm:p-8">
          {tab !== 'quick' && (
            <div className="flex border-b border-white/10 -mx-6 sm:-mx-8 px-6 sm:px-8 mb-6">
              <button
                onClick={() => switchTab('login')}
                className={`pb-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'login' ? 'border-violet-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Inloggen
              </button>
              <button
                onClick={() => switchTab('signup')}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'signup' ? 'border-violet-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Aanmelden
              </button>
            </div>
          )}

          {tab === 'login' ? (
            <LoginForm onSuccess={() => {}} onSwitch={() => switchTab('signup')} onQuickSignup={() => switchTab('quick')} />
          ) : tab === 'signup' ? (
            <SignupForm onSuccess={() => switchTab('login')} onSwitch={() => switchTab('login')} onQuickSignup={() => switchTab('quick')} />
          ) : (
            <QuickSignupForm onSuccess={() => {}} onBack={() => switchTab('signup')} />
          )}
        </div>

        {/* Sinds de app open staat is inloggen geen voorwaarde meer om iets te
            zien: wie hier per ongeluk belandt, kan gewoon terug naar de site. */}
        <p className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Eerst rondkijken zonder account
            <ArrowRight size={14} />
          </Link>
        </p>

        {/* Publieke uitleg-pagina's. Bewust gewone <a>'s: dit zijn statische
            HTML-pagina's (scripts/generate-seo.mjs), geen routes in de SPA. */}
        <nav aria-label="Meer over H-orbit" className="mt-8">
          <p className="text-center text-xs uppercase tracking-wide text-slate-500 mb-3">
            Nieuw hier?
          </p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            <li>
              <a href="/voor-artiesten" className="block min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 hover:text-white hover:border-violet-500/40 transition-colors">
                Beginnen als artiest
              </a>
            </li>
            <li>
              <a href="/muziek-uploaden" className="block min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 hover:text-white hover:border-violet-500/40 transition-colors">
                Muziek uploaden
              </a>
            </li>
            <li>
              <a href="/bandleden-vinden" className="block min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 hover:text-white hover:border-violet-500/40 transition-colors">
                Bandleden vinden
              </a>
            </li>
            <li>
              <a href="/optredens-vinden" className="block min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 hover:text-white hover:border-violet-500/40 transition-colors">
                Optredens vinden
              </a>
            </li>
            <li>
              <a href="/podia" className="block min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 hover:text-white hover:border-violet-500/40 transition-colors">
                Podia in Nederland
              </a>
            </li>
            <li>
              <a href="/veelgestelde-vragen" className="block min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 hover:text-white hover:border-violet-500/40 transition-colors">
                Veelgestelde vragen
              </a>
            </li>
          </ul>
        </nav>

        <p className="text-center text-xs text-slate-500 mt-6">
          <a href="/over-h-orbit" className="hover:text-slate-300 transition-colors">Over H-orbit</a>
          <span className="mx-2">·</span>
          <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition-colors">Privacy</a>
          <span className="mx-2">·</span>
          <a href="/voorwaarden" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition-colors">Voorwaarden</a>
          <span className="mx-2">·</span>
          <a href="/cookies" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition-colors">Cookies</a>
        </p>
      </div>
    </div>
  );
}
