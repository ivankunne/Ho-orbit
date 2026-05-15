import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Music, Mic2, Globe, Newspaper,
  Video, Send, Loader2, Users, LogOut, UserPlus,
  Lock, CheckCircle2, X, Clock, Check, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import UserAvatar from '@components/UserAvatar';

const CHANNELS = [
  { key: 'rehearsals', label: 'Repetities',  icon: Music,     color: 'text-violet-400'  },
  { key: 'gigs',       label: 'Optredens',   icon: Mic2,      color: 'text-pink-400'    },
  { key: 'socials',    label: 'Socials',      icon: Globe,     color: 'text-sky-400'     },
  { key: 'magazine',   label: 'Magazine',     icon: Newspaper, color: 'text-amber-400'   },
  { key: 'media',      label: 'Media',        icon: Video,     color: 'text-emerald-400' },
] as const;

type ChannelKey = typeof CHANNELS[number]['key'];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export default function BandSpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();

  const [band, setBand] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);   // status = 'active'
  const [pending, setPending] = useState<any[]>([]);   // status = 'pending'
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, setIsPending] = useState(false);   // current user has a pending request
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('rehearsals');
  const [messages, setMessages] = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load band + all members ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      const [bandRes, membersRes] = await Promise.all([
        supabase.from('bands').select('*').eq('id', id).single(),
        supabase
          .from('band_members')
          .select('*, profile:profiles(id,username,display_name,avatar_url)')
          .eq('band_id', id),
      ]);
      setBand(bandRes.data);

      const all = membersRes.data ?? [];
      const activeMembers = all.filter((m: any) => m.status === 'active');
      const pendingMembers = all.filter((m: any) => m.status === 'pending');
      setMembers(activeMembers);
      setPending(pendingMembers);

      const mine = all.find((m: any) => m.user_id === user?.id);
      setIsMember(mine?.status === 'active');
      setIsAdmin(mine?.status === 'active' && mine?.role === 'admin');
      setIsPending(mine?.status === 'pending');
      setLoading(false);
    })();
  }, [id, user?.id]);

  // ── Load messages for the active channel ─────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!id) return;
    setMsgLoading(true);
    const { data } = await supabase
      .from('band_messages')
      .select('*, sender:profiles(id,username,display_name,avatar_url)')
      .eq('band_id', id)
      .eq('channel', activeChannel)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(data ?? []);
    setMsgLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [id, activeChannel]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Realtime new messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isMember) return;
    const ch = supabase
      .channel(`band-${id}-${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'band_messages',
        filter: `band_id=eq.${id}`,
      }, async (payload) => {
        if (payload.new.channel !== activeChannel) return;
        const { data: sender } = await supabase
          .from('profiles').select('id,username,display_name,avatar_url')
          .eq('id', payload.new.sender_id).single();
        setMessages(prev => [...prev, { ...payload.new, sender }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, activeChannel, isMember]);

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || !user || !isMember || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    const { error } = await supabase.from('band_messages').insert({
      band_id: id, channel: activeChannel, sender_id: user.id, content,
    });
    if (error) { setInput(content); addToast('Bericht kon niet worden verstuurd', 'error'); }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Request to join (creates a pending row) ───────────────────────────────
  async function handleRequestJoin() {
    if (!user || !id) return;
    setJoining(true);
    const { error } = await supabase.from('band_members').insert({
      band_id: id, user_id: user.id, role: 'member', status: 'pending',
    });
    if (error) {
      addToast('Aanvraag mislukt', 'error');
    } else {
      setIsPending(true);
      addToast('Aanvraag verstuurd! De admin beoordeelt je aanvraag.', 'success');
    }
    setJoining(false);
  }

  // ── Cancel own request ────────────────────────────────────────────────────
  async function handleCancelRequest() {
    if (!user || !id) return;
    await supabase.from('band_members').delete().eq('band_id', id).eq('user_id', user.id);
    setIsPending(false);
    addToast('Aanvraag ingetrokken', 'info');
  }

  // ── Leave band ────────────────────────────────────────────────────────────
  async function handleLeave() {
    if (!user || !id) return;
    setLeaving(true);
    await supabase.from('band_members').delete().eq('band_id', id).eq('user_id', user.id);
    addToast('Je hebt de band verlaten', 'info');
    navigate('/bandspace');
  }

  // ── Admin: accept a pending request ──────────────────────────────────────
  async function handleAccept(memberId: string, profile: any) {
    const { error } = await supabase
      .from('band_members').update({ status: 'active' }).eq('id', memberId);
    if (error) { addToast('Accepteren mislukt', 'error'); return; }
    const accepted = pending.find(m => m.id === memberId);
    if (accepted) {
      setPending(prev => prev.filter(m => m.id !== memberId));
      setMembers(prev => [...prev, { ...accepted, status: 'active' }]);
    }
    addToast(`${profile?.display_name || profile?.username} geaccepteerd`, 'success');
  }

  // ── Admin: decline a pending request ─────────────────────────────────────
  async function handleDecline(memberId: string, profile: any) {
    const { error } = await supabase.from('band_members').delete().eq('id', memberId);
    if (error) { addToast('Afwijzen mislukt', 'error'); return; }
    setPending(prev => prev.filter(m => m.id !== memberId));
    addToast(`${profile?.display_name || profile?.username} afgewezen`, 'info');
  }

  // ── Admin: remove an active member ───────────────────────────────────────
  async function handleRemoveMember(memberId: string, profile: any) {
    const { error } = await supabase.from('band_members').delete().eq('id', memberId);
    if (error) { addToast('Verwijderen mislukt', 'error'); return; }
    setMembers(prev => prev.filter(m => m.id !== memberId));
    addToast(`${profile?.display_name || profile?.username} verwijderd`, 'info');
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!band) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-slate-400">
        <p className="text-xl font-semibold">Band niet gevonden</p>
        <Link to="/bandspace" className="text-violet-400 mt-2 hover:underline">← Terug naar Band Space</Link>
      </div>
    );
  }

  const activeCh = CHANNELS.find(c => c.key === activeChannel)!;
  const ActiveIcon = activeCh.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/bandspace" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={16} /> Band Space
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMembers(v => !v)}
            className="relative flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <Users size={16} /> {members.length} leden
            {isAdmin && pending.length > 0 && (
              <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center font-bold">
                {pending.length}
              </span>
            )}
          </button>
          {isMember && !isAdmin && (
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {leaving ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={14} />} Verlaten
            </button>
          )}
        </div>
      </div>

      {/* Band title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Music size={18} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{band.name}</h1>
          <p className="text-xs text-slate-500">
            {band.genre && `${band.genre} · `}
            {band.is_public ? 'Openbaar' : 'Privé'}
            {band.location && ` · ${band.location}`}
          </p>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[400px]">
        {/* Channel sidebar */}
        <div className="w-48 shrink-0 flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Orbit-kanalen</p>
          {CHANNELS.map(ch => {
            const Icon = ch.icon;
            const active = activeChannel === ch.key;
            return (
              <button
                key={ch.key}
                onClick={() => setActiveChannel(ch.key)}
                disabled={!isMember}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left disabled:opacity-40 ${
                  active
                    ? 'bg-violet-600/15 text-white border border-violet-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={15} className={active ? ch.color : ''} />
                {ch.label}
              </button>
            );
          })}
        </div>

        {/* Chat / gate area */}
        <div className="flex-1 flex flex-col bg-white/2 border border-white/8 rounded-2xl overflow-hidden">
          {/* Channel header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
            <ActiveIcon size={16} className={activeCh.color} />
            <span className="font-semibold text-white text-sm">Orbit — {activeCh.label}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {msgLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-violet-400" />
              </div>
            ) : !isMember ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                <Lock size={28} className="opacity-30" />
                <p className="text-sm">
                  {isPending
                    ? 'Je aanvraag wordt beoordeeld door de admin.'
                    : 'Alleen leden kunnen berichten zien.'}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <ActiveIcon size={32} className="opacity-20 mb-3" />
                <p className="text-sm">Nog geen berichten in {activeCh.label}</p>
                <p className="text-xs mt-1">Stuur het eerste bericht!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {showAvatar ? (
                      <UserAvatar
                        src={msg.sender?.avatar_url}
                        name={msg.sender?.display_name || msg.sender?.username}
                        size={32}
                        className="shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}
                    <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showAvatar && (
                        <span className={`text-xs text-slate-500 mb-1 ${isMe ? 'text-right' : ''}`}>
                          {msg.sender?.display_name || msg.sender?.username} · {formatTime(msg.created_at)}
                        </span>
                      )}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? 'bg-violet-600 text-white rounded-tr-sm'
                          : 'bg-white/8 text-slate-100 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Bottom action area */}
          {isMember ? (
            <div className="border-t border-white/8 px-4 py-3 flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Bericht in ${activeCh.label}…`}
                rows={1}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white transition-colors disabled:opacity-40 shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          ) : isPending ? (
            /* Pending state */
            <div className="border-t border-white/8 px-4 py-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Clock size={16} />
                <p className="text-sm font-medium">Aanvraag in behandeling</p>
              </div>
              <p className="text-xs text-slate-500 text-center">
                De admin beoordeelt jouw aanvraag. Je krijgt toegang zodra je geaccepteerd bent.
              </p>
              <button
                onClick={handleCancelRequest}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Aanvraag intrekken
              </button>
            </div>
          ) : (
            /* Join / private gate */
            <div className="border-t border-white/8 px-4 py-5 flex flex-col items-center gap-3">
              {band.is_public ? (
                <>
                  <button
                    onClick={handleRequestJoin}
                    disabled={joining || !user}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {joining ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Aanvraag versturen
                  </button>
                  <p className="text-xs text-slate-500">De admin moet je aanvraag goedkeuren.</p>
                </>
              ) : (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Lock size={14} /> Privéband — je hebt een uitnodiging nodig
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Members + requests panel (slide-in) */}
      {showMembers && (
        <div className="fixed inset-y-0 right-0 w-72 bg-[#1e1a2e] border-l border-white/10 z-40 flex flex-col shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#1e1a2e]">
            <h3 className="font-semibold text-white">Leden</h3>
            <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Pending requests — admins only */}
          {isAdmin && pending.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider px-2 mb-2">
                Aanvragen ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map((m: any) => (
                  <div key={m.id} className="bg-amber-400/5 border border-amber-400/15 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <UserAvatar
                        src={m.profile?.avatar_url}
                        name={m.profile?.display_name || m.profile?.username}
                        size={30}
                      />
                      <p className="text-sm font-medium text-white truncate">
                        {m.profile?.display_name || m.profile?.username}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(m.id, m.profile)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-semibold transition-colors border border-green-500/20"
                      >
                        <Check size={12} /> Accepteren
                      </button>
                      <button
                        onClick={() => handleDecline(m.id, m.profile)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors border border-red-500/15"
                      >
                        <X size={12} /> Afwijzen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active members */}
          <div className="px-3 pt-4 pb-6 flex-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
              Leden ({members.length})
            </p>
            <div className="space-y-1">
              {members.map((m: any) => {
                const isMe = m.user_id === user?.id;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <UserAvatar
                      src={m.profile?.avatar_url}
                      name={m.profile?.display_name || m.profile?.username}
                      size={34}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {m.profile?.display_name || m.profile?.username}
                        {isMe && <span className="text-slate-500 text-xs ml-1">(jij)</span>}
                      </p>
                      {m.role === 'admin' && (
                        <span className="text-[10px] text-violet-400 font-medium flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> Admin
                        </span>
                      )}
                    </div>
                    {isAdmin && !isMe && m.role !== 'admin' && (
                      <button
                        onClick={() => handleRemoveMember(m.id, m.profile)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                        title="Verwijderen uit band"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
