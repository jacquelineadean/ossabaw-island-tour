import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ICONS, MAP, STOPS, TOUR, stopNumber, type Point } from './data';
import { stopHref } from './router';
import type { Visited } from './visits';

/**
 * The painted map is the stage of the tour. On the departure screen it shows the whole island.
 * On a stop it closes in on that stop, and moving to the next stop walks the boot along the road
 * while the view follows. One camera (a center in map pixels and a zoom) drives both.
 */

const W = MAP.w;
const H = MAP.h;
/** Every stop and pin with a margin: what the island view frames. */
const REGION = { x0: 360, y0: 24, x1: 1460, y1: 1172 };
const REGION_W = REGION.x1 - REGION.x0;
const REGION_H = REGION.y1 - REGION.y0;
/** How many map pixels of height a stop's close view shows. */
const CLOSE_SPAN = 440;
/** Bulb spacing along the road, in map pixels, for the holiday lights. */
const BULB_GAP = 24;

export type StageMode = 'overview' | 'stop' | 'hidden';

type Cam = { cx: number; cy: number; k: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const ROUTE_D = STOPS.map((s, i) => `${i ? 'L' : 'M'}${s.at[0]} ${s.at[1]}`).join(' ');

/**
 * Bulb positions along the whole road, split into four colors that twinkle in turn. Each bulb is a
 * zero-length segment with round caps, so it draws as a dot as wide as the stroke.
 */
const BULBS: string[] = (() => {
  const groups = ['', '', '', ''];
  let n = 0;
  for (let i = 1; i < STOPS.length; i++) {
    const [x0, y0] = STOPS[i - 1].at;
    const [x1, y1] = STOPS[i].at;
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let d = i === 1 ? 0 : BULB_GAP / 2; d < len; d += BULB_GAP) {
      const x = x0 + ((x1 - x0) * d) / len;
      const y = y0 + ((y1 - y0) * d) / len;
      groups[n++ % 4] += `M${x.toFixed(1)} ${y.toFixed(1)}h.01`;
    }
  }
  return groups;
})();

/** Stage height for each mode, from the window size. */
function stageHeight(mode: StageMode, open: boolean, vw: number, vh: number, barH: number) {
  if (mode === 'hidden') return 0;
  if (mode === 'stop' && !open) return Math.round(clamp(vh * 0.34, 190, 380));
  if (vw >= 900) return Math.round(clamp(vh - barH, 480, 940));
  return Math.round(Math.min((vw * REGION_H) / REGION_W, vh * 0.8));
}

function target(mode: StageMode, open: boolean, current: number, vw: number, vh: number, insetLeft: number): Cam {
  if (mode === 'stop' && !open && current >= 0) {
    const [x, y] = STOPS[current].at;
    return { cx: x, cy: y, k: Math.max(vh / CLOSE_SPAN, vw / W) };
  }
  // The island view frames REGION inside the part of the stage right of insetLeft.
  const pad = vw < 640 ? 8 : 24;
  const aw = Math.max(80, vw - insetLeft - 2 * pad);
  const ah = Math.max(80, vh - 2 * pad);
  const k = Math.min(aw / REGION_W, ah / REGION_H);
  const sx = insetLeft + pad + aw / 2;
  return { cx: (REGION.x0 + REGION.x1) / 2 + (vw / 2 - sx) / k, cy: (REGION.y0 + REGION.y1) / 2, k };
}

/** Screen offset of the map for a camera; a map larger than the view always fills it. */
function place(c: Cam, vw: number, vh: number) {
  let tx = vw / 2 - c.cx * c.k;
  let ty = vh / 2 - c.cy * c.k;
  if (W * c.k >= vw) tx = clamp(tx, vw - W * c.k, 0);
  if (H * c.k >= vh) ty = clamp(ty, vh - H * c.k, 0);
  return [tx, ty];
}

type Props = {
  mode: StageMode;
  /** Index of the current stop, or -1. */
  current: number;
  visited: Visited;
  holiday: boolean;
  /** Width covered by the departure panel on wide screens; the island view centers right of it. */
  insetLeft: number;
  vw: number;
  vh: number;
  barH: number;
};

