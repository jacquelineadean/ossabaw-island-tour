import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { CAST } from './data';
import type { CastActor, CastPart, CastRig } from './data';

/**
 * The holiday map's animals, in the original story's watercolor: donkeys and hogs wander their
 * patch of open ground and graze or root between walks, egrets wade and fish, and the whales, a
 * loggerhead and two dolphins swim across the sea. Legs swing, heads nod and dip, tails and flukes
 * beat, as in the story's habitat scene (src/story/runtime/widgets/habitat.js).
 *
 * Each animal is a rig: painted parts placed in the rig's own pixels, each turning about its pivot.
 * Positions are map pixels; the map stage scales the whole world.
 */

type Joint = { el: HTMLElement; part: CastPart; ang: number };
type Actor = {
  a: CastActor;
  rig: CastRig;
  root: HTMLElement;
  flip: HTMLElement;
  body: HTMLElement;
  joints: Joint[];
  spout: HTMLElement | null;
  x: number;
  y: number;
  tx: number;
  ty: number;
  face: number;
  walking: boolean;
  timer: number;
  cycle: number;
  /** 0 walking, easing to 1 while it stands and grazes or fishes. */
  act: number;
  t0: number;
};

const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pct = (v: number, of: number) => `${+((100 * v) / of).toFixed(3)}%`;

/** A point inside the actor's patch, an ellipse [cx, cy, rx, ry]. */
function pick(area: [number, number, number, number]): [number, number] {
  const t = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random());
  return [area[0] + Math.cos(t) * r * area[2], area[1] + Math.sin(t) * r * area[3]];
}

/** Where a swimmer is at time t, in seconds, and how visible: it fades in and out at the ends. */
function swimAt(a: CastActor, t: number) {
  const s = a.swim!;
  const u = (((t + s.delay) % s.dur) + s.dur) % s.dur / s.dur;
  return {
    x: s.from[0] + (s.to[0] - s.from[0]) * u,
    y: s.from[1] + (s.to[1] - s.from[1]) * u,
    vis: Math.max(0, Math.min(1, u / 0.1, (1 - u) / 0.1)),
    face: s.to[0] >= s.from[0] ? 1 : -1,
  };
}

function partStyle(p: CastPart, box: [number, number, number, number]): CSSProperties {
  const [x, y, w, h] = p.box;
  const pv = p.pivot ?? [x + w / 2, y + h / 2];
  return {
    left: pct(x - box[0], box[2]),
    top: pct(y - box[1], box[3]),
    width: pct(w, box[2]),
    height: pct(h, box[3]),
    transformOrigin: `${pct(pv[0] - x, w)} ${pct(pv[1] - y, h)}`,
  };
}

