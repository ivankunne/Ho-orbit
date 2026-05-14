import { useState, useEffect } from 'react';
import { MessageCircle, Home, Users, Network, Send, X } from 'lucide-react';
import { useToast } from '@components/Toast';
import { useAuth } from '@context/AuthContext';
import { supabase } from '@/lib/supabase';
import SpacesMap from '@components/SpacesMap';

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

const NETWORK_CONNECT_GENRES = ['Hip-Hop', 'Pop', 'Elektronisch', 'Jazz', 'Folk', 'Rock', 'R&B', 'Klassiek'];

const MUSICIAN_NETWORK_SECTIONS = [
  { id: 'forums', label: 'Forums', icon: MessageCircle },
  { id: 'spaces', label: 'Ruimtes', icon: Home },
  { id: 'network', label: 'Netwerk', icon: Users },
];

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

function HubThreadRow({ thread, onClick }) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {thread.pinned && <span className="text-amber-400 text-xs font-bold mb-1">📌 PINNED</span>}
          <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2">
            {thread.title}
          </h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <img src={thread.author.avatar} alt={thread.author.name} className="w-6 h-6 rounded-full" />
        <span className="text-xs text-slate-400">{thread.author.name}</span>
        <span className="text-xs text-slate-500">·</span>
        <span className="text-xs text-slate-500">{new Date(thread.createdAt).toLocaleDateString('nl-NL')}</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        {thread.tags.map(tag => (
          <span key={tag} className="text-xs bg-white/5 text-slate-300 px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{thread.replies} reacties</span>
        <span>{thread.views} weergaven</span>
      </div>
    </div>
  );
}

function HubPostBar({ onSubmit, placeholder = 'Start een nieuw onderwerp...', loading = false }) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim() || loading) return;
    onSubmit(input.trim());
    setInput('');
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-[#1a1528] border-t border-white/5 p-4 space-y-3">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
      />
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || loading}
        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
      >
        {loading ? 'Plaatsen…' : 'Plaats Onderwerp'}
      </button>
    </div>
  );
}

