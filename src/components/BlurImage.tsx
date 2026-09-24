import { useState } from 'react';
import { optimizedImage } from '@lib/image';

/**
 * Drop-in image replacement with blur-up loading effect.
 *
 * className   → applied to the outer wrapper div (size, rounding, etc.)
 * imgClassName → applied to the inner <img> (object-fit, hover transforms, etc.)
 *
 * Usage:
 *   <BlurImage src={url} alt="..." className="w-full h-48 rounded-xl" imgClassName="object-cover" />
 *
 * width        → weergavebreedte in CSS-px, voor de verkleinde versie (zie lib/image)
 */
export default function BlurImage({ src, alt, className = '', imgClassName = '', priority = false, width = 400 }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Shimmer shown until image loads */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{
          background:
            'linear-gradient(110deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.04) 100%)',
        }}
      />
      <img
        src={optimizedImage(src, width)}
        alt={alt}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full transition-[opacity,filter] duration-700 ${
          loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
        } ${imgClassName}`}
      />
    </div>
  );
}
