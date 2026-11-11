import { Fact } from '@/story/components/Fact';

/** Title block. */
export function Hero() {
  return (
    <header className="hero">
      <div className="col">
        <p className="kicker">A watercolor field guide to Georgia's first Heritage Preserve</p>
        <h1>Ossabaw</h1>
        <p className="dek">
          Ossabaw Island lies{' '}
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
          of human history. Walk it stop by stop, step inside the pink house Sandy West called home, and meet
          the hogs, donkeys and loggerheads that live there.
        </p>
        <p className="byline">
          <span>An illustrated field guide; every painting is original</span>
          <span>Facts from the Ossabaw Island Foundation, Georgia DNR and the sources below</span>
          <span>Inspired by the Foundation's virtual tour</span>
        </p>
      </div>
    </header>
  );
}
