import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addNotification } from '@services/notificationService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: string | null) => !!id && UUID_RE.test(id);

interface AppStateContextValue {
  likedTracks: (number | string)[];
  followedArtists: number[];
  rsvpEvents: number[];
  tutorialProgress: Record<number, number>;
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
  toggleLike: (trackId: number) => Promise<void>;
  toggleFollow: (artistId: number) => Promise<void>;
  toggleRsvp: (eventId: number) => Promise<void>;
  setTutorialWatched: (id: number) => Promise<void>;
  clearTutorialProgress: (id: number) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }) {
  const [likedTracks,      setLikedTracks]      = useState<(number | string)[]>([]);
  const [followedArtists,  setFollowedArtists]  = useState<number[]>([]);
  const [rsvpEvents,       setRsvpEvents]       = useState<number[]>([]);
  const [tutorialProgress, setTutorialProgress] = useState<Record<number, number>>({});
  const [currentUserId, setCurrentUserId]       = useState<string | null>(null);

  // Load user-specific state from Supabase when user logs in
  useEffect(() => {
    if (!currentUserId || !isUUID(currentUserId)) {
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
    try {
      if (isLiking) {
        const { error } = await supabase.from('user_liked_tracks').upsert({ user_id: currentUserId, track_id: trackId });
        if (error) throw error;
        const { data: track } = await supabase.from('tracks').select('title').eq('id', trackId).single();
        if (track) {
          addNotification(currentUserId, {
            type: 'like', title: 'Nummer geliked',
            body: `Je hebt "${track.title}" geliked`, link: '/library',
          });
        }
      } else {
        const { error } = await supabase.from('user_liked_tracks').delete().eq('user_id', currentUserId).eq('track_id', trackId);
        if (error) throw error;
      }
    } catch {
      setLikedTracks((prev) =>
        isLiking ? prev.filter((id) => id !== trackId) : [...prev, trackId]
      );
    }
  }, [currentUserId, likedTracks]);

  const toggleFollow = useCallback(async (artistId: number | string) => {
    if (!currentUserId) return;
    const isFollowing = !followedArtists.includes(artistId as number);
    const delta = isFollowing ? 1 : -1;

    // Optimistic UI update
    setFollowedArtists((prev) =>
      isFollowing ? [...prev, artistId as number] : prev.filter((id) => id !== artistId)
    );

    try {
      if (isFollowing) {
        const { error } = await supabase.from('user_following_artists').upsert({ user_id: currentUserId, artist_id: artistId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_following_artists').delete().eq('user_id', currentUserId).eq('artist_id', artistId);
        if (error) throw error;
      }

      // Update current user's following count
      await supabase.rpc('increment_profile_following', { profile_uuid: currentUserId, delta });

      // Update the followed entity's follower count
      if (isUUID(String(artistId))) {
        // Profile-based follow (UUID from ProfilePage)
        await supabase.rpc('increment_profile_followers', { profile_uuid: String(artistId), delta });

        if (isFollowing) {
          const { data: profile } = await supabase.from('profiles').select('display_name, username').eq('id', artistId).single();
          const artistName = profile?.display_name || profile?.username;
          if (artistName) {
            addNotification(currentUserId, {
              type: 'follow', title: 'Gevolgd',
              body: `Je volgt nu ${artistName}`, link: `/profiel/${profile?.username}`,
            });
          }
        }
      } else {
        // Artist table follow (numeric ID from ArtistDetailPage)
        const { data: artistRow } = await supabase
          .from('artists').select('followers_count, profile_id, name, slug').eq('id', artistId).single();

        if (artistRow) {
          await supabase
            .from('artists')
            .update({ followers_count: Math.max(0, (artistRow.followers_count || 0) + delta) })
            .eq('id', artistId);

          if (artistRow.profile_id) {
            await supabase.rpc('increment_profile_followers', { profile_uuid: artistRow.profile_id, delta });
          }

          if (isFollowing) {
            addNotification(currentUserId, {
              type: 'follow', title: 'Artiest gevolgd',
              body: `Je volgt nu ${artistRow.name}`,
              link: `/artists/${artistRow.slug || artistId}`,
            });
          }
        }
      }
    } catch {
      // Revert optimistic update on error
      setFollowedArtists((prev) =>
        isFollowing ? prev.filter((id) => id !== artistId) : [...prev, artistId as number]
      );
    }
  }, [currentUserId, followedArtists]);

  const toggleRsvp = useCallback(async (eventId: number) => {
    if (!currentUserId) return;
    const isRsvping = !rsvpEvents.includes(eventId);
    setRsvpEvents((prev) =>
      isRsvping ? [...prev, eventId] : prev.filter((id) => id !== eventId)
    );
    try {
      if (isRsvping) {
        const { error } = await supabase.from('user_attending_events').upsert({ user_id: currentUserId, event_id: eventId });
        if (error) throw error;
        const { data: event } = await supabase.from('events').select('name').eq('id', eventId).single();
        if (event) {
          addNotification(currentUserId, {
            type: 'rsvp', title: 'Aangemeld voor event',
            body: `Je staat op de lijst voor ${event.name}`,
            link: `/events/${eventId}`,
          });
        }
      } else {
        const { error } = await supabase.from('user_attending_events').delete().eq('user_id', currentUserId).eq('event_id', eventId);
        if (error) throw error;
      }
    } catch {
      setRsvpEvents((prev) =>
        isRsvping ? prev.filter((id) => id !== eventId) : [...prev, eventId]
      );
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

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
