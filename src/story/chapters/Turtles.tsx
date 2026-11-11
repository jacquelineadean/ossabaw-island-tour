import { Fact } from '@/story/components/Fact';

/** Stop 08: A record summer on the nesting beach. */
export function Turtles() {
  return (
    <section className="chapter" id="turtles" data-ch="7">
      <header className="chapter-head col">
        <p className="mark mark-sign" aria-hidden="true">
          <span className="mk-pre">Stop</span>
          <span className="mk-n">08</span>
        </p>
        <p className="kicker">Loggerhead sea turtles</p>
        <h2>A record summer on the nesting beach</h2>
      </header>
      <div className="prose col">
        <p>
          Five of the world's seven sea turtle species swim in Georgia waters, but only the loggerhead nests
          here regularly. From late May to mid-August females haul out at night, dig a chamber in the dry sand
          above the tide and lay{' '}
          <Fact src="dnr" note="Eggs in one clutch, low end">
            100 eggs
          </Fact>{' '}
          to{' '}
          <Fact src="dnr" note="Eggs in one clutch, high end">
            150 eggs
          </Fact>{' '}
          eggs. One female may nest up to{' '}
          <Fact src="dnr" note="Most clutches one female lays in a season">
            6 clutches
          </Fact>{' '}
          times in a season, then skip{' '}
          <Fact src="dnr" note="A female nests every 2 to 3 years">
            2 to 3 years
          </Fact>
          . The DNR has protected Ossabaw's nests since{' '}
          <Fact src="toif" note="DNR loggerhead conservation on Ossabaw began">
            1981
          </Fact>
          .
        </p>
      </div>
      <figure className="fig widget wide w-nest" data-fig="fig-14">
        <header className="fig-head">
          <h3 className="fig-title">One nest, one summer</h3>
          <p className="fig-sub">
            Step through a loggerhead nest from the night it is dug to the night the hatchlings run.
          </p>
        </header>
        <div className="widget-root" data-widget="nest" />
        <div className="widget-fallback">
          <p>
            A female loggerhead crawls up the beach at night, digs a nest and lays her eggs. Volunteers mark
            and screen it. About eight weeks later the hatchlings dig out together and run for the sea.
          </p>
        </div>
        <footer className="fig-foot">
          <span className="src" data-src="dnr">
            Source: Georgia DNR Wildlife Resources Division
          </span>
        </footer>
      </figure>
      <figure className="fig chart wide" data-fig="fig-15">
        <header className="fig-head">
          <h3 className="fig-title">2026 was Ossabaw's busiest nesting season of the last eight</h3>
          <p className="fig-sub">Loggerhead nests counted on Ossabaw each year, preliminary counts</p>
        </header>
        <div
          className="mount"
          role="img"
          aria-label="2026 was Ossabaw's busiest nesting season of the last eight"
        />
        <div className="table-slot" hidden />
        <footer className="fig-foot">
          <span className="src" data-src="seaturtle">
            Source: seaturtle.org nest database
          </span>
          <button type="button" className="show-table" aria-expanded="false">
            Show the numbers
          </button>
        </footer>
      </figure>
      <div className="prose col">
        <p>
          Ossabaw counted{' '}
          <Fact src="seaturtle" note="Loggerhead nests on Ossabaw, 2026, preliminary">
            780 nests
          </Fact>{' '}
          in 2026, up{' '}
          <Fact src="seaturtle" note="Change in Ossabaw nests from 2025 to 2026">
            159%
          </Fact>{' '}
          from 2025 and about{' '}
          <Fact src="seaturtle" note="Ossabaw's share of Georgia's 2026 nests">
            19%
          </Fact>{' '}
          of all the nests in Georgia, where the season set a state record of{' '}
          <Fact src="seaturtle" note="Loggerhead nests in Georgia, 2026, a state record">
            4,174 nests
          </Fact>
          . Most years only Cumberland Island counts more. Two decades ago the whole state counted{' '}
          <Fact src="gpb" note="Georgia's low point, 2004">
            358 nests
          </Fact>
          .
        </p>
        <p>
          A hatchling heads for the brightest horizon, which on a dark beach is the sky over the sea. On
          developed beaches, lights inland can lead it the wrong way. Ossabaw's beaches have no development
          behind them.
        </p>
      </div>
    </section>
  );
}
