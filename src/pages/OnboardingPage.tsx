import { useState } from 'react';
import { Music, Check, ArrowRight, ChevronLeft, Headphones, Radio, Users, MapPin } from 'lucide-react';
import { useAuth } from '@context/AuthContext';

const GENRES = [
  { id: 'nederpop',   label: 'Nederpop',      color: 'bg-pink-500/15 border-pink-500/30 text-pink-300' },
  { id: 'hiphop',     label: 'Hip-Hop',        color: 'bg-purple-500/15 border-purple-500/30 text-purple-300' },
  { id: 'elektronisch', label: 'Elektronisch', color: 'bg-blue-500/15 border-blue-500/30 text-blue-300' },
  { id: 'jazz',       label: 'Jazz',            color: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300' },
  { id: 'indie',      label: 'Indie',           color: 'bg-green-500/15 border-green-500/30 text-green-300' },
  { id: 'rnb',        label: 'R&B / Soul',      color: 'bg-red-500/15 border-red-500/30 text-red-300' },
  { id: 'rock',       label: 'Rock',            color: 'bg-violet-600/15 border-violet-500/30 text-violet-300' },
  { id: 'folk',       label: 'Folk / Singer-songwriter', color: 'bg-teal-500/15 border-teal-500/30 text-teal-300' },
  { id: 'techno',     label: 'Techno / House',  color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' },
  { id: 'klassiek',   label: 'Klassiek',        color: 'bg-slate-500/15 border-slate-500/30 text-slate-300' },
];

const CITIES = ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Breda', 'Overig'];

const ROLES = [
  { id: 'luisteraar', label: 'Muziekliefhebber', desc: 'Ik ontdek en beluister Nederlandse muziek', icon: Headphones },
  { id: 'artiest',    label: 'Artiest',          desc: 'Ik maak en upload mijn eigen muziek',      icon: Music },
  { id: 'organisator', label: 'Organisator',     desc: 'Ik organiseer evenementen en shows',       icon: Radio },
  { id: 'fan',        label: 'Fan & Community',  desc: 'Ik volg artiesten en ga naar shows',       icon: Users },
];

const DISCOVER = [
  { id: 'nieuw',      label: 'Nieuwe releases',         desc: 'Als eerste nieuwe nummers horen' },
  { id: 'trending',   label: 'Trending in NL',          desc: 'Wat er nu speelt in Nederland' },
  { id: 'events',     label: 'Evenementen in mijn stad', desc: 'Shows en festivals bij jou in de buurt' },
  { id: 'interviews', label: 'Interviews & Magazine',   desc: 'Verhalen achter de muziek' },
];

const steps = ['Genres', 'Jouw rol', 'Stad', 'Ontdekken'];

export default function OnboardingPage() {
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDiscover, setSelectedDiscover] = useState([]);

  function toggleGenre(id) {
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }

  function toggleDiscover(id) {
    setSelectedDiscover(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  function canNext() {
    if (step === 0) return selectedGenres.length > 0;
    if (step === 1) return selectedRole !== '';
    if (step === 2) return selectedCity !== '';
    return true;
  }

  function handleFinish() {
    updateProfile({
      needsOnboarding: false,
      preferredGenres: selectedGenres,
      role: ROLES.find(r => r.id === selectedRole)?.label || user.role,
      location: selectedCity ? `${selectedCity}, Nederland` : user.location,
      discoverPrefs: selectedDiscover,
    });
  }

  return (
    <div className="min-h-screen bg-[#1a1528] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
            <Music size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl text-white">h-orbit</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                i < step  ? 'bg-violet-600 text-white' :
                i === step ? 'bg-violet-600/20 border border-violet-500 text-violet-400' :
                'bg-white/5 border border-white/10 text-slate-600'
              }`}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block font-medium ${i <= step ? 'text-slate-300' : 'text-slate-600'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-px ml-1 ${i < step ? 'bg-violet-600/40' : 'bg-white/8'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Genres */}
        {step === 0 && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Welke genres spreken jou aan?</h1>
            <p className="text-slate-400 mb-6 text-sm">Kies alles wat bij je past — we gebruiken dit om je feed te personaliseren.</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {GENRES.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    selectedGenres.includes(g.id)
                      ? `${g.color} scale-105`
                      : 'bg-white/4 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {selectedGenres.includes(g.id) && <Check size={12} />}
                  {g.label}
                </button>
              ))}
            </div>
            {selectedGenres.length > 0 && (
              <p className="text-xs text-slate-500 mb-4">{selectedGenres.length} genre{selectedGenres.length !== 1 ? 's' : ''} geselecteerd</p>
            )}
          </div>
        )}

        {/* Step 1: Role */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Wat past het beste bij jou?</h1>
            <p className="text-slate-400 mb-6 text-sm">We passen je ervaring aan op basis van je rol.</p>
            <div className="space-y-3 mb-8">
              {ROLES.map(r => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                      selectedRole === r.id
                        ? 'border-violet-500/50 bg-violet-600/8'
                        : 'border-white/8 bg-white/3 hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedRole === r.id ? 'bg-violet-600/20' : 'bg-white/8'
                    }`}>
                      <Icon size={18} className={selectedRole === r.id ? 'text-violet-400' : 'text-slate-400'} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${selectedRole === r.id ? 'text-violet-300' : 'text-white'}`}>{r.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                    </div>
                    {selectedRole === r.id && (
                      <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: City */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Waar ben je gebaseerd?</h1>
            <p className="text-slate-400 mb-6 text-sm">We tonen evenementen en nieuws in jouw buurt.</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    selectedCity === city
                      ? 'bg-violet-600/15 border-violet-500/50 text-violet-300'
                      : 'bg-white/4 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <MapPin size={13} className={selectedCity === city ? 'text-violet-400' : 'text-slate-600'} />
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Discover preferences */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Wat wil je ontdekken?</h1>
            <p className="text-slate-400 mb-6 text-sm">Selecteer wat je als eerste wilt zien op je homepage.</p>
            <div className="space-y-2 mb-8">
              {DISCOVER.map(d => (
                <button
                  key={d.id}
                  onClick={() => toggleDiscover(d.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    selectedDiscover.includes(d.id)
                      ? 'border-violet-500/50 bg-violet-600/8'
                      : 'border-white/8 bg-white/3 hover:bg-white/5'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedDiscover.includes(d.id) ? 'border-violet-500 bg-violet-600' : 'border-slate-500'
                  }`}>
                    {selectedDiscover.includes(d.id) && <Check size={11} className="text-white" />}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${selectedDiscover.includes(d.id) ? 'text-white' : 'text-slate-300'}`}>{d.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{d.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-medium transition-colors"
            >
              <ChevronLeft size={16} /> Terug
            </button>
          )}
          <button
            onClick={step < steps.length - 1 ? () => setStep(s => s + 1) : handleFinish}
            disabled={!canNext()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
              canNext()
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            {step < steps.length - 1 ? (
              <><span>Volgende</span> <ArrowRight size={16} /></>
            ) : (
              <><Check size={16} /> <span>h-orbit verkennen</span></>
            )}
          </button>
        </div>

        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            className="w-full text-center text-sm text-slate-600 hover:text-slate-400 mt-4 transition-colors"
          >
            Overslaan
          </button>
        )}
      </div>
    </div>
  );
}
