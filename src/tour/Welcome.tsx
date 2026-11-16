import { Fact } from '@/story/components/Fact';
import { STOPS, stopNumber } from './data';
import { CardTeaser } from './HolidayCard';
import { stopHref } from './router';
import { lastStopId, type Visited } from './visits';

type PanelProps = {
  hidden: boolean;
  visited: Visited;
  holiday: boolean;
  onOpenCard: () => void;
  /** Width of the panel where it sits over the map, or 0 where it stacks above the map. */
  width: number;
};

/**
 * The departure screen's title block. It stays in the DOM on every screen, because the engine
 * wires the fact tooltips in it once, when it boots.
 */
export function WelcomePanel({ hidden, visited, holiday, onOpenCard, width }: PanelProps) {
  const seen = STOPS.filter((s) => visited[s.id]).length;
  const lastAt = STOPS.findIndex((s) => s.id === lastStopId());
  const resume = seen > 0 && lastAt >= 0 && seen < STOPS.length ? lastAt : -1;
  return (
    <div className="welcome-panel" hidden={hidden} style={width ? { width } : undefined}>
      <div className="wp-card">
        {holiday && <p className="hol-ribbon">Season&#8217;s greetings</p>}
        <p className="kicker">A virtual tour of Georgia&#8217;s first Heritage Preserve</p>
        <h1 tabIndex={-1}>
          Ossabaw <span>Island</span>
        </h1>
        <p className="dek">
          Ossabaw lies{' '}
          <Fact src="dnr" note="Distance south of Savannah">
            20 miles
          </Fact>{' '}
          south of Savannah, with no bridge and no paved road. Its{' '}
          <Fact src="toif" note="Total area, high ground and tidal marsh together">
            26,000 acres
          </Fact>{' '}
          hold salt marsh, maritime forest and{' '}
          <Fact src="toif" note="Atlantic beach on the east side; one source says nearly 10">
            13 miles
          </Fact>{' '}
          of beach, and{' '}
          <Fact src="toif" note="Span of human history on the island">
            5,000 years
          </Fact>{' '}
          of human history. Cross by boat, then walk the island in nine stops.
        </p>
        <div className="welcome-cta">
          {resume >= 0 ? (
            <>
              <a className="tour-go" href={stopHref(resume)}>
                <span className="tg-main">Continue the tour</span>
                <span className="tg-sub">
                  Stop {stopNumber(resume)} · {STOPS[resume].title}
                </span>
              </a>
              <a className="tour-alt" href={stopHref(0)}>
                Start again at Torrey Landing
              </a>
            </>
          ) : (
            <a className="tour-go" href={stopHref(0)}>
              <span className="tg-main">Board the boat</span>
              <span className="tg-sub">Stop 01 · Torrey Landing</span>
            </a>
          )}
        </div>
        <p className="welcome-hint">Or tap any stop on the map to go straight there.</p>
        {holiday && <CardTeaser onOpen={onOpenCard} />}
      </div>
    </div>
  );
}

/** The nine stops as a list: the route at a glance, and a way in without the map. */
export function Itinerary({ hidden, visited }: { hidden: boolean; visited: Visited }) {
  const seen = STOPS.filter((s) => visited[s.id]).length;
  return (
    <section className="itinerary wide" hidden={hidden} aria-labelledby="itinerary-title">
      <div className="it-head">
        <h2 id="itinerary-title">The route</h2>
        <p>
          Nine stops from the landing at the north end to the nesting beach.{' '}
          {seen ? `You have visited ${seen} of ${STOPS.length}.` : 'Each stop you open is stamped in your passport.'}
        </p>
      </div>
      <ol className="it-list">
        {STOPS.map((s, i) => (
          <li key={s.id}>
            <a className={`it-stop${visited[s.id] ? ' is-visited' : ''}`} href={stopHref(i)}>
              <img className="it-icon" src={s.icon} alt="" />
              <span className="it-num">Stop {stopNumber(i)}</span>
              <span className="it-title">{s.title}</span>
              <span className="it-text">{s.intro}</span>
              {visited[s.id] ? <span className="it-seen">Visited</span> : null}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
