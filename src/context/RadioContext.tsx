import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { pausePlayerAudio } from '@context/PlayerContext';

export interface RadioStation {
  id: string;
  name: string;
  description: string;
  stream_url: string;
  is_live: boolean;
  genre: string;
  created_at: string;
  owner_id?: string;
}

interface RadioContextValue {
  stations: RadioStation[];
  liveStations: RadioStation[];
  isLive: boolean;
  currentStation: RadioStation | null;
  isRadioPlaying: boolean;
  radioError: string | null;
  playStation: (station: RadioStation) => void;
  stopRadio: () => void;
  toggleStation: (station: RadioStation) => void;
  fetchStations: () => Promise<void>;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }) {
  const [stations, setStations]           = useState<RadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [radioError, setRadioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Distinguishes real stream failures from the error event fired by clearing src in stopRadio
  const wantsPlayRef = useRef(false);
  if (!audioRef.current) audioRef.current = new Audio();

  const streamFailed = useCallback((e?: unknown) => {
    // Switching stations aborts the previous play() — not a real failure
    if (e instanceof DOMException && e.name === 'AbortError') return;
    if (!wantsPlayRef.current) return;
    wantsPlayRef.current = false;
    setIsRadioPlaying(false);
    setRadioError('De stream kan niet worden afgespeeld. Controleer of de zender uitzendt en of de stream-URL klopt (https).');
  }, []);

  const fetchStations = useCallback(async () => {
    const { data } = await supabase.from('radio_streams').select('*').order('created_at');
    if (data) setStations(data as RadioStation[]);
  }, []);

  // When the stations list refreshes, stop playback if the current station went offline
  useEffect(() => {
    setCurrentStation(prev => {
      if (!prev) return null;
      const updated = stations.find(s => s.id === prev.id);
      if (!updated || !updated.is_live) {
        audioRef.current?.pause();
        setIsRadioPlaying(false);
        return null;
      }
      return updated;
    });
  }, [stations]);

  useEffect(() => {
    fetchStations();

    const channel = supabase
      .channel('radio_streams_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radio_streams' }, fetchStations)
      .subscribe();

    const audio = audioRef.current!;
    audio.addEventListener('error', streamFailed);

    return () => {
      supabase.removeChannel(channel);
      audio.removeEventListener('error', streamFailed);
    };
  }, [fetchStations, streamFailed]);

  const playStation = useCallback((station: RadioStation) => {
    if (!station.stream_url || !station.is_live) return;
    pausePlayerAudio(); // stop track audio synchronously before starting radio
    const audio = audioRef.current!;
    setRadioError(null);
    wantsPlayRef.current = true;
    audio.src = station.stream_url;
    audio.play().catch(streamFailed);
    setCurrentStation(station);
    setIsRadioPlaying(true);
  }, [streamFailed]);

  const stopRadio = useCallback(() => {
    const audio = audioRef.current!;
    wantsPlayRef.current = false;
    audio.pause();
    audio.src = '';
    setIsRadioPlaying(false);
    setCurrentStation(null);
  }, []);

  const toggleStation = useCallback((station: RadioStation) => {
    if (isRadioPlaying && currentStation?.id === station.id) stopRadio();
    else playStation(station);
  }, [isRadioPlaying, currentStation, playStation, stopRadio]);

  const liveStations = stations.filter(s => s.is_live);

  return (
    <RadioContext.Provider value={{
      stations,
      liveStations,
      isLive: liveStations.length > 0,
      currentStation,
      isRadioPlaying,
      radioError,
      playStation,
      stopRadio,
      toggleStation,
      fetchStations,
    }}>
      {children}
    </RadioContext.Provider>
  );
}

export const useRadio = () => useContext(RadioContext)!;
