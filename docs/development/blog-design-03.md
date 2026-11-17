# BLOG DESIGN 03 — review receipt

Owner: editorial design system lane, [ordinary ChatGPT session](https://chatgpt.com/c/6afbdd53-1e64-83ec-bc80-92c719a3e176). Date: 17 November 2026, Australia/Melbourne. Current decision: deliver additive source and reviewable contracts; do not merge or deploy.

## Identity and ownership

- Verified repository: [`castlemilk/benebsworth.com`](https://github.com/castlemilk/benebsworth.com), base `master`.
- Starting and rechecked remote revision: [`1121edc4ae6ac8de415b5395d8fadc11450fc55f`](https://github.com/castlemilk/benebsworth.com/commit/1121edc4ae6ac8de415b5395d8fadc11450fc55f).
- Isolated branch: `codex/blog-design-03-folio-workbench-20261117`. This receipt travels with the candidate commit; the dedicated Space page records its exact pushed SHA and draft PR.
- Space: [Editorial component workbench and graph interface contracts](https://chatgpt.com/space/page_74f855da15cc81919425d848da51513d), child of the blog’s five-lane coordination page under the correct Ben Ebsworth blog Space.
- Read before edits: `DESIGN.md`, `CLAUDE.md`, `docs/design/VISUAL-REVIEW.md`, current MDX/folio/registry source, repository blog-development instructions, canonical backlog, active work, assets and the coordination child. Root `AGENTS.md` is absent at this baseline.
- The concurrent dirty Mac checkout and its unpublished UI SDK, graph and study work were not accessed, reset, staged or copied. Absence from this clean remote clone does not establish their absence elsewhere.
- At the final owner recheck, category-artwork recovery PR [#157](https://github.com/castlemilk/benebsworth.com/pull/157) occupied `docs/design/art04-recovered-originals/`; it does not overlap these owned additions. Existing dependency PRs remain separate work.

## Publication transport

The local Git push returned `could not read Username for https://github.com: No such device or address`. The existing authenticated GitHub connector has repository write access; it is the authorized publication fallback. A connector-created commit may have different author/time metadata from the local commit. The handoff records the published SHA and compares the complete tree hash to the tested local candidate. No credentials, permissions or repository settings are changed.

## Owned additions and outcome

`components/editorial-workbench/`, `app/lab/folio-components/`, `docs/design/blog-design-03/`, this receipt and `e2e/editorial-workbench.spec.ts`.

The unlisted `/lab/folio-components/` route is noindex/nofollow. It provides scoped light/dark/inherited themes, native navigation, controlled search/facets, source-backed entity rows, distinct relationship bases, source citations, inline and native modal inspectors, current-registry category headings, working reading controls and labelled recovery specimens. It reuses the checked-in Gamma button/range, folio annotations and topic artwork without replacing shared styling or the UI SDK.

The source packet retains the article, capacitor-voltage transient Lab and resistor-voltage frequency-response SVG study as distinct records. Authored composition, exact shared tag metadata and a proposed glossary connection are explicitly different. All 20 blog topic entries remain available; the six custom marks are a subset. Actual inventories and reuse decisions are in [REGISTRY-AUDIT.md](../design/blog-design-03/REGISTRY-AUDIT.md).

## Executed verification

| Check | Observed result | Limits |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | Passed, 1,007 packages installed from the existing lockfile. | No dependency/lockfile edits. Local Node 24.22.1; existing CI uses Node 22. |
| `npm test -- --maxWorkers=2` | 232 files passed, 2 skipped; **3,317 tests passed, 5 skipped**. | Full run included the initial 27 workbench tests. Later review regressions were run in the focused suite. |
| `vitest run components/editorial-workbench --maxWorkers=1` | **32 passed** after filter, dialog and print-locator regressions. | Native dialog top-layer methods are mocked. DOM tests are not native-browser acceptance. |
| `tsc --noEmit --incremental false` | Passed after implementation and test corrections. | Includes source/types; not a layout check. |
| Scoped ESLint | Passed for the workbench source, route, focused tests and E2E file. | No source-lint errors in the owned paths. |
| Repository ESLint | 0 errors, 462 warnings. | Existing warnings are not silently relabelled as clean. |
| `node scripts/lint-prose.mjs --changed` | 0 hard findings in owned application source. | Warnings include JSX paragraph heuristics and semicolons; no scientific prose was changed. |
| `npm run build` | Blocked in prebuild: `tsx` CLI could not create its `/tmp/tsx-1000/67.pipe` IPC socket (`listen EPERM`). | No permissions or package-script changes were made. |
| Documented `node --import tsx` pre/main/post sequence | Pre-generation completed. `next build` was terminated with `Killed` during optimized compilation. | Exit 137 alone does not establish the cause. Main export did not finish; postbuild was therefore not run. No full-build pass is claimed. |
| Browser extension | Connection timed out. | No page/render observed. |
| Cloud browser fallback | `ERR_CONNECTION_REFUSED` for the isolated local preview. | No screenshot or browser behavior acceptance. Preview server was stopped. |

The `node --import tsx` form comes from the existing `taskfiles/build.yml`; it avoids the CLI IPC wrapper without changing repository configuration or permissions. Generation did not authorize modifications to original artwork, content or shared registries. Only the narrow owned paths are staged for this lane.

## Review corrections

Independent source review found and corrected: a stale native-close event stealing focus after reopen; missing fallback restoration on unmount; a long title displacing Close in a short inspector; recorded print locators mislabeled missing because they had no URL; and inherited blue Caveat ink in a local dark specimen. New DOM regressions cover the first, second and fourth. The revised header/scroll structure and scoped colour require actual-browser acceptance.

The [visual critique](../design/blog-design-03/VISUAL-STUDIES.md) records all five repository review lenses. It separates read guidance, manual source review, generated concept inspection and unexecuted browser claims.

## Browser cases and retained evidence

`e2e/editorial-workbench.spec.ts` adds six cases to the existing Playwright discovery path. They cover desktop/mobile light and dark, filtering/root/selection retention, native dialog focus/scroll/Escape/reopen, 320px long content and reading controls, reduced motion and forced colours. Ten conditional screenshot names match the existing `gallery-view-*` upload glob; no workflow edit is needed.

They have not been executed in this environment. Existing Site checks may run them for the draft PR. Inspect the exact-head run and its actual artifact before recording a browser pass. Screen-reader behavior, zoom, touch target perception and artistic acceptance remain separate review items.

Original assets are preserved in [docs/design/blog-design-03](../design/blog-design-03/README.md): generated concept, exact prompt, critique and editable component anatomy drawing. The generated concept is marked **concept / not implemented**, with the source hash recorded in its critique and attached Space reference. It is illustrative and supplies no factual support for relationships.

## Integration contracts for the other lanes

- **Graph model/source mapping:** supplies opaque IDs, type/category vocabulary, predicates, source locator/status and evidence. Components do not deduplicate by slug, normalise concepts, add edges, invent confidence or equate shared text with scientific equivalence.
- **Graph views/journeys:** supplies root and selection separately, records and real filter semantics, URL/history, async state and retry. Consume presentation modules without importing fixture data; preserve source visibility when filtering or closing the modal.
- **Category artwork:** existing assets and taxonomy remain authoritative. The selector accepts the actual 20-entry `TOPIC` registry. This lane does not adopt the parallel artwork recovery packet.
- **Motion/accessibility:** native semantic foundation, visible focus rules and static recovery placeholders are present. Validate real dialog containment, short viewport/zoom, reduced-motion and forced-colour presentation against actual captures and assistive technology.
- **UI SDK:** no shared component, registry, token or dependency replacement. `FolioSurface` owns its CSS adapter only; the consuming lane may integrate these contracts through the selected SDK.

## Resume and review

The [Space page](https://chatgpt.com/space/page_74f855da15cc81919425d848da51513d) is the exact-revision handoff. Review its pushed commit/draft PR status, then use the existing Site checks result rather than starting duplicate CI. If CI produces captures, inspect the exact-head artifacts and record scope and findings there. A full export and actual-browser acceptance remain open until those results are observed.

No merge, deployment, new spending, credentials, permission changes or destructive cleanup is part of this delivery. The user’s existing localhost `/knowledge/` observation does not establish a deployed page, and this workbench makes no such claim.

## First remote CI result and bounded correction

[Run 44025753400](https://github.com/castlemilk/benebsworth.com/actions/runs/44025753400), attempt 1, tested published head `28915abdfde858dd84d0a49066708eb8c3baad38`. It passed dependency/setup, 10 hike annotator tests, 34 asset/release script tests, ESLint (0 errors/462 warnings), TypeScript, prose, 3,322 unit tests (5 skipped) and the full 775-page static export including this route. Browser checks finished 162 passed, 1 failed in 7.8 minutes. Release stamping and reviewed-export packing were not reached.

The sole failure was this lane’s synthetic-title assertion in `e2e/editorial-workbench.spec.ts`: scrollHeight minus clientHeight was 3, while the test expected at most 1. Nine workbench captures were produced; the synthetic-title capture after that assertion was not reached. Root downloaded the actual failure artifact, inspected the failure and desktop light/dark/390px inspector images, and retained selected originals in the Space handoff. The artifact IDs were 14303841600 (failure evidence) and 14302859254 (presentation captures), initially expiring 24 November 2026.

The failure image shows real horizontal clipping independent of the font-height metric. The bounded correction changes only this lane’s CSS, source-link typography, test and contracts: explicitly override native dialog max-width, use a zero-minimum grid column and children, and test actual clipping/reachability. It is prepared from the published commit in a new isolated local repair branch, without resetting the prior checkout or touching other owners. The published PR branch remains `codex/blog-design-03-folio-workbench-20261117`. The next exact-head run must validate the correction before the browser gate is marked passed.

An independent visual pass found no further blocking layout defect in the first-run desktop/390px/forced-colour captures. A nonbreaking space keeps the decorative source-link arrow with its preceding word. These observations remain attached to their recorded revision; they do not substitute for corrected-head browser checks.

Before publishing the correction, remote master was rechecked at `92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76`. Its two new commits are the merge of artwork-recovery PR #157 and add only `docs/design/art04-recovered-originals/`. This lane has no path overlap and did not perform that merge. The component/fixture baseline remains `1121edc4`; the PR stays isolated for integration review.
