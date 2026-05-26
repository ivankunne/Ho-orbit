import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Music, Calendar, BookOpen, FileText, ArrowRight,
  TrendingUp, Loader, Users, Music2, MessageSquare, User,
} from 'lucide-react';
import { fetchArtistProfiles } from '@utils/artistHelpers';
import { search, type SearchResults } from '@services/searchService';
import { usePlayer } from '@context/PlayerContext';

const QUICK_LINKS = [
  { label: 'Artiesten', path: '/artists',   icon: Music },
  { label: 'Evenementen', path: '/events',  icon: Calendar },
  { label: 'Tutorials',  path: '/tutorials', icon: BookOpen },
  { label: 'Magazine',   path: '/magazine', icon: FileText },
  { label: 'Band Space', path: '/bandspace', icon: Music2 },
  { label: 'Forums',     path: '/forums',   icon: MessageSquare },
];

function Hl({ text, query }: { text: string | null; query: string }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-violet-600/30 text-violet-300 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

type FlatItem = { path: string | null; label: string; action: (() => void) | null };

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<SearchResults | null>(null);
  const [loading, setLoading]   = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [focusIndex, setFocusIndex]   = useState(-1);
  const [trendingArtists, setTrendingArtists] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { playTrack } = usePlayer();

  function handlePlayTrack(t: SearchResults['tracks'][0]) {
    playTrack({
      id: t.id,
      title: t.title,
      artist: t.artist_name,
      artistId: t.artist_id,
      genre: t.genre,
      cover_url: t.cover_url,
      stream_url: t.stream_url,
    });
    onClose();
  }

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    fetchArtistProfiles(3).then(setTrendingArtists);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) { setResults(null); setLoading(false); setSearchError(false); return; }
    setLoading(true);
    setSearchError(false);
    debounce.current = setTimeout(async () => {
      try {
        const res = await search(query);
        setResults(res);
        setFocusIndex(-1);
      } catch {
        setSearchError(true);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const flatResults: FlatItem[] = results
    ? [
        ...results.artists.map(a  => ({ path: `/artists/${a.slug}`, label: a.name, action: null })),
        ...results.tracks.map(t   => ({ path: null, label: t.title, action: () => handlePlayTrack(t) })),
        ...results.events.map(e   => ({ path: `/events/${e.id}`, label: e.name, action: null })),
        ...results.tutorials.map(t => ({ path: `/tutorials/${t.id}`, label: t.title, action: null })),
        ...results.articles.map(a  => ({ path: `/magazine/${a.id}`, label: a.title, action: null })),
        ...results.bands.map(b    => ({ path: `/bandspace/${b.id}`, label: b.name, action: null })),
        ...results.users.map(u    => ({ path: `/profiel/${u.username}`, label: u.display_name || u.username, action: null })),
        ...results.threads.map(t  => ({ path: `/forums/thread/${t.id}`, label: t.title, action: null })),
      ]
    : [];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusIndex >= 0) {
      e.preventDefault();
      const item = flatResults[focusIndex];
      if (item.action) { item.action(); }
      else if (item.path) { navigate(item.path); onClose(); }
    }
  }, [flatResults, focusIndex, navigate, onClose]);

  function go(path: string) { navigate(path); onClose(); }

  const totalResults = results
    ? results.artists.length + results.tracks.length + results.events.length +
      results.tutorials.length + results.articles.length + results.bands.length +
      results.users.length + results.threads.length
    : 0;

  let flatIdx = -1;
  const nextIdx = () => { flatIdx++; return flatIdx; };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ animation: 'fadeIn 0.15s ease' }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative mt-4 sm:mt-16 w-[calc(100%-2rem)] max-w-2xl mx-auto bg-[#231d3a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        style={{ animation: 'slideDown 0.2s cubic-bezier(0.34,1.2,0.64,1) both' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-white/8">
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
            placeholder="Zoek artiesten, nummers, bands, events..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-base focus:outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults(null); }} className="text-slate-500 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          )}
          <kbd className="hidden sm:block text-xs text-slate-600 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3">
          {/* Empty state: quick links + trending */}
          {!query && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Snel navigeren</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-4">
                {QUICK_LINKS.map(({ label, path, icon: Icon }) => (
                  <button key={path} onClick={() => go(path)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 text-left transition-colors">
                    <Icon size={15} className="text-violet-400 shrink-0" />
                    <span className="text-sm text-slate-300">{label}</span>
                    <ArrowRight size={13} className="text-slate-600 ml-auto shrink-0" />
                  </button>
                ))}
              </div>
              {trendingArtists.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Trending</p>
                  <div className="space-y-1">
                    {trendingArtists.map(a => (
                      <button key={a.id} onClick={() => go(`/artists/${a.slug || a.id}`)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 w-full text-left transition-colors">
                        <TrendingUp size={14} className="text-slate-600 shrink-0" />
                        <img src={a.image_url} alt={a.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        <span className="text-sm text-slate-300">{a.name}</span>
                        <span className="text-xs text-slate-600 ml-auto">{a.genre}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {query && !loading && searchError && (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm">Zoeken mislukt. Controleer je verbinding.</p>
            </div>
          )}

          {query && !loading && !searchError && totalResults === 0 && (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm">Geen resultaten voor <span className="text-white font-medium">"{query}"</span></p>
              <p className="text-slate-600 text-xs mt-1">Probeer een andere zoekterm</p>
            </div>
          )}

          {query && !searchError && totalResults > 0 && (
            <div className="space-y-4">
              {results!.artists.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Artiesten</p>
                  {results!.artists.map(a => {
                    const fi = nextIdx();
                    return (
                      <button key={a.id} onClick={() => go(`/artists/${a.slug}`)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        {a.image_url
                          ? <img src={a.image_url} alt={a.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          : <div className="w-9 h-9 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0"><Music size={16} className="text-violet-400" /></div>
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate"><Hl text={a.name} query={query} /></p>
                          <p className="text-xs text-slate-500 truncate">{a.genre}{a.location ? ` · ${a.location}` : ''}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </section>
              )}

              {results!.tracks.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Nummers</p>
                  {results!.tracks.map(t => {
                    const fi = nextIdx();
                    return (
                      <button key={t.id} onClick={() => handlePlayTrack(t)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        {t.cover_url
                          ? <img src={t.cover_url} alt={t.title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                          : <div className="w-9 h-9 rounded-lg bg-violet-600/15 flex items-center justify-center shrink-0"><Music size={16} className="text-violet-400" /></div>
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate"><Hl text={t.title} query={query} /></p>
                          <p className="text-xs text-slate-500 truncate">{t.artist_name}{t.genre ? ` · ${t.genre}` : ''}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </section>
              )}

              {results!.bands.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Bands</p>
                  {results!.bands.map(b => {
                    const fi = nextIdx();
                    return (
                      <button key={b.id} onClick={() => go(`/bandspace/${b.id}`)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        {b.image_url
                          ? <img src={b.image_url} alt={b.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                          : <div className="w-9 h-9 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0"><Music2 size={16} className="text-violet-400" /></div>
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate"><Hl text={b.name} query={query} /></p>
                          <p className="text-xs text-slate-500 truncate">{b.genre}{b.location ? ` · ${b.location}` : ''}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </section>
              )}

              {results!.events.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Evenementen</p>
                  {results!.events.map(e => {
                    const fi = nextIdx();
                    return (
                      <button key={e.id} onClick={() => go(`/events/${e.id}`)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <div className="w-9 h-9 bg-violet-600/15 rounded-xl flex items-center justify-center shrink-0">
                          <Calendar size={16} className="text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate"><Hl text={e.name} query={query} /></p>
                          <p className="text-xs text-slate-500 truncate">{e.date}{e.city ? ` · ${e.city}` : ''}{e.venue ? ` · ${e.venue}` : ''}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </section>
              )}

              {results!.users.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Gebruikers</p>
                  {results!.users.map(u => {
                    const fi = nextIdx();
                    return (
                      <button key={u.id} onClick={() => go(`/profiel/${u.username}`)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.display_name || u.username} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          : <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0"><User size={16} className="text-slate-400" /></div>
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate"><Hl text={u.display_name || u.username} query={query} /></p>
                          <p className="text-xs text-slate-500 truncate">@{u.username}{u.location ? ` · ${u.location}` : ''}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </section>
              )}

              {results!.tutorials.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Tutorials</p>
                  {results!.tutorials.map(t => {
                    const fi = nextIdx();
                    return (
                      <button key={t.id} onClick={() => go(`/tutorials/${t.id}`)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center shrink-0">
                          <BookOpen size={16} className="text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate"><Hl text={t.title} query={query} /></p>
                          <p className="text-xs text-slate-500 truncate">{t.difficulty}{t.instructor ? ` · ${t.instructor}` : ''}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </section>
              )}

              {results!.articles.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Artikelen</p>
                  {results!.articles.map(a => {
                    const fi = nextIdx();
                    return (
                      <button key={a.id} onClick={() => go(`/magazine/${a.id}`)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <div className="w-9 h-9 bg-green-500/15 rounded-xl flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate"><Hl text={a.title} query={query} /></p>
                          <p className="text-xs text-slate-500 truncate">{a.category}{a.author ? ` · ${a.author}` : ''}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </section>
              )}

              {results!.threads.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">Forum</p>
                  {results!.threads.map(t => {
                    const fi = nextIdx();
                    return (
                      <button key={t.id} onClick={() => go(`/forums/thread/${t.id}`)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 w-full text-left transition-colors group ${fi === focusIndex ? 'bg-white/8' : ''}`}>
                        <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center shrink-0">
                          <MessageSquare size={16} className="text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate"><Hl text={t.title} query={query} /></p>
                          <p className="text-xs text-slate-500">Forum discussie</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>,
    document.body,
  );
}
