import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Music, Mic2, Globe, Newspaper, Video,
  Send, Loader2, Users, LogOut, UserPlus, Lock, LayoutDashboard,
  X, Clock, Check, Trash2, Pin, Paperclip, ChevronDown, Menu,
  Image as ImageIcon, FileText as FileIcon, ShieldCheck,
  Calendar, Plus, MessageSquare, PenLine, AtSign, MapPin,
  CheckSquare, Square, Share2, Copy, ListTodo,
  FolderKanban, Handshake, Pencil,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import UserAvatar from '@components/UserAvatar';
import GenreBadge from '@components/GenreBadge';
import {
  type ChannelKey, type ChannelPreview, type BandEvent, type EventType, type BandPost,
  type BandTodo,
  getChannelPreviews, markChannelRead,
  uploadBandMedia, setPinned, deleteBandMessage,
  getBandPosts, createBandPost, updateBandPost, deleteBandPost,
  getBandEvents, getUpcomingEvents, createBandEvent, deleteBandEvent,
  getPinnedEvents, pinBandEvent,
  getBandTodos, createBandTodo, toggleBandTodo, deleteBandTodo,
  getBandNote, saveBandNote,
  getMentionCounts, markMentionsRead, createMentionNotifications,
} from '@services/orbitService';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHANNELS = [
  { key: 'rehearsals' as ChannelKey, label: 'Repetities',  icon: Music,     color: 'text-violet-400',  bg: 'bg-violet-500/20',  accent: 'bg-violet-500',  border: 'border-violet-500/30'  },
  { key: 'gigs'       as ChannelKey, label: 'Gigs',         icon: Mic2,      color: 'text-pink-400',    bg: 'bg-pink-500/20',    accent: 'bg-pink-500',    border: 'border-pink-500/30'    },
  { key: 'socials'    as ChannelKey, label: 'Socials',       icon: Globe,     color: 'text-sky-400',     bg: 'bg-sky-500/20',     accent: 'bg-sky-500',     border: 'border-sky-500/30'     },
  { key: 'magazine'   as ChannelKey, label: 'Muziekbladen', icon: Newspaper, color: 'text-amber-400',   bg: 'bg-amber-500/20',   accent: 'bg-amber-500',   border: 'border-amber-500/30'   },
  { key: 'media'      as ChannelKey, label: 'Media',         icon: Video,     color: 'text-emerald-400', bg: 'bg-emerald-500/20', accent: 'bg-emerald-500', border: 'border-emerald-500/30' },
  { key: 'projects'   as ChannelKey, label: 'Projecten',     icon: FolderKanban, color: 'text-indigo-400', bg: 'bg-indigo-500/20', accent: 'bg-indigo-500', border: 'border-indigo-500/30' },
  { key: 'collabs'    as ChannelKey, label: 'Samenwerkingen', icon: Handshake, color: 'text-teal-400',   bg: 'bg-teal-500/20',    accent: 'bg-teal-500',    border: 'border-teal-500/30'    },
] as const;

// Radius (px) of the desktop orbit ring on which the channel bubbles sit.
const ORBIT_RADIUS = 170;

const EVENT_TYPES: { value: EventType; label: string; dot: string; color: string; channel: ChannelKey | null }[] = [
  { value: 'rehearsal', label: 'Repetitie', dot: 'bg-violet-500', color: 'text-violet-400', channel: 'rehearsals' },
  { value: 'gig',       label: 'Optreden',  dot: 'bg-pink-500',   color: 'text-pink-400',   channel: 'gigs'       },
  { value: 'deadline',  label: 'Deadline',  dot: 'bg-rose-500',   color: 'text-rose-400',   channel: null         },
  { value: 'other',     label: 'Anders',    dot: 'bg-slate-500',  color: 'text-slate-400',  channel: null         },
];

