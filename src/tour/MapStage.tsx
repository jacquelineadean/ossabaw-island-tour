import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Animals } from './Animals';
import {
  CARD_MAP,
  ICONS,
  PAINTED_MAP,
  STOPS,
  SURROUND_X,
  SURROUND_Y,
  TOUR,
  stopNumber,
  type MapSpec,
  type Point,
} from './data';
import { stopHref } from './router';
import type { Visited } from './visits';

/**
 * The painted map is the stage of the tour. On the departure screen it shows the whole island.
 * On a stop it closes in on that stop, and moving to the next stop walks the boot along the road
 * while the view follows. One camera (a center in map pixels and a zoom) drives both.
 * While the holiday theme is on, the stage shows the holiday card's map, with its animals moving.
 * Past the painting's edges a soft surround carries its colors on, so the map fills any screen.
 */

export type StageMode = 'overview' | 'stop' | 'hidden';

type Cam = { cx: number; cy: number; k: number };

/**
 * A stop or pin as the island view draws it: its point in map pixels, and how far its badge, label
 * or dot reaches left, right, up and down from that point on screen, in CSS pixels. Badges, labels
 * and pins keep their screen size at every zoom.
 */
type Mark = { x: number; y: number; l: number; r: number; t: number; b: number };

/** Space between the marks and the stage's sides and bottom, in CSS pixels. */
const EDGE = 14;
/** Space above the topmost mark; the holiday lights hang over the stage's top. */
const TOP = 20;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** v kept inside lo..hi; the middle of the two when lo is past hi. */
const within = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : clamp(v, lo, hi));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A label's width: Archivo Narrow bold at 13px runs about 6px a letter, plus 18px of padding. */
const labelWidth = (text: string) => 18 + 6.2 * text.length;

/**
 * The marks of the island view. Badges are 58px with the stop number over the top right corner;
 * small screens draw 34px badges and no labels. The current stop's label adds "You are here".
 */
function marksFor(spec: MapSpec, compact: boolean, here: number): Mark[] {
  const half = compact ? 17 : 29;
  const marks: Mark[] = STOPS.map((s, i) => {
    const [x, y] = spec.stops[i];
    const m: Mark = { x, y, l: half + 2, r: half + 6, t: half + 7, b: half + 4 };
    if (!compact) {
      const reach = 36 + Math.max(labelWidth(s.short), i === here ? 100 : 0);
      if (spec.labelLeft[i]) m.l = reach;
      else m.r = reach;
    }
    return m;
  });
  for (const [x, y] of spec.pins) marks.push({ x, y, l: 11, r: 11, t: 11, b: 11 });
  return marks;
}

/** A box in map pixels: x0, y0, x1, y1. */
type Box = [number, number, number, number];

/**
 * The painted map's place names, as boxes in map pixels, for keeping the island view's title off
 * them. The width is an estimate: half the font size per letter. A turned label gets a square.
 */
function labelBoxes(spec: MapSpec): Box[] {
  return spec.labels
    .filter((lb) => lb.role !== 'title')
    .map((lb) => {
      const w = 0.55 * lb.size * lb.text.length;
      if (lb.angle) return [lb.x - w / 2, lb.y - w / 2, lb.x + w / 2, lb.y + w / 2];
      const x0 = lb.anchor === 'middle' ? lb.x - w / 2 : lb.anchor === 'end' ? lb.x - w : lb.x;
      return [x0, lb.y - lb.size, x0 + w, lb.y + 0.3 * lb.size];
    });
}

/** Where the marks reach on screen along one axis at zoom k, measured from the map's origin. */
function extent(marks: Mark[], k: number, axis: 'x' | 'y'): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const m of marks) {
    const at = (axis === 'x' ? m.x : m.y) * k;
    lo = Math.min(lo, at - (axis === 'x' ? m.l : m.t));
    hi = Math.max(hi, at + (axis === 'x' ? m.r : m.b));
  }
  return [lo, hi];
}

/** The largest zoom at which every mark fits in a box w by h pixels. */
function largestZoom(marks: Mark[], w: number, h: number) {
  let lo = 0.02;
  let hi = 8;
  for (let n = 0; n < 32; n++) {
    const k = (lo + hi) / 2;
    const [x0, x1] = extent(marks, k, 'x');
    const [y0, y1] = extent(marks, k, 'y');
    if (x1 - x0 <= w && y1 - y0 <= h) lo = k;
    else hi = k;
  }
  return lo;
}

