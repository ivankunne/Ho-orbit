import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Music, Mic2, Globe, Newspaper, Video,
  Send, Loader2, Users, LogOut, UserPlus, Lock, LayoutDashboard,
  X, Clock, Check, Trash2, Pin, Paperclip, ChevronDown, Menu,
  Image as ImageIcon, FileText as FileIcon, ShieldCheck, ShieldOff, Crown,
  Calendar, Plus, MessageSquare, PenLine, AtSign, MapPin,
  CheckSquare, Square, Share2, Copy, Search, Mail, Repeat, RotateCcw, CalendarX, Download,
  FolderKanban, Handshake, Pencil, Target, Lightbulb, UserCircle2, Camera,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import UserAvatar from '@components/UserAvatar';
import GenreBadge from '@components/GenreBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/tabs';
import { notifyBandMention } from '@services/emailService';
import BandPushBanner from '@components/BandPushBanner';
import BandRidersPanel from '@components/BandRidersPanel';
import ConfirmDialog from '@components/ConfirmDialog';
import { avatarPlaceholder, coverPlaceholder } from '@utils/placeholder';
import { getBandRole, isOwner as isOwnerRole, canRemoveRole, describeBandError, type BandRole } from '@lib/bandPermissions';
import { calculateEventProfit, formatEuro } from '@lib/profitCalculator';
import { type RecurrenceRule, type RecurrenceFreq, describeRecurrence } from '@lib/recurrence';
import { downloadIcsFile } from '@lib/ics';
import {
  leaveBand, removeBandMember, promoteToAdmin, demoteToMember,
  transferBandOwnership, deleteBand,
} from '@services/bandMemberService';
import {
  type BandInvite, type InviteCandidate, type InviteRole,
  listBandInvites, searchProfilesForInvite, addBandMemberDirect, createBandInvite, revokeBandInvite,
} from '@services/bandInviteService';
import {
  type ChannelKey, type ChannelPreview, type BandEvent, type EventType, type BandPost,
  type BandEventContact, type BandEventRsvp, type RsvpStatus,
  type BandProject, type BandProjectAssignment, type BandProjectGoal, type BandProjectIdea,
  getChannelPreviews, markChannelRead,
  uploadBandMedia, uploadBandAvatar, uploadBandCover, setPinned, deleteBandMessage,
  getBandPosts, createBandPost, updateBandPost, deleteBandPost,
  getBandEvents, getUpcomingEvents, createBandEvent, updateBandEvent, deleteBandEvent,
  getPinnedEvents, pinBandEvent,
  getEventContacts, addEventContact, deleteEventContact,
  getRsvps, setRsvp,
  getProfitSplits, saveProfitSplits,
  createRecurringBandEvent, updateEventSeries, skipOccurrence, unskipOccurrence, deleteEventSeries,
  regenerateCalendarFeedToken,
  getBandProjects, createBandProject, updateBandProject, deleteBandProject,
  getProjectAssignments, createProjectAssignment, updateProjectAssignment,
  toggleProjectAssignment, pinProjectAssignment, deleteProjectAssignment,
  getProjectGoals, createProjectGoal, updateProjectGoal, toggleProjectGoal, deleteProjectGoal,
  getProjectIdeas, createProjectIdea, pinProjectIdea, deleteProjectIdea,
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

interface EventContactDraft { id?: string; name: string; role: string; phone: string; email: string }

const EMPTY_EVENT_FORM = {
  title: '', type: 'rehearsal' as EventType, date: '', time: '', endTime: '', description: '', autoPost: true,
  location: '', address: '', mapsLink: '',
  gage: '', travelCost: '', otherCosts: '', isPaid: false, invoiceSent: false,
  agreements: '',
};

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'yes', label: 'Ja' },
  { value: 'maybe', label: 'Misschien' },
  { value: 'no', label: 'Nee' },
];

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

// ── Component ─────────────────────────────────────────────────────────────────

