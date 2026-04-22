import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Trash2, GripVertical, Music, Pencil, Check, X } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import { usePlayer } from '@context/PlayerContext';
import {
  getPlaylist, removeTrackFromPlaylist, reorderPlaylistTracks,
  renamePlaylist, deletePlaylist, resolveTrackObjects,
} from '@services/playlistService';

function formatDuration(dur) {
  if (!dur) return '0:00';
  return dur;
}

function totalDuration(tracks) {
  const total = tracks.reduce((acc, t) => {
    if (!t.duration) return acc;
    const [m, s] = t.duration.split(':').map(Number);
    return acc + m * 60 + (s || 0);
  }, 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const addToast = useToast();
  const navigate = useNavigate();
  const { playTrack } = usePlayer();

  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState('');

  // Drag state
  const dragIndex = useRef(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const pl = await getPlaylist(user.id, id);
        if (!pl) { navigate('/library'); return; }
        setPlaylist(pl);
        setNameInput(pl.name);
        setTracks(resolveTrackObjects(pl.trackIds));
      } catch {
        addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRemoveTrack(trackId) {
    try {
      await removeTrackFromPlaylist(user.id, id, trackId);
      setTracks(prev => prev.filter(t => t.id !== trackId));
      addToast('Nummer verwijderd uit afspeellijst.', 'success');
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  }

  async function handleRename() {
    if (!nameInput.trim()) return;
    try {
      await renamePlaylist(user.id, id, nameInput.trim());
      setPlaylist(prev => ({ ...prev, name: nameInput.trim() }));
      setEditingName(false);
      addToast('Naam bijgewerkt.', 'success');
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Weet je zeker dat je "${playlist.name}" wilt verwijderen?`)) return;
    try {
      await deletePlaylist(user.id, id);
      addToast('Afspeellijst verwijderd.', 'success');
      navigate('/library');
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  }

  function handlePlayAll() {
    if (tracks.length === 0) return;
    playTrack(tracks[0], tracks);
  }

  // Drag-and-drop reorder (native HTML5)
  function onDragStart(e, index) {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e, index) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const newTracks = [...tracks];
    const dragged = newTracks.splice(dragIndex.current, 1)[0];
    newTracks.splice(index, 0, dragged);
    dragIndex.current = index;
    setTracks(newTracks);
  }

  async function onDragEnd() {
    dragIndex.current = null;
    try {
      await reorderPlaylistTracks(user.id, id, tracks.map(t => t.id));
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!playlist) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-10">
      <Link
        to="/library"
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft size={16} /> Mijn bibliotheek
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-violet-600/20 rounded-2xl flex items-center justify-center shrink-0">
          {tracks.length > 0
            ? <img src={tracks[0].cover_url || tracks[0].cover} alt="" className="w-full h-full object-cover rounded-2xl" />
            : <Music size={32} className="text-violet-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                className="bg-white/8 border border-violet-500/50 rounded-lg px-3 py-1.5 text-white text-xl font-bold focus:outline-none"
              />
              <button onClick={handleRename} className="text-green-400 hover:text-green-300 transition-colors"><Check size={18} /></button>
              <button onClick={() => setEditingName(false)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 group mb-1"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-white group-hover:text-violet-300 transition-colors">{playlist.name}</h1>
              <Pencil size={14} className="text-slate-600 group-hover:text-violet-400 transition-colors" />
            </button>
          )}
          <p className="text-sm text-slate-400">
            {tracks.length} {tracks.length === 1 ? 'nummer' : 'nummers'}
            {tracks.length > 0 && ` · ${totalDuration(tracks)}`}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={handlePlayAll}
          disabled={tracks.length === 0}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Play size={16} fill="white" /> Afspelen
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Trash2 size={15} /> Verwijderen
        </button>
      </div>

      {/* Track list */}
      {tracks.length === 0 ? (
        <div className="text-center py-16">
          <Music size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">Deze afspeellijst is leeg</p>
          <p className="text-slate-500 text-sm">Voeg nummers toe via het ··· menu op een nummer</p>
        </div>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <div
              key={track.id}
              draggable
              onDragStart={e => onDragStart(e, i)}
              onDragOver={e => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 group transition-colors cursor-grab active:cursor-grabbing"
            >
              <GripVertical size={16} className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
              <span className="w-5 text-center text-xs text-slate-600 shrink-0">{i + 1}</span>
              <div className="relative shrink-0">
                <img src={track.cover_url || track.cover} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                <button
                  onClick={() => playTrack(track, tracks)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play size={14} className="text-white ml-0.5" fill="white" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{track.title}</p>
                <p className="text-xs text-slate-400 truncate">{track.artist}</p>
              </div>
              <span className="text-xs text-slate-500 shrink-0">{formatDuration(track.duration)}</span>
              <button
                onClick={() => handleRemoveTrack(track.id)}
                className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Verwijder uit afspeellijst"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