function HubThreadDetailModal({ thread, onClose, onReplyPosted }) {
  const { user } = useAuth();
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
    if (!replyText.trim() || !user) return;
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
      // bump reply count on the post
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
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end lg:items-center justify-center">
      <div className="w-full lg:w-2xl bg-[#1a1528] border border-white/5 rounded-t-2xl lg:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#1a1528] border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Discussie</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-3">{thread.title}</h3>
            <div className="flex items-center gap-3 mb-4">
              <img src={thread.author.avatar} alt={thread.author.name} className="w-10 h-10 rounded-full" />
              <div>
                <p className="text-sm font-semibold text-white">{thread.author.name}</p>
                <p className="text-xs text-slate-500">{new Date(thread.createdAt).toLocaleDateString('nl-NL')}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{thread.replies} reacties</span>
              <span>{thread.views} weergaven</span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <h4 className="font-semibold text-white">Antwoorden</h4>
            {loadingReplies ? (
              <div className="py-6 text-center">
                <div className="w-6 h-6 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Nog geen antwoorden. Wees de eerste!</p>
            ) : (
              <div className="space-y-3">
                {replies.map(reply => (
                  <div key={reply.id} className="p-3 bg-white/3 border border-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={reply.author.avatar} alt={reply.author.name} className="w-6 h-6 rounded-full" />
                      <span className="text-xs font-semibold text-white">{reply.author.name}</span>
                      <span className="text-xs text-slate-500 ml-auto">{new Date(reply.createdAt).toLocaleDateString('nl-NL')}</span>
                    </div>
                    <p className="text-xs text-slate-300">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-4">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={user ? 'Schrijf je antwoord...' : 'Log in om te antwoorden'}
              disabled={!user}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none mb-3 disabled:opacity-50"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || !user || submitting}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Send size={14} />
              {submitting ? 'Plaatsen…' : 'Antwoord plaatsen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionContent({ sectionId, postBarPlaceholder, postTags }) {
  const { user } = useAuth();
  const addToast = useToast();
  const [threads, setThreads] = useState<HubThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<HubThread | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('hub_posts')
      .select('*, profiles:author_id(username, display_name, avatar_url)')
      .eq('section', sectionId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setThreads((data ?? []).map(mapHubPost));
        setLoadingPosts(false);
      })
      .catch(() => setLoadingPosts(false));
  }, [sectionId]);

  const handleSubmit = async (title: string) => {
    if (!user) { addToast('Je moet ingelogd zijn om een onderwerp te plaatsen.', 'error'); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('hub_posts')
        .insert({ section: sectionId, title, author_id: user.id, tags: postTags, replies_count: 0, views_count: 0 })
        .select('*, profiles:author_id(username, display_name, avatar_url)')
        .single();
      if (error) throw error;
      setThreads(prev => [mapHubPost(data), ...prev]);
      addToast('Onderwerp geplaatst!', 'success');
    } catch {
      addToast('Plaatsen mislukt. Probeer het opnieuw.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-32">
      <div className="max-w-4xl mx-auto px-4 lg:px-6">
        {loadingPosts ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map(thread => (
              <HubThreadRow key={thread.id} thread={thread} onClick={() => setSelectedThread(thread)} />
            ))}
            {threads.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-10">Nog geen onderwerpen. Wees de eerste!</p>
            )}
          </div>
        )}
      </div>

      <HubPostBar placeholder={postBarPlaceholder} onSubmit={handleSubmit} loading={submitting} />

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

function ForumsSection() {
  return (
    <div className="space-y-4 pb-32">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 mb-2">
        <p className="text-slate-400 text-sm">Stel vragen over productie, mixing, recording, en groei als artist. Leer van ervaren muzikanten in de community.</p>
      </div>
      <SectionContent sectionId="forums" postBarPlaceholder="Stel je vraag..." postTags={['vraag']} />
    </div>
  );
}

function SpacesSection() {
  return (
    <div className="space-y-4 pb-32">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 mb-8">
        <SpacesMap />
      </div>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 mb-2">
        <p className="text-slate-400 text-sm">Ontdek repetitieruimtes, opnamestudio's en jamspaces. Lees ervaringen van andere muzikanten en deel je eigen reviews.</p>
      </div>
      <SectionContent sectionId="spaces" postBarPlaceholder="Review een ruimte..." postTags={['review']} />
    </div>
  );
}

function NetworkingSection() {
  const [activeGenre, setActiveGenre] = useState('Alle');

  return (
    <div className="space-y-4 pb-32">
      <div className="max-w-4xl mx-auto px-4 lg:px-6">
        <p className="text-slate-400 text-sm mb-4">Vind samenwerkingspartners, muzikale vrienden, en bouw je netwerk. Zoek producers, zangers, bandleden, of iemand om mee te creëren.</p>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-6 scrollbar-hide">
          {['Alle', ...NETWORK_CONNECT_GENRES].map(genre => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeGenre === genre
                  ? 'bg-amber-400 text-[#1a1528] font-bold'
                  : 'bg-white/5 border border-white/10 text-slate-400'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
      <SectionContent sectionId="network" postBarPlaceholder="Zoek een samenwerkingspartner..." postTags={['collab']} />
    </div>
  );
}

export default function HubPage() {
  const [activeSection, setActiveSection] = useState('forums');

  return (
    <div className="min-h-screen bg-[#1a1528]">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">Musician Network</h1>
          <p className="text-slate-400">Hulp, ruimtes en verbindingen voor opkomende artiesten</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-8 scrollbar-hide">
          {MUSICIAN_NETWORK_SECTIONS.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeSection === section.id
                    ? 'bg-amber-400 text-[#1a1528]'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon size={14} />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === 'forums' && <ForumsSection />}
      {activeSection === 'spaces' && <SpacesSection />}
      {activeSection === 'network' && <NetworkingSection />}
    </div>
  );
}
