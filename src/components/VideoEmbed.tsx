/**
 * Speelt een video af vanaf een link die een admin invult: YouTube, Vimeo of
 * een direct videobestand. Een link die geen van drieën is, wordt een gewone
 * knop naar de bron — liever dat dan een zwart vlak dat niets doet.
 */

export function parseVideo(url: string | null | undefined):
  | { kind: 'embed'; embed: string }
  | { kind: 'file'; src: string }
  | { kind: 'link'; href: string }
  | null {
  if (!url?.trim()) return null;
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    if (id) return { kind: 'embed', embed: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const id = u.searchParams.get('v') || u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/)?.[1];
    if (id) return { kind: 'embed', embed: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d{6,})/)?.[1];
    if (id) return { kind: 'embed', embed: `https://player.vimeo.com/video/${id}` };
  }
  if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { kind: 'file', src: u.toString() };
  return { kind: 'link', href: u.toString() };
}

export default function VideoEmbed({ url, title, poster }: { url: string; title: string; poster?: string }) {
  const v = parseVideo(url);
  if (!v) return null;

  if (v.kind === 'file') {
    return <video src={v.src} poster={poster} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full bg-black" />;
  }
  if (v.kind === 'embed') {
    return (
      <iframe
        src={v.embed}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <a
        href={v.href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
      >
        Bekijk video ↗
      </a>
    </div>
  );
}
