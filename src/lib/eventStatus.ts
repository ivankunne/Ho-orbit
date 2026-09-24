/**
 * Wanneer is een evenement afgelopen?
 *
 * Een evenement heeft alleen een startdatum en -tijd, geen eindtijd. Daarom:
 * op de dag zelf is het "vandaag" (een avondshow is dan nog volop bezig), en
 * vanaf de dag erna "afgelopen". Er hoeft niets bijgehouden te worden — het
 * volgt vanzelf uit de datum die de organisator invult.
 *
 * "Vandaag" is de Nederlandse kalenderdag, niet die van het apparaat: anders
 * springt het label op een telefoon in een andere tijdzone te vroeg of te
 * laat om. We vergelijken datumstrings (JJJJ-MM-DD), niet Date-objecten, zodat
 * er geen tijdzone-omrekening tussen kan zitten.
 */

export type EventPhase = 'upcoming' | 'today' | 'ended';

const NL_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
});

/** De huidige datum in Nederland als JJJJ-MM-DD. */
export function todayNL(now: number | Date = Date.now()): string {
  return NL_DATE.format(now);
}

export function eventPhase(date: string | null | undefined, now: number | Date = Date.now()): EventPhase {
  const d = (date ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 'upcoming'; // onbekende datum: niet als afgelopen tonen
  const today = todayNL(now);
  if (d < today) return 'ended';
  if (d === today) return 'today';
  return 'upcoming';
}

export const isEnded = (date: string | null | undefined, now?: number | Date) => eventPhase(date, now) === 'ended';
