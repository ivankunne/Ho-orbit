import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ShieldCheck, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';

/**
 * Dedicated admin login screen.
 *
 * Shown at /admin whenever the visitor is NOT an authenticated admin, instead of
 * silently bouncing to the homepage. Existing admins (profiles.is_admin = true)
 * sign in here, as does the hardcoded master account (see MASTER_ADMIN_EMAIL).
 *
 * The master account is a real Supabase auth user flagged is_admin = true, so it
 * carries a valid session and passes RLS like any other admin. Its password lives
 * only in Supabase (never in this bundle) — it is handed to the operator directly.
 */
export const MASTER_ADMIN_EMAIL = 'ivan-master-2cc51a5f@h-orbit.nl';

export default function AdminLoginPage() {
  const { user, login, logout, error, setError } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Logged in, but this account has no admin rights.
  const wrongAccount = user && !user.isAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // On success, AuthContext updates `user`; the admin gate in App.tsx then
    // swaps this page for the panel automatically once is_admin is confirmed.
    await login(form.identifier, form.password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1528] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <img src="/H-orbit-logo.png" alt="h-orbit" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-7 sm:p-8">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-3">
              <ShieldCheck size={24} className="text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin login</h1>
            <p className="text-sm text-slate-500 mt-1">Alleen voor beheerders van h-orbit.</p>
          </div>

          {wrongAccount ? (
            // Authenticated, but not an admin — make it explicit instead of redirecting.
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={26} className="text-amber-400" />
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-1">
                Je bent ingelogd als <span className="text-white font-medium">{user.displayName || user.username}</span>,
                maar dit account heeft geen beheerdersrechten.
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Log uit en meld je aan met een beheerdersaccount.
              </p>
              <Button variant="ghost" className="w-full" onClick={logout}>
                <LogOut size={16} /> Uitloggen
              </Button>
              <Link
                to="/muziek"
                className="block mt-4 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                Terug naar h-orbit
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    E-mail of gebruikersnaam
                  </label>
                  <Input
                    type="text"
                    value={form.identifier}
                    onChange={e => { setForm({ ...form, identifier: e.target.value }); setError(''); }}
                    placeholder="beheerder@h-orbit.nl"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Wachtwoord</label>
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
                  disabled={loading || !form.identifier || !form.password}
                  className="w-full mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Inloggen <ArrowRight size={18} /></>
                  )}
                </Button>
              </form>

              <Link
                to="/muziek"
                className="block text-center mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Terug naar h-orbit
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
