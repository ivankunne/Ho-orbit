// Minimal RFC 5545 ICS generation for a single event — used for the
// client-side "Download .ics" button. The full per-band feed is generated
// server-side by supabase/functions/ics-feed (Deno runtime, no shared module
// boundary with this file, hence the small duplication of escaping/folding).

export interface IcsEventInput {
  id: string;
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD
  event_time: string | null; // HH:MM[:SS]
  end_time: string | null;
  location: string | null;
  address: string | null;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// ICS lines must be folded at 75 octets, continuation lines start with a space.
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
  if (!time) return `${date.replace(/-/g, '')}`;
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  return `${date.replace(/-/g, '')}T${hhmmss.replace(/:/g, '')}`;
}

export function eventToICS(event: IcsEventInput): string {
  const isAllDay = !event.event_time;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//h-orbit//Band Calendar//NL',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@h-orbit.nl`,
    `DTSTAMP:${formatUtcStamp(new Date())}`,
    isAllDay ? `DTSTART;VALUE=DATE:${eventDateTime(event.event_date, null)}` : `DTSTART:${eventDateTime(event.event_date, event.event_time)}`,
    ...(event.end_time && !isAllDay ? [`DTEND:${eventDateTime(event.event_date, event.end_time)}`] : []),
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...(event.location || event.address ? [`LOCATION:${escapeIcsText([event.location, event.address].filter(Boolean).join(', '))}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n');
}

export function downloadIcsFile(event: IcsEventInput): void {
  const blob = new Blob([eventToICS(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'evenement'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