type ActiveView = 'home' | 'channel' | 'calendar' | 'projects' | 'project' | 'riders';
type ProjectTab = 'chat' | 'assignments' | 'goals' | 'ideas';

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
  const [isAdmin, setIsAdmin]   = useState(false); // true for both 'admin' and 'owner' — see myRole for the exact tier
  const [isOwner, setIsOwner]   = useState(false);
  const [myRole, setMyRole]     = useState<BandRole | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [deletingBand, setDeletingBand] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bandAvatarInputRef = useRef<HTMLInputElement>(null);

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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [savingEvent, setSavingEvent]     = useState(false);
  const [eventForm, setEventForm]         = useState(EMPTY_EVENT_FORM);
  const [eventModalTab, setEventModalTab] = useState<'general' | 'contacts' | 'financial' | 'agreements'>('general');
  const [eventContacts, setEventContacts] = useState<EventContactDraft[]>([]);
  const [eventRsvps, setEventRsvps]       = useState<Record<string, BandEventRsvp[]>>({});
  const [profitSplitMode, setProfitSplitModeLocal] = useState<'equal' | 'manual'>('equal');
  const [manualSplits, setManualSplits]   = useState<Record<string, string>>({});
  const [recurrenceForm, setRecurrenceForm] = useState({
    freq: 'none' as RecurrenceFreq, interval: 1, daysOfWeek: [] as number[],
    endCondition: 'never' as 'never' | 'until' | 'count', until: '', count: 10,
  });
  const [editingIsSeries, setEditingIsSeries] = useState(false);
  const [editingRecurrenceInfo, setEditingRecurrenceInfo] = useState<RecurrenceRule | null>(null);
  const [seriesEditScope, setSeriesEditScope] = useState<'this' | 'this_and_future' | 'all'>('this');
  const [deletingSeriesId, setDeletingSeriesId] = useState<string | null>(null);
  const [skippingId, setSkippingId] = useState<string | null>(null);

  // Notes
  const [noteContent, setNoteContent]         = useState('');
  const [noteLoading, setNoteLoading]         = useState(false);
  const [noteSaving, setNoteSaving]           = useState(false);
  const [noteSaved, setNoteSaved]             = useState(false);
  const [noteLastUpdated, setNoteLastUpdated] = useState<any>(null);

  // Project tiles
  const [projects, setProjects]               = useState<BandProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectTab, setProjectTab]           = useState<ProjectTab>('chat');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm]         = useState({ name: '', description: '' });
  const [savingProject, setSavingProject]     = useState(false);

  // Project assignments
  const [assignments, setAssignments]           = useState<BandProjectAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [newAssignment, setNewAssignment]       = useState({ content: '', assigneeId: '', dueDate: '' });
  const [addingAssignment, setAddingAssignment] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editingAssignmentText, setEditingAssignmentText] = useState('');

  // Project goals
  const [goals, setGoals]             = useState<BandProjectGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [newGoal, setNewGoal]         = useState({ content: '', dueDate: '' });
  const [addingGoal, setAddingGoal]   = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState('');

  // Project ideas
  const [ideas, setIdeas]             = useState<BandProjectIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [newIdea, setNewIdea]         = useState('');
  const [addingIdea, setAddingIdea]   = useState(false);

  // Pinned events
  const [pinnedEvents, setPinnedEvents] = useState<BandEvent[]>([]);

  // Share / invite modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [copiedFeedLink, setCopiedFeedLink] = useState(false);
  const [regeneratingFeedToken, setRegeneratingFeedToken] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; description: string; confirmLabel?: string; destructive?: boolean; onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [inviteTab, setInviteTab]         = useState<'search' | 'new'>('search');
  const [inviteQuery, setInviteQuery]     = useState('');
  const [inviteResults, setInviteResults] = useState<InviteCandidate[]>([]);
  const [searchingInvite, setSearchingInvite] = useState(false);
  const [addingUserId, setAddingUserId]   = useState<string | null>(null);
  const [inviteName, setInviteName]       = useState('');
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteRole, setInviteRole]       = useState<InviteRole>('member');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<BandInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

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
  const activeProject  = projects.find(p => p.id === activeProjectId) ?? null;
  // Unified chat scope: chat/pin/@mention/realtime logic is shared between a fixed
  // channel and a dynamic project tile — this is the single thing that switches.
  const chatScope = activeView === 'project'
    ? { mode: 'project' as const, key: activeProjectId ?? '', label: activeProject?.name ?? '', icon: MessageSquare, bg: 'bg-indigo-500/20', color: 'text-indigo-400', border: 'border-indigo-500/30' }
    : { mode: 'channel' as const, key: activeChannel,          label: activeCh.label,           icon: ActiveIcon,     bg: activeCh.bg,          color: activeCh.color,          border: activeCh.border };
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
      const activeMembers = all.filter((m: any) => m.status === 'active');
      setMembers(activeMembers);
      setPending(all.filter((m: any) => m.status === 'pending'));
      const mine = all.find((m: any) => m.user_id === user?.id);
      const role = getBandRole(activeMembers, user?.id);
      setIsMember(mine?.status === 'active');
      setMyRole(role);
      setIsAdmin(role === 'admin' || role === 'owner');
      setIsOwner(isOwnerRole(role));
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
    if (chatScope.mode === 'project' && !chatScope.key) return;
    setMsgLoading(true);
    let query = supabase.from('band_messages')
      .select('*, sender:profiles!band_messages_sender_id_fkey(id,username,display_name,avatar_url)')
      .eq('band_id', id);
    query = chatScope.mode === 'project' ? query.eq('project_id', chatScope.key) : query.eq('channel', chatScope.key);
    const { data } = await query.order('created_at', { ascending: true }).limit(100);
    setMessages(data ?? []);
    setMsgLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [id, chatScope.mode, chatScope.key]);

  useEffect(() => {
    if (activeView === 'channel' || (activeView === 'project' && projectTab === 'chat')) loadMessages();
  }, [loadMessages, activeView, projectTab]);

  // ── Mark read + refresh previews/mentions on channel switch ──────────────
  useEffect(() => {
    if (!id || !isMember || !user || activeView !== 'channel') return;
    markChannelRead(id, activeChannel);
    markMentionsRead(id, activeChannel, user.id);
    getChannelPreviews(id, user.id).then(setChannelPreviews);
    getMentionCounts(id, user.id).then(setMentionCounts);
  }, [id, activeChannel, isMember, user, activeView]);

  // ── Initial sidebar data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;
    getChannelPreviews(id, user.id).then(setChannelPreviews);
    getMentionCounts(id, user.id).then(setMentionCounts);
  }, [id, isMember, user]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isMember || !user) return;
    if (chatScope.mode === 'project' && !chatScope.key) return;
    const matchesScope = (row: any) => chatScope.mode === 'project' ? row.project_id === chatScope.key : row.channel === chatScope.key;

    const msgCh = supabase.channel(`band-${id}-${chatScope.mode}-${chatScope.key}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'band_messages', filter: `band_id=eq.${id}` },
        async (payload) => {
          if (!matchesScope(payload.new)) { if (chatScope.mode === 'channel') getChannelPreviews(id, user.id).then(setChannelPreviews); return; }
          const { data: sender } = await supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id', payload.new.sender_id).single();
          setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, { ...payload.new, sender }]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          if (chatScope.mode === 'channel') getChannelPreviews(id, user.id).then(setChannelPreviews);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'band_messages', filter: `band_id=eq.${id}` },
        (payload) => {
          if (!matchesScope(payload.new)) return;
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'band_messages' },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          if (chatScope.mode === 'channel') getChannelPreviews(id, user.id).then(setChannelPreviews);
        })
      .subscribe();

    const notifCh = supabase.channel(`band-notif-${id}-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'band_notifications', filter: `recipient_id=eq.${user.id}` },
        () => getMentionCounts(id, user.id).then(setMentionCounts))
      .subscribe();

    return () => { supabase.removeChannel(msgCh); supabase.removeChannel(notifCh); };
  }, [id, chatScope.mode, chatScope.key, isMember, user]);

  // ── Load calendar events ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeView !== 'calendar' || !id || !isMember) return;
    setEventsLoading(true);
    getBandEvents(id, calendarDate.getFullYear(), calendarDate.getMonth() + 1)
      .then(e => { setBandEvents(e); setEventsLoading(false); });
  }, [activeView, id, isMember, calendarDate]);

  // ── Load projects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isMember) return;
    setProjectsLoading(true);
    getBandProjects(id).then(p => { setProjects(p); setProjectsLoading(false); });
  }, [id, isMember]);

  // ── Load assignments / goals / ideas for the open project tile ──────────
  useEffect(() => {
    if (!activeProjectId || activeView !== 'project') return;
    if (projectTab === 'assignments') {
      setAssignmentsLoading(true);
      getProjectAssignments(activeProjectId).then(a => { setAssignments(a); setAssignmentsLoading(false); });
    } else if (projectTab === 'goals') {
      setGoalsLoading(true);
      getProjectGoals(activeProjectId).then(g => { setGoals(g); setGoalsLoading(false); });
    } else if (projectTab === 'ideas') {
      setIdeasLoading(true);
      getProjectIdeas(activeProjectId).then(i => { setIdeas(i); setIdeasLoading(false); });
    }
  }, [activeProjectId, activeView, projectTab]);

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

  function handleDeletePost(postId: string, imageUrl?: string | null) {
    setConfirmDialog({
      title: 'Update verwijderen', description: 'Weet je zeker dat je deze update wilt verwijderen?',
      onConfirm: async () => {
        const ok = await deleteBandPost(postId, imageUrl);
        if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
        setPosts(prev => prev.filter(p => p.id !== postId));
      },
    });
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
      .insert({
        band_id: id,
        channel: chatScope.mode === 'project' ? 'project' : chatScope.key,
        project_id: chatScope.mode === 'project' ? chatScope.key : null,
        sender_id: user.id, content, mentions: mentionedIds,
      })
      .select('*, sender:profiles!band_messages_sender_id_fkey(id,username,display_name,avatar_url)').single();

    if (error || !inserted) { setInput(content); addToast('Versturen mislukt', 'error'); }
    else {
      // Show it immediately — don't rely on the realtime echo (which may be disabled for the project).
      setMessages(prev => prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      if (id && user && chatScope.mode === 'channel') getChannelPreviews(id, user.id).then(setChannelPreviews);
      if (mentionedIds.length > 0) {
        await createMentionNotifications(inserted.id, id!, chatScope.mode === 'project' ? 'project' : chatScope.key, user.id, mentionedIds);
        notifyBandMention(id!, inserted.id, mentionedIds);
      }
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
      .insert({
        band_id: id,
        channel: chatScope.mode === 'project' ? 'project' : chatScope.key,
        project_id: chatScope.mode === 'project' ? chatScope.key : null,
        sender_id: user.id, content, attachment_url: result.url, attachment_type: result.type,
      })
      .select('*, sender:profiles!band_messages_sender_id_fkey(id,username,display_name,avatar_url)').single();
    if (error || !inserted) { addToast('Versturen mislukt', 'error'); }
    else {
      // Append right away so the upload is visible without waiting on realtime.
      setMessages(prev => prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      if (id && user && chatScope.mode === 'channel') getChannelPreviews(id, user.id).then(setChannelPreviews);
    }
    setUploading(false); inputRef.current?.focus();
  }

  // Media drag-and-drop is a channel-specific affordance (the "Media" channel only) —
  // not part of project chat, which has no attachment spec.
  function handleDragOver(e: React.DragEvent) { if (chatScope.mode !== 'channel' || activeChannel !== 'media' || !isMember) return; e.preventDefault(); setIsDragging(true); }
  function handleDragLeave() { setIsDragging(false); }
  function handleDrop(e: React.DragEvent) { e.preventDefault(); setIsDragging(false); if (chatScope.mode !== 'channel' || activeChannel !== 'media' || !isMember) return; const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }

  // ── Handlers: pin ────────────────────────────────────────────────────────
  async function handleTogglePin(msg: any) {
    if (!isAdmin || !user) return;
    const np = !msg.is_pinned;
    const ok = await setPinned(msg.id, np, np ? user.id : null);
    if (!ok) { addToast('Vastpinnen mislukt', 'error'); return; }
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: np, pinned_by: np ? user.id : null } : m));
    addToast(np ? 'Vastgepind' : 'Pin verwijderd', 'info');
  }

  function handleDeleteMessage(msg: any) {
    if (!user || (msg.sender_id !== user.id && !isAdmin)) return;
    setConfirmDialog({
      title: 'Bericht verwijderen', description: 'Dit bericht verwijderen?',
      onConfirm: async () => {
        const prev = messages;
        setMessages(p => p.filter(m => m.id !== msg.id)); // optimistic
        const ok = await deleteBandMessage(msg.id, msg.attachment_url);
        if (!ok) {
          setMessages(prev); // rollback
          addToast('Verwijderen mislukt', 'error');
          return;
        }
        if (id && user) getChannelPreviews(id, user.id).then(setChannelPreviews);
      },
    });
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
  async function startEditEvent(ev: BandEvent) {
    setEditingEventId(ev.id);
    setEventModalTab('general');
    setEventForm({
      title: ev.title, type: ev.type, date: ev.event_date,
      time: ev.event_time ? ev.event_time.slice(0, 5) : '', endTime: ev.end_time ? ev.end_time.slice(0, 5) : '',
      description: ev.description || '', autoPost: false,
      location: ev.location || '', address: ev.address || '', mapsLink: ev.maps_link || '',
      gage: ev.gage != null ? String(ev.gage) : '', travelCost: ev.travel_cost != null ? String(ev.travel_cost) : '',
      otherCosts: ev.other_costs != null ? String(ev.other_costs) : '',
      isPaid: ev.is_paid, invoiceSent: ev.invoice_sent, agreements: ev.agreements || '',
    });
    setProfitSplitModeLocal(ev.profit_split_mode ?? 'equal');
    setSeriesEditScope('this');

    const isRoot = !ev.parent_event_id && !!ev.recurrence_freq && ev.recurrence_freq !== 'none';
    if (ev.parent_event_id) {
      setEditingIsSeries(true);
      const { data: root } = await supabase.from('band_events')
        .select('recurrence_freq, recurrence_interval, recurrence_days_of_week, recurrence_until, recurrence_count')
        .eq('id', ev.parent_event_id).single();
      setEditingRecurrenceInfo(root ? {
        freq: (root.recurrence_freq as RecurrenceFreq) ?? 'none', interval: root.recurrence_interval ?? 1,
        daysOfWeek: root.recurrence_days_of_week ?? null, until: root.recurrence_until ?? null, count: root.recurrence_count ?? null,
      } : null);
    } else if (isRoot) {
      setEditingIsSeries(true);
      setEditingRecurrenceInfo({
        freq: ev.recurrence_freq as RecurrenceFreq, interval: ev.recurrence_interval ?? 1,
        daysOfWeek: ev.recurrence_days_of_week ?? null, until: ev.recurrence_until ?? null, count: ev.recurrence_count ?? null,
      });
    } else {
      setEditingIsSeries(false);
      setEditingRecurrenceInfo(null);
    }

    setShowAddEvent(true);
    const [contacts, splits] = await Promise.all([getEventContacts(ev.id), getProfitSplits(ev.id)]);
    setEventContacts(contacts.map(c => ({ id: c.id, name: c.name, role: c.role || '', phone: c.phone || '', email: c.email || '' })));
    setManualSplits(Object.fromEntries(splits.map(s => [s.user_id, String(s.amount)])));
  }

  // Delete-then-reinsert is simpler and safe here: contact rows have no
  // identity meaning elsewhere (no FKs point at band_event_contacts.id).
  async function syncEventContacts(eventId: string, contacts: EventContactDraft[]) {
    const existing = await getEventContacts(eventId);
    await Promise.all(existing.map(c => deleteEventContact(c.id)));
    await Promise.all(
      contacts.filter(c => c.name.trim()).map(c => addEventContact(eventId, {
        name: c.name.trim(), role: c.role.trim() || null, phone: c.phone.trim() || null, email: c.email.trim() || null,
      })),
    );
  }

  function eventFormToPatch() {
    return {
      title: eventForm.title.trim(), description: eventForm.description.trim() || null,
      event_date: eventForm.date, event_time: eventForm.time || null, end_time: eventForm.endTime || null,
      type: eventForm.type,
      location: eventForm.location.trim() || null, address: eventForm.address.trim() || null,
      maps_link: eventForm.mapsLink.trim() || null,
      gage: eventForm.gage.trim() ? parseFloat(eventForm.gage) : null,
      travel_cost: eventForm.travelCost.trim() ? parseFloat(eventForm.travelCost) : null,
      other_costs: eventForm.otherCosts.trim() ? parseFloat(eventForm.otherCosts) : null,
      is_paid: eventForm.isPaid, invoice_sent: eventForm.invoiceSent,
      agreements: eventForm.agreements.trim() || null,
      profit_split_mode: profitSplitMode,
    };
  }

  // profit_split_mode itself travels with the regular event patch
  // (eventFormToPatch) — this only syncs the manual per-member amounts.
  async function syncProfitSplits(eventId: string) {
    if (profitSplitMode === 'manual') {
      const splits = members.map((m: any) => ({ userId: m.user_id, amount: parseFloat(manualSplits[m.user_id] ?? '') || 0 }));
      await saveProfitSplits(eventId, splits);
    } else {
      await saveProfitSplits(eventId, []);
    }
  }

  function resetEventForm() {
    setEventForm(EMPTY_EVENT_FORM); setEventContacts([]);
    setProfitSplitModeLocal('equal'); setManualSplits({});
    setRecurrenceForm({ freq: 'none', interval: 1, daysOfWeek: [], endCondition: 'never', until: '', count: 10 });
    setEditingIsSeries(false); setEditingRecurrenceInfo(null); setSeriesEditScope('this');
  }

  async function handleAddEvent() {
    if (!eventForm.title.trim() || !eventForm.date || !user || !id) return;
    setSavingEvent(true);
    const typeInfo = EVENT_TYPES.find(t => t.value === eventForm.type)!;
    const patch = eventFormToPatch();

    if (editingEventId) {
      const ok = editingIsSeries
        ? await updateEventSeries(editingEventId, patch, seriesEditScope)
        : await updateBandEvent(editingEventId, patch);
      await Promise.all([syncEventContacts(editingEventId, eventContacts), syncProfitSplits(editingEventId)]);
      setSavingEvent(false);
      if (!ok) { addToast('Bijwerken mislukt', 'error'); return; }

      if (editingIsSeries && seriesEditScope !== 'this') {
        // Bulk edits touch more rows than can be cheaply patched locally.
        const [refreshed, upcoming] = await Promise.all([
          getBandEvents(id, calYear, calMonth + 1), getUpcomingEvents(id, 5),
        ]);
        setBandEvents(refreshed); setUpcomingEvents(upcoming);
      } else {
        const localPatch = { ...patch, profit_split_mode: profitSplitMode };
        setBandEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, ...localPatch } : e).sort((a, b) => a.event_date.localeCompare(b.event_date)));
        setUpcomingEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, ...localPatch } : e).sort((a, b) => a.event_date.localeCompare(b.event_date)));
      }
      addToast('Evenement bijgewerkt!', 'success');
      setEditingEventId(null);
      resetEventForm();
      setShowAddEvent(false);
      return;
    }

    if (recurrenceForm.freq !== 'none') {
      const rule: RecurrenceRule = {
        freq: recurrenceForm.freq, interval: recurrenceForm.interval,
        daysOfWeek: recurrenceForm.freq === 'weekly' && recurrenceForm.daysOfWeek.length > 0 ? recurrenceForm.daysOfWeek : null,
        until: recurrenceForm.endCondition === 'until' && recurrenceForm.until ? recurrenceForm.until : null,
        count: recurrenceForm.endCondition === 'count' ? recurrenceForm.count : null,
      };
      const created = await createRecurringBandEvent({ band_id: id, ...patch, channel: typeInfo.channel, created_by: user.id, is_pinned: false }, rule);
      if (!created || created.length === 0) { addToast('Aanmaken mislukt', 'error'); setSavingEvent(false); return; }
      if (eventContacts.some(c => c.name.trim())) await syncEventContacts(created[0].id, eventContacts);
      if (profitSplitMode === 'manual') await syncProfitSplits(created[0].id);
      if (eventForm.autoPost && typeInfo.channel) {
        await supabase.from('band_messages').insert({ band_id: id, channel: typeInfo.channel, sender_id: user.id, content: `📅 Nieuwe reeks: ${eventForm.title.trim()} — ${describeRecurrence(rule)}` });
      }
      const [refreshed, upcoming] = await Promise.all([getBandEvents(id, calYear, calMonth + 1), getUpcomingEvents(id, 5)]);
      setBandEvents(refreshed); setUpcomingEvents(upcoming);
      addToast(`${created.length} evenementen aangemaakt!`, 'success');
      resetEventForm();
      setShowAddEvent(false); setSavingEvent(false);
      return;
    }

    const event = await createBandEvent({ band_id: id, ...patch, channel: typeInfo.channel, created_by: user.id, is_pinned: false });
    if (!event) { addToast('Aanmaken mislukt', 'error'); setSavingEvent(false); return; }
    if (eventContacts.some(c => c.name.trim())) await syncEventContacts(event.id, eventContacts);
    if (profitSplitMode === 'manual') await syncProfitSplits(event.id);
    if (eventForm.autoPost && typeInfo.channel) {
      await supabase.from('band_messages').insert({ band_id: id, channel: typeInfo.channel, sender_id: user.id, content: `📅 Nieuw evenement: ${eventForm.title.trim()} — ${formatEventDate(eventForm.date)}${eventForm.time ? ` om ${eventForm.time.slice(0, 5)}` : ''}${eventForm.description ? `\n${eventForm.description.trim()}` : ''}` });
    }
    setBandEvents(prev => [...prev, event].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    setUpcomingEvents(prev => [...prev, event].filter(e => e.event_date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 5));
    addToast('Evenement aangemaakt!', 'success');
    resetEventForm();
    setShowAddEvent(false); setSavingEvent(false);
  }

  async function handleDeleteEvent(eventId: string) {
    const ok = await deleteBandEvent(eventId);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
    setBandEvents(prev => prev.filter(e => e.id !== eventId));
    setUpcomingEvents(prev => prev.filter(e => e.id !== eventId));
  }

  function handleDeleteSeries(eventId: string) {
    if (!id) return;
    setConfirmDialog({
      title: 'Reeks verwijderen', description: 'Weet je zeker dat je de hele reeks wilt verwijderen? Alle evenementen in deze reeks gaan verloren.',
      onConfirm: async () => {
        setDeletingSeriesId(eventId);
        const ok = await deleteEventSeries(eventId);
        setDeletingSeriesId(null);
        if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
        const [refreshed, upcoming] = await Promise.all([getBandEvents(id, calYear, calMonth + 1), getUpcomingEvents(id, 5)]);
        setBandEvents(refreshed); setUpcomingEvents(upcoming);
        addToast('Reeks verwijderd', 'info');
      },
    });
  }

  async function handleToggleSkip(ev: BandEvent) {
    setSkippingId(ev.id);
    const ok = ev.is_cancelled ? await unskipOccurrence(ev.id) : await skipOccurrence(ev.id);
    setSkippingId(null);
    if (!ok) { addToast('Actie mislukt', 'error'); return; }
    setBandEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_cancelled: !e.is_cancelled } : e));
    addToast(ev.is_cancelled ? 'Evenement teruggezet' : 'Evenement overgeslagen', 'info');
  }

  async function handleSetRsvp(eventId: string, status: RsvpStatus) {
    if (!user) return;
    const ok = await setRsvp(eventId, user.id, status);
    if (!ok) { addToast('RSVP opslaan mislukt', 'error'); return; }
    setEventRsvps(prev => {
      const rest = (prev[eventId] ?? []).filter(r => r.user_id !== user.id);
      return { ...prev, [eventId]: [...rest, { event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() }] };
    });
  }

  // ── Handlers: project tiles ──────────────────────────────────────────────
  function openProject(projectId: string) {
    setActiveProjectId(projectId); setActiveView('project'); setProjectTab('chat'); setShowMobileSidebar(false);
  }

  function startCreateProject() {
    setEditingProjectId(null); setProjectForm({ name: '', description: '' }); setShowProjectModal(true);
  }

  function startEditProject(project: BandProject) {
    setEditingProjectId(project.id);
    setProjectForm({ name: project.name, description: project.description || '' });
    setShowProjectModal(true);
  }

  async function handleSaveProject() {
    if (!projectForm.name.trim() || !user || !id) return;
    setSavingProject(true);
    if (editingProjectId) {
      const ok = await updateBandProject(editingProjectId, { name: projectForm.name.trim(), description: projectForm.description.trim() || null });
      if (!ok) { addToast('Bijwerken mislukt', 'error'); setSavingProject(false); return; }
      setProjects(prev => prev.map(p => p.id === editingProjectId ? { ...p, name: projectForm.name.trim(), description: projectForm.description.trim() || null } : p));
    } else {
      const project = await createBandProject(id, user.id, projectForm.name.trim(), projectForm.description.trim() || undefined);
      if (!project) { addToast('Aanmaken mislukt', 'error'); setSavingProject(false); return; }
      setProjects(prev => [...prev, project]);
    }
    setSavingProject(false); setShowProjectModal(false); setEditingProjectId(null);
  }

  function handleDeleteProject(projectId: string) {
    setConfirmDialog({
      title: 'Project verwijderen', description: 'Dit project en alle chat, taken, doelen en ideeën erin verwijderen?',
      onConfirm: async () => {
        const ok = await deleteBandProject(projectId);
        if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (activeProjectId === projectId) { setActiveProjectId(null); setActiveView('projects'); }
      },
    });
  }

  // ── Handlers: assignments ────────────────────────────────────────────────
  async function handleCreateAssignment() {
    if (!newAssignment.content.trim() || !user || !activeProjectId) return;
    setAddingAssignment(true);
    const created = await createProjectAssignment(
      activeProjectId, user.id, newAssignment.content.trim(),
      newAssignment.assigneeId || null, newAssignment.dueDate || null,
    );
    if (created) { setAssignments(prev => [...prev, created]); setNewAssignment({ content: '', assigneeId: '', dueDate: '' }); }
    else addToast('Aanmaken mislukt', 'error');
    setAddingAssignment(false);
  }

  async function handleToggleAssignment(a: BandProjectAssignment) {
    if (!user) return;
    const updated = !a.completed;
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, completed: updated } : x));
    const ok = await toggleProjectAssignment(a.id, updated, user.id);
    if (!ok) setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, completed: a.completed } : x));
  }

  async function handlePinAssignment(a: BandProjectAssignment) {
    const next = !a.is_pinned;
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, is_pinned: next } : x));
    const ok = await pinProjectAssignment(a.id, next);
    if (!ok) setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, is_pinned: a.is_pinned } : x));
  }

  async function handleDeleteAssignment(assignmentId: string) {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    const ok = await deleteProjectAssignment(assignmentId);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); if (activeProjectId) getProjectAssignments(activeProjectId).then(setAssignments); }
  }

  function startEditAssignment(a: BandProjectAssignment) {
    setEditingAssignmentId(a.id); setEditingAssignmentText(a.content);
  }

  async function handleSaveAssignmentEdit(assignmentId: string) {
    const content = editingAssignmentText.trim();
    if (!content) return;
    const ok = await updateProjectAssignment(assignmentId, { content });
    if (!ok) { addToast('Bijwerken mislukt', 'error'); return; }
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, content } : a));
    setEditingAssignmentId(null);
  }

  // ── Handlers: goals ───────────────────────────────────────────────────────
  async function handleCreateGoal() {
    if (!newGoal.content.trim() || !user || !activeProjectId) return;
    setAddingGoal(true);
    const created = await createProjectGoal(activeProjectId, user.id, newGoal.content.trim(), newGoal.dueDate || null);
    if (created) { setGoals(prev => [...prev, created]); setNewGoal({ content: '', dueDate: '' }); }
    else addToast('Aanmaken mislukt', 'error');
    setAddingGoal(false);
  }

  async function handleToggleGoal(g: BandProjectGoal) {
    if (!user) return;
    const updated = !g.completed;
    setGoals(prev => prev.map(x => x.id === g.id ? { ...x, completed: updated } : x));
    const ok = await toggleProjectGoal(g.id, updated, user.id);
    if (!ok) setGoals(prev => prev.map(x => x.id === g.id ? { ...x, completed: g.completed } : x));
  }

  async function handleDeleteGoal(goalId: string) {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    const ok = await deleteProjectGoal(goalId);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); if (activeProjectId) getProjectGoals(activeProjectId).then(setGoals); }
  }

  function startEditGoal(g: BandProjectGoal) {
    setEditingGoalId(g.id); setEditingGoalText(g.content);
  }

  async function handleSaveGoalEdit(goalId: string) {
    const content = editingGoalText.trim();
    if (!content) return;
    const ok = await updateProjectGoal(goalId, { content });
    if (!ok) { addToast('Bijwerken mislukt', 'error'); return; }
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, content } : g));
    setEditingGoalId(null);
  }

  // ── Handlers: ideas ───────────────────────────────────────────────────────
  async function handleCreateIdea() {
    if (!newIdea.trim() || !user || !activeProjectId) return;
    setAddingIdea(true);
    const created = await createProjectIdea(activeProjectId, user.id, newIdea.trim());
    if (created) { setIdeas(prev => [created, ...prev]); setNewIdea(''); }
    else addToast('Aanmaken mislukt', 'error');
    setAddingIdea(false);
  }

  async function handlePinIdea(idea: BandProjectIdea) {
    const next = !idea.is_pinned;
    setIdeas(prev => prev.map(x => x.id === idea.id ? { ...x, is_pinned: next } : x));
    const ok = await pinProjectIdea(idea.id, next);
    if (!ok) setIdeas(prev => prev.map(x => x.id === idea.id ? { ...x, is_pinned: idea.is_pinned } : x));
  }

  async function handleDeleteIdea(ideaId: string) {
    setIdeas(prev => prev.filter(i => i.id !== ideaId));
    const ok = await deleteProjectIdea(ideaId);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); if (activeProjectId) getProjectIdeas(activeProjectId).then(setIdeas); }
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
  // Each invite now has its own single-use, expiring token (see band_invites) —
  // there is no more one static per-band link, so "share" just opens the
  // invite modal where a specific invite's link can be copied.
  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/bandspace/join/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedInviteId(token);
      setTimeout(() => setCopiedInviteId(null), 2000);
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
    const { error } = await supabase.from('band_members').delete().eq('band_id', id).eq('user_id', user.id);
    if (error) { addToast('Intrekken mislukt', 'error'); return; }
    setIsPending(false); addToast('Aanvraag ingetrokken', 'info');
  }
  async function handleLeave() {
    if (!user || !id) return; setLeaving(true);
    const { ok, error } = await leaveBand(id);
    setLeaving(false);
    if (!ok) { addToast(describeBandError(error, 'Band verlaten mislukt'), 'error'); return; }
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
    const { ok, error } = await removeBandMember(memberId);
    if (!ok) { addToast(describeBandError(error, 'Verwijderen mislukt'), 'error'); return; }
    setMembers(prev => prev.filter(m => m.id !== memberId));
    addToast(`${profile?.display_name || profile?.username} verwijderd`, 'info');
  }

  async function handlePromote(memberId: string, profile: any) {
    const { ok, error } = await promoteToAdmin(memberId);
    if (!ok) { addToast(describeBandError(error, 'Promoveren mislukt'), 'error'); return; }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'admin' } : m));
    addToast(`${profile?.display_name || profile?.username} is nu admin`, 'success');
  }

  async function handleDemote(memberId: string, profile: any) {
    const { ok, error } = await demoteToMember(memberId);
    if (!ok) { addToast(describeBandError(error, 'Degraderen mislukt'), 'error'); return; }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'member' } : m));
    addToast(`${profile?.display_name || profile?.username} is nu lid`, 'info');
  }

  function handleTransferOwnership(memberId: string, targetUserId: string, profile: any) {
    if (!id) return;
    const name = profile?.display_name || profile?.username || 'dit lid';
    setConfirmDialog({
      title: 'Eigenaarschap overdragen', description: `Weet je zeker dat je het eigenaarschap wilt overdragen aan ${name}? Jij wordt daarna admin.`,
      confirmLabel: 'Overdragen', destructive: false,
      onConfirm: async () => {
        setTransferringId(memberId);
        const { ok, error } = await transferBandOwnership(id, targetUserId);
        setTransferringId(null);
        if (!ok) { addToast(describeBandError(error, 'Overdragen mislukt'), 'error'); return; }
        setMembers(prev => prev.map(m => {
          if (m.id === memberId) return { ...m, role: 'owner' };
          if (m.user_id === user?.id) return { ...m, role: 'admin' };
          return m;
        }));
        setMyRole('admin'); setIsOwner(false); setIsAdmin(true);
        addToast(`${name} is nu eigenaar`, 'success');
      },
    });
  }

  function handleDeleteBand() {
    if (!id) return;
    setConfirmDialog({
      title: 'Band verwijderen',
      description: `Weet je zeker dat je "${band?.name}" wilt verwijderen? Dit kan niet ongedaan gemaakt worden — alle berichten, evenementen en projecten gaan verloren.`,
      onConfirm: async () => {
        setDeletingBand(true);
        const { ok, error } = await deleteBand(id);
        setDeletingBand(false);
        if (!ok) { addToast(describeBandError(error, 'Verwijderen mislukt'), 'error'); return; }
        addToast('Band verwijderd', 'info'); navigate('/bandspace');
      },
    });
  }

  function icsFeedUrl(token: string) {
    const base = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    return `${base}/functions/v1/ics-feed?token=${token}`;
  }

  function handleCopyFeedLink() {
    if (!band?.calendar_feed_token) return;
    navigator.clipboard.writeText(icsFeedUrl(band.calendar_feed_token)).then(() => {
      setCopiedFeedLink(true);
      setTimeout(() => setCopiedFeedLink(false), 2000);
    });
  }

  function handleRegenerateFeedToken() {
    if (!id) return;
    setConfirmDialog({
      title: 'Agenda-link vernieuwen', description: 'Nieuwe agenda-link genereren? Bestaande abonnementen (Google/Outlook/Apple) stoppen dan met updaten.',
      confirmLabel: 'Vernieuwen', destructive: false,
      onConfirm: async () => {
        setRegeneratingFeedToken(true);
        const token = await regenerateCalendarFeedToken(id);
        setRegeneratingFeedToken(false);
        if (!token) { addToast('Vernieuwen mislukt', 'error'); return; }
        setBand((b: any) => b ? { ...b, calendar_feed_token: token } : b);
        addToast('Nieuwe agenda-link gegenereerd', 'success');
      },
    });
  }

  // ── Handlers: invites ─────────────────────────────────────────────────────
  async function handleAddExistingUser(candidate: InviteCandidate) {
    if (!id) return;
    setAddingUserId(candidate.id);
    const { ok, error } = await addBandMemberDirect(id, candidate.id, inviteRole);
    setAddingUserId(null);
    if (!ok) { addToast(describeBandError(error, 'Toevoegen mislukt'), 'error'); return; }
    addToast(`${candidate.display_name || candidate.username} toegevoegd`, 'success');
    setInviteQuery(''); setInviteResults([]);
    const { data } = await supabase.from('band_members')
      .select('*, profile:profiles(id,username,display_name,avatar_url)')
      .eq('band_id', id).eq('status', 'active');
    setMembers(data ?? []);
  }

  async function handleSendInvite() {
    if (!id || !inviteEmail.trim()) return;
    setSendingInvite(true);
    const { ok, data, error } = await createBandInvite(id, inviteEmail.trim(), inviteName.trim(), inviteRole);
    setSendingInvite(false);
    if (!ok) { addToast(describeBandError(error, 'Uitnodigen mislukt'), 'error'); return; }
    addToast(`Uitnodiging verstuurd naar ${inviteEmail.trim()}`, 'success');
    setInviteName(''); setInviteEmail('');
    if (data) setPendingInvites(prev => [data, ...prev.filter(i => i.id !== data.id)]);
  }

  async function handleRevokeInvite(inviteId: string) {
    setRevokingInviteId(inviteId);
    const { ok, error } = await revokeBandInvite(inviteId);
    setRevokingInviteId(null);
    if (!ok) { addToast(describeBandError(error, 'Intrekken mislukt'), 'error'); return; }
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    addToast('Uitnodiging ingetrokken', 'info');
  }

  // ── Handlers: band images ────────────────────────────────────────────────
  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setCoverUploading(true);
    try {
      const url = await uploadBandCover(file, id);
      setBand((b: any) => b ? { ...b, cover_url: url } : b);
    } catch {
      addToast('Coverfoto uploaden mislukt', 'error');
    } finally {
      setCoverUploading(false);
      e.target.value = '';
    }
  }
  async function handleBandAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setAvatarUploading(true);
    try {
      const url = await uploadBandAvatar(file, id);
      setBand((b: any) => b ? { ...b, image_url: url } : b);
    } catch {
      addToast('Bandfoto uploaden mislukt', 'error');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  // ── Load pending invites when the share modal opens (owner/admin only) ────
  useEffect(() => {
    if (!showShareModal || !isAdmin || !id) return;
    setLoadingInvites(true);
    listBandInvites(id).then(invites => {
      setPendingInvites(invites.filter(i => i.status === 'pending'));
      setLoadingInvites(false);
    });
  }, [showShareModal, isAdmin, id]);

  // ── Debounced existing-user search for the invite modal ───────────────────
  useEffect(() => {
    if (inviteQuery.trim().length < 2) { setInviteResults([]); return; }
    setSearchingInvite(true);
    const memberIds = new Set(members.map((m: any) => m.user_id));
    const t = setTimeout(async () => {
      const results = await searchProfilesForInvite(inviteQuery.trim());
      setInviteResults(results.filter(r => !memberIds.has(r.id)));
      setSearchingInvite(false);
    }, 350);
    return () => clearTimeout(t);
  }, [inviteQuery, members]);

  // ── RSVPs for the currently-loaded month of events ─────────────────────────
  useEffect(() => {
    const missing = bandEvents.filter(ev => !(ev.id in eventRsvps));
    if (missing.length === 0) return;
    Promise.all(missing.map(ev => getRsvps(ev.id).then(rsvps => [ev.id, rsvps] as const))).then(pairs => {
      setEventRsvps(prev => {
        const next = { ...prev };
        pairs.forEach(([eventId, rsvps]) => { next[eventId] = rsvps; });
        return next;
      });
    });
  }, [bandEvents, eventRsvps]);

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
    const active = (activeView === view || (view === 'projects' && activeView === 'project')) && view !== 'channel';
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
          <NavItem view="projects" icon={FolderKanban} label="Projecten" />
          <NavItem view="riders" icon={FileIcon} label="Riders" />

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
            {isMember && (
              <button onClick={handleLeave} disabled={leaving} title="Verlaten" className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile header bar (shown instead of sidebar on mobile) — sits below the main navbar, whose real
          height (incl. iOS safe-area inset) is published as --navbar-h so this never sits under the notch.
          The back chevron only leaves the band from Home — from any other screen it steps back to Home
          within the same band, and the title reflects the current screen, so mobile users always know
          where they are instead of getting bounced out of the workspace. */}
      <div className="lg:hidden fixed top-[var(--navbar-h,4rem)] left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-white/8" style={{ background: '#131020f0' }}>
        {activeView === 'home' ? (
          <Link to="/bandspace" className="text-slate-400 hover:text-white shrink-0"><ChevronLeft size={18} /></Link>
        ) : (
          <button onClick={() => { setActiveView('home'); setActiveProjectId(null); }} className="text-slate-400 hover:text-white shrink-0">
            <ChevronLeft size={18} />
          </button>
        )}
        <span className="text-sm font-semibold text-white truncate flex-1">
          {activeView === 'home' ? band.name
            : activeView === 'calendar' ? 'Kalender'
            : activeView === 'projects' ? 'Projecten'
            : activeView === 'project' ? (activeProject?.name ?? 'Project')
            : activeView === 'riders' ? 'Riders'
            : activeCh.label}
        </span>
        <button onClick={() => setShowShareModal(true)} className="p-1.5 text-slate-400 hover:text-violet-400 transition-colors"><Share2 size={16} /></button>
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
            <div className={`relative overflow-hidden group ${isAdmin ? 'cursor-pointer' : ''}`} style={{ minHeight: 220 }} onClick={() => isAdmin && coverInputRef.current?.click()}>
              <img
                src={band.cover_url || coverPlaceholder(String(band.id ?? band.name))}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = coverPlaceholder(String(band.id ?? band.name)); }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c1a] via-[#0f0c1a]/40 to-transparent" />
              {isAdmin && (
                <>
                  <div className={`absolute inset-0 flex items-center justify-center transition-colors ${coverUploading ? 'bg-black/60' : 'bg-black/0 group-hover:bg-black/40'}`}>
                    <div className={`flex items-center gap-2 text-white text-sm font-medium transition-opacity ${coverUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {coverUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      {coverUploading ? 'Uploaden...' : 'Coverfoto wijzigen'}
                    </div>
                  </div>
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} onClick={e => e.stopPropagation()} />
                </>
              )}
              <div className="relative px-6 lg:px-10 pt-10 pb-8 flex flex-col lg:flex-row lg:items-end gap-5">
                <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm shrink-0 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <img
                    src={band.image_url || avatarPlaceholder(band.name)}
                    alt={band.name}
                    className={`w-full h-full object-cover transition-opacity ${avatarUploading ? 'opacity-50' : ''}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarPlaceholder(band.name); }}
                  />
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => bandAvatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="absolute bottom-1 right-1 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center border-2 border-[#1a1528] hover:bg-violet-500 transition-colors disabled:opacity-60"
                      >
                        {avatarUploading ? <Loader2 size={10} className="text-white animate-spin" /> : <Camera size={11} className="text-white" />}
                      </button>
                      <input ref={bandAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleBandAvatarChange} />
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 min-w-0">
                    <h1 className="text-2xl lg:text-3xl font-bold text-white min-w-0 break-words">{band.name}</h1>
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
              {isMember && <BandPushBanner userId={user?.id} />}
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

                  {/* Projecten tile */}
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FolderKanban size={13} className="text-indigo-400" />
                        <h3 className="text-sm font-semibold text-white">Projecten</h3>
                      </div>
                      <button onClick={() => setActiveView('projects')} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">Alles →</button>
                    </div>
                    {projectsLoading ? (
                      <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-violet-400/50" /></div>
                    ) : projects.length === 0 ? (
                      <p className="text-xs text-slate-600 py-1">Nog geen projecten.</p>
                    ) : (
                      <div className="space-y-2">
                        {projects.slice(0, 4).map(project => (
                          <button key={project.id} onClick={() => openProject(project.id)}
                            className="flex items-start gap-2.5 w-full text-left hover:bg-white/4 rounded-lg -mx-1 px-1 py-0.5 transition-colors">
                            <FolderKanban size={13} className="mt-0.5 shrink-0 text-indigo-400/70" />
                            <p className="text-xs text-slate-300 leading-relaxed truncate">{project.name}</p>
                          </button>
                        ))}
                        {projects.length > 4 && (
                          <p className="text-[11px] text-slate-600 pt-0.5">+{projects.length - 4} meer</p>
                        )}
                      </div>
                    )}
                    {isMember && (
                      <button onClick={startCreateProject}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors mt-3 pt-3 border-t border-white/8 w-full">
                        <Plus size={12} /> Project toevoegen
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
                      const isSeries = !!(ev.parent_event_id || (ev.recurrence_freq && ev.recurrence_freq !== 'none'));
                      return (
                        <div key={ev.id} className={`flex items-start gap-4 bg-white/4 border border-white/8 rounded-xl px-5 py-4 group ${ev.is_cancelled ? 'opacity-50' : ''}`}>
                          <span className={`w-3 h-3 rounded-full mt-1 shrink-0 ${t.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-white flex items-center gap-1.5 ${ev.is_cancelled ? 'line-through' : ''}`}>
                              {ev.title}
                              {isSeries && <Repeat size={11} className="text-slate-500 shrink-0" />}
                              {ev.is_cancelled && <span className="text-[10px] font-normal text-slate-500 lowercase">(overgeslagen)</span>}
                            </p>
                            <p className={`text-sm ${t.color} mt-0.5`}>
                              {t.label}{ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : ''}{ev.end_time ? `–${ev.end_time.slice(0, 5)}` : ''}
                            </p>
                            {ev.location && <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={11} /> {ev.location}</p>}
                            {ev.description && <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{ev.description}</p>}
                            {isMember && ev.gage != null && (
                              <p className="text-xs text-emerald-400/80 mt-1.5">
                                Elk lid ontvangt ongeveer {formatEuro(calculateEventProfit(ev, members.length).perMemberEqual)}
                              </p>
                            )}
                            {isMember && !ev.is_cancelled && (
                              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                                {RSVP_OPTIONS.map(opt => {
                                  const mine = eventRsvps[ev.id]?.find(r => r.user_id === user?.id)?.status === opt.value;
                                  return (
                                    <button key={opt.value} onClick={() => handleSetRsvp(ev.id, opt.value)}
                                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all ${mine ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
                                      {opt.label}
                                    </button>
                                  );
                                })}
                                {(eventRsvps[ev.id]?.filter(r => r.status === 'yes').length ?? 0) > 0 && (
                                  <div className="flex -space-x-1.5 ml-1">
                                    {eventRsvps[ev.id]!.filter(r => r.status === 'yes').slice(0, 4).map(r => (
                                      <UserAvatar key={r.user_id} src={r.profile?.avatar_url} name={r.profile?.display_name || r.profile?.username} size={18} className="ring-2 ring-[#171328]" />
                                    ))}
                                  </div>
                                )}
                                <button onClick={() => downloadIcsFile(ev)} title="Downloaden als .ics" className="ml-auto p-1 text-slate-600 hover:text-violet-400 transition-colors">
                                  <Download size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                              {isSeries && (
                                <button onClick={() => handleToggleSkip(ev)} disabled={skippingId === ev.id} title={ev.is_cancelled ? 'Terugzetten' : 'Overslaan'}
                                  className="p-1 text-slate-600 hover:text-amber-400 transition-colors disabled:opacity-50">
                                  {skippingId === ev.id ? <Loader2 size={13} className="animate-spin" /> : ev.is_cancelled ? <RotateCcw size={13} /> : <CalendarX size={13} />}
                                </button>
                              )}
                              <button onClick={() => handlePinEvent(ev)} title={ev.is_pinned ? 'Losmaken' : 'Vastpinnen'}
                                className={`p-1 transition-colors ${ev.is_pinned ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
                                <Pin size={13} />
                              </button>
                              <button onClick={() => startEditEvent(ev)} title="Bewerken" className="p-1 text-slate-600 hover:text-white transition-colors"><Pencil size={13} /></button>
                              <button onClick={() => handleDeleteEvent(ev.id)} title="Verwijderen" className="p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
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

        {/* ── RIDERS VIEW ──────────────────────────────────────────────────────── */}
        {activeView === 'riders' && (
          <BandRidersPanel bandId={band.id} isAdmin={isAdmin} userId={user?.id} />
        )}

        {/* ── PROJECTS VIEW (grid of tiles) ───────────────────────────────────── */}
        {activeView === 'projects' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
              <div className="flex items-center justify-between mb-6 gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><FolderKanban size={20} className="text-indigo-400" /> Projecten</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{band.name} · chat, taken, doelen en ideeën per project</p>
                </div>
                {isMember && (
                  <button onClick={startCreateProject}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shrink-0">
                    <Plus size={15} /> Nieuw project
                  </button>
                )}
              </div>

              {projectsLoading ? (
                <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
              ) : projects.length === 0 ? (
                <div className="text-center py-16 text-slate-600">
                  <FolderKanban size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nog geen projecten. Maak het eerste project aan!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(project => (
                    <div key={project.id} className="flex flex-col gap-3 p-5 rounded-2xl border bg-white/[0.03] border-white/10 hover:border-white/20 transition-all group">
                      <button onClick={() => openProject(project.id)} className="text-left flex-1">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center mb-3">
                          <FolderKanban size={18} className="text-indigo-400" />
                        </div>
                        <p className="font-semibold text-white leading-tight">{project.name}</p>
                        {project.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.description}</p>}
                      </button>
                      <div className="flex items-center justify-between pt-2 border-t border-white/8">
                        <p className="text-[11px] text-slate-600 truncate">{project.creator?.display_name || project.creator?.username}</p>
                        {(isAdmin || project.created_by === user?.id) && (
                          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                            <button onClick={() => startEditProject(project)} className="text-slate-600 hover:text-white p-0.5"><Pencil size={13} /></button>
                            <button onClick={() => handleDeleteProject(project.id)} className="text-slate-600 hover:text-red-400 p-0.5"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROJECT VIEW (single tile: chat / assignments / goals / ideas) ─── */}
        {activeView === 'project' && activeProject && (
          <div className="flex-1 flex flex-col overflow-hidden" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

            {/* Project header */}
            <div className="flex items-center gap-3 px-5 lg:px-6 py-3.5 border-b border-white/8 shrink-0 bg-[#16132650]">
              <button onClick={() => { setActiveView('projects'); setActiveProjectId(null); }} className="text-slate-400 hover:text-white shrink-0 p-0.5">
                <ChevronLeft size={16} />
              </button>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-indigo-500/20">
                <FolderKanban size={15} className="text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-white text-sm truncate">{activeProject.name}</h2>
                <p className="text-[11px] text-slate-500 truncate">Project · {band.name}</p>
              </div>
              {(isAdmin || activeProject.created_by === user?.id) && (
                <button onClick={() => startEditProject(activeProject)} className="text-slate-500 hover:text-white p-1 shrink-0"><Pencil size={13} /></button>
              )}
              <div className="flex-1" />
              {projectTab === 'chat' && pinnedMessages.length > 0 && (
                <button onClick={() => setShowPinned(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${showPinned ? 'bg-violet-600/20 border-violet-500/30 text-violet-300' : 'border-white/8 text-slate-500 hover:text-violet-300'}`}>
                  <Pin size={11} />{pinnedMessages.length}<ChevronDown size={11} className={`transition-transform ${showPinned ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Sub-tab bar */}
            <div className="flex items-center gap-1 px-5 lg:px-6 py-2 border-b border-white/8 shrink-0 overflow-x-auto">
              {([
                { key: 'chat' as const,        label: 'Chat',       icon: MessageSquare },
                { key: 'assignments' as const, label: 'Taken',      icon: CheckSquare },
                { key: 'goals' as const,       label: 'Doelen',     icon: Target },
                { key: 'ideas' as const,       label: 'Ideeën',     icon: Lightbulb },
              ]).map(tab => {
                const Icon = tab.icon;
                const active = projectTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setProjectTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${active ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    <Icon size={12} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Pinned bar (chat only) */}
            {projectTab === 'chat' && pinnedMessages.length > 0 && showPinned && (
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
            {projectTab === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="max-w-3xl mx-auto px-4 lg:px-6 py-5 space-y-1">
                    {msgLoading ? (
                      <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center"><MessageSquare size={28} className="text-indigo-400" /></div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white">{activeProject.name}</p>
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
                                  <div className={`flex items-center gap-2 mb-1.5 px-1 min-w-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-[13px] font-semibold text-slate-300 truncate">{msg.sender?.display_name || msg.sender?.username}</span>
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
                        className="p-1 rounded-lg transition-colors shrink-0 mb-0.5 text-slate-500 hover:text-slate-300 hover:bg-white/8">
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                      </button>
                      <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                        placeholder={`Bericht in ${activeProject.name}… (@ om te taggen)`}
                        rows={1} className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none resize-none py-0.5"
                        style={{ minHeight: '22px', maxHeight: '120px' }} />
                      <button onClick={handleSend} disabled={!input.trim() || sending || uploading}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${input.trim() && !sending ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}>
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : projectTab === 'assignments' ? (
              /* ASSIGNMENTS TAB */
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
                  <div className="flex flex-col gap-2 mb-6 p-3.5 rounded-xl bg-white/3 border border-white/8">
                    <input type="text" value={newAssignment.content} onChange={e => setNewAssignment(f => ({ ...f, content: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateAssignment(); }}
                      placeholder="Nieuwe taak toevoegen…"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Select value={newAssignment.assigneeId || 'none'} onValueChange={v => setNewAssignment(f => ({ ...f, assigneeId: v === 'none' ? '' : v }))}>
                          <SelectTrigger><SelectValue placeholder="Toewijzen (optioneel)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Niemand toegewezen</SelectItem>
                            {members.map((m: any) => (
                              <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.display_name || m.profile?.username}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <input type="date" value={newAssignment.dueDate} onChange={e => setNewAssignment(f => ({ ...f, dueDate: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                      <button onClick={handleCreateAssignment} disabled={!newAssignment.content.trim() || addingAssignment}
                        className="flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 shrink-0 text-sm">
                        {addingAssignment ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
                      </button>
                    </div>
                  </div>

                  {assignmentsLoading ? (
                    <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-16 text-slate-600">
                      <CheckSquare size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Geen taken. Voeg de eerste taak toe!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {assignments.filter(a => !a.completed).map(a => (
                        <div key={a.id} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors group ${a.is_pinned ? 'bg-violet-600/8 border-violet-500/20' : 'bg-white/3 border-white/8 hover:bg-white/5'}`}>
                          <button onClick={() => handleToggleAssignment(a)} className="mt-0.5 shrink-0 text-slate-500 hover:text-violet-400 transition-colors">
                            <Square size={16} />
                          </button>
                          <div className="flex-1 min-w-0">
                            {editingAssignmentId === a.id ? (
                              <div className="flex items-center gap-2">
                                <input autoFocus value={editingAssignmentText} onChange={e => setEditingAssignmentText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveAssignmentEdit(a.id); if (e.key === 'Escape') setEditingAssignmentId(null); }}
                                  className="flex-1 bg-white/5 border border-violet-500/40 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none" />
                                <button onClick={() => handleSaveAssignmentEdit(a.id)} className="text-violet-400 hover:text-violet-300 shrink-0"><Check size={14} /></button>
                                <button onClick={() => setEditingAssignmentId(null)} className="text-slate-500 hover:text-white shrink-0"><X size={14} /></button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-white leading-relaxed">{a.content}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {a.assignee && (
                                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                      <UserCircle2 size={11} /> {a.assignee.display_name || a.assignee.username}
                                    </span>
                                  )}
                                  {a.due_date && (
                                    <span className="text-[11px] text-slate-600">{a.assignee ? '· ' : ''}{new Date(a.due_date + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          {editingAssignmentId !== a.id && (
                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                              <button onClick={() => handlePinAssignment(a)} title={a.is_pinned ? 'Losmaken' : 'Vastpinnen'} className="p-0.5">
                                <Pin size={13} className={a.is_pinned ? 'text-violet-400' : 'text-slate-600 hover:text-white'} />
                              </button>
                              {(isAdmin || a.created_by === user?.id) && (
                                <>
                                  <button onClick={() => startEditAssignment(a)} className="text-slate-600 hover:text-white p-0.5"><Pencil size={13} /></button>
                                  <button onClick={() => handleDeleteAssignment(a.id)} className="text-slate-600 hover:text-red-400 p-0.5"><Trash2 size={13} /></button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {assignments.filter(a => a.completed).length > 0 && (
                        <>
                          <div className="flex items-center gap-2 pt-4 pb-1">
                            <div className="flex-1 h-px bg-white/8" />
                            <span className="text-[11px] text-slate-600 font-medium">{assignments.filter(a => a.completed).length} voltooid</span>
                            <div className="flex-1 h-px bg-white/8" />
                          </div>
                          {assignments.filter(a => a.completed).map(a => (
                            <div key={a.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/2 border border-white/5 transition-colors group opacity-60">
                              <button onClick={() => handleToggleAssignment(a)} className="mt-0.5 shrink-0 text-emerald-500 hover:text-slate-500 transition-colors">
                                <CheckSquare size={16} />
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-500 line-through leading-relaxed">{a.content}</p>
                              </div>
                              {(isAdmin || a.created_by === user?.id) && (
                                <button onClick={() => handleDeleteAssignment(a.id)} className="text-slate-600 hover:text-red-400 p-0.5 shrink-0"><Trash2 size={13} /></button>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : projectTab === 'goals' ? (
              /* GOALS TAB */
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
                  <div className="flex flex-col sm:flex-row gap-2 mb-6">
                    <input type="text" value={newGoal.content} onChange={e => setNewGoal(f => ({ ...f, content: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateGoal(); }}
                      placeholder="Nieuw doel toevoegen…"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                    <input type="date" value={newGoal.dueDate} onChange={e => setNewGoal(f => ({ ...f, dueDate: e.target.value }))}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                    <button onClick={handleCreateGoal} disabled={!newGoal.content.trim() || addingGoal}
                      className="flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 shrink-0 text-sm">
                      {addingGoal ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
                    </button>
                  </div>

                  {goalsLoading ? (
                    <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
                  ) : goals.length === 0 ? (
                    <div className="text-center py-16 text-slate-600">
                      <Target size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Geen doelen. Stel het eerste doel!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {goals.filter(g => !g.completed).map(g => (
                        <div key={g.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 transition-colors group">
                          <button onClick={() => handleToggleGoal(g)} className="mt-0.5 shrink-0 text-slate-500 hover:text-violet-400 transition-colors">
                            <Square size={16} />
                          </button>
                          <div className="flex-1 min-w-0">
                            {editingGoalId === g.id ? (
                              <div className="flex items-center gap-2">
                                <input autoFocus value={editingGoalText} onChange={e => setEditingGoalText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveGoalEdit(g.id); if (e.key === 'Escape') setEditingGoalId(null); }}
                                  className="flex-1 bg-white/5 border border-violet-500/40 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none" />
                                <button onClick={() => handleSaveGoalEdit(g.id)} className="text-violet-400 hover:text-violet-300 shrink-0"><Check size={14} /></button>
                                <button onClick={() => setEditingGoalId(null)} className="text-slate-500 hover:text-white shrink-0"><X size={14} /></button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-white leading-relaxed">{g.content}</p>
                                {g.due_date && <p className="text-[11px] text-slate-600 mt-0.5">{new Date(g.due_date + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</p>}
                              </>
                            )}
                          </div>
                          {editingGoalId !== g.id && (isAdmin || g.created_by === user?.id) && (
                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                              <button onClick={() => startEditGoal(g)} className="text-slate-600 hover:text-white p-0.5"><Pencil size={13} /></button>
                              <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-600 hover:text-red-400 p-0.5"><Trash2 size={13} /></button>
                            </div>
                          )}
                        </div>
                      ))}

                      {goals.filter(g => g.completed).length > 0 && (
                        <>
                          <div className="flex items-center gap-2 pt-4 pb-1">
                            <div className="flex-1 h-px bg-white/8" />
                            <span className="text-[11px] text-slate-600 font-medium">{goals.filter(g => g.completed).length} voltooid</span>
                            <div className="flex-1 h-px bg-white/8" />
                          </div>
                          {goals.filter(g => g.completed).map(g => (
                            <div key={g.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/2 border border-white/5 transition-colors group opacity-60">
                              <button onClick={() => handleToggleGoal(g)} className="mt-0.5 shrink-0 text-emerald-500 hover:text-slate-500 transition-colors">
                                <CheckSquare size={16} />
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-500 line-through leading-relaxed">{g.content}</p>
                              </div>
                              {(isAdmin || g.created_by === user?.id) && (
                                <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-600 hover:text-red-400 p-0.5 shrink-0"><Trash2 size={13} /></button>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* IDEAS TAB */
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
                  <div className="flex gap-2 mb-6">
                    <textarea value={newIdea} onChange={e => setNewIdea(e.target.value)} rows={2}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateIdea(); } }}
                      placeholder="Nieuw idee toevoegen…"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
                    <button onClick={handleCreateIdea} disabled={!newIdea.trim() || addingIdea}
                      className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 shrink-0 text-sm self-end">
                      {addingIdea ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
                    </button>
                  </div>

                  {ideasLoading ? (
                    <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400/60" /></div>
                  ) : ideas.length === 0 ? (
                    <div className="text-center py-16 text-slate-600">
                      <Lightbulb size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nog geen ideeën. Deel het eerste idee!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ideas.filter(i => i.is_pinned).length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-violet-400/60 uppercase tracking-wider mb-2">Vastgepind</p>
                          <div className="space-y-2">
                            {ideas.filter(i => i.is_pinned).map(idea => (
                              <div key={idea.id} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-violet-600/8 border border-violet-500/20 group">
                                <Lightbulb size={14} className="text-violet-400 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{idea.content}</p>
                                  <p className="text-[11px] text-slate-600 mt-1">{idea.creator?.display_name || idea.creator?.username}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                                  <button onClick={() => handlePinIdea(idea)} className="p-0.5"><Pin size={13} className="text-violet-400" /></button>
                                  {(isAdmin || idea.created_by === user?.id) && (
                                    <button onClick={() => handleDeleteIdea(idea.id)} className="text-slate-600 hover:text-red-400 p-0.5"><Trash2 size={13} /></button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ideas.filter(i => !i.is_pinned).length > 0 && (
                        <div>
                          {ideas.some(i => i.is_pinned) && <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Overig</p>}
                          <div className="space-y-2">
                            {ideas.filter(i => !i.is_pinned).map(idea => (
                              <div key={idea.id} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/3 border border-white/8 group">
                                <Lightbulb size={14} className="text-slate-500 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{idea.content}</p>
                                  <p className="text-[11px] text-slate-600 mt-1">{idea.creator?.display_name || idea.creator?.username}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                                  <button onClick={() => handlePinIdea(idea)} className="p-0.5"><Pin size={13} className="text-slate-600 hover:text-white" /></button>
                                  {(isAdmin || idea.created_by === user?.id) && (
                                    <button onClick={() => handleDeleteIdea(idea.id)} className="text-slate-600 hover:text-red-400 p-0.5"><Trash2 size={13} /></button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
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
                                  <div className={`flex items-center gap-2 mb-1.5 px-1 min-w-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-[13px] font-semibold text-slate-300 truncate">{msg.sender?.display_name || msg.sender?.username}</span>
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
                    const canRemove = !isMe && canRemoveRole(myRole, m.role);
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                        <UserAvatar src={m.profile?.avatar_url} name={m.profile?.display_name || m.profile?.username} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{m.profile?.display_name || m.profile?.username}{isMe && <span className="text-slate-600 text-xs ml-1.5">(jij)</span>}</p>
                          {m.role === 'owner' && <span className="text-[10px] text-amber-400 flex items-center gap-0.5 mt-0.5"><Crown size={9} /> Eigenaar</span>}
                          {m.role === 'admin' && <span className="text-[10px] text-violet-400 flex items-center gap-0.5 mt-0.5"><ShieldCheck size={9} /> Admin</span>}
                        </div>
                        {isOwner && !isMe && m.role === 'member' && (
                          <button onClick={() => handlePromote(m.id, m.profile)} title="Promoveer tot admin" className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-violet-400 transition-all p-1"><ShieldCheck size={13} /></button>
                        )}
                        {isOwner && !isMe && m.role === 'admin' && (
                          <button onClick={() => handleDemote(m.id, m.profile)} title="Degradeer tot lid" className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-amber-400 transition-all p-1"><ShieldOff size={13} /></button>
                        )}
                        {isOwner && !isMe && m.role !== 'owner' && (
                          <button onClick={() => handleTransferOwnership(m.id, m.user_id, m.profile)} disabled={transferringId === m.id} title="Maak eigenaar" className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-amber-400 transition-all p-1 disabled:opacity-50"><Crown size={13} /></button>
                        )}
                        {canRemove && (
                          <button onClick={() => handleRemoveMember(m.id, m.profile)} title="Verwijderen" className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"><Trash2 size={13} /></button>
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
              <h2 className="text-base font-semibold text-white">{editingEventId ? 'Evenement bewerken' : 'Evenement toevoegen'}</h2>
              <button onClick={() => { setShowAddEvent(false); setEditingEventId(null); resetEventForm(); }} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors"><X size={16} /></button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel *</label>
              <input type="text" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Naam van het evenement"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
            </div>

            <Tabs value={eventModalTab} onValueChange={v => setEventModalTab(v as typeof eventModalTab)}>
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1 mb-4 h-auto">
                <TabsTrigger value="general" className="text-xs">Algemeen</TabsTrigger>
                <TabsTrigger value="contacts" className="text-xs">Contact</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs">Financieel</TabsTrigger>
                <TabsTrigger value="agreements" className="text-xs">Afspraken</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Starttijd</label>
                        <input type="time" value={eventForm.time} onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Eindtijd</label>
                        <input type="time" value={eventForm.endTime} onChange={e => setEventForm(f => ({ ...f, endTime: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Locatie</label>
                  <input type="text" value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Naam van de venue"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Adres</label>
                  <input type="text" value={eventForm.address} onChange={e => setEventForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Straat, postcode, plaats"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Google Maps-link</label>
                  <input type="url" value={eventForm.mapsLink} onChange={e => setEventForm(f => ({ ...f, mapsLink: e.target.value }))}
                    placeholder="https://maps.google.com/…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
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

                {!editingEventId && (
                  <div className="pt-4 border-t border-white/8 space-y-3">
                    <label className="block text-xs font-medium text-slate-400">Herhaling</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as RecurrenceFreq[]).map(f => (
                        <button key={f} type="button" onClick={() => setRecurrenceForm(r => ({ ...r, freq: f }))}
                          className={`text-[11px] px-1.5 py-1.5 rounded-lg border transition-all ${recurrenceForm.freq === f ? 'bg-violet-600/20 border-violet-500 text-white font-semibold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25'}`}>
                          {{ none: 'Nooit', daily: 'Dagelijks', weekly: 'Wekelijks', monthly: 'Maandelijks', yearly: 'Jaarlijks' }[f]}
                        </button>
                      ))}
                    </div>

                    {recurrenceForm.freq !== 'none' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Elke</span>
                          <input type="number" min="1" value={recurrenceForm.interval}
                            onChange={e => setRecurrenceForm(r => ({ ...r, interval: Math.max(1, parseInt(e.target.value) || 1) }))}
                            className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-violet-500/50 transition-colors" />
                          <span className="text-xs text-slate-400">
                            {{ daily: 'dag(en)', weekly: 'we(e)k(en)', monthly: 'maand(en)', yearly: 'jaar/jaren' }[recurrenceForm.freq]}
                          </span>
                        </div>

                        {recurrenceForm.freq === 'weekly' && (
                          <div className="flex gap-1">
                            {NL_DAYS.map((d, i) => {
                              const dow = i === 6 ? 0 : i + 1; // NL_DAYS is Mon-first; JS Date convention is Sun=0
                              const selected = recurrenceForm.daysOfWeek.includes(dow);
                              return (
                                <button key={d} type="button"
                                  onClick={() => setRecurrenceForm(r => ({ ...r, daysOfWeek: selected ? r.daysOfWeek.filter(x => x !== dow) : [...r.daysOfWeek, dow] }))}
                                  className={`w-8 h-8 rounded-lg text-[11px] font-semibold border transition-all ${selected ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25'}`}>
                                  {d[0]}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-400">Eindigt</label>
                          <div className="flex gap-1.5">
                            {(['never', 'until', 'count'] as const).map(ec => (
                              <button key={ec} type="button" onClick={() => setRecurrenceForm(r => ({ ...r, endCondition: ec }))}
                                className={`flex-1 text-xs px-2 py-1.5 rounded-lg border transition-all ${recurrenceForm.endCondition === ec ? 'bg-violet-600/20 border-violet-500 text-white font-semibold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25'}`}>
                                {{ never: 'Nooit', until: 'Op datum', count: 'Na X keer' }[ec]}
                              </button>
                            ))}
                          </div>
                          {recurrenceForm.endCondition === 'until' && (
                            <input type="date" value={recurrenceForm.until} onChange={e => setRecurrenceForm(r => ({ ...r, until: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                          )}
                          {recurrenceForm.endCondition === 'count' && (
                            <input type="number" min="1" value={recurrenceForm.count}
                              onChange={e => setRecurrenceForm(r => ({ ...r, count: Math.max(1, parseInt(e.target.value) || 1) }))}
                              className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-violet-500/50 transition-colors" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500">
                          {describeRecurrence({
                            freq: recurrenceForm.freq, interval: recurrenceForm.interval,
                            daysOfWeek: recurrenceForm.freq === 'weekly' ? recurrenceForm.daysOfWeek : null,
                            until: recurrenceForm.endCondition === 'until' ? (recurrenceForm.until || null) : null,
                            count: recurrenceForm.endCondition === 'count' ? recurrenceForm.count : null,
                          })}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contacts" className="space-y-3">
                {eventContacts.map((c, i) => (
                  <div key={i} className="p-3 bg-white/5 border border-white/8 rounded-xl space-y-2 relative">
                    <button onClick={() => setEventContacts(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2.5 right-2.5 text-slate-600 hover:text-red-400 transition-colors"><X size={13} /></button>
                    <input type="text" placeholder="Naam" value={c.name}
                      onChange={e => setEventContacts(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors pr-8" />
                    <input type="text" placeholder="Functie (bv. organisator, geluidstechnicus)" value={c.role}
                      onChange={e => setEventContacts(prev => prev.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="tel" placeholder="Telefoon" value={c.phone}
                        onChange={e => setEventContacts(prev => prev.map((x, idx) => idx === i ? { ...x, phone: e.target.value } : x))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                      <input type="email" placeholder="E-mail" value={c.email}
                        onChange={e => setEventContacts(prev => prev.map((x, idx) => idx === i ? { ...x, email: e.target.value } : x))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                    </div>
                  </div>
                ))}
                <button onClick={() => setEventContacts(prev => [...prev, { name: '', role: '', phone: '', email: '' }])}
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  <Plus size={14} /> Contactpersoon toevoegen
                </button>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Gage (€)</label>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={eventForm.gage} onChange={e => setEventForm(f => ({ ...f, gage: e.target.value }))}
                      placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Reiskosten (€)</label>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={eventForm.travelCost} onChange={e => setEventForm(f => ({ ...f, travelCost: e.target.value }))}
                      placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Overige kosten (€)</label>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={eventForm.otherCosts} onChange={e => setEventForm(f => ({ ...f, otherCosts: e.target.value }))}
                      placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEventForm(f => ({ ...f, isPaid: !f.isPaid }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${eventForm.isPaid ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}>
                    {eventForm.isPaid && <Check size={12} />} Betaald
                  </button>
                  <button onClick={() => setEventForm(f => ({ ...f, invoiceSent: !f.invoiceSent }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${eventForm.invoiceSent ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}>
                    {eventForm.invoiceSent && <Check size={12} />} Factuur verzonden
                  </button>
                </div>

                {(() => {
                  const profit = calculateEventProfit({
                    gage: eventForm.gage.trim() ? parseFloat(eventForm.gage) : null,
                    travel_cost: eventForm.travelCost.trim() ? parseFloat(eventForm.travelCost) : null,
                    other_costs: eventForm.otherCosts.trim() ? parseFloat(eventForm.otherCosts) : null,
                  }, members.length);
                  const manualTotal = members.reduce((sum: number, m: any) => sum + (parseFloat(manualSplits[m.user_id] ?? '') || 0), 0);
                  return (
                    <div className="pt-4 border-t border-white/8 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">Totale winst</p>
                        <p className={`text-lg font-bold ${profit.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatEuro(profit.totalProfit)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setProfitSplitModeLocal('equal')}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${profitSplitMode === 'equal' ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
                          Gelijk verdelen
                        </button>
                        <button onClick={() => setProfitSplitModeLocal('manual')}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${profitSplitMode === 'manual' ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
                          Handmatig
                        </button>
                      </div>
                      {profitSplitMode === 'equal' ? (
                        <p className="text-xs text-slate-500">
                          Ieder van de {members.length} band{members.length === 1 ? 'lid' : 'leden'} ontvangt ongeveer{' '}
                          <span className="text-white font-semibold">{formatEuro(profit.perMemberEqual)}</span>.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {members.map((m: any) => (
                            <div key={m.user_id} className="flex items-center gap-2">
                              <span className="flex-1 text-xs text-slate-400 truncate">{m.profile?.display_name || m.profile?.username}</span>
                              <input type="number" inputMode="decimal" step="0.01"
                                value={manualSplits[m.user_id] ?? ''}
                                onChange={e => setManualSplits(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                                placeholder={profit.perMemberEqual.toFixed(2)}
                                className="w-24 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors text-right" />
                            </div>
                          ))}
                          {Math.abs(manualTotal - profit.totalProfit) > 0.01 && (
                            <p className="text-[11px] text-amber-400">
                              Let op: totaal ({formatEuro(manualTotal)}) komt niet overeen met de winst ({formatEuro(profit.totalProfit)}).
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="agreements">
                <textarea value={eventForm.agreements} onChange={e => setEventForm(f => ({ ...f, agreements: e.target.value }))}
                  placeholder="Load-in tijden, soundcheck, parkeren, backstage informatie, kleding, overige afspraken…" rows={7}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
              </TabsContent>
            </Tabs>

            {editingIsSeries && editingRecurrenceInfo && (
              <div className="mt-4 pt-4 border-t border-white/8 space-y-2">
                <p className="text-xs text-slate-500">Onderdeel van een reeks: <span className="text-slate-300">{describeRecurrence(editingRecurrenceInfo)}</span></p>
                <label className="block text-xs font-medium text-slate-400">Wijzigingen toepassen op</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" onClick={() => setSeriesEditScope('this')}
                    className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${seriesEditScope === 'this' ? 'bg-violet-600/20 border-violet-500 text-white font-semibold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25'}`}>
                    Alleen dit
                  </button>
                  <button type="button" onClick={() => setSeriesEditScope('this_and_future')}
                    className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${seriesEditScope === 'this_and_future' ? 'bg-violet-600/20 border-violet-500 text-white font-semibold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25'}`}>
                    Dit en volgende
                  </button>
                  <button type="button" onClick={() => setSeriesEditScope('all')}
                    className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${seriesEditScope === 'all' ? 'bg-violet-600/20 border-violet-500 text-white font-semibold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25'}`}>
                    Hele reeks
                  </button>
                </div>
                <button type="button" onClick={() => { const evId = editingEventId; setShowAddEvent(false); resetEventForm(); setEditingEventId(null); if (evId) handleDeleteSeries(evId); }}
                  className="text-[11px] text-slate-600 hover:text-red-400 transition-colors">
                  Hele reeks verwijderen
                </button>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddEvent(false); setEditingEventId(null); resetEventForm(); }} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors text-sm">Annuleren</button>
              <button onClick={handleAddEvent} disabled={savingEvent || !eventForm.title.trim() || !eventForm.date}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50 text-sm">
                {savingEvent ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/edit project modal ──────────────────────────────────────────── */}
      {showProjectModal && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setShowProjectModal(false); setEditingProjectId(null); }}>
          <div className="bg-[#1e1a30] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingProjectId ? 'Project bewerken' : 'Nieuw project'}</h2>
              <button onClick={() => { setShowProjectModal(false); setEditingProjectId(null); }} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Naam *</label>
                <input type="text" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="bijv. EP opname"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Omschrijving</label>
                <textarea value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Waar gaat dit project over?" rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowProjectModal(false); setEditingProjectId(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors text-sm">Annuleren</button>
              <button onClick={handleSaveProject} disabled={savingProject || !projectForm.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50 text-sm">
                {savingProject ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Opslaan
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

            {/* Invite (owner/admin only) — members can't self-serve invites anymore */}
            {isAdmin && (
              <div className="mb-5">
                <p className="text-xs font-medium text-slate-400 mb-2">Lid uitnodigen</p>
                <div className="flex gap-1.5 mb-3 bg-black/20 rounded-xl p-1">
                  <button
                    onClick={() => setInviteTab('search')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${inviteTab === 'search' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Search size={12} /> Bestaand lid
                  </button>
                  <button
                    onClick={() => setInviteTab('new')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${inviteTab === 'new' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Mail size={12} /> Nog geen account
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] text-slate-500">Rol:</span>
                  <button onClick={() => setInviteRole('member')} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${inviteRole === 'member' ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>Lid</button>
                  <button onClick={() => setInviteRole('admin')} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${inviteRole === 'admin' ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>Admin</button>
                </div>

                {inviteTab === 'search' ? (
                  <div>
                    <input
                      type="text" value={inviteQuery} onChange={e => setInviteQuery(e.target.value)}
                      placeholder="Zoek op gebruikersnaam of e-mail…"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors mb-2"
                    />
                    {searchingInvite && <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-1"><Loader2 size={11} className="animate-spin" /> Zoeken…</p>}
                    {!searchingInvite && inviteQuery.trim().length >= 2 && inviteResults.length === 0 && (
                      <p className="text-xs text-slate-500 mb-1">Geen gebruikers gevonden.</p>
                    )}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {inviteResults.map(candidate => (
                        <div key={candidate.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/8">
                          <UserAvatar src={candidate.avatar_url} name={candidate.display_name || candidate.username} size={28} />
                          <p className="flex-1 min-w-0 text-sm text-white truncate">{candidate.display_name || candidate.username}</p>
                          <button
                            onClick={() => handleAddExistingUser(candidate)}
                            disabled={addingUserId === candidate.id}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 shrink-0"
                          >
                            {addingUserId === candidate.id ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />} Toevoegen
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <input
                      type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                      placeholder="Naam"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                    <input
                      type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="E-mailadres"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                    <button
                      onClick={handleSendInvite}
                      disabled={sendingInvite || !inviteEmail.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {sendingInvite ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Uitnodiging versturen
                    </button>
                    <p className="text-[11px] text-slate-500">Geldig 7 dagen, eenmalig te gebruiken.</p>
                  </div>
                )}

                {(loadingInvites || pendingInvites.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-white/8">
                    <p className="text-xs font-medium text-slate-400 mb-2">
                      Openstaande uitnodigingen{pendingInvites.length > 0 ? ` (${pendingInvites.length})` : ''}
                    </p>
                    {loadingInvites ? (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Laden…</p>
                    ) : (
                      <div className="space-y-1.5">
                        {pendingInvites.map(invite => (
                          <div key={invite.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/8">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{invite.invited_name || invite.email}</p>
                              <p className="text-[10px] text-slate-500">
                                {invite.role === 'admin' ? 'Admin' : 'Lid'} · Verloopt {new Date(invite.expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <button onClick={() => copyInviteLink(invite.token)} title="Kopieer link" className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors shrink-0">
                              {copiedInviteId === invite.token ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(invite.id)}
                              disabled={revokingInviteId === invite.id}
                              title="Intrekken"
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                            >
                              {revokingInviteId === invite.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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

            {/* Admin: read-only ICS calendar subscription */}
            {isAdmin && band.calendar_feed_token && (
              <div className="mt-4 pt-4 border-t border-white/8">
                <p className="text-xs font-medium text-slate-400 mb-2">Agenda-abonnement (ICS)</p>
                <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-xs text-slate-400 truncate">{icsFeedUrl(band.calendar_feed_token)}</span>
                  <button
                    onClick={handleCopyFeedLink}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all shrink-0 ${copiedFeedLink ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/8 text-slate-300 hover:text-white hover:bg-white/12 border border-white/10'}`}
                  >
                    {copiedFeedLink ? <Check size={12} /> : <Copy size={12} />}
                    {copiedFeedLink ? 'Gekopieerd!' : 'Kopieer'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Alleen-lezen — abonneer via "Agenda toevoegen via URL" in Google/Outlook/Apple Calendar. Evenementen kunnen niet vanuit die apps worden aangepast.
                </p>
                <button onClick={handleRegenerateFeedToken} disabled={regeneratingFeedToken} className="text-[11px] text-slate-600 hover:text-amber-400 transition-colors mt-2 disabled:opacity-50">
                  {regeneratingFeedToken ? 'Bezig…' : 'Link vernieuwen (oude link stopt met werken)'}
                </button>
              </div>
            )}

            {/* Owner: danger zone */}
            {isOwner && (
              <div className="mt-4 pt-4 border-t border-white/8">
                <p className="text-xs font-medium text-red-400/80 mb-2">Gevarenzone</p>
                <button
                  onClick={handleDeleteBand}
                  disabled={deletingBand}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/20 transition-colors disabled:opacity-50"
                >
                  {deletingBand ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Band verwijderen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDialog}
        onOpenChange={open => { if (!open) setConfirmDialog(null); }}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        destructive={confirmDialog?.destructive}
        onConfirm={() => confirmDialog?.onConfirm()}
      />
    </div>
  );
}
