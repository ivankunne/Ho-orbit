import { useState, useEffect } from 'react';
import {
  MessageCircle, Home, Users, Send, X, Plus, Zap,
  Clock, Tag, MapPin, ExternalLink, Search, Music2, Megaphone,
  ChevronRight, Loader2, Eye, MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@components/Toast';
import { useAuth } from '@context/AuthContext';
import { useAuthModal } from '@context/AuthModalContext';
import { supabase } from '@/lib/supabase';
import SceneMap from '@components/SceneMap';
import UserAvatar from '@components/UserAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubThread {
  id: string;
  section: string;
  title: string;
  author: { id: string; name: string; avatar: string };
  createdAt: string;
  replies: number;
  views: number;
  pinned: boolean;
  lastPost: { user: string; time: string };
  tags: string[];
}

interface HubReply {
  id: string;
  postId: string;
  content: string;
  author: { id: string; name: string; avatar: string };
  createdAt: string;
}

interface NetworkPost {
  id: string;
  type: string;
  title: string;
  description: string;
  genre: string;
  location: string;
  tags: string[];
  track_title: string;
  contact_info: string;
  created_at: string;
  user_id: string;
  poster?: { username: string; display_name: string; avatar_url: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'forums',  label: 'Forums',   icon: MessageCircle, desc: 'Vragen, tips & discussies over muziek maken' },
  { id: 'spaces',  label: 'Ruimtes',  icon: Home,          desc: 'Repetitieruimtes, studio\'s & jamspaces' },
  { id: 'network', label: 'Netwerken', icon: Users,         desc: 'Samenwerking, collabs & open calls' },
];

const NETWORK_GENRES = ['Alle', 'Hip-hop', 'R&B', 'Pop', 'Electronic', 'House', 'Techno', 'Jazz', 'Rock', 'Overig'];

