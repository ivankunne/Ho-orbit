import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addNotification } from '@services/notificationService';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [likedTracks,      setLikedTracks]      = useState<(number | string)[]>([]);
  const [followedArtists,  setFollowedArtists]  = useState<number[]>([]);
  const [rsvpEvents,       setRsvpEvents]       = useState<number[]>([]);
  const [tutorialProgress, setTutorialProgress] = useState<Record<number, number>>({});
  const [currentUserId, setCurrentUserId]       = useState<string | null>(null);

  // Load user-specific state from Supabase when user logs in
  useEffect(() => {
    if (!currentUserId) {
      setLikedTracks([]);
      setFollowedArtists([]);
      setRsvpEvents([]);
      return;
    }
    (async () => {
      const [liked, following, attending] = await Promise.all([
        supabase.from('user_liked_tracks').select('track_id').eq('user_id', currentUserId),
        supabase.from('user_following_artists').select('artist_id').eq('user_id', currentUserId),
        supabase.from('user_attending_events').select('event_id').eq('user_id', currentUserId),
      ]);
      setLikedTracks((liked.data ?? []).map((r) => r.track_id));
      setFollowedArtists((following.data ?? []).map((r) => r.artist_id));
      setRsvpEvents((attending.data ?? []).map((r) => r.event_id));
    })();
  }, [currentUserId]);

  const toggleLike = useCallback(async (trackId: number) => {
    if (!currentUserId) return;
    const isLiking = !likedTracks.includes(trackId);
    setLikedTracks((prev) =>
      isLiking ? [...prev, trackId] : prev.filter((id) => id !== trackId)
    );
    if (isLiking) {
      await supabase.from('user_liked_tracks').upsert({ user_id: currentUserId, track_id: trackId });
      const { data: track } = await supabase.from('tracks').select('title').eq('id', trackId).single();
      if (track) {
        addNotification(currentUserId, {
          type: 'like', title: 'Nummer geliked',
          body: `Je hebt "${track.title}" geliked`, link: '/library',
        });
      }
    } else {
      await supabase.from('user_liked_tracks').delete().eq('user_id', currentUserId).eq('track_id', trackId);
    }
  }, [currentUserId, likedTracks]);

  const toggleFollow = useCallback(async (artistId: number) => {
    if (!currentUserId) return;
    const isFollowing = !followedArtists.includes(artistId);
    setFollowedArtists((prev) =>
      isFollowing ? [...prev, artistId] : prev.filter((id) => id !== artistId)
    );
    if (isFollowing) {
      await supabase.from('user_following_artists').upsert({ user_id: currentUserId, artist_id: artistId });
      const { data: artist } = await supabase.from('artists').select('name').eq('id', artistId).single();
      if (artist) {
        addNotification(currentUserId, {
          type: 'follow', title: 'Artiest gevolgd',
          body: `Je volgt nu ${artist.name}`, link: `/artists/${artistId}`,
        });
      }
    } else {
      await supabase.from('user_following_artists').delete().eq('user_id', currentUserId).eq('artist_id', artistId);
    }
  }, [currentUserId, followedArtists]);

  const toggleRsvp = useCallback(async (eventId: number) => {
    if (!currentUserId) return;
    const isRsvping = !rsvpEvents.includes(eventId);
    setRsvpEvents((prev) =>
      isRsvping ? [...prev, eventId] : prev.filter((id) => id !== eventId)
    );
    if (isRsvping) {
      await supabase.from('user_attending_events').upsert({ user_id: currentUserId, event_id: eventId });
      const { data: event } = await supabase.from('events').select('name').eq('id', eventId).single();
      if (event) {
        addNotification(currentUserId, {
          type: 'rsvp', title: 'Aangemeld voor event',
          body: `Je staat op de lijst voor ${event.name}`,
          link: `/events/${eventId}`,
        });
      }
    } else {
      await supabase.from('user_attending_events').delete().eq('user_id', currentUserId).eq('event_id', eventId);
    }
  }, [currentUserId, rsvpEvents]);

  const setTutorialWatched = useCallback(async (id: number) => {
    setTutorialProgress((prev) => ({ ...prev, [id]: 100 }));
    if (currentUserId) {
      await supabase.from('tutorial_progress').upsert({
        user_id: currentUserId, tutorial_id: id, progress: 100, watched_at: new Date().toISOString(),
      });
    }
  }, [currentUserId]);

  const clearTutorialProgress = useCallback(async (id: number) => {
    setTutorialProgress((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (currentUserId) {
      await supabase.from('tutorial_progress').delete().eq('user_id', currentUserId).eq('tutorial_id', id);
    }
  }, [currentUserId]);

  return (
    <AppStateContext.Provider value={{
      likedTracks, followedArtists, rsvpEvents, tutorialProgress,
      currentUserId, setCurrentUserId,
      toggleLike, toggleFollow, toggleRsvp, setTutorialWatched, clearTutorialProgress,
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export const useAppState = () => useContext(AppStateContext);
