# Repository validation

17 November 2026. Local gate constituents completed on branch `art/blog-marks-ornaments-v1`, based on **`e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e`** (tree `786dcd639c0688d68035ad73698f0d85ba551a0c`). The staged change at the final checks contained 384 additions under the two owned paths. This receipt adds two documentation files afterward.

The `task` executable was unavailable and `core.hooksPath` was unset in this fresh clone. The documented constituent commands were executed directly; **the hook entrypoints were not invoked**. The complete command sequence, exit codes, timings and stdout digests are in [repository-checks.json](repository-checks.json).

## Results

| Check | Result |
| --- | --- |
| Fresh-clone prerequisite | `node_modules/.bin/next typegen` passed; generated ignored route types and next-env.d.ts. |
| Staged lint, repeated after packet staging | Exit 0; no staged TypeScript files. Exact shell body from taskfiles/lint.yml used with the local ESLint path. |
| Whole-project TypeScript | `node_modules/.bin/tsc --noEmit` passed. |
| Changed-prose gate, repeated after staging | `node scripts/lint-prose.mjs --changed --ci` exited 0. No changed manifest prose files were selected; this does not certify the new documentation's writing style. |
| Benchmark result invariants | 15 checks over 269 records; zero failures and zero warnings. The verifier reported 1,396 normal skips, including unavailable retained logs/legacy fields. No model calls. |
| Full existing unit suite | **3,334 passed, five skipped**; 237 files passed, two skipped; 310.73 seconds. `node_modules/.bin/vitest run` used the repository's existing one-worker configuration. |
| Full local static build | **851/851 pages generated**; compilation and build-time TypeScript passed. All documented prebuild and postbuild phases completed. |
| OG rewrite | 202 image files renamed, 98 HTML files rewritten in the export. |
| Search | 823 HTML files scanned. Emitted-index checks passed for 52 registered SVG studies, eight PNG artworks and 155 Grounded Forms; 313 indexed pages. |
| Grounded output integrity | 1,395 assets, 34,885,813 bytes and 465 original SVG masters checked; passed. |
| New marks export | All **324 public assets: 108 SVGs and 216 PNGs**, present in out/artwork/marks-ornaments-v1 with byte-identical source/export hashes. |
| Cached whitespace check | `git diff --cached --check` passed after staging. |
| Existing tracked-source preservation | Zero existing tracked diffs. All 97 regenerated Markdown siblings and tsconfig matched their pre-generation byte snapshots. No restore was necessary. |

## Recorded CLI failure and completed equivalent

The documented `node_modules/.bin/tsx scripts/verify-results.mjs` attempt exited 1 before running the verifier because the CLI's local IPC pipe returned **listen EPERM**. Its failure log is retained. The unchanged verifier then ran successfully with:

```bash
node --import tsx scripts/verify-results.mjs
```

The repository already uses this loader form in its build tasks. The substitution removes the CLI's unnecessary IPC listener; all verifier logic still executes. No assertions, skips, timeouts, source, credentials, permissions or hook settings were changed to obtain a pass.

## Build commands

The unit prerequisite restored and verified the existing Grounded Forms assets before Vitest. The build repeated its own documented generation steps, then ran every post phase:

```bash
node scripts/prepare-grounded-artwork.mjs
node --import tsx scripts/prepare-grounded-discovery.mts
node scripts/gen-md-siblings.mjs
node --import tsx scripts/gen-benchmark-outputs.mjs
node_modules/.bin/next build
node scripts/og-rewrite.mjs
node --import tsx scripts/build-search.mts out
node --import tsx scripts/check-study-search.mts out
node --import tsx scripts/check-grounded-output.mts out
```

Markdown generation was checked before execution and compared against a preserved 98-file snapshot afterward. Benchmark output generation wrote 269 JSON files and 183 HTML artifacts to the ignored build-data location. Next emitted the existing documented NFT whole-project tracing warning; compilation and export still completed.

## Environment and limits

Dependencies were copied into this isolated clone from an existing checkout with the **exact same package-lock SHA-256**, `7994f12f44eac3bb20943dd09394c0fa8c10daee929c09954aad7e51041bf8bb`. This is a private dependency copy with distinct inodes, and its 67 symlinks resolve internally. No sibling source/artwork was copied or changed. Execution used Node **24.22.1**, Next **16.2.6**, Vitest **4.1.7**, `CI=true` and `NEXT_TELEMETRY_DISABLED=1`.

This is local source/export evidence, not browser or deployment acceptance. No browser, screen-reader, physical-device, forced-colors or print checks were run here. Artistic and optical findings belong to the separate asset review. The existing remote workflow uses Node 22; exact published-head CI remains separate.

Master advanced during the run to coordinator-reported `06438f05c829a0df0d05e625e7adebec09eb895c`. Validation stayed pinned to the original e1c0f0a baseline without a fetch or rebase. No commit, push, PR operation, preview enablement, release or setting change was performed by this validation task.
