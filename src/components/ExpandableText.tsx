import { useState, useRef, useEffect } from 'react';

// Clamps text to a fixed number of lines and only shows a "Lees meer/minder"
// toggle when it actually overflows — measured via scrollHeight rather than a
// character-count guess, so it works regardless of container width or font.
export default function ExpandableText({
  text, className = '', clampClassName = 'line-clamp-4',
}: { text: string; className?: string; clampClassName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  if (!text) return null;

  return (
    <div>
      <p ref={ref} className={`${className} ${!expanded ? clampClassName : ''}`}>{text}</p>
      {(overflows || expanded) && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-violet-400 hover:text-violet-300 font-medium mt-1.5 transition-colors"
        >
          {expanded ? 'Lees minder' : 'Lees meer'}
        </button>
      )}
    </div>
  );
}
