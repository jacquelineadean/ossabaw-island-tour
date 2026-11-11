/** Source list and colophon. Fact tooltips link here by #src-… ids. */
export function Sources() {
  return (
    <footer className="sources col" id="sources">
      <h2 className="sources-title">Sources and method</h2>
      <ul className="src-list">
        <li id="src-toif">
          <span className="src-label">The Ossabaw Island Foundation</span>
          <span className="as-of">as of Oct 2026</span>
          <span className="src-detail">
            ossabawisland.org: island overview, ecosystem, built environment, history timeline, Eleanor Torrey
            West, pigs, donkeys, sea turtles, birds, visiting.
          </span>
        </li>
        <li id="src-tour">
          <span className="src-label">Ossabaw Island Tour</span>
          <span className="as-of">as of Oct 2026</span>
          <span className="src-detail">
            The Foundation's nine-stop virtual tour, ossabawisland.opentour.site, published 10 Sep 2026.
          </span>
        </li>
        <li id="src-dnr">
          <span className="src-label">Georgia DNR Wildlife Resources Division</span>
          <span className="as-of">as of Oct 2026</span>
          <span className="src-detail">
            Ossabaw Island Wildlife Management Area and the Georgia sea turtle program, georgiawildlife.com.
          </span>
        </li>
        <li id="src-seaturtle">
          <span className="src-label">seaturtle.org nest database</span>
          <span className="as-of">as of Oct 2026</span>
          <span className="src-detail">
            Georgia loggerhead nest counts by beach, 2019 to 2026; preliminary.
          </span>
        </li>
        <li id="src-nge">
          <span className="src-label">New Georgia Encyclopedia</span>
          <span className="as-of">as of Oct 2026</span>
          <span className="src-detail">Entries on Ossabaw Island and on tabby.</span>
        </li>
        <li id="src-usda">
          <span className="src-label">USDA Wildlife Services report</span>
          <span className="as-of">as of 2011</span>
          <span className="src-detail">
            Wild pig removal on Ossabaw Island, 2011 (digitalcommons.unl.edu).
          </span>
        </li>
        <li id="src-lc">
          <span className="src-label">The Livestock Conservancy</span>
          <span className="as-of">as of Oct 2026</span>
          <span className="src-detail">Ossabaw Island hog breed profile and priority list.</span>
        </li>
        <li id="src-current">
          <span className="src-label">The Current (Georgia)</span>
          <span className="as-of">as of Jun 2024</span>
          <span className="src-detail">Georgia to rehab Ossabaw mansion, 11 June 2024.</span>
        </li>
        <li id="src-wtoc">
          <span className="src-label">WTOC</span>
          <span className="as-of">as of Oct 2026</span>
          <span className="src-detail">Report on the Torrey West House lecture, 13 October 2026.</span>
        </li>
        <li id="src-gear">
          <span className="src-label">Gear Patrol</span>
          <span className="as-of">as of Oct 2016</span>
          <span className="src-detail">The battle for the Ossabaw Island pig, 31 October 2016.</span>
        </li>
        <li id="src-gpb">
          <span className="src-label">Georgia Public Broadcasting</span>
          <span className="as-of">as of Aug 2022</span>
          <span className="src-detail">Georgia loggerhead nest numbers, 5 August 2022.</span>
        </li>
      </ul>
      <p className="colophon">
        Every illustration on this page was drawn for it as SVG and painted in ink and watercolor by code; no
        photographs were used. The animals are painted in jointed parts (legs, heads, tails, flippers) so they
        can walk, graze, root and crawl. The page follows the stops of the Ossabaw Island Foundation's virtual
        tour.
      </p>
      <p className="colophon">
        Facts come from the Foundation, Georgia DNR, the tour and the other sources listed; hover a number to
        see its source. Loggerhead counts for 2019 to 2026 are preliminary. Where sources disagree (the first
        donkey herd, the beach length, the acreage of high ground), the page says so or uses the Foundation's
        figure. The house tour's rooms are painted from tour descriptions and photographs; their arrangement
        is not a floor plan.
      </p>
    </footer>
  );
}
