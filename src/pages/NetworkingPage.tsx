import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Music2, Mic2, Megaphone, MapPin,
  Tag, Clock, X, Loader2, ChevronDown, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import UserAvatar from '@components/UserAvatar';

const TABS = [
  { key: 'all',           label: 'Alles' },
  { key: 'wanted',        label: 'Wanted' },
  { key: 'jump_on_track', label: 'Jump on a Track' },
  { key: 'open_call',     label: 'Open Calls' },
] as const;

type TabKey = typeof TABS[number]['key'];

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  wanted:        { label: 'Wanted',          icon: Search,    color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20' },
  jump_on_track: { label: 'Jump on a Track', icon: Music2,    color: 'text-violet-400',  bg: 'bg-violet-400/10 border-violet-400/20' },
  open_call:     { label: 'Open Call',       icon: Megaphone, color: 'text-sky-400',     bg: 'bg-sky-400/10 border-sky-400/20' },
};

const GENRES = [
  'Hip-hop', 'R&B', 'Pop', 'Electronic', 'House', 'Techno', 'Drum & Bass',
  'Afrobeats', 'Reggaeton', 'Jazz', 'Soul', 'Funk', 'Rock', 'Indie', 'Overig',
];

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

interface Post {
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

interface CreateForm {
  type: 'wanted' | 'jump_on_track' | 'open_call';
  title: string;
  description: string;
  genre: string;
  location: string;
  track_title: string;
  contact_info: string;
}

export default function NetworkingPage() {
  const { user } = useAuth();
  const addToast = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    type: 'wanted', title: '', description: '', genre: '',
    location: '', track_title: '', contact_info: '',
  });

  useEffect(() => { loadPosts(); }, [activeTab]);

  async function loadPosts() {
    setLoading(true);
    let query = supabase
      .from('networking_posts')
      .select('*, poster:profiles(username,display_name,avatar_url)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(60);

    if (activeTab !== 'all') query = query.eq('type', activeTab);

    const { data } = await query;
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  }

  async function handleCreate() {
    if (!user) return;
    if (!form.title.trim()) { addToast('Geef je post een titel', 'error'); return; }
    setCreating(true);

    const { error } = await supabase.from('networking_posts').insert({
      user_id:     user.id,
      type:        form.type,
      title:       form.title.trim(),
      description: form.description.trim() || null,
      genre:       form.genre || null,
      location:    form.location.trim() || null,
      track_title: form.track_title.trim() || null,
      contact_info: form.contact_info.trim() || null,
    });

    if (error) {
      addToast('Plaatsen mislukt, probeer opnieuw', 'error');
    } else {
      addToast('Post geplaatst!', 'success');
      setShowCreate(false);
      setForm({ type: 'wanted', title: '', description: '', genre: '', location: '', track_title: '', contact_info: '' });
      loadPosts();
    }
    setCreating(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Netwerken & Uitwisselen</h1>
          <p className="text-slate-400 max-w-lg">
            Zoek samenwerking, spring op een track, of zet een open call uit. De plek voor de Nederlandse muziekgemeenschap.
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <Plus size={18} /> Post plaatsen
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/4 p-1 rounded-xl border border-white/8 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-violet-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-400">Nog geen posts</p>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 text-violet-400 hover:underline text-sm"
            >
              Wees de eerste!
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {!user && (
        <div className="mt-10 text-center text-sm text-slate-500">
          <Link to="/login" className="text-violet-400 hover:underline">Log in</Link> om posts te plaatsen.
        </div>
      )}

      {/* Create post modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#201c30] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Post plaatsen</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type post</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['wanted', 'jump_on_track', 'open_call'] as const).map(t => {
                    const meta = TYPE_META[t];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                          form.type === t
                            ? `${meta.bg} ${meta.color} border-current`
                            : 'border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <Icon size={18} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Titel *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={
                    form.type === 'wanted' ? 'Gezocht: drummer in Amsterdam' :
                    form.type === 'jump_on_track' ? 'Spring mee op mijn lo-fi beat' :
                    'Open call: support act voor Melkweg'
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {form.type === 'jump_on_track' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Tracknaam</label>
                  <input
                    type="text"
                    value={form.track_title}
                    onChange={e => setForm(f => ({ ...f, track_title: e.target.value }))}
                    placeholder="Naam van de track"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Omschrijving</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Meer details…"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Genre</label>
                  <select
                    value={form.genre}
                    onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                    className="w-full bg-[#1a1528] border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    <option value="">Kies genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Stad</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Amsterdam"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact (optioneel)</label>
                <input
                  type="text"
                  value={form.contact_info}
                  onChange={e => setForm(f => ({ ...f, contact_info: e.target.value }))}
                  placeholder="Instagram, e-mail of link"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : null}
                Plaatsen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const meta = TYPE_META[post.type];
  const Icon = meta?.icon ?? Megaphone;

  return (
    <div className="bg-white/3 hover:bg-white/5 border border-white/8 rounded-2xl p-5 transition-all">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-2 rounded-lg border ${meta?.bg ?? ''}`}>
            <Icon size={15} className={meta?.color ?? 'text-slate-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-0.5">{post.title}</h3>
            {post.type === 'jump_on_track' && post.track_title && (
              <p className="text-xs text-violet-400 mb-1">Track: {post.track_title}</p>
            )}
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta?.bg ?? ''} ${meta?.color ?? ''}`}>
              {meta?.label ?? post.type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <Clock size={11} /> {timeAgo(post.created_at)}
        </div>
      </div>

      {post.description && (
        <p className="text-sm text-slate-400 mb-3 leading-relaxed">{post.description}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {post.genre && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Tag size={11} /> {post.genre}
          </span>
        )}
        {post.location && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin size={11} /> {post.location}
          </span>
        )}
        {post.contact_info && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ExternalLink size={11} /> {post.contact_info}
          </span>
        )}
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
