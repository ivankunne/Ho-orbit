import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Star, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@context/AppStateContext';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import BlurImage from '@components/BlurImage';
import { uploadEventPoster } from '@services/uploadService';
import { notifyAdminUpload } from '@services/emailService';
import { useRequirePlan } from '@hooks/useRequirePlan';
import { optimizedImage } from '@lib/image';
import { Skeleton, TileSkeletons } from '@components/Skeleton';
import EventPhaseBadge from '@components/EventPhaseBadge';
import { eventPhase, isEnded, todayNL } from '@lib/eventStatus';

function calcCountdown(dateStr, nowMs) {
  const diff = new Date(dateStr + 'T00:00:00').getTime() - nowMs;
  if (diff <= 0) return null;
  return {
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000)  / 60000),
    secs:  Math.floor((diff % 60000)    / 1000),
  };
}

function CountdownBadge({ date, now }) {
  const t = calcCountdown(date, now);
  if (!t) return null;
  if (t.days > 60) return null;
  return (
    <div className="flex items-center gap-1 bg-violet-600/15 border border-violet-500/25 rounded-lg px-2 py-0.5">
      <span className="text-[10px] text-violet-300 font-medium">nog</span>
      {t.days > 0 && <span className="text-xs font-bold text-violet-400">{t.days}d</span>}
      <span className="text-xs font-mono font-bold text-violet-400">
        {String(t.hours).padStart(2,'0')}:{String(t.mins).padStart(2,'0')}:{String(t.secs).padStart(2,'0')}
      </span>
    </div>
  );
}

