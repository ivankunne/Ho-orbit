import { useState } from 'react';
import { X, Loader, Music } from 'lucide-react';
import { updateTrack, type UploadedTrack } from '@services/uploadService';
import { type Album } from '@services/albumService';
import { Button } from '@components/ui/button';
import { coverPlaceholder } from '@utils/placeholder';

export default function AddTracksToAlbumModal({
  album, tracks, existingTrackCount, userId, onClose, onAdded,
}: {
  album: Album;
  tracks: UploadedTrack[];
  existingTrackCount: number;
  userId: string;
  onClose: () => void;
  onAdded: (trackIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (trackId: string) => {
    setSelected(prev => prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]);
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    setError('');
    try {
      // Appends after whatever's already in the album, rather than letting
      // sort_order default to 0 and collide with the album's existing first track.
      await Promise.all(selected.map((trackId, i) =>
        updateTrack(trackId, userId, { albumId: album.id, sortOrder: existingTrackCount + i }),
      ));
      onAdded(selected);
    } catch (e: any) {
      setError(e?.message || 'Toevoegen is mislukt. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1e1a30] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Nummers toevoegen</h2>
            <p className="text-xs text-slate-500 mt-0.5">aan "{album.title}"</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors">
            <X size={16} />
          </button>
        </div>

        {tracks.length === 0 ? (
          <div className="text-center py-10 text-slate-600">
            <Music size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Geen losse nummers om toe te voegen.</p>
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto">
            {tracks.map(track => (
              <label
                key={track.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/4 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(track.id)}
                  onChange={() => toggle(track.id)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-violet-500/50 shrink-0"
                />
                <img
                  src={track.cover || coverPlaceholder(String(track.id))}
                  alt={track.title}
                  className="w-9 h-9 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{track.title}</p>
                  <p className="text-xs text-slate-500">{track.genre}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mt-4 shrink-0">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 mt-2 shrink-0">
          <Button type="button" onClick={onClose} variant="ghost">Annuleren</Button>
          <Button type="button" onClick={handleAdd} disabled={saving || selected.length === 0}>
            {saving ? (<><Loader size={16} className="animate-spin" /> Bezig...</>) : `Toevoegen${selected.length > 0 ? ` (${selected.length})` : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