const NETWORK_TABS = [
  { key: 'all',           label: 'Alles' },
  { key: 'wanted',        label: 'Wanted' },
  { key: 'jump_on_track', label: 'Jump on a Track' },
  { key: 'open_call',     label: 'Open Calls' },
] as const;
type NetworkTab = typeof NETWORK_TABS[number]['key'];

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  wanted:        { label: 'Wanted',          icon: Search,    color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20' },
  jump_on_track: { label: 'Jump on a Track', icon: Music2,    color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
  open_call:     { label: 'Open Call',       icon: Megaphone, color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/20' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return 'zojuist';
  if (mins < 60)  return `${mins}m geleden`;
  if (hours < 24) return `${hours}u geleden`;
  if (days < 7)   return `${days}d geleden`;
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function mapHubPost(d: Record<string, unknown>): HubThread {
  const profile = d.profiles as { username: string; display_name: string; avatar_url: string } | null;
  return {
    id: String(d.id),
    section: (d.section as string) ?? '',
    title: (d.title as string) ?? '',
    author: {
      id: String(d.author_id),
      name: profile?.display_name ?? profile?.username ?? 'Onbekend',
      avatar: profile?.avatar_url ?? `https://picsum.photos/seed/${d.author_id}/40/40`,
    },
    createdAt: (d.created_at as string) ?? '',
    replies: (d.replies_count as number) ?? 0,
    views: (d.views_count as number) ?? 0,
    pinned: false,
    lastPost: { user: profile?.display_name ?? '', time: (d.last_post_at as string) ?? (d.created_at as string) ?? '' },
    tags: (d.tags as string[]) ?? [],
  };
}

function mapHubReply(d: Record<string, unknown>): HubReply {
  const profile = d.profiles as { username: string; display_name: string; avatar_url: string } | null;
  return {
    id: String(d.id),
    postId: String(d.post_id),
    content: (d.content as string) ?? '',
    author: {
      id: String(d.author_id),
      name: profile?.display_name ?? profile?.username ?? 'Onbekend',
      avatar: profile?.avatar_url ?? `https://picsum.photos/seed/${d.author_id}/40/40`,
    },
    createdAt: (d.created_at as string) ?? '',
  };
}

// ─── Thread row ───────────────────────────────────────────────────────────────

function HubThreadRow({ thread, onClick }: { thread: HubThread; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left group p-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-violet-500/20 rounded-2xl transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <UserAvatar src={thread.author.avatar} name={thread.author.name} size={36} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2 leading-snug">
              {thread.title}
            </h3>
            <ChevronRight size={15} className="shrink-0 text-slate-600 group-hover:text-violet-400 mt-0.5 transition-colors" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2.5">
            <span className="text-slate-400 font-medium">{thread.author.name}</span>
            <span>·</span>
            <span>{timeAgo(thread.createdAt)}</span>
          </div>
          {thread.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
              {thread.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[11px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-full border border-white/8">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <MessageSquare size={11} /> {thread.replies}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={11} /> {thread.views}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Thread detail modal ──────────────────────────────────────────────────────

function HubThreadDetailModal({ thread, onClose, onReplyPosted }: {
  thread: HubThread;
  onClose: () => void;
  onReplyPosted?: () => void;
}) {
  const { user } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const addToast = useToast();
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<HubReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('hub_replies')
      .select('*, profiles:author_id(username, display_name, avatar_url)')
      .eq('post_id', thread.id)
      .order('created_at')
      .then(({ data }) => {
        setReplies((data ?? []).map(mapHubReply));
        setLoadingReplies(false);
      })
      .catch(() => setLoadingReplies(false));
  }, [thread.id]);

  const handleReply = async () => {
    if (!user) { openAuthModal('login'); return; }
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('hub_replies')
        .insert({ post_id: thread.id, content: replyText.trim(), author_id: user.id })
        .select('*, profiles:author_id(username, display_name, avatar_url)')
        .single();
      if (error) throw error;
      setReplies(prev => [...prev, mapHubReply(data)]);
      setReplyText('');
      await supabase.from('hub_posts')
        .update({ replies_count: thread.replies + 1, last_post_at: new Date().toISOString() })
        .eq('id', thread.id);
      onReplyPosted?.();
      addToast('Reactie geplaatst!', 'success');
    } catch {
      addToast('Plaatsen mislukt. Probeer het opnieuw.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="w-full lg:max-w-2xl bg-[#1e1833] border border-white/10 rounded-t-3xl lg:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-300">Discussie</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Thread */}
          <div className="p-6 pb-4">
            <h3 className="text-xl font-bold text-white mb-4 leading-snug">{thread.title}</h3>
            <div className="flex items-center gap-3">
              <UserAvatar src={thread.author.avatar} name={thread.author.name} size={38} />
              <div>
                <p className="text-sm font-semibold text-white">{thread.author.name}</p>
                <p className="text-xs text-slate-500">{timeAgo(thread.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><MessageSquare size={12} />{thread.replies} reacties</span>
              <span className="flex items-center gap-1.5"><Eye size={12} />{thread.views} weergaven</span>
            </div>
          </div>

          {/* Replies */}
          <div className="px-6 pb-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Antwoorden</h4>
            {loadingReplies ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={22} className="animate-spin text-violet-400/60" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Nog geen antwoorden. Wees de eerste!</p>
            ) : (
              <div className="space-y-3">
                {replies.map(reply => (
                  <div key={reply.id} className="p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                    <div className="flex items-center gap-2.5 mb-2">
                      <UserAvatar src={reply.author.avatar} name={reply.author.name} size={26} />
                      <span className="text-sm font-semibold text-white">{reply.author.name}</span>
                      <span className="text-xs text-slate-500 ml-auto">{timeAgo(reply.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reply box */}
        <div className="px-6 py-4 border-t border-white/8 shrink-0 bg-[#1a1528]">
          {user ? (
            <div className="flex gap-3">
              <UserAvatar src={user.avatar} name={user.displayName || user.username} size={34} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Schrijf je antwoord..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none transition-colors"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || submitting}
                  className="mt-2 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <Send size={13} />
                  {submitting ? 'Plaatsen…' : 'Antwoord plaatsen'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="w-full py-3 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 text-sm font-semibold rounded-xl transition-colors"
            >
              Log in om te antwoorden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section content (forums / spaces) ───────────────────────────────────────

function SectionContent({ sectionId, postBarPlaceholder, postTags }: {
  sectionId: string;
  postBarPlaceholder: string;
  postTags: string[];
}) {
  const { user } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const addToast = useToast();
  const [threads, setThreads] = useState<HubThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<HubThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('hub_posts')
      .select('*, profiles:author_id(username, display_name, avatar_url)')
      .eq('section', sectionId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setThreads((data ?? []).map(mapHubPost));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sectionId]);

  const handleSubmit = async () => {
    if (!user) { openAuthModal('login'); return; }
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('hub_posts')
        .insert({ section: sectionId, title: input.trim(), author_id: user.id, tags: postTags, replies_count: 0, views_count: 0 })
        .select('*, profiles:author_id(username, display_name, avatar_url)')
        .single();
      if (error) throw error;
      setThreads(prev => [mapHubPost(data), ...prev]);
      setInput('');
      setShowPostForm(false);
      addToast('Onderwerp geplaatst!', 'success');
    } catch {
      addToast('Plaatsen mislukt. Probeer het opnieuw.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Post button */}
      <div className="flex justify-end mb-5">
        {showPostForm ? (
          <div className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
            <input
              autoFocus
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={postBarPlaceholder}
              className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPostForm(false); setInput(''); }}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Plaatsen
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => user ? setShowPostForm(true) : openAuthModal('login')}
            className="flex items-center gap-2 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 hover:text-violet-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus size={15} />
            Nieuw onderwerp
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 size={28} className="animate-spin text-violet-400/60" />
        </div>
      ) : threads.length === 0 ? (
        <div className="py-16 text-center">
          <MessageCircle size={36} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-500 text-sm">Nog geen onderwerpen. Wees de eerste!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {threads.map(thread => (
            <HubThreadRow
              key={thread.id}
              thread={thread}
              onClick={() => setSelectedThread(thread)}
            />
          ))}
        </div>
      )}

      {selectedThread && (
        <HubThreadDetailModal
          thread={selectedThread}
          onClose={() => setSelectedThread(null)}
          onReplyPosted={() => {
            setThreads(prev => prev.map(t =>
              t.id === selectedThread.id ? { ...t, replies: t.replies + 1 } : t
            ));
          }}
        />
      )}
    </div>
  );
}

// ─── Network post card ────────────────────────────────────────────────────────

function NetworkPostCard({ post }: { post: NetworkPost }) {
  const meta = TYPE_META[post.type];
  const Icon = meta?.icon ?? Megaphone;

  return (
    <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-2xl p-5 transition-all duration-200">
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-xl border shrink-0 ${meta?.bg ?? ''}`}>
          <Icon size={14} className={meta?.color ?? 'text-slate-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white leading-snug">{post.title}</h3>
            <span className="text-xs text-slate-500 shrink-0 flex items-center gap-1 mt-0.5">
              <Clock size={11} /> {timeAgo(post.created_at)}
            </span>
          </div>
          {post.type === 'jump_on_track' && post.track_title && (
            <p className="text-xs text-violet-400 mt-0.5">Track: {post.track_title}</p>
          )}
          <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border mt-1.5 ${meta?.bg ?? ''} ${meta?.color ?? ''}`}>
            {meta?.label ?? post.type}
          </span>
        </div>
      </div>

      {post.description && (
        <p className="text-sm text-slate-400 leading-relaxed mb-3">{post.description}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
        {post.genre && <span className="flex items-center gap-1"><Tag size={11} />{post.genre}</span>}
        {post.location && <span className="flex items-center gap-1"><MapPin size={11} />{post.location}</span>}
        {post.contact_info && <span className="flex items-center gap-1 text-slate-400"><ExternalLink size={11} />{post.contact_info}</span>}
      </div>

      {post.poster && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/6">
          <UserAvatar src={post.poster.avatar_url} name={post.poster.display_name || post.poster.username} size={22} />
          <Link
            to={`/profiel/${post.poster.username}`}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {post.poster.display_name || post.poster.username}
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Network create form ──────────────────────────────────────────────────────

const GENRES = ['Hip-hop', 'R&B', 'Pop', 'Electronic', 'House', 'Techno', 'Drum & Bass', 'Jazz', 'Soul', 'Rock', 'Indie', 'Overig'];

interface CreateForm {
  type: 'wanted' | 'jump_on_track' | 'open_call';
  title: string;
  description: string;
  genre: string;
  location: string;
  track_title: string;
  contact_info: string;
}

function NetworkCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const addToast = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    type: 'wanted', title: '', description: '', genre: '', location: '', track_title: '', contact_info: '',
  });

  const handleCreate = async () => {
    if (!user || !form.title.trim()) { addToast('Geef je post een titel', 'error'); return; }
    setCreating(true);
    const { error } = await supabase.from('networking_posts').insert({
      user_id: user.id, type: form.type, title: form.title.trim(),
      description: form.description.trim() || null, genre: form.genre || null,
      location: form.location.trim() || null, track_title: form.track_title.trim() || null,
      contact_info: form.contact_info.trim() || null,
    });
    if (error) { addToast('Plaatsen mislukt, probeer opnieuw', 'error'); }
    else { addToast('Post geplaatst!', 'success'); onCreated(); onClose(); }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#201c30] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Post plaatsen</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/8 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Type post</label>
            <div className="grid grid-cols-3 gap-2">
              {(['wanted', 'jump_on_track', 'open_call'] as const).map(t => {
                const meta = TYPE_META[t]; const Icon = meta.icon;
                return (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${form.type === t ? `${meta.bg} ${meta.color} border-current` : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                    <Icon size={18} />{meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Titel *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={form.type === 'wanted' ? 'Gezocht: drummer in Amsterdam' : form.type === 'jump_on_track' ? 'Spring mee op mijn lo-fi beat' : 'Open call: support act voor Melkweg'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          {form.type === 'jump_on_track' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Tracknaam</label>
              <input type="text" value={form.track_title} onChange={e => setForm(f => ({ ...f, track_title: e.target.value }))}
                placeholder="Naam van de track"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Omschrijving</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Meer details…" rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Genre</label>
              <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                className="w-full bg-[#1a1528] border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors">
                <option value="">Kies genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Stad</label>
              <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Amsterdam"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact (optioneel)</label>
            <input type="text" value={form.contact_info} onChange={e => setForm(f => ({ ...f, contact_info: e.target.value }))}
              placeholder="Instagram, e-mail of link"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white transition-colors">Annuleren</button>
          <button onClick={handleCreate} disabled={creating || !form.title.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50">
            {creating ? <Loader2 size={16} className="animate-spin" /> : null}Plaatsen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Network section ──────────────────────────────────────────────────────────

function NetworkSection() {
  const { user } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const [activeTab, setActiveTab] = useState<NetworkTab>('all');
  const [activeGenre, setActiveGenre] = useState('Alle');
  const [posts, setPosts] = useState<NetworkPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    let query = supabase
      .from('networking_posts')
      .select('*, poster:profiles(username,display_name,avatar_url)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(40);
    if (activeTab !== 'all') query = query.eq('type', activeTab);
    if (activeGenre !== 'Alle') query = query.eq('genre', activeGenre);
    const { data } = await query;
    setPosts((data ?? []) as NetworkPost[]);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, [activeTab, activeGenre]);

  return (
    <div>
      {/* Type tabs + post button */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white/4 p-1 rounded-xl border border-white/8">
          {NETWORK_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === t.key ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => user ? setShowCreate(true) : openAuthModal('login')}
          className="flex items-center gap-2 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 hover:text-violet-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={15} /> Post plaatsen
        </button>
      </div>

      {/* Genre filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-5 scrollbar-hide">
        {NETWORK_GENRES.map(genre => (
          <button key={genre} onClick={() => setActiveGenre(genre)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${activeGenre === genre ? 'bg-amber-400 text-[#1a1528] font-bold' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}>
            {genre}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 size={28} className="animate-spin text-violet-400/60" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <Megaphone size={36} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-500 text-sm">Nog geen posts in deze categorie.</p>
          <button onClick={() => user ? setShowCreate(true) : openAuthModal('login')}
            className="mt-3 text-violet-400 hover:underline text-sm">
            Wees de eerste!
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => <NetworkPostCard key={post.id} post={post} />)}
        </div>
      )}

      {showCreate && <NetworkCreateModal onClose={() => setShowCreate(false)} onCreated={loadPosts} />}
    </div>
  );
}

// ─── Spaces section ───────────────────────────────────────────────────────────

function SpacesSection() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl overflow-hidden border border-white/8">
        <SceneMap />
      </div>
      <SectionContent sectionId="spaces" postBarPlaceholder="Review een ruimte of studio..." postTags={['review']} />
    </div>
  );
}

// ─── Main HubPage ─────────────────────────────────────────────────────────────

export default function HubPage() {
  const [activeSection, setActiveSection] = useState('forums');
  const activeData = SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div className="min-h-screen bg-[#1a1528]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-violet-600/5 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-400/5 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10 lg:py-14 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Zap size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest">h-orbit</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-white leading-none">Musician Hub</h1>
            </div>
          </div>
          <p className="text-slate-400 max-w-lg">
            Stel vragen, vind ruimtes, sluit samenwerkingen — alles voor de Nederlandse muzikant.
          </p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="sticky top-[calc(4rem+2.25rem)] z-30 bg-[#1a1528]/90 backdrop-blur-md border-b border-white/6">
        <div className="max-w-4xl mx-auto px-4 lg:px-6">
          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    active
                      ? 'border-amber-400 text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={15} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        {/* Section description */}
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{activeData.desc}</p>

        {activeSection === 'forums' && (
          <SectionContent sectionId="forums" postBarPlaceholder="Stel je vraag over muziek maken..." postTags={['vraag']} />
        )}
        {activeSection === 'spaces' && <SpacesSection />}
        {activeSection === 'network' && <NetworkSection />}
      </div>
    </div>
  );
}