function groupByMonth(events) {
  const groups = {};
  events.forEach(e => {
    const date = new Date(e.date);
    const key = date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
}

function EventCard({ event, featured = false, rsvpd, onToggleRsvp, now }) {
  const phase = eventPhase(event.date, now);
  const ended = phase === 'ended';
  const attendeesCount = event.attendees_count ?? 0;
  const maxCapacity = event.max_capacity ?? 0;
  const attendance = maxCapacity > 0 ? Math.round((attendeesCount / maxCapacity) * 100) : 0;

  if (featured) {
    return (
      <div className="relative rounded-2xl overflow-hidden mb-10">
        <img decoding="async" src={optimizedImage(event.poster_url, 640)} alt={event.name} className="w-full h-64 lg:h-80 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1528] via-[#1a1528]/60 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 lg:px-12">
          <div className="max-w-lg">
            <div className="flex items-center gap-2 mb-3">
              <Star size={12} className="text-violet-400" fill="currentColor" />
              <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">Uitgelicht evenement</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">{event.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 mb-4">
              <span className="flex items-center gap-1.5"><Calendar size={14} /> {event.date} · {event.time}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.venue}, {event.city}</span>
              <span className="text-violet-300 font-medium">{event.price}</span>
            </div>
            <p className="text-slate-300 text-sm mb-5 line-clamp-2">{event.description}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleRsvp}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  rsvpd
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {rsvpd ? '✓ Aangemeld' : 'Aanmelden'}
              </button>
              <Link to={`/events/${event.id}`} className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/15 text-white transition-colors">
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/events/${event.id}`}
      className={`group flex gap-4 p-4 border rounded-xl transition-all cursor-pointer ${
        ended ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-white/3 hover:bg-white/6 border-white/5'
      }`}
    >
      {/* self-start: anders rekt de flex-rij deze wrapper op tot de hele
          kaarthoogte en zakt het label onder de poster. */}
      <div className="relative shrink-0 self-start">
        <BlurImage
          src={event.poster_url}
          alt={event.name}
          className={`w-20 h-28 rounded-lg ${ended ? 'opacity-50 grayscale' : ''}`}
          imgClassName="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Op de poster, niet naast de titel: op mobiel drukte het label de
            titel anders terug tot een paar letters. */}
        {ended && <EventPhaseBadge phase="ended" className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-semibold group-hover:text-violet-300 transition-colors line-clamp-2 min-w-0 flex-1 ${ended ? 'text-slate-400' : 'text-white'}`}>{event.name}</h3>
          <div className="shrink-0">
            {phase === 'upcoming' && <CountdownBadge date={event.date} now={now} />}
            {phase === 'today' && <EventPhaseBadge phase="today" />}
          </div>
        </div>
        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5"><Clock size={11} /> {ended ? `${new Date(event.date + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} · ` : ''}{String(event.time ?? '').slice(0, 5)}</div>
          <div className="flex items-center gap-1.5"><MapPin size={11} /> {event.venue}, {event.city}</div>
          <div className="flex items-center gap-1.5"><Users size={11} /> {attendeesCount.toLocaleString('nl-NL')} aanwezigen</div>
        </div>
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-slate-500 mb-1">
            <span className="whitespace-nowrap">{attendance}% bezettingsgraad</span>
            <span className="whitespace-nowrap">{event.price}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${attendance > 80 ? 'bg-red-400' : attendance > 50 ? 'bg-violet-500' : 'bg-green-400'}`}
              style={{ width: `${attendance}%` }}
            />
          </div>
        </div>
      </div>
      <div className="shrink-0 self-center flex flex-col items-end gap-2">
        <span className="bg-white/6 text-xs text-slate-300 px-2 py-1 rounded-lg">{event.genre}</span>
        {rsvpd && !ended && (
          <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">✓ Aangemeld</span>
        )}
        {rsvpd && ended && (
          <span className="text-xs bg-white/6 text-slate-400 px-2 py-0.5 rounded-full font-medium">Was aangemeld</span>
        )}
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const requirePlan = useRequirePlan();
  const [view, setView] = useState('list');
  const [now, setNow] = useState(() => Date.now());
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const { rsvpEvents, toggleRsvp } = useAppState();
  const addToast = useToast();

  function fetchEvents() {
    supabase.from('events').select('*').order('date', { ascending: true }).then(({ data }) => {
      if (data) setEvents(data);
      setLoaded(true);
    });
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Afgelopen volgt uit de datum — niets om bij te houden. `now` tikt elke
  // seconde, dus rond middernacht verschuift een evenement vanzelf.
  const today = todayNL(now);
  const { upcoming, ended } = useMemo(() => {
    const up = [], past = [];
    for (const e of events) (eventPhase(e.date, now) === 'ended' ? past : up).push(e);
    past.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // meest recente eerst
    return { upcoming: up, ended: past };
  }, [events, today]); // eslint-disable-line react-hooks/exhaustive-deps
  // Uitgelicht: alleen iets dat nog komt. Voorheen kon een afgelopen show hier
  // bovenaan staan, mét een knop om je aan te melden.
  const featured = upcoming.find(e => e.featured) || upcoming[0];
  const grouped = useMemo(() => groupByMonth(upcoming), [upcoming]);
  const [showEnded, setShowEnded] = useState(false);

  function handleRsvp(event) {
    const wasRsvpd = rsvpEvents.includes(event.id);
    toggleRsvp(event.id);
    addToast(wasRsvpd ? 'Afmelding verwerkt' : `Aangemeld voor ${event.name}!`, wasRsvpd ? 'info' : 'success');
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Evenementen</h1>
          <p className="text-slate-400">Concerten, festivals en luisterbeurten</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {view === 'list' || view === 'calendar' ? (
            <>
              <button
                onClick={() => setView(view === 'list' ? 'calendar' : 'list')}
                className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors border ${view === 'calendar' ? 'bg-violet-600/15 border-violet-500/30 text-violet-400' : 'border-white/15 text-slate-300 hover:bg-white/8'}`}
              >
                <Calendar size={15} />
                {view === 'calendar' ? 'Lijst' : 'Kalender'}
              </button>
              <button
                onClick={() => {
                  // De agenda is vrij te bekijken; zelf een evenement
                  // plaatsen is een Pro-functie.
                  if (!requirePlan(
                    'Een evenement plaatsen is een Pro-functie',
                    'Upgrade naar H-orbit Pro om je eigen shows en festivals aan te kondigen.',
                  )) return;
                  setView('create');
                }}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                + Aanmaken
              </button>
            </>
          ) : (
            <button
              onClick={() => setView('list')}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              ← Alle evenementen
            </button>
          )}
        </div>
      </div>

      {view === 'list' && (
        <>
          {featured && <EventCard event={featured} featured rsvpd={rsvpEvents.includes(featured.id)} onToggleRsvp={() => handleRsvp(featured)} now={now} />}

          {!loaded && (
            <div role="status" aria-busy="true" aria-label="Evenementen laden…" className="space-y-4">
              <Skeleton className="h-64 lg:h-80 w-full rounded-2xl" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <TileSkeletons count={3} imageClassName="h-40" />
              </div>
            </div>
          )}
          {loaded && events.length > 0 && upcoming.length === 0 && (
            <div className="mb-8 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-6 text-center">
              <p className="text-sm font-semibold text-white mb-1">Geen komende evenementen</p>
              <p className="text-sm text-slate-500">Er staat op dit moment niets gepland. Hieronder vind je wat er al geweest is.</p>
            </div>
          )}
          {loaded && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar size={40} className="text-slate-600 mb-4" />
              <p className="text-base font-semibold text-white mb-1">Nog geen evenementen</p>
              <p className="text-sm text-slate-500">Er staan momenteel geen evenementen gepland. Kom later terug!</p>
            </div>
          )}

          {Object.entries(grouped).map(([month, monthEvents]) => (
            <div key={month} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-white capitalize">{month}</h2>
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-slate-500">{monthEvents.length} evenementen</span>
              </div>
              <div className="space-y-3">
                {monthEvents.map(event => (
                  <EventCard key={event.id} event={event} rsvpd={rsvpEvents.includes(event.id)} onToggleRsvp={() => handleRsvp(event)} now={now} />
                ))}
              </div>
            </div>
          ))}

          {ended.length > 0 && (
            <section className="mt-12" aria-labelledby="afgelopen-kop">
              <div className="flex items-center gap-3 mb-4">
                <h2 id="afgelopen-kop" className="text-base font-bold text-slate-300">Afgelopen evenementen</h2>
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-slate-500">{ended.length}</span>
              </div>
              <div className="space-y-3">
                {(showEnded ? ended : ended.slice(0, 3)).map(event => (
                  <EventCard key={event.id} event={event} rsvpd={rsvpEvents.includes(event.id)} onToggleRsvp={() => handleRsvp(event)} now={now} />
                ))}
              </div>
              {ended.length > 3 && (
                <button type="button" onClick={() => setShowEnded(v => !v)}
                  className="mt-3 w-full min-h-[44px] rounded-xl border border-white/10 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                  {showEnded ? 'Minder tonen' : `Alle ${ended.length} afgelopen evenementen tonen`}
                </button>
              )}
            </section>
          )}
        </>
      )}

      {view === 'calendar' && <CalendarView events={events} rsvpEvents={rsvpEvents} onRsvp={handleRsvp} />}
      {view === 'create' && <CreateEventForm onCreated={() => { fetchEvents(); setView('list'); }} />}
    </div>
  );
}

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

