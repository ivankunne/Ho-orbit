/**
 * h-orbit Domain Types
 *
 * Central source of truth for all entity types in the application.
 * Resolves three key inconsistencies found in the codebase:
 *
 * 1. TrackId = number | string
 *    - mockData tracks use numeric IDs
 *    - uploadService creates string IDs ("upload-1234")
 *
 * 2. liked vs likedTracks
 *    - PlayerContext.liked: boolean (UI toggle for current track)
 *    - AppStateContext.likedTracks: TrackId[] (persisted user preference)
 *    - These are intentionally separate
 *
 * 3. Dual userId storage
 *    - PlayerContext.userId and AppStateContext.currentUserId
 *    - Both sync from AuthContext.user.id via bridge components
 *    - Both are number | null
 */

// ============================================================
// Core Types & Aliases
// ============================================================

/** Track IDs: mockData uses number, uploadService uses string */
export type TrackId = number | string;

// ============================================================
// Track & Music
// ============================================================

export interface Track {
  id: TrackId;
  title: string;
  artist: string;
  artistId: number | null;
  genre: string;
  plays: number;
  duration: string; // Format: "M:SS"
  cover: string; // URL
  trending: boolean;
  weeklyRank: number | null;
  // Upload-only fields (optional on base tracks)
  description?: string;
  tags?: string[];
  explicit?: boolean;
  isPrivate?: boolean;
  isUserUpload?: boolean;
  uploadedAt?: string;
  uploadedBy?: string | number;
  isrc?: string;
  upc?: string;
}

export interface Artist {
  id: number;
  name: string;
  genre: string;
  location: string;
  followers: number;
  image: string;
  cover: string;
  bio: string;
  tags: string[];
  monthlyListeners: number;
  verified: boolean;
  social?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    facebook?: string;
    spotify?: string;
    soundcloud?: string;
    youtube?: string;
    bandcamp?: string;
    beatport?: string;
    appleMusic?: string;
    shopify?: string;
    website?: string;
  };
  events: number[];
  tracks: ArtistTrack[];
  albums: Album[];
  featured: boolean;
}

export interface ArtistTrack {
  id: number;
  title: string;
  plays: number;
  duration: string;
  album: string;
}

export interface Album {
  id: number;
  title: string;
  year: number;
  tracks: number;
  cover: string;
}

// ============================================================
// User & Authentication
// ============================================================

export interface User {
  id: number;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  banner: string;
  bio: string;
  location: string;
  role: string;
  verified: boolean;
  followers: number;
  following: number;
  joinedDate: string;
  likedTracks: TrackId[]; // Profile-level liked tracks
  uploadedTracks: TrackId[];
  attendingEvents: number[];
  preferredGenres?: string[];
  notifications?: NotificationPreferences;
  needsOnboarding?: boolean;
  bookingInfo?: {
    email?: string;
    manager?: string;
    phone?: string;
  };
  social?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    facebook?: string;
    spotify?: string;
    soundcloud?: string;
    youtube?: string;
    bandcamp?: string;
    beatport?: string;
    appleMusic?: string;
    shopify?: string;
    website?: string;
  };
}

export interface NotificationPreferences {
  likes?: boolean;
  follows?: boolean;
  comments?: boolean;
  events?: boolean;
  newsletter?: boolean;
}

// ============================================================
// Playlists & Library
// ============================================================

export interface Playlist {
  id: number;
  name: string;
  userId: number | string;
  createdAt: string; // ISO string
  trackIds: TrackId[];
}

// ============================================================
// Comments & Interactions
// ============================================================

export interface Comment {
  id: number;
  body: string;
  authorId: number | string;
  authorName: string;
  authorAvatar: string;
  createdAt: string; // ISO string
  likes: (number | string)[];
}

export interface Notification {
  id: number;
  type: 'like' | 'follow' | 'rsvp' | 'comment' | 'forum_reply' | 'system' | 'article';
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string; // ISO string
}

// ============================================================
// Forums
// ============================================================

export interface ForumThread {
  id: number;
  categoryId: number;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  replies: number;
  views: number;
  createdAt: string; // ISO string
  author: {
    id: number | string;
    name: string;
    avatar: string;
  };
  lastPost: {
    user: string;
    time: string;
  };
}

export interface ForumReply {
  id: number;
  threadId: number | string;
  author: {
    id: number | string;
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: string; // ISO string
  likes: number;
  likedBy?: (number | string)[];
}

export interface ForumCategory {
  id: number;
  name: string;
  description?: string;
  threadCount?: number;
  postCount?: number;
  icon?: string;
  color?: string;
}

// ============================================================
// Events & Venues
// ============================================================

export interface Event {
  id: number;
  name?: string;
  title?: string;
  date?: string;
  time?: string;
  venue?: string;
  city?: string;
  country?: string;
  genre?: string;
  description?: string;
  ticketLink?: string;
  poster?: string;
  image?: string;
  attendees?: number;
  maxCapacity?: number;
  price?: number | string;
  artistId?: number | null;
  featured?: boolean;
}

export interface Venue {
  id: string; // slug
  name: string;
  city: string;
  type: string;
  capacity: number;
  since: number; // Year
  address?: string;
  website?: string;
  image?: string;
  thumbnail?: string;
  gallery?: string[];
  description?: string;
  longDescription?: string;
  rating?: number;
  ratingCount?: number;
  genres?: string[];
  upcomingEvents?: number[];
  testimonials?: unknown[];
  highlights?: string[];
  color?: string;
}

// ============================================================
// Content (Magazine, Tutorials)
// ============================================================

export interface Tutorial {
  id: number;
  title: string;
  instructor?: string;
  thumbnail?: string;
  duration?: string;
  difficulty?: string;
  views?: number;
  tags?: string[];
  description?: string;
  tools?: string[];
  chapters?: Array<{ time: string; title: string }>;
  steps?: Array<{ title: string; body: string }>;
}

export interface Article {
  id: number;
  title?: string;
  category?: string;
  cover?: string;
  author?: string;
  date?: string; // Format: "YYYY-MM-DD"
  publishedAt?: string; // ISO string
  readTime?: string;
  excerpt?: string;
  featured?: boolean;
}

export interface DutchCity {
  id: number;
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  image?: string;
  coverImage?: string;
  gallery?: string[];
  highlights?: string[];
  venues?: Array<{
    name: string;
    type: string;
    capacity: number;
    since: number;
    description?: string;
  }>;
  genres?: string[];
  genreStats?: Array<{ genre: string; pct: number }>;
  artists?: number[];
  rating?: number;
  ratingCount?: number;
  stats?: {
    venues: number;
    eventsPerYear: number;
    activeArtists: number;
    festivalMonths: string;
  };
  testimonials?: Array<{
    id: number;
    author: string;
    role: string;
    avatar: string;
    rating: number;
    text: string;
  }>;
}

// ============================================================
// API & Responses
// ============================================================

/**
 * Generic API response type.
 * Used by service functions that return success/failure without data.
 * Services that return arrays or entities directly do NOT wrap in this.
 */
export interface ApiResponse<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Search results aggregated across multiple content types.
 */
export interface SearchResults {
  artists: Artist[];
  tracks: Track[];
  events: Event[];
  tutorials: Tutorial[];
  articles: Article[];
}

// ============================================================
// UI & Input
// ============================================================

export interface KeyboardShortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export interface GenreColors {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

// ============================================================
// History & Progress
// ============================================================

export interface HistoryEntry {
  trackId: TrackId;
  playedAt: string; // ISO string
  track: Track;
}

export interface TutorialProgress {
  [tutorialId: number]: number; // Percentage (0-100)
}
