import { useState, useEffect } from 'react';
import { useToast } from '@components/Toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Star, Users, Calendar, Music,
  Building2, ChevronRight, Quote, Award, Globe, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'text-violet-400 fill-orange-400' : 'text-slate-600'}
        />
      ))}
    </div>
  );
}

const typeLabels = {
  podium: 'Poppodium',
  club: 'Club',
  jazzclub: 'Jazzclub',
  concertzaal: 'Concertzaal',
};

export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useToast();
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('venues').select('*').eq('id', id).single()
      .then(({ data }) => { setVenue(data); setLoading(false); });
  }, [id]);

  if (loading) return null;

  if (!venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400">
        <p className="text-lg mb-4">Podium niet gevonden.</p>
        <Link to="/dutch-scene" className="text-violet-400 hover:text-violet-300 flex items-center gap-2">
          <ArrowLeft size={16} /> Terug naar Nederlandse Scene
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1528]">
      {/* Hero */}
      <div className="relative h-72 lg:h-96 overflow-hidden">
        <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-[#1a1528]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1528]/40 to-transparent" />

        <div className="absolute top-6 left-6 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={15} /> Terug
          </button>
          <Link
            to="/dutch-scene"
            className="hidden sm:flex items-center gap-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-slate-300 text-xs px-3 py-2 rounded-lg transition-colors"
          >
            Nederlandse Scene
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-10 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: venue.color + '30', color: venue.color }}
              >
                {typeLabels[venue.type] || venue.type}
              </span>
              <span className="text-slate-400 text-xs">{venue.city}</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-white mb-3">{venue.name}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <StarRating rating={venue.rating} size={18} />
                <span className="text-white font-semibold text-lg">{venue.rating}</span>
                <span className="text-slate-400 text-sm">({venue.rating_count?.toLocaleString('nl-NL')} beoordelingen)</span>
              </div>
              <div className="flex items-center gap-1 text-slate-300 text-sm">
                <Users size={14} className="text-violet-400" />
                {venue.capacity.toLocaleString('nl-NL')} personen
              </div>
              <div className="flex items-center gap-1 text-slate-300 text-sm">
                <Calendar size={14} className="text-violet-400" />
                Sinds {venue.since}
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
              <h2 className="text-xl font-bold text-white mb-4">Over {venue.name}</h2>
              <p className="text-slate-300 leading-relaxed">{venue.long_description}</p>
            </section>

            {/* Gallery */}
            <section>
              <h2 className="text-xl font-bold text-white mb-5">Fotogalerij</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(venue.gallery_urls ?? []).map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveGalleryIdx(i)}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl group"
                  >
                    <img
                      src={src}
                      alt={`${venue.name} ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </section>

            {/* Upcoming events */}
            <section>
              <h2 className="text-xl font-bold text-white mb-5">Aankomende evenementen</h2>
              <Link
                to="/events"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Alle evenementen bekijken <ChevronRight size={14} />
              </Link>
            </section>

            {/* Testimonials */}
            <section>
              <h2 className="text-xl font-bold text-white mb-5">Ervaringen</h2>
              <div className="space-y-4">
                {(venue.testimonials ?? []).map(t => (
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

            {/* Rate */}
            <section>
              <div className="p-6 bg-white/3 border border-white/8 rounded-2xl">
                <h3 className="font-bold text-white mb-1">Beoordeel {venue.name}</h3>
                <p className="text-slate-400 text-sm mb-4">Deel jouw ervaring met dit podium.</p>
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
                        className={i <= (hoverRating || userRating) ? 'text-violet-400 fill-orange-400' : 'text-slate-600'}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="text-violet-400 text-sm ml-2">
                      {['', 'Slecht', 'Matig', 'Goed', 'Heel goed', 'Uitstekend'][userRating]}
                    </span>
                  )}
                </div>
                <textarea
                  placeholder={`Vertel iets over je ervaring bij ${venue.name}...`}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none mb-3"
                />
                {reviewSubmitted ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <span>✓</span> Bedankt voor je beoordeling!
                  </div>
                ) : (
                  <button
                    disabled={!userRating}
                    onClick={() => {
                      if (!userRating) return;
                      setReviewSubmitted(true);
                      addToast(`Bedankt voor je recensie van ${venue.name}! 🎶`, 'success');
                    }}
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Beoordeling plaatsen
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">

            {/* Quick info */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" /> Podiuminfo
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-500 mt-0.5 shrink-0" />
                  <span className="text-slate-300">{venue.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-slate-500 shrink-0" />
                  <span className="text-violet-400">{venue.website}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-500 shrink-0" />
                  <span className="text-slate-300">Capaciteit: {venue.capacity.toLocaleString('nl-NL')} pers.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-500 shrink-0" />
                  <span className="text-slate-300">Opgericht in {venue.since}</span>
                </div>
              </div>
            </div>

            {/* Rating breakdown */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4">Beoordeling</h3>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-bold text-white">{venue.rating}</span>
                <div>
                  <StarRating rating={venue.rating} size={20} />
                  <p className="text-slate-400 text-xs mt-1">{venue.rating_count?.toLocaleString('nl-NL')} beoordelingen</p>
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
                        style={{ width: `${n === 5 ? 68 : n === 4 ? 20 : n === 3 ? 7 : n === 2 ? 3 : 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Genres */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Music size={16} className="text-violet-400" /> Genres
              </h3>
              <div className="flex flex-wrap gap-2">
                {venue.genres.map(g => (
                  <span
                    key={g}
                    className="text-xs px-2.5 py-1 rounded-full border"
                    style={{ background: venue.color + '18', color: venue.color, borderColor: venue.color + '40' }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Highlights */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Award size={16} className="text-violet-400" /> Kenmerken
              </h3>
              <ul className="space-y-2">
                {venue.highlights.map(h => (
                  <li key={h} className="flex items-start gap-2 text-sm text-slate-300">
                    <ChevronRight size={13} className="text-violet-500 mt-0.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            {/* Back to city scene */}
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
            src={(venue.gallery_urls ?? [])[activeGalleryIdx]}
            alt=""
            className="max-w-4xl max-h-[85vh] w-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-6 flex items-center gap-3">
            {(venue.gallery_urls ?? []).map((_, i) => (
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
