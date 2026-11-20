import { memo, useMemo } from 'react';
import type { Point } from './data';

/** The bar's string of lights uses the same four colors. */
const COLORS = [
  ['red', '#E5483B'],
  ['gold', '#F2C14E'],
  ['green', '#4CAF68'],
  ['blue', '#5B9BE6'],
] as const;
/** Map pixels between bulbs along the wire. */
const GAP = 15;
const PAD = 12;

/** A smooth path through the points: Catmull-Rom segments written as cubic Béziers. */
function smoothD(p: Point[]) {
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)];
    const b = p[i];
    const c = p[i + 1];
    const e = p[Math.min(p.length - 1, i + 2)];
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    const c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${c[0]} ${c[1]}`;
  }
  return d;
}

/** Points every `gap` map pixels along the line, each with the line's direction there. */
function along(p: Point[], gap: number) {
  const out: { x: number; y: number; dx: number; dy: number }[] = [];
  let carry = gap / 2;
  for (let i = 0; i < p.length - 1; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1e-6) continue;
    const dx = (x1 - x0) / len;
    const dy = (y1 - y0) / len;
    let s = carry;
    while (s <= len) {
      out.push({ x: x0 + dx * s, y: y0 + dy * s, dx, dy });
      s += gap;
    }
    carry = s - len;
  }
  return out;
}

/**
 * A string of lights hung along the Main Road on the holiday map: a dark wire with bulbs hanging
 * either side of it in the bar's four colors. Each color's glow is its own layer, so the bulbs
 * twinkle by fading whole layers, which the browser does without repainting the map.
 */
export const RoadLights = memo(function RoadLights({ points }: { points: Point[] }) {
  const { d, bulbs, box } = useMemo(() => {
    const xs = points.map((q) => q[0]);
    const ys = points.map((q) => q[1]);
    const box = {
      x: Math.min(...xs) - PAD,
      y: Math.min(...ys) - PAD,
      w: Math.max(...xs) - Math.min(...xs) + 2 * PAD,
      h: Math.max(...ys) - Math.min(...ys) + 2 * PAD,
    };
    const bulbs = along(points, GAP).map((b, i) => {
      // Bulbs hang to either side of the wire in turn, on a short socket.
      const side = i % 2 ? 1 : -1;
      const nx = -b.dy * side;
      const ny = b.dx * side;
      return {
        x: b.x + nx * 4.2,
        y: b.y + ny * 4.2,
        angle: (Math.atan2(ny, nx) * 180) / Math.PI - 90,
        color: i % COLORS.length,
      };
    });
    return { d: smoothD(points), bulbs, box };
  }, [points]);

  const view = `${box.x} ${box.y} ${box.w} ${box.h}`;
  const style = { left: box.x, top: box.y, width: box.w, height: box.h };
  return (
    <>
      <svg className="rl" viewBox={view} style={style} aria-hidden="true">
        <path className="rl-wire" d={d} />
        {bulbs.map((b, i) => (
          <g key={i} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.angle.toFixed(0)})`}>
            <rect className="rl-cap" x="-1.3" y="-3.9" width="2.6" height="2.2" rx="0.5" />
            <ellipse className={`rl-bulb rl-${COLORS[b.color][0]}`} cx="0" cy="0.9" rx="2.2" ry="3.1" />
          </g>
        ))}
      </svg>
      {COLORS.map(([name, color], k) => (
        <svg key={name} className={`rl-glow rl-glow-${name}`} viewBox={view} style={style} aria-hidden="true">
          <defs>
            <radialGradient id={`rl-g-${name}`}>
              <stop offset="0" stopColor={color} stopOpacity="0.75" />
              <stop offset="0.45" stopColor={color} stopOpacity="0.3" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>
          {bulbs
            .filter((b) => b.color === k)
            .map((b, i) => (
              <circle key={i} cx={b.x.toFixed(1)} cy={b.y.toFixed(1)} r="8" fill={`url(#rl-g-${name})`} />
            ))}
        </svg>
      ))}
    </>
  );
});
