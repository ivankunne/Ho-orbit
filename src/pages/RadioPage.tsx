import { useState } from 'react';
import { Radio, Play, Pause, WifiOff, Settings2, CheckCircle, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useRadio, type RadioStation } from '@context/RadioContext';
import { useAuth } from '@context/AuthContext';
import { supabase } from '@/lib/supabase';
import { EqBars } from '@components/Waveform';

// ─── Station card (public listener view) ────────────────────────────────────

function StationCard({ station }: { station: RadioStation }) {
  const { currentStation, isRadioPlaying, toggleStation } = useRadio();
  const isThisPlaying = isRadioPlaying && currentStation?.id === station.id;

  return (
    <div className={`relative flex flex-col gap-4 p-5 rounded-2xl border transition-all ${
      isThisPlaying
        ? 'bg-red-500/8 border-red-500/30'
        : station.is_live
          ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
          : 'bg-white/[0.02] border-white/6 opacity-60'
    }`}>
      {station.is_live && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Live</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
          isThisPlaying ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5 border border-white/10'
        }`}>
          {isThisPlaying
            ? <EqBars playing />
            : <Radio size={22} className={station.is_live ? 'text-red-400' : 'text-slate-600'} />
          }
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <p className="font-bold text-white text-lg leading-tight">{station.name}</p>
          {station.genre && <p className="text-xs text-slate-500 mt-0.5">{station.genre}</p>}
          {station.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{station.description}</p>}
        </div>
      </div>

      {station.is_live ? (
        <button
          onClick={() => toggleStation(station)}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
            isThisPlaying
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
              : 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20'
          }`}
        >
          {isThisPlaying
            ? <><Pause size={15} fill="currentColor" /> Pauzeren</>
            : <><Play  size={15} fill="currentColor" className="ml-0.5" /> Beluisteren</>
          }
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm text-slate-600 border border-white/6">
          <WifiOff size={14} /> Momenteel offline
        </div>
      )}
    </div>
  );
}

// ─── Studio station row (edit/manage) ────────────────────────────────────────

