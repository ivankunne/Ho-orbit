import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import { parseVideo } from '@components/VideoEmbed';
import {
  createTutorial, createMasterclass, uploadLearningThumbnail,
  type Difficulty, type MasterclassCategory,
} from '@services/learningService';

/* ── Knop ──────────────────────────────────────────────────────────────── */

/**
 * "+ Toevoegen" voor tutorials en masterclasses. Alleen zichtbaar voor admins
 * (de superadmin heeft is_admin = true en telt dus mee). Het verbergen is
 * gemak, geen beveiliging: de database weigert een insert van iemand die geen
 * admin is (learning_admin_migration.sql).
 */
export function AdminAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  const { user } = useAuth();
  if (!user?.isAdmin) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:bg-violet-500 active:scale-[0.98] transition-[background-color,transform]"
    >
      <Plus size={16} strokeWidth={2.5} /> {label}
    </button>
  );
}

/* ── Venster ───────────────────────────────────────────────────────────── */

export function Sheet({ title, onClose, busy, onSubmit, children, submitLabel = 'Opslaan' }: {
  title: string; onClose: () => void; busy: boolean; onSubmit: () => void; children: ReactNode; submitLabel?: string;
}) {
  const panelRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose, busy]);

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <form
        ref={panelRef}
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="relative flex w-full sm:max-w-xl max-h-[94vh] flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#1e1833] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Sluiten"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">{children}</div>
        <div className="flex gap-3 border-t border-white/8 px-5 py-4 shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose} disabled={busy}
            className="flex-1 min-h-[48px] rounded-xl border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-40 transition-colors">
            Annuleren
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60 transition-colors">
            {busy && <Loader2 size={16} className="animate-spin" />} {submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

/* ── Velden ────────────────────────────────────────────────────────────── */

export const inputCls = 'w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-3.5 text-[15px] text-white placeholder-slate-500 focus:border-violet-500/60 focus:outline-none transition-colors';

export function Field({ label, hint, error, children, required }: { label: string; hint?: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}{required && <span className="text-violet-400"> *</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-400">{error}</span>
        : hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function ThumbnailPicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-300">Thumbnail</span>
      <label className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.03] hover:border-violet-500/40 transition-colors">
        {preview
          ? <img src={preview} alt="Voorbeeld" className="absolute inset-0 h-full w-full object-cover" />
          : <span className="flex flex-col items-center gap-1.5 text-sm text-slate-500"><ImagePlus size={22} /> Kies een afbeelding</span>}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
      {file && (
        <button type="button" onClick={() => onChange(null)} className="mt-1.5 text-xs text-slate-400 hover:text-white">Verwijderen</button>
      )}
    </div>
  );
}

/** Een lijst regels met twee velden (hoofdstukken, stappen). */
function PairList({ label, items, onChange, first, second, multilineSecond }: {
  label: string;
  items: { a: string; b: string }[];
  onChange: (next: { a: string; b: string }[]) => void;
  first: { placeholder: string; className?: string };
  second: { placeholder: string };
  multilineSecond?: boolean;
}) {
  const set = (i: number, key: 'a' | 'b', v: string) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className={`flex gap-2 ${multilineSecond ? 'items-start' : 'items-center'}`}>
            <input value={it.a} onChange={(e) => set(i, 'a', e.target.value)} placeholder={first.placeholder} className={`${inputCls} ${first.className ?? ''}`} />
            {multilineSecond
              ? <textarea value={it.b} onChange={(e) => set(i, 'b', e.target.value)} placeholder={second.placeholder} rows={2} className={`${inputCls} py-2.5 flex-1 min-w-0 resize-y`} />
              : <input value={it.b} onChange={(e) => set(i, 'b', e.target.value)} placeholder={second.placeholder} className={`${inputCls} flex-1 min-w-0`} />}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Regel verwijderen"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, { a: '', b: '' }])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300">
        <Plus size={14} /> Regel toevoegen
      </button>
    </div>
  );
}