/** Stage height for each mode, from the window size. */
function stageHeight(spec: MapSpec, mode: StageMode, open: boolean, vw: number, vh: number, barH: number, marks: Mark[]) {
  if (mode === 'hidden') return 0;
  if (mode === 'stop' && !open) return Math.round(clamp(vh * 0.34, 190, 380));
  const full = Math.max(320, vh - barH);
  // "Whole island" fills the window below the bar.
  if (vw >= 900) return open ? full : Math.round(clamp(vh - barH, 480, 940));
  if (open) {
    // A phone shows the island across its width, and the stage is as tall as the painting fills
    // at that zoom, or as the marks need.
    const k = largestZoom(marks, vw - 2 * EDGE, Infinity);
    const [y0, y1] = extent(marks, k, 'y');
    return Math.round(Math.min(full, Math.max((spec.h - 2 * spec.fade) * k, y1 - y0 + TOP + EDGE)));
  }
  const { x0, y0, x1, y1 } = spec.region;
  return Math.round(Math.min((vw * (y1 - y0)) / (x1 - x0), vh * 0.8));
}

/** A camera moved so the painting's faded edges stay off screen, where the painting is large enough. */
function inside(spec: MapSpec, c: Cam, vw: number, vh: number): Cam {
  const f = spec.fade * c.k;
  let tx = vw / 2 - c.cx * c.k;
  let ty = vh / 2 - c.cy * c.k;
  if (spec.w * c.k - 2 * f >= vw) tx = clamp(tx, vw - spec.w * c.k + f, -f);
  if (spec.h * c.k - 2 * f >= vh) ty = clamp(ty, vh - spec.h * c.k + f, -f);
  return { cx: (vw / 2 - tx) / c.k, cy: (vh / 2 - ty) / c.k, k: c.k };
}

/**
 * The whole island, right of insetLeft (the departure panel on wide screens). The zoom starts
 * from the island's region with a margin and grows until the painting covers the stage, but never
 * past the zoom where a stop, label or pin would leave the screen. Where the painting is still
 * narrower than the stage, its west edge stays at the stage's left side and the surround carries
 * the sea on to the east.
 */
function islandCam(spec: MapSpec, marks: Mark[], vw: number, vh: number, insetLeft: number): Cam {
  const { x0, y0, x1, y1 } = spec.region;
  const pad = vw < 640 ? 8 : 24;
  const aw = Math.max(80, vw - insetLeft - 2 * pad);
  const ah = Math.max(80, vh - 2 * pad);
  const fit = Math.min(aw / (x1 - x0), ah / (y1 - y0));
  const cover = Math.max((vw - insetLeft) / (spec.w - 2 * spec.fade), vh / (spec.h - 2 * spec.fade));
  const box = { l: insetLeft + EDGE, r: vw - EDGE, t: TOP, b: vh - EDGE };
  const k = Math.min(Math.max(fit, cover), largestZoom(marks, box.r - box.l, box.b - box.t));
  const f = spec.fade * k;
  let tx = insetLeft + pad + aw / 2 - ((x0 + x1) / 2) * k;
  let ty = pad + ah / 2 - ((y0 + y1) / 2) * k;
  const west = insetLeft - f;
  const east = vw - spec.w * k + f;
  tx = east <= west ? clamp(tx, east, west) : west;
  const north = -f;
  const south = vh - spec.h * k + f;
  ty = south <= north ? clamp(ty, south, north) : (vh - spec.h * k) / 2;
  // Every badge, label and pin stays on screen; this wins over the painting's edges.
  const [ex0, ex1] = extent(marks, k, 'x');
  const [ey0, ey1] = extent(marks, k, 'y');
  tx = within(tx, box.l - ex0, box.r - ex1);
  ty = within(ty, box.t - ey0, box.b - ey1);
  return { cx: (vw / 2 - tx) / k, cy: (vh / 2 - ty) / k, k };
}

