import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getStreamUrl } from '@services/playerService';
import { addToHistory } from '@services/historyService';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [queue, setQueue]           = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const currentTimeRef = useRef(0);
  const durationRef    = useRef(0);
  const [volume, setVolume]         = useState(0.75);
  const [shuffle, setShuffle]       = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [liked, setLiked]           = useState(false);

  const audioRef = useRef(new Audio());
  const isNewTrack = useRef(false);
  const [userId, setUserId] = useState(null);

  // Subscriber pattern for progress updates (only MusicPlayer subscribes)
  const progressListeners = useRef(new Set());
  const notifyProgress = useCallback(() => {
    progressListeners.current.forEach(fn => fn());
  }, []);
  const subscribeProgress = useCallback((fn) => {
    progressListeners.current.add(fn);
    return () => progressListeners.current.delete(fn);
  }, []);

  const track = queue[currentIndex] ?? null;

  // --- Load track when currentIndex/queue changes ---
  useEffect(() => {
    if (!track) return;
    isNewTrack.current = true;

    getStreamUrl(track.id, track.stream_url).then(url => {
      audioRef.current.src = url;
      isNewTrack.current = false;
      // play() handles loading by itself — never call load() first,
      // it causes an AbortError that silently kills the play request
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    });
    // Record in listening history
    if (userId) addToHistory(userId, track.id);
    currentTimeRef.current = 0;
    durationRef.current = 0;
    setLiked(false);
    notifyProgress();
  }, [currentIndex, queue]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Sync play/pause state ---
  useEffect(() => {
    // Skip while a track switch is in progress — the load effect handles it
    if (!track || isNewTrack.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Sync volume ---
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // --- Audio event listeners (set once) ---
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      currentTimeRef.current = audio.currentTime;
      notifyProgress();
    };
    const onLoaded = () => {
      durationRef.current = audio.duration || 0;
      notifyProgress();
    };
    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (repeatMode === 'all' || currentIndex < queue.length - 1) {
        skipForward();
      } else {
        setIsPlaying(false);
        currentTimeRef.current = 0;
        notifyProgress();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeatMode, currentIndex, queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const playTrack = useCallback((trackObj, newQueue = null) => {
    const q = newQueue ?? queue;
    const idx = q.findIndex(t => t.id === trackObj.id);
    if (idx !== -1) {
      if (idx === currentIndex && q === queue) {
        // Same track — just toggle play
        setIsPlaying(p => !p);
      } else {
        setQueue(q);
        setCurrentIndex(idx);
        setIsPlaying(true);
      }
    } else {
      // Track not in queue — add it and play
      const newQ = [...q, trackObj];
      setQueue(newQ);
      setCurrentIndex(newQ.length - 1);
      setIsPlaying(true);
    }
  }, [queue, currentIndex]);

  const addToQueue = useCallback((trackObj) => {
    setQueue(prev => {
      if (prev.find(t => t.id === trackObj.id)) return prev;
      return [...prev, trackObj];
    });
  }, []);

  const skipForward = useCallback(() => {
    if (queue.length === 0) return;
    if (shuffle) {
      let next = Math.floor(Math.random() * queue.length);
      if (queue.length > 1) while (next === currentIndex) next = Math.floor(Math.random() * queue.length);
      setCurrentIndex(next);
    } else {
      setCurrentIndex(i => (i + 1) % queue.length);
    }
    setIsPlaying(true);
  }, [shuffle, currentIndex, queue.length]);

  const skipBack = useCallback(() => {
    if (currentTimeRef.current > 3) {
      audioRef.current.currentTime = 0;
      currentTimeRef.current = 0;
      notifyProgress();
    } else {
      setCurrentIndex(i => (i - 1 + queue.length) % queue.length);
      setIsPlaying(true);
    }
  }, [queue.length, notifyProgress]);

  const seek = useCallback((seconds) => {
    audioRef.current.currentTime = seconds;
    currentTimeRef.current = seconds;
    notifyProgress();
  }, [notifyProgress]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(m => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off');
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(s => !s);
  }, []);

  return (
    <PlayerContext.Provider value={{
      queue, track, currentIndex, isPlaying,
      get currentTime() { return currentTimeRef.current; },
      get duration() { return durationRef.current; },
      volume, shuffle, repeatMode, liked,
      setIsPlaying, setVolume, setShuffle, setLiked, toggleRepeat, togglePlay, toggleShuffle,
      playTrack, addToQueue, skipForward, skipBack, seek,
      audioRef, setUserId,
      _subscribeProgress: subscribeProgress,
      _currentTimeRef: currentTimeRef,
      _durationRef: durationRef,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);

export function usePlayerProgress() {
  const ctx = useContext(PlayerContext);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!ctx) return;
    return ctx._subscribeProgress(() => forceUpdate(n => n + 1));
  }, [ctx]);

  return {
    currentTime: ctx?._currentTimeRef.current ?? 0,
    duration: ctx?._durationRef.current ?? 0,
  };
}
