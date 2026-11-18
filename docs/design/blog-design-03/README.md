# Editorial component workbench — BLOG DESIGN 03

An additive continuation of Ben Ebsworth’s open-margin research folio. The workbench lives at **`/lab/folio-components/`** on a local or reviewed preview build. It is an unlisted, noindex/nofollow component route, not a deployed knowledge graph or a new global design system.

Source baseline: [`1121edc4ae6ac8de415b5395d8fadc11450fc55f`](https://github.com/castlemilk/benebsworth.com/tree/1121edc4ae6ac8de415b5395d8fadc11450fc55f), `master`. Branch: `codex/blog-design-03-folio-workbench-20261117`.

## Read the work

- [Component contracts](COMPONENT-CONTRACTS.md): anatomy, spacing, state, content, accessible behavior and complete integration example.
- [Registry audit](REGISTRY-AUDIT.md): actual MDX, Gamma, UI, topic, Lab and SVG inventories, reuse boundaries and the source packet.
- [Gamma guidance](GAMMA-GUIDANCE.md): authenticated MCP retrieval, catalogue statuses and the decisions adapted to the blog.
- [Visual studies and critique](VISUAL-STUDIES.md): the original concept, precise anatomy drawing, rejected details and pending browser acceptance.
- [Verification receipt](../../development/blog-design-03.md): commands, outcomes, environmental blockers and integration handoff.
- [Dedicated Space page](https://chatgpt.com/space/page_74f855da15cc81919425d848da51513d): exact remote revision, PR, current review status and attached concept.

## Working behavior

The route implements native navigation links; controlled search and grouped checkboxes; result counts and focus-preserving clear/reset; real source and reading destinations; independent exploration context and inspected selection; inline source trails; a controlled native modal inspector; all 20 current topic choices; local light/dark/inherited themes; and a reading sample with size, measure and optional-note controls.

The three records are a deliberately small, source-backed fixture packet, pinned to the baseline revision. Their source files and destinations are checked by tests. They demonstrate a real article embedding an RLC Lab and an explicitly different SVG study sharing the raw slug. The article/Lab relationship, exact shared tag metadata and proposed glossary grouping carry different labels and evidence. A shared label never becomes scientific equivalence.

The loading, empty-collection, missing-selection and request-error selector is **specimen only**. Its recovery action is labelled “Show ready specimen.” It performs no network request or retry. The glossary relationship is a labelled proposal. Reading preferences and the theme choice affect this local surface only; neither is persisted or written to document-root state.

## Reuse boundary

Import the presentation contracts from `components/editorial-workbench/types.ts`, non-fetching views from `primitives.tsx`, and interactive controlled wrappers from `controls.tsx`. Wrap consumers in `FolioSurface` to receive the local token scope. Do not import `fixtures.ts` or `workbench.tsx` into the graph model. Those files exist to make the demonstration concrete, not to define graph identity, taxonomy or routing.

The graph model lane owns stable IDs, predicates, provenance, normalisation and any glossary/tag hubs. The graph views lane owns URL state, traversal/history, loading, real filters, selection and retry. These components receive that data without inferring it. Category artwork and motion/accessibility lanes keep their existing ownership. Source Serif 4, Barlow Condensed, Caveat, original category symbols and maintained Gamma controls come from the existing repository.

Owned additions are confined to `components/editorial-workbench/`, `app/lab/folio-components/`, this documentation directory, `docs/development/blog-design-03.md` and `e2e/editorial-workbench.spec.ts`. There are no changes to shared CSS, UI SDK integration, `lib/knowledge/`, `lib/topics.ts`, scientific content, original assets, About, Hiking, package dependencies or workflows. The dirty Mac checkout was not accessed.

## Reproduce

Use the repository’s normal dependency and development commands, then open `/lab/folio-components/` on that local server. The route is intentionally absent from the Lab registry and global navigation.

```bash
npm ci --no-audit --no-fund
npm run dev
```

Focused validation:

```bash
node_modules/.bin/vitest run components/editorial-workbench --maxWorkers=1
node_modules/.bin/eslint components/editorial-workbench app/lab/folio-components e2e/editorial-workbench.spec.ts
node_modules/.bin/tsc --noEmit --incremental false
```

The existing `task remote:check` path discovers the six browser cases. It needs the normal production export and supported browser environment. The existing Site checks workflow collects the `gallery-view-folio-workbench-*` screenshots without a workflow change. A screenshot filename or authored assertion is not evidence that its case ran; use the exact-head CI receipt.

## Review decision

Review component composition and contracts for adoption by the graph UI lane. Visual acceptance remains separate from source checks, DOM tests, build status and deployment. No merge or deployment is requested by this workbench.
