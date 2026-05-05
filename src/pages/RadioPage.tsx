import { useState, useEffect } from 'react';
import { Radio, Play, Pause, WifiOff, Settings2, CheckCircle, RefreshCw } from 'lucide-react';
import { useRadio } from '@context/RadioContext';
import { useAuth } from '@context/AuthContext';
import { supabase } from '@/lib/supabase';
import { EqBars } from '@components/Waveform';

export default function RadioPage() {
  const { isLive, isRadioPlaying, playRadio, stopRadio, radioData } = useRadio();
  const { user } = useAuth();
  const isStudio = user?.isAdmin || user?.role === 'Radio';

  const [streamUrl, setStreamUrl]     = useState('');
  const [title, setTitle]             = useState('h-orbit Radio');
  const [description, setDescription] = useState('');
  const [liveLocal, setLiveLocal]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    if (!isStudio || !radioData) return;
    setStreamUrl(radioData.stream_url ?? '');
    setTitle(radioData.title ?? 'h-orbit Radio');
    setDescription(radioData.description ?? '');
    setLiveLocal(radioData.is_live ?? false);
  }, [radioData, isStudio]);

  const save = async () => {
    setSaving(true);
    await supabase.from('radio_stream')
      .update({ is_live: liveLocal, stream_url: streamUrl, title, description })
      .eq('id', 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 lg:px-6 py-10">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isLive ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5 border border-white/10'}`}>
          <Radio size={22} className={isLive ? 'text-red-400' : 'text-slate-500'} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{radioData?.title || 'h-orbit Radio'}</h1>
          <p className="text-sm text-slate-500">Live audio van de Nederlandse muziekscene</p>
        </div>
      </div>

      {/* Player card */}
      {isLive ? (
        <div className="relative bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/25 rounded-3xl p-8 flex flex-col items-center gap-6 overflow-hidden">
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full border border-red-500/8 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-48 h-48 rounded-full border border-red-500/12 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.4s' }} />
          </div>

          {/* Icon */}
          <div className="relative w-24 h-24 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            {isRadioPlaying
              ? <EqBars playing className="scale-150" />
              : <Radio size={36} className="text-red-400" />
            }
          </div>

          {/* LIVE badge */}
          <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Live uitzending</span>
          </div>

          {/* Title + description */}
          <div className="text-center relative">
            <p className="text-2xl font-bold text-white">{radioData?.title || 'h-orbit Radio'}</p>
            {radioData?.description && (
              <p className="text-slate-400 mt-1">{radioData.description}</p>
            )}
          </div>

          {/* Play button */}
          <button
            onClick={() => isRadioPlaying ? stopRadio() : playRadio()}
            className="relative flex items-center gap-3 bg-red-500 hover:bg-red-400 active:scale-95 text-white font-semibold px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-red-500/30"
          >
            {isRadioPlaying
              ? <><Pause size={20} fill="currentColor" /> Pauzeren</>
              : <><Play  size={20} fill="currentColor" className="ml-0.5" /> Beluisteren</>
            }
          </button>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <WifiOff size={28} className="text-slate-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Momenteel offline</p>
            <p className="text-slate-500 text-sm mt-1">De radio-uitzending is nu niet actief. Kom later terug.</p>
          </div>
        </div>
      )}

      {/* Studio controls — Radio role & Admin only */}
      {isStudio && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-5">
            <Settings2 size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Studio</h2>
          </div>

          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-5">
            {/* Live toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Zender live zetten</p>
                <p className="text-xs text-slate-500 mt-0.5">{liveLocal ? 'Zender staat live — zichtbaar voor iedereen' : 'Zender is offline'}</p>
              </div>
              <button
                onClick={() => setLiveLocal(l => !l)}
                className={`relative w-12 h-6 rounded-full transition-colors ${liveLocal ? 'bg-red-500' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${liveLocal ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {liveLocal && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <p className="text-xs text-red-400">Na opslaan gaat de banner live voor alle bezoekers</p>
              </div>
            )}

            {/* Stream URL */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stream URL</label>
              <input
                type="url"
                value={streamUrl}
                onChange={e => setStreamUrl(e.target.value)}
                placeholder="https://stream.example.com/live.mp3"
                className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>

            {/* Station name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Zendernaam</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="h-orbit Radio"
                className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Omschrijving</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="bijv. Nederlandse muziek 24/7"
                className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>

            <button
              onClick={save}
              disabled={saving || !streamUrl.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                saved ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' :
                saving || !streamUrl.trim() ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/8' :
                'bg-red-500 hover:bg-red-400 text-white'
              }`}
            >
              {saved   ? <><CheckCircle size={14} /> Opgeslagen!</> :
               saving  ? <><RefreshCw size={14} className="animate-spin" /> Opslaan…</> :
               'Instellingen opslaan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
