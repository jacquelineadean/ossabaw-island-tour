import { Fact } from '@/story/components/Fact';

/** Stop 03: Walls made of oyster shell. */
export function Tabby() {
  return (
    <section className="chapter" id="tabby" data-ch="2">
      <header className="chapter-head col">
        <p className="mark mark-sign" aria-hidden="true">
          <span className="mk-pre">Stop</span>
          <span className="mk-n">03</span>
        </p>
        <p className="kicker">The North End</p>
        <h2>Walls made of oyster shell</h2>
      </header>
      <figure className="plate wide" data-fig="fig-4">
        <div className="frame">
          <div className="stage develop" style={{ aspectRatio: '1600/900' }}>
            <img
              className="base"
              src="ossabaw-art/tabby.158e8763ce.webp"
              alt="Watercolor of a tabby cabin under live oaks: gray shell-studded walls, a wood shingle roof, a central chimney and two doors, one for each family, with two more cabins beyond."
              width="1600"
              height="900"
              decoding="async"
            />
            <svg className="overlay" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" />
          </div>
        </div>
        <figcaption>
          A restored saddlebag cabin at the North End: tabby walls, a central chimney, a door for each family.
        </figcaption>
      </figure>
      <div className="prose col">
        <p>
          Three tabby cabins survive at the North End, of perhaps{' '}
          <Fact src="toif" note="The complex may once have had this many">
            9 buildings
          </Fact>{' '}
          that stood in a row. Enslaved carpenters and masons built them between{' '}
          <Fact src="toif" note="Built by enslaved carpenters and masons">
            1820 to 1840
          </Fact>
          . Each is about{' '}
          <Fact src="toif" note="Each cabin: two one-room homes split by a central chimney">
            400 sq ft
          </Fact>
          : two one-room homes back to back, split by a central chimney, a plan called a saddlebag. Families
          lived in them long after emancipation, and island employees into the 1980s. Two were restored in{' '}
          <Fact src="toif" note="Two cabins restored with a Save America's Treasures grant">
            2005
          </Fact>
          .
        </p>
      </div>
      <figure className="fig diagram stepper wide" data-fig="fig-6">
        <header className="fig-head">
          <h3 className="fig-title">How a tabby wall is made</h3>
          <p className="fig-sub">
            Step through the four stages, from a heap of oyster shell to a cabin wall.
          </p>
        </header>
        <div
          className="dg-wrap"
          role="img"
          aria-label="Four stations: burning oyster shells for lime, mixing lime, sand, water and whole shell, pouring the mix into a wooden form, and the finished wall in layers."
        >
          <svg viewBox="0 0 980 320" className="dg-svg">
            <defs>
              <marker
                id="dg5-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M0 0 L10 5 L0 10 Z" className="head" />
              </marker>
            </defs>
            <rect x="10" y="226" width="960" height="2" className="box soft" />
            <g
              id="dg5-kiln"
              data-tip="Oyster shells came from the shell heaps, or middens, that earlier people left along the creeks."
              tabIndex={0}
              role="button"
            >
              <path
                strokeWidth="1.5"
                d="M70 150 C80 128 92 118 100 98 C108 120 120 128 130 150 Z"
                className="f-stucco s-legacy"
              />
              <path d="M88 150 C92 136 98 130 100 118 C104 132 110 138 114 150 Z" className="f-marsh" />
              <path d="M30 226 C46 186 80 160 100 160 C120 160 154 186 170 226 Z" className="box" />
              <path
                d="M48 206 l10 -6 l4 8 Z M78 190 l12 -4 l2 9 Z M112 196 l12 2 l-4 8 Z M132 210 l10 -2 l0 8 Z M64 216 l12 -2 l-2 8 Z M96 212 l10 -4 l2 8 Z"
                className="line"
              />
              <rect
                strokeWidth="1.2"
                x="44"
                y="226"
                width="112"
                height="12"
                rx="2"
                className="f-tabby s-ink"
              />
              <text x="100" y="70" textAnchor="middle" className="hand">
                heat
              </text>
            </g>
            <g id="dg5-kiln-l">
              <text x="100" y="266" textAnchor="middle" className="title">
                1. Burn
              </text>
              <text x="100" y="286" textAnchor="middle" className="label">
                shells become lime
              </text>
            </g>
            <path d="M188 190 L262 190" markerEnd="url(#dg5-arrow)" className="line accent" />
            <g
              id="dg5-mix"
              data-tip="Recipes vary; one source gives equal parts lime, water, sand, oyster shell and ash."
              tabIndex={0}
              role="button"
            >
              <path d="M290 226 L300 176 L460 176 L470 226 Z" className="box" />
              <path d="M312 176 C318 156 340 150 352 176 Z" className="f-tabby" />
              <path d="M356 176 C364 150 392 148 402 176 Z" className="f-marsh" />
              <path d="M408 176 C410 160 444 158 448 176 Z" className="f-sound" />
              <path
                d="M318 200 l10 -5 l3 8 Z M350 206 l12 -3 l1 8 Z M388 200 l11 2 l-3 8 Z M420 206 l10 -3 l2 8 Z"
                className="line"
              />
              <text x="332" y="146" textAnchor="middle" className="small">
                lime
              </text>
              <text x="380" y="142" textAnchor="middle" className="small">
                sand
              </text>
              <text x="428" y="150" textAnchor="middle" className="small">
                water
              </text>
              <text x="380" y="122" textAnchor="middle" className="small">
                + whole shells
              </text>
            </g>
            <g id="dg5-mix-l">
              <text x="380" y="266" textAnchor="middle" className="title">
                2. Mix
              </text>
              <text x="380" y="286" textAnchor="middle" className="label">
                into a thick paste
              </text>
            </g>
            <path d="M488 190 L562 190" markerEnd="url(#dg5-arrow)" className="line accent" />
            <g
              id="dg5-form"
              data-tip="The wooden boards were held apart by pegs or rods; holes from them still show in old tabby walls."
              tabIndex={0}
              role="button"
            >
              <rect strokeWidth="1.4" x="626" y="176" width="68" height="50" className="f-tabby s-ink" />
              <rect x="604" y="120" width="20" height="106" className="box" />
              <rect x="696" y="120" width="20" height="106" className="box" />
              <rect
                strokeWidth="1.2"
                x="626"
                y="150"
                width="68"
                height="26"
                opacity="0.6"
                className="f-tabby s-ink"
              />
              <path d="M640 72 L686 72 L680 108 L646 108 Z" className="box" />
              <path
                d="M652 108 C654 124 660 136 662 150 M674 108 C672 124 668 136 666 150"
                className="line"
              />
              <text x="760" y="140" className="hand">
                tamp
              </text>
            </g>
            <g id="dg5-form-l">
              <text x="660" y="266" textAnchor="middle" className="title">
                3. Pour
              </text>
              <text x="660" y="286" textAnchor="middle" className="label">
                between wooden boards
              </text>
            </g>
            <path d="M792 190 L846 190" markerEnd="url(#dg5-arrow)" className="line accent" />
            <g
              id="dg5-wall"
              data-tip="Each course set before the boards moved up, so the finished wall shows horizontal pour lines."
              tabIndex={0}
              role="button"
            >
              <rect strokeWidth="1.6" x="866" y="96" width="92" height="130" className="f-tabby s-ink" />
              <path d="M866 128 L958 128 M866 160 L958 160 M866 194 L958 194" className="line" />
              <path
                d="M880 110 l8 -3 l2 6 Z M920 116 l9 -2 l0 6 Z M896 144 l8 2 l-3 6 Z M934 148 l8 -3 l1 6 Z M884 176 l9 -1 l-1 6 Z M922 180 l8 2 l-2 6 Z M900 210 l8 -3 l2 6 Z M940 212 l8 0 l-2 6 Z"
                className="line"
              />
            </g>
            <g id="dg5-wall-l">
              <text x="912" y="266" textAnchor="middle" className="title">
                4. Raise
              </text>
              <text x="912" y="286" textAnchor="middle" className="label">
                course by course
              </text>
            </g>
          </svg>
        </div>
        <p className="dg-hint">Scroll sideways to see the whole diagram.</p>
        <div className="st-panel">
          <ol className="st-list">
            <li className="st" data-i="0">
              <p className="st-title">Burn shells for lime</p>
              <p>Oyster shells are stacked with wood and burned. The heat turns them to quicklime.</p>
            </li>
            <li className="st" data-i="1">
              <p className="st-title">Mix</p>
              <p>Lime, sand, water and whole oyster shells are mixed into a thick paste.</p>
            </li>
            <li className="st" data-i="2">
              <p className="st-title">Pour into a form</p>
              <p>Workers pour the mix between wooden boards and tamp it down, one course at a time.</p>
            </li>
            <li className="st" data-i="3">
              <p className="st-title">Raise the form</p>
              <p>
                When a course sets, the boards move up and the next course goes on. The pour lines stay
                visible in the finished wall.
              </p>
            </li>
          </ol>
          <div className="st-controls" hidden>
            <button type="button" className="st-prev">
              Back
            </button>
            <p className="st-count" aria-live="polite" />
            <button type="button" className="st-next">
              Next
            </button>
          </div>
        </div>
        <footer className="fig-foot">
          <span className="src" data-src="toif">
            Source: The Ossabaw Island Foundation
          </span>
        </footer>
      </figure>
      <figure className="fig table-fig wide">
        <header className="fig-head">
          <h3 className="fig-title">The North End, building by building</h3>
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Building</th>
                <th scope="col">Built</th>
                <th scope="col">Size</th>
                <th scope="col">Today</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tabby cabins</td>
                <td>
                  <Fact src="toif" note="Built by enslaved carpenters and masons">
                    1820 to 1840
                  </Fact>
                </td>
                <td>
                  <Fact src="toif" note="Each cabin: two one-room homes split by a central chimney">
                    400 sq ft
                  </Fact>{' '}
                  each
                </td>
                <td>
                  Two restored in{' '}
                  <Fact src="toif" note="Two cabins restored with a Save America's Treasures grant">
                    2005
                  </Fact>
                </td>
              </tr>
              <tr>
                <td>Tabby smokehouse</td>
                <td>1820s</td>
                <td />
                <td>Stores a tabby form and a curved live oak rib from an 18th-century boat</td>
              </tr>
              <tr>
                <td>Club House</td>
                <td>
                  <Fact src="toif" note="Prefabricated hunting lodge assembled for John M. Waterbury">
                    1887
                  </Fact>
                </td>
                <td>
                  <Fact src="toif" note="Two-story wood frame with a wraparound porch">
                    4,000 sq ft
                  </Fact>
                </td>
                <td>Dormitory lodging for groups</td>
              </tr>
              <tr>
                <td>Boarding House</td>
                <td>
                  <Fact src="toif" note="Built for the superintendent and the kennel man">
                    1918
                  </Fact>
                </td>
                <td>
                  <Fact src="toif" note="Craftsman bungalow, restored 2007 to 2009">
                    3,500 sq ft
                  </Fact>
                </td>
                <td>Housing for staff, researchers and artists</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="fig-note">
          The Foundation has restored or stabilized{' '}
          <Fact src="toif" note="Restored or stabilized by the Foundation since 1998">
            10 buildings
          </Fact>{' '}
          since 1998, at a cost of{' '}
          <Fact src="toif" note="Spent on those buildings since 1998">
            $4.5M
          </Fact>
          .
        </p>
        <footer className="fig-foot">
          <span className="src" data-src="toif">
            Source: The Ossabaw Island Foundation
          </span>
        </footer>
      </figure>
      <aside className="lesson col">
        <img className="lesson-art" src="ossabaw-art/spot-shell.95239101c4.webp" alt="" aria-hidden="true" />
        <p className="lesson-kicker">Shell to wall</p>
        <p>
          The oyster middens Indigenous families left became plantation walls: in the 1800s builders mined the
          old shell heaps for tabby.
        </p>
      </aside>
    </section>
  );
}
