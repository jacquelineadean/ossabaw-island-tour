import type { ReactNode } from 'react';

type FactProps = {
  /** Key of the source in chronicle.json `sources`; the tooltip names it. */
  src: string;
  /** What the number measures; shown in the tooltip. */
  note: string;
  children: ReactNode;
};

/** A sourced number or date. Hover or focus shows its note and source. */
export function Fact({ src, note, children }: FactProps) {
  return (
    <span className="fact" tabIndex={0} data-src={src} data-note={note}>
      {children}
    </span>
  );
}
