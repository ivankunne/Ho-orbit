import { memo } from 'react';
import { Play, Heart } from 'lucide-react';
import { usePlayer } from '@context/PlayerContext';
import { useAppState } from '@context/AppStateContext';
import { useToast } from '@components/Toast';
import { formatPlays } from '@utils/format';

function MusicCardInner({ track, queue }) {
  const { playTrack, track: currentTrack, isPlaying } = usePlayer();
  const { likedTracks, toggleLike } = useAppState();
  const addToast = useToast();
  const isActive = currentTrack?.id === track.id;
  const liked = likedTracks.includes(track.id);

  return (
    <div className="group relative bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl overflow-hidden transition-all cursor-pointer p-3">
      <div className="relative overflow-hidden rounded-lg aspect-square mb-3">
        <img
          src={track.cover_url || track.cover}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={() => playTrack(track, queue)}
            className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center shadow-lg hover:bg-violet-500 transition-colors"
          >
            {isActive && isPlaying
              ? <span className="w-4 h-4 flex gap-[3px] items-end"><span className="w-1 bg-white rounded-sm h-3" /><span className="w-1 bg-white rounded-sm h-4" /><span className="w-1 bg-white rounded-sm h-2" /></span>
              : <Play size={20} className="text-white ml-0.5" fill="white" />
            }
          </button>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-violet-400' : 'text-white'}`}>{track.title}</p>
          <p className="text-xs text-slate-400 truncate">{track.artist}</p>
          <p className="text-xs text-slate-500 mt-1">{formatPlays(track.plays)} streams</p>
        </div>
        <button
          onClick={() => {
            toggleLike(track.id);
            addToast(!liked ? `"${track.title}" toegevoegd aan favorieten` : 'Verwijderd uit favorieten', !liked ? 'success' : 'info');
          }}
          className={`shrink-0 p-1 rounded-md transition-colors ${liked ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}

export const MusicCard = memo(MusicCardInner);
