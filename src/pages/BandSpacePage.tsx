import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Plus, Music, MapPin, Lock, Globe,
  ChevronRight, Loader2, X, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import GenrePicker from '@components/GenrePicker';

function slugify(name: string) {
  return name.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface Band {
  id: string;
  name: string;
  slug: string;
  description: string;
  genre: string;
  location: string;
  image_url: string;
  is_public: boolean;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

interface CreateForm {
  name: string;
  genre: string;
  location: string;
  description: string;
  is_public: boolean;
}

export default function BandSpacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();

  const [myBands, setMyBands] = useState<Band[]>([]);
  const [publicBands, setPublicBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    name: '', genre: '', location: '', description: '', is_public: true,
  });

  useEffect(() => {
    load();
  }, [user?.id]);

  async function load() {
    setLoading(true);

    const [myRes, publicRes] = await Promise.all([
      user?.id
        ? supabase.from('band_members').select('band_id, status').eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
      supabase.from('bands').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(50),
    ]);

    const myRows: { band_id: string; status: string }[] = myRes.data ?? [];
    const activeBandIds = myRows.filter(r => r.status === 'active').map(r => r.band_id);
    const pendingBandIds = myRows.filter(r => r.status === 'pending').map(r => r.band_id);
    const allMyBandIds = myRows.map(r => r.band_id);

    if (activeBandIds.length > 0) {
      const { data: myBandData } = await supabase.from('bands').select('*').in('id', activeBandIds);
      setMyBands((myBandData ?? []).map((b: any) => ({ ...b, is_member: true, is_pending: false })));
    } else {
      setMyBands([]);
    }

    const publicAll = publicRes.data ?? [];
    setPublicBands(
      publicAll
        .filter((b: any) => !activeBandIds.includes(b.id))
        .map((b: any) => ({
          ...b,
          is_member: false,
          is_pending: pendingBandIds.includes(b.id),
        }))
    );

    setLoading(false);
  }

  async function handleCreate() {
    if (!user) return;
    if (!form.name.trim()) { addToast('Geef je band een naam', 'error'); return; }
    setCreating(true);

    const slug = slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6);
    const { data: band, error } = await supabase.from('bands').insert({
      name: form.name.trim(),
      slug,
      genre: form.genre,
      location: form.location,
      description: form.description,
      is_public: form.is_public,
      created_by: user.id,
    }).select().single();

    if (error || !band) {
      addToast('Aanmaken mislukt, probeer opnieuw', 'error');
      setCreating(false);
      return;
    }

    // Creator is automatically an active admin — no approval needed
    const { error: memberError } = await supabase.from('band_members').insert({
      band_id: band.id, user_id: user.id, role: 'admin', status: 'active',
    });

    if (memberError) {
      // Band row exists but membership failed — surface it instead of
      // silently leaving the creator locked out of their own band.
      addToast('Band aangemaakt, maar lidmaatschap mislukte. Probeer opnieuw te openen.', 'error');
      setCreating(false);
      return;
    }

    setCreating(false);
    setShowCreate(false);
    setForm({ name: '', genre: '', location: '', description: '', is_public: true });
    addToast(`${band.name} aangemaakt!`, 'success');
    navigate(`/bandspace/${band.id}`);
  }

  async function handleRequestJoin(band: Band) {
    if (!user) { addToast('Log in om je aan te sluiten', 'error'); return; }
    const { error } = await supabase.from('band_members').insert({
      band_id: band.id, user_id: user.id, role: 'member', status: 'pending',
    });
    if (error) { addToast('Aanvraag mislukt', 'error'); return; }
    // Update local state so the card reflects pending immediately
    setPublicBands(prev => prev.map(b => b.id === band.id ? { ...b, is_pending: true } : b));
    addToast(`Aanvraag verstuurd voor ${band.name}`, 'success');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Band Space</h1>
          <p className="text-slate-400 max-w-xl text-sm sm:text-base">
            Een privé werkruimte voor jouw band of crew. Zeven Orbit-kanalen per band: repetities, gigs, socials, muziekbladen, media, projecten en samenwerkingen — elk met eigen groepschat.
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <Plus size={18} /> Band aanmaken
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-violet-400" />
        </div>
      ) : (
        <>
          {/* My bands */}
          {myBands.length > 0 && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4">Mijn bands</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myBands.map(band => (
                  <BandCard key={band.id} band={band} onRequestJoin={handleRequestJoin} isMember isPending={false} />
                ))}
              </div>
            </section>
          )}

          {/* Discover */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">
              {myBands.length > 0 ? 'Andere bands ontdekken' : 'Bands ontdekken'}
            </h2>
            {publicBands.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-400">Nog geen publieke bands</p>
                <p className="text-sm mt-1">Maak de eerste aan!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicBands.map(band => (
                  <BandCard key={band.id} band={band} onRequestJoin={handleRequestJoin} isMember={false} isPending={band.is_pending ?? false} />
                ))}
              </div>
            )}
          </section>

          {!user && (
            <div className="mt-16 text-center">
              <p className="text-slate-400 text-sm">
                <Link to="/login" className="text-violet-400 hover:underline">Log in</Link> om een band aan te maken of deel te nemen.
              </p>
            </div>
          )}
        </>
      )}

      {/* Create band modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#201c30] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Nieuwe band aanmaken</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Bandnaam *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Naam van je band of crew"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Genre</label>
                  <GenrePicker
                    value={form.genre}
                    onChange={genre => setForm(f => ({ ...f, genre }))}
                    placeholder="Kies genre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Stad</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Amsterdam"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Over de band</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Korte omschrijving…"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
                    form.is_public
                      ? 'border-violet-500/50 bg-violet-600/10 text-violet-400'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {form.is_public ? <Globe size={14} /> : <Lock size={14} />}
                  {form.is_public ? 'Openbaar' : 'Privé'}
                </button>
                <p className="text-xs text-slate-500">
                  {form.is_public ? 'Andere gebruikers kunnen je band ontdekken en deelnemen.' : 'Alleen uitgenodigde leden kunnen deelnemen.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : null}
                Aanmaken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BandCard({
  band, onRequestJoin, isMember, isPending,
}: {
  band: Band;
  onRequestJoin: (b: Band) => void;
  isMember: boolean;
  isPending: boolean;
}) {
  return (
    <div className="bg-white/3 hover:bg-white/5 border border-white/8 rounded-2xl p-5 transition-all group">
      <div className="flex items-start gap-4 mb-3">
        <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
          {band.image_url
            ? <img src={band.image_url} alt={band.name} className="w-full h-full object-cover rounded-xl" />
            : <Music size={20} className="text-violet-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{band.name}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            {band.genre && <span>{band.genre}</span>}
            {band.location && <><span>·</span><span className="flex items-center gap-0.5"><MapPin size={10} />{band.location}</span></>}
            {!band.is_public && <><span>·</span><Lock size={10} /></>}
          </div>
        </div>
      </div>

      {band.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{band.description}</p>
      )}

      {isMember ? (
        <Link
          to={`/bandspace/${band.id}`}
          className="flex items-center justify-between w-full text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
        >
          Naar werkruimte <ChevronRight size={16} />
        </Link>
      ) : isPending ? (
        <Link
          to={`/bandspace/${band.id}`}
          className="flex items-center gap-2 w-full text-sm text-amber-400 py-2 justify-center"
        >
          <Clock size={13} /> Aanvraag in behandeling
        </Link>
      ) : (
        <button
          onClick={() => onRequestJoin(band)}
          className="w-full text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/30 py-2 rounded-lg transition-all"
        >
          Aanvraag versturen
        </button>
      )}
    </div>
  );
}
