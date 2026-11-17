# Verification and publication boundary

17 November 2026. Repository: `castlemilk/benebsworth.com`. Initial artwork audit baseline: `e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e`. Current validation base: `06438f05c829a0df0d05e625e7adebec09eb895c`. Review branch: `art/blog-editorial-illustration-language-20261117`.

## Artifact evidence

- Six returned r1/r2 PNGs were compared byte-for-byte with the preserved repository copies. All recorded hashes match. Three r2 candidates pass the 12% substantial-content margin floor; the three declared gap/under-form probes are alpha zero. Faint alpha residue remains, as recorded in the manifest and raster report.
- The author and a separate read-only reviewer inspected the final raster light/dark, actual-size and grayscale boards. The 320px full-canvas minimum is a review judgment for these relationships, not an empirical comprehension or accessibility certification.
- Nine separate SVG counterparts pass the static profile. Forty-five rendered size/palette combinations are nonempty, transparent and have zero painted outer-edge pixels. Corresponding palette geometry/alpha masks match. Two authored regenerations were byte-stable. The existing vector audit/export tooling's 25 tests passed; these are not application tests.
- All eight PDF pages were rendered and visually inspected by the authoring reviewer and lead reviewer. The final binary-stream PDF has the same page pixels as the inspected version; two final builds were byte-identical. Both repository fonts are embedded/subset/Unicode mapped. The PDF is selectable text but is not tagged PDF/UA. Its vector previews are raster; editable SVGs are supplied separately.

## Repository commands actually attempted

Task 3.54.0 was obtained from its official release and verified against the official archive digest. It is local tooling only; no repository task, hook, permission or security setting was changed. Node was v24.22.1. Installed dependencies came from a checkout with identical package and lock files; lock SHA-256: `7994f12f44eac3bb20943dd09394c0fa8c10daee929c09954aad7e51041bf8bb`.

| Command | Observed result | Evidence class |
| --- | --- | --- |
| `task git:hooks:test` | Pre-commit phase passed: no staged TS files, whole-project TypeScript passed, changed-manifest prose check passed. Pre-push stopped at its first `bench:verify-results` step with exit 201 from Task / exit 1 from tsx | Normal gate attempt; overall gate did not pass |
| `TMPDIR=<private workspace temp> task bench:verify-results` | Same `listen EPERM` failure at a workspace-local Unix socket | One bounded path diagnostic; no permission change |
| `node --import tsx scripts/verify-results.mjs` | 15 checks, 269 records, 0 failures, 0 warnings; 1,396 skips and 178 pre-bundle entries reported. No sweep logs were present | Supplemental offline verifier result; does not convert the normal Task gate into a pass |
| `task test:unit` | Grounded preparation completed and Vitest v4.1.7 printed its RUN banner, but produced no completed test results; the unresponsive run was interrupted, exit 130 | Incomplete; no unit-test pass/count claimed |
| `task build` under a 240-second process limit | Completed normally, exit 0, before the limit. Compiled and exported 851 pages; normal OG/search and grounded-output postchecks completed | Full static build, not browser acceptance or deployment |

The full build emitted Next tracing warnings, including an unexpected file in the NFT list, and still exited successfully. No runtime or build-pipeline repair was attempted in this art lane. Its final grounded-output check verified 1,395 existing asset outputs and explicitly reported browser acceptance and deployment as not run.

Raw local task outputs are retained losslessly as `.log.gz` files in `review/verification-logs/`, with compressed and original byte hashes in that directory's manifest. A final staged pre-commit rerun, local commit/tree and patch round-trip result are recorded in the external delivery receipt and canonical Space after they exist, avoiding a self-referential commit hash inside this packet.

## Exact publication blocker

The normal pre-push task invokes the tsx CLI, which tries to open a local IPC Unix socket. This environment returns:

```text
Error: listen EPERM: operation not permitted /tmp/tsx-1000/56.pipe
code: EPERM
syscall: listen
```

Selecting a private writable workspace temporary directory gave the same error for that directory's socket. No sandbox escalation, hook skip, loader-wrapper substitution in the task, permission change or security change was used. The separate Node-loader verifier avoids the IPC operation, but is recorded only as supplementary evidence.

The branch must not be represented as published or as having passed pre-push. No push or PR is claimed. The delivery is patch-ready source plus the isolated local branch, with the exact final state recorded in the canonical Space. The next repository owner should apply the patch through the normal review path and complete `task git:pre-commit` and `task git:pre-push` in a supported environment before publishing a draft PR.

## Preserved scope

All proposed paths are additions under the two owned roots. No existing tracked file changed, including the fifty category originals/provenance, eight editorial originals, graph bridge, Hardware, registries, layouts, tokens, instructions or release workflows. All three sibling art owners have acknowledged the boundaries; the application reference contract is recorded in `COORDINATION.md`.

Ben's selection, consuming-browser/keyboard/assistive-technology checks, runtime adoption, merge, preview enablement and production release remain separate. The existing holds are preserved.
