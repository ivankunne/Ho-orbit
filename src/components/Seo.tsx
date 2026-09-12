import { useEffect } from 'react';
import { SITE, absoluteUrl, clampDescription, pageTitle, type JsonLd } from '@lib/seo';

type SeoProps = {
  /** Zonder suffix — die plakt pageTitle() eraan. */
  title?: string;
  description?: string;
  /** Canonical pad, bv. "/podia/utrecht". Default: de huidige URL. */
  path?: string;
  image?: string;
  /** og:type — "website" (default), "article", "profile", "music.musician". */
  type?: string;
  /** Zet noindex,nofollow — voor alles achter een login of paywall. */
  noindex?: boolean;
  jsonLd?: JsonLd | JsonLd[] | null;
};

const MANAGED = 'data-seo';

function upsert<T extends HTMLElement>(selector: string, create: () => T): T {
  const existing = document.head.querySelector<T>(selector);
  if (existing) return existing;
  const el = create();
  el.setAttribute(MANAGED, '');
  document.head.appendChild(el);
  return el;
}

function setMeta(key: 'name' | 'property', value: string, content: string) {
  const el = upsert<HTMLMetaElement>(`meta[${key}="${value}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute(key, value);
    return m;
  });
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  const el = upsert<HTMLLinkElement>(selector, () => {
    const l = document.createElement('link');
    l.setAttribute('rel', rel);
    if (hreflang) l.setAttribute('hreflang', hreflang);
    return l;
  });
  el.setAttribute('href', href);
}

/**
 * Zet de <head> van de huidige route. Bewust imperatief: index.html levert al
 * een volledige set tags voor de crawler die geen JavaScript draait, en die
 * willen we bijwerken in plaats van verdubbelen — twee <title>'s of twee
 * canonicals is erger dan geen.
 */
export default function Seo({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
  jsonLd = null,
}: SeoProps) {
  const desc = clampDescription(description || SITE.defaultDescription);
  const fullTitle = pageTitle(title);
  const canonical = absoluteUrl(path ?? (typeof window !== 'undefined' ? window.location.pathname : '/'));
  const ogImage = absoluteUrl(image || SITE.defaultImage);
  const ld = jsonLd ? JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : null;

  useEffect(() => {
    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    setLink('canonical', canonical);
    setLink('alternate', canonical, 'nl-nl');
    setLink('alternate', canonical, 'x-default');

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:site_name', SITE.siteName);
    setMeta('property', 'og:locale', SITE.locale);

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', ogImage);
  }, [fullTitle, desc, canonical, ogImage, type, noindex]);

  useEffect(() => {
    const id = 'seo-jsonld-route';
    const existing = document.getElementById(id);
    if (!ld) {
      existing?.remove();
      return;
    }
    const script = (existing as HTMLScriptElement) ?? document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = ld;
    if (!existing) document.head.appendChild(script);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [ld]);

  return null;
}
