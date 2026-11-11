# Ossabaw Island Tour

An illustrated, interactive field guide to Ossabaw Island, Georgia. This is the React source for the
claude.ai artifact of the same name.

Stack: React 19, TypeScript, Vite, Tailwind CSS 3.4 and shadcn/ui. Parcel builds the artifact bundle.

## Commands

| Command | Result |
| --- | --- |
| `npm run dev` | Dev server with the page at http://localhost:5173 |
| `npm run build` | Typecheck, then a static build in `dist/` |
| `npm run bundle` | `bundle.html` (one file, code and styles inlined) and `artifact/` (`index.html`, `publish.html` and `ossabaw-art/`) |
| `npm run lint` | Oxlint |

Dependencies were installed with pnpm 9 (`pnpm-lock.yaml`). The scripts above only need npm.

## Layout

| Path | Contents |
| --- | --- |
| `src/story/Story.tsx` | The page: top bar, hero, nine chapters, sources |
| `src/story/chapters/*.tsx` | One component per stop, in reading order |
| `src/story/components/Fact.tsx` | A sourced number with a hover note |
| `src/story/data/chronicle.json` | Figure data: scenes, animal rigs, charts, quiz, sources |
| `src/story/runtime/boot.js` | The page engine: charts, figures, tooltips, progress bar, theme switch |
| `src/story/runtime/widgets/*.js` | The four painted widgets: tour, house, habitat, nest |
| `src/story/story.css` | The story's styles |
| `public/ossabaw-art/` | 120 watercolor images, loaded by relative URL |

## How the page starts

The React components render static markup. `Story` then calls `startStory()` from one effect.
`startStory()` runs `boot()`, which finds every `[data-fig]` element and builds its chart or widget
from `chronicle.json`. The engine is the original page's JavaScript, moved into modules. It edits the
DOM directly and has no teardown, so it runs once per page load and the dev server reloads the page
on every change.

Add state to a chapter only if the engine does not touch that part of the DOM. A re-render would
overwrite the classes and children the engine added.

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
at the same relative paths. `publish.html` has no doctype, `<html>`, `<head>` or `<body>`, because the
Artifact tool adds its own. `artifact/index.html` is the complete document for a local browser.