const NL_MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const NL_DAYS   = ['Ma','Di','Wo','Do','Vr','Za','Zo'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function shortTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'nu';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function bandGradient(genre: string) {
  const g = (genre ?? '').toLowerCase();
  if (g.includes('hip'))   return 'from-orange-950 via-amber-950 to-yellow-950';
  if (g.includes('r&b') || g.includes('soul'))  return 'from-purple-950 via-violet-950 to-fuchsia-950';
  if (g.includes('techno') || g.includes('house') || g.includes('trance') || g.includes('dubstep') || g.includes('drum')) return 'from-cyan-950 via-sky-950 to-blue-950';
  if (g.includes('jazz'))  return 'from-amber-950 via-orange-950 to-red-950';
  if (g.includes('rock') || g.includes('metal')) return 'from-zinc-950 via-slate-950 to-gray-950';
  if (g.includes('pop'))   return 'from-pink-950 via-rose-950 to-fuchsia-950';
  return 'from-violet-950 via-purple-950 to-indigo-950';
}

// ── Component ─────────────────────────────────────────────────────────────────

type ActiveView = 'home' | 'channel' | 'calendar' | 'todos';

export default function BandSpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();

  // Band data
  const [band, setBand]       = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading]   = useState(true);

  // Navigation
  const [activeView, setActiveView]       = useState<ActiveView>('home');
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('rehearsals');
  const [channelTab, setChannelTab]       = useState<'chat' | 'notes'>('chat');

  // Home / posts
  const [posts, setPosts]               = useState<BandPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postContent, setPostContent]   = useState('');
  const [postTitle, setPostTitle]       = useState('');
  const [showPostTitle, setShowPostTitle] = useState(false);
  const [postImageUrl, setPostImageUrl] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [uploadingPostImg, setUploadingPostImg] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<BandEvent[]>([]);

  // Chat
  const [messages, setMessages]     = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // @mention
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const [mentionIndex, setMentionIndex]   = useState(0);
  const [mentionCounts, setMentionCounts] = useState<Partial<Record<ChannelKey, number>>>({});

  // Sidebar + members panel
  const [showMembers, setShowMembers]         = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [channelPreviews, setChannelPreviews] = useState<Partial<Record<ChannelKey, ChannelPreview>>>({});

  // Calendar
  const [calendarDate, setCalendarDate]   = useState(new Date());
  const [bandEvents, setBandEvents]       = useState<BandEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedDay, setSelectedDay]     = useState<number | null>(null);
  const [showAddEvent, setShowAddEvent]   = useState(false);
  const [savingEvent, setSavingEvent]     = useState(false);
  const [eventForm, setEventForm]         = useState({ title: '', type: 'rehearsal' as EventType, date: '', time: '', description: '', autoPost: true });

  // Notes
  const [noteContent, setNoteContent]         = useState('');
  const [noteLoading, setNoteLoading]         = useState(false);
  const [noteSaving, setNoteSaving]           = useState(false);
  const [noteSaved, setNoteSaved]             = useState(false);
  const [noteLastUpdated, setNoteLastUpdated] = useState<any>(null);

  // Todos
  const [todos, setTodos]               = useState<BandTodo[]>([]);
  const [todosLoading, setTodosLoading] = useState(false);
  const [newTodo, setNewTodo]           = useState('');
  const [addingTodo, setAddingTodo]     = useState(false);

  // Pinned events
  const [pinnedEvents, setPinnedEvents] = useState<BandEvent[]>([]);

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied]                 = useState(false);

  // Membership actions
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postImgRef   = useRef<HTMLInputElement>(null);
  const noteTimer    = useRef<ReturnType<typeof setTimeout>>();

  // Derived
  const activeCh       = CHANNELS.find(c => c.key === activeChannel)!;
  const ActiveIcon     = activeCh.icon;
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const memberUsernames = new Set(members.map(m => (m.profile?.username || '').toLowerCase()).filter(Boolean));
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
        supabase.from('band_members')
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

  // ── Load home data (posts + upcoming events) ─────────────────────────────
  useEffect(() => {
    if (!id) return;
    setPostsLoading(true);
    Promise.all([
      getBandPosts(id),
      getUpcomingEvents(id, 5),
    ]).then(([p, e]) => { setPosts(p); setUpcomingEvents(e); setPostsLoading(false); });
  }, [id]);

  // ── Load messages ────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!id) return;
    setMsgLoading(true);
    const { data } = await supabase.from('band_messages')
      .select('*, sender:profiles!band_messages_sender_id_fkey(id,username,display_name,avatar_url)')
      .eq('band_id', id).eq('channel', activeChannel)
      .order('created_at', { ascending: true }).limit(100);
    setMessages(data ?? []);
    setMsgLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [id, activeChannel]);

  useEffect(() => { if (activeView === 'channel') loadMessages(); }, [loadMessages, activeView]);

  // ── Mark read + refresh previews/mentions on channel switch ──────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;
    markChannelRead(id, activeChannel);
    markMentionsRead(id, activeChannel, user.id);
    getChannelPreviews(id, user.id).then(setChannelPreviews);
    getMentionCounts(id, user.id).then(setMentionCounts);
  }, [id, activeChannel, isMember, user]);

  // ── Initial sidebar data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;
    getChannelPreviews(id, user.id).then(setChannelPreviews);
    getMentionCounts(id, user.id).then(setMentionCounts);
  }, [id, isMember, user]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;

    const msgCh = supabase.channel(`band-${id}-${activeChannel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'band_messages', filter: `band_id=eq.${id}` },
        async (payload) => {
          if (payload.new.channel !== activeChannel) { getChannelPreviews(id, user.id).then(setChannelPreviews); return; }
          const { data: sender } = await supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id', payload.new.sender_id).single();
          setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, { ...payload.new, sender }]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          getChannelPreviews(id, user.id).then(setChannelPreviews);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'band_messages', filter: `band_id=eq.${id}` },
        (payload) => {
          if (payload.new.channel !== activeChannel) return;
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'band_messages' },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          getChannelPreviews(id, user.id).then(setChannelPreviews);
        })
      .subscribe();

    const notifCh = supabase.channel(`band-notif-${id}-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'band_notifications', filter: `recipient_id=eq.${user.id}` },
        () => getMentionCounts(id, user.id).then(setMentionCounts))
      .subscribe();

    return () => { supabase.removeChannel(msgCh); supabase.removeChannel(notifCh); };
  }, [id, activeChannel, isMember, user]);

  // ── Load calendar events ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeView !== 'calendar' || !id || !isMember) return;
    setEventsLoading(true);
    getBandEvents(id, calendarDate.getFullYear(), calendarDate.getMonth() + 1)
      .then(e => { setBandEvents(e); setEventsLoading(false); });
  }, [activeView, id, isMember, calendarDate]);

  // ── Load todos ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isMember) return;
    setTodosLoading(true);
    getBandTodos(id).then(t => { setTodos(t); setTodosLoading(false); });
  }, [id, isMember]);

  // ── Load pinned events ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isMember) return;
    getPinnedEvents(id).then(setPinnedEvents);
  }, [id, isMember]);

  // ── Load note ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (channelTab !== 'notes' || !id || !isMember) return;
    setNoteLoading(true); setNoteSaved(false);
    getBandNote(id, activeChannel).then(note => {
      setNoteContent(note?.content ?? ''); setNoteLastUpdated(note); setNoteLoading(false);
    });
  }, [channelTab, id, activeChannel, isMember]);

  // ── Handlers: posts ──────────────────────────────────────────────────────
  async function handleCreatePost() {
    if (!postContent.trim() || !user || !id) return;
    setSubmittingPost(true);
    if (editingPostId) {
      const updated = await updateBandPost(editingPostId, postContent.trim(), postTitle.trim() || undefined);
      if (!updated) { addToast('Bijwerken mislukt', 'error'); }
      else { setPosts(prev => prev.map(p => p.id === editingPostId ? updated : p)); cancelEditPost(); }
    } else {
      const post = await createBandPost(id, user.id, postContent.trim(), postTitle.trim() || undefined, postImageUrl || undefined);
      if (!post) { addToast('Plaatsen mislukt', 'error'); }
      else { setPosts(prev => [post, ...prev]); setPostContent(''); setPostTitle(''); setPostImageUrl(''); setShowPostTitle(false); }
    }
    setSubmittingPost(false);
  }

  function startEditPost(post: BandPost) {
    setEditingPostId(post.id);
    setPostContent(post.content || '');
    setPostTitle(post.title || '');
    setShowPostTitle(!!post.title);
    // Scroll the composer into view so the edit is obvious.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditPost() {
    setEditingPostId(null);
    setPostContent('');
    setPostTitle('');
    setShowPostTitle(false);
    setPostImageUrl('');
  }

  async function handleDeletePost(postId: string, imageUrl?: string | null) {
    if (!window.confirm('Weet je zeker dat je deze update wilt verwijderen?')) return;
    const ok = await deleteBandPost(postId, imageUrl);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  async function handlePostImageUpload(file: File) {
    if (!file || !id) return;
    setUploadingPostImg(true);
    const result = await uploadBandMedia(file, id);
    if (result?.type === 'image') setPostImageUrl(result.url);
    setUploadingPostImg(false);
  }

  // ── Handlers: send message ───────────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || !user || !isMember || sending) return;
    setSending(true);
    const content = input.trim();
    setInput(''); setMentionSearch(null);

    const mentionedUsernames = [...content.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase());
    const mentionedIds = members
      .filter(m => mentionedUsernames.includes((m.profile?.username || '').toLowerCase()) || mentionedUsernames.includes((m.profile?.display_name || '').replace(/\s+/g, '').toLowerCase()))
      .map(m => m.user_id).filter((uid: string) => uid !== user.id);

    const { data: inserted, error } = await supabase.from('band_messages')
      .insert({ band_id: id, channel: activeChannel, sender_id: user.id, content, mentions: mentionedIds })
      .select('*, sender:profiles!band_messages_sender_id_fkey(id,username,display_name,avatar_url)').single();

    if (error || !inserted) { setInput(content); addToast('Versturen mislukt', 'error'); }
    else {
      // Show it immediately — don't rely on the realtime echo (which may be disabled for the project).
      setMessages(prev => prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      if (id && user) getChannelPreviews(id, user.id).then(setChannelPreviews);
      if (mentionedIds.length > 0) await createMentionNotifications(inserted.id, id!, activeChannel, user.id, mentionedIds);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    const cursor = e.target.selectionStart ?? val.length;
    const match = val.slice(0, cursor).match(/@(\w*)$/);
    if (match) { setMentionSearch(match[1].toLowerCase()); setMentionAnchor(cursor - match[0].length); setMentionIndex(0); }
    else setMentionSearch(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionSearch !== null && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionSuggestions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionSuggestions[mentionIndex]); return; }
      if (e.key === 'Escape') { setMentionSearch(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function insertMention(m: any) {
    const username = m.profile?.username || (m.profile?.display_name || '').replace(/\s+/g, '');
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const newInput = input.slice(0, mentionAnchor) + `@${username} ` + input.slice(cursor);
    setInput(newInput); setMentionSearch(null);
    setTimeout(() => { if (inputRef.current) { const p = mentionAnchor + username.length + 2; inputRef.current.setSelectionRange(p, p); inputRef.current.focus(); } }, 0);
  }

  function renderContent(content: string) {
    return content.split(/(@\w+)/g).map((part, i) =>
      part.startsWith('@') && memberUsernames.has(part.slice(1).toLowerCase())
        ? <span key={i} className="text-violet-300 font-semibold bg-violet-500/15 rounded px-0.5">{part}</span>
        : <span key={i}>{part}</span>
    );
  }

  // ── Handlers: file upload ────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    if (!file || !id || !user || !isMember) return;
    setUploading(true);
    const result = await uploadBandMedia(file, id);
    if (!result) { addToast('Upload mislukt', 'error'); setUploading(false); return; }
    const content = input.trim() || file.name;
    setInput('');
    const { data: inserted, error } = await supabase.from('band_messages')
      .insert({ band_id: id, channel: activeChannel, sender_id: user.id, content, attachment_url: result.url, attachment_type: result.type })
      .select('*, sender:profiles!band_messages_sender_id_fkey(id,username,display_name,avatar_url)').single();
    if (error || !inserted) { addToast('Versturen mislukt', 'error'); }
    else {
      // Append right away so the upload is visible without waiting on realtime.
      setMessages(prev => prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      if (id && user) getChannelPreviews(id, user.id).then(setChannelPreviews);
    }
    setUploading(false); inputRef.current?.focus();
  }

  function handleDragOver(e: React.DragEvent) { if (activeChannel !== 'media' || !isMember) return; e.preventDefault(); setIsDragging(true); }
  function handleDragLeave() { setIsDragging(false); }
  function handleDrop(e: React.DragEvent) { e.preventDefault(); setIsDragging(false); if (activeChannel !== 'media' || !isMember) return; const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }

  // ── Handlers: pin ────────────────────────────────────────────────────────
  async function handleTogglePin(msg: any) {
    if (!isAdmin || !user) return;
    const np = !msg.is_pinned;
    const ok = await setPinned(msg.id, np, np ? user.id : null);
    if (!ok) { addToast('Vastpinnen mislukt', 'error'); return; }
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: np, pinned_by: np ? user.id : null } : m));
    addToast(np ? 'Vastgepind' : 'Pin verwijderd', 'info');
  }

  async function handleDeleteMessage(msg: any) {
    if (!user || (msg.sender_id !== user.id && !isAdmin)) return;
    if (!window.confirm('Dit bericht verwijderen?')) return;
    const prev = messages;
    setMessages(p => p.filter(m => m.id !== msg.id)); // optimistic
    const ok = await deleteBandMessage(msg.id, msg.attachment_url);
    if (!ok) {
      setMessages(prev); // rollback
      addToast('Verwijderen mislukt', 'error');
      return;
    }
    if (id && user) getChannelPreviews(id, user.id).then(setChannelPreviews);
  }

  // ── Handlers: notes ──────────────────────────────────────────────────────
  function handleNoteChange(content: string) {
    setNoteContent(content); setNoteSaved(false);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      if (!id || !user) return;
      setNoteSaving(true);
      const ok = await saveBandNote(id, activeChannel, content, user.id);
      if (ok) { setNoteSaved(true); getBandNote(id, activeChannel).then(n => { if (n) setNoteLastUpdated(n); }); }
      setNoteSaving(false);
    }, 1000);
  }

  // ── Handlers: calendar events ────────────────────────────────────────────
  async function handleAddEvent() {
    if (!eventForm.title.trim() || !eventForm.date || !user || !id) return;
    setSavingEvent(true);
    const typeInfo = EVENT_TYPES.find(t => t.value === eventForm.type)!;
    const event = await createBandEvent({ band_id: id, title: eventForm.title.trim(), description: eventForm.description.trim() || null, event_date: eventForm.date, event_time: eventForm.time || null, type: eventForm.type, channel: typeInfo.channel, created_by: user.id });
    if (!event) { addToast('Aanmaken mislukt', 'error'); setSavingEvent(false); return; }
    if (eventForm.autoPost && typeInfo.channel) {
      const chLabel = CHANNELS.find(c => c.key === typeInfo.channel)?.label ?? '';
      await supabase.from('band_messages').insert({ band_id: id, channel: typeInfo.channel, sender_id: user.id, content: `📅 Nieuw evenement: ${eventForm.title.trim()} — ${formatEventDate(eventForm.date)}${eventForm.time ? ` om ${eventForm.time.slice(0, 5)}` : ''}${eventForm.description ? `\n${eventForm.description.trim()}` : ''}` });
    }
    setBandEvents(prev => [...prev, event].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    setUpcomingEvents(prev => [...prev, event].filter(e => e.event_date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 5));
    addToast('Evenement aangemaakt!', 'success');
    setEventForm({ title: '', type: 'rehearsal', date: '', time: '', description: '', autoPost: true });
    setShowAddEvent(false); setSavingEvent(false);
  }

  async function handleDeleteEvent(eventId: string) {
    const ok = await deleteBandEvent(eventId);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
    setBandEvents(prev => prev.filter(e => e.id !== eventId));
    setUpcomingEvents(prev => prev.filter(e => e.id !== eventId));
  }

  // ── Handlers: todos ──────────────────────────────────────────────────────
  async function handleCreateTodo() {
    if (!newTodo.trim() || !user || !id) return;
    setAddingTodo(true);
    const todo = await createBandTodo(id, user.id, newTodo.trim());
    if (todo) { setTodos(prev => [...prev, todo]); setNewTodo(''); }
    else addToast('Aanmaken mislukt', 'error');
    setAddingTodo(false);
  }

  async function handleToggleTodo(todo: BandTodo) {
    if (!user) return;
    const updated = !todo.completed;
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: updated } : t));
    const ok = await toggleBandTodo(todo.id, updated, user.id);
    if (!ok) setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: todo.completed } : t));
  }

  async function handleDeleteTodo(todoId: string) {
    setTodos(prev => prev.filter(t => t.id !== todoId));
    const ok = await deleteBandTodo(todoId);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); if (id) getBandTodos(id).then(setTodos); }
  }

  // ── Handlers: pin event ──────────────────────────────────────────────────
  async function handlePinEvent(ev: BandEvent) {
    if (!isAdmin) return;
    const next = !ev.is_pinned;
    const ok = await pinBandEvent(ev.id, next);
    if (!ok) { addToast('Vastpinnen mislukt', 'error'); return; }
    setBandEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_pinned: next } : e));
    if (next) setPinnedEvents(prev => [...prev, { ...ev, is_pinned: true }].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    else setPinnedEvents(prev => prev.filter(e => e.id !== ev.id));
    addToast(next ? 'Vastgepind' : 'Pin verwijderd', 'info');
  }

  // ── Handlers: share ──────────────────────────────────────────────────────
  // Real invite link: opening it lets the recipient join directly (active member,
  // no approval, private bands included) via the join_band_with_token RPC.
  function inviteLink() {
    return band?.invite_token
      ? `${window.location.origin}/bandspace/join/${band.invite_token}`
      : window.location.href.split('?')[0];
  }

  function handleShare() {
    const url = inviteLink();
    if (navigator.share) {
      navigator.share({ title: band?.name, text: `Sluit je aan bij ${band?.name} op h-orbit`, url });
    } else {
      handleCopyLink();
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteLink()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Handlers: membership ─────────────────────────────────────────────────
  async function handleRequestJoin() {
    if (!user || !id) return; setJoining(true);
    const { error } = await supabase.from('band_members').insert({ band_id: id, user_id: user.id, role: 'member', status: 'pending' });
    if (error) addToast('Aanvraag mislukt', 'error'); else { setIsPending(true); addToast('Aanvraag verstuurd!', 'success'); }
    setJoining(false);
  }
  async function handleCancelRequest() {
    if (!user || !id) return;
    await supabase.from('band_members').delete().eq('band_id', id).eq('user_id', user.id);
    setIsPending(false); addToast('Aanvraag ingetrokken', 'info');
  }
  async function handleLeave() {
    if (!user || !id) return; setLeaving(true);
    await supabase.from('band_members').delete().eq('band_id', id).eq('user_id', user.id);
    addToast('Je hebt de band verlaten', 'info'); navigate('/bandspace');
  }
  async function handleAccept(memberId: string, profile: any) {
    const { error } = await supabase.from('band_members').update({ status: 'active' }).eq('id', memberId);
    if (error) { addToast('Accepteren mislukt', 'error'); return; }
    const accepted = pending.find(m => m.id === memberId);
    if (accepted) { setPending(prev => prev.filter(m => m.id !== memberId)); setMembers(prev => [...prev, { ...accepted, status: 'active' }]); }
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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={28} className="animate-spin text-violet-400" />
        <p className="text-sm text-slate-500">Workspace laden…</p>
      </div>
    );
  }
  if (!band) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <p className="text-xl font-semibold text-white">Band niet gevonden</p>
        <Link to="/bandspace" className="text-violet-400 hover:underline text-sm">← Terug naar Band Space</Link>
      </div>
    );
  }

  // Calendar derived
  const calYear = calendarDate.getFullYear(), calMonth = calendarDate.getMonth();
  const eventsByDay: Record<number, BandEvent[]> = {};
  bandEvents.forEach(ev => { const d = parseInt(ev.event_date.split('-')[2], 10); (eventsByDay[d] ??= []).push(ev); });
  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];
  const eventFormTypeInfo = EVENT_TYPES.find(t => t.value === eventForm.type)!;

  // ── Nav helper ───────────────────────────────────────────────────────────
  function switchChannel(key: ChannelKey) { setActiveChannel(key); setActiveView('channel'); setShowMobileSidebar(false); setChannelTab('chat'); }

  // Clicking a calendar day selects it (so its events show) and, for members
  // who can create events, opens the create modal with the date pre-filled.
  function handleDayClick(day: number) {
    setSelectedDay(day);
    if (isAdmin && isMember) {
      const date = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setEventForm(f => ({ ...f, date }));
      setShowAddEvent(true);
    }
  }

  // ── Sidebar nav item ─────────────────────────────────────────────────────
  function NavItem({ view, icon: Icon, label, color }: { view: ActiveView; icon: any; label: string; color?: string }) {
    const active = activeView === view && (view !== 'channel');
    return (
      <button onClick={() => { setActiveView(view); setShowMobileSidebar(false); }} disabled={!isMember && view !== 'home'}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative disabled:opacity-40 group ${active ? 'bg-white/8' : 'hover:bg-white/4'}`}>
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-violet-500" />}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-violet-500/20' : 'bg-white/5 group-hover:bg-white/8'}`}>
          <Icon size={13} className={active ? (color || 'text-violet-400') : 'text-slate-500 group-hover:text-slate-400'} />
        </div>
        <span className={`text-[13px] font-medium ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{label}</span>
      </button>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100dvh-80px)] pb-32 lg:pb-20 lg:h-[calc(100dvh-64px)]">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`
        shrink-0 flex-col bg-gradient-to-b from-[#1a1630] to-[#171328] border-r border-white/8
        ${showMobileSidebar ? 'fixed top-[var(--navbar-h,4rem)] bottom-0 left-0 z-50 flex shadow-2xl w-72 pb-28' : 'hidden lg:flex w-64'}
      `}>
        {showMobileSidebar && (
          <button onClick={() => setShowMobileSidebar(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 lg:hidden"><X size={18} /></button>
        )}

        {/* Band header */}
        <div className="px-4 pt-5 pb-4 border-b border-white/8 shrink-0">
          <Link to="/bandspace" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors mb-3">
            <ChevronLeft size={11} /> Band Space
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/40 to-violet-900/60 border border-violet-500/25 flex items-center justify-center shrink-0">
              {band.image_url ? <img src={band.image_url} alt={band.name} className="w-full h-full object-cover rounded-xl" /> : <Music size={16} className="text-violet-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{band.name}</p>
              {band.genre && <div className="mt-0.5"><GenreBadge genre={band.genre} className="text-[10px] px-1.5" /></div>}
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-[9px] font-bold text-violet-400/70 uppercase tracking-[0.15em] bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">
              Orbit Workspace
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <NavItem view="home" icon={LayoutDashboard} label="Home" />
          <NavItem view="calendar" icon={Calendar} label="Kalender" />
          <NavItem view="todos" icon={ListTodo} label="Taken" />

          <div className="pt-3 pb-1">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3">Kanalen</p>
          </div>

          {CHANNELS.map(ch => {
            const Icon = ch.icon;
            const active = activeView === 'channel' && activeChannel === ch.key;
            const preview = channelPreviews[ch.key];
            const mentions = mentionCounts[ch.key] ?? 0;
            return (
              <button key={ch.key} onClick={() => switchChannel(ch.key)} disabled={!isMember}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all disabled:opacity-40 relative group ${active ? 'bg-white/8' : 'hover:bg-white/4'}`}>
                {active && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full ${ch.accent}`} />}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? ch.bg : 'bg-white/5 group-hover:bg-white/8'}`}>
                  <Icon size={13} className={active ? ch.color : 'text-slate-500 group-hover:text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[13px] font-medium truncate ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{ch.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {mentions > 0 && !active && (
                        <span className="flex items-center gap-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-bold px-1 rounded-full">
                          <AtSign size={8} />{mentions}
                        </span>
                      )}
                      {preview?.hasUnread && !active && mentions === 0 && <span className={`w-2 h-2 rounded-full animate-pulse ${ch.accent}`} />}
                      {preview?.lastAt && <span className="text-[10px] text-slate-600">{shortTime(preview.lastAt)}</span>}
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

        {/* Sidebar footer */}
        <div className="px-4 py-3 border-t border-white/8 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {members.slice(0, 4).map((m: any) => (
                <UserAvatar key={m.id} src={m.profile?.avatar_url} name={m.profile?.display_name || m.profile?.username} size={20} className="ring-2 ring-[#171328]" />
              ))}
            </div>
            <span className="text-[11px] text-slate-500">{members.length} {members.length === 1 ? 'lid' : 'leden'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowShareModal(true)} title="Delen" className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors">
              <Share2 size={14} />
            </button>
            <button onClick={() => setShowMembers(v => !v)}
              className={`relative p-1.5 rounded-lg transition-colors ${showMembers ? 'text-violet-400 bg-violet-500/15' : 'text-slate-500 hover:text-white hover:bg-white/8'}`}>
              <Users size={14} />
              {isAdmin && pending.length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] text-white flex items-center justify-center font-bold">{pending.length}</span>}
            </button>
            {isMember && !isAdmin && (
              <button onClick={handleLeave} disabled={leaving} title="Verlaten" className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile header bar (shown instead of sidebar on mobile) — sits below the main navbar, whose real
          height (incl. iOS safe-area inset) is published as --navbar-h so this never sits under the notch. */}
      <div className="lg:hidden fixed top-[var(--navbar-h,4rem)] left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-white/8" style={{ background: '#131020f0' }}>
        <Link to="/bandspace" className="text-slate-400 hover:text-white"><ChevronLeft size={18} /></Link>
        <span className="text-sm font-semibold text-white truncate flex-1">{band.name}</span>
        <button onClick={handleShare} className="p-1.5 text-slate-400 hover:text-violet-400 transition-colors"><Share2 size={16} /></button>
        <button onClick={() => setShowMobileSidebar(true)} className="p-1.5 text-slate-400 hover:text-white"><Menu size={18} /></button>
      </div>

      {/* Mobile backdrop */}
      {showMobileSidebar && <div className="fixed top-[var(--navbar-h,4rem)] bottom-0 left-0 right-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileSidebar(false)} />}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-12 lg:pt-0">

        {/* ── HOME VIEW ────────────────────────────────────────────────────── */}
        {activeView === 'home' && (
          <div className="flex-1 overflow-y-auto">
            {/* Band hero */}
            <div className={`relative bg-gradient-to-br ${bandGradient(band.genre)} overflow-hidden`} style={{ minHeight: 220 }}>
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(99,102,241,0.3) 0%, transparent 60%)' }} />
              {band.cover_url && <img src={band.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c1a] via-transparent to-transparent" />
              <div className="relative px-6 lg:px-10 pt-10 pb-8 flex flex-col lg:flex-row lg:items-end gap-5">
                <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-2xl">
                  {band.image_url ? <img src={band.image_url} alt={band.name} className="w-full h-full object-cover rounded-2xl" /> : <Music size={32} className="text-white/60" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">{band.name}</h1>
                    {!band.is_public && <Lock size={14} className="text-slate-400 shrink-0" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
                    {band.genre && <GenreBadge genre={band.genre} />}
                    {band.location && <span className="flex items-center gap-1"><MapPin size={12} />{band.location}</span>}
                    <span>{members.length} {members.length === 1 ? 'lid' : 'leden'}</span>
                  </div>
                  {band.description && <p className="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">{band.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isMember && !isPending && band.is_public && user && (
                    <button onClick={handleRequestJoin} disabled={joining}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-lg">
                      {joining ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Aanvraag
                    </button>
                  )}
                  {isPending && <span className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2"><Clock size={14} /> In behandeling</span>}
                  {isAdmin && (
                    <button onClick={() => setShowAddEvent(true)}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors backdrop-blur-sm">
                      <Calendar size={14} /> Evenement
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Orbit Channel Tiles ──────────────────────────────────────── */}
            {isMember && (
              <div className="border-b border-white/8 bg-black/15">
                {/* Mobile / tablet: informative grid with previews */}
                <div className="max-w-6xl mx-auto px-4 lg:px-8 py-5 lg:hidden">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Orbit Kanalen</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CHANNELS.map(ch => {
                      const Icon = ch.icon;
                      const preview = channelPreviews[ch.key];
                      const mentions = mentionCounts[ch.key] ?? 0;
                      return (
                        <button key={ch.key} onClick={() => switchChannel(ch.key)}
                          className="flex flex-col items-start gap-2.5 p-3.5 rounded-2xl bg-white/4 hover:bg-white/7 border border-white/8 hover:border-white/15 active:scale-[0.97] transition-all text-left group">
                          <div className="flex items-center justify-between w-full">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ch.bg} group-hover:scale-105 transition-transform`}>
                              <Icon size={16} className={ch.color} />
                            </div>
                            <div className="flex items-center gap-1">
                              {mentions > 0 && (
                                <span className="flex items-center gap-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                  <AtSign size={8} />{mentions}
                                </span>
                              )}
                              {preview?.hasUnread && mentions === 0 && (
                                <span className={`w-2 h-2 rounded-full ${ch.accent} animate-pulse`} />
                              )}
                            </div>
                          </div>
                          <div className="w-full min-w-0">
                            <p className="text-[13px] font-semibold text-white leading-tight">{ch.label}</p>
                            {preview?.lastContent ? (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-snug">
                                {preview.lastSender && <span className="text-slate-400">{preview.lastSender.split(' ')[0]}: </span>}
                                {preview.lastContent}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-600 mt-0.5">Nog geen berichten</p>
                            )}
                            {preview?.lastAt && (
                              <p className="text-[10px] text-slate-600 mt-1">{shortTime(preview.lastAt)}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop: channels orbit the h-orbit logo */}
                <div className="hidden lg:flex flex-col items-center max-w-6xl mx-auto px-8 py-8">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Orbit Kanalen</p>
                  <div className="relative" style={{ width: 640, height: ORBIT_RADIUS * 2 + 130 }}>
                    {/* Orbit path */}
                    <div aria-hidden
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10"
                      style={{ width: ORBIT_RADIUS * 2, height: ORBIT_RADIUS * 2 }} />
                    <div aria-hidden
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]"
                      style={{ width: ORBIT_RADIUS * 2 + 60, height: ORBIT_RADIUS * 2 + 60 }} />

                    {/* Center: h-orbit logo */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none select-none">
                      <div aria-hidden className="absolute -z-10 w-44 h-44 rounded-full bg-violet-600/25 blur-3xl" />
                      <img src="/H-orbit-logo.png" alt="h-orbit"
                        className="h-24 w-auto drop-shadow-[0_0_30px_rgba(139,92,246,0.45)]" />
                    </div>

                    {/* Orbiting channel bubbles */}
                    {CHANNELS.map((ch, i) => {
                      const Icon = ch.icon;
                      const preview = channelPreviews[ch.key];
                      const mentions = mentionCounts[ch.key] ?? 0;
                      const angle = (-90 + i * (360 / CHANNELS.length)) * (Math.PI / 180);
                      const x = Math.cos(angle) * ORBIT_RADIUS;
                      const y = Math.sin(angle) * ORBIT_RADIUS;
                      return (
                        <button key={ch.key} onClick={() => switchChannel(ch.key)} title={ch.label}
                          className="absolute flex flex-col items-center gap-2 group focus:outline-none"
                          style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)' }}>
                          <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${ch.bg} border ${ch.border} shadow-lg group-hover:scale-110 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-white/40 transition-transform`}>
                            <Icon size={24} className={ch.color} />
                            {mentions > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow ring-2 ring-[#0f0c1a]">
                                <AtSign size={8} />{mentions}
                              </span>
                            )}
                            {preview?.hasUnread && mentions === 0 && (
                              <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-[#0f0c1a] ${ch.accent} animate-pulse`} />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors whitespace-nowrap">{ch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Content grid */}
            <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

                {/* Left: Posts feed */}
                <div className="lg:col-span-2 space-y-4">
                  <h2 className="text-base font-semibold text-white">Updates</h2>

                  {/* Post composer — admin only */}
                  {isAdmin && (
                    <div className="bg-white/4 border border-white/8 rounded-2xl p-4 lg:p-5">
                      {showPostTitle && (
                        <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                          placeholder="Titel (optioneel)"
                          className="w-full bg-transparent text-sm font-semibold text-white placeholder-slate-600 focus:outline-none mb-2 border-b border-white/8 pb-2" />
                      )}
                      <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                        placeholder="Deel een update, aankondiging of setlist met de band…"
                        rows={3}
                        className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed" />
                      {postImageUrl && (
                        <div className="relative mt-3 inline-block">
                          <img src={postImageUrl} alt="" className="max-h-48 rounded-xl object-cover" />
                          <button onClick={() => setPostImageUrl('')} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"><X size={12} /></button>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/8">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setShowPostTitle(v => !v)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${showPostTitle ? 'bg-white/8 border-white/20 text-slate-300' : 'border-white/8 text-slate-500 hover:text-slate-300'}`}>
                            Titel
                          </button>
                          <input ref={postImgRef} type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handlePostImageUpload(f); e.target.value = ''; }} />
                          <button onClick={() => postImgRef.current?.click()} disabled={uploadingPostImg}
                            className="text-slate-500 hover:text-slate-300 p-1.5 hover:bg-white/8 rounded-lg transition-colors">
                            {uploadingPostImg ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingPostId && (
                            <button onClick={cancelEditPost}
                              className="text-sm font-medium px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white transition-colors">
                              Annuleren
                            </button>
                          )}
                          <button onClick={handleCreatePost} disabled={!postContent.trim() || submittingPost}
                            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40">
                            {submittingPost ? <Loader2 size={13} className="animate-spin" /> : null} {editingPostId ? 'Bijwerken' : 'Plaatsen'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Posts list */}
                  {postsLoading ? (
                    <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-violet-400/50" /></div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-12 text-slate-600">
                      <LayoutDashboard size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{isAdmin ? 'Nog geen updates. Deel iets met de band!' : 'Nog geen updates van de band.'}</p>
                    </div>
                  ) : (
                    posts.map(post => (
                      <article key={post.id} className="bg-white/3 hover:bg-white/4 border border-white/8 rounded-2xl overflow-hidden transition-colors group">
                        <div className="px-5 py-4 lg:px-6 lg:py-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar src={post.author?.avatar_url} name={post.author?.display_name || post.author?.username} size={36} />
                              <div>
                                <p className="text-sm font-semibold text-white">{post.author?.display_name || post.author?.username}</p>
                                <p className="text-[11px] text-slate-500">{formatTime(post.created_at)}</p>
                              </div>
                            </div>
                            {(isAdmin || post.author_id === user?.id) && (
                              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                                <button onClick={() => startEditPost(post)}
                                  className="text-slate-600 hover:text-violet-400 transition-colors p-1" title="Bewerken">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => handleDeletePost(post.id, post.image_url)}
                                  className="text-slate-600 hover:text-red-400 transition-colors p-1" title="Verwijderen">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          {post.title && <h3 className="text-base font-bold text-white mb-1.5">{post.title}</h3>}
                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        </div>
                        {post.image_url && (
                          <img src={post.image_url} alt="" className="w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => window.open(post.image_url!, '_blank')} />
                        )}
                      </article>
                    ))
                  )}
                </div>

                {/* Right panel */}
                <div className="space-y-5">
                  {/* Upcoming events */}
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Aankomende evenementen</h3>
                      <button onClick={() => setActiveView('calendar')} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">Kalender →</button>
                    </div>
                    {upcomingEvents.length === 0 ? (
                      <p className="text-xs text-slate-600 py-2">Geen geplande evenementen.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {upcomingEvents.map(ev => {
                          const t = EVENT_TYPES.find(t => t.value === ev.type)!;
                          const d = new Date(ev.event_date + 'T00:00:00');
                          return (
                            <div key={ev.id} className="flex items-start gap-3">
                              <div className="text-center shrink-0 w-9">
                                <p className="text-[10px] text-slate-600 uppercase leading-none">{NL_MONTHS[d.getMonth()].slice(0, 3)}</p>
                                <p className="text-lg font-bold text-white leading-tight">{d.getDate()}</p>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                                  <span className={`text-[11px] ${t.color}`}>{t.label}{ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : ''}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isAdmin && (
                      <button onClick={() => setShowAddEvent(true)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors mt-3 pt-3 border-t border-white/8 w-full">
                        <Plus size={12} /> Evenement toevoegen
                      </button>
                    )}
                  </div>

                  {/* Members */}
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Leden</h3>
                      <span className="text-[11px] text-slate-500">{members.length}</span>
                    </div>
                    <div className="space-y-2">
                      {members.slice(0, 6).map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2.5">
                          <UserAvatar src={m.profile?.avatar_url} name={m.profile?.display_name || m.profile?.username} size={28} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-300 truncate">{m.profile?.display_name || m.profile?.username}</p>
                            {m.role === 'admin' && <p className="text-[10px] text-violet-400 flex items-center gap-0.5"><ShieldCheck size={8} /> Admin</p>}
                          </div>
                        </div>
                      ))}
                      {members.length > 6 && <p className="text-xs text-slate-600 pt-1">+{members.length - 6} meer</p>}
                    </div>
                  </div>

                  {/* Pinned events tile */}
                  {pinnedEvents.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 lg:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Pin size={13} className="text-amber-400" />
                        <h3 className="text-sm font-semibold text-white">Vastgepinde afspraken</h3>
                      </div>
                      <div className="space-y-2.5">
                        {pinnedEvents.map(ev => {
                          const t = EVENT_TYPES.find(t => t.value === ev.type)!;
                          const d = new Date(ev.event_date + 'T00:00:00');
                          return (
                            <div key={ev.id} className="flex items-start gap-3">
                              <div className="text-center shrink-0 w-9">
                                <p className="text-[10px] text-amber-400/70 uppercase leading-none">{NL_MONTHS[d.getMonth()].slice(0, 3)}</p>
                                <p className="text-lg font-bold text-white leading-tight">{d.getDate()}</p>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                                  <span className={`text-[11px] ${t.color}`}>{t.label}{ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : ''}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => setActiveView('calendar')} className="text-[11px] text-amber-400/70 hover:text-amber-400 transition-colors mt-3 pt-3 border-t border-amber-500/15 w-full text-left">
                        Alle afspraken →
                      </button>
                    </div>
                  )}

                  {/* Taken (todos) tile */}
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ListTodo size={13} className="text-violet-400" />
                        <h3 className="text-sm font-semibold text-white">Taken</h3>
                      </div>
                      <button onClick={() => setActiveView('todos')} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">Alles →</button>
                    </div>
                    {todosLoading ? (
                      <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-violet-400/50" /></div>
                    ) : todos.filter(t => !t.completed).length === 0 ? (
                      <p className="text-xs text-slate-600 py-1">Geen openstaande taken.</p>
                    ) : (
                      <div className="space-y-2">
                        {todos.filter(t => !t.completed).slice(0, 4).map(todo => (
                          <div key={todo.id} className="flex items-start gap-2.5">
                            <button onClick={() => handleToggleTodo(todo)} className="mt-0.5 shrink-0 text-slate-500 hover:text-violet-400 transition-colors">
                              <Square size={13} />
                            </button>
                            <p className="text-xs text-slate-300 leading-relaxed">{todo.content}</p>
                          </div>
                        ))}
                        {todos.filter(t => !t.completed).length > 4 && (
                          <p className="text-[11px] text-slate-600 pt-0.5">+{todos.filter(t => !t.completed).length - 4} meer</p>
                        )}
                      </div>
                    )}
                    {isMember && (
                      <button onClick={() => setActiveView('todos')}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors mt-3 pt-3 border-t border-white/8 w-full">
                        <Plus size={12} /> Taak toevoegen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CALENDAR VIEW ─────────────────────────────────────────────────── */}
        {activeView === 'calendar' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Kalender</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{band.name} · Orbit Workspace</p>
                </div>
                {isAdmin && isMember && (
                  <button onClick={() => setShowAddEvent(true)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
                    <Plus size={15} /> Evenement
                  </button>
                )}
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                {/* Month nav */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                  <button onClick={() => { setCalendarDate(new Date(calYear, calMonth - 1, 1)); setSelectedDay(null); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/8 rounded-lg transition-colors"><ChevronLeft size={16} /></button>
                  <h3 className="font-semibold text-white">{NL_MONTHS[calMonth]} {calYear}</h3>
                  <button onClick={() => { setCalendarDate(new Date(calYear, calMonth + 1, 1)); setSelectedDay(null); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/8 rounded-lg transition-colors"><ChevronRight size={16} /></button>
                </div>

                {eventsLoading ? (
                  <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 px-4 pt-3">
                      {NL_DAYS.map(d => <div key={d} className="text-center text-[11px] font-semibold text-slate-600 uppercase py-2">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-white/5 mx-4 mb-4 rounded-xl overflow-hidden border border-white/8">
                      {Array.from({ length: getFirstWeekday(calYear, calMonth) }).map((_, i) => <div key={`e${i}`} className="bg-[#13102088] h-20 lg:h-24" />)}
                      {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => i + 1).map(day => {
                        const isToday = new Date().toDateString() === new Date(calYear, calMonth, day).toDateString();
                        const isSelected = selectedDay === day;
                        const dayEvs = eventsByDay[day] ?? [];
                        return (
                          <button key={day} onClick={() => handleDayClick(day)}
                            className={`bg-[#13102088] h-20 lg:h-24 p-2 flex flex-col items-start hover:bg-white/5 transition-colors text-left ${isSelected ? 'ring-1 ring-inset ring-violet-500/60' : ''}`}>
                            <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1.5 ${isToday ? 'bg-violet-500 text-white' : 'text-slate-400'}`}>{day}</span>
                            <div className="flex flex-col gap-0.5 w-full">
                              {dayEvs.slice(0, 2).map(ev => {
                                const t = EVENT_TYPES.find(t => t.value === ev.type)!;
                                return <div key={ev.id} className={`text-[9px] lg:text-[10px] font-medium ${t.color} bg-white/5 rounded px-1 py-0.5 truncate`}>{ev.title}</div>;
                              })}
                              {dayEvs.length > 2 && <span className="text-[9px] text-slate-600">+{dayEvs.length - 2}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4">
                {EVENT_TYPES.map(t => <div key={t.value} className="flex items-center gap-1.5 text-xs text-slate-500"><span className={`w-2 h-2 rounded-full ${t.dot}`} />{t.label}</div>)}
              </div>

              {/* Selected day events */}
              {selectedDay !== null && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    {selectedDayEvents.length > 0 ? `${selectedDayEvents.length} evenement${selectedDayEvents.length > 1 ? 'en' : ''} op ${selectedDay} ${NL_MONTHS[calMonth]}` : `Geen evenementen op ${selectedDay} ${NL_MONTHS[calMonth]}`}
                  </h4>
                  <div className="space-y-2">
                    {selectedDayEvents.map(ev => {
                      const t = EVENT_TYPES.find(t => t.value === ev.type)!;
                      return (
                        <div key={ev.id} className="flex items-start gap-4 bg-white/4 border border-white/8 rounded-xl px-5 py-4 group">
                          <span className={`w-3 h-3 rounded-full mt-1 shrink-0 ${t.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">{ev.title}</p>
                            <p className={`text-sm ${t.color} mt-0.5`}>{t.label}{ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : ''}</p>
                            {ev.description && <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{ev.description}</p>}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                              <button onClick={() => handlePinEvent(ev)} title={ev.is_pinned ? 'Losmaken' : 'Vastpinnen'}
                                className={`p-1 transition-colors ${ev.is_pinned ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
                                <Pin size={13} />
                              </button>
                              <button onClick={() => handleDeleteEvent(ev.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {selectedDayEvents.length === 0 && isAdmin && (
                      <button onClick={() => { setEventForm(f => ({ ...f, date: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` })); setShowAddEvent(true); }}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-400 transition-colors">
                        <Plus size={14} /> Toevoegen voor deze dag
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TODOS VIEW ────────────────────────────────────────────────────── */}
        {activeView === 'todos' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><ListTodo size={20} className="text-violet-400" /> Taken</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{band.name} · gedeelde takenlijst</p>
                </div>
                <span className="text-xs text-slate-500 bg-white/5 border border-white/8 rounded-full px-2.5 py-1">
                  {todos.filter(t => !t.completed).length} open
                </span>
              </div>

              {/* Add todo */}
              {isMember && (
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={e => setNewTodo(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateTodo(); }}
                    placeholder="Nieuwe taak toevoegen…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                  <button onClick={handleCreateTodo} disabled={!newTodo.trim() || addingTodo}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 shrink-0 text-sm">
                    {addingTodo ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
                  </button>
                </div>
              )}

              {/* Todo list */}
              {todosLoading ? (
                <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
              ) : todos.length === 0 ? (
                <div className="text-center py-16 text-slate-600">
                  <CheckSquare size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Geen taken. Voeg de eerste taak toe!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Open todos */}
                  {todos.filter(t => !t.completed).map(todo => (
                    <div key={todo.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 transition-colors group">
                      <button onClick={() => handleToggleTodo(todo)} className="mt-0.5 shrink-0 text-slate-500 hover:text-violet-400 transition-colors">
                        <Square size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-relaxed">{todo.content}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{todo.creator?.display_name || todo.creator?.username}</p>
                      </div>
                      {(isAdmin || todo.created_by === user?.id) && (
                        <button onClick={() => handleDeleteTodo(todo.id)}
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5 shrink-0">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Completed todos */}
                  {todos.filter(t => t.completed).length > 0 && (
                    <>
                      <div className="flex items-center gap-2 pt-4 pb-1">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-[11px] text-slate-600 font-medium">{todos.filter(t => t.completed).length} voltooid</span>
                        <div className="flex-1 h-px bg-white/8" />
                      </div>
                      {todos.filter(t => t.completed).map(todo => (
                        <div key={todo.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/2 border border-white/5 transition-colors group opacity-60">
                          <button onClick={() => handleToggleTodo(todo)} className="mt-0.5 shrink-0 text-emerald-500 hover:text-slate-500 transition-colors">
                            <CheckSquare size={16} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-500 line-through leading-relaxed">{todo.content}</p>
                          </div>
                          {(isAdmin || todo.created_by === user?.id) && (
                            <button onClick={() => handleDeleteTodo(todo.id)}
                              className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5 shrink-0">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CHANNEL VIEW ──────────────────────────────────────────────────── */}
        {activeView === 'channel' && (
          <div className="flex-1 flex flex-col overflow-hidden" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            {isDragging && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-950/70 border-2 border-dashed border-emerald-400/60 pointer-events-none backdrop-blur-sm">
                <div className="bg-emerald-500/20 rounded-2xl p-8 flex flex-col items-center gap-3">
                  <Video size={40} className="text-emerald-400" /><p className="text-emerald-300 font-semibold text-lg">Laat los om te uploaden</p>
                </div>
              </div>
            )}

            {/* Channel header */}
            <div className="flex items-center gap-3 px-5 lg:px-6 py-3.5 border-b border-white/8 shrink-0 bg-[#16132650]">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activeCh.bg}`}>
                <ActiveIcon size={15} className={activeCh.color} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">{activeCh.label}</h2>
                <p className="text-[11px] text-slate-500">Orbit · {band.name}</p>
              </div>
              <div className="flex-1" />
              {isMember && (
                <div className="flex items-center bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5">
                  {(['chat', 'notes'] as const).map(tab => (
                    <button key={tab} onClick={() => setChannelTab(tab)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${channelTab === tab ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                      {tab === 'chat' ? <MessageSquare size={11} /> : <PenLine size={11} />}
                      {tab === 'chat' ? 'Chat' : 'Notities'}
                    </button>
                  ))}
                </div>
              )}
              {channelTab === 'chat' && pinnedMessages.length > 0 && (
                <button onClick={() => setShowPinned(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${showPinned ? 'bg-violet-600/20 border-violet-500/30 text-violet-300' : 'border-white/8 text-slate-500 hover:text-violet-300'}`}>
                  <Pin size={11} />{pinnedMessages.length}<ChevronDown size={11} className={`transition-transform ${showPinned ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Pinned bar */}
            {channelTab === 'chat' && pinnedMessages.length > 0 && showPinned && (
              <div className="border-b border-violet-500/20 bg-violet-950/40 px-5 lg:px-6 py-3 space-y-2 shrink-0">
                <p className="text-[10px] font-semibold text-violet-400/60 uppercase tracking-wider mb-1.5">Vastgepind</p>
                {pinnedMessages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-2.5 bg-white/4 border border-violet-500/15 rounded-xl px-3 py-2.5 text-xs">
                    <Pin size={10} className="text-violet-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-violet-300 font-semibold">{msg.sender?.display_name || msg.sender?.username}</span>
                      <span className="text-slate-600 text-[10px] ml-2">{formatTime(msg.created_at)}</span>
                      <p className="text-slate-300 truncate mt-0.5">{msg.content}</p>
                    </div>
                    {isAdmin && <button onClick={() => handleTogglePin(msg)} className="text-slate-600 hover:text-red-400 transition-colors p-0.5"><X size={12} /></button>}
                  </div>
                ))}
              </div>
            )}

            {/* CHAT TAB */}
            {channelTab === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="max-w-3xl mx-auto px-4 lg:px-6 py-5 space-y-1">
                    {msgLoading ? (
                      <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
                    ) : !isMember ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center"><Lock size={24} className="opacity-40" /></div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-400">{isPending ? 'Aanvraag in behandeling' : 'Alleen voor leden'}</p>
                          <p className="text-xs text-slate-600 mt-1">{isPending ? 'De admin beoordeelt je aanvraag.' : 'Word lid om berichten te zien.'}</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className={`w-16 h-16 rounded-2xl ${activeCh.bg} border ${activeCh.border} flex items-center justify-center`}><ActiveIcon size={28} className={activeCh.color} /></div>
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
                            <div key={msg.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''} ${sameAsPrev ? 'mt-0.5' : 'mt-5'} ${isMentioned ? 'bg-amber-500/5 -mx-3 px-3 rounded-xl' : ''}`}>
                              <div className="w-9 shrink-0 flex items-end">
                                {!sameAsPrev && <UserAvatar src={msg.sender?.avatar_url} name={msg.sender?.display_name || msg.sender?.username} size={34} />}
                              </div>
                              <div className={`flex flex-col max-w-[82%] lg:max-w-[55%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {!sameAsPrev && (
                                  <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-[13px] font-semibold text-slate-300">{msg.sender?.display_name || msg.sender?.username}</span>
                                    <span className="text-[11px] text-slate-600">{formatTime(msg.created_at)}</span>
                                    {msg.is_pinned && <Pin size={9} className="text-violet-400" />}
                                    {isMentioned && <AtSign size={9} className="text-amber-400" />}
                                  </div>
                                )}
                                <div className={`relative group/bubble px-4 py-2.5 text-[13px] lg:text-sm leading-relaxed break-words ${
                                  isMe
                                    ? `bg-violet-600 text-white ${!sameAsPrev ? 'rounded-2xl rounded-tr-sm' : sameAsNext ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                                    : `bg-white/8 text-slate-100 border border-white/8 ${!sameAsPrev ? 'rounded-2xl rounded-tl-sm' : sameAsNext ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
                                }`}>
                                  <span className="whitespace-pre-wrap">{renderContent(msg.content)}</span>
                                  {msg.attachment_url && (
                                    <div className="mt-2.5">
                                      {msg.attachment_type === 'image'
                                        ? <img src={msg.attachment_url} alt="bijlage" className="max-w-[280px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.attachment_url, '_blank')} />
                                        : msg.attachment_type === 'video'
                                        ? <video src={msg.attachment_url} controls className="max-w-[320px] rounded-xl" />
                                        : <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2.5 border border-white/10 transition-colors"><FileIcon size={13} className="shrink-0" /><span className="truncate">Bijlage</span></a>
                                      }
                                    </div>
                                  )}
                                  <div className={`absolute -top-2.5 ${isMe ? 'left-1' : 'right-1'} flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover/bubble:opacity-100 transition-opacity`}>
                                    {isAdmin && (
                                      <button onClick={() => handleTogglePin(msg)} title={msg.is_pinned ? 'Losmaken' : 'Vastpinnen'}
                                        className="bg-[#1e1a30] border border-white/15 rounded-full p-1 shadow-lg">
                                        <Pin size={10} className={msg.is_pinned ? 'text-violet-400' : 'text-slate-400'} />
                                      </button>
                                    )}
                                    {(isMe || isAdmin) && (
                                      <button onClick={() => handleDeleteMessage(msg)} title="Verwijderen"
                                        className="bg-[#1e1a30] border border-white/15 rounded-full p-1 shadow-lg">
                                        <Trash2 size={10} className="text-slate-400 hover:text-red-400 transition-colors" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </>
                    )}
                  </div>
                </div>

                {/* Input */}
                {isMember ? (
                  <div className="border-t border-white/8 shrink-0 py-3 lg:py-4">
                    <div className="max-w-3xl mx-auto px-4 lg:px-6 relative">
                      {mentionSearch !== null && mentionSuggestions.length > 0 && (
                        <div className="absolute bottom-full left-4 lg:left-6 right-4 lg:right-6 mb-2 bg-[#1e1a30] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-10">
                          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 pt-2 pb-1">Leden</p>
                          {mentionSuggestions.map((m, i) => (
                            <button key={m.id} onClick={() => insertMention(m)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${i === mentionIndex ? 'bg-violet-600/20' : 'hover:bg-white/5'}`}>
                              <UserAvatar src={m.profile?.avatar_url} name={m.profile?.display_name || m.profile?.username} size={26} />
                              <div>
                                <p className="text-sm font-medium text-white">{m.profile?.display_name || m.profile?.username}</p>
                                {m.profile?.username && <p className="text-[10px] text-slate-500">@{m.profile.username}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.zip" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                      <div className="flex items-end gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-violet-500/40 transition-colors">
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                          className={`p-1 rounded-lg transition-colors shrink-0 mb-0.5 ${activeChannel === 'media' ? 'text-emerald-400 hover:bg-emerald-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/8'}`}>
                          {uploading ? <Loader2 size={16} className="animate-spin" /> : activeChannel === 'media' ? <ImageIcon size={16} /> : <Paperclip size={16} />}
                        </button>
                        <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                          placeholder={activeChannel === 'media' ? 'Beschrijving of sleep media hierheen…' : `Bericht in ${activeCh.label}… (@ om te taggen)`}
                          rows={1} className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none resize-none py-0.5"
                          style={{ minHeight: '22px', maxHeight: '120px' }} />
                        <button onClick={handleSend} disabled={!input.trim() || sending || uploading}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${input.trim() && !sending ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}>
                          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isPending ? (
                  <div className="border-t border-white/8 px-6 py-5 flex items-center justify-center gap-3 shrink-0">
                    <Clock size={15} className="text-amber-400" /><p className="text-sm text-amber-300">Aanvraag in behandeling</p>
                    <button onClick={handleCancelRequest} className="text-xs text-slate-600 hover:text-red-400 ml-2 transition-colors">Intrekken</button>
                  </div>
                ) : (
                  <div className="border-t border-white/8 px-6 py-5 flex items-center justify-center shrink-0">
                    {band.is_public ? (
                      <button onClick={handleRequestJoin} disabled={joining || !user}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                        {joining ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Aanvraag versturen
                      </button>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-slate-500"><Lock size={13} /> Privéband — uitnodiging vereist</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* NOTES TAB */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="max-w-3xl mx-auto px-4 lg:px-6 py-4 w-full flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Notities — {activeCh.label}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Gedeeld met alle leden · automatisch opgeslagen</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {noteSaving && <Loader2 size={11} className="animate-spin text-slate-500" />}
                      {noteSaved && !noteSaving && <span className="text-emerald-400/80">Opgeslagen</span>}
                    </div>
                  </div>
                  {noteLoading
                    ? <div className="flex-1 flex justify-center items-center"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
                    : <textarea value={noteContent} onChange={e => handleNoteChange(e.target.value)}
                        placeholder={`Notities voor ${activeCh.label}…\n\nGebruik dit voor setlists, akkoordenschema's, afspraken, contactinfo…`}
                        disabled={!isMember}
                        className="flex-1 bg-white/4 border border-white/8 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/30 transition-colors resize-none leading-relaxed font-mono disabled:opacity-50" />
                  }
                  {noteLastUpdated?.updated_at && (
                    <p className="text-[11px] text-slate-600 mt-2 shrink-0">
                      Gewijzigd door <span className="text-slate-500">{noteLastUpdated.updater?.display_name || noteLastUpdated.updater?.username || 'onbekend'}</span> · {formatTime(noteLastUpdated.updated_at)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Members panel ────────────────────────────────────────────────────── */}
      {showMembers && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMembers(false)} />
          <div className="fixed top-0 lg:top-0 bottom-0 right-0 w-full sm:w-80 bg-[#1a162c] border-l border-white/10 z-50 flex flex-col shadow-2xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <h3 className="font-semibold text-white">Leden</h3>
              <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-white p-1 hover:bg-white/8 rounded-lg transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isAdmin && pending.length > 0 && (
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Aanvragen ({pending.length})
                  </p>
                  <div className="space-y-2">
                    {pending.map((m: any) => (
                      <div key={m.id} className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3">
                        <div className="flex items-center gap-2.5 mb-3">
                          <UserAvatar src={m.profile?.avatar_url} name={m.profile?.display_name || m.profile?.username} size={32} />
                          <p className="text-sm font-medium text-white truncate">{m.profile?.display_name || m.profile?.username}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAccept(m.id, m.profile)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-semibold border border-green-500/20 transition-colors"><Check size={11} /> Accepteren</button>
                          <button onClick={() => handleDecline(m.id, m.profile)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/8 hover:bg-red-500/18 text-red-400 text-xs font-semibold border border-red-500/15 transition-colors"><X size={11} /> Afwijzen</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-white/8 mt-4" />
                </div>
              )}
              <div className="px-4 pt-4 pb-6">
                <p className="text-[11px] font-semibold text-slate-500/80 uppercase tracking-wider mb-3">Leden ({members.length})</p>
                <div className="space-y-0.5">
                  {members.map((m: any) => {
                    const isMe = m.user_id === user?.id;
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                        <UserAvatar src={m.profile?.avatar_url} name={m.profile?.display_name || m.profile?.username} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{m.profile?.display_name || m.profile?.username}{isMe && <span className="text-slate-600 text-xs ml-1.5">(jij)</span>}</p>
                          {m.role === 'admin' && <span className="text-[10px] text-violet-400 flex items-center gap-0.5 mt-0.5"><ShieldCheck size={9} /> Admin</span>}
                        </div>
                        {isAdmin && !isMe && m.role !== 'admin' && (
                          <button onClick={() => handleRemoveMember(m.id, m.profile)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"><Trash2 size={13} /></button>
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
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e1a30] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Evenement toevoegen</h2>
              <button onClick={() => setShowAddEvent(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel *</label>
                <input type="text" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Naam van het evenement"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                  <div className="space-y-1.5">
                    {EVENT_TYPES.map(t => {
                      const selected = eventForm.type === t.value;
                      return (
                        <button key={t.value} type="button" onClick={() => setEventForm(f => ({ ...f, type: t.value }))}
                          aria-pressed={selected}
                          className={`w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all text-left ${selected ? 'bg-violet-600/20 border-violet-500 text-white font-semibold ring-1 ring-violet-500/40' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${selected ? t.dot : 'bg-slate-600'}`} />
                          <span className="flex-1">{t.label}</span>
                          {selected && <Check size={13} className="text-violet-300 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Datum *</label>
                    <input type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Tijd</label>
                    <input type="time" value={eventForm.time} onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Omschrijving</label>
                <textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Optioneel…" rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
              </div>
              {eventFormTypeInfo.channel && (
                <button onClick={() => setEventForm(f => ({ ...f, autoPost: !f.autoPost }))}
                  className={`flex items-center gap-2.5 w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${eventForm.autoPost ? 'bg-violet-600/15 border-violet-500/30 text-violet-300' : 'border-white/8 text-slate-500 hover:border-white/15'}`}>
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${eventForm.autoPost ? 'bg-violet-500 border-violet-500' : 'border-white/20'}`}>
                    {eventForm.autoPost && <Check size={9} className="text-white" />}
                  </div>
                  Ook posten in Orbit — {CHANNELS.find(c => c.key === eventFormTypeInfo.channel)?.label}
                </button>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddEvent(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors text-sm">Annuleren</button>
              <button onClick={handleAddEvent} disabled={savingEvent || !eventForm.title.trim() || !eventForm.date}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50 text-sm">
                {savingEvent ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share / invite modal ──────────────────────────────────────────────── */}
      {showShareModal && band && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <div className="bg-[#1e1a30] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Band delen</h2>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors"><X size={16} /></button>
            </div>

            {/* Band info row */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-white/5 rounded-xl border border-white/8">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                {band.image_url
                  ? <img src={band.image_url} alt={band.name} className="w-full h-full object-cover rounded-xl" />
                  : <Music size={16} className="text-violet-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{band.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {band.is_public
                    ? <><Globe size={10} className="text-emerald-400" /><span className="text-[11px] text-emerald-400">Openbaar</span></>
                    : <><Lock size={10} className="text-amber-400" /><span className="text-[11px] text-amber-400">Privé — uitnodiging vereist</span></>
                  }
                </div>
              </div>
            </div>

            {/* Copy link */}
            <div className="mb-1">
              <p className="text-xs font-medium text-slate-400 mb-2">Uitnodigingslink</p>
              <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5">
                <span className="flex-1 text-xs text-slate-400 truncate">{inviteLink()}</span>
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all shrink-0 ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/8 text-slate-300 hover:text-white hover:bg-white/12 border border-white/10'}`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Gekopieerd!' : 'Kopieer'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Iedereen met deze link wordt direct lid — ook bij een privéband.
              </p>
            </div>

            {/* Native share (mobile) */}
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors mb-3"
              >
                <Share2 size={15} /> Delen via…
              </button>
            )}

            {/* Admin: toggle public/private */}
            {isAdmin && (
              <div className="mt-2 pt-4 border-t border-white/8">
                <p className="text-xs font-medium text-slate-400 mb-2">Zichtbaarheid</p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from('bands').update({ is_public: true }).eq('id', band.id);
                      if (!error) setBand((b: any) => b ? { ...b, is_public: true } : b);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${band.is_public ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                  >
                    <Globe size={12} /> Openbaar
                  </button>
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from('bands').update({ is_public: false }).eq('id', band.id);
                      if (!error) setBand((b: any) => b ? { ...b, is_public: false } : b);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${!band.is_public ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                  >
                    <Lock size={12} /> Privé
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
