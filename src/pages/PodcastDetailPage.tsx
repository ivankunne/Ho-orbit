import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Plus, Trash2, RefreshCw, Headphones, Upload } from 'lucide-react';
import { usePodcast, type Podcast, type PodcastEpisode } from '@context/PodcastContext';
import { useAuth } from '@context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@components/Toast';
import { EqBars } from '@components/Waveform';
import GenreBadge from '@components/GenreBadge';
import { coverPlaceholder } from '@utils/placeholder';
import { getAudioDuration, uploadAudioFile } from '@services/uploadService';

function EpisodeRow({
  podcast, episode, canManage, onRefresh,
}: { podcast: Podcast; episode: PodcastEpisode; canManage: boolean; onRefresh: () => void }) {
  const { currentEpisode, isPodcastPlaying, toggleEpisode } = usePodcast();
  const [deleting, setDeleting] = useState(false);
  const addToast = useToast();
  const isThisPlaying = isPodcastPlaying && currentEpisode?.id === episode.id;

  const remove = async () => {
    if (!confirm(`Aflevering "${episode.title}" verwijderen?`)) return;
    setDeleting(true);
    const { data, error } = await supabase.from('podcast_episodes').delete().eq('id', episode.id).select('id');
    if (error || !data?.length) {
      setDeleting(false);
      addToast?.('Verwijderen mislukt.', 'error');
      return;
    }
    onRefresh();
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
      isThisPlaying ? 'bg-violet-500/8 border-violet-500/30' : 'bg-white/[0.03] border-white/8 hover:border-white/15'
    }`}>
      <button
        onClick={() => toggleEpisode(podcast, episode)}
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          isThisPlaying ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
        }`}
      >
        {isThisPlaying ? <EqBars playing /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {episode.episode_number ? `#${episode.episode_number} — ` : ''}{episode.title}
        </p>
        {episode.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{episode.description}</p>}
        {episode.duration && <p className="text-xs text-slate-600 mt-0.5">{episode.duration}</p>}
      </div>
      {canManage && (
        <button onClick={remove} disabled={deleting} className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function AddEpisodeForm({ podcastId, onRefresh, onClose }: { podcastId: string; onRefresh: () => void; onClose: () => void }) {
  const [title, setTitle]     = useState('');
  const [description, setDesc] = useState('');
  const [file, setFile]       = useState<File | null>(null);
  const [saving, setSaving]   = useState(false);
  const [progress, setProgress] = useState(0);
  const addToast = useToast();

  const save = async () => {
    if (!title.trim() || !file) return;
    setSaving(true);
    try {
      const duration = await getAudioDuration(file);
      const audioUrl = await uploadAudioFile(file, title, setProgress);
      const { error } = await supabase.from('podcast_episodes').insert({
        podcast_id: podcastId,
        title,
        description,
        audio_url: audioUrl,
        duration,
      });
      if (error) throw error;
      addToast?.('Aflevering toegevoegd.', 'success');
      onRefresh();
      onClose();
    } catch {
      addToast?.('Aflevering toevoegen mislukt. Probeer het opnieuw.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-violet-500/20 rounded-2xl p-5 space-y-3">
      <p className="text-sm font-semibold text-white mb-1">Aflevering toevoegen</p>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="bijv. Aflevering 1 — De start"
          className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Omschrijving</label>
        <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Korte beschrijving van deze aflevering"
          className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Audiobestand *</label>
        <label className="flex items-center gap-2 w-full bg-white/[0.04] border border-dashed border-white/15 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:border-violet-500/40 cursor-pointer transition-colors">
          <Upload size={14} className="shrink-0" />
          <span className="truncate">{file ? file.name : 'Kies een audiobestand (mp3, wav, m4a…)'}</span>
          <input type="file" accept="audio/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {saving && (
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !title.trim() || !file}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saving || !title.trim() || !file ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}>
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Uploaden… {progress}%</> : 'Aflevering toevoegen'}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          Annuleer
        </button>
      </div>
    </div>
  );
}

export default function PodcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { podcasts } = usePodcast();
  const { user } = useAuth();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchEpisodes = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('podcast_episodes').select('*').eq('podcast_id', id).order('episode_number', { ascending: true });
    if (data) setEpisodes(data as PodcastEpisode[]);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fromList = podcasts.find(p => p.id === id);
    if (fromList) {
      setPodcast(fromList);
      setLoading(false);
    } else {
      supabase.from('podcasts').select('*').eq('id', id).single().then(({ data }) => {
        setPodcast(data as Podcast ?? null);
        setLoading(false);
      });
    }
  }, [id, podcasts]);

  useEffect(() => {
    fetchEpisodes();
    if (!id) return;
    const channel = supabase
      .channel(`podcast_episodes_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_episodes', filter: `podcast_id=eq.${id}` }, fetchEpisodes)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchEpisodes]);

  const isAdmin = Boolean(user?.isAdmin);
  const canManage = Boolean(podcast) && (isAdmin || podcast?.owner_id === user?.id);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Laden…</div>;
  }

  if (!podcast) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 lg:px-6 py-10 text-center">
        <p className="text-lg font-semibold text-white">Podcast niet gevonden</p>
        <Link to="/podcasts" className="text-violet-400 hover:text-violet-300 text-sm mt-2 inline-block">Terug naar Podcasts</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 lg:px-6 py-10">
      <Link to="/podcasts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mb-6">
        <ArrowLeft size={14} /> Podcasts
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <img
          src={podcast.cover_image_url || coverPlaceholder(podcast.title)}
          alt={podcast.title}
          className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-white/10"
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white leading-tight">{podcast.title}</h1>
          {podcast.genre && <div className="mt-1.5"><GenreBadge genre={podcast.genre} /></div>}
          {podcast.description && <p className="text-sm text-slate-400 mt-2">{podcast.description}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Afleveringen</h2>
        {canManage && (
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus size={13} /> Aflevering toevoegen
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-4">
          <AddEpisodeForm podcastId={podcast.id} onRefresh={fetchEpisodes} onClose={() => setShowAddForm(false)} />
        </div>
      )}

      {episodes.length > 0 ? (
        <div className="space-y-2">
          {episodes.map(ep => (
            <EpisodeRow key={ep.id} podcast={podcast} episode={ep} canManage={canManage} onRefresh={fetchEpisodes} />
          ))}
        </div>
      ) : (
        !showAddForm && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Headphones size={24} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">Nog geen afleveringen.</p>
          </div>
        )
      )}
    </div>
  );
}
