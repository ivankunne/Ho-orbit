import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { pausePlayerAudio } from '@context/PlayerContext';
import { useRadio } from '@context/RadioContext';

export interface Podcast {
  id: string;
  owner_id?: string;
  title: string;
  description: string;
  genre: string;
  cover_image_url: string;
  created_at: string;
}

export interface PodcastEpisode {
  id: string;
  podcast_id: string;
  title: string;
  description: string;
  audio_url: string;
  duration: string;
  episode_number: number | null;
  published_at: string;
  created_at: string;
}

interface PodcastContextValue {
  podcasts: Podcast[];
  episodeCounts: Record<string, number>;
  currentPodcast: Podcast | null;
  currentEpisode: PodcastEpisode | null;
  isPodcastPlaying: boolean;
  podcastError: string | null;
  playEpisode: (podcast: Podcast, episode: PodcastEpisode) => void;
  stopPodcast: () => void;
  toggleEpisode: (podcast: Podcast, episode: PodcastEpisode) => void;
  fetchPodcasts: () => Promise<void>;
}

const PodcastContext = createContext<PodcastContextValue | null>(null);

// Module-level hook so RadioContext can stop podcast playback synchronously
// when a station starts, without a circular import between context providers
// (same trick PlayerContext uses for pausePlayerAudio).
let _stopPodcastAudio: () => void = () => {};
export function pausePodcastAudio() { _stopPodcastAudio(); }

export function PodcastProvider({ children }) {
  const { stopRadio, stopRecording } = useRadio();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodeCounts, setEpisodeCounts] = useState<Record<string, number>>({});
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wantsPlayRef = useRef(false);
  if (!audioRef.current) audioRef.current = new Audio();

  const streamFailed = useCallback((e?: unknown) => {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    if (!wantsPlayRef.current) return;
    wantsPlayRef.current = false;
    setIsPodcastPlaying(false);
    setPodcastError('De aflevering kan niet worden afgespeeld. Controleer de audio-URL.');
  }, []);

  const fetchPodcasts = useCallback(async () => {
    const { data } = await supabase.from('podcasts').select('*').order('created_at');
    if (data) setPodcasts(data as Podcast[]);
  }, []);

  const fetchEpisodeCounts = useCallback(async () => {
    const { data } = await supabase.from('podcast_episodes').select('podcast_id');
    if (!data) return;
    const counts: Record<string, number> = {};
    for (const row of data as { podcast_id: string }[]) {
      counts[row.podcast_id] = (counts[row.podcast_id] ?? 0) + 1;
    }
    setEpisodeCounts(counts);
  }, []);

  useEffect(() => {
    fetchPodcasts();
    fetchEpisodeCounts();

    const podcastsChannel = supabase
      .channel('podcasts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'podcasts' }, fetchPodcasts)
      .subscribe();

    const episodesChannel = supabase
      .channel('podcast_episodes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_episodes' }, fetchEpisodeCounts)
      .subscribe();

    const audio = audioRef.current!;
    audio.addEventListener('error', streamFailed);

    return () => {
      supabase.removeChannel(podcastsChannel);
      supabase.removeChannel(episodesChannel);
      audio.removeEventListener('error', streamFailed);
    };
  }, [fetchPodcasts, fetchEpisodeCounts, streamFailed]);

  const stopPodcast = useCallback(() => {
    const audio = audioRef.current!;
    wantsPlayRef.current = false;
    audio.pause();
    audio.src = '';
    setIsPodcastPlaying(false);
    setCurrentPodcast(null);
    setCurrentEpisode(null);
  }, []);

  useEffect(() => {
    _stopPodcastAudio = stopPodcast;
    return () => { _stopPodcastAudio = () => {}; };
  }, [stopPodcast]);

  const playEpisode = useCallback((podcast: Podcast, episode: PodcastEpisode) => {
    if (!episode.audio_url) return;
    pausePlayerAudio(); // stop track audio
    stopRadio(); // stop live radio
    stopRecording(); // stop any radio recording playback
    const audio = audioRef.current!;
    setPodcastError(null);
    wantsPlayRef.current = true;
    audio.src = episode.audio_url;
    audio.play().catch(streamFailed);
    setCurrentPodcast(podcast);
    setCurrentEpisode(episode);
    setIsPodcastPlaying(true);
  }, [stopRadio, stopRecording, streamFailed]);

  const toggleEpisode = useCallback((podcast: Podcast, episode: PodcastEpisode) => {
    if (isPodcastPlaying && currentEpisode?.id === episode.id) stopPodcast();
    else playEpisode(podcast, episode);
  }, [isPodcastPlaying, currentEpisode, playEpisode, stopPodcast]);

  return (
    <PodcastContext.Provider value={{
      podcasts,
      episodeCounts,
      currentPodcast,
      currentEpisode,
      isPodcastPlaying,
      podcastError,
      playEpisode,
      stopPodcast,
      toggleEpisode,
      fetchPodcasts,
    }}>
      {children}
    </PodcastContext.Provider>
  );
}

export const usePodcast = () => useContext(PodcastContext)!;
