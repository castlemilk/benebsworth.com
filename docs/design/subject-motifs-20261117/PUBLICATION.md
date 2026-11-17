# Publication receipt — blocked before remote publication

## Exact source boundaries

The source audit and normal local checks use master `e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e`. The isolated local branch is `art/blog-subject-motifs-20261117` in `castlemilk/benebsworth.com`.

The final remote read observed master `06438f05c829a0df0d05e625e7adebec09eb895c`, which merged PR165’s 28 additive graph-bridge files. None overlaps either owned motif directory or any of the 20 hashed audit input files. Those concurrent additions are preserved. The source audit is not relabelled as a test of the newer integrated tree. See [final owner snapshot](audit/final-owner-snapshot.json).

The delivered archive’s `HANDOFF.json` and the canonical Space receipt record the enclosing local commit and complete tree SHA. The binary patch includes only this packet’s added files. No remote branch, PR or exact-commit CI is claimed.

## Checks completed

| Check | Observed result |
| --- | --- |
| Prior originals | All fifty selected category originals match their existing SHA-256 and byte sizes after packet assembly. |
| New files | 36 PNGs decoded and hash-checked: four RGBA originals, sixteen RGBA thumbnails and sixteen opaque review specimens/sheets. |
| Source and manifest | All JSON parsed; eight source associations rehashed; IDs/paths/dimensions/derivative ancestry checked. |
| Scope | Only the two owned directories contain additions; no baseline tracked file changed. |
| Whitespace | `git diff --cached --check` passed. |
| Normal pre-commit | Passed, exit 0. Staged lint found no TS/TSX files; whole-project TypeScript passed; the changed-prose gate selected no manifest-controlled prose files. |
| Static visual review | Four distinct silhouettes retained; 128 px labelled thumbnails and 256 px relationships inspected on light/dark; transparency qualifications retained. |

Raw gate logs are stored as lossless gzip files, preserving the original whitespace and bytes; `validation/artifact-log-index.json` maps their original hashes. [Asset-checks.json](validation/asset-checks.json) records the checks. The successful manual pre-commit ran 22:39:26–22:39:46 on 17 November 2026, Australia/Melbourne. The final local commit also invokes the existing pre-commit hook rather than disabling it; its result belongs to the packaged handoff receipt.

## Exact blocker

The unchanged `.githooks/pre-push` calls `task git:pre-push`. Its first required command is:

```text
node_modules/.bin/tsx scripts/verify-results.mjs
```

At 22:39:55 on 17 November 2026, the pinned `tsx` v4.22.4 launcher failed before that script could execute:

```text
Error: listen EPERM: operation not permitted /tmp/tsx-1000/21.pipe
    at createIpcServer (...)
code: EPERM
syscall: listen
Node.js v24.22.1
task: Failed to run task "git:pre-push": exit status 1
```

The hook/Task exit code was **201**; the child process exited **1**. This is an environment IPC restriction, not an artwork validation failure or an observed GitHub authorization failure. The benchmark verifier, full Vitest suite, static build and postbuild did not run. No alternative launcher, permission change, hook edit, bypass flag or API publication was used to evade the required gate.

Required prerequisites were installed normally: checksum-verified Task v3.42.1 in scratch and lockfile-exact `npm ci`. Package/lock/hook/taskfile bytes stayed unchanged. Core hook configuration remains untouched; the local commit activates the existing hooks for that command. Ignored TypeScript cache generation is not part of the packet.

## Coordinator handoff

Use the included binary patch in an isolated checkout on the stated base or rechecked current master. Verify its hashes and additive scope, then run the existing normal pre-commit/pre-push gates in an approved environment that permits the pinned launcher. Create a draft PR only after those gates pass. Preserve the four immutable originals and their receipts, and keep all current graph/Hardware/design changes.

The release decision remains separate: no merge, preview enablement, browser/Chrome permission action, production publication or runtime art assignment was performed. Existing preview/release holds remain in force. Native browser and consuming-layout acceptance are pending with their owners.
