import { useState } from 'react';
import { useAuth } from '@context/AuthContext';
import { LoginForm, SignupForm } from '@components/AuthModal';

// Full-screen inlog-/registratiescherm — het eerste dat bezoekers zien.
// Na succesvol inloggen stuurt RootGate (App.tsx) automatisch door.
export default function AuthPage({ initialTab = 'login' }: { initialTab?: 'login' | 'signup' }) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const { setError } = useAuth();

  const switchTab = (t: 'login' | 'signup') => {
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

          {tab === 'login' ? (
            <LoginForm onSuccess={() => {}} onSwitch={() => switchTab('signup')} />
          ) : (
            <SignupForm onSuccess={() => switchTab('login')} onSwitch={() => switchTab('login')} />
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
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
