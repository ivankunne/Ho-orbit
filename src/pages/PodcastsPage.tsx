import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Settings2, CheckCircle, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp, Mic } from 'lucide-react';
import { usePodcast, type Podcast } from '@context/PodcastContext';
import { useAuth } from '@context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@components/Toast';
import GenrePicker from '@components/GenrePicker';
import GenreBadge from '@components/GenreBadge';
import { coverPlaceholder } from '@utils/placeholder';

// ─── Podcast card (public browse view) ───────────────────────────────────────

function PodcastCard({ podcast, episodeCount }: { podcast: Podcast; episodeCount: number }) {
  return (
    <Link
      to={`/podcasts/${podcast.id}`}
      className="flex flex-col gap-4 p-5 rounded-2xl border bg-white/[0.03] border-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-center gap-4">
        <img
          src={podcast.cover_image_url || coverPlaceholder(podcast.title)}
          alt={podcast.title}
          className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-white/10"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-lg leading-tight truncate">{podcast.title}</p>
          {podcast.genre && <div className="mt-1"><GenreBadge genre={podcast.genre} /></div>}
        </div>
      </div>
      {podcast.description && <p className="text-sm text-slate-400 line-clamp-2">{podcast.description}</p>}
      <p className="text-xs text-slate-600">
        {episodeCount > 0 ? `${episodeCount} aflevering${episodeCount !== 1 ? 'en' : ''}` : 'Nog geen afleveringen'}
      </p>
    </Link>
  );
}

// ─── Studio podcast row (edit/manage) ────────────────────────────────────────

