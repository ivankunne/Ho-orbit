// Edge Function: ics-feed
//
// Public, read-only ICS calendar feed for one band's calendar. Backs the
// "Agenda-abonnement (ICS)" section in BandSpaceDetailPage.tsx — subscribing
// this URL (webcal://) in Google/Outlook/Apple Calendar lets those apps poll
// it read-only. There is deliberately no corresponding write endpoint: this
// app remains the single source of truth for band events.
//
// GET /functions/v1/ics-feed?token=<bands.calendar_feed_token>
//
// Deploy:  supabase functions deploy ics-feed --no-verify-jwt
//   (--no-verify-jwt: calendar apps hit this with no Supabase auth header at
//   all — the feed token in the query string is the actual credential.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

interface FeedEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  address: string | null;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

function formatUtcStamp(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function eventDateTime(date: string, time: string | null): string {
  if (!time) return date.replace(/-/g, '');
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  return `${date.replace(/-/g, '')}T${hhmmss.replace(/:/g, '')}`;
}

function buildCalendar(bandName: string, events: FeedEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//h-orbit//Band Calendar//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(bandName)}`,
  ];

  for (const ev of events) {
    const isAllDay = !ev.event_time;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@h-orbit.nl`,
      `DTSTAMP:${formatUtcStamp(new Date())}`,
      isAllDay ? `DTSTART;VALUE=DATE:${eventDateTime(ev.event_date, null)}` : `DTSTART:${eventDateTime(ev.event_date, ev.event_time)}`,
      ...(ev.end_time && !isAllDay ? [`DTEND:${eventDateTime(ev.event_date, ev.end_time)}`] : []),
      `SUMMARY:${escapeIcsText(ev.title)}`,
      ...(ev.description ? [`DESCRIPTION:${escapeIcsText(ev.description)}`] : []),
      ...(ev.location || ev.address ? [`LOCATION:${escapeIcsText([ev.location, ev.address].filter(Boolean).join(', '))}`] : []),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!token) return new Response('Missing token', { status: 400, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response('Server not configured', { status: 500, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: band } = await admin.from('bands').select('id, name').eq('calendar_feed_token', token).single();
  if (!band) return new Response('Not found', { status: 404, headers: corsHeaders });

  const { data: events } = await admin
    .from('band_events')
    .select('id, title, description, event_date, event_time, end_time, location, address')
    .eq('band_id', band.id)
    .eq('is_cancelled', false)
    .order('event_date', { ascending: true });

  const ics = buildCalendar(band.name, events ?? []);

  return new Response(ics, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${band.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'band'}.ics"`,
      'Cache-Control': 'no-cache',
    },
  });
});
