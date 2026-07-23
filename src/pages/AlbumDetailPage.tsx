import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Heart, Loader2, Music } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@context/PlayerContext';
import { useAppState } from '@context/AppStateContext';
import UserAvatar from '@components/UserAvatar';
import { coverPlaceholder } from '@utils/placeholder';
import { formatPlays } from '@utils/format';
import { getAlbum, type Album } from '@services/albumService';
import { getAlbumTracks, type UploadedTrack } from '@services/uploadService';

interface OwnerProfile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [tracks, setTracks] = useState<UploadedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const { playTrack, track: currentTrack, isPlaying } = usePlayer();
  const { likedTracks, toggleLike } = useAppState();

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    (async () => {
      const a = await getAlbum(id);
      if (!active) return;
      setAlbum(a);
      if (a) {
        const [ownerRes, albumTracks] = await Promise.all([
          supabase.from('profiles').select('username, display_name, avatar_url').eq('id', a.ownerId).maybeSingle(),
          getAlbumTracks(id),
        ]);
        if (!active) return;
        setOwner(ownerRes.data ?? null);
        setTracks(albumTracks);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <Music size={32} className="text-slate-600 mb-3" />
        <p className="text-slate-300 font-medium">Album niet gevonden</p>
        <Link to="/muziek" className="text-violet-400 hover:underline text-sm mt-3">Terug naar muziek</Link>
      </div>
    );
  }

  const totalPlays = tracks.reduce((sum, t) => sum + (t.plays ?? 0), 0);
  const ownerName = owner?.display_name || owner?.username || 'Onbekend';
  const isAlbumPlaying = isPlaying && tracks.some(t => t.id === currentTrack?.id);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <button onClick={() => history.back()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
        <ChevronLeft size={16} /> Terug
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-5 mb-8">
        <img
          src={album.coverUrl || coverPlaceholder(album.title)}
          alt={album.title}
          className="w-full sm:w-48 h-48 rounded-2xl object-cover shrink-0 shadow-2xl shadow-black/40"
        />
        <div className="flex-1 min-w-0 flex flex-col justify-end">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Album</p>
          <h1 className="text-2xl lg:text-4xl font-bold text-white mb-3 break-words">{album.title}</h1>
          {owner?.username && (
            <Link to={`/profiel/${owner.username}`} className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity w-fit">
              <UserAvatar src={owner.avatar_url} name={ownerName} size={24} />
              <span className="text-sm font-medium text-slate-200">{ownerName}</span>
            </Link>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
            {album.releaseDate && <span>{new Date(`${album.releaseDate}T00:00:00`).getFullYear()}</span>}
            {album.releaseDate && <span>·</span>}
            <span>{tracks.length} {tracks.length === 1 ? 'nummer' : 'nummers'}</span>
            {totalPlays > 0 && <><span>·</span><span>{formatPlays(totalPlays)} streams</span></>}
          </div>
          {album.description && <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-xl">{album.description}</p>}
          {tracks.length > 0 && (
            <button
              onClick={() => playTrack(tracks[0], tracks)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors mt-4 w-fit"
            >
              {isAlbumPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
              {isAlbumPlaying ? 'Pauzeren' : 'Album afspelen'}
            </button>
          )}
        </div>
      </div>

      {/* Track list */}
      {tracks.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">Nog geen nummers in dit album.</p>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, i) => {
            const isActive = currentTrack?.id === track.id;
            const liked = likedTracks.includes(track.id);
            return (
              <div
                key={track.id}
                onClick={() => playTrack(track, tracks)}
                className={`flex items-center gap-4 p-3 rounded-xl group cursor-pointer transition-colors ${
                  isActive ? 'bg-violet-600/10 border border-violet-500/20' : 'hover:bg-white/4'
                }`}
              >
                {isActive
                  ? <Play size={14} className="text-violet-400 w-5 shrink-0" fill="currentColor" />
                  : <span className="w-5 text-center text-sm text-slate-500 group-hover:hidden">{i + 1}</span>
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-violet-400' : 'text-white'}`}>{track.title}</p>
                  <p className="text-xs text-slate-400 truncate">{track.artist || ownerName}</p>
                </div>
                <span className="text-xs text-slate-500 hidden sm:block">{formatPlays(track.plays ?? 0)} streams</span>
                <span className="text-xs text-slate-500 shrink-0">{track.duration}</span>
                <button
                  onClick={e => { e.stopPropagation(); toggleLike(track.id as unknown as number); }}
                  className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 ${liked ? 'text-violet-400 !opacity-100' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