/** One animal's markup: its parts in drawing order, hats riding on the part they sit on. */
function RigView({ a, rig }: { a: CastActor; rig: CastRig }) {
  const s = a.scale;
  const whole: [number, number, number, number] = [0, 0, rig.w, rig.h];
  const parts = rig.parts.filter((p) => !p.on && (p.role !== 'hat' || a.hat));
  return (
    <div
      className="mx"
      style={{ width: rig.w * s, height: rig.h * s }}
      data-rig={a.rig}
    >
      <div className="mx-flip" style={{ transformOrigin: `${pct(rig.anchor, rig.w)} 50%` }}>
        <div className="mx-body">
          {parts.map((p) => {
            const riders = rig.parts.filter((q) => q.on && q.on === p.role && a.hat);
            if (!riders.length) {
              return (
                <img
                  key={p.src}
                  className={`mx-part mx-${p.role}`}
                  src={p.src}
                  alt=""
                  draggable={false}
                  decoding="async"
                  style={partStyle(p, whole)}
                />
              );
            }
            return (
              <div key={p.src} className={`mx-part mx-${p.role}`} style={partStyle(p, whole)}>
                <img src={p.src} alt="" draggable={false} decoding="async" />
                {riders.map((q) => (
                  <img
                    key={q.src}
                    className="mx-rider"
                    src={q.src}
                    alt=""
                    draggable={false}
                    decoding="async"
                    style={{ ...partStyle(q, p.box), transform: q.turn ? `rotate(${q.turn}deg)` : undefined }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function place(st: Actor) {
  const { rig, a } = st;
  const s = a.scale;
  st.root.style.transform = `translate3d(${(st.x - rig.anchor * s).toFixed(1)}px, ${(st.y - rig.ground * s).toFixed(1)}px, 0)`;
  st.root.style.zIndex = String(Math.round(st.y));
  st.flip.style.transform = st.face < 0 ? 'scaleX(-1)' : '';
}

/** Joint angles and the body's bob, from the story's habitat scene. */
function pose(st: Actor, moving: boolean, t: number) {
  const c = st.cycle * Math.PI * 2;
  for (const j of st.joints) {
    const p = j.part;
    const amp = p.amp ?? 0;
    let ang = 0;
    if (p.role === 'leg') ang = moving ? amp * Math.sin(c + (p.phase ?? 0) * Math.PI * 2) : 0;
    else if (p.role === 'flipper') ang = amp * Math.sin(c + (p.phase ?? 0) * Math.PI * 2);
    else if (p.role === 'head')
      ang =
        (moving ? (p.nod ?? 3) * Math.sin(c * 2) : 0) +
        st.act * (p.down ?? 0) * (0.75 + 0.25 * Math.sin(t * 1.3)) +
        (p.look ?? 0) * Math.sin(t * 0.4);
    else if (p.role === 'tail') ang = amp * Math.sin(t * (p.speed ?? 3) + (p.phase ?? 0));
    if (Math.abs(ang - j.ang) > 0.05) {
      j.ang = ang;
      j.el.style.transform = `rotate(${ang.toFixed(2)}deg)`;
    }
  }
  const s = st.a.scale;
  const bob = moving && !st.a.swim ? Math.abs(Math.sin(c)) * (st.rig.bob ?? 3) : Math.sin(t * 1.6 + st.t0) * (st.rig.bob ?? 2) * 0.6;
  st.body.style.transform = `translateY(${(-bob * s).toFixed(2)}px)`;
  if (st.spout) {
    // A blow every nine seconds or so: it shoots up, hangs and fades.
    const k = ((t + st.t0) % 9) / 9;
    const on = k < 0.22 ? Math.sin((k / 0.22) * Math.PI) : 0;
    st.spout.style.opacity = on.toFixed(2);
    st.spout.style.transform = `scale(${(0.55 + 0.45 * Math.min(1, k / 0.1)).toFixed(2)})`;
  }
}

function step(st: Actor, dt: number, t: number) {
  const a = st.a;
  let moving = false;
  if (a.swim) {
    const at = swimAt(a, t);
    st.cycle += dt * (a.rig === 'turtle' ? 0.45 : 0.3);
    st.x = at.x;
    st.y = at.y;
    st.face = at.face;
    moving = true;
    let tilt = 0;
    if (a.arc) {
      // Dolphins roll along the surface: up, over and down every few seconds.
      const ph = (t * 0.9 + st.t0) % (Math.PI * 2);
      st.y -= Math.max(0, Math.sin(ph)) * a.arc;
      tilt = Math.cos(ph) * (Math.sin(ph) > 0 ? 9 : 0);
    }
    st.root.style.opacity = at.vis.toFixed(2);
    pose(st, moving, t);
    if (tilt) st.body.style.transform += ` rotate(${(-tilt).toFixed(1)}deg)`;
    place(st);
    return;
  }
  if (st.walking) {
    const dx = st.tx - st.x;
    const dy = st.ty - st.y;
    const d = Math.hypot(dx, dy);
    const go = Math.min(d, (a.speed ?? 8) * dt);
    if (d > 0.01) {
      st.x += (dx / d) * go;
      st.y += (dy / d) * go;
      if (Math.abs(dx) > 0.5) st.face = dx > 0 ? 1 : -1;
    }
    st.cycle += go / (a.stride ?? 8);
    moving = true;
    if (d - go < 0.5) {
      st.walking = false;
      st.timer = rnd(a.rest?.[0] ?? 3, a.rest?.[1] ?? 8);
    }
  } else {
    st.timer -= dt;
    if (st.timer <= 0 && a.area) {
      [st.tx, st.ty] = pick(a.area);
      st.walking = true;
    }
  }
  st.act += ((moving ? 0 : 1) - st.act) * Math.min(1, dt * 2.5);
  pose(st, moving, t);
  place(st);
}

/** The moving animals of the holiday map. It takes no props, so the stage's renders skip it. */
export const MapAnimals = memo(function MapAnimals() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const nodes = Array.from(host.querySelectorAll<HTMLElement>(':scope > .mx'));
    const now = performance.now() / 1000;
    const cast: Actor[] = CAST.actors.map((a, i) => {
      const rig = CAST.rigs[a.rig];
      const root = nodes[i];
      const body = root.querySelector<HTMLElement>('.mx-body')!;
      const shown = rig.parts.filter((p) => !p.on && (p.role !== 'hat' || a.hat));
      const els = Array.from(body.querySelectorAll<HTMLElement>(':scope > .mx-part'));
      const joints: Joint[] = [];
      let spout: HTMLElement | null = null;
      shown.forEach((p, k) => {
        if (p.role === 'spout') spout = els[k];
        else if (p.role !== 'static' && p.role !== 'hat') joints.push({ el: els[k], part: p, ang: 0 });
      });
      const [x, y] = a.at ?? (a.swim ? [a.swim.from[0], a.swim.from[1]] : [0, 0]);
      return {
        a,
        rig,
        root,
        flip: root.querySelector<HTMLElement>('.mx-flip')!,
        body,
        joints,
        spout,
        x,
        y,
        tx: x,
        ty: y,
        face: a.face ?? (i % 2 ? -1 : 1),
        walking: false,
        timer: 0.6 + (i % 4) * 1.3,
        cycle: Math.random(),
        act: 1,
        t0: Math.random() * 10,
      };
    });

    if (reduceMotion()) {
      // Still animals: each stands where it starts; a swimmer waits halfway along its crossing.
      for (const st of cast) {
        if (st.a.swim) {
          const s = st.a.swim;
          st.x = (s.from[0] + s.to[0]) / 2;
          st.y = (s.from[1] + s.to[1]) / 2;
          st.face = s.to[0] >= s.from[0] ? 1 : -1;
        }
        if (st.spout) st.spout.style.opacity = '0';
        st.act = 0;
        place(st);
      }
      return;
    }

    let raf = 0;
    let last = now;
    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame);
      const t = ms / 1000;
      // A long pause (a hidden tab, a closed map) restarts the clock instead of jumping.
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      if (!host.getClientRects().length) return;
      for (const st of cast) step(st, dt, t);
    };
    for (const st of cast) step(st, 0, now);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mx-cast" ref={ref} aria-hidden="true">
      {CAST.actors.map((a, i) => (
        <RigView key={i} a={a} rig={CAST.rigs[a.rig]} />
      ))}
    </div>
  );
});
