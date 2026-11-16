import type { CSSProperties } from 'react';

/**
 * The animals of the holiday card, cut from its painting. Each piece lies over a copy of the
 * painting with the gap behind it painted in, so a piece can move without showing a hole: the
 * whales bob and blow, the turtle paddles, the donkeys nod, the hogs root and the egrets sway.
 * Boxes and pivots are pixels of the 3500 by 2500 painting; the layer places them in percent, so
 * the same pieces fit the card front and the tour map at any size.
 */

type Box = [number, number, number, number];
type Motion = 'still' | 'spout' | 'paddle' | 'wake' | 'nod' | 'root' | 'sway';
type Part = {
  file: string;
  box: Box;
  /** The point the piece turns or grows around: a neck, a blowhole, a shell's middle. */
  origin?: [number, number];
  motion: Motion;
  /** Largest turn, in degrees; the sign sets the direction a head dips. */
  a?: number;
  /** Seconds per cycle, and the start offset that keeps the animals out of step. */
  dur?: number;
  delay?: number;
};
type Group = { id: string; motion?: 'swim'; dur?: number; delay?: number; parts: Part[] };

const ART_W = 3500;
const ART_H = 2500;

const GROUPS: Group[] = [
  {
    id: 'whale-top',
    motion: 'swim',
    dur: 7,
    delay: -1,
    parts: [
      { file: 'whale-top-spout', box: [3133, 226, 78, 69], origin: [3172, 292], motion: 'spout', dur: 6.5, delay: -2.5 },
      { file: 'whale-top', box: [2956, 234, 310, 135], motion: 'still' },
    ],
  },
  {
    id: 'whale-mother',
    motion: 'swim',
    dur: 8,
    delay: -3,
    parts: [
      { file: 'whale-mother-spout', box: [2358, 1801, 109, 82], origin: [2405, 1872], motion: 'spout', dur: 7.5, delay: -5.5 },
      { file: 'whale-mother', box: [2279, 1815, 445, 190], motion: 'still' },
    ],
  },
  {
    id: 'calf',
    motion: 'swim',
    dur: 6.4,
    delay: -4.4,
    parts: [{ file: 'calf', box: [2703, 2003, 236, 63], motion: 'still' }],
  },
  {
    id: 'turtle',
    parts: [
      { file: 'turtle-wake', box: [1866, 1895, 84, 71], motion: 'wake', dur: 4.6, delay: 0 },
      { file: 'turtle', box: [1711, 1841, 150, 136], origin: [1786, 1906], motion: 'paddle', dur: 4.6, delay: 0 },
    ],
  },
  {
    id: 'donkey-hat',
    parts: [{ file: 'donkey-hat', box: [733, 796, 65, 104], origin: [743, 879], motion: 'nod', a: 9, dur: 7, delay: -2 }],
  },
  {
    // The string of lights crosses this donkey's head; its wire stays still above the head.
    id: 'donkey',
    parts: [
      { file: 'donkey', box: [814, 881, 62, 70], origin: [860, 936], motion: 'nod', a: -8, dur: 8.5, delay: -6 },
      { file: 'donkey-wire', box: [837, 870, 34, 93], motion: 'still' },
    ],
  },
  {
    id: 'hog',
    parts: [{ file: 'hog', box: [618, 1705, 36, 54], origin: [624, 1742], motion: 'root', a: 7, dur: 5, delay: -1 }],
  },
  {
    id: 'hog-small',
    parts: [{ file: 'hog-small', box: [648, 1752, 35, 40], origin: [676, 1778], motion: 'root', a: -7, dur: 5.6, delay: -3.2 }],
  },
  {
    id: 'egret',
    parts: [{ file: 'egret', box: [359, 758, 57, 81], origin: [382, 836], motion: 'sway', a: 4, dur: 6, delay: -2 }],
  },
  {
    id: 'egret-small',
    parts: [{ file: 'egret-small', box: [507, 1169, 45, 66], origin: [524, 1230], motion: 'sway', a: 4, dur: 7, delay: -4.5 }],
  },
];

const pct = (v: number, of: number) => `${+((v / of) * 100).toFixed(4)}%`;

/** Animation settings as custom properties; the keyframes in tour.css read them. */
function timing({ dur, delay, a }: { dur?: number; delay?: number; a?: number }) {
  const s: Record<string, string> = {};
  if (dur !== undefined) s['--dur'] = `${dur}s`;
  if (delay !== undefined) s['--delay'] = `${delay}s`;
  if (a !== undefined) s['--a'] = `${a}deg`;
  return s;
}

/** Each group's box is the union of its pieces; a piece is placed inside its group's box. */
const LAYOUT = GROUPS.map((g) => {
  const x0 = Math.min(...g.parts.map((p) => p.box[0]));
  const y0 = Math.min(...g.parts.map((p) => p.box[1]));
  const x1 = Math.max(...g.parts.map((p) => p.box[0] + p.box[2]));
  const y1 = Math.max(...g.parts.map((p) => p.box[1] + p.box[3]));
  const gw = x1 - x0;
  const gh = y1 - y0;
  return {
    id: g.id,
    className: `ani-g${g.motion ? ` ani-${g.motion}` : ''}`,
    style: { left: pct(x0, ART_W), top: pct(y0, ART_H), width: pct(gw, ART_W), height: pct(gh, ART_H), ...timing(g) } as CSSProperties,
    parts: g.parts.map((p) => {
      const [x, y, w, h] = p.box;
      return {
        file: p.file,
        className: `ani-p ani-${p.motion}`,
        style: {
          left: pct(x - x0, gw),
          top: pct(y - y0, gh),
          width: pct(w, gw),
          height: pct(h, gh),
          transformOrigin: p.origin ? `${pct(p.origin[0] - x, w)} ${pct(p.origin[1] - y, h)}` : undefined,
          ...timing(p),
        } as CSSProperties,
      };
    }),
  };
});

/** The moving animals, over a copy of the card painting with the gaps painted in. */
export function Animals() {
  return (
    <div className="ani" aria-hidden="true">
      {LAYOUT.map((g) => (
        <div key={g.id} className={g.className} style={g.style}>
          {g.parts.map((p) => (
            <img
              key={p.file}
              className={p.className}
              src={`holiday/animals/${p.file}.webp`}
              alt=""
              draggable={false}
              decoding="async"
              style={p.style}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
