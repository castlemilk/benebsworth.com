# Grounded Forms Set09 integration checkpoint

## Scope and identity

Branch `feat/grounded-set09-20261115` starts at exact master
`d9253b65fa3e79b846dc6e460978d68ea8265147`. This is an additive local integration;
the existing release owner retains all publication, merge and deployment work.
No dependency, credentials, security, permission, spending or release-path change.
Earlier supplementary Set07/Set08 live sweeps remain paused, not completed.

Source packet ZIP: `6bb57c6bf061bf643056c76dabe734a7298608835faab30c9130ac94f1d27005`.
Batch metadata: `0c6d13ea2815816747f3345123bb0d498504ea4c50a445a9a76cdfaa3433c1ac`.
File manifest: `94c039f355f6b673e4a287703c0789206a2ba12ed8082cda4041bc132978b7f0`.
Scientific notes: `08b5bcac4b02caeca921d17a4bb9d2d4752430db931d3f7c0a1483e5f476a0d5`.

All prior 130 catalogue entries and 146 source parts are retained exactly.
The 25 new works add 75 exact 900-square light/dark/mono SVGs and lossless
480/960px WebP derivatives, bringing totals to 155 works, 465 masters and 1,395
assets. The mapper preserves every authored subject and complete scientific
wording. Equality regressions cover all 25 metadata records, aliases, tags,
references, dimensions and provenance prefix. Chemistry joins the discovery
subjects without remapping existing works. Full scientific notes are immutable.

Expanded catalogue: `dbc984547066c7075e63ce15a389aad572cd67eda2b2c5eb9ce4b47ad8627cad`,
exactly 642,168 bytes. Preparation checks both exact length and digest before
writing. Bootstrap cap remains 70,000 bytes and source/transport safety budgets
remain unchanged. Historical 105/130-work validators retain explicit count
support rather than breaking earlier importers as the current total increases.

## Verification checkpoint

Import and scoped verification are underway. Seven bounded pages retain every
work (24/24/24/24/24/24/11). Initial bootstrap is 9,951 bytes; eight metadata files
load on demand. Transport contains 14,181,219 raw bytes, 1,114,462 compressed bytes,
1,486,339 encoded bytes and 171 parts. New tests cover all seven pages plus five
Set09 groups in all palettes, alias/subject/tag selection, history and downloaded
master equality. Browser execution and screenshot acceptance are release-owner
gates; test compilation alone will not be presented as a browser pass.

Bundled artistic-vector skill scripts are unavailable; no execution is claimed.
The independently owned packet review and existing repository validation provide
separate evidence. Manual review lenses: hierarchy retains the collection/detail
journey; distinctiveness preserves the source compositions; layout keeps square
previews and 320/640px guidance; accessibility retains bounded pagination, focus,
retry and history behavior; finish retains palette-specific exact downloads.
These source observations are not fresh browser visual acceptance.

Final scoped tests, serial full unit suite, lint/typecheck and bounded production
build/postbuild remain pending at this checkpoint. Remote CI, publication,
deployment and live verification are not performed by this integration owner.

## Final local verification

Frozen runtime/source candidate `1a23e4de4f1f29d2c7c41e8ac132fde770a768ef` passed
all final checks. The following receipt-only update does not alter runtime,
artwork, tests or build configuration.

- Pinned repeat import: 155 works / 1,395 exact assets.
- Scoped owned importer: 24 passed. Registry, partitions and component tests:
  198 passed, including the 1,000-work synthetic fixture.
- Full serial Vitest suite: 3,290 passed, 5 inherited skips; 230 files passed,
  two skipped; 367.29 seconds. All 18 owned packaging regressions passed.
- TypeScript passed. Scoped lint is clean. Full lint has zero errors and
  462 inherited warnings. No dependency versions or lockfiles changed.
- Playwright list compilation: 20 grounded tests. Execution and screenshot
  acceptance remain separate release-owner CI gates, not a local browser pass.
- Bounded production build: 774 static pages using a temporary two-worker
  setting, restored byte-for-byte afterward. The prebuild uses the documented
  `node --import tsx` equivalent for the local CLI IPC limitation; package and
  release scripts are unchanged. OG rewrite, Pagefind title/alias search,
  discovery and scientific-caveat exclusion checks all passed.
- Static output check: 155 detail routes, 465 SVG masters, 1,395 exact asset
  hashes and 34,885,813 total asset bytes. The additions total 4,402,792 bytes.
- Built collection: 86,042 HTML bytes, 33,653 inline Flight bytes, 3,672 JSON-LD
  bytes, 9,951 bootstrap bytes, 555,366 initial thumbnail bytes, and eight
  on-demand metadata files totaling 65,631 bytes. Static automatic discovery
  JSON expectation is zero; measured browser transfer remains a CI gate.
- Worst arbitrary 24-thumbnail selection in one palette: 777,536 bytes;
  largest thumbnail: 47,418 bytes, both inside unchanged budgets.
- Exact comparison against base retains all 130 prior catalogue and transport
  entries and all 146 prior parts. Expanded transport SHA-256 is
  `eb17f092df06983c64b843c617be36ba970f900fed8111f56150c2f72c25e826`.

Earlier local test attempts exposed stale total/minimum-size/remainder assertions
and a fixture comparison that included source-permission annotations outside the
catalogue source-link schema. Corrected tests retain all authored title/URL pairs,
exact visible scientific text and immutable full notes; no source semantics or
artwork bytes were changed. The first full suite had 3,289 passing tests and one
stale packaging count failure; its log is superseded by the complete green rerun.
The build was held until the green rerun and was executed once.

The hash-bound original scientific notes intentionally retain their trailing blank
line. Baseline `git diff --check` reports only that preserved source formatting;
all other changed files pass the whitespace check. Independent packet acceptance
retains all 25 works, separate from implementation/browser acceptance. The source
overview was opened during integration; no fresh exhaustive visual review or
specialist certification is implied.

Reproduction commands: `node scripts/import-grounded-set09.mjs <packet> --check`,
`node --test scripts/tests/import-grounded-artwork.test.mjs`,
`vitest run --maxWorkers=1 --no-file-parallelism --reporter=verbose`,
`tsc --noEmit`, `eslint .`, and the repository build/postbuild phases.
Detailed local logs accompany the release-owner handoff. No push, PR comment,
merge, deployment or live verification was performed by this integration owner.
