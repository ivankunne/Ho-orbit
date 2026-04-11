import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Music, Calendar, BookOpen, FileText, ArrowRight, TrendingUp, Loader } from 'lucide-react';
import { artists } from '@data/mockData';
import { search } from '@services/searchService';

const QUICK_LINKS = [
  { label: 'Artiesten', path: '/artists', icon: Music },
  { label: 'Evenementen', path: '/events', icon: Calendar },
  { label: 'Tutorials', path: '/tutorials', icon: BookOpen },
  { label: 'Magazine', path: '/magazine', icon: FileText },
];

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-violet-600/30 text-violet-300 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchOverlay({ onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);

  const inputRef  = useRef(null);
  const debounce  = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await search(query);
        setResults(res);
        setFocusIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(debounce.current);
  }, [query]);

  // Flatten results for keyboard nav
  const flatResults = results
    ? [
        ...results.artists.map(a => ({ path: `/artists/${a.id}`, label: a.name })),
        ...results.tracks.map(t  => ({ path: `/artists/${t.artistId}`, label: t.title })),
        ...results.events.map(e  => ({ path: `/events/${e.id}`, label: e.title })),
        ...results.tutorials.map(t => ({ path: `/tutorials/${t.id}`, label: t.title })),
        ...results.articles.map(a => ({ path: `/magazine/${a.id}`, label: a.title })),
      ]
    : [];

  const handleKeyDown = useCallback((e) => {
    if (flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusIndex >= 0) {
      e.preventDefault();
      navigate(flatResults[focusIndex].path);
      onClose();
    }
  }, [flatResults, focusIndex, navigate, onClose]);

  function go(path) {
    navigate(path);
    onClose();
  }

  const hasResults = results && (
    results.artists.length + results.tracks.length + results.events.length +
    results.tutorials.length + results.articles.length > 0
  );

  // Running flat index for focus tracking
  let flatIdx = -1;
  const nextIdx = () => { flatIdx++; return flatIdx; };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col" style={{ animation: 'fadeIn 0.15s ease' }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative mx-auto mt-16 w-full max-w-2xl bg-[#231d3a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        style={{ animation: 'slideDown 0.2s cubic-bezier(0.34,1.2,0.64,1) both' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
          {loading
            ? <Loader size={18} className="text-violet-400 shrink-0 animate-spin" />
            : <Search size={20} className="text-slate-400 shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zoek artiesten, evenementen, tutorials..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-base focus:outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults(null); }} className="text-slate-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
          <kbd className="hidden sm:block text-xs text-slate-600 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {/* Empty query: quick links + trending */}
          {!query && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Snel navigeren</p>
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {QUICK_LINKS.map(({ label, path, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => go(path)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 text-left transition-colors"
                  >
                    <Icon size={16} className="text-violet-400 shrink-0" />
                    <span className="text-sm text-slate-300">{label}</span>
                    <ArrowRight size={14} className="text-slate-600 ml-auto" />
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Trending</p>
              <div className="space-y-1">
                {artists.slice(0, 3).map(a => (
                  <button key={a.id} onClick={() => go(`/artists/${a.id}`)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 w-full text-left transition-colors">
                    <TrendingUp size={14} className="text-slate-600 shrink-0" />
                    <img src={a.image} alt={a.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    <span className="text-sm text-slate-300">{a.name}</span>
                    <span className="text-xs text-slate-600 ml-auto">{a.genre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {query && !loading && !hasResults && (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm">Geen resultaten voor <span className="text-white font-medium">"{query}"</span></p>
              <p className="text-slate-600 text-xs mt-1">Probeer een andere zoekterm</p>
            </div>
          )}

          {/* Results */}
          {query && hasResults && (
            <div className="space-y-4">
              {results.artists.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Artiesten</p>
                  {results.artists.map(a => {
                    const fi = nextIdx();
                    return (
                      <button key={a.id} onClick={() => go(`/artists/${a.id}`)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <img src={a.image} alt={a.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{highlight(a.name, query)}</p>
                          <p className="text-xs text-slate-500 truncate">{a.genre} · {a.location}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {results.tracks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Nummers</p>
                  {results.tracks.map(t => {
                    const fi = nextIdx();
                    return (
                      <button key={t.id} onClick={() => go(`/artists/${t.artistId}`)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <img src={t.cover} alt={t.title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{highlight(t.title, query)}</p>
                          <p className="text-xs text-slate-500 truncate">{t.artist} · {t.genre}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {results.events.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Evenementen</p>
                  {results.events.map(e => {
                    const fi = nextIdx();
                    return (
                      <button key={e.id} onClick={() => go(`/events/${e.id}`)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <div className="w-9 h-9 bg-violet-600/15 rounded-xl flex items-center justify-center shrink-0">
                          <Calendar size={16} className="text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{highlight(e.title, query)}</p>
                          <p className="text-xs text-slate-500 truncate">{e.date} · {e.venue}, {e.city}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {results.tutorials.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Tutorials</p>
                  {results.tutorials.map(t => {
                    const fi = nextIdx();
                    return (
                      <button key={t.id} onClick={() => go(`/tutorials/${t.id}`)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center shrink-0">
                          <BookOpen size={16} className="text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{highlight(t.title, query)}</p>
                          <p className="text-xs text-slate-500 truncate">{t.difficulty} · {t.instructor}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {results.articles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Artikelen</p>
                  {results.articles.map(a => {
                    const fi = nextIdx();
                    return (
                      <button key={a.id} onClick={() => go(`/magazine/${a.id}`)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <div className="w-9 h-9 bg-green-500/15 rounded-xl flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{highlight(a.title, query)}</p>
                          <p className="text-xs text-slate-500 truncate">{a.category} · {a.author}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
