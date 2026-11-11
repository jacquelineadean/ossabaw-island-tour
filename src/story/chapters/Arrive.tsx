import { Fact } from '@/story/components/Fact';

/** Stop 01: No bridge reaches Ossabaw. */
export function Arrive() {
  return (
    <section className="chapter" id="arrive" data-ch="0">
      <header className="chapter-head col">
        <p className="mark mark-sign" aria-hidden="true">
          <span className="mk-pre">Stop</span>
          <span className="mk-n">01</span>
        </p>
        <p className="kicker">Torrey Landing</p>
        <h2>No bridge reaches Ossabaw</h2>
      </header>
      <div className="prose col dropcap">
        <p>
          Ossabaw is the{' '}
          <Fact src="toif" note="Among Georgia's barrier islands">
            third-largest
          </Fact>{' '}
          of Georgia's barrier islands, about{' '}
          <Fact src="toif" note="North to south">
            10 miles
          </Fact>{' '}
          from north to south and{' '}
          <Fact src="toif" note="At the widest point, marsh included">
            7 miles
          </Fact>{' '}
          across. Only{' '}
          <Fact src="tour" note="Georgia barrier islands reached by road: Tybee, St. Simons, Jekyll">
            3
          </Fact>{' '}
          of the state's barrier islands take cars. Ossabaw is one of the{' '}
          <Fact src="tour" note="Georgia barrier islands with no public road access; 3 others take cars">
            11 islands
          </Fact>{' '}
          that do not: there is no bridge, and every visitor crosses Ossabaw Sound by boat, about{' '}
          <Fact src="toif" note="Foundation day trips by pontoon from Rodney J. Hall Boat Ramp">
            1 hour
          </Fact>{' '}
          from the ramp near Savannah.
        </p>
        <p>
          The boat lands at Torrey Landing on the north end, where a causeway lined with cabbage palms leads
          inland. Dr. Henry Norton Torrey and Nell Ford Torrey planted those palms after they bought the
          island in{' '}
          <Fact src="toif" note="Dr. Henry Norton Torrey and Nell Ford Torrey buy the island">
            1924
          </Fact>
          .
        </p>
      </div>
      <figure className="fig widget wide w-tour" data-fig="fig-1">
        <header className="fig-head">
          <h3 className="fig-title">The map tour</h3>
          <p className="fig-sub">Tap a stop on the map to open its painted scene.</p>
        </header>
        <div className="widget-root" data-widget="tour" />
        <div className="widget-fallback">
          <p>
            A painted map of Ossabaw with nine stops: Torrey Landing, the Main Road, the North End tabby
            cabins, the Torrey West House, the walk from marsh to surf, the hogs, the donkeys, the nesting
            beach and a field journal.
          </p>
        </div>
        <footer className="fig-foot">
          <span className="src" data-src="toif">
            Source: The Ossabaw Island Foundation
          </span>
        </footer>
      </figure>
      <figure className="plate wide" data-fig="fig-2">
        <div className="frame">
          <div className="stage develop" style={{ aspectRatio: '1600/900' }}>
            <img
              className="base"
              src="ossabaw-art/hero.a830cb7b02.webp"
              alt="Watercolor still life on weathered dock boards: an open field journal with a painted map of Ossabaw and notes about a loggerhead hatchling, an indigo-dyed cloth, a block of tabby studded with oyster shells, a palmetto frond, oyster shells, binoculars, a live oak sprig with acorns and a sea turtle nest stake."
              width="1600"
              height="900"
              decoding="async"
            />
            <img
              className="layer"
              src="ossabaw-art/hero--dragonfly.2e7af08fcf.webp"
              alt=""
              aria-hidden="true"
              data-motion="drift"
              data-travel="2.444"
              style={{ left: '73.312%', top: '15.000%', width: '6.500%', height: '14.889%' }}
            />
            <svg className="overlay" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
              <text
                x="461.5"
                y="315.4"
                className="lbl lbl-hand"
                fontSize="30.0"
                textAnchor="start"
                fill="#2b3a2c"
                transform="rotate(-3.0 461.5 315.4)"
              >
                Ossabaw
              </text>
              <text
                x="707.4"
                y="612.9"
                className="lbl lbl-hand"
                fontSize="20.0"
                textAnchor="middle"
                fill="#2f5d73"
                transform="rotate(-51.0 707.4 612.9)"
              >
                Atlantic
              </text>
              <text
                x="648.8"
                y="319.5"
                className="lbl lbl-hand"
                fontSize="16.0"
                textAnchor="start"
                fill="#7a3a28"
                transform="rotate(-3.0 648.8 319.5)"
              >
                the house
              </text>
              <text
                x="789.9"
                y="276.2"
                className="lbl lbl-hand"
                fontSize="30.0"
                textAnchor="start"
                fill="#2b3a2c"
                transform="rotate(-3.0 789.9 276.2)"
              >
                Field notes
              </text>
              <text
                x="1015.9"
                y="576.8"
                className="lbl lbl-hand"
                fontSize="20.0"
                textAnchor="middle"
                fill="#7a3a28"
                transform="rotate(-3.0 1015.9 576.8)"
              >
                loggerhead hatchling
              </text>
              <text
                x="809.5"
                y="649.7"
                className="lbl lbl-hand"
                fontSize="21.0"
                textAnchor="start"
                fill="#2b3a2c"
                transform="rotate(-3.0 809.5 649.7)"
              >
                780 nests on the beaches this summer
              </text>
              <text
                x="614.0"
                y="846.0"
                className="lbl lbl-label"
                fontSize="17.0"
                textAnchor="middle"
                fill="#b8442f"
                transform="rotate(-7.5 614.0 846.0)"
              >
                SEA TURTLE NEST
              </text>
              <text
                x="616.0"
                y="866.0"
                className="lbl lbl-label"
                fontSize="14.0"
                textAnchor="middle"
                fill="#2b231d"
                transform="rotate(-7.5 616.0 866.0)"
              >
                do not disturb
              </text>
            </svg>
            <button
              type="button"
              className="spot side-l"
              data-spot="0"
              style={{ left: '37.50%', top: '52.22%' }}
            >
              <span className="spot-dot" aria-hidden="true">
                1
              </span>
              <span className="spot-label">The island in one page</span>
            </button>
            <button
              type="button"
              className="spot side-l"
              data-spot="1"
              style={{ left: '7.50%', top: '46.67%' }}
            >
              <span className="spot-dot" aria-hidden="true">
                2
              </span>
              <span className="spot-label">Indigo</span>
            </button>
            <button
              type="button"
              className="spot side-l"
              data-spot="2"
              style={{ left: '22.50%', top: '10.00%' }}
            >
              <span className="spot-dot" aria-hidden="true">
                3
              </span>
              <span className="spot-label">A block of tabby</span>
            </button>
            <button
              type="button"
              className="spot side-r"
              data-spot="3"
              style={{ left: '86.25%', top: '28.89%' }}
            >
              <span className="spot-dot" aria-hidden="true">
                4
              </span>
              <span className="spot-label">Cabbage palm</span>
            </button>
            <button
              type="button"
              className="spot side-l"
              data-spot="4"
              style={{ left: '20.62%', top: '80.00%' }}
            >
              <span className="spot-dot" aria-hidden="true">
                5
              </span>
              <span className="spot-label">Oyster shells</span>
            </button>
            <button
              type="button"
              className="spot side-l"
              data-spot="5"
              style={{ left: '47.50%', top: '84.44%' }}
            >
              <span className="spot-dot" aria-hidden="true">
                6
              </span>
              <span className="spot-label">A nest stake</span>
            </button>
            <button
              type="button"
              className="spot side-r"
              data-spot="6"
              style={{ left: '76.25%', top: '53.33%' }}
            >
              <span className="spot-dot" aria-hidden="true">
                7
              </span>
              <span className="spot-label">Binoculars</span>
            </button>
            <button
              type="button"
              className="spot side-r"
              data-spot="7"
              style={{ left: '91.25%', top: '91.11%' }}
            >
              <span className="spot-dot" aria-hidden="true">
                8
              </span>
              <span className="spot-label">Live oak</span>
            </button>
          </div>
        </div>
        <figcaption>
          A naturalist's table on the dock at Torrey Landing. Tap a number to unpack the kit.
        </figcaption>
        <div className="spot-cards" aria-live="polite">
          <div className="spot-card" data-spot="0" hidden>
            <h4>The island in one page</h4>
            <p>
              Ossabaw covers about{' '}
              <Fact src="toif" note="Total area, high ground and tidal marsh together">
                26,000 acres
              </Fact>
              :{' '}
              <Fact src="toif" note="Nearly 9,000 acres of high ground; other sources give up to 11,800">
                9,000 acres
              </Fact>{' '}
              of high ground and{' '}
              <Fact src="toif" note="About 17,000 acres of salt marsh; DNR gives over 16,000">
                17,000 acres
              </Fact>{' '}
              of salt marsh,{' '}
              <Fact src="toif" note="North to south">
                10 miles
              </Fact>{' '}
              long and{' '}
              <Fact src="toif" note="At the widest point, marsh included">
                7 miles
              </Fact>{' '}
              wide.
            </p>
          </div>
          <div className="spot-card" data-spot="1" hidden>
            <h4>Indigo</h4>
            <p>
              Indigo has grown wild by the Club House since colonial times. Enslaved Africans brought the
              knowledge of growing and processing it, and the Foundation teaches indigo dyeing each September.
            </p>
          </div>
          <div className="spot-card" data-spot="2" hidden>
            <h4>A block of tabby</h4>
            <p>
              Lime, sand, water and oyster shell, poured in layers. The North End stop shows the cabins built
              from it.
            </p>
          </div>
          <div className="spot-card" data-spot="3" hidden>
            <h4>Cabbage palm</h4>
            <p>
              One of the few palms native to the Southeast. The Torreys lined the causeway from the landing
              with them after they bought the island.
            </p>
          </div>
          <div className="spot-card" data-spot="4" hidden>
            <h4>Oyster shells</h4>
            <p>
              The salt marsh is a nursery for oysters, blue crabs and fish. Shell heaps left by Indigenous
              people were later mined for tabby.
            </p>
          </div>
          <div className="spot-card" data-spot="5" hidden>
            <h4>A nest stake</h4>
            <p>
              Each summer monitors mark loggerhead nests on the beach. Ossabaw counted{' '}
              <Fact src="seaturtle" note="Loggerhead nests on Ossabaw, 2026, preliminary">
                780 nests
              </Fact>{' '}
              in 2026.
            </p>
          </div>
          <div className="spot-card" data-spot="6" hidden>
            <h4>Binoculars</h4>
            <p>
              Audubon named Ossabaw an Important Bird Area in{' '}
              <Fact src="toif" note="Audubon Important Bird Area designation">
                2007
              </Fact>
              . Wood storks, painted buntings and oystercatchers nest here.
            </p>
          </div>
          <div className="spot-card" data-spot="7" hidden>
            <h4>Live oak</h4>
            <p>
              Georgia's state tree. Enslaved men cut Ossabaw's curved live oak limbs for the hulls of colonial
              ships.
            </p>
          </div>
        </div>
      </figure>
      <div className="prose col">
        <p>
          The State of Georgia owns the island and its Department of Natural Resources manages the land. The
          Ossabaw Island Foundation, founded in{' '}
          <Fact src="toif" note="The Ossabaw Island Foundation is founded">
            1994
          </Fact>
          , keeps the historic buildings and runs the programs; it hosted{' '}
          <Fact src="toif" note="Visits hosted by the Foundation in 2025">
            2,251 visits
          </Fact>{' '}
          in 2025. Visits are limited to study, research and education, always with the Foundation or the DNR.
        </p>
      </div>
    </section>
  );
}
