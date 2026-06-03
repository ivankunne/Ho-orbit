/**
 * Helpers for the artist donation / Tikkie (betaalverzoek) link.
 *
 * The link is stored as `social.donation` and can be any payment-request URL —
 * Tikkie, Bunq, PayPal, Ko-fi, Buy Me a Coffee, etc. We only normalise it to a
 * safe absolute https URL for use in an anchor href.
 */

/** Returns a clickable https URL, or null when the value isn't usable. */
export function normalizeDonationUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    // Only http(s) — never javascript:, mailto:, etc.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** True when the link points at Tikkie, so we can label the button accordingly. */
export function isTikkieUrl(url: string): boolean {
  return /tikkie/i.test(url);
}
