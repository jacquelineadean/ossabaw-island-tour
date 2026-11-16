# Ossabaw Island Tour

A painted virtual tour of Ossabaw Island, Georgia. Readers cross by boat, then walk the island in nine
stops on a painted map. This is the React source for the claude.ai artifact of the same name.

Stack: React 19, TypeScript, Vite, Tailwind CSS 3.4 and shadcn/ui. Parcel builds the artifact bundle.

## Commands

| Command | Result |
| --- | --- |
| `npm run dev` | Dev server with the page at http://localhost:5173 |
| `npm run build` | Typecheck, then a static build in `dist/` |
| `npm run bundle` | `bundle.html` (one file, code and styles inlined) and `artifact/` (`index.html`, `publish.html`, `ossabaw-art/` and `holiday/`) |
| `npm run lint` | Oxlint |

Dependencies were installed with pnpm 9 (`pnpm-lock.yaml`). The scripts above only need npm.

## Layout

| Path | Contents |
| --- | --- |
| `src/tour/TourApp.tsx` | The site: departure dock, nine stops and the sources, one screen at a time |
| `src/tour/MapStage.tsx` | The painted map and its camera: the whole island, or a close view of one stop |
| `src/tour/TourBar.tsx` | The top bar: the trail of stops, the holiday switch and the theme button |
| `src/tour/Welcome.tsx`, `WalkOn.tsx` | The departure dock and route list; the way on at the end of each stop, the passport |
| `src/tour/HolidayCard.tsx`, `holiday.ts` | The holiday card and the seasonal holiday theme |
| `src/tour/tour.json` | Stops (map position, icon, intro), map layers and labels, place pins, species |
| `src/tour/tour.css` | The tour's styles |
| `src/story/chapters/*.tsx` | One component per stop, in tour order |
| `src/story/components/Fact.tsx` | A sourced number with a hover note |
| `src/story/data/chronicle.json` | Figure data: scenes, animal rigs, charts, quiz, sources |
| `src/story/runtime/boot.js` | The page engine: charts, figures, tooltips, theme switch |
| `src/story/runtime/widgets/*.js` | The three painted widgets: house, habitat, nest |
| `src/story/story.css` | The story's styles |
| `public/ossabaw-art/` | Watercolor images, loaded by relative URL |
| `public/holiday/` | The holiday card's front, stamp and four fonts, the card's map and its animal pieces |
| `scripts/map-surround.py` | Paints the soft surround that carries each map's edge colors past the painting |

## How the tour works

The hash names the screen: `#/` is the departure dock, `#/<stop id>` a stop (`#/arrive` to
`#/journal`) and `#/sources` the source list. Anchors from the old one-page guide (`#arrive`,
`#sources`) still land on the right screen. Left and right arrow keys walk the tour.

Every stop is in the DOM from the first render, and the stops not on screen are `hidden`. The map
stage sits above them. On the dock it frames the whole island; on a stop it closes in on that stop,
and moving to the next stop walks a boot along the road while the view follows. "Whole island" opens
the full map from any stop.

"Whole island" fills the window below the top bar. The zoom grows until the painting covers the
stage, but stops where a stop, label or pin would leave the screen. Where the painting is still
narrower than the stage, its west edge stays at the left and the sea runs on to the right edge. Past
the painting's edges the stage shows a surround image (`map--surround.*.webp`, `holiday/map-surround.webp`):
the painting's edge colors carried outward and blurred, made by `scripts/map-surround.py` (Python 3
with numpy and Pillow). Run it again after changing a map image, then copy the printed file name and
east-edge color into `surround` and `sea` in `tour.json`. On wide screens the island view letters
"Ossabaw Island" and a sub-header on the sea at the right, in the dock title's font; it hides where it
would cover a stop, pin or place name.

The animals move like the boat on the painted map. With the holiday theme on, the card's whales and
sea turtle swim across open water, fading in and out (`swim` in `src/tour/Animals.tsx`), while the
donkeys nod, the hogs root and the egrets sway in place. With it off, the gulls fly across the sea.

The browser remembers three things in `localStorage`: the stops visited (`ossabaw-tour-visited`),
the last stop (`ossabaw-tour-last`, for "Continue the tour") and the holiday choice
(`ossabaw-holiday`). The habitat widgets write spotted animals to `ossabaw-journal`; the passport at
the last stop reads them.

## How the page starts

The React components render static markup. `TourApp` then calls `startStory()` from one effect.
`startStory()` runs `boot()`, which finds every `[data-fig]` element and builds its chart or widget
from `chronicle.json`. The engine is the original page's JavaScript, moved into modules. It edits the
DOM directly and has no teardown, so it runs once per page load and the dev server reloads the page
on every change.

The chapters are wrapped in `memo()`, so React renders them once and the engine's changes stay. Add
state to a chapter only if the engine does not touch that part of the DOM. A re-render would
overwrite the classes and children the engine added. Widgets in a stop that was hidden lay themselves
out again on the `resize` event the tour sends when it shows the stop.

## Holiday theme

The holiday theme is on by default until `HOLIDAY_ENDS` in `src/tour/holiday.ts` (7 January 2027).
From that date the switch, the decorations and the card are gone without a code change. Move the date
to change the season.

Readers turn it off with the Holiday switch in the top bar or the link in the footer; the choice is
saved. The theme sets `<html data-holiday="on">`, and every holiday style keys off that attribute. It
adds lights along the top bar and along the road on the map, a Santa hat on the donkeys, a wreath on
the Torrey West House, holly on the stop signs, and the holiday card: a teaser on the departure dock
that opens it full size, and a postcard at the last stop. The card turns over to show its message.

The card comes from the "Season's Greetings from Ossabaw Island" design. Its back is rebuilt in HTML
and uses the design's four fonts, from `public/holiday/fonts/`, which load only when the card is
shown. The card's map art credits OpenStreetMap contributors on the card's back and in the footer.

## Tailwind and shadcn/ui

Tailwind's preflight reset is off, because the story styles bare elements itself. Tailwind utilities
work anywhere. A shadcn/ui component needs an ancestor with class `ui`, which applies the reset those
components expect (see `src/index.css`). The `dark:` variant follows `<html data-theme="dark">`,
which the theme button sets.

## GitHub Pages

Live site: https://jacquelineadean.github.io/ossabaw-island-tour/

`.github/workflows/pages.yml` runs on every push to `main`. It installs with pnpm 9, runs
`pnpm run build` and deploys `dist/`. Vite's `base` is `./`, so the build works under the
`/ossabaw-island-tour/` path without changes.

## Publishing the artifact

Run `npm run bundle`, then publish `artifact/publish.html` with the files in `artifact/ossabaw-art/`
and `artifact/holiday/` at the same relative paths. `publish.html` has no doctype, `<html>`, `<head>` or `<body>`, because the
Artifact tool adds its own. `artifact/index.html` is the complete document for a local browser.