function StudioRow({ podcast, onRefresh }: { podcast: Podcast; onRefresh: () => void }) {
  const [open, setOpen]           = useState(false);
  const [title, setTitle]         = useState(podcast.title);
  const [description, setDesc]    = useState(podcast.description);
  const [genre, setGenre]         = useState(podcast.genre);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const addToast = useToast();

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('podcasts')
      .update({ title, description, genre })
      .eq('id', podcast.id)
      .select('id');
    setSaving(false);
    if (error || !data?.length) {
      addToast?.('Opslaan mislukt — de wijziging is niet doorgevoerd.', 'error');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  };

  const remove = async () => {
    if (!confirm(`Podcast "${podcast.title}" verwijderen? Alle afleveringen worden ook verwijderd.`)) return;
    setDeleting(true);
    const { data, error } = await supabase.from('podcasts').delete().eq('id', podcast.id).select('id');
    if (error || !data?.length) {
      setDeleting(false);
      addToast?.('Verwijderen mislukt.', 'error');
      return;
    }
    onRefresh();
  };

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <img
          src={podcast.cover_image_url || coverPlaceholder(podcast.title)}
          alt={podcast.title}
          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/10"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{podcast.title}</p>
          <p className="text-xs text-slate-500">{podcast.genre || 'Geen genre'}</p>
        </div>
        <Link to={`/podcasts/${podcast.id}`} className="text-xs text-violet-400 hover:text-violet-300 shrink-0">
          Afleveringen
        </Link>
        <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-white transition-colors p-1">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button onClick={remove} disabled={deleting} className="text-slate-600 hover:text-red-400 transition-colors p-1">
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/8 px-4 py-4 space-y-3 bg-white/[0.02]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Genre</label>
              <GenrePicker value={genre} onChange={setGenre} placeholder="Kies genre" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Omschrijving</label>
            <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Korte beschrijving van je podcast"
              className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
          </div>
          <button onClick={save} disabled={saving || !title.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              saved ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' :
              saving || !title.trim() ? 'bg-white/5 text-slate-600 cursor-not-allowed' :
              'bg-violet-600 hover:bg-violet-500 text-white'
            }`}>
            {saved ? <><CheckCircle size={13} /> Opgeslagen</> : saving ? <><RefreshCw size={13} className="animate-spin" /> Opslaan…</> : 'Opslaan'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add / register podcast form ─────────────────────────────────────────────

function AddPodcastForm({ onRefresh, onClose, userId }: { onRefresh: () => void; onClose: () => void; userId?: string }) {
  const [title, setTitle]         = useState('');
  const [genre, setGenre]         = useState('');
  const [description, setDesc]    = useState('');
  const [saving, setSaving]       = useState(false);
  const addToast = useToast();

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('podcasts').insert({
      title, genre, description,
      ...(userId ? { owner_id: userId } : {}),
    });
    setSaving(false);
    if (error) {
      addToast?.('Podcast toevoegen mislukt. Probeer het opnieuw.', 'error');
      return;
    }
    addToast?.('Podcast toegevoegd. Voeg nu je eerste aflevering toe.', 'success');
    onRefresh();
    onClose();
  };

  return (
    <div className="bg-white/[0.03] border border-violet-500/20 rounded-2xl p-5 space-y-3">
      <p className="text-sm font-semibold text-white mb-1">Podcast registreren</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="bijv. De Muziekpodcast"
            className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Genre</label>
          <GenrePicker value={genre} onChange={setGenre} placeholder="Kies genre" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Omschrijving</label>
        <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Korte beschrijving van je podcast"
          className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !title.trim()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saving || !title.trim() ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}>
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Toevoegen…</> : 'Podcast toevoegen'}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          Annuleer
        </button>
      </div>
    </div>
  );
}

// ─── Main PodcastsPage ────────────────────────────────────────────────────────

export default function PodcastsPage() {
  const { podcasts, episodeCounts, fetchPodcasts } = usePodcast();
  const { user } = useAuth();
  const isAdmin      = Boolean(user?.isAdmin);
  const isPodcastHost = user?.role === 'Podcast';
  const isStudio     = isAdmin || isPodcastHost;
  const [showAddForm, setShowAddForm] = useState(false);

  // Admins manage all podcasts; Podcast hosts only manage their own
  const studioPodcasts = isAdmin
    ? podcasts
    : podcasts.filter(p => p.owner_id === user?.id);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 lg:px-6 py-10">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <Headphones size={22} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Podcasts</h1>
            <p className="text-sm text-slate-500">
              {podcasts.length > 0
                ? `${podcasts.length} podcast${podcasts.length !== 1 ? 's' : ''}`
                : 'Nog geen podcasts'}
            </p>
          </div>
        </div>
      </div>

      {/* Podcast grid */}
      {podcasts.length > 0 && (
        <section className="mb-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {podcasts.map(p => <PodcastCard key={p.id} podcast={p} episodeCount={episodeCounts[p.id] ?? 0} />)}
          </div>
        </section>
      )}

      {/* Empty public state */}
      {podcasts.length === 0 && !isStudio && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Mic size={28} className="text-slate-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Geen podcasts gevonden</p>
            <p className="text-slate-500 text-sm mt-1">Er zijn nog geen podcasts toegevoegd.</p>
          </div>
        </div>
      )}

      {/* ── Studio — Podcast hosts & admins ── */}
      {isStudio && (
        <div className="mt-6 pt-8 border-t border-white/8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                {isAdmin ? 'Studio — alle podcasts' : 'Jouw studio'}
              </h2>
            </div>
            {/* Admins can always add; Podcast hosts can add if they don't have one yet */}
            {(isAdmin || studioPodcasts.length === 0) && (
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="flex items-center gap-1.5 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <Plus size={13} /> Podcast toevoegen
              </button>
            )}
          </div>

          {/* Podcast host with no show yet */}
          {isPodcastHost && !isAdmin && studioPodcasts.length === 0 && !showAddForm && (
            <div className="mb-5 p-4 bg-violet-500/8 border border-violet-500/20 rounded-2xl">
              <p className="text-sm text-slate-300 mb-1 font-medium">Start jouw podcast</p>
              <p className="text-xs text-slate-500">
                Je hebt de Podcast-rol maar nog geen show aangemaakt. Registreer je podcast en voeg daarna afleveringen toe.
              </p>
            </div>
          )}

          {showAddForm && (
            <div className="mb-4">
              <AddPodcastForm
                onRefresh={fetchPodcasts}
                onClose={() => setShowAddForm(false)}
                userId={user?.id ? String(user.id) : undefined}
              />
            </div>
          )}

          {studioPodcasts.length > 0 ? (
            <div className="space-y-2">
              {studioPodcasts.map(p => (
                <StudioRow key={p.id} podcast={p} onRefresh={fetchPodcasts} />
              ))}
            </div>
          ) : (
            !showAddForm && (
              <p className="text-sm text-slate-600 text-center py-6">
                {isAdmin ? 'Nog geen podcasts — voeg er een toe.' : 'Klik op "Podcast toevoegen" om te beginnen.'}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
