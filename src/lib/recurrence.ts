export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  interval: number;
  daysOfWeek?: number[] | null; // 0 = Sunday … 6 = Saturday (JS Date convention), weekly only
  until?: string | null; // ISO date, inclusive
  count?: number | null; // number of occurrences
}

// No cron/task-runner infra in this project, so recurrence is materialized
// once at creation time up to a generous fixed horizon rather than expanded
// lazily — capped at whichever of these is hit first.
const MAX_OCCURRENCES = 200;
const MAX_HORIZON_YEARS = 2;

const NL_DAYS_FULL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const NL_UNIT = { daily: 'dag', weekly: 'week', monthly: 'maand', yearly: 'jaar' } as const;
const NL_UNIT_PLURAL = { daily: 'dagen', weekly: 'weken', monthly: 'maanden', yearly: 'jaar' } as const;

function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d: Date, n: number): Date { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function addYears(d: Date, n: number): Date { const r = new Date(d); r.setFullYear(r.getFullYear() + n); return r; }
function toISODate(d: Date): string { return d.toISOString().slice(0, 10); }

/** Pure — generates the list of occurrence dates (ISO, ascending) for a rule. */
export function generateOccurrenceDates(startDate: string, rule: RecurrenceRule): string[] {
  if (rule.freq === 'none') return [startDate];

  const start = new Date(`${startDate}T00:00:00`);
  const horizon = addYears(start, MAX_HORIZON_YEARS);
  const until = rule.until ? new Date(`${rule.until}T00:00:00`) : null;
  const maxCount = rule.count && rule.count > 0 ? Math.min(rule.count, MAX_OCCURRENCES) : MAX_OCCURRENCES;
  const interval = Math.max(1, rule.interval || 1);
  const dates: string[] = [];

  if (rule.freq === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const days = [...rule.daysOfWeek].sort((a, b) => a - b);
    let weekStart = addDays(start, -start.getDay()); // back to that week's Sunday
    while (dates.length < maxCount && weekStart <= horizon) {
      for (const dow of days) {
        const d = addDays(weekStart, dow);
        if (d < start) continue;
        if (d > horizon || (until && d > until)) return dates;
        dates.push(toISODate(d));
        if (dates.length >= maxCount) return dates;
      }
      weekStart = addDays(weekStart, 7 * interval);
    }
    return dates;
  }

  let cursor = new Date(start);
  while (dates.length < maxCount && cursor <= horizon && !(until && cursor > until)) {
    dates.push(toISODate(cursor));
    if (rule.freq === 'daily') cursor = addDays(cursor, interval);
    else if (rule.freq === 'weekly') cursor = addDays(cursor, 7 * interval);
    else if (rule.freq === 'monthly') cursor = addMonths(cursor, interval);
    else cursor = addYears(cursor, interval);
  }
  return dates;
}

function joinNl(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

/** Pure — Dutch, human-readable summary of a recurrence rule. */
export function describeRecurrence(rule: RecurrenceRule): string {
  if (rule.freq === 'none') return 'Komt niet terug';

  let base: string;
  if (rule.freq === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const names = joinNl([...rule.daysOfWeek].sort((a, b) => a - b).map(d => NL_DAYS_FULL[d]));
    base = rule.interval > 1 ? `Elke ${rule.interval} weken op ${names}` : `Elke ${names}`;
  } else {
    base = rule.interval > 1 ? `Elke ${rule.interval} ${NL_UNIT_PLURAL[rule.freq]}` : `Elke ${NL_UNIT[rule.freq]}`;
  }

  if (rule.until) {
    return `${base}, tot ${new Date(`${rule.until}T00:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  if (rule.count) return `${base}, ${rule.count}x`;
  return base;
}
