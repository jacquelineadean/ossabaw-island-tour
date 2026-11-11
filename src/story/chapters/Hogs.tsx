import { Fact } from '@/story/components/Fact';

/** Stop 06: Hogs that came on Spanish ships. */
export function Hogs() {
  return (
    <section className="chapter" id="hogs" data-ch="5">
      <header className="chapter-head col">
        <p className="mark mark-sign" aria-hidden="true">
          <span className="mk-pre">Stop</span>
          <span className="mk-n">06</span>
        </p>
        <p className="kicker">Ossabaw Island hogs</p>
        <h2>Hogs that came on Spanish ships</h2>
      </header>
      <div className="prose col">
        <p>
          Spanish explorers probably turned pigs loose on the Georgia coast in the 1500s to stock food for
          their missions. Their descendants still root through Ossabaw's woods. DNA from island hogs matches
          pigs from the Canary Islands, a Spanish waypoint to the Americas.
        </p>
        <p>
          Island life made them small: adults weigh{' '}
          <Fact src="lc" note="Adult weight on the island, low end">
            100 lb
          </Fact>{' '}
          to{' '}
          <Fact src="lc" note="Adult weight on the island, high end">
            200 lb
          </Fact>
          . In winter they gorge on acorns and hickory nuts and put on{' '}
          <Fact src="toif" note="Body weight added as fat on winter acorns and hickory nuts, low end">
            30%
          </Fact>{' '}
          to{' '}
          <Fact src="toif" note="Body weight added as fat in winter, high end">
            40%
          </Fact>{' '}
          of their body weight as fat, then live on it through lean summers. That thrift makes them a research
          model for metabolic syndrome and type II diabetes.
        </p>
      </div>
      <figure className="fig widget wide w-habitat" data-fig="fig-10">
        <header className="fig-head">
          <h3 className="fig-title">Under the live oaks</h3>
          <p className="fig-sub">Black, spotted and red hogs rooting for acorns. Tap one.</p>
        </header>
        <div className="widget-root" data-widget="habitat" />
        <div className="widget-fallback">
          <p>Hogs and piglets root for acorns among the palmettos under moss-hung live oaks.</p>
        </div>
        <footer className="fig-foot">
          <span className="src" data-src="toif">
            Source: The Ossabaw Island Foundation
          </span>
        </footer>
      </figure>
      <div className="prose col">
        <p>
          The same hogs dig up loggerhead nests and eat the eggs of terrapins, snakes and ground-nesting
          birds. In{' '}
          <Fact src="usda" note="DNR wild pig removal program begins">
            2001
          </Fact>{' '}
          the DNR began removing them,{' '}
          <Fact src="usda" note="Hogs removed a year, low end (2011 report)">
            2,500 hogs
          </Fact>{' '}
          to{' '}
          <Fact src="usda" note="Hogs removed a year, high end (2011 report)">
            3,000 hogs
          </Fact>{' '}
          a year by one report. The share of turtle nests lost each year fell from over{' '}
          <Fact src="usda" note="Turtle nests lost a year before removal: over 30%">
            30%
          </Fact>{' '}
          to under{' '}
          <Fact src="usda" note="Turtle nests lost a year after removal: under 5%">
            5%
          </Fact>
          .
        </p>
      </div>
      <div className="stats-wrap wide stats-rule" data-fig="fig-11">
        <h3 className="stats-title">Turtle nests lost each year on Ossabaw</h3>
        <p className="stats-sub">Share of loggerhead nests destroyed, mostly by hogs and raccoons</p>
        <div className="stats">
          <div className="stat" data-i="0">
            <p className="stat-label">Before hog removal</p>
            <p className="stat-value">
              over{' '}
              <Fact src="usda" note="Turtle nests lost a year before removal: over 30%">
                30%
              </Fact>
            </p>
            <p className="stat-delta bad">of nests lost</p>
          </div>
          <div className="stat" data-i="1">
            <p className="stat-label">After removal began</p>
            <p className="stat-value">
              under{' '}
              <Fact src="usda" note="Turtle nests lost a year after removal: under 5%">
                5%
              </Fact>
            </p>
            <p className="stat-delta good">of nests lost</p>
          </div>
          <div className="stat" data-i="2">
            <p className="stat-label">Hogs removed a year</p>
            <p className="stat-value">
              <Fact src="usda" note="Hogs removed a year, low end (2011 report)">
                2,500
              </Fact>{' '}
              to{' '}
              <Fact src="usda" note="Hogs removed a year, high end (2011 report)">
                3,000
              </Fact>
            </p>
            <p className="stat-delta neutral">by a 2011 report</p>
          </div>
        </div>
      </div>
      <aside className="lesson col">
        <img className="lesson-art" src="ossabaw-art/spot-acorn.62d1562318.webp" alt="" aria-hidden="true" />
        <p className="lesson-kicker">Heritage and harm</p>
        <p>
          A rare breed can also be a threat. The Livestock Conservancy lists the Ossabaw hog as{' '}
          <Fact src="lc" note="Livestock Conservancy priority list status">
            Critical
          </Fact>
          ; the breed survives at historic farms such as Mount Vernon and Colonial Williamsburg, while removal
          on the island protects its turtles.
        </p>
      </aside>
    </section>
  );
}
