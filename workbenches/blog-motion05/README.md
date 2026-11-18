# Blog motion and accessibility workbench

BLOG MOTION 05 is an isolated interaction specimen for Ben Ebsworth's research folio. It implements optional, finite feedback around an already committed selection. A native server-rendered list and inspector remain usable if enhancement is absent or fails.

**Status:** implemented source, locally tested models and HTTP responses; browser acceptance remains blocked. No production import, route, global token, graph model, UI SDK integration, article, About or Hiking file is changed. No merge or deployment is part of this change.

Baseline: [`1121edc4ae6ac8de415b5395d8fadc11450fc55f`](https://github.com/castlemilk/benebsworth.com/commit/1121edc4ae6ac8de415b5395d8fadc11450fc55f), verified against remote `master` on 17 November 2026. The checkout was isolated from the dirty Mac worktree. Its untracked knowledge graph and concurrent study/UI SDK files were not copied, reset, staged or inspected here.

A pre-publication remote recheck found [`master` at `92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76`](https://github.com/castlemilk/benebsworth.com/commit/92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76), the artwork-recovery merge. Its nine additions are confined to `docs/design/art04-recovered-originals/`; there is no overlap with this branch. Source evidence and the isolated branch remain pinned to the audited baseline above.

## Run the specimen

From the repository root, using Node 24 as tested:

```bash
node workbenches/blog-motion05/serve.mjs
```

Open `http://127.0.0.1:8775/` in an authorised browser. The server uses only Node's standard library, binds to loopback and serves an explicit file map. It sends no provider requests and stores no user state. An alternative port uses `BLOG_MOTION05_PORT`.

The specimen contains two source-backed article/lab pairs:

| Pair | Article evidence | Lab evidence |
| --- | --- | --- |
| RLC | `content/blog/every-wire-is-an-rlc-circuit/index.mdx` explicitly embeds `LabSide effect="rlc-resonance"` | `lib/lab/registry.ts` declares `rlc-resonance` in `engineering` |
| Seasons | `content/blog/earth-is-closest-to-the-sun-in-winter/index.mdx` explicitly embeds `SpatialLab slug="seasons"` | `lib/lab/spatial/catalog.ts` declares the matching blog slug |

These are interaction fixtures, not the graph owner's schema. Seasons is not presented as a neighbour of RLC. The fixed reading root is separate from inspection and keyboard focus. Topic `ee` and Lab `engineering` stay distinct. The wider verified registries contain 20 topic keys and 9 Lab categories; the six category-art motifs are not a replacement taxonomy. See [SOURCE-AUDIT.md](SOURCE-AUDIT.md).

## What works in this specimen

- Inspect a source; the URL and inspector update synchronously while the same native link remains mounted.
- Filter with a native GET form; inspect a source outside the filter without silently resetting context.
- Follow an original article, lab or exact-revision evidence link using native browser behaviour, including modified activation.
- Use Back/Forward or load an inspection query directly. The adapter does not write scroll restoration, focus or scroll position.
- Open a static local reading page and use browser Back to review restoration in a real browser.
- Exercise waiting, unavailable and valid-empty review states. These are labelled fixtures, not fabricated network observations.
- Follow **Without JavaScript**, **Failed enhancement module** and **Unknown inspection ID** links, preserving the current review state.
- Choose **Always static**, or follow browser reduced-motion and forced-colour preferences. A restrictive preference cancels transient feedback without hiding text or rolling back selection.

First-entry onboarding is intentionally delegated to the existing `InteractiveStudy` owner. No second guide state model is installed. This specimen has no graph camera, orbit, pan, physics, audio, tracking, storage, timeline loop or drag interaction.

## Reusable boundary

`motion.mjs` is the reusable candidate. `fixtures.mjs`, `render.mjs`, `serve.mjs` and `workbench.mjs` are a review harness, not a proposed production router or graph model.

```js
import { createFeedback } from './motion.mjs'

const feedback = createFeedback(componentRoot)

// The owner has already committed selection, text and accessible state.
feedback.play(decorativeSelectionMark, 'selection')

// On route/component teardown:
feedback.dispose()
```

A target must be connected, scoped, explicitly marked `data-motion-decoration` and `aria-hidden="true"`, pointer-transparent, and free of text or interactive/semantic descendants. The visible final state must already exist. `play()` returns `false` when motion is ineligible; that result does not represent a failed user action. `policy()` reports environmental eligibility. See [CONTRACT.md](CONTRACT.md) for timings, integration responsibilities and acceptance conditions.

## Executed verification

The dependency lock and package manifest are unchanged. `npm ci --ignore-scripts --no-audit --no-fund` installed the already locked test dependencies in this isolated checkout.

```bash
node --test workbenches/blog-motion05/test/*.test.mjs
./node_modules/.bin/eslint workbenches/blog-motion05 --max-warnings 0
```

The bounded suite has **40 passing tests, zero failures and zero skips**. It covers the motion lifecycle, semantic-target rejection, rapid replacement, preference changes, hidden tabs, repeated mounts, page lifecycle, URL preservation, explicit missing data, retained focused context across persisted remounts, failed-history native fallback, HTML escaping, source provenance, no-JS HTTP responses and declared colour ratios.

JSDOM tests establish adapter behaviour in a DOM model. They do not establish real focus painting, layout, native history restoration, Back/Forward Cache behaviour or assistive-technology announcements. The HTTP test starts and requests the actual review server within one process. It does not establish that the browser environment can reach that server.

Full-site export and the existing site-wide test matrix were not rerun for this standalone, unimported workbench. Existing repository CI remains a separate gate. No production acceptance claim is made.

## Browser review pack

```bash
./node_modules/.bin/playwright test --config workbenches/blog-motion05/playwright.config.mjs --list
```

The discovery-only command successfully lists **18 cases**. It launches no browser and is not a passing browser run. The prepared suite uses the repository's existing Playwright dependency; no browser package or browser binary was installed for this task.

When an authorised browser environment is available, the reviewer can run:

```bash
./node_modules/.bin/playwright test --config workbenches/blog-motion05/playwright.config.mjs
```

It requires its own server on port 8776 and refuses to reuse an unknown listener. Cases span 1280×900 light, 390×844 light/dark and a 320 CSS-pixel case. It collects first-viewport, complete-sequence, forced-colour, no-JS and missing-data screenshots under the system temporary directory. Inspect the screenshots; passing assertions alone do not establish folio alignment.

**Execution blocker on 17 November 2026:** connected Browser setup timed out. The cloud browser attempt to open `http://127.0.0.1:8775/` returned `net::ERR_CONNECTION_REFUSED`. The subsequent attempt to acquire/reload its error tab was rejected by the browser URL policy. No alternate browser-control mechanism was used. No actual screenshots, narrow rendering, touch/hybrid interaction, screen-reader acceptance or browser restoration pass is claimed.

The manual sequence, source critique and unresolved gates are in [REVIEW.md](REVIEW.md). This blocker is not a request to weaken browser policy.

## Files and provenance

All additions are under `workbenches/blog-motion05/`. The server reads the existing Source Serif 4, Barlow Condensed and Caveat font bytes and the existing `public/topics/custom-v6/ee.svg`; originals are unchanged. Their notices and source hashes belong in the downloadable handoff. No image generation was used in this motion lane. The written design brief is preserved in [DESIGN-PROMPT.md](DESIGN-PROMPT.md).

The [dedicated Space page](https://chatgpt.com/space/page_04a3fe81dcc08191bd76d6efb680aa78) and [five-lane coordination page](https://chatgpt.com/space/page_ba64e3a87b908191b185bdfc76e46171) carry the review handoff. Publishing those contracts does not imply another lane has adopted them.
