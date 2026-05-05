import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RadioStation {
  id: string;
  name: string;
  description: string;
  stream_url: string;
  is_live: boolean;
  genre: string;
  created_at: string;
}

interface RadioContextValue {
  stations: RadioStation[];
  liveStations: RadioStation[];
  isLive: boolean;
  currentStation: RadioStation | null;
  isRadioPlaying: boolean;
  playStation: (station: RadioStation) => void;
  stopRadio: () => void;
  toggleStation: (station: RadioStation) => void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }) {
  const [stations, setStations]           = useState<RadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current) audioRef.current = new Audio();

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
    const onError = () => setIsRadioPlaying(false);
    audio.addEventListener('error', onError);

    return () => {
      supabase.removeChannel(channel);
      audio.removeEventListener('error', onError);
    };
  }, [fetchStations]);

  const playStation = useCallback((station: RadioStation) => {
    if (!station.stream_url || !station.is_live) return;
    const audio = audioRef.current!;
    audio.src = station.stream_url;
    audio.play().catch(() => setIsRadioPlaying(false));
    setCurrentStation(station);
    setIsRadioPlaying(true);
  }, []);

  const stopRadio = useCallback(() => {
    const audio = audioRef.current!;
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
      playStation,
      stopRadio,
      toggleStation,
    }}>
      {children}
    </RadioContext.Provider>
  );
}

export const useRadio = () => useContext(RadioContext)!;
