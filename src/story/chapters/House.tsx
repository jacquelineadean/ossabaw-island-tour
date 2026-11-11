import { Fact } from '@/story/components/Fact';

/** Stop 04: A pink house built not to burn. */
export function House() {
  return (
    <section className="chapter" id="house" data-ch="3">
      <header className="chapter-head col">
        <p className="mark mark-sign" aria-hidden="true">
          <span className="mk-pre">Stop</span>
          <span className="mk-n">04</span>
        </p>
        <p className="kicker">The Torrey West House</p>
        <h2>A pink house built not to burn</h2>
      </header>
      <div className="prose col dropcap">
        <p>
          The Torreys' earlier winter home near Savannah, Greenwich, burned. On Ossabaw they built in stucco,
          clay tile and iron:{' '}
          <Fact src="toif" note="Floor area of the Torrey West House">
            20,000 sq ft
          </Fact>{' '}
          in the Spanish Colonial Revival style, with{' '}
          <Fact src="current" note="With 16 bathrooms">
            15 bedrooms
          </Fact>{' '}
          and{' '}
          <Fact src="current" note="Bathrooms in the house">
            16 bathrooms
          </Fact>
          . It had electricity, indoor plumbing and its own generator from the day it opened.
        </p>
      </div>
      <figure className="fig widget wide w-house" data-fig="fig-7">
        <header className="fig-head">
          <h3 className="fig-title">Walk through the house</h3>
          <p className="fig-sub">
            Tap a numbered dot for a detail, or a dark doorway label to walk into the next room.
          </p>
        </header>
        <div className="widget-root" data-widget="house" />
        <div className="widget-fallback">
          <p>
            The tour visits the entrance front, the Great Room and its picture window, the dining room, the
            butler's pantry and the rear patio.
          </p>
        </div>
        <footer className="fig-foot">
          <span className="src" data-src="tour">
            Source: Ossabaw Island Tour
          </span>
        </footer>
      </figure>
      <div className="prose col">
        <p>
          Eleanor "Sandy" Torrey West first came to Ossabaw in 1924, at{' '}
          <Fact src="toif" note="Age when she first came to Ossabaw, in 1924">
            11 years old
          </Fact>
          . She and her husband, the painter Clifford West, made the house the center of the Ossabaw Island
          Project from{' '}
          <Fact src="toif" note="Ossabaw Island Project founded by Sandy and Clifford West">
            1961
          </Fact>
          , and guests such as Samuel Barber, Ralph Ellison, Annie Dillard and the ecologist Eugene Odum came
          for weeks at a time.
        </p>
        <p>
          In 1978 the family sold the island to Georgia for half its appraised value. Sandy West kept{' '}
          <Fact src="toif" note="Kept for her lifetime in the 1978 sale; one source says 24">
            23 acres
          </Fact>{' '}
          around the house for her lifetime and lived there full time from{' '}
          <Fact src="toif" note="Year she became a full-time resident">
            1987
          </Fact>{' '}
          until she left at{' '}
          <Fact src="toif" note="Age when she left the island">
            103 years old
          </Fact>
          . She died on{' '}
          <Fact src="toif" note="Died on her birthday in Garden City, Georgia">
            17 Jan 2021
          </Fact>
          , her birthday, at{' '}
          <Fact src="toif" note="Age at her death">
            108 years old
          </Fact>
          .
        </p>
      </div>
      <div className="stats-wrap wide stats-cards" data-fig="fig-8">
        <div className="stats">
          <div className="stat" data-i="0">
            <p className="stat-label">Floor area</p>
            <p className="stat-value">
              <Fact src="toif" note="Floor area of the Torrey West House">
                20,000
              </Fact>
            </p>
            <p className="stat-delta neutral">square feet</p>
          </div>
          <div className="stat" data-i="1">
            <p className="stat-label">Bedrooms</p>
            <p className="stat-value">
              <Fact src="current" note="With 16 bathrooms">
                15
              </Fact>
            </p>
            <p className="stat-delta neutral">
              and{' '}
              <Fact src="current" note="Bathrooms in the house">
                16 bathrooms
              </Fact>
            </p>
          </div>
          <div className="stat" data-i="2">
            <p className="stat-label">State rehabilitation</p>
            <p className="stat-value">
              <Fact src="current" note="State rehabilitation, funded in the 2024-2025 budget">
                $7M
              </Fact>
            </p>
            <p className="stat-delta neutral">
              finished{' '}
              <Fact src="wtoc" note="Rehabilitation finished">
                Jan 2026
              </Fact>
            </p>
          </div>
          <div className="stat" data-i="3">
            <p className="stat-label">Age in 2026</p>
            <p className="stat-value">
              <Fact src="wtoc" note="The house turned 100 in 2026">
                100
              </Fact>
            </p>
            <p className="stat-delta neutral">years</p>
          </div>
        </div>
      </div>
    </section>
  );
}
