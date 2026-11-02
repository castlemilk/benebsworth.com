# Folio consumer ledger

FOLIO-001 · deterministic working-tree source baseline, not visual acceptance.

[Full per-name JSON](folio-consumer-ledger.json) records all **96** registered custom names, exact files/lines, every direct blog consumer, publishing flags, mapped lab/review fixtures and separate internal composition references. Registry and authored content are unchanged.

## Source coverage

- **81** loadable blog sources: **76** published by source rules; **5** excluded by draft/release flags. Excluded posts have no public route in this ledger. Publication is not date-gated.
- **88 / 96** names have a published blog consumer; **0** have only unpublished blog consumers.
- **14** names occur in the real route-local JSX for `/lab/editorial-system/` and/or `/lab/folio-review/`; **4** occur in registry-backed generic lab explainers. These categories overlap blog consumers.
- **8** names have no direct blog MDX use: `AnnotatedBlock`, `AnnotationTarget`, `Assumptions`, `EvidenceNote`, `FigureFocus`, `InteractiveStudy`, `MarginNote`, `MethodSteps`.
- **0** names have no direct published-blog, mapped lab-MDX or review fixture: none. Consult internal references before calling a wrapper unused.

## Gaps are not all the same

- **AnnotatedBlock:** fixture-or-lab-only; review route: /lab/editorial-system/; 0 internal JSX source file(s).
- **AnnotationTarget:** fixture-or-lab-only; review route: /lab/editorial-system/; 0 internal JSX source file(s).
- **Assumptions:** fixture-or-lab-only; review route: /lab/editorial-system/, /lab/folio-review/; 0 internal JSX source file(s).
- **EvidenceNote:** fixture-or-lab-only; review route: /lab/editorial-system/, /lab/folio-review/; 0 internal JSX source file(s).
- **FigureFocus:** fixture-or-lab-only; review route: /lab/editorial-system/; 0 internal JSX source file(s).
- **InteractiveStudy:** fixture-or-lab-only; review route: /lab/editorial-system/; 5 internal JSX source file(s).
- **MarginNote:** fixture-or-lab-only; review route: /lab/editorial-system/; 0 internal JSX source file(s).
- **MethodSteps:** fixture-or-lab-only; review route: /lab/editorial-system/, /lab/folio-review/; 0 internal JSX source file(s).

`Gear` deliberately returns null: its props are rendered by `GearList`. It requires parent-context proof, not a standalone visual card. Shared wrappers can be exercised internally without appearing as direct MDX tags; internal references are not automatically promoted to route proof.

Every name still needs applicable FOLIO-026 consuming-browser evidence (theme/viewport/state, provenance and keyboard behaviour). This inventory neither invalidates existing scoped screenshots nor treats them as acceptance for untested names or states. Draft-only consumers need a truthful review fixture rather than a fabricated public article route.

## Reproduce / completeness gate

`node scripts/folio-consumer-ledger.mjs` regenerates only this Markdown file and its JSON companion. `node scripts/folio-consumer-ledger.mjs --check` fails on stale output or a registry size change. Uses existing TypeScript, gray-matter and MDX parser dependencies; no build or browser is invoked.

The AST scan excludes fenced examples/comments and reports actual element lines. It inventories `content/blog/<slug>/index.mdx`, consistent with `lib/content.ts`; non-route MDX and unmapped dedicated-lab content are separately listed, not assigned invented routes. Internal references are name-based pointers, not a complete import/call graph. Exact authored prose/frontmatter, security and publishing rules are preserved.
