# Grounded discovery checkpoint — 14 November 2026

## Scope and source

Owner: the Grounded Forms release maintainer. Branch: `feat/grounded-discovery-recovery-20261114`.
Base: `e9e1027426480aa4154eeeb384788b2e2462d390`.
Implementation candidate before this test/documentation-only follow-up:
`fb86d49837295f1092fdea60bf5063856568683d`, tree
`8216fa73f8b2f5dc5c8a06adc4a444dc119c6309`.
This checkpoint does not establish a remote branch, PR, base-branch name or deployed revision.

The candidate replaces eager catalogue serialization with 24 initial display cards,
complete facets, an on-demand curated search manifest and bounded card partitions.
Search ranking, URL/history behavior, retry and stale-result handling remain covered
by the component/data tests. [The partition contract](../grounded/discovery-partitions.md)
describes the implementation. The 70,000-byte gate applies only to serialized discovery
bootstrap data, not the whole application HTML. Catalogue records, artwork masters,
source transport, scientific notes and all 105 detail routes remain unchanged.

This follow-up changes only `e2e/grounded-artwork.spec.ts`, that contract document and
this checkpoint. It preserves JSON failure attachments, emits transfer receipts to CI
stdout and renames the two discovery screenshots to the existing retained pattern.
There are no workflow, dependency, production export or artwork changes.

## Local checks and reproduction

Implementation candidate results:

- `node_modules/.bin/vitest run --maxWorkers=1`: 230 files passed, 2 skipped;
  3,240 tests passed, 5 skipped.
- `node_modules/.bin/tsc --noEmit`: passed.
- `node_modules/.bin/eslint .`: 0 errors, 462 inherited warnings.
- The complete pre/build/post export passed: 724 pages, all 105 discovery records
  and all 945 original assets verified. The equivalent local build used
  `node --import tsx` for the benchmark generator after the `tsx` CLI failed with
  IPC `EPERM` before Next ran. Temporary `experimental.cpus: 2` bounded the build;
  the original config was restored. This is an equivalent staged build, not a
  claim that an unmodified `npm run build` invocation passed locally.

Reproduce the normal pipeline with `npm run build` or `task build`. For the same
local fallback, temporarily set `experimental.cpus: 2`, run the following sequence,
then restore the config. Do not overlap another build:

```sh
node scripts/prepare-grounded-artwork.mjs
node --import tsx scripts/prepare-grounded-discovery.mts
node scripts/gen-md-siblings.mjs
node --import tsx scripts/gen-benchmark-outputs.mjs
node scripts/gen-harness-eval.mjs
node_modules/.bin/next build
npm run postbuild
```

Follow-up checks: `node_modules/.bin/tsc --noEmit` passed;
`node_modules/.bin/eslint e2e/grounded-artwork.spec.ts` passed with no warnings;
`node_modules/.bin/playwright test e2e/grounded-artwork.spec.ts --list` compiled and
listed 18 tests in one file. Listing does not execute browsers.
`node scripts/lint-prose.mjs --changed --ci` passed with no selected prose files:
the manifest excludes specs and does not include development documentation.
Documentation received manual prose review. No redundant full build or unit run
was performed for this test/documentation-only follow-up.

## Measurements and boundaries

All numbers below are bytes, not browser transfer claims.

- Current local export: collection HTML 81,400; standalone Flight `index.txt`
  32,553; embedded collection JSON-LD 3,672; serialized bootstrap 8,851.
  JSON-LD and inline Flight are already within HTML. Do not sum these as traffic.
- Historical baseline file observations before recovery: HTML 167,928;
  standalone Flight 103,530; JSON-LD 13,965. Those baseline artifacts are not
  currently available for byte-level reinspection.
- Current discovery files: 6 files, 44,970 total bytes, largest card partition
  5,565 bytes. All 945 original assets total 26,816,327 bytes and retain their
  catalogue sizes/hashes. The first 24 light thumbnail bodies total 555,366 bytes.
  This is potential body content, not initial viewport or wire transfer.
- Diverse 1,000-work data fixture: bootstrap 22,762; 43 on-demand files totaling
  397,773; largest partition 5,608. Complete facets and manifest still grow.
- Separate component-render fixture: 105 works produce 25,985 HTML / 5,352 gzip,
  8,851 bootstrap, 6 subject options and 236 tag options. Its 1,000-work fixture
  produces 68,731 HTML / 8,081 gzip, 22,563 bootstrap, 6 subject options and
  1,002 tag options. These are component markup and local compression, not a
  complete Next export, production compression or a browser benchmark. The two
  synthetic fixtures differ; their bootstrap values must not be conflated.

To remeasure export bytes and invariants, run
`node --import tsx scripts/check-grounded-output.mts out` after postbuild.
The data and component tests in `lib/grounded-artwork/partitions.test.ts` and
`components/grounded-artwork/grounded.test.tsx` exercise their distinct synthetic fixtures.

## Browser evidence and acceptance gates

Actual browser transfers and visual acceptance are pending. CI stdout is the
metrics source on successful Site checks runs. The receipt markers are
`GROUNDED_TRANSFER_INITIAL` and `GROUNDED_TRANSFER_ON_DEMAND_CUMULATIVE`, followed
by one compact JSON object each. Receipts include request paths, selected artwork,
actual navigation/resource entries, category counts and transfer/encoded/decoded
body totals. No alternate export representation is inserted without a request.
Zero transfer sizes may mean cache or unavailable timing, not zero content.

The initial receipt is taken after scrolling all 24 selected thumbnails, not just
the arrival viewport. The second receipt is cumulative since arrival, including a
synthetic intercepted 503 and successful retry; do not add it to the first or
present it as normal production latency/traffic. JSON attachments remain available
with failure evidence. Successful runs retain the screenshots
`gallery-view-grounded-discovery-initial.png` and
`gallery-view-grounded-discovery-on-demand.png` through the unchanged workflow.

Next gates: run exact-candidate Site checks; inspect both receipt lines and retained
screenshots; verify failure/retry, delayed clear/newer search, Back/Forward, deep-page
clamping, filters/ranking and selected thumbnails. Review narrow/desktop presentation,
keyboard/focus and themes through the existing browser suite. The five visual lenses
(hierarchy, density, responsive composition, accessibility and finish) have no new
rendered evidence in this follow-up; none is marked accepted from source checks.

Source is locally committed; local implementation checks passed as stated. Exact
follow-up CI, PR publication, merge, deployment and live verification are not established
here. Only the release maintainer proceeds through existing release paths after those
gates pass. No new product decision or approval is requested by this evidence correction.