function StudioRow({ station, onRefresh }: { station: RadioStation; onRefresh: () => void }) {
  const [open, setOpen]           = useState(false);
  const [name, setName]           = useState(station.name);
  const [description, setDesc]    = useState(station.description);
  const [streamUrl, setStreamUrl] = useState(station.stream_url);
  const [genre, setGenre]         = useState(station.genre);
  const [isLive, setIsLive]       = useState(station.is_live);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from('radio_streams').update({ name, description, stream_url: streamUrl, genre, is_live: isLive }).eq('id', station.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  };

  const remove = async () => {
    if (!confirm(`Zender "${station.name}" verwijderen?`)) return;
    setDeleting(true);
    await supabase.from('radio_streams').delete().eq('id', station.id);
    onRefresh();
  };

  const quickToggleLive = async () => {
    const next = !isLive;
    setIsLive(next);
    await supabase.from('radio_streams').update({ is_live: next }).eq('id', station.id);
    onRefresh();
  };

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLive ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5 border border-white/10'}`}>
          <Radio size={14} className={isLive ? 'text-red-400' : 'text-slate-500'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{station.name}</p>
          <p className="text-xs text-slate-500">
            {station.genre || 'Geen genre'} ·{' '}
            {isLive ? <span className="text-red-400">Live</span> : 'Offline'}
          </p>
        </div>
        {/* Live quick-toggle */}
        <button
          onClick={quickToggleLive}
          title={isLive ? 'Zender offline zetten' : 'Zender live zetten'}
          className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${isLive ? 'bg-red-500' : 'bg-white/15'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isLive ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
        <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-white transition-colors p-1">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button onClick={remove} disabled={deleting} className="text-slate-600 hover:text-red-400 transition-colors p-1">
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/8 px-4 py-4 space-y-3 bg-white/[0.02]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Zendernaam</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Genre</label>
              <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="bijv. Hip-Hop, Nederpop…"
                className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Stream URL *</label>
            <input type="url" value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder="https://stream.example.com/live.mp3"
              className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
            <p className="text-xs text-slate-600 mt-1">MP3 stream URL of HLS (.m3u8)</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Omschrijving</label>
            <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Korte beschrijving van de zender"
              className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
          </div>
          <button onClick={save} disabled={saving || !streamUrl.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              saved ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' :
              saving || !streamUrl.trim() ? 'bg-white/5 text-slate-600 cursor-not-allowed' :
              'bg-violet-600 hover:bg-violet-500 text-white'
            }`}>
            {saved ? <><CheckCircle size={13} /> Opgeslagen</> : saving ? <><RefreshCw size={13} className="animate-spin" /> Opslaan…</> : 'Opslaan'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add / register station form ─────────────────────────────────────────────

function AddStationForm({ onRefresh, onClose, userId }: { onRefresh: () => void; onClose: () => void; userId?: string }) {
  const [name, setName]           = useState('');
  const [genre, setGenre]         = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [description, setDesc]    = useState('');
  const [saving, setSaving]       = useState(false);

  const save = async () => {
    if (!name.trim() || !streamUrl.trim()) return;
    setSaving(true);
    await supabase.from('radio_streams').insert({
      name, genre, stream_url: streamUrl, description, is_live: false,
      ...(userId ? { owner_id: userId } : {}),
    });
    setSaving(false);
    onRefresh();
    onClose();
  };

  return (
    <div className="bg-white/[0.03] border border-violet-500/20 rounded-2xl p-5 space-y-3">
      <p className="text-sm font-semibold text-white mb-1">Zender registreren</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Naam *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="bijv. Vibez"
            className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Genre</label>
          <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="bijv. Hip-Hop, Nederpop…"
            className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Stream URL *</label>
        <input type="url" value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder="https://stream.example.com/live.mp3"
          className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
        <p className="text-xs text-slate-600 mt-1">Je kunt dit later ook nog invullen of aanpassen.</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Omschrijving</label>
        <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Korte beschrijving van je zender"
          className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !name.trim() || !streamUrl.trim()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saving || !name.trim() || !streamUrl.trim() ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}>
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Toevoegen…</> : 'Zender toevoegen'}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          Annuleer
        </button>
      </div>
    </div>
  );
}

// ─── Main RadioPage ───────────────────────────────────────────────────────────

export default function RadioPage() {
  const { stations, liveStations, fetchStations } = useRadio();
  const { user } = useAuth();
  const isAdmin    = Boolean(user?.isAdmin);
  const isRadioHost = user?.role === 'Radio';
  const isStudio   = isAdmin || isRadioHost;
  const [showAddForm, setShowAddForm] = useState(false);

  // Admins manage all stations; Radio hosts only manage their own
  const studioStations = isAdmin
    ? stations
    : stations.filter(s => s.owner_id === user?.id);

  const offlineStations = stations.filter(s => !s.is_live);

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 lg:px-6 py-10">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
            <Radio size={22} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">h-orbit Radio</h1>
            <p className="text-sm text-slate-500">
              {liveStations.length > 0
                ? `${liveStations.length} zender${liveStations.length !== 1 ? 's' : ''} live`
                : 'Alle zenders offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Live stations */}
      {liveStations.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Nu live</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {liveStations.map(s => <StationCard key={s.id} station={s} />)}
          </div>
        </section>
      )}

      {/* Offline stations */}
      {offlineStations.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Overige zenders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {offlineStations.map(s => <StationCard key={s.id} station={s} />)}
          </div>
        </section>
      )}

      {/* Empty public state */}
      {stations.length === 0 && !isStudio && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <WifiOff size={28} className="text-slate-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Geen zenders gevonden</p>
            <p className="text-slate-500 text-sm mt-1">Er zijn nog geen radiozenders toegevoegd.</p>
          </div>
        </div>
      )}

      {/* ── Studio — Radio hosts & admins ── */}
      {isStudio && (
        <div className="mt-6 pt-8 border-t border-white/8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                {isAdmin ? 'Studio — alle zenders' : 'Jouw studio'}
              </h2>
            </div>
            {/* Admins can always add; Radio hosts can add if they don't have one yet */}
            {(isAdmin || studioStations.length === 0) && (
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="flex items-center gap-1.5 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <Plus size={13} /> Zender toevoegen
              </button>
            )}
          </div>

          {/* Radio host with no station yet */}
          {isRadioHost && !isAdmin && studioStations.length === 0 && !showAddForm && (
            <div className="mb-5 p-4 bg-violet-500/8 border border-violet-500/20 rounded-2xl">
              <p className="text-sm text-slate-300 mb-1 font-medium">Verbind jouw zender</p>
              <p className="text-xs text-slate-500">
                Je hebt de Radio-rol maar nog geen zender gekoppeld. Voeg je stream URL toe en je kunt zelf live gaan — geen admin nodig.
              </p>
            </div>
          )}

          {showAddForm && (
            <div className="mb-4">
              <AddStationForm
                onRefresh={fetchStations}
                onClose={() => setShowAddForm(false)}
                userId={user?.id ? String(user.id) : undefined}
              />
            </div>
          )}

          {studioStations.length > 0 ? (
            <div className="space-y-2">
              {studioStations.map(s => (
                <StudioRow key={s.id} station={s} onRefresh={fetchStations} />
              ))}
            </div>
          ) : (
            !showAddForm && (
              <p className="text-sm text-slate-600 text-center py-6">
                {isAdmin ? 'Nog geen zenders — voeg er een toe.' : 'Klik op "Zender toevoegen" om te beginnen.'}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
