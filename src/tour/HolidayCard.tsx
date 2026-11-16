import { useEffect, useRef, useState } from 'react';
import { Animals } from './Animals';
import { FOUNDATION_URL } from './data';

/**
 * The 2026 holiday card from the "Season's Greetings from Ossabaw Island" design: a painted map
 * on the front, a postcard message on the back. The front's animals move: the painting under them
 * has them painted out, and <Animals> lays the cut-out animals back on top. The back is rebuilt in
 * HTML from the design, at its 672 by 480 layout, and scales with the card's width.
 */

const FRONT_ALT =
  "Storybook holiday map of Ossabaw Island under the words Season's Greetings, Ossabaw Island. " +
  'A string of lights runs down the Main Road from Torrey Landing to the South End, past the Torrey ' +
  'West House with a wreath, tabby cabins and a decorated tree. Donkeys, one in a Santa hat, graze ' +
  'near Middle Place, hogs root near Goose Pond, egrets stand in the marsh, a boat brings a tree to ' +
  'Torrey Landing, and offshore a right whale mother in a Santa hat swims with her calf beside a sea turtle.';

/** The card's message, as written on the back. */
const FACT =
  'Ossabaw Island, a state Heritage Preserve since 1978: some 26,000 acres of salt marsh, maritime forest ' +
  'and beach, about ten miles long.';
const LETTER = [
  'Dear friend,',
  'The marsh has gone gold for winter, the live oaks wear their moss like tinsel, and the donkeys have ' +
    'dressed for the season. Thank you for helping reveal the voices and mystery of Ossabaw this year.',
  'Wishing you a joyful holiday and a peaceful new year.',
];
const SIGNED = ['With gratitude,', 'The Ossabaw Island Foundation'];

/** Lines of text with line breaks between them. */
function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ));
}

const FONTS: [string, string, FontFaceDescriptors?][] = [
  ['Billy Tabby', 'billy-tabby.woff2'],
  ['Billy Diner', 'billy-diner.woff2'],
  ['Billy Drizzle', 'billy-drizzle.woff2'],
  ['Billy Postcard', 'billy-postcard-italic.woff2', { style: 'italic' }],
];
let fontsAdded = false;

/**
 * Registers the card's four fonts. Relative URLs resolve against the page, as the paintings do,
 * so the card works from any folder. A browser fetches each font only when the back is drawn.
 */
function addCardFonts() {
  if (fontsAdded || typeof FontFace === 'undefined' || !document.fonts) return;
  fontsAdded = true;
  for (const [family, file, desc] of FONTS) {
    const url = new URL(`holiday/fonts/${file}`, document.baseURI).href;
    document.fonts.add(new FontFace(family, `url(${url}) format("woff2")`, desc));
  }
}

function Star() {
  return (
    <svg className="pc-star" viewBox="-10 -10 20 20" aria-hidden="true">
      <path
        d="M0,-9 L2.4,-3.2 L8.6,-2.8 L3.8,1.2 L5.3,7.3 L0,4 L-5.3,7.3 L-3.8,1.2 L-8.6,-2.8 L-2.4,-3.2 Z"
        fill="#d9a441"
        stroke="#23261f"
        strokeWidth="1.2"
      />
    </svg>
  );
}

/**
 * The card, front or back; tapping it or its button turns it over. `bare` shows the card alone, as
 * the dialog does: its button shows only when a keyboard reaches it, and the readable copy is left out.
 */