export function MapStage({ mode, current, visited, holiday, insetLeft, vw, vh, barH }: Props) {
  const viewRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  const cam = useRef<Cam | null>(null);
  const raf = useRef(0);
  const last = useRef<{ mode: StageMode; current: number; open: boolean } | null>(null);
  const live = useRef({ mode, current, open: false, insetLeft });
  const [openAt, setOpenAt] = useState<number | null>(null);
  // "Whole island" on a stop page; it closes by itself when the reader moves to another stop.
  const open = mode === 'stop' && openAt === current;
  // A place card belongs to the screen it was opened on and closes when the screen changes.
  const screen = `${mode}:${current}`;
  const [pinAt, setPinAt] = useState<{ index: number; screen: string } | null>(null);
  const pin = pinAt && pinAt.screen === screen ? pinAt.index : null;
  const setPin = (index: number | null) => setPinAt(index === null ? null : { index, screen });
  const height = stageHeight(mode, open, vw, vh, barH);

  // The animation and resize callbacks read the latest props here. This runs before the camera
  // effect below, which reads it too.
  useLayoutEffect(() => {
    live.current = { mode, current, open, insetLeft };
  });

  function draw(c: Cam, walker: Point | null) {
    const view = viewRef.current;
    const world = worldRef.current;
    if (!view || !world) return;
    const [tx, ty] = place(c, view.clientWidth, view.clientHeight);
    const x = tx.toFixed(2);
    const y = ty.toFixed(2);
    // 3D only while the camera moves; at rest the map is painted again at its final zoom.
    const shift = raf.current ? `translate3d(${x}px, ${y}px, 0)` : `translate(${x}px, ${y}px)`;
    world.style.transform = `${shift} scale(${c.k.toFixed(5)})`;
    world.style.setProperty('--inv', (1 / c.k).toFixed(5));
    const w = walkerRef.current;
    if (w) {
      w.hidden = !walker;
      if (walker) {
        w.style.left = `${walker[0].toFixed(1)}px`;
        w.style.top = `${walker[1].toFixed(1)}px`;
      }
    }
  }

  function settle() {
    const view = viewRef.current;
    if (!view || raf.current) return;
    const s = live.current;
    cam.current = target(s.mode, s.open, s.current, view.clientWidth, view.clientHeight, s.insetLeft);
    draw(cam.current, s.mode === 'stop' && !s.open && s.current >= 0 ? STOPS[s.current].at : null);
  }

  // Move the camera when the screen, the stop or the island view changes.
  useLayoutEffect(() => {
    const view = viewRef.current;
    const prev = last.current;
    last.current = { mode, current, open };
    if (!view || mode === 'hidden') return;
    const changed = !prev || prev.mode !== mode || prev.current !== current || prev.open !== open;
    if (!changed) {
      settle();
      return;
    }
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    // The map is its own compositing layer only while it moves. Chrome keeps a layer's tiles from
    // earlier zooms, and on a layer that stays promoted the map labels show stale copies.
    const world = worldRef.current;
    if (world) world.style.willChange = '';
    if (!cam.current || !prev || prev.mode === 'hidden' || reduceMotion()) {
      settle();
      return;
    }
    const from = cam.current;
    const atStop = mode === 'stop' && !open;
    const walk = atStop && prev.mode === 'stop' && !prev.open && Math.abs(prev.current - current) === 1;
    const a = walk ? STOPS[prev.current].at : null;
    const b = atStop ? STOPS[current].at : null;
    const dist = a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
    const dur = walk ? clamp(700 + dist * 1.6, 900, 1700) : 1100;
    // A long jump lifts the camera off the map and sets it down again.
    const lift = !walk && prev.mode === 'stop' && atStop ? 0.35 : 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = ease(t);
      const s = live.current;
      const to = target(s.mode, s.open, s.current, view.clientWidth, view.clientHeight, s.insetLeft);
      let c: Cam;
      let walker: Point | null = null;
      if (walk && a && b) {
        walker = [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];
        c = { cx: walker[0], cy: walker[1], k: to.k * (1 - 0.06 * Math.sin(Math.PI * e)) };
      } else {
        const k = Math.exp(lerp(Math.log(from.k), Math.log(to.k), e)) * (1 - lift * Math.sin(Math.PI * e));
        c = { cx: lerp(from.cx, to.cx, e), cy: lerp(from.cy, to.cy, e), k };
        if (b && t === 1) walker = b;
      }
      cam.current = c;
      draw(c, walker);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        raf.current = 0;
        if (world) world.style.willChange = '';
        settle();
      }
    };
    if (world) world.style.willChange = 'transform';
    raf.current = requestAnimationFrame(step);
    // settle() and step() read the latest props through refs, so they are not dependencies.
  }, [mode, current, open, insetLeft]);

  // Keep the view framed while the stage grows, shrinks or the window resizes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => settle());
    ro.observe(view);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Escape closes a place card, then the island view.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (pin !== null) setPinAt(null);
      else if (open) setOpenAt(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pin, open]);

  const closeUp = mode === 'stop' && !open;
  // Phones, and windows too short for full-size badges on the island view.
  const compact = vw < 640 || vh < 560;
  const stop = current >= 0 ? STOPS[current] : null;

  return (
    <section
      className={`mapstage ms-mode-${mode}${open ? ' ms-open' : ''}${closeUp ? ' ms-close' : ' ms-wide'}${
        compact ? ' ms-compact' : ''
      }${insetLeft > 0 ? ' ms-inset' : ''}`}
      aria-label="Map of Ossabaw Island"
      hidden={mode === 'hidden'}
      style={{ minHeight: height }}
    >
      <div
        className="ms-view"
        ref={viewRef}
        onClick={() => setPin(null)}
        // Focusing a marker outside the view would scroll this clipped box; keep it still.
        onScroll={(ev) => {
          ev.currentTarget.scrollTop = 0;
          ev.currentTarget.scrollLeft = 0;
        }}
      >
        <div className="ms-world" ref={worldRef} style={{ width: W, height: H }}>
          <img
            className="ms-base"
            src={MAP.img}
            width={W}
            height={H}
            alt="Painted map of Ossabaw Island, with Ossabaw Sound to the north, the Atlantic to the east and St. Catherines Sound to the south."
            draggable={false}
          />
          {MAP.layers.map((L) => (
            <img
              key={L.src}
              className={`ms-layer ms-${L.motion}${L.blend === 'normal' ? '' : ' ms-mult'}`}
              src={L.src}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={
                {
                  left: L.box[0],
                  top: L.box[1],
                  width: L.box[2],
                  height: L.box[3],
                  '--travel': `${L.travel}px`,
                } as CSSProperties
              }
            />
          ))}
          <svg className="ms-ov" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
            {MAP.labels.map((lb) => (
              <text
                key={lb.text}
                x={lb.x}
                y={lb.y}
                className={`ms-label ms-label-${lb.style || 'hand'}${lb.role === 'title' ? ' ms-label-title' : ''}`}
                fontSize={lb.size || 26}
                textAnchor={lb.anchor || 'start'}
                fill={lb.color || undefined}
                transform={lb.angle ? `rotate(${lb.angle} ${lb.x} ${lb.y})` : undefined}
              >
                {lb.text}
              </text>
            ))}
            {holiday ? (
              <g className="ms-lights">
                <path className="ms-wire" d={ROUTE_D} />
                {BULBS.map((d, i) => (
                  <g key={i} className={`ms-bulbs ms-bulbs-${i}`}>
                    <path className="ms-glow" d={d} />
                    <path className="ms-core" d={d} />
                  </g>
                ))}
              </g>
            ) : (
              <>
                <path className="ms-route-shadow" d={ROUTE_D} />
                <path className="ms-route" d={ROUTE_D} />
              </>
            )}
          </svg>
          {TOUR.pins.map((p, i) => (
            <button
              key={p.title}
              type="button"
              className={`ms-pin${pin === i ? ' is-on' : ''}`}
              style={{ left: p.at[0], top: p.at[1] }}
              aria-label={`${p.title}: about this place`}
              aria-expanded={pin === i}
              onClick={(ev) => {
                ev.stopPropagation();
                setPin(pin === i ? null : i);
              }}
            />
          ))}
          {STOPS.map((s, i) => {
            const here = i === current && mode === 'stop';
            return (
              <a
                key={s.id}
                href={stopHref(i)}
                className={`ms-stop${s.at[0] > W * 0.7 ? ' lbl-left' : ''}${here ? ' is-here' : ''}${visited[s.id] ? ' is-visited' : ''}`}
                style={{ left: s.at[0], top: s.at[1] }}
                aria-label={`Stop ${i + 1}: ${s.title}${here ? ' (you are here)' : visited[s.id] ? ' (visited)' : ''}`}
                aria-current={here ? 'location' : undefined}
                data-stop={s.id}
              >
                <span className="ms-badge">
                  <img className="ms-icon" src={s.icon} alt="" draggable={false} />
                  <span className="ms-num">{i + 1}</span>
                  {holiday && s.id === 'donkeys' && <SantaHat />}
                  {holiday && s.id === 'house' && <Wreath />}
                </span>
                <span className="ms-lbl">
                  {here && <span className="ms-here">You are here</span>}
                  {s.short}
                </span>
              </a>
            );
          })}
          <div className="ms-walker" ref={walkerRef} aria-hidden="true" hidden>
            <img src={ICONS.boot} alt="" draggable={false} />
          </div>
        </div>
      </div>
      {mode === 'stop' && stop && (
        <div className="ms-bar">
          <p className="ms-chip">
            <img src={stop.icon} alt="" />
            <span>
              <b>Stop {stopNumber(current)}</b> of {stopNumber(STOPS.length - 1)} · {stop.title}
            </span>
          </p>
          <button
            type="button"
            className="ms-toggle"
            aria-expanded={open}
            onClick={() => setOpenAt(open ? null : current)}
          >
            <img src={ICONS.map} alt="" />
            <span className="mt-text">{open ? 'Close the island map' : 'Whole island'}</span>
          </button>
        </div>
      )}
      {pin !== null && (
        <div className="ms-pincard" role="status">
          <h3>{TOUR.pins[pin].title}</h3>
          <p>{TOUR.pins[pin].text}</p>
          <button type="button" className="ms-pinclose" onClick={() => setPin(null)} aria-label="Close">
            ×
          </button>
        </div>
      )}
    </section>
  );
}

