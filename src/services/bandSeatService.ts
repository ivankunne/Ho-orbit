import { supabase } from '@/lib/supabase';

export interface BandSeats {
  /** Altijd 5 — wat er in Pro zit. */
  included: number;
  /** Bijgekocht, à € 2,50 per maand. */
  extra: number;
  /** included + extra, of 0 zonder Pro-abonnement. */
  allowance: number;
  /** Actieve bandleden (de eigenaar niet meegeteld) over al zijn bands. */
  used: number;
  /** Leden die geschorst zijn omdat het abonnement kromp. */
  suspended: number;
  /** Wanneer er wordt afgeschaald; null zolang alles past. */
  downgrade_at: string | null;
}

const EMPTY: BandSeats = {
  included: 5, extra: 0, allowance: 0, used: 0, suspended: 0, downgrade_at: null,
};

/**
 * Stoelenstand van de ingelogde gebruiker. Deze aanroep is niet alleen lezen:
 * een verstreken afschaaldatum wordt hier uitgevoerd en geschorste leden
 * komen terug zodra er weer ruimte is. Daarom bij het openen van BandSpace
 * aanroepen, niet alleen in het scherm waar de cijfers staan.
 */
export async function fetchMyBandSeats(): Promise<BandSeats> {
  const { data, error } = await supabase.rpc('my_band_seats');
  if (error || !data) return EMPTY;
  return { ...EMPTY, ...(data as Partial<BandSeats>) };
}

/** Stoelenstand van één band — ook voor beheerders die niet de eigenaar zijn. */
export async function fetchBandSeatState(
  bandId: string,
): Promise<{ included: number; allowance: number; used: number; is_owner: boolean } | null> {
  const { data, error } = await supabase.rpc('band_seat_state', { p_band_id: bandId });
  if (error || !data) return null;
  return data as { included: number; allowance: number; used: number; is_owner: boolean };
}

/** Zet het totaal aantal bijgekochte stoelen (0 = geen extra's). */
export async function setExtraSeats(seats: number): Promise<BandSeats> {
  const { data, error } = await supabase.functions.invoke<BandSeats & { error?: string }>(
    'stripe-seats',
    { body: { seats } },
  );
  if (error || !data || data.error) {
    throw new Error(data?.error || error?.message || 'Er ging iets mis. Probeer het later opnieuw.');
  }
  return { ...EMPTY, ...data };
}

/** Mag deze gebruiker in BandSpace — zelf Pro, of gedekt door een bandeigenaar? */
export async function fetchBandSpaceAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_bandspace_access');
  if (error) return false;
  return data === true;
}

/**
 * De trigger en create_band_invite melden een volle band als
 * 'band_seat_limit_reached'. Eén plek om dat in gewone taal om te zetten.
 */
export function isSeatLimitError(error: { message?: string } | null | undefined): boolean {
  return !!error?.message?.includes('band_seat_limit_reached');
}
