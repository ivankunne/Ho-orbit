import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, ChevronRight, Flame, Sparkles, Play,
  MapPin, Newspaper, Map, Users, Music2, Compass,
  Handshake, Star, UserPlus,
  Building2,
} from 'lucide-react';
import SceneMap from '@components/SceneMap';
import { getGenreColor } from '@data/genreColors';
import { useAuth } from '@context/AuthContext';
import { usePlayer } from '@context/PlayerContext';
import { useAppState } from '@context/AppStateContext';
import { formatPlays } from '@utils/format';
import { TrendingRow } from '@components/TrendingRow';
import { supabase } from '@/lib/supabase';

const GENRE_LABEL: Record<string, string> = {
  nederpop: 'Nederpop', hiphop: 'Hip-Hop', elektronisch: 'Elektronisch',
  jazz: 'Jazz', indie: 'Indie', rnb: 'R&B', rock: 'Rock',
  folk: 'Folk', techno: 'Techno', klassiek: 'Klassiek',
};

const GENRES = ['Alles', 'Nederpop', 'Hip-Hop', 'Elektronisch', 'Jazz', 'Indie', 'R&B', 'Rock'];

const PREV_POSITIONS: Record<number, number | null> = {
  101: 3, 102: 1, 103: 2, 104: 6, 105: 4,
  106: 8, 107: 5, 108: null, 109: 7, 110: 10,
};

