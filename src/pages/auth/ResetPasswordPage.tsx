import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { supabase } from '@lib/supabase';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';

/**
 * Landing page for the password-reset link in the email.
 *
 * Supabase parses the recovery token from the URL and fires PASSWORD_RECOVERY,
 * establishing a temporary session. We then let the user set a new password.
 */
export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true);
        setChecking(false);
      }
    });

    // Recovery session may already be established by the time we mount.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) setReady(true);
      setChecking(false);
    });

    const timer = setTimeout(() => { if (active) setChecking(false); }, 4000);
    return () => { active = false; subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Wachtwoord moet minimaal 6 tekens zijn.'); return; }
    if (form.password !== form.confirm) { setError('Wachtwoorden komen niet overeen.'); return; }
    setLoading(true);
    const result = await updatePassword(form.password);
    setLoading(false);
    if (result.ok) {
      setDone(true);
      // The recovery link already established a session, so the user is now
      // logged in — send them into the app, not back to the login modal.
      setTimeout(() => navigate('/muziek', { replace: true }), 2200);
    } else {
      setError(result.error || 'Er ging iets mis.');
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1528] flex flex-col justify-center px-6 sm:px-8">
      <div className="max-w-sm w-full mx-auto">
        <Link to="/" className="flex items-center gap-2.5 w-fit mb-10">
          <img src="/H-orbit-logo.png" alt="h-orbit" className="h-10 w-auto" />
        </Link>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5">
              <Check className="text-green-400" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Wachtwoord gewijzigd</h1>
            <p className="text-slate-400">Je bent ingelogd — je wordt doorgestuurd…</p>
          </div>
        ) : checking ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/20 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : !ready ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="text-red-400" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Link verlopen of ongeldig</h1>
            <p className="text-slate-400 mb-6">
              Deze herstellink is niet meer geldig. Vraag een nieuwe aan op de inlogpagina.
            </p>
            <Link to="/login">
              <Button className="w-full">Naar inloggen <ArrowRight size={18} /></Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white mb-2">Nieuw wachtwoord</h1>
            <p className="text-slate-400 mb-8">Kies een nieuw wachtwoord voor je h-orbit account.</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nieuw wachtwoord</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
                    placeholder="Minimaal 6 tekens"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Bevestig wachtwoord</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" disabled={loading || !form.password || !form.confirm} className="w-full mt-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Wachtwoord opslaan <ArrowRight size={18} /></>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
