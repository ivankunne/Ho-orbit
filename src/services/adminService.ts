import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManagedUser {
  id: string;
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

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<ManagedUser[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('joined_date', { ascending: false });
  return (data ?? []).map(mapProfile);
}

export async function suspendUser(userId: string, reason: string): Promise<void> {
  await supabase.from('profiles').update({
    suspended: true,
    suspended_at: new Date().toISOString(),
    suspended_reason: reason || null,
  }).eq('id', userId);
}

export async function unsuspendUser(userId: string): Promise<void> {
  await supabase.from('profiles').update({
    suspended: false,
    suspended_at: null,
    suspended_reason: null,
  }).eq('id', userId);
}

export async function setUserRole(userId: string, role: string): Promise<void> {
  await supabase.from('profiles').update({ role }).eq('id', userId);
}

function mapProfile(d: Record<string, unknown>): ManagedUser {
  const username = (d.username as string) ?? '';
  return {
    id: String(d.id),
    username,
    displayName: (d.display_name as string) ?? username,
    email: '',
    avatar: (d.avatar_url as string) || `https://picsum.photos/seed/${username}/80/80`,
    role: (d.role as string) ?? 'Luisteraar',
    verified: (d.verified as boolean) ?? false,
    joinedDate: d.joined_date
      ? new Date(d.joined_date as string).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
      : 'Onbekend',
    suspended: (d.suspended as boolean) ?? false,
    suspendedAt: (d.suspended_at as string) ?? null,
    suspendedReason: (d.suspended_reason as string) ?? null,
  };
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getPendingEvents(): Promise<PendingEvent[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapEvent);
}

export async function approveEvent(eventId: string): Promise<void> {
  await supabase.from('events').update({
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    rejection_reason: null,
  }).eq('id', eventId);
}

export async function rejectEvent(eventId: string, reason: string): Promise<void> {
  await supabase.from('events').update({
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    rejection_reason: reason || null,
  }).eq('id', eventId);
}

function mapEvent(d: Record<string, unknown>): PendingEvent {
  return {
    id: String(d.id),
    title: (d.name as string) ?? '',
    date: (d.date as string) ?? '',
    time: (d.time as string) ?? '',
    venue: (d.venue as string) ?? '',
    city: (d.city as string) ?? '',
    genre: (d.genre as string) ?? '',
    description: (d.description as string) ?? '',
    ticketLink: '',
    poster: (d.poster_url as string) || `https://picsum.photos/seed/${d.id}/400/300`,
    submittedBy: (d.submitted_by_username as string) ?? 'onbekend',
    submittedByAvatar: `https://picsum.photos/seed/${d.submitted_by ?? d.id}/80/80`,
    submittedAt: (d.submitted_at as string) ?? (d.created_at as string) ?? new Date().toISOString(),
    status: ((d.status as string) ?? 'approved') as EventStatus,
    rejectionReason: (d.rejection_reason as string) ?? null,
    reviewedAt: (d.reviewed_at as string) ?? null,
  };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(): Promise<ContentReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapReport);
}

export async function resolveReport(reportId: string, notes: string): Promise<void> {
  await supabase.from('reports').update({
    status: 'resolved',
    resolved_at: new Date().toISOString(),
    admin_notes: notes || null,
  }).eq('id', reportId);
}

export async function dismissReport(reportId: string): Promise<void> {
  await supabase.from('reports').update({
    status: 'dismissed',
    resolved_at: new Date().toISOString(),
  }).eq('id', reportId);
}

function mapReport(d: Record<string, unknown>): ContentReport {
  return {
    id: String(d.id),
    type: (d.type as ReportType) ?? 'track',
    targetId: (d.target_id as string) ?? '',
    targetTitle: (d.target_title as string) ?? '',
    reportedBy: (d.reported_by_username as string) ?? 'onbekend',
    reportedByAvatar: `https://picsum.photos/seed/${d.reported_by_username ?? d.id}/80/80`,
    reason: (d.reason as string) ?? '',
    details: (d.details as string) ?? '',
    createdAt: (d.created_at as string) ?? new Date().toISOString(),
    status: (d.status as ReportStatus) ?? 'open',
    resolvedAt: (d.resolved_at as string) ?? null,
    adminNotes: (d.admin_notes as string) ?? null,
  };
}

// ─── Forum hidden content (localStorage — no DB table needed) ─────────────────

const HIDDEN_KEY = 'ho_admin_hidden';

function loadHidden(): HiddenItem[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'); } catch { return []; }
}
function saveHidden(items: HiddenItem[]) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(items));
}

export function getHiddenItems(): HiddenItem[] {
  return loadHidden();
}

export function hideForumItem(type: 'thread' | 'reply', id: number, title: string, reason: string): void {
  const hidden = loadHidden();
  if (hidden.some(h => h.type === type && h.id === id)) return;
  saveHidden([...hidden, { type, id, title, hiddenAt: new Date().toISOString(), reason: reason || null }]);
}

export function unhideForumItem(type: 'thread' | 'reply', id: number): void {
  saveHidden(loadHidden().filter(h => !(h.type === type && h.id === id)));
}

export function isHidden(type: 'thread' | 'reply', id: number): boolean {
  return loadHidden().some(h => h.type === type && h.id === id);
}
