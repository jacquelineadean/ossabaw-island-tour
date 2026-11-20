import { memo, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { Arrive } from '@/story/chapters/Arrive';
import { History } from '@/story/chapters/History';
import { Tabby } from '@/story/chapters/Tabby';
import { House } from '@/story/chapters/House';
import { Habitats } from '@/story/chapters/Habitats';
import { Hogs } from '@/story/chapters/Hogs';
import { Donkeys } from '@/story/chapters/Donkeys';
import { Turtles } from '@/story/chapters/Turtles';
import { Journal } from '@/story/chapters/Journal';
import { Sources } from '@/story/Sources';
import { startStory } from '@/story/runtime';
import { FOUNDATION_URL, STOPS, stopNumber } from './data';
import { CardDialog } from './HolidayCard';
import { useHoliday } from './holiday';
import { MapStage, type StageMode } from './MapStage';
import { go, sourcesHref, stopHref, useRoute, welcomeHref, type Route } from './router';
import { TourBar } from './TourBar';
import { useVisited } from './visits';
import { Passport, PostcardHome, WalkOn } from './WalkOn';
import { Itinerary, WelcomePanel } from './Welcome';

/**
 * The chapters render static markup that the story engine then changes in place (charts,
 * widgets, tooltips). memo() keeps React from rendering them again when the tour's state
 * changes, so the engine's work stays put.
 */
const CHAPTERS: Record<string, ComponentType> = {
  arrive: memo(Arrive),
  history: memo(History),
  tabby: memo(Tabby),
  house: memo(House),
  habitats: memo(Habitats),
  hogs: memo(Hogs),
  donkeys: memo(Donkeys),
  turtles: memo(Turtles),
  journal: memo(Journal),
};
const SourceList = memo(Sources);

/** Height of the sticky top bar; tour.css sets the same value as --bar-h. */
const BAR_H = 62;
const SITE = 'Ossabaw Island Tour';

const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function viewport() {
  return { vw: document.documentElement.clientWidth || window.innerWidth, vh: window.innerHeight };
}

/** Window size. Phones resize the window as the address bar slides; small height changes are ignored. */
function useViewport() {
  const [vp, setVp] = useState(viewport);
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setVp((prev) => {
          const next = viewport();
          return next.vw === prev.vw && Math.abs(next.vh - prev.vh) < 120 ? prev : next;
        }),
      );
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return vp;
}

function titleOf(route: Route) {
  if (route.kind === 'stop') return `Stop ${stopNumber(route.index)}: ${STOPS[route.index].title} · ${SITE}`;
  if (route.kind === 'sources') return `Sources and method · ${SITE}`;
  return SITE;
}

/** The whole site: a departure screen, nine stops and the sources, one screen at a time. */
export function TourApp() {
  const route = useRoute();
  const holiday = useHoliday();
  const { visited, mark } = useVisited();
  const { vw, vh } = useViewport();
  // While the holiday theme is on, the holiday card greets the reader on every new page load.
  const [cardOpen, setCardOpen] = useState(holiday.on);
  const index = route.kind === 'stop' ? route.index : -1;
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  const pages = useRef<(HTMLDivElement | null)[]>([]);
  const firstScreen = useRef(true);

  const wide = vw >= 900;
  const panelW = wide ? Math.round(Math.min(470, Math.max(360, vw * 0.34))) : 0;
  const mode: StageMode = route.kind === 'welcome' ? 'overview' : route.kind === 'stop' ? 'stop' : 'hidden';

  // Every stop is rendered by now (most of them hidden); the engine wires all of them once.
  useEffect(() => startStory(), []);

  useEffect(() => {
    if (index >= 0) mark(STOPS[index].id);
  }, [index, mark]);

  // A new screen starts at the top, takes focus at its heading and names itself in the title.
  useLayoutEffect(() => {
    document.title = titleOf(route);
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    window.scrollTo(0, 0);
    let heading: HTMLElement | null = null;
    if (route.kind === 'stop') heading = pages.current[route.index]?.querySelector('h2') ?? null;
    else if (route.kind === 'sources') heading = document.querySelector('.sources-title');
    else heading = document.querySelector('.welcome-panel h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    // Widgets in a stop that was hidden lay themselves out again on resize.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    if (route.kind === 'stop' && !reduceMotion()) {
      pages.current[route.index]?.animate(
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 520, easing: 'cubic-bezier(.2,.7,.3,1)' },
      );
    }
  }, [route]);

  // Left and right arrows walk the tour when nothing else on the page wants them.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.defaultPrevented) return;
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const t = ev.target as Element;
      if (t !== document.body && !/^H[12]$/.test(t.tagName)) return;
      if (document.querySelector('dialog[open]')) return;
      const i = indexRef.current;
      if (ev.key === 'ArrowRight' && i < STOPS.length - 1) go(stopHref(i + 1));
      else if (ev.key === 'ArrowLeft') go(i > 0 ? stopHref(i - 1) : welcomeHref);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <TourBar route={route} visited={visited} holiday={holiday} vw={vw} onOpenCard={() => setCardOpen(true)} />
      <main className={`tour tour-${route.kind}`} id="top">
        <div className={`stage-wrap${route.kind === 'welcome' ? ' is-welcome' : ''}`}>
          <WelcomePanel hidden={route.kind !== 'welcome'} visited={visited} width={panelW} />
          <MapStage
            mode={mode}
            current={index}
            visited={visited}
            holiday={holiday.on}
            insetLeft={route.kind === 'welcome' ? panelW : 0}
            vw={vw}
            vh={vh}
            barH={BAR_H}
          />
        </div>
        <Itinerary hidden={route.kind !== 'welcome'} visited={visited} />
        <div className="story stops">
          {STOPS.map((s, i) => {
            const Chapter = CHAPTERS[s.id];
            return (
              <div
                key={s.id}
                className="stop-page"
                data-stop={s.id}
                hidden={i !== index}
                ref={(el) => {
                  pages.current[i] = el;
                }}
              >
                <Chapter />
                {s.id === 'journal' && i === index && (
                  <>
                    <Passport visited={visited} />
                    {holiday.on && <PostcardHome />}
                  </>
                )}
              </div>
            );
          })}
          {index >= 0 && <WalkOn index={index} />}
          <div className="sources-page" hidden={route.kind !== 'sources'}>
            <p className="sp-back col">
              <a href={welcomeHref}>
                <span aria-hidden="true">←</span> Back to the departure dock
              </a>
            </p>
            <SourceList />
          </div>
        </div>
      </main>
      <footer className="site-foot">
        <div className="sf-in">
          <p className="byline">
            <span>An illustrated tour; every painting is original</span>
            <span>Facts from the Ossabaw Island Foundation, Georgia DNR and the sources listed</span>
            <span>Inspired by the Foundation&#8217;s virtual tour</span>
          </p>
          <p className="sf-links">
            <a href={sourcesHref}>Sources and method</a>
            <a href={welcomeHref}>Departure dock</a>
            <a href={FOUNDATION_URL} target="_blank" rel="noopener">
              Visit ossabawisland.org<span className="sr-only"> (opens in a new tab)</span>
            </a>
            {holiday.season && (
              <button type="button" className="sf-holiday" onClick={holiday.toggle}>
                {holiday.on ? 'Turn off the holiday theme' : 'Turn on the holiday theme'}
              </button>
            )}
          </p>
          {holiday.on && <p className="sf-note">Holiday card map data &#169; OpenStreetMap contributors.</p>}
        </div>
      </footer>
      {holiday.on && <CardDialog open={cardOpen} onClose={() => setCardOpen(false)} />}
    </>
  );
}
