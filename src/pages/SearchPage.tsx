import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Music, Play, Calendar, BookOpen, FileText, Users, User, MessageSquare,
  Headphones, GraduationCap, Loader,
} from 'lucide-react';
import { search, EMPTY_RESULTS, type SearchResults } from '@services/searchService';
import { useGenres } from '@context/GenreContext';
import { usePlayer } from '@context/PlayerContext';
import { optimizedImage } from '@lib/image';
import { GenreBanner } from '@components/SearchOverlay';
import EventPhaseBadge from '@components/EventPhaseBadge';

// Per soort; ruim genoeg voor "alles in dit genre" zonder de pagina te verzuipen.
const LIMIT = 40;

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="min-w-0">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {title} <span className="text-slate-600">({count})</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{children}</div>
    </section>
  );
}

const rowClass = 'flex items-center gap-3 min-w-0 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] text-left transition-colors';

function Row({ to, onClick, icon, title, meta, badge }: {
  to?: string; onClick?: () => void; icon: ReactNode; title: string; meta?: string; badge?: ReactNode;
}) {
  const body = (
    <>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{title}</p>
        {meta && <p className="text-xs text-slate-500 truncate">{meta}</p>}
      </div>
      {badge}
    </>
  );
  return to
    ? <Link to={to} className={rowClass}>{body}</Link>
    : <button type="button" onClick={onClick} className={rowClass}>{body}</button>;
}

const thumb = (url: string | null | undefined, alt: string, round = false) =>
  <img decoding="async" loading="lazy" src={optimizedImage(url, 40)} alt={alt} className={`w-10 h-10 ${round ? 'rounded-full' : 'rounded-lg'} object-cover shrink-0`} />;

