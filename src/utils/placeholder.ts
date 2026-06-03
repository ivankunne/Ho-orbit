// Local, deterministic placeholder images — no external random stock photos.
// Avatars render initials on a colored background; covers render a gradient.

const PALETTE = [
  '#7c3aed', '#9333ea', '#4f46e5', '#2563eb', '#0891b2',
  '#14b8a6', '#e11d48', '#f97316', '#059669', '#db2777',
];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return h;
}

function initials(name: string): string {
  const clean = (name ?? '').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

/** Inline SVG avatar with initials on a deterministic colored background. */
export function avatarPlaceholder(name = ''): string {
  const color = PALETTE[hash(name || '?') % PALETTE.length];
  const text = initials(name).replace(/[<>&]/g, '');
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
    `<rect width='160' height='160' rx='80' fill='${color}'/>` +
    `<text x='50%' y='50%' dy='.06em' font-family='system-ui,-apple-system,sans-serif' ` +
    `font-size='64' font-weight='600' fill='white' text-anchor='middle' dominant-baseline='central'>${text}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Inline SVG gradient cover, deterministic by seed. */
export function coverPlaceholder(seed = ''): string {
  const h = hash(seed || 'cover');
  const c1 = PALETTE[h % PALETTE.length];
  const c2 = PALETTE[(h >> 3) % PALETTE.length];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<rect width='400' height='300' fill='url(#g)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
