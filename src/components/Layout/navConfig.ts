import {
  Home, Users, BookOpen, Globe, MessageSquare, Calendar, Headphones, Radio,
  Music2, Handshake, GraduationCap, Flame,
} from 'lucide-react';

// Gedeeld door de desktopnavigatie en het mobiele menu, zodat een nieuw
// menu-item maar op één plek toegevoegd hoeft te worden.
export const navItems = [
  { label: 'Muziek', path: '/', icon: Home },
  { label: 'Artiesten', path: '/artists', icon: Users },
  { label: 'Evenementen', path: '/events', icon: Calendar },
  { label: 'Podcasts', path: '/podcasts', icon: Headphones },
  { label: 'Radio', path: '/radio', icon: Radio },
  { label: 'Drop Demo', path: '/drop-your-demo', icon: Flame },
  { label: 'Community', path: '/dutch-scene', icon: Globe },
  { label: 'Leren', path: '/tutorials', icon: BookOpen },
];

export const communityDropdown = [
  { label: 'Nederlandse Scene', sub: 'Venues & bewegingen', path: '/dutch-scene', icon: Globe },
  { label: 'Forums', sub: 'Discussie & community', path: '/forums', icon: MessageSquare },
  { label: 'Netwerken', sub: 'Samenwerken & uitwisselen', path: '/netwerken', icon: Handshake },
  { label: 'Band Space', sub: 'Werkruimte voor je band', path: '/bandspace', icon: Music2 },
];

export const lerenDropdown = [
  { label: 'Tutorials', sub: 'Groei als muzikant', path: '/tutorials', icon: BookOpen },
  { label: 'Masterclass', sub: 'Van de groten leren', path: '/masterclass', icon: GraduationCap },
];

export const communityPaths = ['/dutch-scene', '/forums', '/netwerken', '/bandspace'];
export const lerenPaths = ['/tutorials', '/masterclass'];
