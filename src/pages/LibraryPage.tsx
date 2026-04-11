import { Link } from 'react-router-dom';
import { Heart, Users, Calendar, Play, Music, ChevronRight, ListMusic, Plus, X, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAppState } from '@context/AppStateContext';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import { usePlayer } from '@context/PlayerContext';
import { tracks, artists, events } from '@data/mockData';
import {
  getPlaylists, createPlaylist, addTrackToPlaylist,
} from '@services/playlistService';
import { formatPlays } from '@utils/format';
import { AddToPlaylistPopover } from '@components/AddToPlaylistPopover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { Button } from '@components/ui/button';

const tabList = [
  { key: 'nummers',        label: 'Gelikte nummers',  icon: Heart },
  { key: 'artiesten',      label: 'Gevolgd',           icon: Users },
  { key: 'events',         label: 'Aangemeld',         icon: Calendar },
  { key: 'afspeellijsten', label: 'Afspeellijsten',    icon: ListMusic },
];

function TrackRow({ track, index, toggleLike }) {
  const { user } = useAuth();
  const { playTrack, track: currentTrack, isPlaying } = usePlayer();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <div className="flex items-center gap-4 p-3 hover:bg-white/4 rounded-xl group transition-colors relative">
      <span className="w-5 text-center text-sm text-slate-600 shrink-0">{index + 1}</span>
      <div className="relative shrink-0">
        <img src={track.cover} alt={track.title} className="w-11 h-11 rounded-lg object-cover" />
        {isCurrentTrack && isPlaying ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
            <div className="flex items-end gap-[2px] h-4">
              {[0.6,1,0.4,0.8,0.5].map((b, i) => (
                <div key={i} className="w-[3px] rounded-full bg-violet-500"
                  style={{ height: `${b * 100}%`, animation: `eqBar${i} ${0.5 + i * 0.1}s ease-in-out infinite alternate` }} />
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => playTrack(track)}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play size={14} className="text-white ml-0.5" fill="white" />
          </button>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-violet-300' : 'text-white'}`}>{track.title}</p>
        <p className="text-xs text-slate-400 truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-slate-500 hidden sm:block">{formatPlays(track.plays)} streams</span>
      <span className="text-xs text-slate-500">{track.duration}</span>
      <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {user && (
          <AddToPlaylistPopover track={track} userId={user.id}>
            <button
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="Toevoegen aan afspeellijst"
            >
              <Plus size={14} />
            </button>
          </AddToPlaylistPopover>
        )}
        <button
          onClick={() => toggleLike(track.id)}
          className="p-1.5 text-violet-400 hover:text-red-400 transition-colors"
        >
          <Heart size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

function PlaylistCard({ playlist, tracks: allTracks }) {
  const coverTracks = (playlist.trackIds || [])
    .map(id => allTracks.find(t => t.id === id))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Link
      to={`/library/playlists/${playlist.id}`}
      className="bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl p-4 transition-all group"
    >
      {/* Cover mosaic */}
      <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 bg-white/5">
        {coverTracks.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={28} className="text-slate-700" />
          </div>
        ) : coverTracks.length === 1 ? (
          <img src={coverTracks[0].cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="grid grid-cols-2 w-full h-full">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden">
                {coverTracks[i]
                  ? <img src={coverTracks[i].cover} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-white/5" />
                }
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-white truncate group-hover:text-violet-300 transition-colors">{playlist.name}</p>
      <p className="text-xs text-slate-500 mt-0.5">{(playlist.trackIds || []).length} nummers</p>
    </Link>
  );
}

export default function LibraryPage() {
  const [activeTab, setActiveTab]   = useState('nummers');
  const [playlists, setPlaylists]   = useState([]);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const { likedTracks, followedArtists, rsvpEvents, toggleLike, toggleFollow, toggleRsvp } = useAppState();
  const { user } = useAuth();
  const addToast = useToast();

  const likedTrackList     = tracks.filter(t => likedTracks.includes(t.id));
  const followedArtistList = artists.filter(a => followedArtists.includes(a.id));
  const rsvpEventList      = events.filter(e => rsvpEvents.includes(e.id));

  useEffect(() => {
    if (!user) return;
    getPlaylists(user.id).then(setPlaylists).catch(() => {});
  }, [user]);

  async function handleCreatePlaylist(e) {
    e.preventDefault();
    if (!newPlaylistName.trim() || !user) return;
    try {
      const pl = await createPlaylist({ name: newPlaylistName.trim(), userId: user.id });
      setPlaylists(prev => [...prev, pl]);
      setNewPlaylistName('');
      setShowNewPlaylist(false);
      addToast(`Afspeellijst "${pl.name}" aangemaakt!`, 'success');
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10">
      <style>{`
        @keyframes eqBar0 { from { height: 20% } to { height: 90% } }
        @keyframes eqBar1 { from { height: 60% } to { height: 30% } }
        @keyframes eqBar2 { from { height: 40% } to { height: 85% } }
        @keyframes eqBar3 { from { height: 70% } to { height: 25% } }
        @keyframes eqBar4 { from { height: 30% } to { height: 75% } }
      `}</style>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Mijn bibliotheek</h1>
        <p className="text-slate-400 text-sm">Jouw gelikte nummers, gevolgde artiesten en aangemelde evenementen</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="bg-white/3 border border-white/8 w-full sm:w-fit">
          {tabList.map(({ key, label, icon: Icon }) => {
            const count = key === 'nummers' ? likedTrackList.length
              : key === 'artiesten' ? followedArtistList.length
              : key === 'events' ? rsvpEventList.length
              : playlists.length;
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2 text-xs sm:text-sm">
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/8 text-slate-500">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Liked tracks */}
        <TabsContent value="nummers">
          {likedTrackList.length === 0 ? (
          <Empty icon={Heart} title="Nog geen gelikte nummers" subtitle="Klik op het hartje bij een nummer om het toe te voegen." action={{ label: 'Ontdek nummers', to: '/' }} />
        ) : (
          <div className="space-y-1">
            {likedTrackList.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} toggleLike={toggleLike} />
            ))}
          </div>
        )}
        </TabsContent>

        {/* Followed artists */}
        <TabsContent value="artiesten">
          {followedArtistList.length === 0 ? (
            <Empty icon={Users} title="Je volgt nog geen artiesten" subtitle="Bezoek een artiestenpagina en klik op 'Volgen'." action={{ label: 'Artiesten ontdekken', to: '/artists' }} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {followedArtistList.map(artist => (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className="flex items-center gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-all group"
                >
                  <img src={artist.image} alt={artist.name} className="w-14 h-14 rounded-full object-cover shrink-0 ring-2 ring-violet-500/20" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{artist.name}</p>
                    <p className="text-xs text-violet-400 truncate">{artist.genre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{artist.location}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={e => { e.preventDefault(); toggleFollow(artist.id); }}
                      className="text-xs font-medium px-3 py-1 rounded-full border border-violet-500/50 text-violet-400 hover:bg-violet-600/10 transition-colors"
                    >
                      Volgend
                    </button>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* RSVP'd events */}
        <TabsContent value="events">
          {rsvpEventList.length === 0 ? (
            <Empty icon={Calendar} title="Nog geen aanmeldingen" subtitle="Meld je aan voor evenementen via de evenementenpagina." action={{ label: 'Evenementen bekijken', to: '/events' }} />
          ) : (
            <div className="space-y-3">
              {rsvpEventList.map(event => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-all group"
                >
                  <img src={event.poster} alt={event.title} className="w-14 h-20 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white mb-1 truncate">{event.title}</p>
                    <p className="text-xs text-violet-400">{event.date} · {event.time}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{event.venue}, {event.city}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">✓ Aangemeld</span>
                      <button
                        onClick={e => { e.preventDefault(); toggleRsvp(event.id); }}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Afmelden
                      </button>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0">{event.price}</span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Playlists */}
        <TabsContent value="afspeellijsten">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">{playlists.length} afspeellijst{playlists.length !== 1 ? 'en' : ''}</p>
            <button
              onClick={() => setShowNewPlaylist(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Plus size={15} /> Nieuwe afspeellijst
            </button>
          </div>

          {showNewPlaylist && (
            <form onSubmit={handleCreatePlaylist} className="flex gap-2 mb-4">
              <input
                autoFocus
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                placeholder="Naam van afspeellijst..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                Aanmaken
              </button>
              <button type="button" onClick={() => setShowNewPlaylist(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </form>
          )}

          {playlists.length === 0 ? (
            <Empty icon={ListMusic} title="Nog geen afspeellijsten" subtitle="Maak een afspeellijst aan om nummers te groeperen." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {playlists.map(pl => (
                <PlaylistCard key={pl.id} playlist={pl} tracks={tracks} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-600" />
      </div>
      <p className="text-white font-semibold mb-1">{title}</p>
      <p className="text-slate-500 text-sm max-w-xs mb-5">{subtitle}</p>
      {action && (
        <Link to={action.to} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <Music size={15} /> {action.label}
        </Link>
      )}
    </div>
  );
}