function SantaHat() {
  return (
    <svg className="ms-hat" viewBox="0 0 44 34" aria-hidden="true">
      <path d="M7 27 C9 15 19 5 33 6 C37 6 40 9 41 13 C35 11 27 14 24 27 Z" fill="#c8463a" stroke="#2b231d" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="3" y="23.5" width="25" height="8" rx="4" fill="#fbf7ee" stroke="#2b231d" strokeWidth="1.6" />
      <circle cx="40" cy="14" r="4.4" fill="#fbf7ee" stroke="#2b231d" strokeWidth="1.6" />
    </svg>
  );
}

function Wreath() {
  const berries = [20, 70, 120, 160, 200, 250, 300, 340];
  return (
    <svg className="ms-wreath" viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="41" fill="none" stroke="#2f6b3d" strokeWidth="9" strokeDasharray="7 3" />
      <circle r="41" fill="none" stroke="#3e8a52" strokeWidth="4" strokeDasharray="3 9" />
      {berries.map((a) => (
        <circle
          key={a}
          cx={(41 * Math.cos((a * Math.PI) / 180)).toFixed(1)}
          cy={(41 * Math.sin((a * Math.PI) / 180)).toFixed(1)}
          r="3.6"
          fill="#c8463a"
        />
      ))}
      <path d="M0 37 L-10 30 L-10 44 Z M0 37 L10 30 L10 44 Z" fill="#c8463a" stroke="#2b231d" strokeWidth="1.2" />
    </svg>
  );
}
