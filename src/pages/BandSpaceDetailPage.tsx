import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Music, Mic2, Globe, Newspaper, Video,
  Send, Loader2, Users, LogOut, UserPlus, Lock,
  X, Clock, Check, Trash2, Pin, Paperclip, ChevronDown, Menu,
  Image as ImageIcon, FileText as FileIcon, ShieldCheck,
  Calendar, Plus, MessageSquare, PenLine, AtSign,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import UserAvatar from '@components/UserAvatar';
import {
  type ChannelKey, type ChannelPreview, type BandEvent, type EventType,
  getChannelPreviews, markChannelRead,
  uploadBandMedia, setPinned,
  getBandEvents, createBandEvent, deleteBandEvent,
  getBandNote, saveBandNote,
  getMentionCounts, markMentionsRead, createMentionNotifications,
} from '@services/orbitService';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHANNELS = [
  { key: 'rehearsals' as ChannelKey, label: 'Repetities',  icon: Music,     color: 'text-violet-400',  bg: 'bg-violet-500/20',  accent: 'bg-violet-500',  border: 'border-violet-500/40'  },
  { key: 'gigs'       as ChannelKey, label: 'Gigs',         icon: Mic2,      color: 'text-pink-400',    bg: 'bg-pink-500/20',    accent: 'bg-pink-500',    border: 'border-pink-500/40'    },
  { key: 'socials'    as ChannelKey, label: 'Socials',       icon: Globe,     color: 'text-sky-400',     bg: 'bg-sky-500/20',     accent: 'bg-sky-500',     border: 'border-sky-500/40'     },
  { key: 'magazine'   as ChannelKey, label: 'Muziekbladen', icon: Newspaper, color: 'text-amber-400',   bg: 'bg-amber-500/20',   accent: 'bg-amber-500',   border: 'border-amber-500/40'   },
  { key: 'media'      as ChannelKey, label: 'Media',         icon: Video,     color: 'text-emerald-400', bg: 'bg-emerald-500/20', accent: 'bg-emerald-500', border: 'border-emerald-500/40' },
] as const;

const EVENT_TYPES: { value: EventType; label: string; color: string; dot: string; channel: ChannelKey | null }[] = [
  { value: 'rehearsal', label: 'Repetitie',  color: 'text-violet-400', dot: 'bg-violet-500', channel: 'rehearsals' },
  { value: 'gig',       label: 'Optreden',   color: 'text-pink-400',   dot: 'bg-pink-500',   channel: 'gigs'       },
  { value: 'deadline',  label: 'Deadline',   color: 'text-rose-400',   dot: 'bg-rose-500',   channel: null         },
  { value: 'other',     label: 'Anders',     color: 'text-slate-400',  dot: 'bg-slate-500',  channel: null         },
];