function videoError(url: string): string | undefined {
  if (!url.trim()) return undefined;
  return parseVideo(url) ? undefined : 'Dit is geen geldige link. Plak de volledige URL, bv. https://youtu.be/…';
}

const splitList = (s: string) => s.split(/[\n,]/).map(x => x.trim()).filter(Boolean);

/* ── Tutorial ──────────────────────────────────────────────────────────── */

const DIFFICULTIES: Difficulty[] = ['Beginner', 'Gevorderd', 'Expert'];

export function TutorialFormModal({ tags, onClose, onCreated }: {
  tags: string[]; onClose: () => void; onCreated: (row: unknown) => void;
}) {
  const addToast = useToast();
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [f, setF] = useState({ title: '', description: '', instructor: '', video_url: '', duration: '', difficulty: 'Beginner' as Difficulty, tools: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [thumb, setThumb] = useState<File | null>(null);
  const [chapters, setChapters] = useState<{ a: string; b: string }[]>([]);
  const [steps, setSteps] = useState<{ a: string; b: string }[]>([]);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF(s => ({ ...s, [k]: e.target.value }));

  const titleErr = tried && !f.title.trim() ? 'Geef de tutorial een titel.' : undefined;
  const vidErr = videoError(f.video_url);

  async function submit() {
    setTried(true);
    if (!f.title.trim() || vidErr) return;
    setBusy(true);
    try {
      const thumbnail_url = thumb ? await uploadLearningThumbnail(thumb, 'tutorials') : undefined;
      const row = await createTutorial({
        ...f,
        thumbnail_url,
        tags: picked,
        tools: splitList(f.tools),
        chapters: chapters.filter(c => c.a.trim() || c.b.trim()).map(c => ({ time: c.a.trim(), title: c.b.trim() })),
        steps: steps.filter(s => s.a.trim() || s.b.trim()).map(s => ({ title: s.a.trim(), body: s.b.trim() })),
      });
      addToast('Tutorial toegevoegd', 'success');
      onCreated(row);
      onClose();
    } catch (err: any) {
      addToast(err?.message || 'Opslaan is mislukt.', 'error');
      setBusy(false);
    }
  }

  return (
    <Sheet title="Nieuwe tutorial" onClose={onClose} busy={busy} onSubmit={submit}>
      <Field label="Titel" required error={titleErr}>
        <input value={f.title} onChange={up('title')} className={inputCls} placeholder="Bv. Je eerste mix in Ableton" maxLength={140} />
      </Field>
      <Field label="Omschrijving">
        <textarea value={f.description} onChange={up('description')} rows={3} className={`${inputCls} py-2.5 resize-y`} placeholder="Waar gaat deze tutorial over?" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Door"><input value={f.instructor} onChange={up('instructor')} className={inputCls} placeholder="Naam van de maker" /></Field>
        <Field label="Duur"><input value={f.duration} onChange={up('duration')} className={inputCls} placeholder="Bv. 24 min" /></Field>
      </div>
      <Field label="Video" hint="YouTube-, Vimeo- of directe videolink." error={vidErr}>
        <input value={f.video_url} onChange={up('video_url')} className={inputCls} placeholder="https://youtu.be/…" inputMode="url" />
      </Field>
      <ThumbnailPicker file={thumb} onChange={setThumb} />
      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-300">Niveau</span>
        <div className="flex gap-2">
          {DIFFICULTIES.map(d => (
            <button key={d} type="button" onClick={() => setF(s => ({ ...s, difficulty: d }))}
              className={`flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${f.difficulty === d ? 'border-violet-500/60 bg-violet-600/20 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-300">Onderwerpen</span>
        <div className="flex flex-wrap gap-2">
          {tags.map(t => {
            const on = picked.includes(t);
            return (
              <button key={t} type="button" aria-pressed={on} onClick={() => setPicked(p => on ? p.filter(x => x !== t) : [...p, t])}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-violet-500/60 bg-violet-600/20 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Benodigde tools" hint="Eén per regel of gescheiden door komma's.">
        <textarea value={f.tools} onChange={up('tools')} rows={2} className={`${inputCls} py-2.5 resize-y`} placeholder="Ableton Live, koptelefoon" />
      </Field>
      <PairList label="Hoofdstukken" items={chapters} onChange={setChapters}
        first={{ placeholder: '0:00', className: 'w-20 shrink-0' }} second={{ placeholder: 'Titel van het hoofdstuk' }} />
      <PairList label="Stappen (stappenplan)" items={steps} onChange={setSteps} multilineSecond
        first={{ placeholder: 'Titel', className: 'w-36 shrink-0' }} second={{ placeholder: 'Uitleg bij deze stap' }} />
    </Sheet>
  );
}

/* ── Masterclass ───────────────────────────────────────────────────────── */

export function MasterclassFormModal({ categories, onClose, onCreated }: {
  categories: { key: MasterclassCategory; label: string }[]; onClose: () => void; onCreated: (row: unknown) => void;
}) {
  const addToast = useToast();
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [f, setF] = useState({ title: '', description: '', instructor_name: '', video_url: '', duration: '', category: '' as MasterclassCategory | '', is_free: true });
  const [thumb, setThumb] = useState<File | null>(null);
  const up = (k: 'title' | 'description' | 'instructor_name' | 'video_url' | 'duration') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(s => ({ ...s, [k]: e.target.value }));

  const titleErr = tried && !f.title.trim() ? 'Geef de masterclass een titel.' : undefined;
  const catErr = tried && !f.category ? 'Kies een categorie.' : undefined;
  const vidErr = videoError(f.video_url);

  async function submit() {
    setTried(true);
    if (!f.title.trim() || !f.category || vidErr) return;
    setBusy(true);
    try {
      const thumbnail_url = thumb ? await uploadLearningThumbnail(thumb, 'masterclasses') : undefined;
      const row = await createMasterclass({ ...f, category: f.category, thumbnail_url });
      addToast('Masterclass toegevoegd', 'success');
      onCreated(row);
      onClose();
    } catch (err: any) {
      addToast(err?.message || 'Opslaan is mislukt.', 'error');
      setBusy(false);
    }
  }

  return (
    <Sheet title="Nieuwe masterclass" onClose={onClose} busy={busy} onSubmit={submit}>
      <Field label="Titel" required error={titleErr}>
        <input value={f.title} onChange={up('title')} className={inputCls} placeholder="Bv. Mixen voor streaming" maxLength={140} />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-300">Categorie<span className="text-violet-400"> *</span></span>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(c => (
            <button key={c.key} type="button" onClick={() => setF(s => ({ ...s, category: c.key }))} aria-pressed={f.category === c.key}
              className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${f.category === c.key ? 'border-violet-500/60 bg-violet-600/20 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>
              {c.label}
            </button>
          ))}
        </div>
        {catErr && <span className="mt-1 block text-xs text-red-400">{catErr}</span>}
      </div>
      <Field label="Omschrijving">
        <textarea value={f.description} onChange={up('description')} rows={3} className={`${inputCls} py-2.5 resize-y`} placeholder="Wat leer je in deze masterclass?" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Door"><input value={f.instructor_name} onChange={up('instructor_name')} className={inputCls} placeholder="Naam van de docent" /></Field>
        <Field label="Duur"><input value={f.duration} onChange={up('duration')} className={inputCls} placeholder="Bv. 45 min" /></Field>
      </div>
      <Field label="Video" hint="YouTube-, Vimeo- of directe videolink." error={vidErr}>
        <input value={f.video_url} onChange={up('video_url')} className={inputCls} placeholder="https://youtu.be/…" inputMode="url" />
      </Field>
      <ThumbnailPicker file={thumb} onChange={setThumb} />
      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-300">Toegang</span>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, l: 'Gratis' }, { v: false, l: 'Alleen Pro' }].map(o => (
            <button key={o.l} type="button" onClick={() => setF(s => ({ ...s, is_free: o.v }))} aria-pressed={f.is_free === o.v}
              className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${f.is_free === o.v ? 'border-violet-500/60 bg-violet-600/20 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
