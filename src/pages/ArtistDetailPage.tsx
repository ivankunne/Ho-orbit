import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play, Heart, Share2, MapPin, Users, Music, BadgeCheck,
  Calendar, ChevronLeft, ExternalLink, MessageSquare, Loader2, HandHeart, Settings
} from 'lucide-react';
import GenreBadge from '@components/GenreBadge';
import { useAppState } from '@context/AppStateContext';
import { usePlayer } from '@context/PlayerContext';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import { shareContent, buildShareUrl } from '@utils/share';
import { getWaveform } from '@components/Waveform';
import { formatPlays } from '@utils/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { mapProfileToArtist, countFollowers } from '@utils/artistHelpers';
import { avatarPlaceholder, coverPlaceholder } from '@utils/placeholder';
import { normalizeDonationUrl, isTikkieUrl } from '@utils/donation';
import { getOrCreateConversation } from '@services/chatService';

export default function ArtistDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('nummers');
  const [activeTrack, setActiveTrack] = useState(0);
  const [artist, setArtist] = useState<any>(null);
  const [artistEvents, setArtistEvents] = useState<any[]>([]);
  const [uploadedTracks, setUploadedTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const { followedArtists, toggleFollow, likedTracks, toggleLike } = useAppState();
  const { user } = useAuth();
  const addToast = useToast();
  const { playTrack, track: currentTrack } = usePlayer();

  useEffect(() => {
    let active = true;

    async function load() {
      let artistData: any = null;

      // Look up by slug first, fall back to numeric id for old links.
      // Use maybeSingle() so a miss returns null instead of a 406 (PostgREST
      // rejects .single() with zero rows as "Not Acceptable").
      const bySlug = await supabase.from('artists').select('*').eq('slug', slug).maybeSingle();
      if (bySlug.data) {
        artistData = bySlug.data;
      } else {
        // Try numeric id (backward compat)
        const byId = await supabase.from('artists').select('*').eq('id', slug).maybeSingle();
        if (byId.data) {
          artistData = byId.data;
        } else {
          // Fall back to profiles by username
          const { data: profileData } = await supabase.from('profiles').select('*').eq('username', slug).maybeSingle();
          if (profileData) artistData = mapProfileToArtist(profileData);
        }
      }

      // Apply deterministic placeholder fallbacks for missing artwork — the
      // list page does this via mapArtistRow, but the detail page reads raw
      // rows (to keep tracks/albums JSONB), so empty image_url/cover_url would
      // otherwise render as broken images.
      if (artistData) {
        artistData = {
          ...artistData,
          image_url: artistData.image_url || avatarPlaceholder(artistData.name || 'Artiest'),
          cover_url: artistData.cover_url || coverPlaceholder(String(artistData.id ?? artistData.name ?? 'cover')),
        };
      }

      // Artist rows aren't kept in sync with the owner's profile social links
      // (donation link, socials), so merge the linked profile's social on top.
      if (artistData?.profile_id) {
        const { data: linkedProfile } = await supabase
          .from('profiles')
          .select('social')
          .eq('id', artistData.profile_id)
          .maybeSingle();
        if (linkedProfile?.social) {
          artistData = { ...artistData, social: { ...(artistData.social || {}), ...linkedProfile.social } };
        }
      }

      if (!active) return;
      setArtist(artistData);
      setLoading(false);

      if (artistData) {
        supabase.from('events').select('*').eq('artist_id', artistData.id)
          .then(({ data: evts }) => { if (active) setArtistEvents(evts ?? []); });

        // Fetch approved tracks: prefer profile_id link, fall back to name match
        const tracksQuery = supabase.from('tracks').select('*').eq('upload_status', 'approved');
        (artistData.profile_id
          ? tracksQuery.eq('uploaded_by', artistData.profile_id)
          : tracksQuery.ilike('artist_name', artistData.name)
        ).order('created_at', { ascending: false })
          .then(({ data: uTracks }) => { if (active) setUploadedTracks(uTracks ?? []); });
      }
    }

    load();
    return () => { active = false; };
  }, [slug]);

  // Live follower count from the junction table — counts follows recorded under
  // either the numeric artist id or the linked profile UUID. The follow button
  // applies an optimistic delta on top of this for instant feedback.
  useEffect(() => {
    if (!artist?.id && !artist?.profile_id) return;
    let active = true;
    countFollowers([artist?.id, artist?.profile_id]).then((c) => { if (active) setFollowerCount(c); });
    return () => { active = false; };
  }, [artist?.id, artist?.profile_id]);

  if (loading) return null;

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-slate-400">
        <p className="text-xl font-semibold">Artiest niet gevonden</p>
        <Link to="/artists" className="text-violet-400 mt-2 hover:underline">← Terug naar artiesten</Link>
      </div>
    );
  }

  const following = followedArtists.includes(String(artist.id));
  const canMessage = !!user && !!artist.profile_id && artist.profile_id !== user.id;

  const totalPlays = [...(Array.isArray(artist.tracks) ? artist.tracks : []), ...uploadedTracks]
    .reduce((sum: number, t: any) => sum + (t.plays || 0), 0);

  async function handleMessage() {
    if (!user || !artist.profile_id) return;
    setStartingChat(true);
    const convId = await getOrCreateConversation(user.id, artist.profile_id);
    setStartingChat(false);
    if (convId) navigate(`/berichten/${convId}`);
  }

  // Build full track objects for the player from artist.tracks (JSONB array)
  const artistTracks: any[] = Array.isArray(artist.tracks) ? artist.tracks : [];
  const artistPlayerTracks = artistTracks.map(t => ({
    ...t,
    artist: artist.name,
    artistId: artist.id,
    cover_url: artist.cover_url || artist.image_url,
    genre: artist.genre,
  }));

  // Approved user-uploaded tracks for this artist
  const uploadedPlayerTracks = uploadedTracks.map(t => ({
    ...t,
    artist: t.artist_name,
    cover_url: t.cover_url || artist.image_url,
    isUploaded: true,
  }));

  const allTracks = [...artistPlayerTracks, ...uploadedPlayerTracks];

  const tabs = [
    { key: 'nummers', label: 'Nummers' },
    { key: 'albums', label: 'Albums' },
    { key: 'evenementen', label: 'Evenementen' },
    { key: 'over', label: 'Over' },
  ];

  const PLATFORM_CONFIG: Record<string, { label: string; badge: string; color: string; buildUrl: (v: string) => string }> = {
    spotify:    { label: 'Spotify',      badge: 'SP', color: 'text-green-400',   buildUrl: v => `https://open.spotify.com/artist/${v}` },
    soundcloud: { label: 'SoundCloud',   badge: 'SC', color: 'text-orange-400',  buildUrl: v => `https://soundcloud.com/${v}` },
    appleMusic: { label: 'Apple Music',  badge: 'AM', color: 'text-slate-300',   buildUrl: v => v.startsWith('http') ? v : `https://music.apple.com/nl/artist/${v}` },
    youtube:    { label: 'YouTube',      badge: 'YT', color: 'text-red-400',     buildUrl: v => `https://youtube.com/@${v.replace('@', '')}` },
    instagram:  { label: 'Instagram',    badge: 'IG', color: 'text-pink-400',    buildUrl: v => `https://instagram.com/${v.replace('@', '')}` },
    twitter:    { label: 'X',            badge: '𝕏',  color: 'text-slate-200',   buildUrl: v => `https://x.com/${v.replace('@', '')}` },
    tiktok:     { label: 'TikTok',       badge: 'TT', color: 'text-white',       buildUrl: v => `https://tiktok.com/@${v.replace('@', '')}` },
    facebook:   { label: 'Facebook',     badge: 'fb', color: 'text-blue-400',    buildUrl: v => `https://facebook.com/${v}` },
    bandcamp:   { label: 'Bandcamp',     badge: 'BC', color: 'text-teal-400',    buildUrl: v => `https://${v}.bandcamp.com` },
    beatport:   { label: 'Beatport',     badge: 'BP', color: 'text-yellow-400',  buildUrl: v => `https://www.beatport.com/artist/${v}` },
    shopify:    { label: 'Shop',         badge: 'SH', color: 'text-emerald-400', buildUrl: v => v.startsWith('http') ? v : `https://${v}` },
    website:    { label: 'Website',      badge: '🌐', color: 'text-violet-400',  buildUrl: v => v.startsWith('http') ? v : `https://${v}` },
  };

  const social = artist.social ?? {};
  const donationUrl = normalizeDonationUrl(social.donation);
  const isOwner = !!user && !!artist.profile_id && artist.profile_id === user.id;
  const tags: string[] = Array.isArray(artist.tags) ? artist.tags : [];
  const albums: any[] = Array.isArray(artist.albums) ? artist.albums : [];

  return (
    <div>
      {/* Header */}
      <div className="relative h-64 lg:h-80 overflow-hidden">
        <img
          src={artist.cover_url}
          alt={artist.name}
          fetchPriority="high"
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = coverPlaceholder(String(artist.id ?? artist.name)); }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-[#1a1528]/40 to-transparent" />
        <Link
          to="/artists"
          className="absolute top-4 left-4 lg:left-6 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg hover:bg-black/60 transition-colors"
        >
          <ChevronLeft size={16} /> Artiesten
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Artiest info */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-6 relative z-10">
          <img
            src={artist.image_url}
            alt={artist.name}
            className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover ring-4 ring-[#1a1528] shrink-0"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarPlaceholder(artist.name || 'Artiest'); }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-white">{artist.name}</h1>
              {artist.verified && <BadgeCheck size={24} className="text-blue-400" />}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
              <GenreBadge genre={artist.genre} size="md" />
              <span className="flex items-center gap-1"><MapPin size={12} />{artist.location}</span>
              <span className="flex items-center gap-1"><Users size={12} />{formatPlays(followerCount)} volgers</span>
              <span className="flex items-center gap-1"><Music size={12} />{formatPlays(totalPlays)} maandelijkse luisteraars</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:mb-1">
            <button
              onClick={() => allTracks[0] && playTrack(allTracks[0], allTracks)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Play size={16} fill="white" /> Afspelen
            </button>
            {!isOwner && (
              <button
                onClick={() => {
                  const willFollow = !following;
                  toggleFollow(artist.id);
                  // Optimistic bump; the junction-table effect reconciles to the real count.
                  setFollowerCount((c) => Math.max(0, c + (willFollow ? 1 : -1)));
                  addToast(following ? `Je volgt ${artist.name} niet meer` : `Je volgt nu ${artist.name}`, following ? 'info' : 'success');
                }}
                className={`font-semibold px-4 py-2 rounded-xl transition-colors border ${
                  following
                    ? 'border-violet-500 text-violet-400 hover:border-violet-400'
                    : 'border-white/20 text-slate-300 hover:border-white/40 hover:text-white'
                }`}
              >
                {following ? 'Volgend' : 'Volgen'}
              </button>
            )}
            {canMessage && (
              <button
                onClick={handleMessage}
                disabled={startingChat}
                className="flex items-center gap-2 bg-white/8 hover:bg-violet-600/20 border border-white/20 hover:border-violet-500/50 text-slate-300 hover:text-white font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                {startingChat
                  ? <Loader2 size={16} className="animate-spin" />
                  : <MessageSquare size={16} />
                }
                <span className="hidden sm:inline">Stuur bericht</span>
              </button>
            )}
            <button
              onClick={async () => {
                const result = await shareContent({
                  title: artist.name,
                  text: `Ontdek ${artist.name} op h-orbit`,
                  url: buildShareUrl(`/artists/${artist.slug || artist.id}`),
                });
                if (result === 'copied') addToast('Link gekopieerd naar klembord!', 'success');
                else if (result === 'shared') addToast('Gedeeld!', 'success');
              }}
              className="p-2 rounded-xl border border-white/20 text-slate-400 hover:text-white hover:border-white/40 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Sociale links */}
        {Object.entries(social).some(([k, v]) => k !== 'donation' && Boolean(v)) && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {Object.entries(social).map(([key, value]) => {
              if (!value) return null;
              const cfg = PLATFORM_CONFIG[key];
              if (!cfg) return null;
              return (
                <a
                  key={key}
                  href={cfg.buildUrl(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span className={`font-bold text-[11px] ${cfg.color}`}>{cfg.badge}</span>
                  {cfg.label}
                  <ExternalLink size={10} className="text-slate-600" />
                </a>
              );
            })}
          </div>
        )}

        {/* Donatie / Tikkie — "Steun mij" */}
        {donationUrl && (
          <a
            href={donationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-600/20"
          >
            <HandHeart size={16} />
            {isTikkieUrl(donationUrl) ? `Steun ${artist.name} via Tikkie` : `Steun ${artist.name}`}
            <ExternalLink size={12} className="text-white/70" />
          </a>
        )}

        {/* Owner reminder — only the artist sees this, only when no link is set */}
        {isOwner && !donationUrl && (
          <Link
            to="/account"
            className="flex items-start gap-3 mb-6 p-3.5 rounded-xl border border-violet-500/30 bg-violet-600/10 hover:bg-violet-600/15 transition-colors"
          >
            <HandHeart size={18} className="text-violet-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-violet-100">Voeg een donatielink toe</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Heb je een Tikkie of betaalverzoek? Voeg het toe in je account, dan kunnen fans je hier direct steunen.
              </p>
            </div>
            <Settings size={15} className="text-slate-500 shrink-0 mt-0.5 ml-auto" />
          </Link>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-2 mb-8 flex-wrap">
            {tags.map(tag => (
              <span key={tag} className="text-xs bg-white/8 text-slate-300 px-3 py-1 rounded-full border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="border-b border-white/10 gap-0 rounded-none bg-transparent p-0 w-full h-auto">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium transition-colors data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 hover:text-white"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab: Nummers */}
          <TabsContent value="nummers">
            <div className="space-y-1 mb-6">
              {allTracks.length === 0 && (
                <p className="text-slate-500 text-sm py-8 text-center">Geen nummers gevonden.</p>
              )}
              {allTracks.map((track, i) => {
                const isActive = currentTrack?.id === track.id;
                const liked = likedTracks.includes(track.id);
                return (
                  <div
                    key={track.id}
                    onClick={() => { setActiveTrack(i); playTrack(track, allTracks); }}
                    className={`flex items-center gap-4 p-3 rounded-xl group cursor-pointer transition-colors ${
                      isActive ? 'bg-violet-600/10 border border-violet-500/20' : 'hover:bg-white/4'
                    }`}
                  >
                    {isActive
                      ? <Play size={14} className="text-violet-400 w-5 shrink-0" fill="currentColor" />
                      : <span className="w-5 text-center text-sm text-slate-500 group-hover:hidden">{i + 1}</span>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${isActive ? 'text-violet-400' : 'text-white'}`}>{track.title}</p>
                        {track.isUploaded && (
                          <span className="text-[10px] bg-violet-500/20 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded">Upload</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{track.album ?? track.genre}</p>
                    </div>
                    <span className="text-xs text-slate-500 hidden sm:block">{formatPlays(track.plays ?? 0)} streams</span>
                    <span className="text-xs text-slate-500">{track.duration}</span>
                    <button
                      onClick={e => { e.stopPropagation(); toggleLike(track.id); }}
                      className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all ${liked ? 'text-violet-400 !opacity-100' : 'text-slate-600 hover:text-slate-300'}`}
                    >
                      <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Waveform visualizer */}
            {artistTracks.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{artistTracks[activeTrack]?.title}</p>
                    <p className="text-xs text-slate-500">{artistTracks[activeTrack]?.album} · {artistTracks[activeTrack]?.duration}</p>
                  </div>
                  <button
                    onClick={() => allTracks[activeTrack] && playTrack(allTracks[activeTrack], allTracks)}
                    className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center hover:bg-violet-500 transition-colors"
                  >
                    <Play size={14} className="text-white ml-0.5" fill="white" />
                  </button>
                </div>

                {/* Waveform bars */}
                <div className="flex items-end gap-[2px] h-16 cursor-pointer">
                  {getWaveform(activeTrack + 1).map((h, i) => {
                    const played = i < 30;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all hover:opacity-80 ${
                          played ? 'bg-violet-500' : 'bg-white/15'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1.5">
                  <span>1:45</span>
                  <span>{artistTracks[activeTrack]?.duration}</span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Albums */}
          <TabsContent value="albums" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {albums.map(album => (
              <div
                key={album.id}
                className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img src={album.cover} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center">
                      <Play size={20} className="text-white ml-0.5" fill="white" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-white">{album.title}</p>
                  <p className="text-xs text-slate-400">{album.year} · {album.tracks} nummers</p>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Tab: Evenementen */}
          <TabsContent value="evenementen" className="space-y-4">
            {artistEvents.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Geen aankomende evenementen</p>
            ) : (
              artistEvents.map(event => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex flex-col sm:flex-row gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl transition-colors"
                >
                  <img src={event.poster_url} alt={event.name} className="w-full sm:w-20 sm:h-28 object-cover rounded-lg" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-violet-400" />
                      <span className="text-sm text-violet-400 font-medium">{event.date} · {event.time}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-1">{event.name}</h3>
                    <p className="text-sm text-slate-400">{event.venue}, {event.city}</p>
                    <p className="text-sm text-slate-500 mt-1">{event.price}</p>
                  </div>
                  <div className="sm:self-center">
                    <span className="bg-violet-600/20 text-violet-400 text-xs font-medium px-3 py-1.5 rounded-lg">
                      Tickets
                    </span>
                  </div>
                </Link>
              ))
            )}
          </TabsContent>

          {/* Tab: Over */}
          <TabsContent value="over" className="max-w-2xl">
            <p className="text-slate-300 leading-relaxed">{artist.bio}</p>
          </TabsContent>
        </Tabs>

        <div className="pb-16" />
      </div>
    </div>
  );
}