function CalendarView({ events, rsvpEvents, onRsvp }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const navigate = useNavigate();

  function prevMonth() {
    setSelectedDay(null);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDay(null);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1);
  // Monday-first offset: getDay() returns 0=Sun, convert to Mon=0
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => i < offset ? null : i - offset + 1);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  // Group events by day number for this month/year
  const eventsByDay = {};
  events.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(e);
    }
  });

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base font-bold text-white capitalize">{monthLabel}</h2>
        <button onClick={nextMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = day === selectedDay;
          const dayEvents = eventsByDay[day] || [];
          return (
            <div
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`min-h-[72px] rounded-xl p-1.5 border transition-colors cursor-pointer ${
                isSelected
                  ? 'border-violet-500/60 bg-violet-600/10'
                  : isToday
                  ? 'border-violet-500/50 bg-violet-600/5 hover:bg-violet-600/10'
                  : 'border-white/5 bg-white/2 hover:bg-white/5'
              }`}
            >
              <span className={`text-xs font-semibold block mb-1 ${isToday || isSelected ? 'text-violet-400' : 'text-slate-400'}`}>
                {day}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(ev => (
                  <div
                    key={ev.id}
                    onClick={e => { e.stopPropagation(); navigate(`/events/${ev.id}`); }}
                    title={ev.name}
                    className={`text-[9px] font-medium px-1 py-0.5 rounded truncate leading-tight ${
                      isEnded(ev.date)
                        ? 'bg-white/5 text-slate-500 line-through decoration-slate-600 hover:bg-white/10'
                        : rsvpEvents.includes(ev.id)
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30'
                    }`}
                  >
                    {ev.name}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-slate-500">+{dayEvents.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDay !== null && (
        <div className="mt-4 p-4 bg-white/3 border border-white/8 rounded-xl">
          {(() => {
            const dayEvents = eventsByDay[selectedDay] || [];
            const dateLabel = new Date(year, month, selectedDay).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
            return (
              <>
                <p className="text-sm font-semibold text-white mb-3 capitalize">{dateLabel}</p>
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">Geen evenementen op deze dag.</p>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => navigate(`/events/${ev.id}`)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <div className="w-8 h-8 bg-violet-600/15 rounded-lg flex items-center justify-center shrink-0">
                          <Calendar size={14} className="text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isEnded(ev.date) ? 'text-slate-400' : 'text-white'}`}>{ev.name}</p>
                          <p className="text-xs text-slate-400">{ev.time} · {ev.venue}, {ev.city}</p>
                        </div>
                        <EventPhaseBadge date={ev.date} className="shrink-0" />
                        {rsvpEvents.includes(ev.id) && !isEnded(ev.date) && (
                          <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full shrink-0">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function CreateEventForm({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const addToast = useToast();
  const [form, setForm] = useState({
    title: '', date: '', time: '', venue: '', city: '', genre: '',
    description: '', ticketLink: '', price: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const handlePosterSelect = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Kies een afbeelding (PNG of JPG).', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('Afbeelding is te groot (max 10MB).', 'error');
      return;
    }
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.venue || !form.city) {
      addToast('Vul minimaal titel, datum, locatie en stad in.', 'error');
      return;
    }
    setSaving(true);
    try {
      let posterUrl: string | null = null;
      if (posterFile) {
        try {
          posterUrl = await uploadEventPoster(posterFile);
        } catch {
          addToast('Poster uploaden mislukt — evenement wordt zonder poster opgeslagen.', 'error');
        }
      }
      const { error } = await supabase.from('events').insert({
        name: form.title,
        date: form.date,
        time: form.time || null,
        venue: form.venue,
        city: form.city,
        genre: form.genre || null,
        description: form.description || null,
        price: form.price || null,
        ticket_link: form.ticketLink || null,
        ...(posterUrl ? { poster_url: posterUrl } : {}),
        status: 'approved',
        featured: false,
        attendees_count: 0,
        submitted_by_username: user?.displayName || user?.username || 'onbekend',
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
      notifyAdminUpload('event', form.title, '/events');
      setSubmitted(true);
      if (onCreated) onCreated();
    } catch (err: any) {
      addToast(err?.message ?? 'Opslaan mislukt. Probeer het opnieuw.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-white mb-2">Evenement aangemaakt!</h2>
        <p className="text-slate-400 mb-6">Je evenement is toegevoegd aan de lijst.</p>
        <button onClick={() => setSubmitted(false)} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
          Nog een evenement aanmaken
        </button>
      </div>
    );
  }

  const fields = [
    { key: 'title', label: 'Evenementtitel', placeholder: 'bijv. Kensington – Ziggo Dome', full: true },
    { key: 'venue', label: 'Locatie', placeholder: 'bijv. Paradiso' },
    { key: 'city', label: 'Stad', placeholder: 'bijv. Amsterdam' },
    { key: 'date', label: 'Datum', type: 'date' },
    { key: 'time', label: 'Tijd', type: 'time' },
    { key: 'genre', label: 'Genre', placeholder: 'bijv. Hip-Hop' },
    { key: 'price', label: 'Ticketprijs', placeholder: 'bijv. €28' },
    { key: 'ticketLink', label: 'Ticketlink', placeholder: 'https://...', full: true },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map(field => (
          <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
            <label className="block text-sm font-medium text-slate-300 mb-2">{field.label}</label>
            <input
              type={field.type || 'text'}
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={e => setForm({ ...form, [field.key]: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">Omschrijving</label>
          <textarea
            placeholder="Beschrijf je evenement..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none transition-all"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">Eventposter</label>
          <input
            ref={posterInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={e => handlePosterSelect(e.target.files?.[0])}
          />
          {posterPreview ? (
            <div className="flex items-center gap-4 border border-white/15 rounded-xl p-4">
              <img src={posterPreview} alt="Postervoorbeeld" className="w-20 h-28 object-cover rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{posterFile?.name}</p>
                <p className="text-xs text-slate-500">{posterFile ? `${(posterFile.size / 1024 / 1024).toFixed(1)} MB` : ''}</p>
                <button
                  type="button"
                  onClick={() => { setPosterFile(null); setPosterPreview(null); if (posterInputRef.current) posterInputRef.current.value = ''; }}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <X size={12} /> Verwijderen
                </button>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => posterInputRef.current?.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); posterInputRef.current?.click(); } }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handlePosterSelect(e.dataTransfer.files?.[0]); }}
              className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center hover:border-white/30 cursor-pointer transition-colors"
            >
              <p className="text-slate-400">Sleep poster afbeelding of klik om te bladeren</p>
              <p className="text-slate-600 text-xs mt-1">PNG, JPG tot 10MB · Aanbevolen: 400×600px</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          {saving ? 'Opslaan…' : 'Evenement publiceren'}
        </button>
      </div>
    </form>
  );
}
