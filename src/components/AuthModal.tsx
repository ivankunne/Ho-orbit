import { useState, useEffect, useRef } from 'react';
import { X, Music, Eye, EyeOff, ArrowRight, Check, Camera } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { useAuthModal } from '@context/AuthModalContext';
import UserAvatar from '@components/UserAvatar';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Checkbox } from '@components/ui/checkbox';

// ─── Login form ──────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onSwitch }: { onSuccess: () => void; onSwitch: () => void }) {
  const { login, error, setError, requestPasswordReset } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(form.identifier, form.password);
    setLoading(false);
    if (ok) onSuccess();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg('');
    setResetLoading(true);
    const result = await requestPasswordReset(resetEmail);
    setResetLoading(false);
    if (result.ok) setResetSent(true);
    else setResetMsg(result.error || 'Er ging iets mis.');
  };

  if (mode === 'forgot') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Wachtwoord vergeten</h2>
        <p className="text-slate-400 text-sm mb-6">
          Vul je e-mailadres in en we sturen je een link om je wachtwoord opnieuw in te stellen.
        </p>

        {resetSent ? (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-violet-400" />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Als er een account bestaat voor <span className="text-white font-medium">{resetEmail}</span>,
              ontvang je een e-mail met een herstellink.
            </p>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => { setMode('login'); setResetSent(false); setResetEmail(''); }}
            >
              Terug naar inloggen
            </Button>
          </div>
        ) : (
          <>
            {resetMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
                {resetMsg}
              </div>
            )}
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">E-mailadres</label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={e => { setResetEmail(e.target.value); setResetMsg(''); }}
                  placeholder="jouw@email.nl"
                  autoComplete="email"
                  required
                />
              </div>
              <Button type="submit" disabled={resetLoading || !resetEmail} className="w-full mt-1">
                {resetLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <>Herstellink versturen <ArrowRight size={16} /></>}
              </Button>
            </form>
            <p className="text-center text-sm text-slate-400 mt-5">
              <button
                onClick={() => { setMode('login'); setResetMsg(''); }}
                className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                Terug naar inloggen
              </button>
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Welkom terug</h2>
      <p className="text-slate-400 text-sm mb-6">Log in op je h-orbit account</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            E-mailadres of gebruikersnaam
          </label>
          <Input
            type="text"
            value={form.identifier}
            onChange={e => { setForm(f => ({ ...f, identifier: e.target.value })); setError(''); }}
            placeholder="jouw@email.nl of gebruikersnaam"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">Wachtwoord</label>
            <button
              type="button"
              onClick={() => { setError(''); setMode('forgot'); }}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Vergeten?
            </button>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !form.identifier || !form.password}
          className="w-full mt-1"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Inloggen <ArrowRight size={16} /></>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-5">
        Nog geen account?{' '}
        <button onClick={onSwitch} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Aanmelden
        </button>
      </p>
    </div>
  );
}

// ─── Signup form ─────────────────────────────────────────────────────────────

const STEPS = ['Account', 'Profiel', 'Klaar'];
const GENRES = ['Nederpop', 'Nederlandstalige Hip-Hop', 'Elektronisch', 'Jazz', 'Bluesrock', 'R&B', 'Indie', 'Techno', 'Folk', 'Overig'];

