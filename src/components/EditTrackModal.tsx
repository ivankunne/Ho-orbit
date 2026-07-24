import { useState, useRef } from 'react';
import { X, Image, Loader } from 'lucide-react';
import GenrePicker from '@components/GenrePicker';
import { updateTrack, type UploadedTrack } from '@services/uploadService';
import { type Album } from '@services/albumService';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Checkbox } from '@components/ui/checkbox';
import { Button } from '@components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';

const TAGS_OPTIONS = ['Instrumentaal', 'Akoestisch', 'Live opname', 'Demo', 'Remix', 'Cover', 'Origineel', 'Samenwerking'];

export default function EditTrackModal({
  track, userId, albums, onClose, onSaved, isAdmin = false,
}: {
  track: UploadedTrack;
  userId: string;
  albums: Album[];
  onClose: () => void;
  onSaved: (updated: UploadedTrack) => void;
  isAdmin?: boolean;
}) {
  const [form, setForm] = useState({
    title: track.title || '',
    genre: track.genre || '',
    description: track.description || '',
    tags: track.tags || [],
    explicit: track.explicit || false,
    isPrivate: track.isPrivate || false,
    isrc: track.isrc || '',
    upc: track.upc || '',
    albumId: track.albumId || '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const artworkRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const toggleTag = (tag: string) => setForm(f => ({
    ...f,
    tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
  }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateTrack(track.id, userId, { ...form, coverFile: coverFile ?? undefined }, isAdmin);
      onSaved(updated);
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
          <h2 className="text-base font-semibold text-white">Nummer bewerken</h2>
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
              <img
                src={coverFile ? URL.createObjectURL(coverFile) : track.cover}
                alt=""
                className="w-full h-full object-cover"
              />
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
            <p className="text-xs text-slate-500">Klik op de artwork om die te vervangen</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nummertitel *</label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Genre</label>
            <GenrePicker value={form.genre} onChange={val => set('genre', val)} />
          </div>

          {albums.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Album</label>
              <Select value={form.albumId || 'none'} onValueChange={v => set('albumId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Geen album" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen album</SelectItem>
                  {albums.map(album => (
                    <SelectItem key={album.id} value={album.id}>{album.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Omschrijving</label>
            <Textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Vertel je luisteraars over dit nummer..."
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                ISRC <span className="text-slate-600 font-normal">(optioneel)</span>
              </label>
              <Input value={form.isrc} onChange={e => set('isrc', e.target.value)} placeholder="NL-A52-26-00001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                UPC <span className="text-slate-600 font-normal">(optioneel)</span>
              </label>
              <Input value={form.upc} onChange={e => set('upc', e.target.value)} placeholder="012345678901" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Labels</label>
            <div className="flex flex-wrap gap-2">
              {TAGS_OPTIONS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    form.tags.includes(tag)
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={form.explicit} onCheckedChange={checked => set('explicit', checked)} />
              <span className="text-sm text-slate-300">Expliciete inhoud</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={form.isPrivate} onCheckedChange={checked => set('isPrivate', checked)} />
              <span className="text-sm text-slate-300">Privénummer (alleen via link)</span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={onClose} variant="ghost">Annuleren</Button>
            <Button type="button" onClick={handleSave} disabled={saving || !form.title}>
              {saving ? (<><Loader size={16} className="animate-spin" /> Opslaan...</>) : 'Wijzigingen opslaan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
