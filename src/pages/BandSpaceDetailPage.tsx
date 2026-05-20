import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Music, Mic2, Globe, Newspaper, Video,
  Send, Loader2, Users, LogOut, UserPlus, Lock,
  CheckCircle2, X, Clock, Check, Trash2,
  Pin, Paperclip, Search, ChevronDown, Hash, Menu,
  Image as ImageIcon, FileText as FileIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import UserAvatar from '@components/UserAvatar';
import {
  type ChannelKey,
  type ChannelPreview,
  getChannelPreviews,
  markChannelRead,
  uploadBandMedia,
  setPinned,
} from '@services/orbitService';

// ── Channel definitions ───────────────────────────────────────────────────────
// Keys match the `channel` column values in band_messages (do not rename).
// Labels and icons reflect the "Orbit - X" naming convention.
const CHANNELS = [
  { key: 'rehearsals' as ChannelKey, label: 'Repetities',   icon: Music,     color: 'text-violet-400',  bg: 'bg-violet-600/15'  },
  { key: 'gigs'       as ChannelKey, label: 'Gigs',          icon: Mic2,      color: 'text-pink-400',    bg: 'bg-pink-500/15'    },
  { key: 'socials'    as ChannelKey, label: 'Socials',        icon: Globe,     color: 'text-sky-400',     bg: 'bg-sky-500/15'     },
  { key: 'magazine'   as ChannelKey, label: 'Muziekbladen',  icon: Newspaper, color: 'text-amber-400',   bg: 'bg-amber-500/15'   },
  { key: 'media'      as ChannelKey, label: 'Media',          icon: Video,     color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }
  return (
    d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  );
}

function shortTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'nu';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BandSpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();

  // ── Core band state ──────────────────────────────────────────────────────
  const [band, setBand] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);   // status = 'active'
  const [pending, setPending] = useState<any[]>([]);   // status = 'pending'
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Chat state ───────────────────────────────────────────────────────────
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('rehearsals');
  const [messages, setMessages] = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // ── Sidebar / members panel state ────────────────────────────────────────
  const [showMembers, setShowMembers] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [channelPreviews, setChannelPreviews] = useState<Partial<Record<ChannelKey, ChannelPreview>>>({});

  // ── Pinned messages state ────────────────────────────────────────────────
  const [showPinned, setShowPinned] = useState(false);

  // ── Media upload state ───────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── Membership action state ──────────────────────────────────────────────
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived data ─────────────────────────────────────────────────────────
  const activeCh = CHANNELS.find(c => c.key === activeChannel)!;
  const ActiveIcon = activeCh.icon;
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const filteredChannels = CHANNELS.filter(ch =>
    ch.label.toLowerCase().includes(channelSearch.toLowerCase()),
  );

  // ── Load band + all members ──────────────────────────────────────────────
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

  // ── Load messages for active channel ────────────────────────────────────
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

  // ── Mark channel as read when we open it ────────────────────────────────
  useEffect(() => {
    if (!id || !isMember) return;
    markChannelRead(id, activeChannel);
    // Refresh previews so the unread dot clears immediately
    if (user) getChannelPreviews(id, user.id).then(setChannelPreviews);
  }, [id, activeChannel, isMember, user]);

  // ── Load channel previews for the sidebar ───────────────────────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;
    getChannelPreviews(id, user.id).then(setChannelPreviews);
  }, [id, isMember, user]);

  // ── Realtime: new messages + pin/attachment updates ──────────────────────
  useEffect(() => {
    if (!id || !isMember) return;

    const ch = supabase
      .channel(`band-${id}-${activeChannel}`)
      // New message arrives
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'band_messages',
        filter: `band_id=eq.${id}`,
      }, async (payload) => {
        if (payload.new.channel !== activeChannel) {
          // Refresh sidebar previews so other channels show their unread dot
          if (user) getChannelPreviews(id, user.id).then(setChannelPreviews);
          return;
        }
        const { data: sender } = await supabase
          .from('profiles')
          .select('id,username,display_name,avatar_url')
          .eq('id', payload.new.sender_id)
          .single();
        setMessages(prev => [...prev, { ...payload.new, sender }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        // Update sidebar preview for current channel
        if (user) getChannelPreviews(id, user.id).then(setChannelPreviews);
      })
      // Pin/attachment update arrives
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'band_messages',
        filter: `band_id=eq.${id}`,
      }, (payload) => {
        if (payload.new.channel !== activeChannel) return;
        setMessages(prev =>
          prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m),
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id, activeChannel, isMember, user]);

  // ── Send text message ────────────────────────────────────────────────────
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

  // ── Upload & send file attachment ────────────────────────────────────────
  async function handleFileUpload(file: File) {
    if (!file || !id || !user || !isMember) return;
    setUploading(true);
    const result = await uploadBandMedia(file, id);
    if (!result) {
      addToast('Upload mislukt. Controleer of de bucket bestaat.', 'error');
      setUploading(false);
      return;
    }
    const content = input.trim() || file.name;
    setInput('');
    const { error } = await supabase.from('band_messages').insert({
      band_id: id,
      channel: activeChannel,
      sender_id: user.id,
      content,
      attachment_url: result.url,
      attachment_type: result.type,
    });
    if (error) addToast('Bericht kon niet worden verstuurd', 'error');
    setUploading(false);
    inputRef.current?.focus();
  }

  // ── Drag-and-drop (Media channel) ────────────────────────────────────────
  function handleDragOver(e: React.DragEvent) {
    if (activeChannel !== 'media' || !isMember) return;
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() { setIsDragging(false); }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (activeChannel !== 'media' || !isMember) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  // ── Toggle pin on a message (admin only) ────────────────────────────────
  async function handleTogglePin(msg: any) {
    if (!isAdmin || !user) return;
    const newPinned = !msg.is_pinned;
    const ok = await setPinned(msg.id, newPinned, newPinned ? user.id : null);
    if (!ok) { addToast('Vastpinnen mislukt', 'error'); return; }
    setMessages(prev =>
      prev.map(m => m.id === msg.id
        ? { ...m, is_pinned: newPinned, pinned_by: newPinned ? user.id : null }
        : m),
    );
    addToast(newPinned ? 'Bericht vastgepind' : 'Pin verwijderd', 'info');
  }

  // ── Channel switch ───────────────────────────────────────────────────────
  function switchChannel(key: ChannelKey) {
    setActiveChannel(key);
    setShowMobileSidebar(false);
    // setInput(''); // Keep draft? For now, clear it.
  }

  // ── Membership actions ───────────────────────────────────────────────────
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

  async function handleCancelRequest() {
    if (!user || !id) return;
    await supabase.from('band_members').delete().eq('band_id', id).eq('user_id', user.id);
    setIsPending(false);
    addToast('Aanvraag ingetrokken', 'info');
  }

  async function handleLeave() {
    if (!user || !id) return;
    setLeaving(true);
    await supabase.from('band_members').delete().eq('band_id', id).eq('user_id', user.id);
    addToast('Je hebt de band verlaten', 'info');
    navigate('/bandspace');
  }

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

  async function handleDecline(memberId: string, profile: any) {
    const { error } = await supabase.from('band_members').delete().eq('id', memberId);
    if (error) { addToast('Afwijzen mislukt', 'error'); return; }
    setPending(prev => prev.filter(m => m.id !== memberId));
    addToast(`${profile?.display_name || profile?.username} afgewezen`, 'info');
  }

  async function handleRemoveMember(memberId: string, profile: any) {
    const { error } = await supabase.from('band_members').delete().eq('id', memberId);
    if (error) { addToast('Verwijderen mislukt', 'error'); return; }
    setMembers(prev => prev.filter(m => m.id !== memberId));
    addToast(`${profile?.display_name || profile?.username} verwijderd`, 'info');
  }

  // ── Loading / not found ──────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-3 lg:px-6 py-5 flex flex-col h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)] min-h-[500px]">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link
          to="/bandspace"
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors shrink-0"
        >
          <ChevronLeft size={15} /> Band Space
        </Link>

        {/* Mobile: hamburger to toggle sidebar */}
        <button
          onClick={() => setShowMobileSidebar(v => !v)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={18} />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMembers(v => !v)}
            className="relative flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <Users size={15} /> {members.length} leden
            {isAdmin && pending.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center font-bold">
                {pending.length}
              </span>
            )}
          </button>
          {isMember && !isAdmin && (
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {leaving ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={13} />}
              Verlaten
            </button>
          )}
        </div>
      </div>

      {/* ── Main layout (sidebar + chat) ─────────────────────────────────── */}
      <div className="flex flex-1 gap-3 min-h-0">

        {/* ── Channel Sidebar ─────────────────────────────────────────── */}
        {/* Desktop: always visible. Mobile: overlay triggered by hamburger. */}
        <aside className={`
          w-56 shrink-0 flex-col
          bg-[#1c1730] border border-white/8 rounded-2xl overflow-hidden
          ${showMobileSidebar
            ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl rounded-none border-r border-white/10 w-64 pb-20'
            : 'hidden lg:flex'}
        `}>
          {/* Mobile close */}
          {showMobileSidebar && (
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          )}

          {/* Workspace header */}
          <div className="px-4 pt-4 pb-3 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/25 flex items-center justify-center shrink-0">
                <Music size={13} className="text-violet-400" />
              </div>
              <span className="text-sm font-bold text-white truncate">{band.name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Orbit Workspace</span>
              {!band.is_public && <Lock size={9} className="text-slate-500" />}
            </div>
          </div>

          {/* Channel search */}
          <div className="px-3 py-2.5 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5">
              <Search size={12} className="text-slate-500 shrink-0" />
              <input
                type="text"
                value={channelSearch}
                onChange={e => setChannelSearch(e.target.value)}
                placeholder="Zoek kanaal..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {channelSearch && (
                <button onClick={() => setChannelSearch('')} className="text-slate-600 hover:text-slate-400">
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-2 mb-2">
              Kanalen
            </p>
            {filteredChannels.map(ch => {
              const Icon = ch.icon;
              const active = activeChannel === ch.key;
              const preview = channelPreviews[ch.key];
              return (
                <button
                  key={ch.key}
                  onClick={() => switchChannel(ch.key)}
                  disabled={!isMember}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all disabled:opacity-40 ${
                    active
                      ? 'bg-violet-600/15 border border-violet-500/20'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Channel icon */}
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${active ? ch.bg : 'bg-white/5'}`}>
                    <Icon size={12} className={active ? ch.color : 'text-slate-500'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Channel name + unread dot */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium truncate ${active ? 'text-white' : 'text-slate-300'}`}>
                        {ch.label}
                      </span>
                      {preview?.hasUnread && !active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 animate-pulse" />
                      )}
                    </div>

                    {/* Last message preview */}
                    {preview?.lastContent && (
                      <p className="text-[10px] text-slate-600 truncate mt-0.5 leading-tight">
                        {preview.lastSender && (
                          <span className="text-slate-500">{preview.lastSender.split(' ')[0]}: </span>
                        )}
                        {preview.lastContent}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  {preview?.lastAt && (
                    <span className="text-[9px] text-slate-600 shrink-0 mt-0.5">
                      {shortTime(preview.lastAt)}
                    </span>
                  )}
                </button>
              );
            })}

            {filteredChannels.length === 0 && (
              <p className="text-xs text-slate-600 px-2 py-3">Geen kanalen gevonden</p>
            )}
          </div>

          {/* Band meta footer */}
          <div className="px-4 py-3 border-t border-white/8 shrink-0">
            <p className="text-[10px] text-slate-600 leading-tight">
              {band.genre && <span>{band.genre} · </span>}
              {members.length} {members.length === 1 ? 'lid' : 'leden'}
            </p>
          </div>
        </aside>

        {/* Mobile overlay backdrop */}
        {showMobileSidebar && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* ── Chat Area ──────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col bg-white/2 border border-white/8 rounded-2xl overflow-hidden min-w-0"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag-and-drop overlay (Media channel only) */}
          {isDragging && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-emerald-900/30 border-2 border-dashed border-emerald-400/50 rounded-2xl pointer-events-none">
              <Video size={36} className="text-emerald-400 mb-3" />
              <p className="text-emerald-300 font-semibold">Laat los om te uploaden</p>
            </div>
          )}

          {/* Channel header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/8 shrink-0">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${activeCh.bg}`}>
              <ActiveIcon size={13} className={activeCh.color} />
            </div>
            <div>
              <span className="font-semibold text-white text-sm">Orbit — {activeCh.label}</span>
            </div>
            <div className="flex-1" />
            {pinnedMessages.length > 0 && (
              <button
                onClick={() => setShowPinned(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-300 transition-colors"
              >
                <Pin size={11} />
                {pinnedMessages.length} vastgepind
                <ChevronDown size={11} className={`transition-transform ${showPinned ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Pinned messages bar (collapsible) */}
          {pinnedMessages.length > 0 && showPinned && (
            <div className="border-b border-white/8 bg-violet-950/30 px-4 py-2.5 space-y-1.5 shrink-0">
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2 text-xs bg-white/3 rounded-lg px-3 py-2">
                  <Pin size={10} className="text-violet-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-violet-300 font-medium">
                      {msg.sender?.display_name || msg.sender?.username}
                    </span>
                    <span className="text-slate-600 ml-1.5 text-[10px]">{formatTime(msg.created_at)}</span>
                    <p className="text-slate-300 truncate mt-0.5">{msg.content}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleTogglePin(msg)}
                      className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                      title="Pin verwijderen"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {msgLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-violet-400" />
              </div>
            ) : !isMember ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                <Lock size={28} className="opacity-30" />
                <p className="text-sm text-center">
                  {isPending
                    ? 'Je aanvraag wordt beoordeeld door de admin.'
                    : 'Alleen leden kunnen berichten zien.'}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <ActiveIcon size={32} className="opacity-20 mb-3" />
                <p className="text-sm">Nog geen berichten in Orbit — {activeCh.label}</p>
                <p className="text-xs mt-1 text-slate-600">Stuur het eerste bericht!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
                return (
                  <div key={msg.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}>
                    {showAvatar ? (
                      <UserAvatar
                        src={msg.sender?.avatar_url}
                        name={msg.sender?.display_name || msg.sender?.username}
                        size={30}
                        className="shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-[30px] shrink-0" />
                    )}

                    <div className={`max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showAvatar && (
                        <span className={`text-[11px] text-slate-500 mb-1 ${isMe ? 'text-right' : ''}`}>
                          {msg.sender?.display_name || msg.sender?.username}
                          <span className="ml-1.5 text-slate-600">{formatTime(msg.created_at)}</span>
                          {msg.is_pinned && (
                            <Pin size={9} className="inline ml-1.5 text-violet-400" />
                          )}
                        </span>
                      )}

                      {/* Text bubble */}
                      <div className={`relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? 'bg-violet-600 text-white rounded-tr-sm'
                          : 'bg-white/8 text-slate-100 rounded-tl-sm'
                      }`}>
                        {msg.content}

                        {/* Attachment rendering */}
                        {msg.attachment_url && (
                          <div className="mt-2">
                            {msg.attachment_type === 'image' ? (
                              <img
                                src={msg.attachment_url}
                                alt="bijlage"
                                className="max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.attachment_url, '_blank')}
                              />
                            ) : msg.attachment_type === 'video' ? (
                              <video
                                src={msg.attachment_url}
                                controls
                                className="max-w-[260px] rounded-xl"
                              />
                            ) : (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors mt-1"
                              >
                                <FileIcon size={12} className="shrink-0" />
                                Bijlage downloaden
                              </a>
                            )}
                          </div>
                        )}

                        {/* Admin: pin button on hover */}
                        {isAdmin && (
                          <button
                            onClick={() => handleTogglePin(msg)}
                            title={msg.is_pinned ? 'Losmaken' : 'Vastpinnen'}
                            className={`absolute -top-2 ${isMe ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-opacity bg-[#1c1730] border border-white/15 rounded-full p-1 text-slate-400 hover:text-violet-300`}
                          >
                            <Pin size={10} className={msg.is_pinned ? 'text-violet-400' : ''} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input area ──────────────────────────────────────────── */}
          {isMember ? (
            <div className="border-t border-white/8 px-4 py-3 flex items-end gap-2.5 shrink-0">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.zip"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              {/* Paperclip button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Bijlage toevoegen"
                className={`p-2 rounded-lg transition-colors text-slate-500 hover:text-white hover:bg-white/8 disabled:opacity-40 shrink-0 ${
                  activeChannel === 'media' ? 'text-emerald-500 hover:text-emerald-300' : ''
                }`}
              >
                {uploading
                  ? <Loader2 size={16} className="animate-spin" />
                  : activeChannel === 'media'
                  ? <ImageIcon size={16} />
                  : <Paperclip size={16} />
                }
              </button>

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeChannel === 'media'
                    ? 'Beschrijving (of sleep media hierheen)…'
                    : `Bericht in Orbit — ${activeCh.label}…`
                }
                rows={1}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors resize-none"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || uploading}
                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white transition-colors disabled:opacity-40 shrink-0"
              >
                {sending
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Send size={15} />
                }
              </button>
            </div>
          ) : isPending ? (
            <div className="border-t border-white/8 px-4 py-5 flex flex-col items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 text-amber-400">
                <Clock size={15} />
                <p className="text-sm font-medium">Aanvraag in behandeling</p>
              </div>
              <p className="text-xs text-slate-500 text-center max-w-xs">
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
            <div className="border-t border-white/8 px-4 py-5 flex flex-col items-center gap-3 shrink-0">
              {band.is_public ? (
                <>
                  <button
                    onClick={handleRequestJoin}
                    disabled={joining || !user}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {joining ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                    Aanvraag versturen
                  </button>
                  <p className="text-xs text-slate-500">De admin moet je aanvraag goedkeuren.</p>
                </>
              ) : (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Lock size={13} /> Privéband — je hebt een uitnodiging nodig
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Members + requests panel (slide-in from right) ─────────────── */}
      {showMembers && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:bg-transparent"
            onClick={() => setShowMembers(false)}
          />
          <div className="fixed inset-y-0 right-0 w-72 bg-[#1e1a2e] border-l border-white/10 z-50 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#1e1a2e] shrink-0">
              <h3 className="font-semibold text-white">Leden</h3>
              <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Pending requests — admins only */}
            {isAdmin && pending.length > 0 && (
              <div className="px-3 pt-4 pb-2 shrink-0">
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
                          <Check size={11} /> Accepteren
                        </button>
                        <button
                          onClick={() => handleDecline(m.id, m.profile)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors border border-red-500/15"
                        >
                          <X size={11} /> Afwijzen
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
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
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
                            <CheckCircle2 size={9} /> Admin
                          </span>
                        )}
                      </div>
                      {isAdmin && !isMe && m.role !== 'admin' && (
                        <button
                          onClick={() => handleRemoveMember(m.id, m.profile)}
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                          title="Verwijderen uit band"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
