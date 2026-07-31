import { useState, useEffect, useRef } from 'react';
import { Mic2, Plus, X, Loader2, Trash2, Play, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@components/Toast';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import { EqBars } from '@components/Waveform';
import {
  type BandRehearsalRecording,
  getBandRehearsalRecordings, createBandRehearsalRecording, deleteBandRehearsalRecording,
} from '@services/bandRehearsalService';

interface Props {
  bandId: string;
  isAdmin: boolean;
  isMember: boolean;
  userId?: string;
}

export default function BandRehearsalsPanel({ bandId, isAdmin, isMember, userId }: Props) {
  const addToast = useToast();
  const [recordings, setRecordings] = useState<BandRehearsalRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; description: string; destructive?: boolean; onConfirm: () => void | Promise<void>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBandRehearsalRecordings(bandId).then(list => {
      if (cancelled) return;
      setRecordings(list);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [bandId]);

  // Stop playback when the panel unmounts (e.g. switching tabs).
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  function toggle(rec: BandRehearsalRecording) {
    if (playingId === rec.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.onended = () => setPlayingId(null);
    audio.src = rec.audio_url;
    audio.play().catch(() => addToast('Afspelen mislukt', 'error'));
    setPlayingId(rec.id);
  }

  function handleDelete(rec: BandRehearsalRecording) {
    setConfirmDialog({
      title: 'Opname verwijderen',
      description: `Weet je zeker dat je "${rec.title}" wilt verwijderen?`,
      destructive: true,
      onConfirm: async () => {
        setDeletingId(rec.id);
        const ok = await deleteBandRehearsalRecording(rec.id);
        setDeletingId(null);
        if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
        if (playingId === rec.id) { audioRef.current?.pause(); setPlayingId(null); }
        setRecordings(prev => prev.filter(r => r.id !== rec.id));
      },
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Mic2 size={20} className="text-violet-400" /> Opnames</h2>
          <p className="text-sm text-slate-500 mt-0.5">Repetitie-opnames, gedeeld met de hele band</p>
        </div>
        {isMember && (
          <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
            <Plus size={15} /> Opname
          </button>
        )}
      </div>

      {showForm && userId && (
        <UploadForm
          bandId={bandId}
          userId={userId}
          onDone={rec => { setRecordings(prev => [rec, ...prev]); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {recordings.length === 0 ? (
        <EmptyState
          title="Nog geen opnames"
          subtitle={isMember ? 'Upload een repetitie-opname zodat de band kan terugluisteren.' : 'Er zijn nog geen opnames geüpload.'}
          action={isMember ? { label: 'Opname toevoegen', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {recordings.map(rec => {
            const isPlaying = playingId === rec.id;
            const canDelete = isAdmin || rec.uploaded_by === userId;
            return (
              <div key={rec.id} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl p-3">
                <button
                  onClick={() => toggle(rec)}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0"
                >
                  {isPlaying ? <EqBars playing /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{rec.title}</p>
                  {rec.description && <p className="text-xs text-slate-500 truncate mt-0.5">{rec.description}</p>}
                </div>
                {rec.duration && <span className="text-xs text-slate-600 shrink-0">{rec.duration}</span>}
                {canDelete && (
                  <button onClick={() => handleDelete(rec)} disabled={deletingId === rec.id} className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0">
                    {deletingId === rec.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDialog}
        onOpenChange={open => { if (!open) setConfirmDialog(null); }}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        destructive={confirmDialog?.destructive}
        onConfirm={() => confirmDialog?.onConfirm()}
      />
    </div>
  );
}

function UploadForm({
  bandId, userId, onDone, onClose,
}: { bandId: string; userId: string; onDone: (rec: BandRehearsalRecording) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const addToast = useToast();

  const save = async () => {
    if (!title.trim() || !file) return;
    setSaving(true);
    try {
      const rec = await createBandRehearsalRecording(file, bandId, title.trim(), description, userId, setProgress);
      if (!rec) throw new Error('insert failed');
      addToast('Opname toegevoegd.', 'success');
      onDone(rec);
    } catch {
      addToast('Opname toevoegen mislukt. Probeer het opnieuw.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-violet-500/20 rounded-2xl p-5 space-y-3 mb-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-white">Opname toevoegen</p>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
      </div>
      <input
        value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (bijv. Repetitie 12 juli)"
        className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
      />
      <input
        value={description} onChange={e => setDescription(e.target.value)} placeholder="Omschrijving (optioneel)"
        className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
      />
      <label className="flex items-center gap-2 w-full bg-white/[0.04] border border-dashed border-white/15 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:border-violet-500/40 cursor-pointer transition-colors">
        <Upload size={14} className="shrink-0" />
        <span className="truncate">{file ? file.name : 'Kies een audiobestand (mp3, wav, m4a…)'}</span>
        <input type="file" accept="audio/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {saving && (
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={save} disabled={saving || !title.trim() || !file}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            saving || !title.trim() || !file ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}
        >
          {saving ? <><RefreshCw size={12} className="animate-spin" /> Uploaden… {progress}%</> : 'Toevoegen'}
        </button>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          Annuleer
        </button>
      </div>
    </div>
  );
}
