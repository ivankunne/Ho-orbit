import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Sliders, Users, Calendar, Coffee, Pin, ChevronLeft, X, Send } from 'lucide-react';
import { forumCategories, forumThreads } from '@data/mockData';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';

const iconMap = { MessageSquare, Sliders, Users, Calendar, Coffee };
const colorMap = {
  blue:   'bg-blue-500/20 text-blue-400',
  green:  'bg-green-500/20 text-green-400',
  orange: 'bg-violet-600/20 text-violet-400',
  purple: 'bg-purple-500/20 text-purple-400',
  gray:   'bg-white/10 text-slate-400',
};

function CategoryCard({ cat, onClick }) {
  const Icon = iconMap[cat.icon] || MessageSquare;
  return (
    <div
      onClick={() => onClick(cat)}
      className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[cat.color]}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{cat.name}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{cat.threadCount} discussies</span>
              <span>{cat.postCount} reacties</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-3">{cat.description}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Laatste:</span>
            <span className="text-xs text-slate-300 truncate">{cat.lastPost.threadTitle}</span>
            <span className="text-xs text-slate-500 shrink-0">· {cat.lastPost.time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadRow({ thread }) {
  return (
    <Link
      to={`/forums/thread/${thread.id}`}
      className="flex items-center gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-colors group"
    >
      <img src={thread.author.avatar} alt={thread.author.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {thread.pinned && <Pin size={12} className="text-violet-400 shrink-0" />}
          <span className="font-medium text-white group-hover:text-violet-300 transition-colors truncate">{thread.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>door {thread.author.name}</span>
          <span>· {thread.createdAt}</span>
          {thread.tags.map(tag => (
            <span key={tag} className="bg-white/6 text-slate-400 px-1.5 py-0.5 rounded hidden sm:inline">{tag}</span>
          ))}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-white">{thread.replies}</p>
        <p className="text-xs text-slate-500">reacties</p>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs text-slate-500">{thread.lastPost.user}</p>
        <p className="text-xs text-slate-600">{thread.lastPost.time}</p>
      </div>
    </Link>
  );
}

function NewThreadModal({ defaultCategory, categories, onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategory?.id ?? categories[0]?.id ?? 1);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 3) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSubmit({ title: title.trim(), body: body.trim(), categoryId: Number(categoryId), tags });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#231d3a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">Nieuwe discussie</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categorie</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id} className="bg-[#231d3a]">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Waar gaat je discussie over?"
              maxLength={120}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Bericht *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Vertel de community wat je wilt bespreken..."
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Labels (max 3)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Voeg label toe..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={tags.length >= 3}
                className="px-3 py-2 bg-white/8 hover:bg-white/12 text-sm text-slate-300 rounded-xl transition-colors disabled:opacity-40"
              >
                +
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-violet-600/20 text-violet-300 text-xs px-2.5 py-1 rounded-full">
                    {t}
                    <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              Annuleren
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !body.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} /> Plaatsen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ThreadList({ category, allCategories, onBack, localThreads, onNewThread }) {
  const threads = [...localThreads, ...forumThreads].filter(t => t.categoryId === category.id);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
        <ChevronLeft size={16} /> Forums
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{category.name}</h2>
          <p className="text-sm text-slate-400">{category.description}</p>
        </div>
        <button
          onClick={() => onNewThread(category)}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          Nieuwe discussie
        </button>
      </div>
      <div className="space-y-2">
        {threads.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Nog geen discussies in deze categorie.</div>
        ) : (
          threads.map(thread => <ThreadRow key={thread.id} thread={thread} />)
        )}
      </div>
    </div>
  );
}

export default function ForumsPage() {
  const { user } = useAuth();
  const addToast = useToast();
  const [view, setView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadCategory, setNewThreadCategory] = useState(null);
  const [localThreads, setLocalThreads] = useState([]);

  const openNewThread = (cat = null) => {
    setNewThreadCategory(cat);
    setShowNewThread(true);
  };

  const handleSubmitThread = ({ title, body, categoryId, tags }) => {
    const thread = {
      id: `local-${Date.now()}`,
      categoryId,
      title,
      body,
      tags,
      pinned: false,
      replies: 0,
      createdAt: 'zojuist',
      author: {
        name: user?.displayName || user?.username || 'Jij',
        avatar: user?.avatar || 'https://picsum.photos/seed/me/40/40',
      },
      lastPost: { user: user?.displayName || 'Jij', time: 'zojuist' },
    };
    setLocalThreads(prev => [thread, ...prev]);
    setShowNewThread(false);
    addToast('Discussie geplaatst!', 'success');

    // Navigate to that category if not already there
    const cat = forumCategories.find(c => c.id === categoryId);
    if (cat) { setSelectedCategory(cat); setView('threads'); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10">
      {view === 'categories' && (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Forums</h1>
              <p className="text-slate-400">Gemeenschapsdiscussies, gear talk, samenwerkingen en meer</p>
            </div>
            <button
              onClick={() => openNewThread()}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Nieuwe discussie
            </button>
          </div>

          <div className="space-y-3">
            {forumCategories.map(cat => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                onClick={(c) => { setSelectedCategory(c); setView('threads'); }}
              />
            ))}
          </div>

          {/* Recente activiteit */}
          <div className="mt-10">
            <h2 className="text-lg font-bold text-white mb-4">Recente activiteit</h2>
            <div className="space-y-2">
              {[...localThreads, ...forumThreads].map(thread => (
                <Link
                  key={thread.id}
                  to={`/forums/thread/${thread.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-white/4 rounded-xl transition-colors group"
                >
                  <img src={thread.author.avatar} alt={thread.author.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white group-hover:text-violet-300 transition-colors truncate">{thread.title}</p>
                    <p className="text-xs text-slate-500">{thread.author.name} · {thread.lastPost.time}</p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{thread.replies} reacties</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'threads' && selectedCategory && (
        <ThreadList
          category={selectedCategory}
          allCategories={forumCategories}
          onBack={() => setView('categories')}
          localThreads={localThreads}
          onNewThread={openNewThread}
        />
      )}

      {showNewThread && (
        <NewThreadModal
          defaultCategory={newThreadCategory}
          categories={forumCategories}
          onSubmit={handleSubmitThread}
          onClose={() => setShowNewThread(false)}
        />
      )}
    </div>
  );
}
