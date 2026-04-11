import { useState, useRef, useEffect } from 'react';
import { ListMusic, Check, X, Plus } from 'lucide-react';
import { useToast } from '@components/Toast';
import { getPlaylists, createPlaylist, addTrackToPlaylist } from '@services/playlistService';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { Input } from '@components/ui/input';

export function AddToPlaylistPopover({ track, userId, children }) {
  const addToast = useToast();
  const [playlists, setPlaylists] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getPlaylists(userId).then(setPlaylists).catch(() => {});
  }, [userId]);

  async function handleAdd(playlistId) {
    try {
      await addTrackToPlaylist(userId, playlistId, track.id);
      setPlaylists(prev => prev.map(p =>
        p.id === playlistId ? { ...p, trackIds: [...(p.trackIds || []), track.id] } : p
      ));
      addToast(`Toegevoegd aan afspeellijst!`, 'success');
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const pl = await createPlaylist({ name: newName.trim(), userId });
      await addTrackToPlaylist(userId, pl.id, track.id);
      setPlaylists(prev => [...prev, { ...pl, trackIds: [track.id] }]);
      setNewName('');
      setCreating(false);
      addToast(`Afspeellijst "${pl.name}" aangemaakt!`, 'success');
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <div className="px-3 py-2 border-b border-white/8">
          <p className="text-xs font-semibold text-slate-400">Toevoegen aan afspeellijst</p>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {playlists.length === 0 && (
            <p className="text-xs text-slate-500 px-3 py-2">Geen afspeellijsten</p>
          )}
          {playlists.map(pl => {
            const already = pl.trackIds?.includes(track.id);
            return (
              <button
                key={pl.id}
                onClick={() => !already && handleAdd(pl.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                  already ? 'text-violet-400 cursor-default' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <ListMusic size={13} className="shrink-0" />
                <span className="flex-1 truncate">{pl.name}</span>
                {already && <Check size={12} />}
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-white/8">
          {creating ? (
            <div className="flex gap-1.5">
              <Input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                placeholder="Naam..."
                className="flex-1 h-8 text-xs"
              />
              <button onClick={handleCreate} className="text-green-400 hover:text-green-300 p-1"><Check size={14} /></button>
              <button onClick={() => setCreating(false)} className="text-slate-500 hover:text-white p-1"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 w-full text-xs text-violet-400 hover:text-violet-300 px-1 py-1 transition-colors"
            >
              <Plus size={12} /> Nieuwe afspeellijst aanmaken
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
