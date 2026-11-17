# Blog motion source audit

This is a **source-only** handoff for the isolated Blog Motion 05 workbench.
The audited repository baseline is
`1121edc4ae6ac8de415b5395d8fadc11450fc55f` on `castlemilk/benebsworth.com`
`master`. It does not establish browser acceptance or a new deployment.
The dirty Mac checkout and its uncommitted knowledge, study and UI SDK drafts
were not inspected by this audit.

## Authority and boundaries

Read [DESIGN.md](../../DESIGN.md), [CLAUDE.md](../../CLAUDE.md),
[visual review guidance](../../docs/design/VISUAL-REVIEW.md) and the
[interactive study contract](../../docs/design/INTERACTIVE-STUDY.md) before
adopting these utilities. The selected Blog/Lab language is open-margin research
folio: Source Serif 4 reading, Barlow Condensed labels, selectable Caveat notes
and restrained red annotations. About and Hiking keep their separate identities.

This lane owns only `workbenches/blog-motion05/`. The
[feedback primitive](./motion.mjs) can decorate state that another owner has
already committed; the [specimen adapter](./workbench.mjs) is not the production
graph router or model. [Fixtures](./fixtures.mjs) retain source and taxonomy
provenance. No existing model, UI SDK, study, global token, route, article or
artwork file is owned by this lane.

## Three findings for integration

### Motion preferences need an explicit lifecycle

`app/globals.css` enables cross-document view transitions and reduces element
animation/transition durations to `0.001ms`. That CSS rule does not cancel
JavaScript animation loops. No explicit reduced-motion rule for view-transition
pseudo-elements was found; their rendered behaviour remains a separate check.

`components/lab/effect-canvas.tsx` samples the reduced-motion preference when its
effect mounts. It stops for hidden/offscreen states and cleans up its renderer,
but does not subscribe to media-query changes. In contrast,
`components/lab/spatial/workbench.tsx` and `components/mdx/neural-graph.tsx`
subscribe to preference changes and pause playback. This is a source difference,
not a claim that either full experience has passed this workbench's acceptance.

**Contract:** optional graph/inspector/art feedback observes current reduced
motion, forced colours and document visibility; a restriction cancels owned
effects immediately. Returning to an allowed state does not replay them. Missing
capability or unknown preference state remains static. Semantic content is fully
available before optional feedback. Existing scientific renderers stay with
their owners.

### First-entry guide state already has an owner

`components/mdx/interactive-study.tsx` already owns readiness, scoped target
lookup, target visibility of at least 15%, readable hint visibility of at least
75%, one automatic reveal per mounted instance, meaningful-use dismissal,
explicit replay and observer cleanup. Its stylesheet reserves hint space and
makes overlays pointer-transparent. The accompanying test source covers
offscreen/ready states, ignored hover/focus/Tab, nested instances, missing and
replaced targets, and cleanup; this audit did not execute those tests.

Explicit **Show guide** can currently scroll an offscreen hint into view in
`toggleGuide()`. Automatic appearance does not. Preserve that owner's existing
implementation rather than changing it here. The new workbench's hint and
feedback contract is scroll-neutral.

**Contract:** a consumer supplies authoritative guide state. Motion never resets
onboarding, chooses a scientific target, changes model values, starts playback,
focuses a control or makes a guide reappear. Selectable guidance and decorative
marks remain separate.

### Native reading continuity must remain authoritative

`components/blog/use-article-navigation.ts` measures actual sticky clearance,
preserves `history.state`, encodes hashes, leaves modified activation native and
uses instant movement for an explicit authored-heading action. Its `popstate`
listener schedules current-heading reads; it does not force the saved hash back
to its heading. `mobile-toc.tsx` keeps native links/details and collapses the
disclosure before measuring. `article-navigation.css` provides anchor clearance.

**Contract:** graph selection commits data and selection styling immediately,
keeps the activating native element mounted and does not move focus or scroll.
Reading inspector details is an explicit action. History restoration renders
restored state without pushing a new entry, replaying feedback or assigning
`history.scrollRestoration`. Existing article links, authored fragments and
Back/Forward retain their normal meaning. A non-modal inspector does not acquire
modal focus behaviour by implication.

## Taxonomy and committed-source limits

The audited commit has no tracked `app/knowledge/` or `lib/knowledge/` paths and
no `@ui-sdk` reference in the inspected app, component, library or package
sources. This is not evidence that the separately owned local drafts are absent,
and it does not establish the deployed state of a knowledge route.

| Registry | Verified keys |
| --- | --- |
| `lib/topics.ts` — 20 topic keys | `kubernetes`, `istio`, `tekton`, `kustomize`, `minikube`, `gcp`, `react`, `algorithms`, `general`, `technology`, `ai`, `maths`, `physics`, `software`, `ee`, `cosmology`, `chemistry`, `biology`, `earth`, `hiking` |
| `lib/lab/registry.ts` — 9 Lab category keys | `art`, `maths`, `physics`, `chemistry`, `biology`, `earth`, `engineering`, `ai`, `cosmology` |
| Existing `public/topics/custom-v6` mappings — 6 artwork motifs | `algorithms`, `ai`, `physics`, `software`, `ee`, `cosmology` |

`TOPIC.ee` and Lab `engineering` are separate source keys with related display
labels. Matching labels or normalised tags do not establish scientific
equivalence. The six artwork motifs are not the complete taxonomy. Preserve the
registries and let the graph model/source owner decide explicit mappings.

## Review responsibilities

- **Graph model/source lane:** IDs, mappings, edge meaning, source evidence and
  taxonomy remain authoritative there.
- **Graph views lane:** routes, URL/history state, focus policy, inspector
  semantics and reading-position restoration remain authoritative there.
- **Design-system lane:** control anatomy, typography, shared tokens and
  component states remain authoritative there.
- **Artwork lane:** original files, prompts, alpha review, provenance and
  adoption decisions remain authoritative there.
- **Motion lane:** bounded decorative feedback, cancellation/cleanup utilities,
  specimen-only adapters and reproducible review contracts.

Source inspection, executed tests, actual browser captures and deployed state
must be recorded separately. The state matrix requires narrow/desktop,
touch/keyboard, light/dark, reduced motion, forced colours, no-JavaScript,
failure, long-label and history cases; source rules alone do not close those
rendered or device acceptance gates.
