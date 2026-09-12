import config from '../../seo.config.json';

export const SITE = config;

/** Alles wat de crawler te zien krijgt, hangt aan één absolute host. */
export function absoluteUrl(pathOrUrl = '/'): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  // Trailing slash alleen op de homepage — anders twee URL's voor één pagina.
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : '/';
  return `${SITE.siteUrl}${clean}`;
}

/** "Muziek uploaden" → "Muziek uploaden | H-orbit" (suffix nooit dubbel). */
export function pageTitle(title?: string): string {
  if (!title) return SITE.defaultTitle;
  if (title.toLowerCase().includes(SITE.siteName.toLowerCase())) return title;
  return `${title} | ${SITE.titleSuffix}`;
}

/** Google knipt beschrijvingen rond ~155 tekens af; knip op een woordgrens. */
export function clampDescription(text: string, max = 158): string {
  const flat = (text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-–]$/, '')}…`;
}

export type JsonLd = Record<string, unknown>;

/* ── JSON-LD bouwstenen ────────────────────────────────────────────────────
   Eén Organization + WebSite staan sitebreed in index.html; de builders
   hieronder zijn voor pagina-specifieke markup. */

export function breadcrumbLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function musicGroupLd(artist: {
  name: string;
  path: string;
  description?: string;
  image?: string;
  genres?: string[];
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist.name,
    url: absoluteUrl(artist.path),
    ...(artist.description ? { description: clampDescription(artist.description, 300) } : {}),
    ...(artist.image ? { image: absoluteUrl(artist.image) } : {}),
    ...(artist.genres?.length ? { genre: artist.genres } : {}),
    ...(artist.name ? { address: { '@type': 'PostalAddress', addressCountry: 'NL' } } : {}),
  };
}

export function articleLd(article: {
  title: string;
  path: string;
  description?: string;
  image?: string;
  published?: string;
  modified?: string;
  author?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: clampDescription(article.title, 110),
    url: absoluteUrl(article.path),
    mainEntityOfPage: absoluteUrl(article.path),
    inLanguage: 'nl-NL',
    ...(article.description ? { description: clampDescription(article.description, 300) } : {}),
    ...(article.image ? { image: absoluteUrl(article.image) } : {}),
    ...(article.published ? { datePublished: article.published } : {}),
    ...(article.modified ? { dateModified: article.modified } : {}),
    author: { '@type': article.author ? 'Person' : 'Organization', name: article.author || SITE.siteName },
    publisher: {
      '@type': 'Organization',
      name: SITE.siteName,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/icon-512.png') },
    },
  };
}

export function eventLd(event: {
  name: string;
  path: string;
  start?: string;
  end?: string;
  description?: string;
  image?: string;
  venue?: string;
  city?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: event.name,
    url: absoluteUrl(event.path),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    ...(event.start ? { startDate: event.start } : {}),
    ...(event.end ? { endDate: event.end } : {}),
    ...(event.description ? { description: clampDescription(event.description, 300) } : {}),
    ...(event.image ? { image: absoluteUrl(event.image) } : {}),
    ...(event.venue
      ? {
          location: {
            '@type': 'MusicVenue',
            name: event.venue,
            address: { '@type': 'PostalAddress', addressLocality: event.city, addressCountry: 'NL' },
          },
        }
      : {}),
  };
}

export function faqLd(items: { question: string; answer: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
