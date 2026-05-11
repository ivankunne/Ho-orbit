import { useState } from 'react';

const PALETTE = [
  'bg-violet-600',
  'bg-purple-600',
  'bg-indigo-600',
  'bg-blue-600',
  'bg-cyan-600',
  'bg-teal-500',
  'bg-rose-600',
  'bg-orange-500',
  'bg-emerald-600',
  'bg-pink-600',
];

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return '??';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return PALETTE[hash % PALETTE.length];
}

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  alt?: string;
}

export default function UserAvatar({ src, name = '', size = 32, className = '', alt }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) };

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={alt ?? name}
        style={style}
        className={`rounded-full object-cover shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  const initials = getInitials(name);
  const color = getColor(name || '?');

  return (
    <div
      style={style}
      className={`${color} rounded-full flex items-center justify-center shrink-0 ${className}`}
    >
      <span className="font-semibold text-white leading-none select-none">{initials}</span>
    </div>
  );
}
