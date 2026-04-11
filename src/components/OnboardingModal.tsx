import { useState } from 'react';
import { Check, ChevronRight, Music, Headphones, Radio, Mic2, Newspaper, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';

const GENRES = [
  { id: 'nederpop',   label: 'Nederpop',       emoji: '🎤' },
  { id: 'hiphop',     label: 'Hip-Hop',         emoji: '🎧' },
  { id: 'jazz',       label: 'Jazz',            emoji: '🎷' },
  { id: 'elektronisch', label: 'Elektronisch',  emoji: '🎛️' },
  { id: 'rb',         label: 'R&B / Soul',      emoji: '🎵' },
  { id: 'rock',       label: 'Rock / Blues',    emoji: '🎸' },
  { id: 'indie',      label: 'Indie / Folk',    emoji: '🪗' },
  { id: 'klassiek',   label: 'Klassiek',        emoji: '🎻' },
];

const ROLES = [
  { id: 'fan',        label: 'Muziekfan',       desc: 'Ontdekken en genieten',      icon: Headphones },
  { id: 'artist',     label: 'Artiest',         desc: 'Muziek uploaden en delen',   icon: Mic2 },
  { id: 'producer',   label: 'Producer',        desc: 'Beats en tracks maken',      icon: Radio },
  { id: 'journalist', label: 'Journalist',      desc: 'Schrijven over muziek',      icon: Newspaper },
];

const CITIES = [
  'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Groningen', 'Nijmegen', 'Eindhoven', 'Overig'
];

const STEPS = ['Genres', 'Rol', 'Steden'];

export default function OnboardingModal({ open, onOpenChange, onComplete }) {
  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedRole, setSelectedRole]     = useState('');
  const [selectedCities, setSelectedCities] = useState([]);

  function toggleGenre(id) {
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }

  function toggleCity(city) {
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  }

  function handleFinish() {
    localStorage.setItem('ho_onboarding_done', 'true');
    localStorage.setItem('ho_preferences', JSON.stringify({ genres: selectedGenres, role: selectedRole, cities: selectedCities }));
    setStep(0);
    onOpenChange(false);
    if (onComplete) onComplete();
  }

  function handleClose() {
    setStep(0);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/8">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <Music size={16} className="text-white" />
              </div>
              <DialogTitle>Ho-orbit</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-slate-400 text-sm mb-4">Vertel ons wat je leuk vindt zodat we Ho-orbit voor jou kunnen personaliseren.</p>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  i < step ? 'bg-violet-600 text-white' : i === step ? 'border-2 border-violet-500 text-violet-400' : 'bg-white/8 text-slate-600'
                }`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i <= step ? 'text-slate-300' : 'text-slate-600'}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-violet-600/40' : 'bg-white/8'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-5 min-h-[280px]">
          {step === 0 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-4">Welke muziek luister jij het liefst? <span className="text-slate-500">(kies meerdere)</span></p>
              <div className="grid grid-cols-2 gap-2">
                {GENRES.map(g => {
                  const active = selectedGenres.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGenre(g.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        active ? 'border-violet-500 bg-violet-600/15 text-white' : 'border-white/8 bg-white/3 text-slate-300 hover:bg-white/6'
                      }`}
                    >
                      <span className="text-xl">{g.emoji}</span>
                      <span className="text-sm font-medium">{g.label}</span>
                      {active && <Check size={14} className="text-violet-400 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-4">Hoe gebruik jij Ho-orbit?</p>
              <div className="space-y-2">
                {ROLES.map(r => {
                  const Icon = r.icon;
                  const active = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRole(r.id)}
                      className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                        active ? 'border-violet-500 bg-violet-600/15' : 'border-white/8 bg-white/3 hover:bg-white/6'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-violet-600/30' : 'bg-white/8'}`}>
                        <Icon size={20} className={active ? 'text-violet-400' : 'text-slate-400'} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>{r.label}</p>
                        <p className="text-xs text-slate-500">{r.desc}</p>
                      </div>
                      {active && <Check size={16} className="text-violet-400 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-4">Welke steden volg jij? <span className="text-slate-500">(optioneel)</span></p>
              <div className="flex flex-wrap gap-2">
                {CITIES.map(city => {
                  const active = selectedCities.includes(city);
                  return (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                        active ? 'border-violet-500 bg-violet-600/15 text-white' : 'border-white/10 bg-white/4 text-slate-300 hover:bg-white/8'
                      }`}
                    >
                      <MapPin size={12} className={active ? 'text-violet-400' : 'text-slate-500'} />
                      {city}
                    </button>
                  );
                })}
              </div>

              {/* Preview */}
              {(selectedGenres.length > 0 || selectedRole) && (
                <div className="mt-5 p-3 bg-white/3 border border-white/8 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Jouw profiel:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRole && <span className="text-xs bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full">{ROLES.find(r=>r.id===selectedRole)?.label}</span>}
                    {selectedGenres.map(g => <span key={g} className="text-xs bg-white/8 text-slate-300 px-2 py-0.5 rounded-full">{GENRES.find(x=>x.id===g)?.label}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between border-t border-white/8">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="text-sm text-slate-400 hover:text-white transition-colors">
              ← Terug
            </button>
          ) : (
            <button onClick={handleFinish} className="text-sm text-slate-600 hover:text-slate-400 transition-colors">
              Overslaan
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Volgende <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              <Check size={16} /> Ho-orbit starten
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
