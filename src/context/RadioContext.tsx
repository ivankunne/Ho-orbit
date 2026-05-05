import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RadioStream {
  id: number;
  is_live: boolean;
  stream_url: string;
  title: string;
  description: string;
}

interface RadioContextValue {
  radioData: RadioStream | null;
  isLive: boolean;
  isRadioPlaying: boolean;
  playRadio: () => void;
  stopRadio: () => void;
  toggleRadio: () => void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }) {
  const [radioData, setRadioData] = useState<RadioStream | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current) audioRef.current = new Audio();

  useEffect(() => {
    supabase.from('radio_stream').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setRadioData(data as RadioStream); });

    const channel = supabase
      .channel('radio_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'radio_stream' }, ({ new: row }) => {
        const updated = row as RadioStream;
        setRadioData(updated);
        if (!updated.is_live) {
          audioRef.current?.pause();
          setIsRadioPlaying(false);
        }
      })
      .subscribe();

    const audio = audioRef.current!;
    const onError = () => setIsRadioPlaying(false);
    audio.addEventListener('error', onError);

    return () => {
      supabase.removeChannel(channel);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const playRadio = useCallback(() => {
    if (!radioData?.stream_url || !radioData.is_live) return;
    const audio = audioRef.current!;
    audio.src = radioData.stream_url;
    audio.play().catch(() => setIsRadioPlaying(false));
    setIsRadioPlaying(true);
  }, [radioData]);

  const stopRadio = useCallback(() => {
    const audio = audioRef.current!;
    audio.pause();
    audio.src = '';
    setIsRadioPlaying(false);
  }, []);

  const toggleRadio = useCallback(() => {
    if (isRadioPlaying) stopRadio();
    else playRadio();
  }, [isRadioPlaying, playRadio, stopRadio]);

  return (
    <RadioContext.Provider value={{
      radioData,
      isLive: radioData?.is_live ?? false,
      isRadioPlaying,
      playRadio,
      stopRadio,
      toggleRadio,
    }}>
      {children}
    </RadioContext.Provider>
  );
}

export const useRadio = () => useContext(RadioContext)!;
