import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { pausePlayerAudio } from '@context/PlayerContext';
import { pausePodcastAudio } from '@context/PodcastContext';

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

export interface RadioRecording {
  id: string;
  station_id: string;
  title: string;
  description: string;
  audio_url: string;
  duration: string;
  recorded_at: string;
  created_at: string;
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
  recordingCounts: Record<string, number>;
  currentRecording: RadioRecording | null;
  isRecordingPlaying: boolean;
  recordingError: string | null;
  playRecording: (recording: RadioRecording) => void;
  stopRecording: () => void;
  toggleRecording: (recording: RadioRecording) => void;
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

  // Recordings play through a separate audio element — a station's live stream
  // and a past recording are conceptually different (live vs on-demand/seekable)
  // and this keeps their playback state from tangling together.
  const [recordingCounts, setRecordingCounts] = useState<Record<string, number>>({});
  const [currentRecording, setCurrentRecording] = useState<RadioRecording | null>(null);
  const [isRecordingPlaying, setIsRecordingPlaying] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);
  const wantsRecordingPlayRef = useRef(false);
  if (!recordingAudioRef.current) recordingAudioRef.current = new Audio();

  const streamFailed = useCallback((e?: unknown) => {
    // Switching stations aborts the previous play() — not a real failure
    if (e instanceof DOMException && e.name === 'AbortError') return;
    if (!wantsPlayRef.current) return;
    wantsPlayRef.current = false;
    setIsRadioPlaying(false);
    setRadioError('De stream kan niet worden afgespeeld. Controleer of de zender uitzendt en of de stream-URL klopt (https).');
  }, []);

  const recordingFailed = useCallback((e?: unknown) => {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    if (!wantsRecordingPlayRef.current) return;
    wantsRecordingPlayRef.current = false;
    setIsRecordingPlaying(false);
    setRecordingError('De opname kan niet worden afgespeeld. Controleer de audio-URL.');
  }, []);

  const fetchStations = useCallback(async () => {
    const { data } = await supabase.from('radio_streams').select('*').order('created_at');
    if (data) setStations(data as RadioStation[]);
  }, []);

  const fetchRecordingCounts = useCallback(async () => {
    const { data } = await supabase.from('radio_recordings').select('station_id');
    if (!data) return;
    const counts: Record<string, number> = {};
    for (const row of data as { station_id: string }[]) {
      counts[row.station_id] = (counts[row.station_id] ?? 0) + 1;
    }
    setRecordingCounts(counts);
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
    fetchRecordingCounts();

    const channel = supabase
      .channel('radio_streams_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radio_streams' }, fetchStations)
      .subscribe();

    const recordingsChannel = supabase
      .channel('radio_recordings_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radio_recordings' }, fetchRecordingCounts)
      .subscribe();

    const audio = audioRef.current!;
    audio.addEventListener('error', streamFailed);
    const recordingAudio = recordingAudioRef.current!;
    recordingAudio.addEventListener('error', recordingFailed);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(recordingsChannel);
      audio.removeEventListener('error', streamFailed);
      recordingAudio.removeEventListener('error', recordingFailed);
    };
  }, [fetchStations, fetchRecordingCounts, streamFailed, recordingFailed]);

  const stopRecording = useCallback(() => {
    const audio = recordingAudioRef.current!;
    wantsRecordingPlayRef.current = false;
    audio.pause();
    audio.src = '';
    setIsRecordingPlaying(false);
    setCurrentRecording(null);
  }, []);

  const stopRadio = useCallback(() => {
    const audio = audioRef.current!;
    wantsPlayRef.current = false;
    audio.pause();
    audio.src = '';
    setIsRadioPlaying(false);
    setCurrentStation(null);
  }, []);

  const playStation = useCallback((station: RadioStation) => {
    if (!station.stream_url || !station.is_live) return;
    pausePlayerAudio(); // stop track audio synchronously before starting radio
    pausePodcastAudio(); // stop podcast audio synchronously before starting radio
    stopRecording(); // a station is either playing live or a recording, not both
    const audio = audioRef.current!;
    setRadioError(null);
    wantsPlayRef.current = true;
    audio.src = station.stream_url;
    audio.play().catch(streamFailed);
    setCurrentStation(station);
    setIsRadioPlaying(true);
  }, [streamFailed, stopRecording]);

  const toggleStation = useCallback((station: RadioStation) => {
    if (isRadioPlaying && currentStation?.id === station.id) stopRadio();
    else playStation(station);
  }, [isRadioPlaying, currentStation, playStation, stopRadio]);

  const playRecording = useCallback((recording: RadioRecording) => {
    if (!recording.audio_url) return;
    pausePlayerAudio();
    pausePodcastAudio();
    stopRadio(); // a station is either playing live or a recording, not both
    const audio = recordingAudioRef.current!;
    setRecordingError(null);
    wantsRecordingPlayRef.current = true;
    audio.src = recording.audio_url;
    audio.play().catch(recordingFailed);
    setCurrentRecording(recording);
    setIsRecordingPlaying(true);
  }, [recordingFailed, stopRadio]);

  const toggleRecording = useCallback((recording: RadioRecording) => {
    if (isRecordingPlaying && currentRecording?.id === recording.id) stopRecording();
    else playRecording(recording);
  }, [isRecordingPlaying, currentRecording, playRecording, stopRecording]);

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
      recordingCounts,
      currentRecording,
      isRecordingPlaying,
      recordingError,
      playRecording,
      stopRecording,
      toggleRecording,
    }}>
      {children}
    </RadioContext.Provider>
  );
}

export const useRadio = () => useContext(RadioContext)!;
