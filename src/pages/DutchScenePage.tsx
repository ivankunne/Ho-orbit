import { useState, useEffect } from 'react';
import { MapPin, Users, Newspaper, Music } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import SceneMap from '@components/SceneMap';

export default function DutchScenePage() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [artists, setArtists] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);

  useEffect(() => {
    supabase
      .from('dutch_cities')
      .select('*, dutch_city_artists(artists(id, name, image_url, genre, location))')
      .then(({ data }) => setCities(data ?? []));
    supabase.from('artists').select('*').then(({ data }) => setArtists(data ?? []));
    supabase.from('articles').select('*').order('published_at', { ascending: false }).limit(3)
      .then(({ data }) => setNewsArticles(data ?? []));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden mb-12">
        <div className="h-56 lg:h-72 bg-gradient-to-r from-[#AE1C28] via-[#1a1a2e] to-[#21468B] relative">
          <div className="absolute inset-0 bg-[#1a1528]/65" />
          <div className="relative h-full flex items-center px-8 lg:px-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🇳🇱</span>
                <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">Dutch Music Scene</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold text-white mb-3">
                Made in the Netherlands
              </h1>
              <p className="text-slate-300 max-w-xl text-base leading-relaxed">
                From Rotterdam hip-hop to Amsterdam jazz, Den Haag Nederpop to Nijmegen blues — explore the cities and sounds that define Dutch music.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-white mb-2">Scènekaart</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-2xl">
          Zoom in op een stad om individuele venues te zien. Klik op een marker voor meer info.
        </p>
        <SceneMap />
      </section>

      {/* Cities / Regions */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-white mb-2">Cities & Their Sounds</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-2xl">
          Every Dutch city has its own musical identity. Here's what's happening where.
        </p>
        {cities.length === 0 ? (
          <p className="text-slate-500 text-sm">Nog geen steden beschikbaar.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cities.map(city => {
              const cityArtists = (city.dutch_city_artists ?? []).map(ca => ca.artists).filter(Boolean);
              return (
                <Link
                  key={city.id}
                  to={`/dutch-scene/${city.slug}`}
                  className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={city.image_url}
                      alt={city.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#231d3a]/90 via-[#231d3a]/30 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-violet-400" />
                        <h3 className="font-bold text-white text-lg">{city.name}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{city.description}</p>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(city.genres ?? []).map(g => (
                        <span key={g} className="text-xs bg-violet-600/15 text-violet-400 px-2 py-0.5 rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* Venues */}
                    {(city.highlights ?? []).length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Key Venues</p>
                        <div className="flex flex-wrap gap-1">
                          {city.highlights.map(v => (
                            <span key={v} className="text-xs bg-white/6 text-slate-300 px-2 py-0.5 rounded">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Artists from this city */}
                    {cityArtists.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Artists</p>
                        <div className="flex gap-2">
                          {cityArtists.map(a => (
                            <button
                              key={a.id}
                              onClick={e => { e.preventDefault(); navigate(`/artists/${a.id}`); }}
                              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-full px-2 py-1 transition-colors"
                            >
                              <img src={a.image_url} alt={a.name} className="w-5 h-5 rounded-full object-cover" />
                              <span className="text-xs text-slate-300">{a.name.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* All Dutch Artists */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-violet-400" />
            <h2 className="text-xl font-bold text-white">Dutch Artists on h-orbit</h2>
          </div>
          <Link to="/artists" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            View all →
          </Link>
        </div>
        {artists.length === 0 ? (
          <p className="text-slate-500 text-sm">Nog geen artiesten beschikbaar.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {artists.map(artist => (
              <Link
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="group flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-colors"
              >
                <img src={artist.image_url} alt={artist.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                  <p className="text-xs text-violet-400 truncate">{artist.genre}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin size={9} />
                    <span className="truncate">{artist.location?.split(',')[0]}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* News */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Newspaper size={18} className="text-violet-400" />
          <h2 className="text-xl font-bold text-white">Dutch Scene News</h2>
        </div>
        {newsArticles.length === 0 ? (
          <p className="text-slate-500 text-sm">Nog geen nieuws beschikbaar.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsArticles.map(item => (
              <Link
                key={item.id}
                to={`/magazine/${item.id}`}
                className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={item.cover_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 bg-[#1a1528]/80 text-xs text-white font-medium px-2 py-0.5 rounded-full">
                      🇳🇱 Dutch Scene
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm leading-snug mb-2 group-hover:text-violet-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.excerpt}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="pb-16" />
    </div>
  );
}
