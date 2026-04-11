import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, ChevronRight, Disc, Flame, Sparkles, Play } from 'lucide-react';
import { featuredArtist, tracks, genres, artists, weeklyTracks, monthlyTracks } from '@data/mockData';
import { getGenreColor } from '@data/genreColors';
import { useAuth } from '@context/AuthContext';
import { usePlayer } from '@context/PlayerContext';
import { formatPlays } from '@utils/format';
import { MusicCard } from '@components/MusicCard';
import { TrendingRow } from '@components/TrendingRow';

const GENRE_LABEL = {
  nederpop: 'Nederpop', hiphop: 'Hip-Hop', elektronisch: 'Elektronisch',
  jazz: 'Jazz', indie: 'Indie', rnb: 'R&B', rock: 'Rock',
  folk: 'Folk', techno: 'Techno', klassiek: 'Klassiek',
};

function matchArtistsForGenre(genreId) {
  const label = GENRE_LABEL[genreId] || '';
  const lc = label.toLowerCase();
  return artists.filter(a => a.genre.toLowerCase().includes(lc)).slice(0, 4);
}

// Previous chart positions — positive diff = climbed, null = new entry
const PREV_POSITIONS = { 101: 3, 102: 1, 103: 2, 104: 6, 105: 4, 106: 8, 107: 5, 108: null, 109: 7, 110: 10 };

export default function HomePage() {
  const [activeGenre, setActiveGenre] = useState('Alles');
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const preferredGenres = user?.preferredGenres || [];

  const filteredTracks = useMemo(() =>
    activeGenre === 'Alles'
      ? tracks
      : tracks.filter(t => t.genre.toLowerCase().includes(activeGenre.toLowerCase())),
    [activeGenre]
  );

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={featuredArtist.cover}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1528] via-[#1a1528]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-20 lg:py-32">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-violet-600/20 text-violet-400 text-xs font-semibold px-3 py-1 rounded-full">
                <TrendingUp size={11} />
                Artiest van de Week
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-3">
              {featuredArtist.name}
            </h1>
            <p className="text-violet-400 font-medium mb-4">{featuredArtist.genre} · {featuredArtist.location}</p>
            <p className="text-slate-300 text-base leading-relaxed mb-8 line-clamp-3">
              {featuredArtist.bio}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const firstTrack = tracks.find(t => t.artistId === featuredArtist.id) || tracks[0];
                  playTrack(firstTrack, tracks);
                }}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <Play size={18} fill="white" />
                Afspelen
              </button>
              <Link
                to={`/artists/${featuredArtist.id}`}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Bekijk profiel
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-8">
              <div>
                <p className="text-xl font-bold text-white">{formatPlays(featuredArtist.monthlyListeners)}</p>
                <p className="text-xs text-slate-400">Maandelijkse luisteraars</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-xl font-bold text-white">{formatPlays(featuredArtist.followers)}</p>
                <p className="text-xs text-slate-400">Volgers</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-xl font-bold text-white">{featuredArtist.albums.length}</p>
                <p className="text-xs text-slate-400">Albums</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-16">

        {/* Nu Trending strip */}
        <section className="pt-8 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white">Nu trending</h2>
            </div>
            <Link to="/artists" className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Alle artiesten <ChevronRight size={15} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {artists.slice(0, 8).map((artist, i) => {
              const gc = getGenreColor(artist.genre);
              return (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className="group shrink-0 w-36 bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                >
                  <div className="relative h-28 overflow-hidden">
                    <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5">
                      <Flame size={9} className="text-amber-400" fill="currentColor" />
                      <span className="text-[9px] font-bold text-amber-300">#{i + 1}</span>
                    </div>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center">
                        <Play size={12} className="text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-white truncate">{artist.name}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${gc.bg} ${gc.text}`}>
                      {artist.genre.split(' / ')[0]}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Gepersonaliseerde secties */}
        {preferredGenres.slice(0, 2).map(genreId => {
          const matched = matchArtistsForGenre(genreId);
          if (!matched.length) return null;
          const label = GENRE_LABEL[genreId] || genreId;
          return (
            <section key={genreId} className="pt-6 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-violet-400" />
                <h2 className="text-lg font-bold text-white">Omdat je houdt van {label}</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {matched.map(artist => {
                  const gc = getGenreColor(artist.genre);
                  return (
                    <Link
                      key={artist.id}
                      to={`/artists/${artist.id}`}
                      className="group shrink-0 w-36 bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                    >
                      <div className="relative h-28 overflow-hidden">
                        <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-white truncate">{artist.name}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${gc.bg} ${gc.text}`}>
                          {artist.genre.split(' / ')[0]}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Genre Filter */}
        <section className="py-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {genres.map(genre => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeGenre === genre
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        {/* Deze Week */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Deze week</h2>
              <p className="text-sm text-slate-400">Topkeuzes van de afgelopen 7 dagen</p>
            </div>
            <button onClick={() => navigate('/artists')} className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Alle artiesten <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {weeklyTracks.map(track => (
              <MusicCard key={track.id} track={track} queue={weeklyTracks} />
            ))}
          </div>
        </section>

        {/* Deze Maand */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Deze maand</h2>
              <p className="text-sm text-slate-400">Opvallende releases van maart</p>
            </div>
            <button onClick={() => navigate('/artists')} className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Alle artiesten <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {monthlyTracks.map(track => (
              <MusicCard key={track.id} track={track} queue={monthlyTracks} />
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Trending chart */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-violet-400" />
                <h2 className="text-xl font-bold text-white">Nederlandse Top 10</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 hidden sm:block">Week van 24 mrt</span>
                <button onClick={() => navigate('/artists')} className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  Alles bekijken <ChevronRight size={16} />
                </button>
              </div>
            </div>
            {/* Column headers */}
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

          {/* Spotlight Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">In de spotlight</h2>
              <Link to="/artists" className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                Alle artiesten <ChevronRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {artists.slice(0, 5).map(artist => (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className="flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-colors group"
                >
                  <img
                    src={artist.image}
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
                    <p className="text-xs text-slate-400">{artist.genre}</p>
                    <p className="text-xs text-slate-500">{formatPlays(artist.monthlyListeners)} maandelijkse luisteraars</p>
                  </div>
                  <Disc size={14} className="text-slate-600 group-hover:text-violet-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>

            {/* Featured Dutch Artist */}
            <div className="mt-6 relative rounded-2xl overflow-hidden">
              <img
                src={artists[2].cover}
                alt="Uitgelichte artiest"
                className="w-full h-40 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-[#1a1528]/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-1">Uitgelichte artiest</p>
                <p className="text-white font-bold">{artists[2].name}</p>
                <p className="text-slate-300 text-xs">{artists[2].genre} · {artists[2].location}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
