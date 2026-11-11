import { Fact } from '@/story/components/Fact';

/** Stop 05: From salt marsh to surf in one walk. */
export function Habitats() {
  return (
    <section className="chapter" id="habitats" data-ch="4">
      <header className="chapter-head col">
        <p className="mark mark-sign" aria-hidden="true">
          <span className="mk-pre">Stop</span>
          <span className="mk-n">05</span>
        </p>
        <p className="kicker">Marsh to sea</p>
        <h2>From salt marsh to surf in one walk</h2>
      </header>
      <div className="prose col">
        <p>
          Ossabaw is old in the middle and young at the edge. Its central high ground is{' '}
          <Fact src="toif" note="Age of the Pleistocene high ground in the island's center">
            40,000 to 50,000 years
          </Fact>{' '}
          old; the dune ridges on the Atlantic side are younger than{' '}
          <Fact src="toif" note="The eastern dune ridges are younger than this">
            4,000 years
          </Fact>
          . Maritime forest covers about{' '}
          <Fact src="toif" note="Share of the island in maritime forest">
            36%
          </Fact>{' '}
          of the island, and salt marsh covers about{' '}
          <Fact src="toif" note="Salt marsh as a share of the whole island">
            65%
          </Fact>
          , flooded and drained by the tide twice a day.
        </p>
        <p>
          Walk west to east across the painting below. Drag it, or jump with the habitat buttons. Every animal
          in it is one you could meet on Ossabaw; tap one to open its field card.
        </p>
      </div>
      <figure className="fig widget wide w-habitat" data-fig="fig-9">
        <header className="fig-head">
          <h3 className="fig-title">Walk across the island</h3>
          <p className="fig-sub">
            Salt marsh, a freshwater pond, maritime forest, an old field, dunes and the beach. Slide the tide
            to flood the marsh.
          </p>
        </header>
        <div className="widget-root" data-widget="habitat" />
        <div className="widget-fallback">
          <p>
            A painted walk across Ossabaw from the salt marsh and tidal creek, past a freshwater pond, through
            the maritime forest and an old field, over the dunes to the beach.
          </p>
        </div>
        <footer className="fig-foot">
          <span className="src" data-src="toif">
            Source: The Ossabaw Island Foundation
          </span>
        </footer>
      </figure>
      <div className="prose col">
        <p>
          In 1924,{' '}
          <Fact src="toif" note="Artesian-fed ponds in 1924; wells stopped flowing in the 1960s">
            15 ponds
          </Fact>{' '}
          artesian-fed ponds watered the island's cattle, ducks and nesting birds. The wells stopped flowing
          in the 1960s, when coastal industry drew down the aquifer, and the ponds now fill only with rain.
          Audubon named Ossabaw an Important Bird Area in{' '}
          <Fact src="toif" note="Audubon Important Bird Area designation">
            2007
          </Fact>
          .
        </p>
      </div>
    </section>
  );
}
