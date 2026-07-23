import { useState, useRef } from 'react';
import { X, Image, Loader } from 'lucide-react';
import GenrePicker from '@components/GenrePicker';
import { createAlbum, updateAlbum, type Album } from '@services/albumService';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Button } from '@components/ui/button';

export default function AlbumModal({
  album, userId, onClose, onSaved,
}: {
  album?: Album | null;
  userId: string;
  onClose: () => void;
  onSaved: (album: Album) => void;
}) {
  const [form, setForm] = useState({
    title: album?.title || '',
    genre: album?.genre || '',
    description: album?.description || '',
    releaseDate: album?.releaseDate || '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const artworkRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const input = {
        title: form.title.trim(),
        description: form.description,
        genre: form.genre,
        releaseDate: form.releaseDate || undefined,
        coverFile: coverFile ?? undefined,
      };
      const saved = album
        ? await updateAlbum(album.id, userId, input)
        : await createAlbum(userId, input);
      if (!saved) throw new Error('Opslaan is mislukt. Probeer het opnieuw.');
      onSaved(saved);
    } catch (e: any) {
      setError(e?.message || 'Opslaan is mislukt. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1e1a30] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">{album ? 'Album bewerken' : 'Nieuw album'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 cursor-pointer group"
              onClick={() => artworkRef.current?.click()}
            >
              {(coverFile || album?.coverUrl) ? (
                <img
                  src={coverFile ? URL.createObjectURL(coverFile) : album!.coverUrl!}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image size={18} className="text-slate-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Image size={16} className="text-white" />
              </div>
              <input
                ref={artworkRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && setCoverFile(e.target.files[0])}
              />
            </div>
            <p className="text-xs text-slate-500">Klik op de artwork om die te {album ? 'vervangen' : 'kiezen'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Albumtitel *</label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="bijv. Nachtlicht" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Genre</label>
              <GenrePicker value={form.genre} onChange={val => set('genre', val)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Releasedatum <span className="text-slate-600 font-normal">(optioneel)</span>
              </label>
              <Input type="date" value={form.releaseDate} onChange={e => set('releaseDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Omschrijving</label>
            <Textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Vertel je luisteraars over dit album..."
              className="resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={onClose} variant="ghost">Annuleren</Button>
            <Button type="button" onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? (<><Loader size={16} className="animate-spin" /> Opslaan...</>) : 'Album opslaan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
