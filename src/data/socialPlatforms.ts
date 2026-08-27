import type { IconType } from 'react-icons';
import {
  SiSpotify, SiSoundcloud, SiApplemusic, SiYoutube, SiInstagram, SiX,
  SiTiktok, SiFacebook, SiBandcamp, SiBeatport, SiShopify,
} from 'react-icons/si';
import { Globe } from 'lucide-react';

export interface SocialPlatform {
  key: string;
  label: string;
  icon: IconType;
  color: string;
  buildUrl: (value: string) => string;
  placeholder: string;
  hint: string;
}

// Single source of truth for every platform's icon/color/URL-building —
// previously duplicated near-verbatim across ArtistDetailPage.tsx,
// ProfilePage.tsx and AccountPage.tsx.
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: 'spotify', label: 'Spotify', icon: SiSpotify, color: 'text-green-400', buildUrl: v => `https://open.spotify.com/artist/${v}`, placeholder: 'Artiest-ID', hint: 'open.spotify.com/artist/…' },
  { key: 'soundcloud', label: 'SoundCloud', icon: SiSoundcloud, color: 'text-orange-400', buildUrl: v => `https://soundcloud.com/${v}`, placeholder: 'gebruikersnaam', hint: 'soundcloud.com/{handle}' },
  { key: 'appleMusic', label: 'Apple Music', icon: SiApplemusic, color: 'text-slate-300', buildUrl: v => v.startsWith('http') ? v : `https://music.apple.com/nl/artist/${v}`, placeholder: 'Volledige URL', hint: 'music.apple.com/…' },
  { key: 'youtube', label: 'YouTube', icon: SiYoutube, color: 'text-red-400', buildUrl: v => `https://youtube.com/@${v.replace('@', '')}`, placeholder: '@kanaalhandle', hint: 'youtube.com/@{handle}' },
  { key: 'instagram', label: 'Instagram', icon: SiInstagram, color: 'text-pink-400', buildUrl: v => `https://instagram.com/${v.replace('@', '')}`, placeholder: '@gebruikersnaam', hint: 'instagram.com/{handle}' },
  { key: 'twitter', label: 'X / Twitter', icon: SiX, color: 'text-slate-200', buildUrl: v => `https://x.com/${v.replace('@', '')}`, placeholder: '@gebruikersnaam', hint: 'x.com/{handle}' },
  { key: 'tiktok', label: 'TikTok', icon: SiTiktok, color: 'text-white', buildUrl: v => `https://tiktok.com/@${v.replace('@', '')}`, placeholder: '@gebruikersnaam', hint: 'tiktok.com/@{handle}' },
  { key: 'facebook', label: 'Facebook', icon: SiFacebook, color: 'text-blue-400', buildUrl: v => `https://facebook.com/${v}`, placeholder: 'paginanaam', hint: 'facebook.com/{handle}' },
  { key: 'bandcamp', label: 'Bandcamp', icon: SiBandcamp, color: 'text-teal-400', buildUrl: v => `https://${v}.bandcamp.com`, placeholder: 'artiesthandle', hint: '{handle}.bandcamp.com' },
  { key: 'beatport', label: 'Beatport', icon: SiBeatport, color: 'text-yellow-400', buildUrl: v => `https://www.beatport.com/artist/${v}`, placeholder: 'artiestslug', hint: 'beatport.com/artist/{slug}' },
  { key: 'shopify', label: 'Shop', icon: SiShopify, color: 'text-emerald-400', buildUrl: v => v.startsWith('http') ? v : `https://${v}`, placeholder: 'Volledige winkel-URL', hint: 'jouwwinkel.myshopify.com' },
  // Not a single brand — kept as a generic globe icon rather than forcing a platform mark.
  { key: 'website', label: 'Website', icon: Globe as unknown as IconType, color: 'text-violet-400', buildUrl: v => v.startsWith('http') ? v : `https://${v}`, placeholder: 'https://jouwsite.nl', hint: 'Eigen website' },
];

export const SOCIAL_PLATFORM_MAP: Record<string, SocialPlatform> =
  Object.fromEntries(SOCIAL_PLATFORMS.map(p => [p.key, p]));
