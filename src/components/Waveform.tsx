export function getWaveform(
  seed: number,
  count: number = 80,
  style: 'player' | 'artist' = 'artist'
): number[] {
  const bars: number[] = [];
  if (style === 'player') {
    // Player style: denser, tighter
    for (let i = 0; i < count; i++) {
      const h = 15 + Math.abs(Math.sin(i * 0.37 + seed) * 0.6 + Math.sin(i * 0.71 + seed * 1.3) * 0.4) * 85;
      bars.push(Math.round(Math.min(100, Math.max(8, h))));
    }
  } else {
    // Artist style: wider, taller
    for (let i = 0; i < count; i++) {
      const h = 8 + Math.abs(Math.sin(i * 0.41 + seed) * 0.55 + Math.sin(i * 0.73 + seed * 1.7) * 0.45) * 92;
      bars.push(Math.round(Math.min(100, Math.max(6, h))));
    }
  }
  return bars;
}

export function EqBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[0.6, 1, 0.4, 0.8, 0.5].map((base, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-violet-500"
          style={{
            height: playing ? `${base * 100}%` : '30%',
            animation: playing ? `eqBar${i} ${0.5 + i * 0.1}s ease-in-out infinite alternate` : 'none',
            transition: 'height 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}
