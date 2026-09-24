import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Mic, CheckCircle, Loader, ImagePlus, X } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { usePodcast, type Podcast } from '@context/PodcastContext';
import GenrePicker from '@components/GenrePicker';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Button } from '@components/ui/button';
import { getMyPodcasts, createPodcast, submitEpisode, type EpisodeStatus } from '@services/podcastService';
import { hasRole, rolesOf, saveMyRoles } from '@lib/roles';

const NEW = '__new__';

/**
 * Tabblad "Podcast" op /upload: een aflevering uploaden, en als je nog geen
 * podcast hebt meteen je show aanmaken. Zet zo nodig de Podcast-rol aan
 * (nodig om een show te mogen maken). De aflevering wacht daarna op
 * goedkeuring en komt dan op de podcastpagina — niet tussen de muziek.
 */
export default function PodcastUploadForm() {
  const { user, updateProfile } = useAuth();
  const { fetchPodcasts } = usePodcast();
  const [mine, setMine] = useState<Podcast[] | null>(null);
  const [podcastId, setPodcastId] = useState<string>('');
  const [show, setShow] = useState({ title: '', genre: '', description: '' });
  const [cover, setCover] = useState<File | null>(null);
  const [ep, setEp] = useState({ title: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ status: EpisodeStatus; podcastId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyPodcasts(user.id).then(list => { setMine(list); setPodcastId(list[0]?.id ?? NEW); });
  }, [user.id]);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!cover) { setCoverUrl(null); return; }
    const u = URL.createObjectURL(cover); setCoverUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [cover]);

  const creating = podcastId === NEW;
  const canSubmit = !!file && ep.title.trim() && (!creating || show.title.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true); setError(''); setProgress(0);
    try {
      let targetId = podcastId;
      if (creating) {
        if (!hasRole(user, 'Podcast')) {
          setStep('Podcaster-rol aanzetten…');
          updateProfile(await saveMyRoles(user.id, [...rolesOf(user), 'Podcast'], user.role));
        }
        setStep('Podcast aanmaken…');
        const created = await createPodcast(user.id, { ...show, cover });
        targetId = created.id;
        setMine(m => [...(m ?? []), created]);
        setPodcastId(created.id);
      }
      setStep('Aflevering uploaden…');
      const status = await submitEpisode(targetId, { ...ep, file: file! }, setProgress);
      fetchPodcasts();
      setDone({ status, podcastId: targetId });
    } catch (err) {
      setError((err as Error).message || 'Upload mislukt. Probeer het opnieuw.');
    } finally {
      setBusy(false); setStep('');
    }
  }

  if (done) {
    return (
      <div className="py-12 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">{done.status === 'pending' ? 'Aflevering ontvangen!' : 'Aflevering staat online!'}</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          {done.status === 'pending'
            ? <>“{ep.title}” wordt eerst bekeken door ons team. Na goedkeuring staat hij op je podcastpagina.</>
            : <>“{ep.title}” staat op je podcastpagina.</>}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => { setDone(null); setEp({ title: '', description: '' }); setFile(null); }}>Nog een aflevering</Button>
          <Link to={`/podcasts/${done.podcastId}`}><Button variant="secondary">Naar je podcast</Button></Link>
        </div>
      </div>
    );
  }

  if (mine === null) {
    return <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader size={18} className="animate-spin" /> Laden…</div>;
  }

  const label = 'block text-sm font-medium text-slate-300 mb-2';
  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Welke podcast */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <p className="text-sm font-semibold text-white">Je podcast</p>
        {mine.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {mine.map(p => (
              <button key={p.id} type="button" onClick={() => setPodcastId(p.id)} aria-pressed={podcastId === p.id}
                className={`min-h-[40px] rounded-xl border px-3.5 text-sm transition-colors ${podcastId === p.id ? 'border-violet-500/50 bg-violet-600/20 text-white' : 'border-white/10 text-slate-300 hover:border-white/25'}`}>
                {p.title}
              </button>
            ))}
            <button type="button" onClick={() => setPodcastId(NEW)} aria-pressed={creating}
              className={`min-h-[40px] rounded-xl border px-3.5 text-sm transition-colors ${creating ? 'border-violet-500/50 bg-violet-600/20 text-white' : 'border-dashed border-white/15 text-slate-400 hover:border-white/25'}`}>
              + Nieuwe podcast
            </button>
          </div>
        )}
        {creating && (
          <div className="space-y-4">
            {mine.length === 0 && <p className="text-sm text-slate-400">Je hebt nog geen podcast. Maak hem hier aan; daarna voeg je er afleveringen aan toe.</p>}
            <div className="flex gap-4">
              <label className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.03] hover:border-violet-500/40">
                {coverUrl ? <img src={coverUrl} alt="Cover" className="absolute inset-0 h-full w-full object-cover" /> : <ImagePlus size={22} className="text-slate-500" />}
                <input type="file" accept="image/*" className="sr-only" onChange={e => setCover(e.target.files?.[0] ?? null)} aria-label="Cover van je podcast" />
              </label>
              <div className="min-w-0 flex-1">
                <label className={label}>Naam van je podcast *</label>
                <Input value={show.title} onChange={e => setShow(s => ({ ...s, title: e.target.value }))} placeholder="bijv. De Muziekpodcast" />
                {cover && <button type="button" onClick={() => setCover(null)} className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><X size={12} /> Cover weghalen</button>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Genre</label>
                <GenrePicker value={show.genre} onChange={v => setShow(s => ({ ...s, genre: v }))} placeholder="Kies genre" />
              </div>
              <div>
                <label className={label}>Waar gaat je podcast over?</label>
                <Input value={show.description} onChange={e => setShow(s => ({ ...s, description: e.target.value }))} placeholder="Korte omschrijving" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aflevering */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('audio/')) setFile(f); }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${file ? 'border-green-500/50 bg-green-500/5' : 'border-white/15 bg-white/2 hover:border-white/30'}`}
      >
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-300">
          {file ? <CheckCircle size={26} className="text-green-400" /> : <Mic size={26} />}
        </div>
        <p className="font-semibold text-white">{file ? file.name : 'Kies je aflevering'}</p>
        <p className="mt-1 text-sm text-slate-500">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB — tik om te wijzigen` : 'Sleep een audiobestand hierheen of tik om te kiezen (mp3, wav, m4a…)'}</p>
      </div>

      <div>
        <label className={label}>Titel van de aflevering *</label>
        <Input value={ep.title} onChange={e => setEp(s => ({ ...s, title: e.target.value }))} placeholder="bijv. #1 — Hoe het begon" />
      </div>
      <div>
        <label className={label}>Omschrijving</label>
        <Textarea value={ep.description} onChange={e => setEp(s => ({ ...s, description: e.target.value }))} rows={4} placeholder="Waar gaat deze aflevering over? Wie zijn je gasten?" />
      </div>

      {busy && (
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-slate-400"><span>{step}</span>{step.startsWith('Aflevering') && <span>{progress}%</span>}</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {error && <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <Button type="submit" disabled={!canSubmit || busy} className="w-full">
        {busy ? <><Loader size={16} className="animate-spin" /> Bezig…</> : <><Upload size={16} /> Aflevering uploaden</>}
      </Button>
      <p className="text-center text-xs text-slate-500">Je aflevering wordt eerst bekeken door ons team en komt daarna op je podcastpagina.</p>
    </form>
  );
}
