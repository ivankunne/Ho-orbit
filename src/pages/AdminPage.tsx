import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, Clock, Music, ChevronDown,
  Search, RefreshCw, ShieldCheck, Filter,
} from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import {
  getAllUploads, approveUpload, rejectUpload,
  type UploadedTrack, type UploadStatus,
} from '@services/uploadService';

type Tab = 'pending' | 'approved' | 'rejected' | 'all';

const TAB_CONFIG: { id: Tab; label: string; color: string }[] = [
  { id: 'pending',  label: 'In behandeling', color: 'text-amber-400' },
  { id: 'approved', label: 'Goedgekeurd',     color: 'text-emerald-400' },
  { id: 'rejected', label: 'Afgewezen',       color: 'text-red-400' },
  { id: 'all',      label: 'Alles',           color: 'text-slate-300' },
];

function statusBadge(status: UploadStatus) {
  if (status === 'pending')
    return <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5"><Clock size={10} /> In behandeling</span>;
  if (status === 'approved')
    return <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5"><CheckCircle size={10} /> Goedgekeurd</span>;
  return <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2.5 py-0.5"><XCircle size={10} /> Afgewezen</span>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function UploadCard({
  track,
  onApprove,
  onReject,
}: {
  track: UploadedTrack;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const handleReject = () => {
    onReject(track.id, reason);
    setRejecting(false);
    setReason('');
  };

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden transition-all hover:border-white/15">
      <div className="flex gap-4 p-4 sm:p-5">
        {/* Cover */}
        <img
          src={track.cover}
          alt={track.title}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 bg-white/5"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2 mb-1">
            <h3 className="font-semibold text-white leading-tight">{track.title}</h3>
            {statusBadge(track.status)}
          </div>

          <p className="text-sm text-slate-400 mb-2">
            <span className="text-slate-300">{track.artist}</span>
            <span className="mx-1.5 text-slate-600">·</span>
            {track.genre}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {track.explicit && (
              <span className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded">E</span>
            )}
            {track.isPrivate && (
              <span className="text-[10px] font-medium bg-slate-500/15 text-slate-400 border border-slate-500/20 px-1.5 py-0.5 rounded">Privé</span>
            )}
            {track.tags.map(tag => (
              <span key={tag} className="text-[10px] text-slate-500 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>

          <p className="text-xs text-slate-600">Ingediend {fmt(track.uploadedAt)}</p>

          {track.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">"{track.description}"</p>
          )}

          {track.status === 'rejected' && track.rejectionReason && (
            <p className="text-xs text-red-400/80 mt-1">Reden: {track.rejectionReason}</p>
          )}

          {track.status !== 'pending' && track.reviewedAt && (
            <p className="text-xs text-slate-600 mt-1">Beoordeeld op {fmt(track.reviewedAt)}</p>
          )}
        </div>

        {/* Actions */}
        {track.status === 'pending' && !rejecting && (
          <div className="flex flex-col gap-2 shrink-0 self-start">
            <button
              onClick={() => onApprove(track.id)}
              className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <CheckCircle size={14} />
              <span className="hidden sm:inline">Goedkeuren</span>
            </button>
            <button
              onClick={() => setRejecting(true)}
              className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <XCircle size={14} />
              <span className="hidden sm:inline">Afwijzen</span>
            </button>
          </div>
        )}

        {track.status === 'approved' && (
          <div className="shrink-0 self-start">
            <button
              onClick={() => onReject(track.id, '')}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-red-500/15 text-slate-500 hover:text-red-400 border border-white/8 hover:border-red-500/25 rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              <XCircle size={14} />
              <span className="hidden sm:inline">Intrekken</span>
            </button>
          </div>
        )}

        {track.status === 'rejected' && (
          <div className="shrink-0 self-start">
            <button
              onClick={() => onApprove(track.id)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-emerald-600/20 text-slate-500 hover:text-emerald-400 border border-white/8 hover:border-emerald-500/30 rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              <CheckCircle size={14} />
              <span className="hidden sm:inline">Goedkeuren</span>
            </button>
          </div>
        )}
      </div>

      {/* Reject reason input */}
      {rejecting && (
        <div className="border-t border-white/8 px-5 py-4 bg-red-500/5">
          <p className="text-xs font-medium text-red-400 mb-2">Reden voor afwijzing (optioneel)</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={reason}
              onChange={e => setReason(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleReject(); if (e.key === 'Escape') { setRejecting(false); setReason(''); } }}
              placeholder="Bijv. kwaliteit te laag, richtlijnen overtreden…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/40"
            />
            <button
              onClick={handleReject}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Bevestig
            </button>
            <button
              onClick={() => { setRejecting(false); setReason(''); }}
              className="bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('pending');
  const [tracks, setTracks] = useState<UploadedTrack[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await getAllUploads();
    setTracks(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    await approveUpload(id, user.id);
    await load();
  };

  const handleReject = async (id: string, reason: string) => {
    await rejectUpload(id, user.id, reason);
    await load();
  };

  const counts = {
    pending:  tracks.filter(t => t.status === 'pending').length,
    approved: tracks.filter(t => t.status === 'approved').length,
    rejected: tracks.filter(t => t.status === 'rejected').length,
    all:      tracks.length,
  };

  const visible = tracks
    .filter(t => tab === 'all' || t.status === tab)
    .filter(t =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.artist.toLowerCase().includes(search.toLowerCase()) ||
      t.genre.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
          <ShieldCheck size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-slate-500">Upload moderatie & beheer</p>
        </div>
        <button
          onClick={load}
          className="ml-auto p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          title="Vernieuwen"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{counts.pending}</p>
          <p className="text-xs text-slate-500 mt-0.5">In behandeling</p>
        </div>
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{counts.approved}</p>
          <p className="text-xs text-slate-500 mt-0.5">Goedgekeurd</p>
        </div>
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{counts.rejected}</p>
          <p className="text-xs text-slate-500 mt-0.5">Afgewezen</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex bg-white/[0.04] border border-white/8 rounded-xl p-1 gap-0.5">
          {TAB_CONFIG.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
              {counts[t.id] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/8 ${tab === t.id ? t.color : 'text-slate-600'}`}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek op titel, artiest of genre…"
            className="w-full bg-white/[0.04] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Upload list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-600">
          <RefreshCw size={20} className="animate-spin mr-2" />
          Laden…
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20">
          <Music size={36} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-500">
            {search ? 'Geen uploads gevonden voor deze zoekopdracht.' : 'Geen uploads in deze categorie.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(track => (
            <UploadCard
              key={track.id}
              track={track}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