function SignupForm({ onSuccess, onSwitch }: { onSuccess: () => void; onSwitch: () => void }) {
  const { signup, error, setError } = useAuth();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setFormState] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    location: '',
    isArtist: false,
    genre: '',
    agreeTerms: false,
  });

  const set = (key: string, val: any) => {
    setFormState(f => ({ ...f, [key]: val }));
    setFormErrors(e => ({ ...e, [key]: '' }));
  };

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validateStep0 = () => {
    const errs: Record<string, string> = {};
    if (!form.username.trim()) errs.username = 'Gebruikersnaam is verplicht';
    else if (form.username.length < 3) errs.username = 'Minimaal 3 tekens';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Alleen letters, cijfers en _';
    if (!form.email.includes('@')) errs.email = 'Ongeldig e-mailadres';
    if (form.password.length < 6) errs.password = 'Minimaal 6 tekens';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Wachtwoorden komen niet overeen';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreeTerms) {
      setFormErrors({ agreeTerms: 'Je moet akkoord gaan met de voorwaarden' });
      return;
    }
    setLoading(true);
    const result = await signup({ ...form, avatarFile });
    setLoading(false);
    if (result?.ok) {
      result.needsConfirmation ? setConfirmationSent(true) : onSuccess();
    }
  };

  if (confirmationSent) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-violet-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Controleer je e-mail</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          We hebben een bevestigingslink gestuurd naar{' '}
          <span className="text-white font-medium">{form.email}</span>.
          Klik op de link om je account te activeren.
        </p>
        <Button onClick={onSuccess} variant="ghost" className="mt-6 w-full">Sluiten</Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Account aanmaken</h2>
      <p className="text-slate-400 text-sm mb-5">Sluit je aan bij de Nederlandse muziekgemeenschap</p>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
              i < step ? 'bg-violet-600 text-white' :
              i === step ? 'bg-violet-600/20 border border-violet-500 text-violet-400' :
              'bg-white/5 text-slate-500 border border-white/10'
            }`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i <= step ? 'text-slate-300' : 'text-slate-600'}`}>{s}</span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? 'bg-violet-600/50' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* Step 0: Account */}
      {step === 0 && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Gebruikersnaam *</label>
            <Input
              value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder="bijv. jandevries"
              className={formErrors.username ? 'border-red-500/50' : ''}
            />
            {formErrors.username && <p className="text-red-400 text-xs mt-1">{formErrors.username}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mailadres *</label>
            <Input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jij@voorbeeld.nl"
              className={formErrors.email ? 'border-red-500/50' : ''}
            />
            {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Wachtwoord *</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Minimaal 6 tekens"
                className={`pr-11 ${formErrors.password ? 'border-red-500/50' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Wachtwoord bevestigen *</label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              placeholder="••••••••"
              className={formErrors.confirmPassword ? 'border-red-500/50' : ''}
            />
            {formErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>}
          </div>
          <Button onClick={handleNext} className="w-full mt-1">
            Volgende <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {/* Step 1: Profile + avatar */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="relative">
              <UserAvatar
                src={avatarPreview}
                name={form.displayName || form.username}
                size={80}
                className="ring-4 ring-white/10"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center border-2 border-[#1e1833] transition-colors"
                title="Profielfoto kiezen"
              >
                <Camera size={13} className="text-white" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              {avatarPreview ? 'Andere foto kiezen' : 'Profielfoto toevoegen'}
            </button>
            <p className="text-xs text-slate-500">Optioneel · JPG, PNG of WebP</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Weergavenaam</label>
            <Input
              value={form.displayName}
              onChange={e => set('displayName', e.target.value)}
              placeholder="Je naam of artiestennaam"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Locatie</label>
            <Input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="bijv. Amsterdam, Nederland"
            />
          </div>
          <label
            className="flex items-center gap-3 p-3.5 rounded-xl border border-white/10 cursor-pointer hover:border-violet-500/30 transition-colors"
            onClick={() => set('isArtist', !form.isArtist)}
          >
            <Checkbox
              checked={form.isArtist}
              onCheckedChange={(checked) => set('isArtist', checked)}
              className="shrink-0"
            />
            <div>
              <p className="text-white text-sm font-medium">Ik ben een artiest</p>
              <p className="text-slate-400 text-xs">Krijg toegang tot upload- en artiestenfuncties</p>
            </div>
          </label>
          {form.isArtist && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Primair genre</label>
              <Select value={form.genre} onValueChange={(val) => set('genre', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button onClick={() => setStep(0)} variant="ghost" className="flex-1">Terug</Button>
            <Button onClick={handleNext} className="flex-1">Volgende <ArrowRight size={16} /></Button>
          </div>
        </div>
      )}

      {/* Step 2: Review & submit */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar preview in summary */}
          <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-xl">
            <UserAvatar
              src={avatarPreview}
              name={form.displayName || form.username}
              size={52}
              className="ring-2 ring-white/10 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{form.displayName || form.username}</p>
              <p className="text-slate-400 text-xs">@{form.username}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {form.isArtist ? `Artiest${form.genre ? ` · ${form.genre}` : ''}` : 'Luisteraar'}
              </p>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 space-y-2">
            {[
              { label: 'E-mail', value: form.email },
              ...(form.location ? [{ label: 'Locatie', value: form.location }] : []),
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={form.agreeTerms}
              onCheckedChange={(checked) => set('agreeTerms', checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-sm text-slate-300 leading-relaxed">
              Ik ga akkoord met de{' '}
              <span className="text-violet-400 hover:underline cursor-pointer">gebruiksvoorwaarden</span>
              {' '}en het{' '}
              <span className="text-violet-400 hover:underline cursor-pointer">privacybeleid</span>.
            </span>
          </label>
          {formErrors.agreeTerms && (
            <p className="text-red-400 text-xs -mt-2">{formErrors.agreeTerms}</p>
          )}

          <div className="flex gap-2">
            <Button type="button" onClick={() => setStep(1)} variant="ghost" className="flex-1">Terug</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Check size={16} /> Aanmelden</>
              }
            </Button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-slate-400 mt-5">
        Al een account?{' '}
        <button onClick={onSwitch} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Inloggen
        </button>
      </p>
    </div>
  );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────

export default function AuthModal() {
  const { isOpen, tab, open, close } = useAuthModal();
  const { setError } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const switchTab = (t: 'login' | 'signup') => {
    setError('');
    open(t);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <div className="relative bg-[#1e1833] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-md max-h-[92vh] overflow-y-auto z-10">
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
          aria-label="Sluiten"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-5 pr-8">
            <img src="/H-orbit-logo.png" alt="h-orbit" className="h-8 w-auto" />
          </div>

          <div className="flex border-b border-white/10 -mx-6 px-6 mb-6">
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
            <LoginForm onSuccess={close} onSwitch={() => switchTab('signup')} />
          ) : (
            <SignupForm onSuccess={close} onSwitch={() => switchTab('login')} />
          )}
        </div>
      </div>
    </div>
  );
}
