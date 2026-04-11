import { createContext, useContext, useState, useCallback } from 'react';
import { tracks, artists, events } from '@data/mockData';
import { addNotification } from '@services/notificationService';

const AppStateContext = createContext(null);

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function AppStateProvider({ children }) {
  const [likedTracks,      setLikedTracks]      = useState(() => loadLS('ho_likedTracks',      [1, 3]));
  const [followedArtists,  setFollowedArtists]  = useState(() => loadLS('ho_followedArtists',  []));
  const [rsvpEvents,       setRsvpEvents]       = useState(() => loadLS('ho_rsvpEvents',       []));
  const [tutorialProgress, setTutorialProgress] = useState(() => loadLS('ho_tutorialProgress', { 2: 68, 3: 31 }));
  // userId stored here so notification calls have access
  const [currentUserId, setCurrentUserId]       = useState(null);

  const toggleLike = useCallback((trackId) => {
    setLikedTracks(prev => {
      const isLiking = !prev.includes(trackId);
      const next = isLiking ? [...prev, trackId] : prev.filter(id => id !== trackId);
      localStorage.setItem('ho_likedTracks', JSON.stringify(next));
      if (isLiking && currentUserId) {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
          addNotification(currentUserId, {
            type: 'like',
            title: 'Nummer geliked',
            body: `Je hebt "${track.title}" geliked`,
            link: '/library',
          });
        }
      }
      return next;
    });
  }, [currentUserId]);

  const toggleFollow = useCallback((artistId) => {
    setFollowedArtists(prev => {
      const isFollowing = !prev.includes(artistId);
      const next = isFollowing ? [...prev, artistId] : prev.filter(id => id !== artistId);
      localStorage.setItem('ho_followedArtists', JSON.stringify(next));
      if (isFollowing && currentUserId) {
        const artist = artists.find(a => a.id === artistId);
        if (artist) {
          addNotification(currentUserId, {
            type: 'follow',
            title: 'Artiest gevolgd',
            body: `Je volgt nu ${artist.name}`,
            link: `/artists/${artistId}`,
          });
        }
      }
      return next;
    });
  }, [currentUserId]);

  const toggleRsvp = useCallback((eventId) => {
    setRsvpEvents(prev => {
      const isRsvping = !prev.includes(eventId);
      const next = isRsvping ? [...prev, eventId] : prev.filter(id => id !== eventId);
      localStorage.setItem('ho_rsvpEvents', JSON.stringify(next));
      if (isRsvping && currentUserId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
          addNotification(currentUserId, {
            type: 'rsvp',
            title: 'Aangemeld voor event',
            body: `Je staat op de lijst voor ${event.title}`,
            link: `/events/${eventId}`,
          });
        }
      }
      return next;
    });
  }, [currentUserId]);

  const setTutorialWatched = useCallback(id => {
    setTutorialProgress(prev => {
      const next = { ...prev, [id]: 100 };
      localStorage.setItem('ho_tutorialProgress', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearTutorialProgress = useCallback(id => {
    setTutorialProgress(prev => {
      const next = { ...prev };
      delete next[id];
      localStorage.setItem('ho_tutorialProgress', JSON.stringify(next));
      return next;
    });
  }, []);

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
