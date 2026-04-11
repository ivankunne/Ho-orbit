import { useState } from 'react';
import { useToast } from '@components/Toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Star, Users, Calendar, Music,
  Building2, ChevronRight, Quote, Award, Ticket
} from 'lucide-react';
import { dutchCities, artists } from '@data/mockData';
import { StarRating } from '@components/StarRating';
import { Textarea } from '@components/ui/textarea';
import { Button } from '@components/ui/button';

function RatingBar({ label, pct }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-600 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function SceneDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const addToast = useToast();
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const scene = dutchCities.find(c => c.slug === slug);

  if (!scene) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400">
        <p className="text-lg mb-4">Scène niet gevonden.</p>
        <Link to="/dutch-scene" className="text-violet-400 hover:text-violet-300 flex items-center gap-2">
          <ArrowLeft size={16} /> Terug naar Nederlandse Scene
        </Link>
      </div>
    );
  }

  const sceneArtists = artists.filter(a => scene.artists.includes(a.id));

  return (
    <div className="min-h-screen bg-[#1a1528]">
      {/* Hero */}
      <div className="relative h-72 lg:h-96 overflow-hidden">
        <img
          src={scene.coverImage}
          alt={scene.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-[#1a1528]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1528]/40 to-transparent" />

        {/* Back button */}
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={15} /> Terug
          </button>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-10 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🇳🇱</span>
              <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">Nederlandse Scene</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-white mb-3">{scene.name}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <StarRating rating={scene.rating} size={18} />
                <span className="text-white font-semibold text-lg">{scene.rating}</span>
                <span className="text-slate-400 text-sm">({scene.ratingCount.toLocaleString('nl-NL')} beoordelingen)</span>
              </div>
              <div className="flex items-center gap-1 text-slate-300 text-sm">
                <Building2 size={14} className="text-violet-400" />
                {scene.stats.venues} venues
              </div>
              <div className="flex items-center gap-1 text-slate-300 text-sm">
                <Ticket size={14} className="text-violet-400" />
                {scene.stats.eventsPerYear.toLocaleString('nl-NL')} evenementen/jaar
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-10 py-10">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-12">

            {/* About */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Over de scène</h2>
              <p className="text-slate-300 leading-relaxed">{scene.longDescription}</p>
            </section>

            {/* Genres */}
            <section>
              <h2 className="text-xl font-bold text-white mb-5">Genreverdeling</h2>
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
                {scene.genreStats.map(g => (
                  <RatingBar key={g.genre} label={g.genre} pct={g.pct} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {scene.genres.map(g => (
                  <span key={g} className="text-sm bg-violet-600/15 text-violet-400 border border-violet-500/20 px-3 py-1 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            </section>

            {/* Gallery */}
            <section>
              <h2 className="text-xl font-bold text-white mb-5">Fotogalerij</h2>
              <div className="grid grid-cols-3 gap-2">
                {scene.gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveGalleryIdx(i)}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl group"
                  >
                    <img
                      src={src}
                      alt={`${scene.name} ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </section>

            {/* Venues */}
            <section>
              <h2 className="text-xl font-bold text-white mb-5">Venues & Podia</h2>
              <div className="space-y-3">
                {scene.venues.map((venue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 bg-white/3 hover:bg-white/5 border border-white/8 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-violet-600/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={18} className="text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{venue.name}</h3>
                        <span className="text-xs bg-white/8 text-slate-400 px-2 py-0.5 rounded-full">{venue.type}</span>
                        <span className="text-xs text-slate-500">Sinds {venue.since}</span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{venue.description}</p>
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                        <Users size={11} /> Capaciteit: {venue.capacity.toLocaleString('nl-NL')} personen
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Testimonials */}
            <section>
              <h2 className="text-xl font-bold text-white mb-5">Ervaringen</h2>
              <div className="space-y-4">
                {scene.testimonials.map(t => (
                  <div key={t.id} className="relative p-6 bg-white/3 border border-white/8 rounded-2xl">
                    <Quote size={28} className="absolute top-5 right-5 text-white/5" />
                    <div className="flex items-start gap-4">
                      <img
                        src={t.avatar}
                        alt={t.author}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-violet-500/20 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div>
                            <p className="font-semibold text-white text-sm">{t.author}</p>
                            <p className="text-xs text-violet-400">{t.role}</p>
                          </div>
                          <StarRating rating={t.rating} size={13} />
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed mt-2">"{t.text}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Rate this scene */}
            <section>
              <div className="p-6 bg-white/3 border border-white/8 rounded-2xl">
                <h3 className="font-bold text-white mb-1">Beoordeel deze scène</h3>
                <p className="text-slate-400 text-sm mb-4">Deel jouw ervaring met de {scene.name}-muziekscene.</p>
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button
                      key={i}
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(i)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={
                          i <= (hoverRating || userRating)
                            ? 'text-violet-400 fill-orange-400'
                            : 'text-slate-600'
                        }
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="text-violet-400 text-sm ml-2">
                      {['', 'Slecht', 'Matig', 'Goed', 'Heel goed', 'Uitstekend'][userRating]}
                    </span>
                  )}
                </div>
                <Textarea
                  placeholder="Vertel iets over je ervaring met deze scène..."
                  className="mb-3 text-sm"
                />
                {reviewSubmitted ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <span>✓</span> Bedankt voor je beoordeling!
                  </div>
                ) : (
                  <Button
                    disabled={!userRating}
                    onClick={() => {
                      if (!userRating) return;
                      setReviewSubmitted(true);
                      setReviewText('');
                      addToast('Bedankt voor je beoordeling! 🎵', 'success');
                    }}
                    size="sm"
                  >
                    Beoordeling plaatsen
                  </Button>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">

            {/* Stats */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Award size={16} className="text-violet-400" /> Scènecijfers
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Actieve venues', value: scene.stats.venues, icon: Building2 },
                  { label: 'Events per jaar', value: scene.stats.eventsPerYear.toLocaleString('nl-NL'), icon: Ticket },
                  { label: 'Actieve artiesten', value: scene.stats.activeArtists, icon: Music },
                  { label: 'Festivalseizoen', value: scene.stats.festivalMonths, icon: Calendar },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Icon size={14} className="text-slate-500" /> {label}
                    </div>
                    <span className="text-white font-semibold text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall rating breakdown */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4">Beoordeling</h3>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-bold text-white">{scene.rating}</span>
                <div>
                  <StarRating rating={scene.rating} size={20} />
                  <p className="text-slate-400 text-xs mt-1">{scene.ratingCount.toLocaleString('nl-NL')} beoordelingen</p>
                </div>
              </div>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(n => (
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-3">{n}</span>
                    <Star size={11} className="text-violet-400 fill-orange-400 shrink-0" />
                    <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-600 rounded-full"
                        style={{ width: `${n === 5 ? 65 : n === 4 ? 22 : n === 3 ? 8 : n === 2 ? 3 : 2}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-7 text-right">
                      {n === 5 ? '65%' : n === 4 ? '22%' : n === 3 ? '8%' : n === 2 ? '3%' : '2%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Festivals */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-violet-400" /> Festivals
              </h3>
              <ul className="space-y-2">
                {scene.festivals.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <ChevronRight size={13} className="text-violet-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Artists from this city */}
            {sceneArtists.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Music size={16} className="text-violet-400" /> Artiesten uit {scene.name}
                </h3>
                <div className="space-y-3">
                  {sceneArtists.map(a => (
                    <Link
                      key={a.id}
                      to={`/artists/${a.id}`}
                      className="flex items-center gap-3 hover:bg-white/5 rounded-xl p-2 -mx-2 transition-colors"
                    >
                      <img src={a.image} alt={a.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                        <p className="text-xs text-violet-400 truncate">{a.genre}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 ml-auto shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Key venues quick list */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-violet-400" /> Toplocaties
              </h3>
              <div className="flex flex-wrap gap-2">
                {scene.highlights.map(h => (
                  <span
                    key={h}
                    className="text-xs bg-white/6 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <Link
              to="/dutch-scene"
              className="flex items-center justify-center gap-2 w-full py-3 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Alle scènes bekijken
            </Link>
          </aside>
        </div>
      </div>

      {/* Lightbox */}
      {activeGalleryIdx !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveGalleryIdx(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl font-light w-10 h-10 flex items-center justify-center"
            onClick={() => setActiveGalleryIdx(null)}
          >
            ✕
          </button>
          <img
            src={scene.gallery[activeGalleryIdx]}
            alt=""
            className="max-w-4xl max-h-[85vh] w-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-6 flex items-center gap-3">
            {scene.gallery.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setActiveGalleryIdx(i); }}
                className={`w-2 h-2 rounded-full transition-colors ${i === activeGalleryIdx ? 'bg-violet-500' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
