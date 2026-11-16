import type { CSSProperties } from 'react';
import { STOPS, TOUR, stopNumber } from './data';
import { Postcard } from './HolidayCard';
import { sourcesHref, stopHref, welcomeHref } from './router';
import { readEngineObject } from './storage';
import type { Visited } from './visits';

const N = STOPS.length;

/** The end of every stop: the way on to the next stop and back to the last one. */
export function WalkOn({ index }: { index: number }) {
  const next = index + 1 < N ? index + 1 : -1;
  const prev = index - 1;
  return (
    <nav className="walkon wide" aria-label="Continue the tour">
      {next >= 0 ? (
        <a className="wo-next" href={stopHref(next)}>
          <img className="wo-icon" src={STOPS[next].icon} alt="" />
          <span className="wo-body">
            <span className="wo-kicker">
              Next stop · {stopNumber(next)} of {stopNumber(N - 1)}
            </span>
            <span className="wo-title">{STOPS[next].title}</span>
            <span className="wo-text">{STOPS[next].intro}</span>
          </span>
          <span className="wo-go">
            Walk on <span aria-hidden="true">→</span>
          </span>
        </a>
      ) : (
        <div className="wo-next wo-end">
          <img className="wo-icon" src={TOUR.icons.landing} alt="" />
          <span className="wo-body">
            <span className="wo-kicker">End of the tour</span>
            <span className="wo-title">The boat leaves from Torrey Landing</span>
            <span className="wo-text">
              You have walked the island from the landing to the nesting beach. Board the boat back to the
              departure dock, or read where the facts on this tour come from.
            </span>
          </span>
          <span className="wo-links">
            <a className="wo-go" href={welcomeHref}>
              Back to the dock <span aria-hidden="true">→</span>
            </a>
            <a className="wo-alt" href={sourcesHref}>
              Sources and method
            </a>
          </span>
        </div>
      )}
      <p className="wo-row">
        {prev >= 0 ? (
          <a href={stopHref(prev)}>
            <span aria-hidden="true">←</span> Stop {stopNumber(prev)}: {STOPS[prev].title}
          </a>
        ) : (
          <a href={welcomeHref}>
            <span aria-hidden="true">←</span> Back to the departure dock
          </a>
        )}
        <a href={welcomeHref}>See the whole route</a>
      </p>
    </nav>
  );
}

/**
 * The tour passport, at the last stop: a stamp for each stop opened and the animals found in the
 * painted scenes. The habitat widgets keep the animals in localStorage; this reads them each time
 * the stop is shown.
 */
export function Passport({ visited }: { visited: Visited }) {
  const spotted = readEngineObject(TOUR.journal);
  const species = TOUR.species;
  const got = species.filter((sp) => spotted[sp.id]).length;
  const stamped = STOPS.filter((s) => visited[s.id]).length;
  return (
    <section className="passport wide" aria-labelledby="passport-title">
      <header className="fig-head">
        <h3 className="fig-title" id="passport-title">
          Your tour passport
        </h3>
        <p className="fig-sub">
          {stamped} of {N} stops stamped · {got} of {species.length} animals spotted. Tap a stamp to go back
          to that stop.
        </p>
      </header>
      <ol className="stamps">
        {STOPS.map((s, i) => (
          <li key={s.id} style={{ '--tilt': `${((i * 37) % 11) - 5}deg` } as CSSProperties}>
            <a
              className={`stamp${visited[s.id] ? ' on' : ''}`}
              href={stopHref(i)}
              aria-label={`Stop ${i + 1}: ${s.title}, ${visited[s.id] ? 'stamped' : 'not visited yet'}`}
            >
              <img className="stamp-icon" src={s.icon} alt="" />
              <span className="stamp-lbl">{s.short}</span>
            </a>
          </li>
        ))}
      </ol>
      <ul className="pp-species" aria-label="Animals">
        {species.map((sp) => (
          <li key={sp.id} className={`pp-sp${spotted[sp.id] ? ' on' : ''}`}>
            {sp.name}
            <span className="sr-only">{spotted[sp.id] ? ', spotted' : ', not spotted yet'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The holiday card at the end of the tour. */
export function PostcardHome() {
  return (
    <section className="postcard-home wide" aria-labelledby="postcard-home-title">
      <header className="fig-head">
        <p className="hol-ribbon">Season&#8217;s greetings</p>
        <h3 className="fig-title" id="postcard-home-title">
          A postcard before the boat leaves
        </h3>
        <p className="fig-sub">Tap the card to turn it over and read the message on the back.</p>
      </header>
      <Postcard label="Holiday card from Ossabaw Island" />
    </section>
  );
}
