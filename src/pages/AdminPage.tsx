import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Music, Users, Calendar, Flag, MessageSquare,
  CheckCircle, XCircle, Clock, Search, RefreshCw,
  Ban, UserCheck, Eye, EyeOff, ChevronRight, AlertTriangle,
  Trash2, MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import {
  getAllUploads, approveUpload, rejectUpload,
  type UploadedTrack,
} from '@services/uploadService';
import {
  getUsers, suspendUser, unsuspendUser,
  getPendingEvents, approveEvent, rejectEvent,
  getReports, resolveReport, dismissReport,
  getHiddenItems, hideForumItem, unhideForumItem,
  type ManagedUser, type PendingEvent, type ContentReport, type HiddenItem,
} from '@services/adminService';
import { forumThreads, threadReplies } from '@data/mockData';

// ─── Shared helpers ───────────────────────────────────────────────────────────

type ReviewTab = 'pending' | 'approved' | 'rejected' | 'all';
type Section = 'uploads' | 'users' | 'forum' | 'events' | 'reports';

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
    approved:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    rejected:  'text-red-400 bg-red-400/10 border-red-400/20',
    open:      'text-amber-400 bg-amber-400/10 border-amber-400/20',
    resolved:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    dismissed: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  };
  const label: Record<string, string> = {
    pending: 'In behandeling', approved: 'Goedgekeurd', rejected: 'Afgewezen',
    open: 'Open', resolved: 'Opgelost', dismissed: 'Gesloten',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5 ${map[status] ?? 'text-slate-400 bg-white/5 border-white/10'}`}>
      {label[status] ?? status}
    </span>
  );
}

function SectionSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/8 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
      />
    </div>
  );
}

function ReviewTabs({ tab, setTab, counts }: { tab: ReviewTab; setTab: (t: ReviewTab) => void; counts: Record<ReviewTab, number> }) {
  const tabs: { id: ReviewTab; label: string; color: string }[] = [
    { id: 'pending',  label: 'In behandeling', color: 'text-amber-400' },
    { id: 'approved', label: 'Goedgekeurd',    color: 'text-emerald-400' },
    { id: 'rejected', label: 'Afgewezen',      color: 'text-red-400' },
    { id: 'all',      label: 'Alles',          color: 'text-slate-300' },
  ];
  return (
    <div className="flex bg-white/[0.04] border border-white/8 rounded-xl p-1 gap-0.5 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {t.label}
          {counts[t.id] > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/8 ${tab === t.id ? t.color : 'text-slate-600'}`}>{counts[t.id]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function RejectInput({ onConfirm, onCancel, label = 'Reden (optioneel)' }: { onConfirm: (r: string) => void; onCancel: () => void; label?: string }) {
  const [reason, setReason] = useState('');
  return (
    <div className="border-t border-white/8 px-5 py-4 bg-red-500/5">
      <p className="text-xs font-medium text-red-400 mb-2">{label}</p>
      <div className="flex gap-2">
        <input autoFocus value={reason} onChange={e => setReason(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(reason); if (e.key === 'Escape') onCancel(); }}
          placeholder="Voer een reden in…"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/40"
        />
        <button onClick={() => onConfirm(reason)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">Bevestig</button>
        <button onClick={onCancel} className="bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 rounded-lg px-3 py-1.5 text-sm transition-colors">Annuleer</button>
      </div>
    </div>
  );
}

// ─── Uploads section ──────────────────────────────────────────────────────────

function UploadsSection({ adminId }: { adminId: number }) {
  const [tab, setTab] = useState<ReviewTab>('pending');
  const [tracks, setTracks] = useState<UploadedTrack[]>([]);
  const [search, setSearch] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => { setLoading(true); setTracks(await getAllUploads()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const counts = { pending: tracks.filter(t => t.status === 'pending').length, approved: tracks.filter(t => t.status === 'approved').length, rejected: tracks.filter(t => t.status === 'rejected').length, all: tracks.length };
  const visible = tracks.filter(t => tab === 'all' || t.status === tab).filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <ReviewTabs tab={tab} setTab={setTab} counts={counts} />
        <SectionSearch value={search} onChange={setSearch} placeholder="Zoek op titel of artiest…" />
      </div>

      {loading ? <LoadingState /> : visible.length === 0 ? <EmptyState icon={<Music size={32} />} label="Geen uploads gevonden." /> : (
        <div className="space-y-3">
          {visible.map(track => (
            <div key={track.id} className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all">
              <div className="flex gap-4 p-4 sm:p-5">
                <img src={track.cover} alt={track.title} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 bg-white/5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <h3 className="font-semibold text-white">{track.title}</h3>
                    <StatusBadge status={track.status} />
                  </div>
                  <p className="text-sm text-slate-400 mb-2"><span className="text-slate-300">{track.artist}</span> · {track.genre}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {track.explicit && <span className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded">E</span>}
                    {track.isPrivate && <span className="text-[10px] bg-slate-500/15 text-slate-400 border border-slate-500/20 px-1.5 py-0.5 rounded">Privé</span>}
                    {track.tags.map(tag => <span key={tag} className="text-[10px] text-slate-500 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">{tag}</span>)}
                  </div>
                  <p className="text-xs text-slate-600">Ingediend {fmt(track.uploadedAt)}</p>
                  {track.status === 'rejected' && track.rejectionReason && <p className="text-xs text-red-400/80 mt-1">Reden: {track.rejectionReason}</p>}
                </div>
                <div className="flex flex-col gap-2 shrink-0 self-start">
                  {track.status !== 'approved' && (
                    <button onClick={async () => { await approveUpload(track.id, adminId); load(); }} className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
                      <CheckCircle size={13} /><span className="hidden sm:inline">Goedkeuren</span>
                    </button>
                  )}
                  {track.status !== 'rejected' && (
                    <button onClick={() => setRejectingId(track.id)} className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
                      <XCircle size={13} /><span className="hidden sm:inline">Afwijzen</span>
                    </button>
                  )}
                </div>
              </div>
              {rejectingId === track.id && (
                <RejectInput
                  onConfirm={async r => { await rejectUpload(track.id, adminId, r); setRejectingId(null); load(); }}
                  onCancel={() => setRejectingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Users section ────────────────────────────────────────────────────────────

function UsersSection() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [suspendingId, setSuspendingId] = useState<number | null>(null);

  const load = () => setUsers(getUsers());
  useEffect(() => { load(); }, []);

  const visible = users
    .filter(u => filter === 'all' || (filter === 'suspended' ? u.suspended : !u.suspended))
    .filter(u => !search || u.displayName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()));

  const counts = { all: users.length, active: users.filter(u => !u.suspended).length, suspended: users.filter(u => u.suspended).length };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white/[0.04] border border-white/8 rounded-xl p-1 gap-0.5">
          {(['all', 'active', 'suspended'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === f ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {{ all: 'Allemaal', active: 'Actief', suspended: 'Geschorst' }[f]}
              <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/8 ${filter === f ? (f === 'suspended' ? 'text-red-400' : 'text-slate-300') : 'text-slate-600'}`}>{counts[f]}</span>
            </button>
          ))}
        </div>
        <SectionSearch value={search} onChange={setSearch} placeholder="Zoek op naam, gebruikersnaam of rol…" />
      </div>

      {visible.length === 0 ? <EmptyState icon={<Users size={32} />} label="Geen gebruikers gevonden." /> : (
        <div className="space-y-2">
          {visible.map(u => (
            <div key={u.id} className={`bg-white/[0.03] border rounded-xl overflow-hidden transition-all ${u.suspended ? 'border-red-500/20' : 'border-white/8 hover:border-white/15'}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <img src={u.avatar} alt={u.displayName} className={`w-10 h-10 rounded-full object-cover shrink-0 ${u.suspended ? 'opacity-50 grayscale' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white text-sm">{u.displayName}</span>
                    <span className="text-xs text-slate-500">@{u.username}</span>
                    {u.verified && <span className="text-[10px] text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded-full px-1.5 py-0.5">✓ Geverifieerd</span>}
                    {u.suspended && <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-1.5 py-0.5">Geschorst</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{u.role} · Lid sinds {u.joinedDate}</p>
                  {u.suspended && u.suspendedReason && <p className="text-xs text-red-400/70 mt-0.5">Reden: {u.suspendedReason}</p>}
                </div>
                <div className="shrink-0">
                  {u.suspended ? (
                    <button onClick={() => { unsuspendUser(u.id); load(); }}
                      className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                      <UserCheck size={12} /><span className="hidden sm:inline">Opheffen</span>
                    </button>
                  ) : (
                    <button onClick={() => setSuspendingId(u.id)}
                      className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                      <Ban size={12} /><span className="hidden sm:inline">Schorsen</span>
                    </button>
                  )}
                </div>
              </div>
              {suspendingId === u.id && (
                <RejectInput
                  label="Reden voor schorsing (optioneel)"
                  onConfirm={r => { suspendUser(u.id, r); setSuspendingId(null); load(); }}
                  onCancel={() => setSuspendingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Forum section ────────────────────────────────────────────────────────────

function ForumSection() {
  const [hidden, setHidden] = useState<HiddenItem[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'threads' | 'hidden'>('threads');
  const [hidingItem, setHidingItem] = useState<{ type: 'thread' | 'reply'; id: number; title: string } | null>(null);

  const load = () => setHidden(getHiddenItems());
  useEffect(() => { load(); }, []);

  const threads = forumThreads.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.author.name.toLowerCase().includes(search.toLowerCase()));

  const replies = threadReplies.filter(r => !search || r.content.toLowerCase().includes(search.toLowerCase()) || r.author.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white/[0.04] border border-white/8 rounded-xl p-1 gap-0.5">
          {(['threads', 'hidden'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {{ threads: 'Threads', hidden: 'Verborgen' }[v]}
              {v === 'hidden' && hidden.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/8 text-amber-400">{hidden.length}</span>}
            </button>
          ))}
        </div>
        <SectionSearch value={search} onChange={setSearch} placeholder="Zoek threads of reacties…" />
      </div>

      {view === 'threads' && (
        <div className="space-y-2">
          {threads.length === 0 ? <EmptyState icon={<MessageSquare size={32} />} label="Geen threads gevonden." /> : threads.map(thread => {
            const isHid = hidden.some(h => h.type === 'thread' && h.id === thread.id);
            return (
              <div key={thread.id} className={`bg-white/[0.03] border rounded-xl px-4 py-3 flex items-start gap-3 transition-all ${isHid ? 'border-amber-500/20 opacity-60' : 'border-white/8 hover:border-white/15'}`}>
                <img src={thread.author.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white line-clamp-1">{thread.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{thread.author.name} · {thread.replies} reacties · {thread.views} views</p>
                </div>
                {isHid ? (
                  <button onClick={() => { unhideForumItem('thread', thread.id); load(); }}
                    className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs transition-colors shrink-0">
                    <Eye size={11} /><span className="hidden sm:inline">Zichtbaar</span>
                  </button>
                ) : (
                  <button onClick={() => setHidingItem({ type: 'thread', id: thread.id, title: thread.title })}
                    className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg px-2.5 py-1.5 text-xs transition-colors shrink-0">
                    <EyeOff size={11} /><span className="hidden sm:inline">Verbergen</span>
                  </button>
                )}
              </div>
            );
          })}

          {replies.length > 0 && (
            <>
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wider pt-2 pb-1">Recente reacties</p>
              {replies.map(reply => {
                const isHid = hidden.some(h => h.type === 'reply' && h.id === reply.id);
                return (
                  <div key={reply.id} className={`bg-white/[0.02] border rounded-xl px-4 py-3 flex items-start gap-3 transition-all ${isHid ? 'border-amber-500/20 opacity-60' : 'border-white/6 hover:border-white/12'}`}>
                    <img src={reply.author.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 line-clamp-2">{reply.content}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{reply.author.name} · {fmt(reply.createdAt)}</p>
                    </div>
                    {isHid ? (
                      <button onClick={() => { unhideForumItem('reply', reply.id); load(); }}
                        className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs transition-colors shrink-0">
                        <Eye size={11} />
                      </button>
                    ) : (
                      <button onClick={() => setHidingItem({ type: 'reply', id: reply.id, title: reply.content.slice(0, 40) })}
                        className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg px-2.5 py-1.5 text-xs transition-colors shrink-0">
                        <EyeOff size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {view === 'hidden' && (
        hidden.length === 0
          ? <EmptyState icon={<EyeOff size={32} />} label="Geen verborgen content." />
          : <div className="space-y-2">
            {hidden.map(item => (
              <div key={`${item.type}-${item.id}`} className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <EyeOff size={14} className="text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white line-clamp-1">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.type === 'thread' ? 'Thread' : 'Reactie'} · Verborgen op {fmt(item.hiddenAt)}</p>
                  {item.reason && <p className="text-xs text-amber-400/70">Reden: {item.reason}</p>}
                </div>
                <button onClick={() => { unhideForumItem(item.type, item.id); load(); }}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs transition-colors shrink-0">
                  <Eye size={11} /> Herstellen
                </button>
              </div>
            ))}
          </div>
      )}

      {/* Hide confirm overlay */}
      {hidingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1e1833] border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="font-semibold text-white mb-1">Content verbergen</h3>
            <p className="text-sm text-slate-400 mb-4 line-clamp-2">"{hidingItem.title}"</p>
            <p className="text-xs font-medium text-slate-400 mb-2">Reden (optioneel)</p>
            <RejectInput
              label=""
              onConfirm={r => { hideForumItem(hidingItem.type, hidingItem.id, hidingItem.title, r); setHidingItem(null); load(); }}
              onCancel={() => setHidingItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Events section ───────────────────────────────────────────────────────────

function EventsSection() {
  const [tab, setTab] = useState<ReviewTab>('pending');
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [search, setSearch] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const load = () => setEvents(getPendingEvents());
  useEffect(() => { load(); }, []);

  const counts = { pending: events.filter(e => e.status === 'pending').length, approved: events.filter(e => e.status === 'approved').length, rejected: events.filter(e => e.status === 'rejected').length, all: events.length };
  const visible = events.filter(e => tab === 'all' || e.status === tab).filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.city.toLowerCase().includes(search.toLowerCase()) || e.genre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <ReviewTabs tab={tab} setTab={setTab} counts={counts} />
        <SectionSearch value={search} onChange={setSearch} placeholder="Zoek op titel, stad of genre…" />
      </div>

      {visible.length === 0 ? <EmptyState icon={<Calendar size={32} />} label="Geen evenementen gevonden." /> : (
        <div className="space-y-3">
          {visible.map(evt => (
            <div key={evt.id} className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all">
              <div className="flex gap-4 p-4 sm:p-5">
                <img src={evt.poster} alt={evt.title} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 bg-white/5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <h3 className="font-semibold text-white">{evt.title}</h3>
                    <StatusBadge status={evt.status} />
                  </div>
                  <p className="text-sm text-slate-400 mb-1">
                    {new Date(evt.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} · {evt.time} · {evt.venue}, {evt.city}
                  </p>
                  <p className="text-xs text-slate-500 mb-1">{evt.genre}</p>
                  {evt.description && <p className="text-xs text-slate-500 line-clamp-2 italic">"{evt.description}"</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <img src={evt.submittedByAvatar} alt="" className="w-4 h-4 rounded-full" />
                    <p className="text-xs text-slate-600">Ingediend door @{evt.submittedBy} · {fmt(evt.submittedAt)}</p>
                  </div>
                  {evt.status === 'rejected' && evt.rejectionReason && <p className="text-xs text-red-400/80 mt-1">Reden: {evt.rejectionReason}</p>}
                </div>
                <div className="flex flex-col gap-2 shrink-0 self-start">
                  {evt.status !== 'approved' && (
                    <button onClick={() => { approveEvent(evt.id); load(); }} className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
                      <CheckCircle size={13} /><span className="hidden sm:inline">Goedkeuren</span>
                    </button>
                  )}
                  {evt.status !== 'rejected' && (
                    <button onClick={() => setRejectingId(evt.id)} className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
                      <XCircle size={13} /><span className="hidden sm:inline">Afwijzen</span>
                    </button>
                  )}
                </div>
              </div>
              {rejectingId === evt.id && (
                <RejectInput onConfirm={r => { rejectEvent(evt.id, r); setRejectingId(null); load(); }} onCancel={() => setRejectingId(null)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reports section ──────────────────────────────────────────────────────────

function ReportsSection() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'dismissed' | 'all'>('open');
  const [search, setSearch] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = () => setReports(getReports());
  useEffect(() => { load(); }, []);

  const counts = { open: reports.filter(r => r.status === 'open').length, resolved: reports.filter(r => r.status === 'resolved').length, dismissed: reports.filter(r => r.status === 'dismissed').length, all: reports.length };
  const visible = reports.filter(r => filter === 'all' || r.status === filter).filter(r => !search || r.targetTitle.toLowerCase().includes(search.toLowerCase()) || r.reportedBy.toLowerCase().includes(search.toLowerCase()) || r.reason.toLowerCase().includes(search.toLowerCase()));

  const typeLabel: Record<string, string> = { track: 'Nummer', thread: 'Thread', reply: 'Reactie', user: 'Gebruiker', event: 'Evenement' };
  const typeColor: Record<string, string> = { track: 'text-violet-400 bg-violet-400/10 border-violet-400/20', thread: 'text-blue-400 bg-blue-400/10 border-blue-400/20', reply: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', user: 'text-red-400 bg-red-400/10 border-red-400/20', event: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white/[0.04] border border-white/8 rounded-xl p-1 gap-0.5 overflow-x-auto">
          {(['open', 'resolved', 'dismissed', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === f ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {{ open: 'Open', resolved: 'Opgelost', dismissed: 'Gesloten', all: 'Alles' }[f]}
              {counts[f] > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/8 ${filter === f && f === 'open' ? 'text-amber-400' : 'text-slate-600'}`}>{counts[f]}</span>}
            </button>
          ))}
        </div>
        <SectionSearch value={search} onChange={setSearch} placeholder="Zoek op titel, melder of reden…" />
      </div>

      {visible.length === 0 ? <EmptyState icon={<Flag size={32} />} label="Geen meldingen gevonden." /> : (
        <div className="space-y-3">
          {visible.map(report => (
            <div key={report.id} className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all">
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${typeColor[report.type]}`}>{typeLabel[report.type]}</span>
                      <StatusBadge status={report.status} />
                      <span className="text-xs font-medium text-white">{report.reason}</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-1 line-clamp-1">{report.targetTitle}</p>
                    {report.details && <p className="text-xs text-slate-500 mb-2 line-clamp-2">"{report.details}"</p>}
                    <div className="flex items-center gap-2">
                      <img src={report.reportedByAvatar} alt="" className="w-4 h-4 rounded-full" />
                      <p className="text-xs text-slate-600">Gemeld door @{report.reportedBy} · {fmt(report.createdAt)}</p>
                    </div>
                    {report.adminNotes && <p className="text-xs text-emerald-400/70 mt-1">Notitie: {report.adminNotes}</p>}
                  </div>
                  {report.status === 'open' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => setResolvingId(report.id)} className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-400 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors">
                        <CheckCircle size={11} /><span className="hidden sm:inline">Oplossen</span>
                      </button>
                      <button onClick={() => { dismissReport(report.id); load(); }} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs transition-colors">
                        <XCircle size={11} /><span className="hidden sm:inline">Sluiten</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {resolvingId === report.id && (
                <RejectInput
                  label="Admin notitie (optioneel)"
                  onConfirm={notes => { resolveReport(report.id, notes); setResolvingId(null); load(); }}
                  onCancel={() => setResolvingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-600">
      <RefreshCw size={18} className="animate-spin mr-2" /> Laden…
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-slate-700 flex justify-center mb-3">{icon}</div>
      <p className="text-slate-500 text-sm">{label}</p>
    </div>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'uploads', label: 'Uploads',     icon: <Music size={16} />,         description: 'Muziek goedkeuren' },
  { id: 'users',   label: 'Gebruikers',  icon: <Users size={16} />,         description: 'Accounts beheren' },
  { id: 'forum',   label: 'Forum',       icon: <MessageSquare size={16} />, description: 'Content modereren' },
  { id: 'events',  label: 'Evenementen', icon: <Calendar size={16} />,      description: 'Events goedkeuren' },
  { id: 'reports', label: 'Meldingen',   icon: <Flag size={16} />,          description: 'Rapporten behandelen' },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>('uploads');

  // Live badge counts for sidebar
  const [uploadPending, setUploadPending] = useState(0);
  const [reportOpen, setReportOpen] = useState(0);
  const [eventPending, setEventPending] = useState(0);

  useEffect(() => {
    getAllUploads().then(t => setUploadPending(t.filter(x => x.status === 'pending').length));
    setReportOpen(getReports().filter(r => r.status === 'open').length);
    setEventPending(getPendingEvents().filter(e => e.status === 'pending').length);
  }, [section]);

  const badges: Partial<Record<Section, number>> = {
    uploads: uploadPending,
    reports: reportOpen,
    events:  eventPending,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
          <ShieldCheck size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-slate-500">Beheer & moderatie — ingelogd als <span className="text-slate-400">{user?.displayName}</span></p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-52 shrink-0">
          {/* Mobile: horizontal scroll tabs */}
          <div className="flex lg:hidden gap-1 overflow-x-auto pb-1 mb-2">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors relative ${section === s.id ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/8'}`}
              >
                {s.icon} {s.label}
                {badges[s.id] ? <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-[9px] font-bold text-black rounded-full flex items-center justify-center">{badges[s.id]}</span> : null}
              </button>
            ))}
          </div>

          {/* Desktop: vertical sidebar */}
          <nav className="hidden lg:flex flex-col gap-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left relative ${section === s.id ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
              >
                <span className={section === s.id ? 'text-violet-400' : 'text-slate-600'}>{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="leading-tight">{s.label}</p>
                  <p className="text-[10px] text-slate-600 leading-tight mt-0.5">{s.description}</p>
                </div>
                {badges[s.id] ? <span className="w-5 h-5 bg-amber-500 text-[10px] font-bold text-black rounded-full flex items-center justify-center shrink-0">{badges[s.id]}</span> : null}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-violet-400">{SECTIONS.find(s => s.id === section)?.icon}</span>
              <h2 className="font-semibold text-white">{SECTIONS.find(s => s.id === section)?.label}</h2>
            </div>
            {section === 'uploads' && <UploadsSection adminId={user?.id} />}
            {section === 'users'   && <UsersSection />}
            {section === 'forum'   && <ForumSection />}
            {section === 'events'  && <EventsSection />}
            {section === 'reports' && <ReportsSection />}
          </div>
        </main>
      </div>
    </div>
  );
}
