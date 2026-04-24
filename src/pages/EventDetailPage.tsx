import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, ChevronLeft, ExternalLink, Share2, Timer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@context/AppStateContext';
import { useToast } from '@components/Toast';
import CommentSection from '@components/CommentSection';
import { shareContent, buildShareUrl } from '@utils/share';

function safeExternalUrl(url) {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return ['https:', 'http:'].includes(protocol) ? url : null;
  } catch {
    return null;
  }
}

function useCountdown(dateStr) {
  function calc() {
    const diff = new Date(dateStr + 'T00:00:00').getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      days:  Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins:  Math.floor((diff % 3600000)  / 60000),
      secs:  Math.floor((diff % 60000)    / 1000),
    };
  }
  const [t, setT] = useState(calc);
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id); }, [dateStr]);
  return t;
}

const fakeAttendees = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: ['Sander', 'Anouk', 'Joost', 'Emma', 'Lars', 'Lisa', 'Robin', 'Anna', 'Torben', 'Ingrid', 'Pablo', 'Luka'][i],
  avatar: `https://picsum.photos/seed/attendee${i + 1}/40/40`,
}));

export default function EventDetailPage() {
  const { id } = useParams();
  const { rsvpEvents, toggleRsvp } = useAppState();
  const addToast = useToast();

  const [event, setEvent] = useState(null);
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('events').select('*, artist:artists(*)').eq('id', id).single()
      .then(({ data }) => {
        setEvent(data);
        setArtist(data?.artist ?? null);
        setLoading(false);
      });
  }, [id]);

  const countdown = useCountdown(event?.date || '');

  if (loading) return null;

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-slate-400">
        <p className="text-xl font-semibold">Evenement niet gevonden</p>
        <Link to="/events" className="text-violet-400 mt-2 hover:underline">← Terug naar evenementen</Link>
      </div>
    );
  }

  const rsvpd = rsvpEvents.includes(event.id);
  const attendance = Math.round((event.attendees_count / event.max_capacity) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10">
      <Link
        to="/events"
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft size={16} /> Alle evenementen
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Hoofdinhoud */}
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl overflow-hidden mb-6">
            <img src={event.poster_url} alt={event.name} className="w-full h-64 lg:h-80 object-cover" />
            {event.featured && (
              <div className="absolute top-4 left-4 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                Uitgelicht evenement
              </div>
            )}
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4">{event.name}</h1>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { icon: Calendar, label: 'Datum', value: new Date(event.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
              { icon: Clock, label: 'Aanvang', value: event.time },
              { icon: MapPin, label: 'Locatie', value: `${event.venue}, ${event.city}` },
              { icon: Users, label: 'Aanwezig', value: `${event.attendees_count?.toLocaleString('nl-NL')} / ${event.max_capacity?.toLocaleString('nl-NL')}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl">
                <div className="w-8 h-8 bg-violet-600/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-medium text-white capitalize">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bezettingsbalk */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Bezetting: {attendance}%</span>
              <span className={attendance > 80 ? 'text-red-400' : 'text-green-400'}>
                {event.max_capacity - event.attendees_count} plaatsen vrij
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${attendance > 80 ? 'bg-red-400' : attendance > 50 ? 'bg-violet-500' : 'bg-green-400'}`}
                style={{ width: `${attendance}%` }}
              />
            </div>
          </div>

          {/* Omschrijving */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white mb-2">Over dit evenement</h2>
            <p className="text-slate-300 leading-relaxed">{event.description}</p>
          </div>

          {/* Artiest */}
          {artist && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-3">Optredende artiest</h2>
              <Link
                to={`/artists/${artist.id}`}
                className="flex items-center gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-colors"
              >
                <img src={artist.image_url} alt={artist.name} className="w-14 h-14 rounded-full object-cover" />
                <div>
                  <p className="font-semibold text-white">{artist.name}</p>
                  <p className="text-sm text-violet-400">{artist.genre}</p>
                  <p className="text-xs text-slate-400">{artist.location}</p>
                </div>
              </Link>
            </div>
          )}

          {/* Aanwezigen */}
          <div>
            <h2 className="text-base font-semibold text-white mb-3">Aanwezigen</h2>
            <div className="flex flex-wrap gap-3">
              {fakeAttendees.map(att => (
                <div key={att.id} className="flex items-center gap-2 bg-white/4 rounded-full px-3 py-1.5">
                  <img src={att.avatar} alt={att.name} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-xs text-slate-300">{att.name}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 bg-white/4 rounded-full px-3 py-1.5">
                <span className="text-xs text-slate-400">+{event.attendees_count - 12} meer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zijbalk */}
        <div className="space-y-4">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
            <div className="text-2xl font-bold text-white mb-1">{event.price}</div>
            <p className="text-sm text-slate-400 mb-3">per ticket</p>
            {countdown && (
              <div className="flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 rounded-xl p-3 mb-4">
                <Timer size={15} className="text-violet-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Nog te gaan</p>
                  <div className="flex items-baseline gap-2">
                    {countdown.days > 0 && (
                      <span className="text-lg font-bold text-violet-400 leading-none">{countdown.days}<span className="text-xs font-normal text-slate-500 ml-0.5">d</span></span>
                    )}
                    <span className="text-lg font-mono font-bold text-violet-400 leading-none tabular-nums">
                      {String(countdown.hours).padStart(2,'0')}:{String(countdown.mins).padStart(2,'0')}:{String(countdown.secs).padStart(2,'0')}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                toggleRsvp(event.id);
                addToast(!rsvpd ? `Aangemeld voor ${event.name}!` : 'Afmelding verwerkt', !rsvpd ? 'success' : 'info');
              }}
              className={`w-full py-3 rounded-xl font-semibold transition-colors mb-3 ${
                rsvpd
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {rsvpd ? '✓ Aangemeld!' : 'Gratis aanmelden'}
            </button>
            <a
              href={safeExternalUrl(event.ticket_link) ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold bg-white/8 hover:bg-white/12 text-white transition-colors text-sm"
            >
              <ExternalLink size={15} /> Tickets kopen
            </a>
            <button
              onClick={async () => {
                const result = await shareContent({
                  title: event.name,
                  text: `Kom ook naar ${event.name}`,
                  url: buildShareUrl(`/events/${event.id}`),
                });
                if (result === 'copied') addToast('Link gekopieerd naar klembord!', 'success');
                else if (result === 'shared') addToast('Gedeeld!', 'success');
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Share2 size={15} /> Evenement delen
            </button>
          </div>

          <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-1">Genre</p>
            <span className="text-sm font-medium text-violet-400">{event.genre}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <CommentSection resourceType="event" resourceId={event.id} resourceTitle={event.name} />
      </div>

      <div className="pb-16" />
    </div>
  );
}
