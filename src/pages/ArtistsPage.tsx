import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, ChevronRight, BadgeCheck, ArrowUpDown } from 'lucide-react';
import { artists } from '@data/mockData';
import { getGenreColor } from '@data/genreColors';
import EmptyState from '@components/EmptyState';
import BlurImage from '@components/BlurImage';

function formatFollowers(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

const locations = ['Alle steden', 'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Nijmegen'];
const allGenres = ['Alle genres', 'Nederpop', 'Hip-Hop', 'Elektronisch', 'Bluesrock', 'R&B', 'Jazz', 'Psych-Pop', 'Indie'];

const SORT_OPTIONS = [
  { value: 'trending',  label: 'Trending' },
  { value: 'followers', label: 'Meeste volgers' },
  { value: 'az',        label: 'A–Z' },
];

export default function ArtistsPage() {
  const [locationFilter, setLocationFilter] = useState('Alle steden');
  const [genreFilter, setGenreFilter] = useState('Alle genres');
  const [sortBy, setSortBy] = useState('trending');

  const filtered = useMemo(() =>
    artists.filter(a => {
      const locMatch = locationFilter === 'Alle steden' ||
        a.location.toLowerCase().includes(locationFilter.toLowerCase());
      const genreMatch = genreFilter === 'Alle genres' ||
        a.genre.toLowerCase().includes(genreFilter.toLowerCase()) ||
        a.tags.some(t => t.toLowerCase().includes(genreFilter.toLowerCase()));
      return locMatch && genreMatch;
    }),
    [locationFilter, genreFilter]
  );

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      if (sortBy === 'followers') return b.followers - a.followers;
      if (sortBy === 'az') return a.name.localeCompare(b.name, 'nl');
      return b.monthlyListeners - a.monthlyListeners; // trending
    }),
    [filtered, sortBy]
  );

  const featuredArtist = artists.find(a => a.featured);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
      {/* Uitgelichte artiest */}
      {featuredArtist && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">Uitgelichte artiest</span>
          </div>
          <div className="relative rounded-2xl overflow-hidden h-56 lg:h-72">
            <BlurImage src={featuredArtist.cover} alt={featuredArtist.name} className="w-full h-full" imgClassName="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1528] via-[#1a1528]/60 to-transparent" />
            <div className="absolute inset-0 flex items-center px-8 lg:px-12">
              <div className="flex items-center gap-6">
                <BlurImage
                  src={featuredArtist.image}
                  alt={featuredArtist.name}
                  className="w-20 h-20 lg:w-28 lg:h-28 rounded-full ring-4 ring-violet-500/50 shrink-0"
                  imgClassName="object-cover"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-3xl lg:text-4xl font-bold text-white">{featuredArtist.name}</h2>
                    {featuredArtist.verified && <BadgeCheck size={22} className="text-blue-400" />}
                  </div>
                  <p className="text-violet-400 font-medium mb-2">{featuredArtist.genre}</p>
                  <p className="text-slate-300 text-sm leading-relaxed max-w-lg line-clamp-2 mb-4">{featuredArtist.bio}</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{formatFollowers(featuredArtist.monthlyListeners)}</p>
                      <p className="text-xs text-slate-400">Maandelijkse luisteraars</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div>
                      <p className="text-lg font-bold text-white">{formatFollowers(featuredArtist.followers)}</p>
                      <p className="text-xs text-slate-400">Volgers</p>
                    </div>
                    <Link
                      to={`/artists/${featuredArtist.id}`}
                      className="ml-4 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      Bekijk profiel <ChevronRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filters + sort */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {locations.map(loc => (
            <button
              key={loc}
              onClick={() => setLocationFilter(loc)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                locationFilter === loc
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
        <div className="w-px bg-white/10 hidden sm:block" />
        <div className="flex gap-2 flex-wrap">
          {allGenres.slice(0, 5).map(g => (
            <button
              key={g}
              onClick={() => setGenreFilter(g)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                genreFilter === g
                  ? 'bg-blue-500/80 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Result count + sort */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          <span className="text-white font-medium">{sorted.length}</span> artiest{sorted.length !== 1 ? 'en' : ''} gevonden
        </p>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-slate-500" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-[#231d3a]">{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Artiesten raster */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.length === 0 && (
          <EmptyState
            title="Geen artiesten gevonden"
            subtitle="Er zijn geen artiesten die overeenkomen met deze filters. Probeer een andere stad of genre."
            action={{ label: 'Filters wissen', onClick: () => { setLocationFilter('Alle steden'); setGenreFilter('Alle genres'); } }}
          />
        )}
        {sorted.map(artist => {
          const gc = getGenreColor(artist.genre);
          return (
            <Link
              key={artist.id}
              to={`/artists/${artist.id}`}
              className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
            >
              <div className="relative h-48 overflow-hidden">
                <BlurImage
                  src={artist.cover}
                  alt={artist.name}
                  className="w-full h-full"
                  imgClassName="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#231d3a]/90 via-transparent to-transparent" />
              </div>
              <div className="relative px-4 pb-4">
                <div className="-mt-8 mb-3">
                  <BlurImage
                    src={artist.image}
                    alt={artist.name}
                    className="w-16 h-16 rounded-full ring-3 ring-[#231d3a]"
                    imgClassName="object-cover"
                  />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-white">{artist.name}</h3>
                      {artist.verified && <BadgeCheck size={15} className="text-blue-400 shrink-0" />}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${gc.bg} ${gc.text}`}>{artist.genre}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                  <MapPin size={11} />{artist.location}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Users size={11} />{formatFollowers(artist.followers)} volgers
                </div>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {artist.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-white/8 text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
