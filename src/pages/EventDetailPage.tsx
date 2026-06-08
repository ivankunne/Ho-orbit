import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, ChevronLeft, ExternalLink, Share2, Timer, Megaphone, Plus, Ticket, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@context/AppStateContext';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import CommentSection from '@components/CommentSection';
import { shareContent, buildShareUrl } from '@utils/share';
import UserAvatar from '@components/UserAvatar';

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


function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'vandaag';
  if (days === 1) return 'gisteren';
  return `${days} dagen geleden`;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { rsvpEvents, toggleRsvp } = useAppState();
  const { user } = useAuth();
  const addToast = useToast();

  const [event, setEvent] = useState(null);
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openCalls, setOpenCalls] = useState<any[]>([]);
  const [showOpenCallForm, setShowOpenCallForm] = useState(false);
  const [ocTitle, setOcTitle] = useState('');
  const [ocDesc, setOcDesc] = useState('');
  const [ocContact, setOcContact] = useState('');
  const [ocSubmitting, setOcSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('events').select('*, artist:artists(*)').eq('id', id).single()
      .then(({ data }) => {
        setEvent(data);
        setArtist(data?.artist ?? null);
        setLoading(false);
      });
    supabase.from('networking_posts')
      .select('*, poster:profiles(username,display_name,avatar_url)')
      .eq('type', 'open_call')
      .eq('event_id', Number(id))
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .then(({ data }) => setOpenCalls(data ?? []));
  }, [id]);

  async function handleOpenCallSubmit() {
    if (!user || !ocTitle.trim()) return;
    setOcSubmitting(true);
    const { data, error } = await supabase.from('networking_posts').insert({
      user_id: user.id,
      type: 'open_call',
      title: ocTitle.trim(),
      description: ocDesc.trim() || null,
      contact_info: ocContact.trim() || null,
      event_id: Number(id),
    }).select('*, poster:profiles(username,display_name,avatar_url)').single();
    if (!error && data) {
      setOpenCalls(prev => [data, ...prev]);
      addToast('Open call geplaatst!', 'success');
      setShowOpenCallForm(false);
      setOcTitle(''); setOcDesc(''); setOcContact('');
    } else {
      addToast('Plaatsen mislukt', 'error');
    }
    setOcSubmitting(false);
  }

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
  const attendeesCount = event.attendees_count ?? 0;
  const maxCapacity = event.max_capacity ?? 0;
  const attendance = maxCapacity > 0 ? Math.round((attendeesCount / maxCapacity) * 100) : 0;

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
              { icon: Users, label: 'Aanwezig', value: `${attendeesCount.toLocaleString('nl-NL')} / ${maxCapacity > 0 ? maxCapacity.toLocaleString('nl-NL') : '—'}` },
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
                {maxCapacity > 0 ? `${maxCapacity - attendeesCount} plaatsen vrij` : 'Onbeperkte capaciteit'}
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
                to={`/artists/${artist.slug || artist.id}`}
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
            {attendeesCount > 0 ? (
              <p className="text-sm text-slate-400">{attendeesCount.toLocaleString('nl-NL')} personen hebben zich aangemeld voor dit evenement.</p>
            ) : (
              <p className="text-sm text-slate-500">Nog niemand aangemeld. Wees de eerste!</p>
            )}
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
            {/* Primary: Get my ticket */}
            {safeExternalUrl(event.ticket_link) && (
              <a
                href={safeExternalUrl(event.ticket_link)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-violet-900/40 text-base mb-3"
              >
                <Ticket size={18} /> Haal mijn ticket
              </a>
            )}
            <button
              onClick={() => {
                toggleRsvp(event.id);
                addToast(!rsvpd ? `Aangemeld voor ${event.name}!` : 'Afmelding verwerkt', !rsvpd ? 'success' : 'info');
              }}
              className={`w-full py-3 rounded-xl font-semibold transition-colors mb-3 ${
                rsvpd
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
              }`}
            >
              {rsvpd ? '✓ Aangemeld!' : 'Gratis aanmelden'}
            </button>
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

      {/* Open calls */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-sky-400" />
            <h2 className="text-base font-semibold text-white">Open Calls</h2>
            {openCalls.length > 0 && (
              <span className="text-xs bg-sky-400/10 text-sky-400 border border-sky-400/20 px-2 py-0.5 rounded-full">
                {openCalls.length}
              </span>
            )}
          </div>
          {user && (
            <button
              onClick={() => setShowOpenCallForm(v => !v)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/8 border border-white/10 px-3 py-1.5 rounded-lg transition-all"
            >
              <Plus size={14} /> Open call plaatsen
            </button>
          )}
        </div>

        {showOpenCallForm && (
          <div className="bg-white/3 border border-sky-400/20 rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-white">Nieuwe open call voor dit evenement</p>
              <button onClick={() => setShowOpenCallForm(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={ocTitle}
                onChange={e => setOcTitle(e.target.value)}
                placeholder="Bijv. Zoek support act — techno, 30 min set"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
              <textarea
                value={ocDesc}
                onChange={e => setOcDesc(e.target.value)}
                placeholder="Meer details (optioneel)…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors resize-none"
              />
              <input
                type="text"
                value={ocContact}
                onChange={e => setOcContact(e.target.value)}
                placeholder="Contact: Instagram, e-mail of link (optioneel)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowOpenCallForm(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleOpenCallSubmit}
                disabled={ocSubmitting || !ocTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {ocSubmitting && <Loader2 size={14} className="animate-spin" />}
                Plaatsen
              </button>
            </div>
          </div>
        )}

        {openCalls.length === 0 ? (
          <div className="bg-white/2 border border-white/6 rounded-2xl px-5 py-8 text-center">
            <Megaphone size={28} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-500">Nog geen open calls voor dit evenement.</p>
            {user && !showOpenCallForm && (
              <button
                onClick={() => setShowOpenCallForm(true)}
                className="mt-3 text-sky-400 text-sm hover:underline"
              >
                Zoek je een support act, DJ of samenwerking? Plaats een open call.
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {openCalls.map((oc: any) => (
              <div key={oc.id} className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-white">{oc.title}</p>
                  <span className="text-[11px] text-slate-500 shrink-0">{timeAgo(oc.created_at)}</span>
                </div>
                {oc.description && <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{oc.description}</p>}
                {oc.contact_info && (
                  <p className="text-xs text-sky-400 mt-2">{oc.contact_info}</p>
                )}
                {oc.poster && (
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/6">
                    <UserAvatar src={oc.poster.avatar_url} name={oc.poster.display_name || oc.poster.username} size={20} />
                    <Link to={`/profiel/${oc.poster.username}`} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                      {oc.poster.display_name || oc.poster.username}
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <CommentSection resourceType="event" resourceId={event.id} resourceTitle={event.name} />
      </div>

      <div className="pb-16" />
    </div>
  );
}
