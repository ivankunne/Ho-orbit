import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Users, Music, Calendar, Heart, BadgeCheck, Settings, Share2, TrendingUp, Play, BarChart2 } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { useAppState } from '@context/AppStateContext';
import { tracks, events, artists } from '@data/mockData';

const FAKE_FOLLOWERS = [
  { id: 1, name: 'Sander V.', username: 'sanderv', avatar: 'https://picsum.photos/seed/fol1/40/40', role: 'Luisteraar' },
  { id: 2, name: 'Anouk de Wit', username: 'anoukdw', avatar: 'https://picsum.photos/seed/fol2/40/40', role: 'Artiest' },
  { id: 3, name: 'Joost B.', username: 'joostb', avatar: 'https://picsum.photos/seed/fol3/40/40', role: 'Luisteraar' },
  { id: 4, name: 'Emma Jansen', username: 'emmaj', avatar: 'https://picsum.photos/seed/fol4/40/40', role: 'Producent' },
  { id: 5, name: 'Lars K.', username: 'larsk', avatar: 'https://picsum.photos/seed/fol5/40/40', role: 'Luisteraar' },
  { id: 6, name: 'Lisa M.', username: 'lisam', avatar: 'https://picsum.photos/seed/fol6/40/40', role: 'Artiest' },
  { id: 7, name: 'Robin T.', username: 'robint', avatar: 'https://picsum.photos/seed/fol7/40/40', role: 'Luisteraar' },
  { id: 8, name: 'Anna S.', username: 'annas', avatar: 'https://picsum.photos/seed/fol8/40/40', role: 'Luisteraar' },
];

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n?.toString() ?? '0';
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const { followedArtists, toggleFollow } = useAppState();
  const [activeTab, setActiveTab] = useState('nummers');
  const [following, setFollowing] = useState(false);

  // TODO: Vervang met API-aanroep naar /api/gebruikers/:username
  // Voor nu: toon de ingelogde gebruiker als het profiel overeenkomt
  const isOwnProfile = !username || username === currentUser?.username;
  const profileUser = isOwnProfile ? currentUser : {
    id: 99,
    username: username || currentUser?.username,
    displayName: username || currentUser?.displayName,
    avatar: `https://picsum.photos/seed/${username}/200/200`,
    banner: `https://picsum.photos/seed/${username}-banner/1200/400`,
    bio: 'Muziekliefhebber en actief lid van de h-orbit gemeenschap.',
    location: 'Nederland',
    role: 'Luisteraar',
    verified: false,
    followers: 128,
    following: 64,
    joinedDate: 'Januari 2025',
    likedTracks: [1, 2],
    uploadedTracks: [],
    attendingEvents: [4],
  };

  if (!profileUser) return null;

  const likedTrackList = tracks.filter(t => profileUser.likedTracks?.includes(t.id));
  const attendingEventList = events.filter(e => profileUser.attendingEvents?.includes(e.id));
  const followedArtistList = isOwnProfile ? artists.filter(a => followedArtists.includes(a.id)) : [];

  const tabs = [
    { key: 'nummers', label: 'Nummers', count: profileUser.uploadedTracks?.length || 0 },
    { key: 'geliked', label: 'Geliked', count: profileUser.likedTracks?.length || 0 },
    { key: 'evenementen', label: 'Evenementen', count: attendingEventList.length },
    ...(isOwnProfile ? [{ key: 'volgend', label: 'Volgend', count: followedArtists.length }] : []),
    { key: 'volgers', label: 'Volgers', count: isOwnProfile ? FAKE_FOLLOWERS.length : profileUser.followers },
    ...(isOwnProfile && profileUser.role === 'Artiest' ? [{ key: 'dashboard', label: 'Dashboard' }] : []),
    { key: 'over', label: 'Over' },
  ];

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 lg:h-64 overflow-hidden">
        <img src={profileUser.banner} alt="Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-[#1a1528]/20 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6">
        {/* Profielkop */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 mb-6 relative z-10">
          <img
            src={profileUser.avatar}
            alt={profileUser.displayName}
            className="w-28 h-28 lg:w-32 lg:h-32 rounded-full object-cover ring-4 ring-[#1a1528] shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">{profileUser.displayName}</h1>
              {profileUser.verified && <BadgeCheck size={22} className="text-blue-400 shrink-0" />}
            </div>
            <p className="text-slate-400 text-sm">@{profileUser.username}</p>
            {profileUser.location && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin size={11} /> {profileUser.location}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:mb-1">
            {isOwnProfile ? (
              <Link
                to="/account"
                className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Settings size={15} /> Profiel bewerken
              </Link>
            ) : (
              <>
                <button
                  onClick={() => setFollowing(!following)}
                  className={`font-semibold px-4 py-2 rounded-xl transition-colors border text-sm ${
                    following
                      ? 'border-violet-500 text-violet-400'
                      : 'border-white/20 text-white bg-violet-600 border-violet-500 hover:bg-violet-500'
                  }`}
                >
                  {following ? 'Volgend' : 'Volgen'}
                </button>
                <button className="p-2 rounded-xl border border-white/20 text-slate-400 hover:text-white transition-colors">
                  <Share2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio & rol */}
        {profileUser.bio && (
          <p className="text-slate-300 text-sm leading-relaxed mb-4 max-w-xl">{profileUser.bio}</p>
        )}

        {/* Statistieken */}
        <div className="flex items-center gap-6 mb-6 flex-wrap">
          <div>
            <span className="text-white font-bold">{formatNum(profileUser.followers)}</span>
            <span className="text-slate-400 text-sm ml-1.5">volgers</span>
          </div>
          <div>
            <span className="text-white font-bold">{formatNum(profileUser.following)}</span>
            <span className="text-slate-400 text-sm ml-1.5">volgend</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-white/10">
            <Music size={11} className="text-violet-400" />
            {profileUser.role}
          </div>
          {profileUser.joinedDate && (
            <span className="text-xs text-slate-500">Lid sinds {profileUser.joinedDate}</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-violet-600/20 text-violet-400' : 'bg-white/6 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Nummers tab */}
        {activeTab === 'nummers' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music size={28} className="text-slate-500" />
            </div>
            <p className="text-slate-400 font-medium">Nog geen uploads</p>
            {isOwnProfile && (
              <Link to="/upload" className="inline-block mt-4 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                Eerste nummer uploaden
              </Link>
            )}
          </div>
        )}

        {/* Geliked tab */}
        {activeTab === 'geliked' && (
          <div>
            {likedTrackList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Heart size={32} className="mx-auto mb-3 opacity-30" />
                <p>Nog geen gelikte nummers</p>
              </div>
            ) : (
              <div className="space-y-1">
                {likedTrackList.map((track, i) => (
                  <div key={track.id} className="flex items-center gap-4 p-3 hover:bg-white/4 rounded-xl group cursor-pointer transition-colors">
                    <span className="w-5 text-center text-sm text-slate-600">{i + 1}</span>
                    <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{track.title}</p>
                      <p className="text-xs text-slate-400">{track.artist}</p>
                    </div>
                    <span className="text-xs text-slate-500">{track.duration}</span>
                    <Heart size={14} className="text-violet-400 shrink-0" fill="currentColor" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Evenementen tab */}
        {activeTab === 'evenementen' && (
          <div>
            {attendingEventList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                <p>Geen aankomende evenementen</p>
                <Link to="/events" className="inline-block mt-4 text-violet-400 hover:underline text-sm">Evenementen bekijken</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {attendingEventList.map(event => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-center gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-colors"
                  >
                    <img src={event.poster} alt={event.title} className="w-14 h-20 object-cover rounded-lg shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">{event.title}</p>
                      <p className="text-xs text-violet-400">{event.date} · {event.time}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{event.venue}, {event.city}</p>
                      <span className="inline-block mt-2 text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">✓ Aangemeld</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Volgend tab */}
        {activeTab === 'volgend' && (
          <div>
            {followedArtistList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p>Je volgt nog geen artiesten</p>
                <Link to="/artists" className="inline-block mt-4 text-violet-400 hover:underline text-sm">Artiesten ontdekken</Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {followedArtistList.map(artist => (
                  <Link
                    key={artist.id}
                    to={`/artists/${artist.id}`}
                    className="flex items-center gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-all group"
                  >
                    <img src={artist.image} alt={artist.name} className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-violet-500/20" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{artist.name}</p>
                      <p className="text-xs text-violet-400 truncate">{artist.genre}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{artist.location}</p>
                    </div>
                    <button
                      onClick={e => { e.preventDefault(); toggleFollow(artist.id); }}
                      className="text-xs font-medium px-3 py-1 rounded-full border border-violet-500/50 text-violet-400 hover:bg-violet-600/10 transition-colors shrink-0"
                    >
                      Volgend
                    </button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Volgers tab */}
        {activeTab === 'volgers' && (
          <div className="space-y-3">
            {FAKE_FOLLOWERS.map(follower => (
              <div key={follower.id} className="flex items-center gap-4 p-4 bg-white/3 border border-white/5 rounded-xl">
                <img src={follower.avatar} alt={follower.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link to={`/profiel/${follower.username}`} className="text-sm font-semibold text-white hover:text-violet-300 transition-colors">
                    {follower.name}
                  </Link>
                  <p className="text-xs text-slate-400">@{follower.username} · {follower.role}</p>
                </div>
                <Link
                  to={`/profiel/${follower.username}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/6 hover:bg-white/10 text-slate-300 transition-colors shrink-0"
                >
                  Bekijken
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard tab (Artiest only) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Totale streams', value: '24.8K', change: '+12%', icon: Play },
                { label: 'Nieuwe volgers', value: '148', change: '+8%', icon: TrendingUp },
                { label: 'Profielweergaven', value: '3.2K', change: '+21%', icon: BarChart2 },
              ].map(({ label, value, change, icon: Icon }) => (
                <div key={label} className="bg-white/3 border border-white/5 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <Icon size={15} className="text-violet-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-green-400 mt-1">{change} deze maand</p>
                </div>
              ))}
            </div>

            {/* Top tracks */}
            <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top nummers</h3>
              <div className="space-y-3">
                {[
                  { title: 'Nachtlicht', streams: '8.4K', pct: 85 },
                  { title: 'Amsterdam Rain', streams: '6.1K', pct: 62 },
                  { title: 'Zomernacht', streams: '4.9K', pct: 50 },
                  { title: 'Stadsgeluid', streams: '3.2K', pct: 33 },
                ].map((t, i) => (
                  <div key={t.title} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-white truncate">{t.title}</p>
                        <span className="text-xs text-slate-500 shrink-0 ml-2">{t.streams}</span>
                      </div>
                      <div className="w-full bg-white/8 rounded-full h-1">
                        <div className="h-1 bg-violet-500 rounded-full" style={{ width: `${t.pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Followers growth */}
            <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Volgers groei (afgelopen 6 maanden)</h3>
              <div className="flex items-end gap-2 h-24">
                {[40, 55, 48, 70, 85, 100].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-violet-500/20 rounded-t-sm hover:bg-violet-500/40 transition-colors" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {['Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mrt'].map(m => (
                  <span key={m} className="text-[10px] text-slate-500 flex-1 text-center">{m}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Over tab */}
        {activeTab === 'over' && (
          <div className="max-w-lg space-y-4">
            {profileUser.bio && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Biografie</p>
                <p className="text-slate-300 leading-relaxed">{profileUser.bio}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Details</p>
              <div className="space-y-2">
                {profileUser.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <MapPin size={14} className="text-slate-500" /> {profileUser.location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Calendar size={14} className="text-slate-500" /> Lid sinds {profileUser.joinedDate}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Music size={14} className="text-slate-500" /> {profileUser.role}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pb-16" />
      </div>
    </div>
  );
}
