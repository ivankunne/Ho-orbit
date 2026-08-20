import { useState, useEffect, useRef } from 'react';
import { Flame, Trash2, RefreshCw, Upload, Play, Pause, Mic2, Plus } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import {
  fetchDemos, fetchMyVotes, submitDemo, voteDemo, deleteDemo, getWeekLabel,
  type DemoSubmission, type VoteType,
} from '@services/demoService';

const FIRE_THRESHOLD = 0.8;
const MIN_VOTES_FOR_BADGE = 10;

// ─── Small inline play/pause button backed by its own <audio> element ────────

function ClipButton({ label, url }: { label: string; url: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/8 rounded-lg px-3 py-2 text-xs text-slate-300 transition-colors"
    >
      {playing ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
      {label}
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </button>
  );
}

// ─── Demo card ────────────────────────────────────────────────────────────────

function DemoCard({
  demo, myVote, canDelete, onVote, onDelete,
}: {
  demo: DemoSubmission;
  myVote?: VoteType;
  canDelete: boolean;
  onVote: (id: string, type: VoteType) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const totalVotes = demo.fireCount + demo.trashCount;
  const firePct = totalVotes ? Math.round((demo.fireCount / totalVotes) * 100) : 0;
  const isWinner = totalVotes >= MIN_VOTES_FOR_BADGE && demo.fireCount / totalVotes >= FIRE_THRESHOLD;

  const remove = async () => {
    if (!confirm(`Demo "${demo.trackTitle}" verwijderen?`)) return;
    setDeleting(true);
    try {
      await onDelete(demo.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0 overflow-hidden">
            {demo.avatarUrl ? (
              <img src={demo.avatarUrl} alt={demo.artistName} className="w-full h-full object-cover" />
            ) : (
              <Mic2 size={18} className="text-orange-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white truncate">{demo.trackTitle}</p>
            <p className="text-xs text-slate-500 truncate">{demo.artistName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-medium text-slate-500 bg-white/5 border border-white/8 rounded-full px-2 py-0.5">
            {getWeekLabel(demo.createdAt)}
          </span>
          {canDelete && (
            <button onClick={remove} disabled={deleting} className="text-slate-600 hover:text-red-400 transition-colors p-1">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {isWinner && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/25 rounded-lg px-2.5 py-1.5 w-fit">
          <Flame size={13} /> Prime Cut — klaar voor volledige airtime
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <ClipButton label="Intro & Spit" url={demo.voiceNoteUrl} />
        <ClipButton label="De Drop" url={demo.trackUrl} />
      </div>

      <div className="space-y-2">
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
          <div className="h-full bg-orange-500 transition-all" style={{ width: `${firePct}%` }} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVote(demo.id, 'fire')}
            className={`flex items-center gap-1.5 flex-1 justify-center rounded-lg px-3 py-2 text-sm font-semibold border transition-all ${
              myVote === 'fire'
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                : 'bg-white/[0.03] border-white/8 text-slate-300 hover:border-orange-500/30'
            }`}
          >
            🔥 {demo.fireCount}
          </button>
          <button
            onClick={() => onVote(demo.id, 'trash')}
            className={`flex items-center gap-1.5 flex-1 justify-center rounded-lg px-3 py-2 text-sm font-semibold border transition-all ${
              myVote === 'trash'
                ? 'bg-slate-500/20 border-slate-500/40 text-slate-200'
                : 'bg-white/[0.03] border-white/8 text-slate-300 hover:border-slate-500/30'
            }`}
          >
            🗑️ {demo.trashCount}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Submit demo form ────────────────────────────────────────────────────────

function SubmitDemoForm({ userId, defaultArtistName, onSubmitted, onClose }: {
  userId: string; defaultArtistName: string; onSubmitted: (demo: DemoSubmission) => void; onClose: () => void;
}) {
  const [artistName, setArtistName] = useState(defaultArtistName);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackFile, setTrackFile]   = useState<File | null>(null);
  const [voiceFile, setVoiceFile]   = useState<File | null>(null);
  const [saving, setSaving]         = useState(false);
  const [step, setStep]             = useState<'track' | 'voice' | 'saving' | null>(null);
  const [progress, setProgress]     = useState(0);
  const addToast = useToast();

  const ready = artistName.trim() && trackTitle.trim() && trackFile && voiceFile;

  const save = async () => {
    if (!ready || !trackFile || !voiceFile) return;
    setSaving(true);
    try {
      const demo = await submitDemo({
        userId, artistName, trackTitle, trackFile, voiceFile,
        onStep: setStep, onProgress: setProgress,
      });
      addToast?.('Demo gedropt! Luisteraars kunnen nu stemmen.', 'success');
      onSubmitted(demo);
      onClose();
    } catch {
      addToast?.('Demo droppen mislukt. Probeer het opnieuw.', 'error');
    } finally {
      setSaving(false);
      setStep(null);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-orange-500/20 rounded-2xl p-5 space-y-3">
      <p className="text-sm font-semibold text-white mb-1">Drop je demo</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Artiestennaam *</label>
          <input value={artistName} onChange={e => setArtistName(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel van de track *</label>
          <input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder="bijv. Nachtdienst"
            className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors" />
        </div>
      </div>
      <label className="flex items-center gap-2 w-full bg-white/[0.04] border border-dashed border-white/15 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:border-orange-500/40 cursor-pointer transition-colors">
        <Upload size={14} className="shrink-0" />
        <span className="truncate">{trackFile ? trackFile.name : 'De Drop — je hardste, niet-uitgebrachte track *'}</span>
        <input type="file" accept="audio/*" className="hidden" onChange={e => setTrackFile(e.target.files?.[0] ?? null)} />
      </label>
      <label className="flex items-center gap-2 w-full bg-white/[0.04] border border-dashed border-white/15 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:border-orange-500/40 cursor-pointer transition-colors">
        <Mic2 size={14} className="shrink-0" />
        <span className="truncate">{voiceFile ? voiceFile.name : 'Intro & Spit — korte spraaknoot over de track *'}</span>
        <input type="file" accept="audio/*" className="hidden" onChange={e => setVoiceFile(e.target.files?.[0] ?? null)} />
      </label>
      {saving && (
        <div className="space-y-1">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] text-slate-500">
            {step === 'track' ? `Track uploaden… ${progress}%` : step === 'voice' ? `Spraaknoot uploaden… ${progress}%` : 'Opslaan…'}
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !ready}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saving || !ready ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white'
          }`}>
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Droppen…</> : 'Drop je demo'}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          Annuleer
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DropYourDemoPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const [demos, setDemos]       = useState<DemoSubmission[]>([]);
  const [myVotes, setMyVotes]   = useState<Record<string, VoteType>>({});
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const addToast = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await fetchDemos().catch(() => []);
      if (!active) return;
      setDemos(list);
      if (user?.id) {
        const votes = await fetchMyVotes(String(user.id)).catch(() => ({}));
        if (active) setMyVotes(votes);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.id]);

  const handleVote = async (id: string, type: VoteType) => {
    if (!user?.id) return;
    try {
      const { fireCount, trashCount } = await voteDemo(id, String(user.id), type);
      setDemos(prev => prev.map(d => (d.id === id ? { ...d, fireCount, trashCount } : d)));
      setMyVotes(prev => {
        const next = { ...prev };
        if (next[id] === type) delete next[id];
        else next[id] = type;
        return next;
      });
    } catch {
      addToast?.('Stemmen mislukt. Probeer het opnieuw.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDemo(id);
      setDemos(prev => prev.filter(d => d.id !== id));
    } catch {
      addToast?.('Verwijderen mislukt.', 'error');
    }
  };

  const currentWeek = getWeekLabel(new Date().toISOString());

  return (
    <div className="min-h-screen w-full max-w-4xl mx-auto px-4 lg:px-6 py-10">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
            <Flame size={22} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Drop Your Demo</h1>
            <p className="text-sm text-slate-500">VIBEZ Hiphop Editie · {currentWeek}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-orange-600/15 hover:bg-orange-600/25 border border-orange-500/30 text-orange-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0"
        >
          <Plus size={13} /> Drop je demo
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-8 max-w-2xl">
        Upload je hardste, niet-uitgebrachte track + een korte spraaknoot. Luisteraars stemmen 🔥 Fire of 🗑️ Vuilnisbak —
        score je 80%+ fire? Dan draait de volledige track live op VIBEZ.
      </p>

      {showForm && user?.id && (
        <div className="mb-8">
          <SubmitDemoForm
            userId={String(user.id)}
            defaultArtistName={user.displayName || user.username || ''}
            onSubmitted={demo => setDemos(prev => [demo, ...prev])}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-600">
          <RefreshCw size={20} className="animate-spin" />
        </div>
      )}

      {!loading && demos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Flame size={28} className="text-slate-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Nog geen demo's</p>
            <p className="text-slate-500 text-sm mt-1">Wees de eerste die droppt.</p>
          </div>
        </div>
      )}

      {!loading && demos.length > 0 && (
        <div className="space-y-4">
          {demos.map(demo => (
            <DemoCard
              key={demo.id}
              demo={demo}
              myVote={myVotes[demo.id]}
              canDelete={isAdmin || (!!user?.id && demo.userId === String(user.id))}
              onVote={handleVote}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
