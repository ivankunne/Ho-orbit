// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManagedUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  role: string;
  verified: boolean;
  joinedDate: string;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

export type EventStatus = 'pending' | 'approved' | 'rejected';

export interface PendingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  genre: string;
  description: string;
  ticketLink: string;
  poster: string;
  submittedBy: string;
  submittedByAvatar: string;
  submittedAt: string;
  status: EventStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
}

export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type ReportType = 'track' | 'thread' | 'reply' | 'user' | 'event';

export interface ContentReport {
  id: string;
  type: ReportType;
  targetId: string | number;
  targetTitle: string;
  reportedBy: string;
  reportedByAvatar: string;
  reason: string;
  details: string;
  createdAt: string;
  status: ReportStatus;
  resolvedAt: string | null;
  adminNotes: string | null;
}

export interface HiddenItem {
  type: 'thread' | 'reply';
  id: number;
  title: string;
  hiddenAt: string;
  reason: string | null;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_USERS: ManagedUser[] = [
  { id: 1,  username: 'Test123',     displayName: 'Test Gebruiker',   email: 'test@ho-orbit.nl',    avatar: 'https://picsum.photos/seed/test123/80/80',     role: 'Luisteraar',       verified: false, joinedDate: 'Maart 2025',     suspended: false, suspendedAt: null, suspendedReason: null },
  { id: 2,  username: 'sander_h',    displayName: 'Sander Hoekstra',  email: 'sander@ho-orbit.nl',  avatar: 'https://picsum.photos/seed/currentuser/80/80', role: 'Producer & Blogger', verified: true,  joinedDate: 'Januari 2024',  suspended: false, suspendedAt: null, suspendedReason: null },
  { id: 3,  username: 'emma_beats',  displayName: 'Emma de Vries',    email: 'emma@ho-orbit.nl',    avatar: 'https://picsum.photos/seed/emma/80/80',        role: 'Artiest',          verified: true,  joinedDate: 'Juni 2024',      suspended: false, suspendedAt: null, suspendedReason: null },
  { id: 4,  username: 'dj_frank',    displayName: 'Frank Mulder',     email: 'frank@ho-orbit.nl',   avatar: 'https://picsum.photos/seed/frank/80/80',       role: 'DJ',               verified: false, joinedDate: 'September 2024', suspended: false, suspendedAt: null, suspendedReason: null },
  { id: 5,  username: 'lotte_m',     displayName: 'Lotte Smit',       email: 'lotte@ho-orbit.nl',   avatar: 'https://picsum.photos/seed/lotte/80/80',       role: 'Artiest',          verified: false, joinedDate: 'Oktober 2024',   suspended: false, suspendedAt: null, suspendedReason: null },
  { id: 6,  username: 'bas_prod',    displayName: 'Bas van der Berg', email: 'bas@ho-orbit.nl',     avatar: 'https://picsum.photos/seed/bas/80/80',         role: 'Producer',         verified: true,  joinedDate: 'Februari 2024',  suspended: false, suspendedAt: null, suspendedReason: null },
  { id: 7,  username: 'julia_rap',   displayName: 'Julia Okonkwo',    email: 'julia@ho-orbit.nl',   avatar: 'https://picsum.photos/seed/julia/80/80',       role: 'Rapper',           verified: false, joinedDate: 'November 2024',  suspended: false, suspendedAt: null, suspendedReason: null },
  { id: 8,  username: 'tim_singer',  displayName: 'Tim Bakker',       email: 'tim@ho-orbit.nl',     avatar: 'https://picsum.photos/seed/tim/80/80',         role: 'Singer-Songwriter', verified: false, joinedDate: 'December 2024',  suspended: false, suspendedAt: null, suspendedReason: null },
];

const SEED_EVENTS: PendingEvent[] = [
  {
    id: 'evt-seed-1',
    title: 'Amsterdam Electronic Night Vol. 4',
    date: '2026-06-14',
    time: '22:00',
    venue: 'Shelter Amsterdam',
    city: 'Amsterdam',
    genre: 'Electronic',
    description: 'Een nacht vol techno, house en ambient met lokale producers en internationale gasten.',
    ticketLink: 'https://tickets.example.nl/aen4',
    poster: 'https://picsum.photos/seed/evt1/400/300',
    submittedBy: 'dj_frank',
    submittedByAvatar: 'https://picsum.photos/seed/frank/80/80',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: 'pending',
    rejectionReason: null,
    reviewedAt: null,
  },
  {
    id: 'evt-seed-2',
    title: 'Rotterdam Hip-Hop Showcase',
    date: '2026-07-03',
    time: '20:00',
    venue: 'BIRD Rotterdam',
    city: 'Rotterdam',
    genre: 'Hip-hop',
    description: 'De beste opkomende rappers en producers uit Rotterdam op één podium.',
    ticketLink: 'https://tickets.example.nl/rhhS',
    poster: 'https://picsum.photos/seed/evt2/400/300',
    submittedBy: 'julia_rap',
    submittedByAvatar: 'https://picsum.photos/seed/julia/80/80',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    status: 'pending',
    rejectionReason: null,
    reviewedAt: null,
  },
  {
    id: 'evt-seed-3',
    title: 'Singer-Songwriter Avond — Utrecht',
    date: '2026-05-28',
    time: '19:30',
    venue: 'TivoliVredenburg',
    city: 'Utrecht',
    genre: 'Singer-Songwriter',
    description: 'Intieme avond met drie singer-songwriters die hun nieuwe materiaal presenteren.',
    ticketLink: '',
    poster: 'https://picsum.photos/seed/evt3/400/300',
    submittedBy: 'tim_singer',
    submittedByAvatar: 'https://picsum.photos/seed/tim/80/80',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: 'pending',
    rejectionReason: null,
    reviewedAt: null,
  },
];

const SEED_REPORTS: ContentReport[] = [
  {
    id: 'rep-seed-1',
    type: 'thread',
    targetId: 1,
    targetTitle: 'GRATIS BEATS DOWNLOAD - KLIK HIER!!!',
    reportedBy: 'emma_beats',
    reportedByAvatar: 'https://picsum.photos/seed/emma/80/80',
    reason: 'Spam',
    details: 'Deze gebruiker plaatst steeds dezelfde reclame voor externe sites.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'open',
    resolvedAt: null,
    adminNotes: null,
  },
  {
    id: 'rep-seed-2',
    type: 'user',
    targetId: 4,
    targetTitle: 'dj_frank',
    reportedBy: 'lotte_m',
    reportedByAvatar: 'https://picsum.photos/seed/lotte/80/80',
    reason: 'Ongepast gedrag',
    details: 'Stuurde meerdere ongewenste berichten via het forum.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: 'open',
    resolvedAt: null,
    adminNotes: null,
  },
  {
    id: 'rep-seed-3',
    type: 'track',
    targetId: 'upload-example',
    targetTitle: 'Naamloos nummer #88',
    reportedBy: 'sander_h',
    reportedByAvatar: 'https://picsum.photos/seed/currentuser/80/80',
    reason: 'Auteursrechtschending',
    details: 'Dit nummer gebruikt samples zonder toestemming van de originele artiest.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    status: 'open',
    resolvedAt: null,
    adminNotes: null,
  },
  {
    id: 'rep-seed-4',
    type: 'reply',
    targetId: 14,
    targetTitle: 'Reactie op "Beste oefenruimtes in Amsterdam?"',
    reportedBy: 'bas_prod',
    reportedByAvatar: 'https://picsum.photos/seed/bas/80/80',
    reason: 'Beledigend taalgebruik',
    details: 'Bevat persoonlijke aanvallen op andere gebruikers.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'open',
    resolvedAt: null,
    adminNotes: null,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  } catch { return seed; }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

const KEYS = {
  users:   'ho_admin_users',
  events:  'ho_admin_events',
  reports: 'ho_admin_reports',
  hidden:  'ho_admin_hidden',
};

// ─── Users ────────────────────────────────────────────────────────────────────

export function getUsers(): ManagedUser[] {
  return load(KEYS.users, SEED_USERS);
}

export function suspendUser(userId: number, reason: string): void {
  const users = getUsers();
  save(KEYS.users, users.map(u =>
    u.id === userId
      ? { ...u, suspended: true, suspendedAt: new Date().toISOString(), suspendedReason: reason || null }
      : u
  ));
}

export function unsuspendUser(userId: number): void {
  const users = getUsers();
  save(KEYS.users, users.map(u =>
    u.id === userId
      ? { ...u, suspended: false, suspendedAt: null, suspendedReason: null }
      : u
  ));
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function getPendingEvents(): PendingEvent[] {
  return load(KEYS.events, SEED_EVENTS);
}

export function approveEvent(eventId: string): void {
  const events = getPendingEvents();
  save(KEYS.events, events.map(e =>
    e.id === eventId
      ? { ...e, status: 'approved' as EventStatus, reviewedAt: new Date().toISOString(), rejectionReason: null }
      : e
  ));
}

export function rejectEvent(eventId: string, reason: string): void {
  const events = getPendingEvents();
  save(KEYS.events, events.map(e =>
    e.id === eventId
      ? { ...e, status: 'rejected' as EventStatus, reviewedAt: new Date().toISOString(), rejectionReason: reason || null }
      : e
  ));
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function getReports(): ContentReport[] {
  return load(KEYS.reports, SEED_REPORTS);
}

export function resolveReport(reportId: string, notes: string): void {
  const reports = getReports();
  save(KEYS.reports, reports.map(r =>
    r.id === reportId
      ? { ...r, status: 'resolved' as ReportStatus, resolvedAt: new Date().toISOString(), adminNotes: notes || null }
      : r
  ));
}

export function dismissReport(reportId: string): void {
  const reports = getReports();
  save(KEYS.reports, reports.map(r =>
    r.id === reportId
      ? { ...r, status: 'dismissed' as ReportStatus, resolvedAt: new Date().toISOString() }
      : r
  ));
}

// ─── Forum hidden content ─────────────────────────────────────────────────────

export function getHiddenItems(): HiddenItem[] {
  return load<HiddenItem>(KEYS.hidden, []);
}

export function hideForumItem(type: 'thread' | 'reply', id: number, title: string, reason: string): void {
  const hidden = getHiddenItems();
  if (hidden.some(h => h.type === type && h.id === id)) return;
  save(KEYS.hidden, [...hidden, { type, id, title, hiddenAt: new Date().toISOString(), reason: reason || null }]);
}

export function unhideForumItem(type: 'thread' | 'reply', id: number): void {
  save(KEYS.hidden, getHiddenItems().filter(h => !(h.type === type && h.id === id)));
}

export function isHidden(type: 'thread' | 'reply', id: number): boolean {
  return getHiddenItems().some(h => h.type === type && h.id === id);
}