function target(
  spec: MapSpec,
  mode: StageMode,
  open: boolean,
  current: number,
  vw: number,
  vh: number,
  insetLeft: number,
  marks: Mark[],
): Cam {
  if (mode === 'stop' && !open && current >= 0) {
    const [x, y] = spec.stops[current];
    const k = Math.max(vh / spec.closeSpan, vw / (spec.w - 2 * spec.fade));
    return inside(spec, { cx: x, cy: y, k }, vw, vh);
  }
  return islandCam(spec, marks, vw, vh, insetLeft);
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
  const titleRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const last = useRef<{ mode: StageMode; current: number; open: boolean; spec: MapSpec } | null>(null);
  const spec = holiday ? CARD_MAP : PAINTED_MAP;
  const [openAt, setOpenAt] = useState<number | null>(null);
  // "Whole island" on a stop page; it closes by itself when the reader moves to another stop.
  const open = mode === 'stop' && openAt === current;
  // A place card belongs to the screen it was opened on and closes when the screen changes.
  const screen = `${mode}:${current}`;
  const [pinAt, setPinAt] = useState<{ index: number; screen: string } | null>(null);
  const pin = pinAt && pinAt.screen === screen ? pinAt.index : null;
  const setPin = (index: number | null) => setPinAt(index === null ? null : { index, screen });
  // Phones, and windows too short for full-size badges on the island view.
  const compact = vw < 640 || vh < 560;
  const here = mode === 'stop' ? current : -1;
  const marks = useMemo(() => marksFor(spec, compact, here), [spec, compact, here]);
  const names = useMemo(() => labelBoxes(spec), [spec]);
  const height = stageHeight(spec, mode, open, vw, vh, barH, marks);
  const routeD = useMemo(() => spec.stops.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '), [spec]);
  const live = useRef({ mode, current, open, insetLeft, spec, marks, names, compact });

  // The animation and resize callbacks read the latest props here. This runs before the camera
  // effect below, which reads it too.
  useLayoutEffect(() => {
    live.current = { mode, current, open, insetLeft, spec, marks, names, compact };
  });

  function aim() {
    const view = viewRef.current;
    const s = live.current;
    if (!view) return null;
    return target(s.spec, s.mode, s.open, s.current, view.clientWidth, view.clientHeight, s.insetLeft, s.marks);
  }

  function draw(c: Cam, walker: Point | null) {
    const view = viewRef.current;
    const world = worldRef.current;
    if (!view || !world) return;
    const x = (view.clientWidth / 2 - c.cx * c.k).toFixed(2);
    const y = (view.clientHeight / 2 - c.cy * c.k).toFixed(2);
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
    if (raf.current) return;
    const c = aim();
    if (!c) return;
    const s = live.current;
    cam.current = c;
    draw(c, s.mode === 'stop' && !s.open && s.current >= 0 ? s.spec.stops[s.current] : null);
    showTitle(c);
  }

  /**
   * The island view's title sits on the sea at the stage's right. It shows once the camera is at
   * rest, in a smaller size where the full one would cover a stop, label, pin or place name, and
   * not at all where both would: on a tall screen the island fills the stage and leaves no sea.
   */
  function showTitle(c: Cam) {
    const el = titleRef.current;
    const view = viewRef.current;
    const s = live.current;
    if (!el || !view) return;
    if (!s.open || s.compact) {
      el.classList.remove('is-on', 'is-small');
      return;
    }
    const tx = view.clientWidth / 2 - c.cx * c.k;
    const ty = view.clientHeight / 2 - c.cy * c.k;
    const at = view.getBoundingClientRect();
    for (const small of [false, true]) {
      el.classList.toggle('is-small', small);
      // The title is placed with translate, which offsetTop leaves out; its box on screen has it.
      const box = el.getBoundingClientRect();
      const l = box.left - at.left - 16;
      const t = box.top - at.top - 16;
      const r = box.right - at.left + 16;
      const b = box.bottom - at.top + 16;
      const hit =
        s.marks.some((m) => {
          const x = tx + m.x * c.k;
          const y = ty + m.y * c.k;
          return x + m.r > l && x - m.l < r && y + m.b > t && y - m.t < b;
        }) ||
        s.names.some(
          ([x0, y0, x1, y1]) => tx + x1 * c.k > l && tx + x0 * c.k < r && ty + y1 * c.k > t && ty + y0 * c.k < b,
        );
      if (!hit) {
        el.classList.add('is-on');
        return;
      }
    }
    el.classList.remove('is-on', 'is-small');
  }

  // Move the camera when the screen, the stop or the island view changes. A switch between the two
  // maps jumps, since their pixels do not line up.
  useLayoutEffect(() => {
    const view = viewRef.current;
    const prev = last.current;
    last.current = { mode, current, open, spec };
    // The title waits for the camera to come to rest.
    if (!open) titleRef.current?.classList.remove('is-on', 'is-small');
    if (!view || mode === 'hidden') return;
    const changed = !prev || prev.mode !== mode || prev.current !== current || prev.open !== open;
    if (!changed || (prev && prev.spec !== spec)) {
      if (prev && prev.spec !== spec) {
        cancelAnimationFrame(raf.current);
        raf.current = 0;
        if (worldRef.current) worldRef.current.style.willChange = '';
      }
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
    const a = walk ? spec.stops[prev.current] : null;
    const b = atStop ? spec.stops[current] : null;
    const dist = a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
    const dur = walk ? clamp(700 + dist * 1.6, 900, 1700) : 1100;
    // A long jump lifts the camera off the map and sets it down again.
    const lift = !walk && prev.mode === 'stop' && atStop ? 0.35 : 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = ease(t);
      const s = live.current;
      const to = aim() ?? from;
      let c: Cam;
      let walker: Point | null = null;
      if (walk && a && b) {
        walker = [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];
        const k = to.k * (1 - 0.06 * Math.sin(Math.PI * e));
        c = inside(s.spec, { cx: walker[0], cy: walker[1], k }, view.clientWidth, view.clientHeight);
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
  }, [mode, current, open, insetLeft, spec]);

  // Keep the view framed while the stage grows, shrinks or the window resizes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => settle());
    ro.observe(view);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // The title's size depends on its font; measure it again once the fonts arrive.
  useEffect(() => {
    let gone = false;
    document.fonts?.ready.then(() => {
      if (!gone) settle();
    });
    return () => {
      gone = true;
    };
  }, []);

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
  const stop = current >= 0 ? STOPS[current] : null;
  const fadeStyle = {
    '--fade-x': `${(100 * spec.fade) / spec.w}%`,
    '--fade-y': `${(100 * spec.fade) / spec.h}%`,
    '--from-x': `${(100 * spec.fadeFrom) / spec.w}%`,
    '--from-y': `${(100 * spec.fadeFrom) / spec.h}%`,
  } as CSSProperties;

  return (
    <section
      className={`mapstage ms-mode-${mode}${open ? ' ms-open' : ''}${closeUp ? ' ms-close' : ' ms-wide'}${
        compact ? ' ms-compact' : ''
      }${insetLeft > 0 ? ' ms-inset' : ''}`}
      aria-label="Map of Ossabaw Island"
      hidden={mode === 'hidden'}
      style={{ minHeight: height, '--map-sea': spec.sea } as CSSProperties}
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
        <div className="ms-world" ref={worldRef} style={{ width: spec.w, height: spec.h }}>
          <img
            key={`${spec.id}-surround`}
            className="ms-surround"
            src={spec.surround}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              left: -spec.w * SURROUND_X,
              top: -spec.h * SURROUND_Y,
              width: spec.w * (1 + 2 * SURROUND_X),
              height: spec.h * (1 + 2 * SURROUND_Y),
            }}
          />
          <img
            key={spec.id}
            className="ms-base"
            style={fadeStyle}
            src={spec.img}
            srcSet={spec.srcSet}
            sizes={spec.srcSet ? `${spec.w}px` : undefined}
            width={spec.w}
            height={spec.h}
            alt={spec.alt}
            draggable={false}
          />
          {spec.animals && <Animals />}
          {spec.layers.map((L) => (
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
          <svg className="ms-ov" viewBox={`0 0 ${spec.w} ${spec.h}`} width={spec.w} height={spec.h} aria-hidden="true">
            {spec.labels.map((lb) => (
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
            {spec.route && (
              <>
                <path className="ms-route-shadow" d={routeD} />
                <path className="ms-route" d={routeD} />
              </>
            )}
          </svg>
          {TOUR.pins.map((p, i) => (
            <button
              key={p.title}
              type="button"
              className={`ms-pin${pin === i ? ' is-on' : ''}`}
              style={{ left: spec.pins[i][0], top: spec.pins[i][1] }}
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
                className={`ms-stop${spec.labelLeft[i] ? ' lbl-left' : ''}${here ? ' is-here' : ''}${visited[s.id] ? ' is-visited' : ''}`}
                style={{ left: spec.stops[i][0], top: spec.stops[i][1] }}
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
      <div className="ms-title" ref={titleRef} aria-hidden="true">
        <p className="ms-title-name">
          Ossabaw <span>Island</span>
        </p>
        <p className="ms-title-sub">Georgia&#8217;s first Heritage Preserve, 20&nbsp;miles south of Savannah</p>
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
            onClick={() => {
              // The island view fills the window below the bar, so it opens from the top of the page.
              if (!open && window.scrollY > 0) window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
              setOpenAt(open ? null : current);
            }}
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
