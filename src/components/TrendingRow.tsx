import { memo } from 'react';
import { Play, Heart } from 'lucide-react';
import { usePlayer } from '@context/PlayerContext';
import { useAppState } from '@context/AppStateContext';
import { formatPlays } from '@utils/format';
import { MovementBadge } from '@components/MovementBadge';

function TrendingRowInner({ track, rank, queue, prevPosition }) {
  const { playTrack, track: currentTrack, isPlaying } = usePlayer();
  const { likedTracks, toggleLike } = useAppState();
  const isActive = currentTrack?.id === track.id;
  const liked = likedTracks.includes(track.id);

  return (
    <div
      onClick={() => playTrack(track, queue)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 rounded-xl group cursor-pointer transition-colors"
    >
      <div className="w-8 flex flex-col items-center gap-0.5 shrink-0">
        <span className={`text-sm font-bold leading-none ${isActive ? 'text-violet-400' : rank <= 3 ? 'text-violet-400' : 'text-slate-500'}`}>{rank}</span>
        <MovementBadge prevPosition={prevPosition} rank={rank} />
      </div>
      <div className="relative w-10 h-10 shrink-0">
        <img src={track.cover_url || track.cover} alt={track.title} className="w-full h-full object-cover rounded-lg" />
        <div className={`absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isActive && isPlaying
            ? <span className="w-3 h-3 flex gap-[2px] items-end"><span className="w-0.5 bg-white rounded-sm h-2" /><span className="w-0.5 bg-white rounded-sm h-3" /><span className="w-0.5 bg-white rounded-sm h-1.5" /></span>
            : <Play size={12} className="text-white" fill="white" />
          }
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-violet-400' : 'text-white'}`}>{track.title}</p>
        <p className="text-xs text-slate-400">{track.artist}</p>
      </div>
      <span className="text-xs text-slate-500 hidden sm:block shrink-0">{track.duration}</span>
      <span className="text-xs text-slate-500 hidden md:block shrink-0 w-14 text-right">{formatPlays(track.plays)}</span>
      <button
        onClick={e => { e.stopPropagation(); toggleLike(track.id); }}
        className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 ${liked ? 'text-violet-400 opacity-100' : 'text-slate-600 hover:text-slate-300'}`}
      >
        <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

export const TrendingRow = memo(TrendingRowInner);
