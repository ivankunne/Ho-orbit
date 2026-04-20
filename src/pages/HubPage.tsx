import { useState } from 'react';
import { MessageCircle, Home, Users, Network, Send, X } from 'lucide-react';
import { useToast } from '@components/Toast';
import SpacesMap from '@components/SpacesMap';
const NETWORK_FORUM_THREADS: HubThread[] = [];
const NETWORK_SPACE_REVIEWS: HubThread[] = [];
const NETWORK_CONNECT_THREADS: HubThread[] = [];
const NETWORK_CONNECT_GENRES = ['Hip-Hop', 'Pop', 'Elektronisch', 'Jazz', 'Folk', 'Rock', 'R&B', 'Klassiek'];

interface HubThread {
  id: string;
  categoryId: string;
  title: string;
  author: { name: string; avatar: string };
  createdAt: string;
  replies: number;
  views: number;
  pinned: boolean;
  lastPost: { user: string; time: string };
  tags: string[];
}

const MUSICIAN_NETWORK_SECTIONS = [
  { id: 'forums', label: 'Forums', icon: MessageCircle },
  { id: 'spaces', label: 'Ruimtes', icon: Home },
  { id: 'network', label: 'Netwerk', icon: Users },
];

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
        <span className="text-xs text-slate-500">{thread.createdAt}</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        {thread.tags.map(tag => (
          <span key={tag} className="text-xs bg-white/5 text-slate-300 px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{thread.replies} replies</span>
        <span>{thread.views} views</span>
        <span>Last: {thread.lastPost.user} {thread.lastPost.time}</span>
      </div>
    </div>
  );
}

function HubPostBar({ onSubmit, placeholder = 'Start een nieuw onderwerp...' }) {
  const [input, setInput] = useState('');
  const addToast = useToast();

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSubmit(input);
    setInput('');
    addToast('Onderwerp geplaatst!', 'success');
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
        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors"
      >
        Plaats Onderwerp
      </button>
    </div>
  );
}

function HubThreadDetailModal({ thread, onClose, onReply }) {
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(thread.id, replyText);
    setReplyText('');
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
                <p className="text-xs text-slate-500">{thread.createdAt}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-slate-300 mb-4">Goedemorgen iedereen! Hier is mijn eerste opname...</p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{thread.replies} replies</span>
              <span>{thread.views} views</span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <h4 className="font-semibold text-white">Antwoorden</h4>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="p-3 bg-white/3 border border-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={`https://picsum.photos/seed/reply${i}/32/32`} alt="User" className="w-6 h-6 rounded-full" />
                    <span className="text-xs font-semibold text-white">Antwoorder {i}</span>
                  </div>
                  <p className="text-xs text-slate-300">Top feedback! Dit helpt me echt vooruit.</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Schrijf je antwoord..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none mb-3"
            />
            <button
              onClick={handleReply}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Send size={14} />
              Antwoord plaatsen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForumsSection() {
  const [localThreads, setLocalThreads] = useState<HubThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<HubThread | null>(null);

  const allThreads = [...localThreads, ...NETWORK_FORUM_THREADS];

  return (
    <div className="space-y-4 pb-32">
      <div className="max-w-4xl mx-auto px-4 lg:px-6">
        <p className="text-slate-400 text-sm mb-4">Stel vragen over productie, mixing, recording, en groei als artist. Leer van ervaren muzikanten in de community.</p>
        <div className="space-y-3">
          {allThreads.map(thread => (
            <HubThreadRow key={thread.id} thread={thread} onClick={() => setSelectedThread(thread)} />
          ))}
        </div>
      </div>

      <HubPostBar placeholder="Stel je vraag..." onSubmit={title => setLocalThreads([{ id: `forum-${Date.now()}`, categoryId: 'forums', title, author: { name: 'Jij', avatar: 'https://picsum.photos/seed/user/40/40' }, createdAt: 'net nu', replies: 0, views: 0, pinned: false, lastPost: { user: 'Jij', time: 'net nu' }, tags: ['vraag'] }, ...localThreads])} />

      {selectedThread && <HubThreadDetailModal thread={selectedThread} onClose={() => setSelectedThread(null)} onReply={() => {}} />}
    </div>
  );
}

function SpacesSection() {
  const [localThreads, setLocalThreads] = useState<HubThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<HubThread | null>(null);

  const allThreads = [...localThreads, ...NETWORK_SPACE_REVIEWS];

  return (
    <div className="space-y-4 pb-32">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 mb-8">
        <SpacesMap />
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6">
        <p className="text-slate-400 text-sm mb-4">Ontdek repetitieruimtes, opnamestudio's en jamspaces. Lees ervaringen van andere muzikanten en deel je eigen reviews.</p>
        <div className="space-y-3">
          {allThreads.map(thread => (
            <HubThreadRow key={thread.id} thread={thread} onClick={() => setSelectedThread(thread)} />
          ))}
        </div>
      </div>

      <HubPostBar placeholder="Review een ruimte..." onSubmit={title => setLocalThreads([{ id: `space-${Date.now()}`, categoryId: 'spaces', title, author: { name: 'Jij', avatar: 'https://picsum.photos/seed/user/40/40' }, createdAt: 'net nu', replies: 0, views: 0, pinned: false, lastPost: { user: 'Jij', time: 'net nu' }, tags: ['review'] }, ...localThreads])} />

      {selectedThread && <HubThreadDetailModal thread={selectedThread} onClose={() => setSelectedThread(null)} onReply={() => {}} />}
    </div>
  );
}

function NetworkingSection() {
  const [activeGenre, setActiveGenre] = useState('Alle');
  const [localThreads, setLocalThreads] = useState<HubThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<HubThread | null>(null);

  const allThreads = [...localThreads, ...NETWORK_CONNECT_THREADS];
  const filtered = activeGenre === 'Alle' ? allThreads : allThreads.filter(t => t.categoryId === activeGenre);

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

        <div className="space-y-3">
          {filtered.map(thread => (
            <HubThreadRow key={thread.id} thread={thread} onClick={() => setSelectedThread(thread)} />
          ))}
        </div>
      </div>

      <HubPostBar placeholder="Zoek een samenwerkingspartner..." onSubmit={title => setLocalThreads([{ id: `net-${Date.now()}`, categoryId: activeGenre, title, author: { name: 'Jij', avatar: 'https://picsum.photos/seed/user/40/40' }, createdAt: 'net nu', replies: 0, views: 0, pinned: false, lastPost: { user: 'Jij', time: 'net nu' }, tags: ['collab'] }, ...localThreads])} />

      {selectedThread && <HubThreadDetailModal thread={selectedThread} onClose={() => setSelectedThread(null)} onReply={() => {}} />}
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
