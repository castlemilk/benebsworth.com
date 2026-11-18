# Knowledge folio view prototype

An isolated BLOG KG 02 exploration surface for Ben Ebsworth's blog. Open-margin
reading, Source Serif 4, Barlow Condensed labels and a selectable Caveat note
frame a small, source-backed neighbourhood. This is original implemented UI
source, not a generated screenshot or a deployed knowledge route.

## Run locally

From the repository root:

```bash
python3 -m http.server 4872 --bind 127.0.0.1
```

Open `http://127.0.0.1:4872/prototypes/knowledge-folio/`. Serve the repository
root so the existing locally bundled, OFL-licensed editorial fonts resolve.
No installation is needed to run the prototype itself. It imports no Next,
React, graph engine, shared graph model or external font provider.

The sample starts at the proposed Logistic map concept. Inspect an article or
Lab without moving the root; use “Explore from this item” to reroot. Searchable
list and category overview are equal navigation alternatives. The diagram's
six-neighbour cap has a full paginated neighbour-list alternative.

The footer's “Review fixtures and source boundary” disclosure exposes valid
empty, failed, partial, missing-source, long-label and 1,000-item mock cases.
These scenarios are clearly labelled and do not claim real missing content.

## Validate

With the repository's existing lockfile dependencies installed:

```bash
node --test prototypes/knowledge-folio/fixtures.test.mjs prototypes/knowledge-folio/view-state.test.mjs prototypes/knowledge-folio/app.test.mjs
node_modules/.bin/eslint prototypes/knowledge-folio/*.mjs
node_modules/.bin/tsc --noEmit
node_modules/.bin/playwright test --config prototypes/knowledge-folio/playwright.config.mjs
```

The browser config uses a separate local server on port 4873 and refuses to
reuse an unrelated listener. Its default uses the browser installed by the
existing Playwright package. To use an explicitly reviewed system Chromium:

```bash
KG02_CHROMIUM_EXECUTABLE=/usr/bin/chromium node_modules/.bin/playwright test --config prototypes/knowledge-folio/playwright.config.mjs
```

Browser output belongs under `test-results/kg02-review/`, separate from source.
The test report, any successfully captured screenshots and REVIEW.md state what
actually ran. The initial attempt produced no screenshots because Chromium
could not launch. A prepared spec is not a passing browser test. Existing site
validation remains separate:

```bash
npm test -- --maxWorkers=2
npm run build
```

The build command retains the existing prebuild/export/postbuild phases. It
does not add this prototype to a production route or deploy anything.

## Files and ownership

| File | Purpose |
| --- | --- |
| `index.html`, `folio.css`, `app.mjs` | Standalone exploration UI and scoped styling |
| `fixtures.mjs`, `fixtures.test.mjs` | Pinned real source records and disclosed synthetic review scenarios |
| `view-state.mjs`, `view-state.test.mjs` | Presentation-only URL, indexing, search and pagination utilities |
| `app.test.mjs` | Actual UI-module DOM regressions; JSDOM history is emulated, not native-browser proof |
| `view-contract.d.ts`, `CONTRACT.md` | Consumer shape and explicit model/design/artwork/motion handoffs |
| `playwright.config.mjs`, `knowledge.browser.spec.mjs` | Reproducible isolated browser regression suite |
| `REVIEW.md` | Exact execution evidence, design findings and remaining gates |
| `evidence/validation.json` | Check outcomes, runtime and final executable-source hashes |

No existing route, scientific source, asset, URL, package manifest, dependency
lockfile, shared token or model is changed. Do not copy these fixture IDs into
the canonical graph without an explicit model-owner mapping.

## Source and design decisions

The baseline is `1121edc4ae6ac8de415b5395d8fadc11450fc55f`. The source fixture
has ten nodes and sixteen relationships: two proposed concept associations,
four explicit MDX Lab embeds, five exact `chaos` tag associations and five
namespaced category memberships. The design study is isolated. All twenty blog
topics and nine Lab categories are retained.

The actual source links are prominent in the inspector and list. Contextual
evidence identifies each relationship's basis. Node selection does not imply
root movement; shared tags never imply scientific equivalence. The note explains
that interpretive risk rather than decorating a blank margin.

No image-generation prompt or generated artwork was used. The visual study is
the original HTML/CSS composition and code-rendered relationship figure. The
brief implemented here is: “A folio-aligned exploration surface with local
neighbourhood, searchable list, category overview, source-first inspector,
explicit root versus selection, native history, narrow/keyboard recovery and
honest source/missing/large-data states.”

The Mac's existing dirty graph/knowledge route is preserved and was unavailable
for direct inspection in this environment. The exact access limitation and
integration steps are recorded in CONTRACT.md and the Space child page. This
prototype does not claim production adoption or a replacement for that work.