export function Postcard({ label = 'Holiday card', bare = false }: { label?: string; bare?: boolean }) {
  const [back, setBack] = useState(false);
  useEffect(addCardFonts, []);
  return (
    <div className={`postcard-wrap${bare ? ' is-bare' : ''}`}>
      <div
        className={`postcard${back ? ' is-back' : ''}`}
        role="group"
        aria-roledescription="postcard"
        aria-label={`${label}, ${back ? 'back' : 'front'}`}
        onClick={() => setBack(!back)}
      >
        <div className="pc-inner">
          <div className="pc-face pc-front" aria-hidden={back}>
            <img
              src="holiday/card-plate-1600.webp"
              srcSet="holiday/card-plate-700.webp 700w, holiday/card-plate-1600.webp 1600w"
              sizes={bare ? '(max-width: 1144px) 100vw, 1120px' : '(max-width: 760px) 92vw, 720px'}
              width="1600"
              height="1143"
              alt={FRONT_ALT}
              draggable={false}
            />
            <Animals />
          </div>
          <div className="pc-face pc-back" aria-hidden={!back}>
            <span className="pc-frame" aria-hidden="true" />
            <div className="pc-head">
              <p className="pc-title">
                <Star />
                <span>POST CARD</span>
                <Star />
              </p>
              <p className="pc-greet">Season&#8217;s greetings from Ossabaw Island</p>
            </div>
            <div className="pc-body">
              <div className="pc-msg">
                <p className="pc-fact">{FACT}</p>
                <p className="pc-hand">
                  <Lines lines={LETTER} />
                </p>
                <p className="pc-hand">
                  <Lines lines={SIGNED} />
                </p>
              </div>
              <div className="pc-addr">
                <div className="pc-stamp-row">
                  <img
                    className="pc-stamp"
                    src="holiday/stamp.webp"
                    width="1068"
                    height="536"
                    alt="A stamp painted with the Torrey West House, cancelled with an Ossabaw Island postmark dated December 2026"
                    draggable={false}
                  />
                </div>
                <div className="pc-to" aria-hidden="true">
                  <span>To</span>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <p className="pc-foot">
                  <a
                    className="pc-site"
                    href={FOUNDATION_URL}
                    target="_blank"
                    rel="noopener"
                    // Keyboard focus reaches the link only while the back shows.
                    tabIndex={back ? undefined : -1}
                    // A tap on the link opens the site and leaves the card as it is.
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    ossabawisland.org<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <span className="pc-credit">Map data &#169; OpenStreetMap contributors</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className={`pc-turn${bare ? ' pc-turn-quiet' : ''}`}
        aria-pressed={back}
        onClick={() => setBack(!back)}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 8 A6.5 6.5 0 0 1 16 6 M16 6 L16.4 2 M16 6 L12 6.2 M16 12 A6.5 6.5 0 0 1 4 14 M4 14 L3.6 18 M4 14 L8 13.8" />
        </svg>
        {back ? 'Show the painted front' : 'Turn the card over'}
      </button>
      {back && !bare && (
        // The handwriting is small on a narrow card; this copy shows only there. Screen readers
        // already read the back of the card, so it is hidden from them.
        <div className="pc-read" aria-hidden="true">
          <p className="pc-read-fact">{FACT}</p>
          <p>
            <Lines lines={LETTER} />
          </p>
          <p>
            <Lines lines={SIGNED} />
          </p>
        </div>
      )}
    </div>
  );
}

/** A small tilted copy of the card that opens it full size. */
export function CardTeaser({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="card-teaser" onClick={onOpen}>
      <span className="ct-card">
        <img src="holiday/card-front-700.webp" width="700" height="500" alt="" draggable={false} />
      </span>
      <span className="ct-text">
        <span className="ct-kicker">Season&#8217;s greetings</span>
        <span className="ct-title">Open the holiday card</span>
      </span>
    </button>
  );
}

/**
 * The card alone in a modal dialog: the card fills the dialog, and the close button sits outside
 * its corner. Escape, the close button or a tap beside the card closes it.
 */
export function CardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Focus starts on the dialog, so no focus ring circles the close button on open.
      // The first Tab reaches the close button.
      d.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="card-dialog"
      aria-label="Season’s greetings from Ossabaw Island"
      tabIndex={-1}
      onClose={onClose}
      onClick={(ev) => {
        if (ev.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <button type="button" className="cd-close" onClick={onClose} aria-label="Close the card">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5 L15 15 M15 5 L5 15" />
            </svg>
          </button>
          <Postcard bare />
        </>
      )}
    </dialog>
  );
}
