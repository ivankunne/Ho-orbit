import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';

export default function LoginPage() {
  const { login, error, setError } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Kleine vertraging voor realisme
    await new Promise(r => setTimeout(r, 600));
    login(form.username, form.password);
    setLoading(false);
  };

  return (
    <div className="h-screen bg-[#1a1528] flex overflow-hidden">
      {/* Linkerkant — visueel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://picsum.photos/seed/login-bg/800/900"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1528]/20 via-[#1a1528]/40 to-[#1a1528]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-transparent to-transparent" />

        {/* Citaat */}
        <div className="absolute bottom-16 left-10 right-10">
          <blockquote className="text-white text-2xl font-light leading-relaxed italic mb-4">
            "Nederlandse muziek op één plek."
          </blockquote>
          <p className="text-violet-400 font-medium">h-orbit · Jouw muziekplatform</p>
        </div>

        {/* Drijvende muziekkaartjes decoratie */}
        <div className="absolute top-12 left-8 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <img src="https://picsum.photos/seed/deco1/40/40" alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Spiegels</p>
              <p className="text-slate-400 text-xs">Typhoon</p>
            </div>
            <div className="ml-4 w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center shrink-0">
              <div className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-white ml-0.5" />
            </div>
          </div>
        </div>

        <div className="absolute top-36 right-8 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <img src="https://picsum.photos/seed/deco2/40/40" alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Regen</p>
              <p className="text-slate-400 text-xs">Eefje de Visser</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rechterkant — loginformulier */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-20 overflow-y-auto">
        {/* Logo */}
        <div className="mb-10">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <Music size={22} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">h-orbit</span>
          </Link>
        </div>

        <div className="max-w-sm w-full">
          <h1 className="text-3xl font-bold text-white mb-2">Welkom terug</h1>
          <p className="text-slate-400 mb-8">Log in op je h-orbit account</p>

          {/* Foutmelding */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Gebruikersnaam
              </label>
              <Input
                type="text"
                value={form.username}
                onChange={e => { setForm({ ...form, username: e.target.value }); setError(''); }}
                placeholder="Jouw gebruikersnaam"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Wachtwoord</label>
                <button type="button" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  Wachtwoord vergeten?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !form.username || !form.password}
              className="w-full mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Inloggen <ArrowRight size={18} /></>
              )}
            </Button>
          </form>

          {/* Scheidingslijn */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500">of</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Demo hint */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <p className="text-blue-400 text-xs font-semibold mb-1">Demo inloggegevens</p>
            <p className="text-slate-300 text-sm">Gebruikersnaam: <span className="font-mono text-white">Test123</span></p>
            <p className="text-slate-300 text-sm">Wachtwoord: <span className="font-mono text-white">Test123</span></p>
          </div>

          <p className="text-center text-sm text-slate-400">
            Nog geen account?{' '}
            <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Registreren
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
