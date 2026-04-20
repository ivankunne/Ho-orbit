import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@context/AppStateContext';
import { useToast } from '@components/Toast';
import BlurImage from '@components/BlurImage';

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
  const attendance = Math.round((event.attendees_count / event.max_capacity) * 100);

  if (featured) {
    return (
      <div className="relative rounded-2xl overflow-hidden mb-10">
        <img src={event.poster_url} alt={event.name} className="w-full h-64 lg:h-80 object-cover" />
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
      className="group flex gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-all cursor-pointer"
    >
      <BlurImage
        src={event.poster_url}
        alt={event.name}
        className="w-20 h-28 shrink-0 rounded-lg"
        imgClassName="object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2">{event.name}</h3>
          <CountdownBadge date={event.date} now={now} />
        </div>
        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5"><Clock size={11} /> {event.time}</div>
          <div className="flex items-center gap-1.5"><MapPin size={11} /> {event.venue}, {event.city}</div>
          <div className="flex items-center gap-1.5"><Users size={11} /> {event.attendees_count?.toLocaleString('nl-NL')} aanwezigen</div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{attendance}% bezettingsgraad</span>
            <span>{event.price}</span>
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
        {rsvpd && (
          <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">✓ Aangemeld</span>
        )}
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const [view, setView] = useState('list');
  const [now, setNow] = useState(() => Date.now());
  const [events, setEvents] = useState([]);
  const { rsvpEvents, toggleRsvp } = useAppState();
  const addToast = useToast();

  useEffect(() => {
    supabase.from('events').select('*').then(({ data }) => {
      if (data) setEvents(data);
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const featured = events.find(e => e.featured) || events[0];
  const grouped = useMemo(() => groupByMonth(events), [events]);

  function handleRsvp(event) {
    const wasRsvpd = rsvpEvents.includes(event.id);
    toggleRsvp(event.id);
    addToast(wasRsvpd ? 'Afmelding verwerkt' : `Aangemeld voor ${event.name}!`, wasRsvpd ? 'info' : 'success');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Evenementen</h1>
          <p className="text-slate-400">Concerten, festivals en luisterbeurten</p>
        </div>
        <div className="flex items-center gap-2">
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
                onClick={() => setView('create')}
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

          {/* TODO: Vervang met API-aanroep naar /api/evenementen */}
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
        </>
      )}

      {view === 'calendar' && <CalendarView events={events} rsvpEvents={rsvpEvents} onRsvp={handleRsvp} />}
      {view === 'create' && <CreateEventForm />}
    </div>
  );
}

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

function CalendarView({ events, rsvpEvents, onRsvp }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
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
          const dayEvents = eventsByDay[day] || [];
          return (
            <div
              key={day}
              className={`min-h-[72px] rounded-xl p-1.5 border transition-colors ${
                isToday ? 'border-violet-500/50 bg-violet-600/5' : 'border-white/5 bg-white/2'
              } ${dayEvents.length ? 'cursor-pointer hover:bg-white/5' : ''}`}
            >
              <span className={`text-xs font-semibold block mb-1 ${isToday ? 'text-violet-400' : 'text-slate-400'}`}>
                {day}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => onRsvp(ev)}
                    title={ev.name}
                    className={`text-[9px] font-medium px-1 py-0.5 rounded truncate leading-tight ${
                      rsvpEvents.includes(ev.id)
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
    </div>
  );
}

function CreateEventForm() {
  const [form, setForm] = useState({
    title: '', date: '', time: '', venue: '', city: '', genre: '',
    description: '', ticketLink: '', price: '',
  });
  const [submitted, setSubmitted] = useState(false);

  // TODO: Vervang met API-aanroep naar POST /api/evenementen
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-white mb-2">Evenement aangemaakt!</h2>
        <p className="text-slate-400 mb-6">Je evenement is ingediend en wordt beoordeeld.</p>
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
    { key: 'genre', label: 'Genre', placeholder: 'bijv. Nederpop' },
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
          <div className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center hover:border-white/30 cursor-pointer transition-colors">
            <p className="text-slate-400">Sleep poster afbeelding of klik om te bladeren</p>
            <p className="text-slate-600 text-xs mt-1">PNG, JPG tot 10MB · Aanbevolen: 400×600px</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Evenement publiceren
        </button>
      </div>
    </form>
  );
}
