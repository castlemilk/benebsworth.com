# Current-master source bridge integration

This receipt supersedes the publication status in the historical source proposal. The 27 additive source files from packet `8c003e236d4e45db0b877f421f5e2a3dd904865d` were integrated over master `e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e` without changing existing runtime files. Source commit: `584326131b7986f8165710071a562f5032817179`.

The earlier packet's export pinned PR 162 and must not be relabelled as current provenance. A fresh-process export verified the committed bytes against the current master host, including the changed console policy. The current host identity is `git:e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e:sha256:5915db5b58a79513ec6153bd5a8076f9103a41d156d1861f9504e595d2392a45`; the canonical digest is `a5658d3a63c418499b8c64dee99c55951851fce14baf382da245bc072469cca2`.

The export found 998 canonical nodes, 1637 canonical edges, 508 host nodes, 746 host edge occurrences and 220 source destination checks. All 10 ambiguous correspondence groups remain explicit candidate sets, not aliases or identity substitutions. The existing 32 artwork assignments and 50 PNG hashes remain unchanged.

## Validation and release boundary

Full integrated unit tests: 3,540 passed and five skipped. Independent review additionally passed 227 focused tests, whole-project TypeScript and scoped ESLint. Normal repository pre-commit gates ran. Fresh export completed with no unmatched/invalid correspondence or destination mismatch. These are source checks, not native-browser, built-link or deployment evidence. Exact-head CI and final independent review remain gates.

No production import, provider switch, graph URL binding or UI adoption is added. Views and ActionNode owners are reviewing the seam; their agreement and native navigation, focus, clipboard and accessibility acceptance are required before runtime activation. This branch can preserve the reviewed source independently of that later adoption.

## Reproduce provenance

After checking out the exact candidate commit, run in a fresh Node process with a new output directory:

```sh
node --import tsx scripts/export-knowledge-integration.mts --host-revision e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e --out ../fresh-bridge-export
```

The source revision and canonical digest change when the source commit changes. Preserve each export's declared revision rather than rewriting a previous receipt.
