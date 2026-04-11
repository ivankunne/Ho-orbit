// No backend needed — pure browser APIs

export async function shareContent({ title, text, url }) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return 'shared';
    } else {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
  } catch (err) {
    // User cancelled the share dialog — not an error
    if (err?.name === 'AbortError') return 'cancelled';
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'error';
    }
  }
}

export function buildShareUrl(path) {
  // TODO: replace window.location.origin with the real production domain
  return `${window.location.origin}${path}`;
}
