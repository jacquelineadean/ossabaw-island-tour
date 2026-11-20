import { useEffect, useRef } from 'react';
import { ICONS, STOPS, stopNumber } from './data';
import { CardButton } from './HolidayCard';
import type { Route } from './router';
import { stopHref, welcomeHref } from './router';
import type { Visited } from './visits';

type Props = {
  route: Route;
  visited: Visited;
  holiday: { season: boolean; on: boolean; toggle: () => void };
  vw: number;
  onOpenCard: () => void;
};

const N = STOPS.length;

/**
 * The sticky top bar. Its trail is the tour in miniature: one icon per stop on a dashed road, and a
 * map pin that marks where the reader is. The pin drops in at the current stop and slides toward
 * the next one as the reader scrolls; the road behind it is drawn in, like a route already walked.
 * The engine wires the theme button (.theme-btn) when it boots. While the holiday theme is on, the
 * holiday card sits at the bar's right end.
 */
export function TourBar({ route, visited, holiday, vw, onOpenCard }: Props) {
  const index = route.kind === 'stop' ? route.index : -1;
  const walker = useRef<HTMLSpanElement>(null);
  const walked = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = walker.current;
    const done = walked.current;
    if (!el || !done) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      let p = 0;
      if (index >= 0) {
        const room = document.documentElement.scrollHeight - window.innerHeight;
        const read = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
        p = index >= N - 1 ? index : index + 0.8 * read;
      }
      el.style.left = `${(100 * p) / (N - 1)}%`;
      done.style.width = `${(100 * p) / (N - 1)}%`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [index]);

  return (
    <nav className="spanbar tour-bar" aria-label="Tour">
      <div className="spanbar-in">
        <a className="spanbar-title" href={welcomeHref} title="Departure dock">
          <img className="st-icon" src={ICONS.map} alt="" />
          <span className="st-text">Ossabaw</span>
        </a>
        <div className="trail">
          <span className="trail-road" aria-hidden="true" />
          <span className="trail-walked" ref={walked} aria-hidden="true" />
          <span className="trail-walker" ref={walker} aria-hidden="true">
            {/* Keyed by stop, so the pin drops in again at each new stop. */}
            <svg key={index} className="trail-pin" viewBox="0 0 24 32">
              <ellipse className="tp-shadow" cx="12" cy="30.2" rx="5.2" ry="1.7" />
              <path
                className="tp-body"
                d="M12 29.4 C10.6 27.3 3 18.6 3 11.6 A9 9 0 0 1 21 11.6 C21 18.6 13.4 27.3 12 29.4 Z"
              />
              <circle className="tp-dot" cx="12" cy="11.6" r="3.7" />
            </svg>
          </span>
          <ol className="trail-list" aria-label="Stops on the tour">
            {STOPS.map((s, i) => (
              <li key={s.id}>
                <a
                  className={`trail-stop${visited[s.id] ? ' passed' : ''}${i === index ? ' current' : ''}${
                    i === 0 ? ' tip-l' : i === N - 1 ? ' tip-r' : ''
                  }`}
                  href={stopHref(i)}
                  style={{ left: `${(100 * i) / (N - 1)}%` }}
                  aria-label={`Stop ${i + 1}: ${s.title}${visited[s.id] ? ', visited' : ''}`}
                  aria-current={i === index ? 'step' : undefined}
                  data-tip={`${stopNumber(i)}  ${s.title}`}
                >
                  <img className="ts-icon" src={s.icon} alt="" />
                </a>
              </li>
            ))}
          </ol>
        </div>
        <p className="spanbar-now" aria-live="polite">
          {route.kind === 'stop' ? (
            <>
              <b>
                {stopNumber(index)}/{stopNumber(N - 1)}
              </b>{' '}
              {STOPS[index].short}
            </>
          ) : route.kind === 'sources' ? (
            'Sources and method'
          ) : (
            'Departure dock'
          )}
        </p>
        {holiday.season && (
          <button
            type="button"
            role="switch"
            aria-checked={holiday.on}
            aria-label="Holiday theme"
            className="holiday-switch"
            title={holiday.on ? 'Turn the holiday theme off' : 'Turn the holiday theme on'}
            onClick={holiday.toggle}
          >
            <svg className="hs-star" viewBox="-10 -10 20 20" aria-hidden="true">
              <path d="M0,-9 L2.4,-3.2 L8.6,-2.8 L3.8,1.2 L5.3,7.3 L0,4 L-5.3,7.3 L-3.8,1.2 L-8.6,-2.8 L-2.4,-3.2 Z" />
            </svg>
            <span className="hs-label">Holiday</span>
            <span className="hs-track" aria-hidden="true">
              <span className="hs-knob" />
            </span>
          </button>
        )}
        <button type="button" className="theme-btn" aria-label="Switch light or dark theme" />
        {holiday.on && <CardButton onOpen={onOpenCard} />}
      </div>
      {holiday.on && <Garland vw={vw} />}
    </nav>
  );
}

const BULB_COLORS = ['red', 'gold', 'green', 'blue'];

/** A string of lights hung along the bottom of the bar. */
function Garland({ vw }: { vw: number }) {
  const n = Math.max(10, Math.round(vw / 40));
  let d = 'M0 1';
  for (let i = 0; i < n; i++) d += ` Q${i * 20 + 10} 11 ${(i + 1) * 20} 1`;
  return (
    <div className="garland" aria-hidden="true">
      <svg className="garland-wire" viewBox={`0 0 ${n * 20} 12`} preserveAspectRatio="none">
        <path d={d} vectorEffect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`bulb bulb-${BULB_COLORS[i % 4]}`}
          style={{ left: `${((i + 0.5) * 100) / n}%`, animationDelay: `${((i * 7) % 11) * 0.23}s` }}
        />
      ))}
    </div>
  );
}
