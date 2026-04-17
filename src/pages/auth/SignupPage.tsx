import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { Input } from '@components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Checkbox } from '@components/ui/checkbox';
import { Button } from '@components/ui/button';

const steps = ['Account', 'Profiel', 'Klaar'];

export default function SignupPage() {
  const { signup } = useAuth();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
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

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validateStep0 = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Gebruikersnaam is verplicht';
    else if (form.username.length < 3) errs.username = 'Minimaal 3 tekens';
    if (!form.email.includes('@')) errs.email = 'Ongeldig e-mailadres';
    if (form.password.length < 6) errs.password = 'Minimaal 6 tekens';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Wachtwoorden komen niet overeen';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agreeTerms) {
      setErrors({ agreeTerms: 'Je moet akkoord gaan met de voorwaarden' });
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    signup(form);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1528] flex">
      {/* Linkerkant */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://picsum.photos/seed/signup-bg/800/900"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1528]/10 via-[#1a1528]/40 to-[#1a1528]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-transparent to-transparent" />
        <div className="absolute bottom-16 left-10 right-10">
          <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">Word lid van h-orbit</p>
          <h2 className="text-white text-2xl font-bold leading-tight mb-4">
            De plek voor Nederlandse muziek, artiesten en fans.
          </h2>
          <div className="space-y-2">
            {['Ontdek nieuwe Nederlandse artiesten', 'Upload en deel je eigen muziek', 'Sluit je aan bij de gemeenschap'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
                  <Check size={11} className="text-violet-400" />
                </div>
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rechterkant */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12">
        {/* Logo */}
        <div className="mb-8">
          <Link to="/login" className="flex items-center gap-2.5 w-fit">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <Music size={22} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">h-orbit</span>
          </Link>
        </div>

        <div className="max-w-sm w-full">
          <h1 className="text-3xl font-bold text-white mb-1">Account aanmaken</h1>
          <p className="text-slate-400 mb-6">Sluit je aan bij de Nederlandse muziekgemeenschap</p>

          {/* Stappenbalk */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                  i < step ? 'bg-violet-600 text-white' :
                  i === step ? 'bg-violet-600/20 border border-violet-500 text-violet-400' :
                  'bg-white/5 text-slate-500 border border-white/10'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-slate-300' : 'text-slate-600'}`}>{s}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-px ml-1 ${i < step ? 'bg-violet-600/50' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>

          {/* Stap 0: Account */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Gebruikersnaam *</label>
                <Input
                  type="text"
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  placeholder="bijv. jandevries"
                  className={errors.username ? 'border-red-500/50' : ''}
                />
                {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">E-mailadres *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="jij@voorbeeld.nl"
                  className={errors.email ? 'border-red-500/50' : ''}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Wachtwoord *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Minimaal 6 tekens"
                    className={`pr-12 ${errors.password ? 'border-red-500/50' : ''}`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Wachtwoord bevestigen *</label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className={errors.confirmPassword ? 'border-red-500/50' : ''}
                />
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              <Button onClick={handleNext} className="w-full mt-2">
                Volgende <ArrowRight size={18} />
              </Button>
            </div>
          )}

          {/* Stap 1: Profiel */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Weergavenaam</label>
                <Input
                  type="text"
                  value={form.displayName}
                  onChange={e => set('displayName', e.target.value)}
                  placeholder="Je volledige naam of artiestennaam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Locatie</label>
                <Input
                  type="text"
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="bijv. Amsterdam, Nederland"
                />
              </div>

              {/* Artiest toggle */}
              <label className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all"
                onClick={() => set('isArtist', !form.isArtist)}
              >
                <Checkbox
                  checked={form.isArtist}
                  onCheckedChange={(checked) => set('isArtist', checked)}
                  className="shrink-0"
                />
                <div>
                  <p className="text-white text-sm font-medium">Ik ben een artiest</p>
                  <p className="text-slate-400 text-xs">Je krijgt toegang tot upload- en artiestenfuncties</p>
                </div>
              </label>

              {form.isArtist && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Primair genre</label>
                  <Select value={form.genre} onValueChange={(val) => set('genre', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Nederpop', 'Nederlandstalige Hip-Hop', 'Elektronisch', 'Jazz', 'Bluesrock', 'R&B', 'Indie', 'Techno', 'Folk', 'Overig'].map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={() => setStep(0)} variant="ghost" className="flex-1">
                  Terug
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Volgende <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {/* Stap 2: Klaar */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Samenvatting */}
              <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Jouw account</p>
                {[
                  { label: 'Gebruikersnaam', value: form.username },
                  { label: 'E-mail', value: form.email },
                  { label: 'Naam', value: form.displayName || form.username },
                  { label: 'Locatie', value: form.location || '—' },
                  { label: 'Type', value: form.isArtist ? `Artiest${form.genre ? ` · ${form.genre}` : ''}` : 'Luisteraar' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Akkoord */}
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={form.agreeTerms}
                  onCheckedChange={(checked) => set('agreeTerms', checked)}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-sm text-slate-300 leading-relaxed">
                  Ik ga akkoord met de <span className="text-violet-400 cursor-pointer hover:underline">gebruiksvoorwaarden</span> en het <span className="text-violet-400 cursor-pointer hover:underline">privacybeleid</span> van h-orbit.
                </span>
              </label>
              {errors.agreeTerms && <p className="text-red-400 text-xs -mt-3">{errors.agreeTerms}</p>}

              <div className="flex gap-3">
                <Button type="button" onClick={() => setStep(1)} variant="ghost" className="flex-1">
                  Terug
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Check size={18} /> Account aanmaken</>
                  }
                </Button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-slate-400 mt-6">
            Heb je al een account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Inloggen
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
