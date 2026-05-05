import { useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Pause, SkipBack, SkipForward, Heart, Volume2,
  Shuffle, Repeat, Repeat1, ChevronDown, ListMusic, Mic2, Radio,
} from 'lucide-react';
import { usePlayer, usePlayerProgress } from '@context/PlayerContext';
import { useRadio } from '@context/RadioContext';
import { useState } from 'react';
import { getWaveform, EqBars } from '@components/Waveform';

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicPlayer() {
  const {
    track, queue, currentIndex, isPlaying,
    volume, shuffle, repeatMode, liked,
    setIsPlaying, setVolume, setShuffle, setLiked, toggleRepeat,
    skipForward, skipBack, seek, playTrack,
  } = usePlayer();

  const { isRadioPlaying, toggleRadio, stopRadio, playRadio, radioData } = useRadio();
  const { currentTime, duration } = usePlayerProgress();

  const [expanded, setExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Stop radio when a track starts playing
  useEffect(() => {
    if (isPlaying) stopRadio();
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause track when radio starts
  useEffect(() => {
    if (isRadioPlaying) setIsPlaying(false);
  }, [isRadioPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const waveformBars = useMemo(() => getWaveform(currentIndex + 1, 60, 'player'), [currentIndex]);

  if (!track && !isRadioPlaying) return null;

  const queueDisplay = queue.filter((_, i) => i !== currentIndex);
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <>
      <style>{`
        @keyframes eqBar0 { from { height: 20% } to { height: 90% } }
        @keyframes eqBar1 { from { height: 60% } to { height: 30% } }
        @keyframes eqBar2 { from { height: 40% } to { height: 85% } }
        @keyframes eqBar3 { from { height: 70% } to { height: 25% } }
        @keyframes eqBar4 { from { height: 30% } to { height: 75% } }
      `}</style>

      {expanded && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={() => setExpanded(false)} />
      )}

      <div className={`fixed left-0 right-0 z-[70] bg-[#1a1528]/98 backdrop-blur-2xl border-t border-white/8 transition-all duration-500 ease-out ${
        expanded ? 'bottom-0' : 'bottom-16 lg:bottom-0'
      }`}>

        {/* Expanded panel */}
        {expanded && (
          <div className="max-w-lg mx-auto px-4 sm:px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-white transition-colors">
                <ChevronDown size={24} />
              </button>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {isRadioPlaying ? 'Live Radio' : 'Nu aan het spelen'}
              </p>
              {isRadioPlaying ? (
                <div className="w-[30px]" />
              ) : (
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`p-1.5 rounded-lg transition-colors ${showQueue ? 'text-violet-400 bg-violet-600/10' : 'text-slate-400 hover:text-white'}`}
                >
                  <ListMusic size={18} />
                </button>
              )}
            </div>

            {/* Radio expanded view */}
            {isRadioPlaying ? (
              <div className="flex flex-col items-center py-4 gap-5">
                <div className="relative w-32 h-32 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Radio size={48} className="text-red-400" />
                  <div className="absolute inset-0 rounded-2xl border border-red-500/20 animate-ping opacity-20" />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                      <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Live</span>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-white mt-1">{radioData?.title || 'h-orbit Radio'}</p>
                  {radioData?.description && (
                    <p className="text-sm text-slate-400 mt-1 max-w-xs">{radioData.description}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-3">Live stream · spoelen niet mogelijk</p>
                </div>
                <button
                  onClick={toggleRadio}
                  className="w-14 h-14 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-black/30"
                >
                  <Pause size={20} className="text-black" fill="black" />
                </button>
              </div>

            ) : showQueue ? (
              <div>
                <p className="text-sm font-semibold text-white mb-3">Volgende nummers</p>
                <div className="space-y-1">
                  {queueDisplay.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => playTrack(t)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <img src={t.cover_url || `https://picsum.photos/seed/${encodeURIComponent(String(t.title || t.id))}/80/80`} onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(String(t.id))}/80/80`; }} alt={t.title} className="w-9 h-9 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate group-hover:text-violet-300 transition-colors">{t.title}</p>
                        <p className="text-xs text-slate-500 truncate">{t.artist}</p>
                      </div>
                      <span className="text-xs text-slate-600">{t.duration}</span>
                    </div>
                  ))}
                  {queueDisplay.length === 0 && (
                    <p className="text-xs text-slate-500 py-4 text-center">Geen nummers in de wachtrij</p>
                  )}
                </div>
              </div>

            ) : track ? (
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <img
                  src={track.cover_url || `https://picsum.photos/seed/${encodeURIComponent(String(track.title || track.id))}/300/300`}
                  onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(String(track.id))}/300/300`; }}
                  alt={track.title}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-2xl shadow-black/60 shrink-0 mx-auto sm:mx-0"
                />
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="text-xl font-bold text-white truncate">{track.title}</p>
                      <Link
                        to={`/artists/${track.artistId}`}
                        onClick={() => setExpanded(false)}
                        className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        {track.artist}
                      </Link>
                    </div>
                    <button
                      onClick={() => setLiked(l => !l)}
                      className={`shrink-0 mt-1 transition-colors ${liked ? 'text-violet-400' : 'text-slate-500 hover:text-white'}`}
                    >
                      <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{track.album || track.genre}</p>

                  <div
                    className="flex items-end gap-[2px] h-12 mb-3 cursor-pointer group"
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      seek(((e.clientX - rect.left) / rect.width) * duration);
                    }}
                  >
                    {waveformBars.map((h, i) => {
                      const played = (i / waveformBars.length) * 100 < progress;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all group-hover:opacity-90 ${played ? 'bg-violet-500' : 'bg-white/15'}`}
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {!showQueue && !isRadioPlaying && track && (
              <div className="mt-4 p-3 bg-white/3 border border-white/8 rounded-xl flex items-center gap-3">
                <Mic2 size={16} className="text-slate-500 shrink-0" />
                <p className="text-xs text-slate-500 italic line-clamp-1">
                  "{track.title}" — {track.artist}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mobile progress strip */}
        <div className="lg:hidden h-0.5 bg-white/10">
          {isRadioPlaying ? (
            <div className="h-full bg-red-500 w-full animate-pulse" />
          ) : (
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
          )}
        </div>

        {/* Always-visible bar */}
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-[68px] flex items-center gap-3">

          {isRadioPlaying ? (
            <>
              {/* Radio info */}
              <button
                className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none lg:w-64 text-left"
                onClick={() => setExpanded(e => !e)}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                    <Radio size={18} className="text-red-400" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute opacity-75" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 relative" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{radioData?.title || 'h-orbit Radio'}</p>
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse inline-block" />
                    LIVE
                  </p>
                </div>
              </button>

              {/* Play/pause */}
              <div className="flex-1 flex items-center justify-center">
                <button
                  onClick={toggleRadio}
                  className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-black/30"
                >
                  <Pause size={16} className="text-black" fill="black" />
                </button>
              </div>

              {/* Volume */}
              <div className="hidden lg:flex items-center gap-3 w-36 justify-end">
                <Volume2 size={16} className="text-slate-400 shrink-0" />
                <input
                  type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="w-20 h-1 accent-white cursor-pointer"
                />
              </div>
            </>

          ) : track ? (
            <>
              {/* Track info */}
              <button
                className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none lg:w-64 text-left"
                onClick={() => setExpanded(e => !e)}
              >
                <div className="relative shrink-0">
                  <img src={track.cover_url || `https://picsum.photos/seed/${encodeURIComponent(String(track.title || track.id))}/80/80`} onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(String(track.id))}/80/80`; }} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                  {isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                      <EqBars playing={isPlaying} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                  <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                </div>
              </button>

              {/* Heart */}
              <button
                onClick={() => setLiked(l => !l)}
                className={`hidden lg:block shrink-0 transition-colors ${liked ? 'text-violet-400' : 'text-slate-500 hover:text-white'}`}
              >
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              </button>

              {/* Center controls */}
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShuffle(s => !s)}
                    className={`hidden lg:block transition-colors ${shuffle ? 'text-violet-400' : 'text-slate-500 hover:text-white'}`}
                  >
                    <Shuffle size={15} />
                  </button>
                  <button onClick={skipBack} className="text-slate-400 hover:text-white transition-colors">
                    <SkipBack size={18} fill="currentColor" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(p => !p)}
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-black/30"
                  >
                    {isPlaying
                      ? <Pause size={16} className="text-black" fill="black" />
                      : <Play  size={16} className="text-black ml-0.5" fill="black" />
                    }
                  </button>
                  <button onClick={skipForward} className="text-slate-400 hover:text-white transition-colors">
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    className={`hidden lg:block transition-colors ${repeatMode !== 'off' ? 'text-violet-400' : 'text-slate-500 hover:text-white'}`}
                  >
                    <RepeatIcon size={15} />
                  </button>
                </div>

                {/* Progress bar desktop */}
                <div className="hidden lg:flex items-center gap-2 w-full max-w-md">
                  <span className="text-[10px] text-slate-500 w-8 text-right shrink-0">{formatTime(currentTime)}</span>
                  <div
                    className="flex-1 h-1 bg-white/15 rounded-full cursor-pointer group relative"
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      seek(((e.clientX - rect.left) / rect.width) * duration);
                    }}
                  >
                    <div className="h-full bg-white rounded-full relative" style={{ width: `${progress}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 w-8 shrink-0">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right controls */}
              <div className="hidden lg:flex items-center gap-3 w-36 justify-end">
                <ListMusic
                  size={16}
                  className={`cursor-pointer transition-colors ${showQueue && expanded ? 'text-violet-400' : 'text-slate-500 hover:text-white'}`}
                  onClick={() => { setExpanded(true); setShowQueue(true); }}
                />
                <Volume2 size={16} className="text-slate-400 shrink-0" />
                <input
                  type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="w-20 h-1 accent-white cursor-pointer"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