const iconBox = (Icon: typeof Music, color: string) =>
  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}><Icon size={17} /></div>;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const { groups } = useGenres();
  const { playTrack } = usePlayer();
  const requestId = useRef(0);

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    const id = ++requestId.current;
    if (q.length < 2) { setResults(EMPTY_RESULTS); setLoading(false); return; }
    setLoading(true); setFailed(false);
    search(q, { groups, limit: LIMIT })
      .then(res => { if (id === requestId.current) setResults(res); })
      .catch(() => { if (id === requestId.current) { setFailed(true); setResults(EMPTY_RESULTS); } })
      .finally(() => { if (id === requestId.current) setLoading(false); });
  }, [q, groups]);

  const r = results;
  const total = r.artists.length + r.tracks.length + r.events.length + r.tutorials.length +
    r.articles.length + r.bands.length + r.users.length + r.threads.length +
    r.podcasts.length + r.masterclasses.length;

  return (
    <div className="min-h-screen w-full max-w-5xl mx-auto px-4 lg:px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-4">Zoeken</h1>

      <form
        role="search"
        onSubmit={e => { e.preventDefault(); setParams(input.trim() ? { q: input.trim() } : {}); }}
        className="flex items-center gap-3 px-4 py-3 mb-6 rounded-2xl bg-white/[0.04] border border-white/10 focus-within:border-violet-500/50"
      >
        {loading ? <Loader size={18} className="text-violet-400 shrink-0 animate-spin" /> : <Search size={18} className="text-slate-400 shrink-0" />}
        <input
          type="search"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Zoek artiesten, nummers, genres, events..."
          aria-label="Zoekterm"
          className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-500 text-base focus:outline-none"
        />
        <button type="submit" className="shrink-0 min-h-[40px] px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-colors">
          Zoek
        </button>
      </form>

      {q.length < 2 && <p className="text-slate-500 text-sm">Typ minstens twee tekens, bijvoorbeeld een artiest, nummer, stad of genre.</p>}

      {failed && <p className="text-slate-400 text-sm">Zoeken mislukt. Controleer je verbinding.</p>}

      {q.length >= 2 && !loading && !failed && total === 0 && (
        <div className="py-10 text-center">
          {r.genre
            ? <p className="text-slate-400 text-sm">Nog niets in het genre <span className="text-white font-medium">{r.genre.label}</span>.</p>
            : <p className="text-slate-400 text-sm">Geen resultaten voor <span className="text-white font-medium">&ldquo;{q}&rdquo;</span>.</p>}
        </div>
      )}

      {q.length >= 2 && total > 0 && (
        <div className={`space-y-7 ${loading ? 'opacity-60' : ''}`}>
          {r.genre && <GenreBanner genre={r.genre} />}
          <p className="text-sm text-slate-500">{total} resultaten voor &ldquo;{q}&rdquo;</p>

          <Section title="Nummers" count={r.tracks.length}>
            {r.tracks.map(t => (
              <Row key={t.id} title={t.title} meta={[t.artist_name, t.genre].filter(Boolean).join(' · ')}
                icon={thumb(t.cover_url, t.title)}
                badge={<Play size={15} className="text-violet-400 shrink-0" />}
                onClick={() => playTrack({
                  id: t.id, title: t.title, artist: t.artist_name, artistId: t.artist_id,
                  genre: t.genre, cover_url: t.cover_url, stream_url: t.stream_url,
                })} />
            ))}
          </Section>

          <Section title="Artiesten" count={r.artists.length}>
            {r.artists.map(a => (
              <Row key={a.id} to={`/artists/${a.slug || a.id}`} title={a.name}
                meta={[a.genre, a.location].filter(Boolean).join(' · ')}
                icon={a.image_url ? thumb(a.image_url, a.name, true) : iconBox(Music, 'bg-violet-600/20 text-violet-400')} />
            ))}
          </Section>

          <Section title="Evenementen" count={r.events.length}>
            {r.events.map(e => (
              <Row key={e.id} to={`/events/${e.id}`} title={e.name}
                meta={[e.date, e.city, e.venue].filter(Boolean).join(' · ')}
                icon={e.poster_url ? thumb(e.poster_url, e.name) : iconBox(Calendar, 'bg-green-500/15 text-green-400')}
                badge={<EventPhaseBadge date={e.date} className="shrink-0" />} />
            ))}
          </Section>

          <Section title="Bands" count={r.bands.length}>
            {r.bands.map(b => (
              <Row key={b.id} to={`/bandspace/${b.id}`} title={b.name}
                meta={[b.genre, b.location].filter(Boolean).join(' · ')}
                icon={b.image_url ? thumb(b.image_url, b.name) : iconBox(Users, 'bg-blue-500/15 text-blue-400')} />
            ))}
          </Section>

          <Section title="Podcasts" count={r.podcasts.length}>
            {r.podcasts.map(pc => (
              <Row key={pc.id} to={`/podcasts/${pc.id}`} title={pc.title} meta={pc.genre ?? 'Podcast'}
                icon={pc.cover_image_url ? thumb(pc.cover_image_url, pc.title) : iconBox(Headphones, 'bg-pink-500/15 text-pink-400')} />
            ))}
          </Section>

          <Section title="Tutorials" count={r.tutorials.length}>
            {r.tutorials.map(t => (
              <Row key={t.id} to={`/tutorials/${t.id}`} title={t.title}
                meta={[t.instructor, t.difficulty].filter(Boolean).join(' · ')}
                icon={iconBox(BookOpen, 'bg-amber-500/15 text-amber-400')} />
            ))}
          </Section>

          <Section title="Masterclasses" count={r.masterclasses.length}>
            {r.masterclasses.map(m => (
              <Row key={m.id} to="/masterclass" title={m.title} meta={m.instructor_name ?? 'Masterclass'}
                icon={iconBox(GraduationCap, 'bg-emerald-500/15 text-emerald-400')} />
            ))}
          </Section>

          <Section title="Gebruikers" count={r.users.length}>
            {r.users.map(u => (
              <Row key={u.id} to={`/profiel/${u.username}`} title={u.display_name || u.username}
                meta={[`@${u.username}`, u.location].filter(Boolean).join(' · ')}
                icon={u.avatar_url ? thumb(u.avatar_url, u.username, true) : iconBox(User, 'bg-white/10 text-slate-400')} />
            ))}
          </Section>

          <Section title="Artikelen" count={r.articles.length}>
            {r.articles.map(a => (
              <Row key={a.id} to={`/magazine/${a.id}`} title={a.title}
                meta={[a.category, a.author].filter(Boolean).join(' · ')}
                icon={iconBox(FileText, 'bg-purple-500/15 text-purple-400')} />
            ))}
          </Section>

          <Section title="Forum" count={r.threads.length}>
            {r.threads.map(t => (
              <Row key={t.id} to={`/forums/thread/${t.id}`} title={t.title}
                icon={iconBox(MessageSquare, 'bg-orange-500/15 text-orange-400')} />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
