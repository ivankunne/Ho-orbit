import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Music, Mic2, Globe, Newspaper,
  Video, Send, Loader2, Users, LogOut, UserPlus,
  Lock, CheckCircle2, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import UserAvatar from '@components/UserAvatar';

const CHANNELS = [
  { key: 'rehearsals', label: 'Repetities',  icon: Music,      color: 'text-violet-400' },
  { key: 'gigs',       label: 'Optredens',   icon: Mic2,       color: 'text-pink-400'   },
  { key: 'socials',    label: 'Socials',      icon: Globe,      color: 'text-sky-400'    },
  { key: 'magazine',   label: 'Magazine',     icon: Newspaper,  color: 'text-amber-400'  },
  { key: 'media',      label: 'Media',        icon: Video,      color: 'text-emerald-400' },
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
  const [members, setMembers] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('rehearsals');
  const [messages, setMessages] = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [joining, setJoining] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load band + membership
  useEffect(() => {
    if (!id) return;
    (async () => {
      const [bandRes, membersRes] = await Promise.all([
        supabase.from('bands').select('*').eq('id', id).single(),
        supabase.from('band_members').select('*, profile:profiles(id,username,display_name,avatar_url)').eq('band_id', id),
      ]);
      setBand(bandRes.data);
      const mems = membersRes.data ?? [];
      setMembers(mems);
      const mine = mems.find((m: any) => m.user_id === user?.id);
      setIsMember(!!mine);
      setIsAdmin(mine?.role === 'admin');
      setLoading(false);
    })();
  }, [id, user?.id]);

  // Load messages when channel or band changes
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

  // Realtime subscription for this channel
  useEffect(() => {
    if (!id || !isMember) return;
    const channel = supabase
      .channel(`band-${id}-${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'band_messages',
        filter: `band_id=eq.${id}`,
      }, async (payload) => {
        if (payload.new.channel !== activeChannel) return;
        // Fetch sender profile
        const { data: sender } = await supabase
          .from('profiles').select('id,username,display_name,avatar_url')
          .eq('id', payload.new.sender_id).single();
        const msg = { ...payload.new, sender };
        setMessages(prev => [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, activeChannel, isMember]);

  async function handleSend() {
    if (!input.trim() || !user || !isMember || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    const { error } = await supabase.from('band_messages').insert({
      band_id: id,
      channel: activeChannel,
      sender_id: user.id,
      content,
    });
    if (error) {
      setInput(content);
      addToast('Bericht kon niet worden verstuurd', 'error');
    }
    setSending(false);
    inputRef.current?.focus();
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleJoin() {
    if (!user || !id) return;
    setJoining(true);
    const { error } = await supabase.from('band_members').insert({ band_id: id, user_id: user.id, role: 'member' });
    if (error) { addToast('Deelnemen mislukt', 'error'); setJoining(false); return; }
    setIsMember(true);
    // Add self to member list so the panel reflects it immediately
    const { data: myProfile } = await supabase
      .from('profiles').select('id,username,display_name,avatar_url').eq('id', user.id).single();
    setMembers(prev => [...prev, { id: crypto.randomUUID(), band_id: id, user_id: user.id, role: 'member', profile: myProfile }]);
    addToast(`Je hebt ${band.name} vervoegd!`, 'success');
    setJoining(false);
    loadMessages();
  }

  async function handleLeave() {
    if (!user || !id) return;
    await supabase.from('band_members').delete().eq('band_id', id).eq('user_id', user.id);
    addToast('Je hebt de band verlaten', 'info');
    navigate('/bandspace');
  }

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
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/bandspace"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} /> Band Space
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMembers(v => !v)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <Users size={16} /> {members.length} leden
          </button>
          {isMember && !isAdmin && (
            <button
              onClick={handleLeave}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} /> Verlaten
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
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
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

        {/* Chat area */}
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
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <ActiveIcon size={32} className="opacity-20 mb-3" />
                <p className="text-sm">Nog geen berichten in {activeCh.label}</p>
                {isMember && <p className="text-xs mt-1">Stuur het eerste bericht!</p>}
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
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
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

          {/* Input */}
          {isMember ? (
            <div className="border-t border-white/8 px-4 py-3 flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
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
          ) : (
            <div className="border-t border-white/8 px-4 py-4 text-center">
              {band.is_public ? (
                <button
                  onClick={handleJoin}
                  disabled={joining || !user}
                  className="flex items-center gap-2 mx-auto bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {joining ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Deelnemen aan {band.name}
                </button>
              ) : (
                <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                  <Lock size={14} /> Privéband — je hebt een uitnodiging nodig
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Members panel */}
      {showMembers && (
        <div className="fixed inset-y-0 right-0 w-72 bg-[#1e1a2e] border-l border-white/10 z-40 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h3 className="font-semibold text-white">Leden ({members.length})</h3>
            <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
                <UserAvatar
                  src={m.profile?.avatar_url}
                  name={m.profile?.display_name || m.profile?.username}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {m.profile?.display_name || m.profile?.username}
                  </p>
                  {m.role === 'admin' && (
                    <span className="text-[10px] text-violet-400 font-medium flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> Admin
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
