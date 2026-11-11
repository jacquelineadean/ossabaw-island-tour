import { Fact } from '@/story/components/Fact';

/** Stop 07: The donkeys a mother brought for her children. */
export function Donkeys() {
  return (
    <section className="chapter" id="donkeys" data-ch="6">
      <header className="chapter-head col">
        <p className="mark mark-sign" aria-hidden="true">
          <span className="mk-pre">Stop</span>
          <span className="mk-n">07</span>
        </p>
        <p className="kicker">Free-range donkeys</p>
        <h2>The donkeys a mother brought for her children</h2>
      </header>
      <div className="prose col">
        <p>
          In{' '}
          <Fact src="toif" note="Sandy West brought Sicilian donkeys to the island">
            1965
          </Fact>{' '}
          Sandy West brought Sicilian donkeys to the island for her{' '}
          <Fact src="toif" note="Sandy West's children, for whom she brought the donkeys">
            4 children
          </Fact>
          . The Foundation's own pages count them differently: its donkey page says{' '}
          <Fact src="toif" note="Foundation donkey page: 2 jacks, 2 jennies, 1 foal from Bull Island, S.C.">
            5 donkeys
          </Fact>{' '}
          came from Bull Island, South Carolina, and its biography of Sandy West says{' '}
          <Fact src="toif" note="Foundation biography of Sandy West: 11 from a South Carolina breeder">
            11 donkeys
          </Fact>
          . She opposed fencing animals, and the donkeys roamed free.
        </p>
      </div>
      <figure className="fig widget wide w-habitat" data-fig="fig-12">
        <header className="fig-head">
          <h3 className="fig-title">In the old field</h3>
          <p className="fig-sub">The donkeys graze, wander and flick their ears. Tap one.</p>
        </header>
        <div className="widget-root" data-widget="habitat" />
        <div className="widget-fallback">
          <p>Donkeys graze in an old field edged by cabbage palms and live oaks.</p>
        </div>
        <footer className="fig-foot">
          <span className="src" data-src="toif">
            Source: The Ossabaw Island Foundation
          </span>
        </footer>
      </figure>
      <div className="stats-wrap wide stats-rule" data-fig="fig-13">
        <div className="stats">
          <div className="stat" data-i="0">
            <p className="stat-label">Arrived</p>
            <p className="stat-value">
              <Fact src="toif" note="Sandy West brought Sicilian donkeys to the island">
                1965
              </Fact>
            </p>
            <p className="stat-delta neutral">for Sandy West's children</p>
          </div>
          <div className="stat" data-i="1">
            <p className="stat-label">Herd at its peak</p>
            <p className="stat-value">
              <Fact src="toif" note="The herd passed this size by the late 1990s">
                100
              </Fact>
              +
            </p>
            <p className="stat-delta neutral">by the late 1990s</p>
          </div>
          <div className="stat" data-i="2">
            <p className="stat-label">On the island now</p>
            <p className="stat-value">
              <Fact src="toif" note="Donkeys left on the island, all sterilized">
                8
              </Fact>
            </p>
            <p className="stat-delta neutral">all sterilized</p>
          </div>
        </div>
      </div>
      <div className="prose col">
        <p>
          The herd passed{' '}
          <Fact src="toif" note="The herd passed this size by the late 1990s">
            100 donkeys
          </Fact>{' '}
          by the late 1990s. A state plan in{' '}
          <Fact src="toif" note="State management plan classes the donkeys as exotic">
            2000
          </Fact>{' '}
          classed the donkeys as exotic animals, and most were caught, tested and adopted on the mainland.
          Genesis Project members from Penn State wrote{' '}
          <Fact src="toif" note="Penn State PhDs on wild donkey behavior by Genesis Project members">
            3 dissertations
          </Fact>{' '}
          on wild donkey behavior here. Today the Foundation invites supporters to adopt one of the remaining
          donkeys on paper.
        </p>
      </div>
    </section>
  );
}