export default function HomePage() {
  const [activeGenre, setActiveGenre] = useState('Alles');
  const [artists, setArtists] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [newsArticles, setNewsArticles] = useState<any[]>([]);

  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const { followedArtists, toggleFollow } = useAppState();
  const navigate = useNavigate();
  const preferredGenres = user?.preferredGenres || [];

  useEffect(() => {
    supabase.from('artists').select('*').limit(12).then(({ data }) => setArtists(data ?? []));
    supabase.from('tracks').select('*').order('plays_count', { ascending: false }).limit(10).then(({ data }) => setTracks(data ?? []));
    supabase.from('dutch_cities').select('*').limit(6).then(({ data }) => setCities(data ?? []));
    supabase.from('articles').select('*').order('published_at', { ascending: false }).limit(3).then(({ data }) => setNewsArticles(data ?? []));
  }, []);

  function matchArtistsForGenre(genreId: string) {
    const label = GENRE_LABEL[genreId] || '';
    const lc = label.toLowerCase();
    return artists.filter(a => a.genre?.toLowerCase().includes(lc)).slice(0, 6);
  }

  const filteredTracks = useMemo(() =>
    activeGenre === 'Alles'
      ? tracks
      : tracks.filter(t => t.genre?.toLowerCase().includes(activeGenre.toLowerCase())),
    [activeGenre, tracks]
  );

  const risingArtists = useMemo(() =>
    [...artists].sort((a, b) => (a.followers_count ?? 0) - (b.followers_count ?? 0)).slice(0, 6),
    [artists]
  );

  const featuredArtist = artists[0];

  return (
    <div className="min-h-screen">

      {/* ── Hero — discovery-focused ── */}
      <section className="relative overflow-hidden">
        <img
          src={featuredArtist?.cover_url}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover scale-105 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1528]/70 via-[#1a1528]/85 to-[#1a1528]" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">

            {/* Left: platform intro + featured artist */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Compass size={14} className="text-violet-400" />
                <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
                  Ontdek · Verbind · Luister
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                De Nederlandse <br className="hidden sm:block" />
                muziekscene, <span className="text-violet-400">op één plek</span>
              </h1>
              <p className="text-slate-300 text-base lg:text-lg leading-relaxed mb-8 max-w-xl">
                Vind nieuwe artiesten, ontdek lokale scenes van Amsterdam tot Groningen,
                en maak connecties in de Nederlandse muziekwereld.
              </p>

              {/* Featured artist inline */}
              {featuredArtist && (
                <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm max-w-md">
                  <img
                    src={featuredArtist.image_url}
                    alt={featuredArtist.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-violet-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                      Artiest van de week
                    </p>
                    <p className="text-white font-bold truncate">{featuredArtist.name}</p>
                    <p className="text-slate-400 text-xs">{featuredArtist.genre} · {featuredArtist.location?.split(',')[0]}</p>
                  </div>
                  <button
                    onClick={() => {
                      const firstTrack = tracks.find(t => t.artist_id === featuredArtist.id) || tracks[0];
                      if (firstTrack) playTrack(firstTrack, tracks);
                    }}
                    className="shrink-0 w-10 h-10 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center transition-colors"
                  >
                    <Play size={16} className="text-white ml-0.5" fill="white" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: quick stats */}
            <div className="flex items-center gap-6 lg:gap-8">
              {[
                { n: artists.length ? artists.length + '+' : '—', label: 'Artiesten' },
                { n: cities.length || '—', label: 'Steden' },
                { n: '50+', label: 'Venues' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl lg:text-3xl font-bold text-white">{s.n}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-16">

        {/* ── Trending Artists ── */}
        <section className="pt-10 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white">Nu trending</h2>
            </div>
            <Link to="/artists" className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Alle artiesten <ChevronRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {artists.slice(0, 6).map((artist, i) => {
              const gc = getGenreColor(artist.genre);
              return (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5">
                      <Flame size={9} className="text-amber-400" fill="currentColor" />
                      <span className="text-[9px] font-bold text-amber-300">#{i + 1}</span>
                    </div>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center">
                        <Play size={14} className="text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{artist.location?.split(',')[0]}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1.5 inline-block ${gc.bg} ${gc.text}`}>
                      {artist.genre?.split(' / ')[0]}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Zoek samenwerking (Collaboration Board) — hidden when empty ── */}
        {false && (
          <section className="pb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Handshake size={18} className="text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Zoek samenwerking</h2>
              </div>
              <Link to="/forums" className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                Alle oproepen <ChevronRight size={15} />
              </Link>
            </div>
          </section>
        )}

        {/* ── Nieuw op h-orbit (Rising Artists) ── */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-400" />
              <h2 className="text-xl font-bold text-white">Nieuw op h-orbit</h2>
            </div>
            <Link to="/artists" className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Ontdek meer <ChevronRight size={15} />
            </Link>
          </div>
          <p className="text-slate-400 text-sm mb-5 max-w-2xl">
            Opkomende artiesten die net begonnen zijn. Volg ze en ontdek hun muziek als eerste.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {risingArtists.map(artist => {
              const isFollowing = followedArtists.includes(artist.id);
              const gc = getGenreColor(artist.genre);
              return (
                <div
                  key={artist.id}
                  className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                >
                  <Link to={`/artists/${artist.id}`} className="block">
                    <div className="relative aspect-square overflow-hidden">
                      <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute top-2 left-2">
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">
                          NIEUW
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const firstTrack = tracks.find(t => t.artist_id === artist.id) || tracks[0];
                            if (firstTrack) playTrack(firstTrack, tracks);
                          }}
                          className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center"
                        >
                          <Play size={14} className="text-white ml-0.5" fill="white" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-xs text-slate-300">{formatPlays(artist.followers_count)} volgers</p>
                      </div>
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link to={`/artists/${artist.id}`}>
                      <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                    </Link>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${gc.bg} ${gc.text}`}>
                      {artist.genre?.split(' / ')[0]}
                    </span>
                    <button
                      onClick={() => toggleFollow(artist.id)}
                      className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                        isFollowing
                          ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                          : 'bg-white/5 text-slate-300 hover:bg-violet-600 hover:text-white border border-white/10'
                      }`}
                    >
                      <UserPlus size={11} />
                      {isFollowing ? 'Volgend' : 'Volgen'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Oefenruimtes (Rehearsal Spaces) — hidden when no data ── */}
        {false && (
          <section className="pb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-violet-400" />
                <h2 className="text-xl font-bold text-white">Oefenruimtes & studio's</h2>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-5 max-w-2xl">
              Vind repetitieruimtes, studio's en jamspaces bij jou in de buurt.
            </p>
          </section>
        )}

        {/* ── Personalized recommendations ── */}
        {preferredGenres.slice(0, 2).map(genreId => {
          const matched = matchArtistsForGenre(genreId);
          if (!matched.length) return null;
          const label = GENRE_LABEL[genreId] || genreId;
          return (
            <section key={genreId} className="pb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-violet-400" />
                <h2 className="text-lg font-bold text-white">Omdat je houdt van {label}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {matched.map(artist => {
                  const gc = getGenreColor(artist.genre);
                  return (
                    <Link
                      key={artist.id}
                      to={`/artists/${artist.id}`}
                      className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${gc.bg} ${gc.text}`}>
                          {artist.genre?.split(' / ')[0]}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── Chart + Connect sidebar ── */}
        <section className="pb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Top 10 chart */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-violet-400" />
                  <h2 className="text-xl font-bold text-white">Nederlandse Top 10</h2>
                </div>
                <span className="text-xs text-slate-600 hidden sm:block">Week van 24 mrt</span>
              </div>

              {/* Genre pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2" style={{ scrollbarWidth: 'none' }}>
                {GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setActiveGenre(genre)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      activeGenre === genre
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                <span className="w-8 text-center">#</span>
                <span className="w-10 shrink-0" />
                <span className="flex-1">Nummer</span>
                <span className="hidden sm:block w-10 text-right">Duur</span>
                <span className="hidden md:block w-14 text-right">Streams</span>
                <span className="w-8" />
              </div>
              <div className="bg-white/2 border border-white/5 rounded-2xl overflow-hidden">
                {(filteredTracks.length ? filteredTracks : tracks).map((track, i) => (
                  <div key={track.id} className={i < tracks.length - 1 ? 'border-b border-white/5' : ''}>
                    <TrendingRow track={track} rank={i + 1} queue={filteredTracks.length ? filteredTracks : tracks} prevPosition={PREV_POSITIONS[track.id]} />
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar: connect & spotlight */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-violet-400" />
                <h2 className="text-lg font-bold text-white">Maak connecties</h2>
              </div>
              <div className="space-y-3 mb-8">
                {artists.slice(0, 5).map(artist => (
                  <Link
                    key={artist.id}
                    to={`/artists/${artist.id}`}
                    className="flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-colors group"
                  >
                    <img
                      src={artist.image_url}
                      alt={artist.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                        {artist.verified && (
                          <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-white text-[8px] font-bold">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-violet-400">{artist.genre?.split(' / ')[0]}</p>
                      <p className="text-xs text-slate-500">{artist.location?.split(',')[0]}</p>
                    </div>
                    <Music2 size={14} className="text-slate-600 group-hover:text-violet-400 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>

              {/* Featured artist card */}
              {artists[2] && (
                <div className="relative rounded-2xl overflow-hidden">
                  <img
                    src={artists[2]?.cover_url}
                    alt="Uitgelichte artiest"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-[#1a1528]/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-1">Uitgelichte artiest</p>
                    <p className="text-white font-bold">{artists[2]?.name}</p>
                    <p className="text-slate-300 text-xs">{artists[2]?.genre} · {artists[2]?.location?.split(',')[0]}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Scènekaart ── */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Map size={18} className="text-violet-400" />
              <h2 className="text-xl font-bold text-white">Scènekaart</h2>
            </div>
            <Link to="/dutch-scene" className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Alle scenes <ChevronRight size={15} />
            </Link>
          </div>
          <p className="text-slate-400 text-sm mb-5 max-w-2xl">
            Zoom in op een stad om venues te ontdekken. Klik op een marker voor meer info.
          </p>
          <SceneMap />
        </section>

        {/* ── Cities & Their Sounds ── */}
        {cities.length > 0 && (
          <section className="pb-12">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-violet-400" />
                <h2 className="text-xl font-bold text-white">Steden & hun geluid</h2>
              </div>
              <Link to="/dutch-scene" className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                Bekijk alles <ChevronRight size={15} />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {cities.slice(0, 6).map(city => (
                <Link
                  key={city.id}
                  to={`/dutch-scene/${city.slug}`}
                  className="group shrink-0 w-72 bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={city.image_url}
                      alt={city.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#231d3a]/90 via-[#231d3a]/30 to-transparent" />
                    <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
                      <MapPin size={12} className="text-violet-400" />
                      <h3 className="font-bold text-white">{city.name}</h3>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(city.genres ?? []).slice(0, 3).map((g: string) => (
                        <span key={g} className="text-[10px] bg-violet-600/15 text-violet-400 px-2 py-0.5 rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Dutch Scene News ── */}
        {newsArticles.length > 0 && (
          <section className="pb-12">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Newspaper size={18} className="text-violet-400" />
                <h2 className="text-xl font-bold text-white">Uit de scene</h2>
              </div>
              <Link to="/magazine" className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                Meer lezen <ChevronRight size={15} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {newsArticles.slice(0, 3).map(item => (
                <div
                  key={item.id}
                  className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={item.cover_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-sm leading-snug mb-2 group-hover:text-violet-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.excerpt}</p>
                    <p className="text-xs text-slate-500">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