const NL_MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const NL_DAYS   = ['Ma','Di','Wo','Do','Vr','Za','Zo'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function shortTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'nu';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function getFirstWeekday(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BandSpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();

  // Core band state
  const [band, setBand]       = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading]   = useState(true);

  // View routing: 'channel' or 'calendar'
  const [activeView, setActiveView]   = useState<'channel' | 'calendar'>('channel');
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('rehearsals');
  const [channelTab, setChannelTab]   = useState<'chat' | 'notes'>('chat');

  // Chat state
  const [messages, setMessages]   = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // @mention autocomplete
  const [mentionSearch, setMentionSearch]   = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor]   = useState(0);
  const [mentionIndex, setMentionIndex]     = useState(0);
  const [mentionCounts, setMentionCounts]   = useState<Partial<Record<ChannelKey, number>>>({});

  // Sidebar + members panel
  const [showMembers, setShowMembers]         = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [channelPreviews, setChannelPreviews] = useState<Partial<Record<ChannelKey, ChannelPreview>>>({});

  // Calendar state
  const [calendarDate, setCalendarDate]   = useState(new Date());
  const [bandEvents, setBandEvents]       = useState<BandEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedDay, setSelectedDay]     = useState<number | null>(null);
  const [showAddEvent, setShowAddEvent]   = useState(false);
  const [savingEvent, setSavingEvent]     = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '', type: 'rehearsal' as EventType,
    date: '', time: '', description: '', autoPost: true,
  });

  // Notes state
  const [noteContent, setNoteContent]       = useState('');
  const [noteLoading, setNoteLoading]       = useState(false);
  const [noteSaving, setNoteSaving]         = useState(false);
  const [noteSaved, setNoteSaved]           = useState(false);
  const [noteLastUpdated, setNoteLastUpdated] = useState<any>(null);

  // Membership actions
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteTimer   = useRef<ReturnType<typeof setTimeout>>();

  // Derived
  const activeCh       = CHANNELS.find(c => c.key === activeChannel)!;
  const ActiveIcon     = activeCh.icon;
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const memberUsernames = new Set(
    members.map(m => (m.profile?.username || '').toLowerCase()).filter(Boolean),
  );
  const mentionSuggestions = mentionSearch !== null
    ? members.filter(m => {
        const n = (m.profile?.display_name || m.profile?.username || '').toLowerCase();
        const u = (m.profile?.username || '').toLowerCase();
        return n.startsWith(mentionSearch) || u.startsWith(mentionSearch);
      }).slice(0, 5)
    : [];

  // ── Load band + members ──────────────────────────────────────────────────
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
      setMembers(all.filter((m: any) => m.status === 'active'));
      setPending(all.filter((m: any) => m.status === 'pending'));

      const mine = all.find((m: any) => m.user_id === user?.id);
      setIsMember(mine?.status === 'active');
      setIsAdmin(mine?.status === 'active' && mine?.role === 'admin');
      setIsPending(mine?.status === 'pending');
      setLoading(false);
    })();
  }, [id, user?.id]);

  // ── Load messages ────────────────────────────────────────────────────────
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

  useEffect(() => { if (activeView === 'channel') loadMessages(); }, [loadMessages, activeView]);

  // ── Mark channel read + refresh previews + mentions ──────────────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;
    markChannelRead(id, activeChannel);
    markMentionsRead(id, activeChannel, user.id);
    getChannelPreviews(id, user.id).then(setChannelPreviews);
    getMentionCounts(id, user.id).then(setMentionCounts);
  }, [id, activeChannel, isMember, user]);

  // ── Initial sidebar previews + mention counts ────────────────────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;
    getChannelPreviews(id, user.id).then(setChannelPreviews);
    getMentionCounts(id, user.id).then(setMentionCounts);
  }, [id, isMember, user]);

  // ── Realtime: messages + pins + mention notifications ────────────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;

    const msgChannel = supabase
      .channel(`band-${id}-${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'band_messages',
        filter: `band_id=eq.${id}`,
      }, async (payload) => {
        if (payload.new.channel !== activeChannel) {
          getChannelPreviews(id, user.id).then(setChannelPreviews);
          return;
        }
        const { data: sender } = await supabase
          .from('profiles').select('id,username,display_name,avatar_url')
          .eq('id', payload.new.sender_id).single();
        setMessages(prev => [...prev, { ...payload.new, sender }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        getChannelPreviews(id, user.id).then(setChannelPreviews);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'band_messages',
        filter: `band_id=eq.${id}`,
      }, (payload) => {
        if (payload.new.channel !== activeChannel) return;
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .subscribe();

    const notifChannel = supabase
      .channel(`band-notif-${id}-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'band_notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => {
        getMentionCounts(id, user.id).then(setMentionCounts);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [id, activeChannel, isMember, user]);

  // ── Load calendar events ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeView !== 'calendar' || !id || !isMember) return;
    setEventsLoading(true);
    getBandEvents(id, calendarDate.getFullYear(), calendarDate.getMonth() + 1)
      .then(events => { setBandEvents(events); setEventsLoading(false); });
  }, [activeView, id, isMember, calendarDate]);

  // ── Load note for channel ────────────────────────────────────────────────
  useEffect(() => {
    if (channelTab !== 'notes' || !id || !isMember) return;
    setNoteLoading(true);
    setNoteSaved(false);
    getBandNote(id, activeChannel).then(note => {
      setNoteContent(note?.content ?? '');
      setNoteLastUpdated(note);
      setNoteLoading(false);
    });
  }, [channelTab, id, activeChannel, isMember]);

  // ── Send message with @mention parsing ──────────────────────────────────
  async function handleSend() {
    if (!input.trim() || !user || !isMember || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    setMentionSearch(null);

    const mentionedUsernames = [...content.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase());
    const mentionedIds = members
      .filter(m => {
        const u = (m.profile?.username || '').toLowerCase();
        const d = (m.profile?.display_name || '').replace(/\s+/g, '').toLowerCase();
        return mentionedUsernames.includes(u) || mentionedUsernames.includes(d);
      })
      .map(m => m.user_id)
      .filter((uid: string) => uid !== user.id);

    const { data: inserted, error } = await supabase
      .from('band_messages')
      .insert({ band_id: id, channel: activeChannel, sender_id: user.id, content, mentions: mentionedIds })
      .select('id')
      .single();

    if (error) {
      setInput(content);
      addToast('Bericht kon niet worden verstuurd', 'error');
    } else if (inserted && mentionedIds.length > 0) {
      await createMentionNotifications(inserted.id, id!, activeChannel, user.id, mentionedIds);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Handle mention autocomplete navigation
    if (mentionSearch !== null && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionSuggestions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionSuggestions[mentionIndex]); return; }
      if (e.key === 'Escape')    { setMentionSearch(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionSearch(match[1].toLowerCase());
      setMentionAnchor(cursor - match[0].length);
      setMentionIndex(0);
    } else {
      setMentionSearch(null);
    }
  }

  function insertMention(m: any) {
    const username = m.profile?.username || (m.profile?.display_name || '').replace(/\s+/g, '');
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const newInput = input.slice(0, mentionAnchor) + `@${username} ` + input.slice(cursor);
    setInput(newInput);
    setMentionSearch(null);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = mentionAnchor + username.length + 2;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  }

  // ── Render message content with @highlights ──────────────────────────────
  function renderContent(content: string) {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@') && memberUsernames.has(part.slice(1).toLowerCase())) {
        return (
          <span key={i} className="text-violet-300 font-semibold bg-violet-500/15 rounded-sm px-0.5">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  // ── File upload ──────────────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    if (!file || !id || !user || !isMember) return;
    setUploading(true);
    const result = await uploadBandMedia(file, id);
    if (!result) { addToast('Upload mislukt', 'error'); setUploading(false); return; }
    const content = input.trim() || file.name;
    setInput('');
    const { error } = await supabase.from('band_messages').insert({
      band_id: id, channel: activeChannel, sender_id: user.id, content,
      attachment_url: result.url, attachment_type: result.type,
    });
    if (error) addToast('Bericht kon niet worden verstuurd', 'error');
    setUploading(false);
    inputRef.current?.focus();
  }

  function handleDragOver(e: React.DragEvent) {
    if (activeChannel !== 'media' || !isMember) return;
    e.preventDefault(); setIsDragging(true);
  }
  function handleDragLeave() { setIsDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    if (activeChannel !== 'media' || !isMember) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  // ── Pin ──────────────────────────────────────────────────────────────────
  async function handleTogglePin(msg: any) {
    if (!isAdmin || !user) return;
    const newPinned = !msg.is_pinned;
    const ok = await setPinned(msg.id, newPinned, newPinned ? user.id : null);
    if (!ok) { addToast('Vastpinnen mislukt', 'error'); return; }
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: newPinned, pinned_by: newPinned ? user.id : null } : m));
    addToast(newPinned ? 'Bericht vastgepind' : 'Pin verwijderd', 'info');
  }

  // ── Channel switch ───────────────────────────────────────────────────────
  function switchChannel(key: ChannelKey) {
    setActiveChannel(key);
    setActiveView('channel');
    setShowMobileSidebar(false);
    setChannelTab('chat');
  }

  // ── Notes ────────────────────────────────────────────────────────────────
  function handleNoteChange(content: string) {
    setNoteContent(content);
    setNoteSaved(false);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      if (!id || !user) return;
      setNoteSaving(true);
      const ok = await saveBandNote(id, activeChannel, content, user.id);
      if (ok) {
        setNoteSaved(true);
        getBandNote(id, activeChannel).then(n => { if (n) setNoteLastUpdated(n); });
      }
      setNoteSaving(false);
    }, 1000);
  }

  // ── Calendar ─────────────────────────────────────────────────────────────
  async function handleAddEvent() {
    if (!eventForm.title.trim() || !eventForm.date || !user || !id) return;
    setSavingEvent(true);

    const typeInfo = EVENT_TYPES.find(t => t.value === eventForm.type)!;
    const event = await createBandEvent({
      band_id: id,
      title: eventForm.title.trim(),
      description: eventForm.description.trim() || null,
      event_date: eventForm.date,
      event_time: eventForm.time || null,
      type: eventForm.type,
      channel: typeInfo.channel,
      created_by: user.id,
    });

    if (!event) {
      addToast('Evenement aanmaken mislukt', 'error');
      setSavingEvent(false);
      return;
    }

    // Auto-post to linked channel
    if (eventForm.autoPost && typeInfo.channel) {
      const chLabel = CHANNELS.find(c => c.key === typeInfo.channel)?.label ?? typeInfo.channel;
      const timeStr = eventForm.time ? ` om ${eventForm.time.slice(0, 5)}` : '';
      const desc = eventForm.description.trim() ? `\n${eventForm.description.trim()}` : '';
      await supabase.from('band_messages').insert({
        band_id: id,
        channel: typeInfo.channel,
        sender_id: user.id,
        content: `📅 Nieuw evenement: ${eventForm.title.trim()} — ${formatEventDate(eventForm.date)}${timeStr}${desc}`,
      });
    }

    addToast('Evenement aangemaakt!', 'success');
    setBandEvents(prev => [...prev, event].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    setEventForm({ title: '', type: 'rehearsal', date: '', time: '', description: '', autoPost: true });
    setShowAddEvent(false);
    setSavingEvent(false);
  }

  async function handleDeleteEvent(eventId: string) {
    const ok = await deleteBandEvent(eventId);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
    setBandEvents(prev => prev.filter(e => e.id !== eventId));
    addToast('Evenement verwijderd', 'info');
  }

  // ── Membership ───────────────────────────────────────────────────────────
  async function handleRequestJoin() {
    if (!user || !id) return;
    setJoining(true);
    const { error } = await supabase.from('band_members').insert({
      band_id: id, user_id: user.id, role: 'member', status: 'pending',
    });
    if (error) { addToast('Aanvraag mislukt', 'error'); }
    else { setIsPending(true); addToast('Aanvraag verstuurd!', 'success'); }
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
    const { error } = await supabase.from('band_members').update({ status: 'active' }).eq('id', memberId);
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

  // ── Early returns ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 size={28} className="animate-spin text-violet-400" />
        <p className="text-sm text-slate-500">Workspace laden…</p>
      </div>
    );
  }

  if (!band) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-slate-400 gap-3">
        <p className="text-xl font-semibold text-white">Band niet gevonden</p>
        <Link to="/bandspace" className="text-violet-400 hover:underline text-sm">← Terug naar Band Space</Link>
      </div>
    );
  }

  // Calendar helpers
  const calYear  = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstWeekday = getFirstWeekday(calYear, calMonth);
  const daysInMonth  = getDaysInMonth(calYear, calMonth);
  const today = new Date();
  const eventsByDay: Record<number, BandEvent[]> = {};
  bandEvents.forEach(ev => {
    const day = parseInt(ev.event_date.split('-')[2], 10);
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  });
  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];
  const eventFormTypeInfo = EVENT_TYPES.find(t => t.value === eventForm.type)!;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-64px)] max-w-[1400px] mx-auto">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-white/8 shrink-0 bg-[#13102080]">
        <Link
          to="/bandspace"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors shrink-0 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Band Space</span>
        </Link>

        <div className="w-px h-4 bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600/40 to-violet-800/40 border border-violet-500/25 flex items-center justify-center shrink-0">
            {band.image_url
              ? <img src={band.image_url} alt={band.name} className="w-full h-full object-cover rounded-lg" />
              : <Music size={13} className="text-violet-400" />
            }
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate leading-tight">{band.name}</h1>
            <p className="text-[10px] text-slate-500 leading-tight hidden sm:block">
              {band.genre && <span>{band.genre} · </span>}Orbit Workspace
            </p>
          </div>
          {!band.is_public && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 bg-white/5 border border-white/8 rounded-full px-2 py-0.5 shrink-0">
              <Lock size={9} /> Privé
            </span>
          )}
        </div>

        <button
          onClick={() => setShowMobileSidebar(v => !v)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMembers(v => !v)}
            className={`relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              showMembers
                ? 'bg-violet-600/20 border-violet-500/30 text-violet-300'
                : 'border-white/8 text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={13} />
            <span className="hidden sm:inline">{members.length} leden</span>
            {isAdmin && pending.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center font-bold">
                {pending.length}
              </span>
            )}
          </button>
          {isMember && !isAdmin && (
            <button onClick={handleLeave} disabled={leaving} title="Band verlaten"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
              {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className={`
          shrink-0 flex-col bg-gradient-to-b from-[#1a1630] to-[#171328] border-r border-white/8
          ${showMobileSidebar
            ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl w-72 pb-20 top-0'
            : 'hidden lg:flex w-60'}
        `}>
          {showMobileSidebar && (
            <button onClick={() => setShowMobileSidebar(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white lg:hidden p-1">
              <X size={18} />
            </button>
          )}

          {/* Band header */}
          <div className="px-4 pt-5 pb-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/40 to-violet-900/60 border border-violet-500/25 flex items-center justify-center shrink-0">
                {band.image_url
                  ? <img src={band.image_url} alt={band.name} className="w-full h-full object-cover rounded-xl" />
                  : <Music size={16} className="text-violet-400" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{band.name}</p>
                {band.genre && <p className="text-[11px] text-slate-500 truncate">{band.genre}</p>}
              </div>
            </div>
            <span className="text-[9px] font-bold text-violet-400/80 uppercase tracking-[0.15em] bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">
              Orbit Workspace
            </span>
          </div>

          {/* Calendar shortcut */}
          <div className="px-2 pt-3 pb-2 border-b border-white/8 shrink-0">
            <button
              onClick={() => { setActiveView('calendar'); setShowMobileSidebar(false); }}
              disabled={!isMember}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all disabled:opacity-40 ${
                activeView === 'calendar'
                  ? 'bg-white/8'
                  : 'hover:bg-white/4'
              }`}
            >
              {activeView === 'calendar' && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-violet-500" />
              )}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                activeView === 'calendar' ? 'bg-violet-500/20' : 'bg-white/5'
              }`}>
                <Calendar size={13} className={activeView === 'calendar' ? 'text-violet-400' : 'text-slate-500'} />
              </div>
              <span className={`text-[13px] font-medium ${activeView === 'calendar' ? 'text-white' : 'text-slate-400'}`}>
                Kalender
              </span>
            </button>
          </div>

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto py-3 px-2">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 mb-2">Kanalen</p>
            <div className="space-y-0.5">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const active = activeView === 'channel' && activeChannel === ch.key;
                const preview = channelPreviews[ch.key];
                const mentions = mentionCounts[ch.key] ?? 0;
                return (
                  <button
                    key={ch.key}
                    onClick={() => switchChannel(ch.key)}
                    disabled={!isMember}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all disabled:opacity-40 relative group ${
                      active ? 'bg-white/8' : 'hover:bg-white/4'
                    }`}
                  >
                    {active && (
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full ${ch.accent}`} />
                    )}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      active ? ch.bg : 'bg-white/5 group-hover:bg-white/8'
                    }`}>
                      <Icon size={13} className={active ? ch.color : 'text-slate-500 group-hover:text-slate-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[13px] font-medium truncate ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                          {ch.label}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* @mention badge */}
                          {mentions > 0 && !active && (
                            <span className="flex items-center gap-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-bold px-1 rounded-full">
                              <AtSign size={8} />{mentions}
                            </span>
                          )}
                          {/* Unread dot */}
                          {preview?.hasUnread && !active && mentions === 0 && (
                            <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${ch.accent}`} />
                          )}
                          {preview?.lastAt && (
                            <span className="text-[10px] text-slate-600">{shortTime(preview.lastAt)}</span>
                          )}
                        </div>
                      </div>
                      {preview?.lastContent && (
                        <p className="text-[11px] text-slate-600 truncate mt-0.5 leading-snug">
                          {preview.lastSender && <span className="text-slate-500">{preview.lastSender.split(' ')[0]}: </span>}
                          {preview.lastContent}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar footer */}
          <div className="px-4 py-3 border-t border-white/8 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {members.slice(0, 3).map((m: any) => (
                  <UserAvatar key={m.id} src={m.profile?.avatar_url}
                    name={m.profile?.display_name || m.profile?.username}
                    size={20} className="ring-2 ring-[#171328]" />
                ))}
              </div>
              <span className="text-[11px] text-slate-500">
                {members.length} {members.length === 1 ? 'lid' : 'leden'}
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {showMobileSidebar && (
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setShowMobileSidebar(false)} />
        )}

        {/* ── Main content ────────────────────────────────────────────────── */}
        {activeView === 'calendar' ? (

          /* ── CALENDAR VIEW ─────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col min-w-0 bg-[#13102088] overflow-hidden">
            {/* Calendar header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 shrink-0 bg-[#16132680]">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                <Calendar size={15} className="text-violet-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm leading-tight">Kalender</h2>
                <p className="text-[11px] text-slate-500 leading-tight">Orbit Workspace · {band.name}</p>
              </div>
              <div className="flex-1" />
              {isAdmin && isMember && (
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
                >
                  <Plus size={13} /> Evenement
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => { setCalendarDate(new Date(calYear, calMonth - 1, 1)); setSelectedDay(null); }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <h3 className="font-semibold text-white text-base">
                  {NL_MONTHS[calMonth]} {calYear}
                </h3>
                <button
                  onClick={() => { setCalendarDate(new Date(calYear, calMonth + 1, 1)); setSelectedDay(null); }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {eventsLoading ? (
                <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
              ) : (
                <>
                  {/* Day labels */}
                  <div className="grid grid-cols-7 mb-1">
                    {NL_DAYS.map(d => (
                      <div key={d} className="text-center text-[10px] font-semibold text-slate-600 uppercase py-1">{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/8">
                    {Array.from({ length: firstWeekday }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-[#13102088] h-16 sm:h-20" />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
                      const isSelected = selectedDay === day;
                      const dayEvents = eventsByDay[day] ?? [];
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`bg-[#13102088] h-16 sm:h-20 p-1.5 flex flex-col items-start transition-colors hover:bg-white/5 ${isSelected ? 'ring-1 ring-inset ring-violet-500/50' : ''}`}
                        >
                          <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                            isToday ? 'bg-violet-500 text-white' : 'text-slate-400'
                          }`}>
                            {day}
                          </span>
                          <div className="flex flex-wrap gap-0.5">
                            {dayEvents.slice(0, 3).map(ev => {
                              const typeInfo = EVENT_TYPES.find(t => t.value === ev.type)!;
                              return (
                                <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${typeInfo.dot}`} />
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <span className="text-[9px] text-slate-600">+{dayEvents.length - 3}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    {EVENT_TYPES.map(t => (
                      <div key={t.value} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                        {t.label}
                      </div>
                    ))}
                  </div>

                  {/* Selected day events */}
                  {selectedDay !== null && (
                    <div className="mt-5">
                      <h4 className="text-sm font-semibold text-white mb-3">
                        {selectedDayEvents.length > 0
                          ? `${selectedDayEvents.length} evenement${selectedDayEvents.length > 1 ? 'en' : ''} op ${selectedDay} ${NL_MONTHS[calMonth]}`
                          : `Geen evenementen op ${selectedDay} ${NL_MONTHS[calMonth]}`
                        }
                      </h4>
                      {selectedDayEvents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedDayEvents.map(ev => {
                            const typeInfo = EVENT_TYPES.find(t => t.value === ev.type)!;
                            return (
                              <div key={ev.id} className="flex items-start gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3 group">
                                <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${typeInfo.dot}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white">{ev.title}</p>
                                  <p className={`text-xs ${typeInfo.color} mt-0.5`}>
                                    {typeInfo.label}{ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : ''}
                                  </p>
                                  {ev.description && (
                                    <p className="text-xs text-slate-400 mt-1 leading-snug">{ev.description}</p>
                                  )}
                                </div>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteEvent(ev.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        isAdmin && (
                          <button
                            onClick={() => {
                              setEventForm(f => ({ ...f, date: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` }));
                              setShowAddEvent(true);
                            }}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-400 transition-colors"
                          >
                            <Plus size={14} /> Evenement toevoegen voor deze dag
                          </button>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        ) : (

          /* ── CHANNEL VIEW ──────────────────────────────────────────────── */
          <div
            className="flex-1 flex flex-col min-w-0 bg-[#13102088]"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag-and-drop overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-emerald-950/60 border-2 border-dashed border-emerald-400/60 pointer-events-none backdrop-blur-sm">
                <div className="bg-emerald-500/20 rounded-2xl p-6 flex flex-col items-center gap-3">
                  <Video size={40} className="text-emerald-400" />
                  <p className="text-emerald-300 font-semibold text-lg">Laat los om te uploaden</p>
                </div>
              </div>
            )}

            {/* Channel header + Chat/Notes tabs */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/8 shrink-0 bg-[#16132680]">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activeCh.bg}`}>
                <ActiveIcon size={15} className={activeCh.color} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm leading-tight">{activeCh.label}</h2>
                <p className="text-[11px] text-slate-500 leading-tight">Orbit Workspace · {band.name}</p>
              </div>
              <div className="flex-1" />

              {/* Chat / Notes tab switcher */}
              {isMember && (
                <div className="flex items-center bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setChannelTab('chat')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      channelTab === 'chat'
                        ? 'bg-white/10 text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <MessageSquare size={11} /> Chat
                  </button>
                  <button
                    onClick={() => setChannelTab('notes')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      channelTab === 'notes'
                        ? 'bg-white/10 text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <PenLine size={11} /> Notities
                  </button>
                </div>
              )}

              {channelTab === 'chat' && pinnedMessages.length > 0 && (
                <button
                  onClick={() => setShowPinned(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    showPinned
                      ? 'bg-violet-600/20 border-violet-500/30 text-violet-300'
                      : 'border-white/8 text-slate-500 hover:text-violet-300 hover:border-violet-500/20'
                  }`}
                >
                  <Pin size={11} />
                  {pinnedMessages.length}
                  <ChevronDown size={11} className={`transition-transform ${showPinned ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Pinned messages bar */}
            {channelTab === 'chat' && pinnedMessages.length > 0 && showPinned && (
              <div className="border-b border-violet-500/20 bg-violet-950/40 px-5 py-3 space-y-2 shrink-0">
                <p className="text-[10px] font-semibold text-violet-400/60 uppercase tracking-wider mb-2">Vastgepinde berichten</p>
                {pinnedMessages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-2.5 text-xs bg-white/4 border border-violet-500/15 rounded-xl px-3 py-2.5">
                    <Pin size={10} className="text-violet-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-violet-300 font-semibold text-[11px]">{msg.sender?.display_name || msg.sender?.username}</span>
                        <span className="text-slate-600 text-[10px]">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-slate-300 truncate">{msg.content}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleTogglePin(msg)} className="text-slate-600 hover:text-red-400 transition-colors p-0.5">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── CHAT TAB ──────────────────────────────────────────────── */}
            {channelTab === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1 min-h-0">
                  {msgLoading ? (
                    <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
                  ) : !isMember ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                        <Lock size={24} className="opacity-40" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-400">{isPending ? 'Aanvraag in behandeling' : 'Alleen voor leden'}</p>
                        <p className="text-xs text-slate-600 mt-1">{isPending ? 'De admin beoordeelt je aanvraag.' : 'Word lid om berichten te zien.'}</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className={`w-16 h-16 rounded-2xl ${activeCh.bg} border ${activeCh.border} flex items-center justify-center`}>
                        <ActiveIcon size={28} className={activeCh.color} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">Orbit — {activeCh.label}</p>
                        <p className="text-xs text-slate-500 mt-1">Nog geen berichten. Stuur het eerste!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, i) => {
                        const isMe = msg.sender_id === user?.id;
                        const sameAsPrev = messages[i - 1]?.sender_id === msg.sender_id;
                        const sameAsNext = messages[i + 1]?.sender_id === msg.sender_id;
                        const isMentioned = user?.id && msg.mentions?.includes(user.id);
                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''} ${sameAsPrev ? 'mt-0.5' : 'mt-4'} ${isMentioned ? 'bg-amber-500/5 -mx-2 px-2 rounded-xl' : ''}`}
                          >
                            <div className="w-8 shrink-0 flex items-end">
                              {!sameAsPrev && (
                                <UserAvatar src={msg.sender?.avatar_url}
                                  name={msg.sender?.display_name || msg.sender?.username} size={32} />
                              )}
                            </div>
                            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                              {!sameAsPrev && (
                                <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[12px] font-semibold text-slate-300">
                                    {msg.sender?.display_name || msg.sender?.username}
                                  </span>
                                  <span className="text-[10px] text-slate-600">{formatTime(msg.created_at)}</span>
                                  {msg.is_pinned && <Pin size={9} className="text-violet-400" />}
                                  {isMentioned && <AtSign size={9} className="text-amber-400" />}
                                </div>
                              )}
                              <div className={`relative group/bubble ${
                                isMe
                                  ? `bg-violet-600 text-white ${!sameAsPrev ? 'rounded-2xl rounded-tr-sm' : sameAsNext ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                                  : `bg-white/8 text-slate-100 border border-white/8 ${!sameAsPrev ? 'rounded-2xl rounded-tl-sm' : sameAsNext ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
                              } px-4 py-2.5 text-[13px] leading-relaxed break-words`}>
                                <span className="whitespace-pre-wrap">{renderContent(msg.content)}</span>

                                {msg.attachment_url && (
                                  <div className="mt-2.5">
                                    {msg.attachment_type === 'image' ? (
                                      <img src={msg.attachment_url} alt="bijlage"
                                        className="max-w-[240px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                                        onClick={() => window.open(msg.attachment_url, '_blank')} />
                                    ) : msg.attachment_type === 'video' ? (
                                      <video src={msg.attachment_url} controls className="max-w-[280px] rounded-xl shadow-lg" />
                                    ) : (
                                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2.5 transition-colors border border-white/10">
                                        <FileIcon size={13} className="shrink-0" />
                                        <span className="truncate">Bijlage downloaden</span>
                                      </a>
                                    )}
                                  </div>
                                )}

                                {isAdmin && (
                                  <button
                                    onClick={() => handleTogglePin(msg)}
                                    title={msg.is_pinned ? 'Losmaken' : 'Vastpinnen'}
                                    className={`absolute -top-2 ${isMe ? 'left-1' : 'right-1'} opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-[#1e1a30] border border-white/15 rounded-full p-1 shadow-lg`}
                                  >
                                    <Pin size={10} className={msg.is_pinned ? 'text-violet-400' : 'text-slate-400'} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </>
                  )}
                </div>

                {/* Input area */}
                {isMember ? (
                  <div className="border-t border-white/8 px-4 py-3 shrink-0 bg-[#16132680] relative">
                    {/* @mention autocomplete dropdown */}
                    {mentionSearch !== null && mentionSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#1e1a30] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-10">
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 pt-2 pb-1">Leden</p>
                        {mentionSuggestions.map((m, i) => (
                          <button
                            key={m.id}
                            onClick={() => insertMention(m)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                              i === mentionIndex ? 'bg-violet-600/20' : 'hover:bg-white/5'
                            }`}
                          >
                            <UserAvatar src={m.profile?.avatar_url}
                              name={m.profile?.display_name || m.profile?.username} size={24} />
                            <div>
                              <p className="text-sm font-medium text-white">{m.profile?.display_name || m.profile?.username}</p>
                              {m.profile?.username && <p className="text-[10px] text-slate-500">@{m.profile.username}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.zip"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />

                    <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-violet-500/40 transition-colors">
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        title="Bijlage toevoegen"
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0 mb-0.5 ${
                          activeChannel === 'media' ? 'text-emerald-400 hover:bg-emerald-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/8'
                        }`}>
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : activeChannel === 'media' ? <ImageIcon size={16} /> : <Paperclip size={16} />}
                      </button>

                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={activeChannel === 'media' ? 'Beschrijving of sleep media hierheen…' : `Bericht in ${activeCh.label}… (typ @ om iemand te taggen)`}
                        rows={1}
                        className="flex-1 bg-transparent text-[13px] text-white placeholder-slate-600 focus:outline-none resize-none py-1"
                        style={{ minHeight: '24px', maxHeight: '120px' }}
                      />

                      <button onClick={handleSend} disabled={!input.trim() || sending || uploading}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 mb-0.5 ${
                          input.trim() && !sending
                            ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40'
                            : 'bg-white/5 text-slate-600 cursor-not-allowed'
                        }`}>
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                ) : isPending ? (
                  <div className="border-t border-white/8 px-5 py-5 flex flex-col items-center gap-3 shrink-0 bg-[#16132680]">
                    <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                      <Clock size={16} className="text-amber-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-300">Aanvraag in behandeling</p>
                        <p className="text-xs text-amber-500/70 mt-0.5">De admin beoordeelt je aanvraag.</p>
                      </div>
                    </div>
                    <button onClick={handleCancelRequest} className="text-xs text-slate-600 hover:text-red-400 transition-colors">
                      Aanvraag intrekken
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-white/8 px-5 py-6 flex flex-col items-center gap-3 shrink-0 bg-[#16132680]">
                    {band.is_public ? (
                      <>
                        <div className="text-center mb-1">
                          <p className="text-sm font-semibold text-white">Sluit je aan bij {band.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">De admin moet je aanvraag goedkeuren.</p>
                        </div>
                        <button onClick={handleRequestJoin} disabled={joining || !user}
                          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                          {joining ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                          Aanvraag versturen
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2.5 bg-white/4 border border-white/8 rounded-xl px-5 py-3">
                        <Lock size={14} className="text-slate-500 shrink-0" />
                        <p className="text-sm text-slate-400">Privéband — je hebt een uitnodiging nodig</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (

              /* ── NOTES TAB ─────────────────────────────────────────────── */
              <div className="flex-1 flex flex-col min-h-0 p-5 gap-3">
                <div className="flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Notities — {activeCh.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Gedeeld met alle leden · automatisch opgeslagen</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {noteSaving && <Loader2 size={11} className="animate-spin text-slate-500" />}
                    {noteSaved && !noteSaving && <span className="text-emerald-400/80">Opgeslagen</span>}
                  </div>
                </div>

                {noteLoading ? (
                  <div className="flex-1 flex justify-center items-center">
                    <Loader2 size={22} className="animate-spin text-violet-400/60" />
                  </div>
                ) : (
                  <textarea
                    value={noteContent}
                    onChange={e => handleNoteChange(e.target.value)}
                    placeholder={`Typ hier je notities voor ${activeCh.label}…\n\nGebruik dit voor setlists, akkoordenschema's, afspraken, contactinfo — alles wat je wilt bijhouden voor dit kanaal.`}
                    disabled={!isMember}
                    className="flex-1 bg-white/4 border border-white/8 rounded-2xl px-5 py-4 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/30 transition-colors resize-none leading-relaxed disabled:opacity-50 font-mono"
                  />
                )}

                {noteLastUpdated?.updated_at && (
                  <p className="text-[10px] text-slate-600 shrink-0">
                    Laatste wijziging door{' '}
                    <span className="text-slate-500">
                      {noteLastUpdated.updater?.display_name || noteLastUpdated.updater?.username || 'onbekend'}
                    </span>{' '}
                    · {formatTime(noteLastUpdated.updated_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Members panel ────────────────────────────────────────────────────── */}
      {showMembers && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMembers(false)} />
          <div className="fixed inset-y-0 right-0 w-72 bg-[#1a162c] border-l border-white/10 z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <h3 className="font-semibold text-white">Leden</h3>
              <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-white p-1 hover:bg-white/8 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isAdmin && pending.length > 0 && (
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Aanvragen ({pending.length})
                  </p>
                  <div className="space-y-2">
                    {pending.map((m: any) => (
                      <div key={m.id} className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <UserAvatar src={m.profile?.avatar_url} name={m.profile?.display_name || m.profile?.username} size={32} />
                          <p className="text-sm font-medium text-white truncate">{m.profile?.display_name || m.profile?.username}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAccept(m.id, m.profile)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-semibold transition-colors border border-green-500/20">
                            <Check size={11} /> Accepteren
                          </button>
                          <button onClick={() => handleDecline(m.id, m.profile)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/8 hover:bg-red-500/18 text-red-400 text-xs font-semibold transition-colors border border-red-500/15">
                            <X size={11} /> Afwijzen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-white/8 mt-4 mb-1" />
                </div>
              )}
              <div className="px-4 pt-3 pb-6">
                <p className="text-[11px] font-semibold text-slate-500/80 uppercase tracking-wider mb-2.5">Leden ({members.length})</p>
                <div className="space-y-0.5">
                  {members.map((m: any) => {
                    const isMe = m.user_id === user?.id;
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                        <UserAvatar src={m.profile?.avatar_url} name={m.profile?.display_name || m.profile?.username} size={34} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {m.profile?.display_name || m.profile?.username}
                            {isMe && <span className="text-slate-600 text-xs ml-1.5">(jij)</span>}
                          </p>
                          {m.role === 'admin' && (
                            <span className="text-[10px] text-violet-400 flex items-center gap-0.5 mt-0.5">
                              <ShieldCheck size={9} /> Admin
                            </span>
                          )}
                        </div>
                        {isAdmin && !isMe && m.role !== 'admin' && (
                          <button onClick={() => handleRemoveMember(m.id, m.profile)}
                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1" title="Verwijderen">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Add event modal ───────────────────────────────────────────────────── */}
      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1a30] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Evenement toevoegen</h2>
              <button onClick={() => setShowAddEvent(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Naam van het evenement"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                  <div className="flex flex-col gap-1.5">
                    {EVENT_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setEventForm(f => ({ ...f, type: t.value }))}
                        className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all text-left ${
                          eventForm.type === t.value
                            ? 'bg-white/8 border-white/20 text-white'
                            : 'border-white/8 text-slate-400 hover:border-white/15'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Datum *</label>
                    <input
                      type="date"
                      value={eventForm.date}
                      onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Tijd</label>
                    <input
                      type="time"
                      value={eventForm.time}
                      onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Omschrijving</label>
                <textarea
                  value={eventForm.description}
                  onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optionele omschrijving…"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
              </div>

              {eventFormTypeInfo.channel && (
                <button
                  onClick={() => setEventForm(f => ({ ...f, autoPost: !f.autoPost }))}
                  className={`flex items-center gap-2.5 w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${
                    eventForm.autoPost
                      ? 'bg-violet-600/15 border-violet-500/30 text-violet-300'
                      : 'border-white/8 text-slate-500 hover:border-white/15'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    eventForm.autoPost ? 'bg-violet-500 border-violet-500' : 'border-white/20'
                  }`}>
                    {eventForm.autoPost && <Check size={9} className="text-white" />}
                  </div>
                  Ook posten in Orbit — {CHANNELS.find(c => c.key === eventFormTypeInfo.channel)?.label}
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddEvent(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors text-sm"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddEvent}
                disabled={savingEvent || !eventForm.title.trim() || !eventForm.date}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50 text-sm"
              >
                {savingEvent ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
