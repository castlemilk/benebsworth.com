# Knowledge folio consumer contract

BLOG KG 02 owns this isolated reader surface. It consumes records and evidence;
it does not own identity, publication policy, taxonomy normalization, source
extraction, the production `/knowledge/` route or shared tokens. Its files are
confined to `prototypes/knowledge-folio/`.

## Source and integration boundary

The repository baseline is
`castlemilk/benebsworth.com@1121edc4ae6ac8de415b5395d8fadc11450fc55f`.
DESIGN.md, CLAUDE.md, VISUAL-REVIEW.md, the canonical Space backlog, active work,
asset index, direction and five-session ownership page were read before edits.
The Mac checkout is not mounted in this workspace. Its existing `/knowledge/`
route and untracked `lib/knowledge/graph.ts` were not directly inspected: the
connected-browser call timed out. Nothing in this prototype establishes their
absence, compatibility or deployment state. No file in that checkout was changed.

The separately owned KG 01 draft was inspected read-only while it was being
prepared: `docs/knowledge/01-source-contract.md`,
`lib/knowledge-source/schema.ts` and `navigation.ts`. It exposes Snapshot schema
version 1 and mapper `blog-kg01/1`. That owner has since published
[draft PR #158](https://github.com/castlemilk/benebsworth.com/pull/158), with the
[source contract at revision 85eda8e](https://github.com/castlemilk/benebsworth.com/blob/85eda8e00d4f2408aef841144bbae5a3a01f6713/docs/knowledge/01-source-contract.md).
It is an additive source adapter and likewise does not claim byte-level
compatibility with the Mac draft. Coordinate the translation after both draft
PRs and the actual Mac types have been reviewed.

## Required presentation data

The executable fixture shape is documented in `view-contract.d.ts`. Its IDs are
opaque to the UI. Fixture IDs are not a proposed canonical identity scheme.

| Input | Required meaning |
| --- | --- |
| Snapshot identity | Exact source revision plus a stable snapshot digest when integrated; no wall-clock substitute for a revision |
| Availability | Ready, valid empty, partial, unavailable or failed data remain distinct; last-good data needs its own stale label |
| Node | Stable ID, original kind and label, optional summary, original navigation action, safe source destination and source references |
| Taxonomy | Namespaced keys and original labels; all registry entries, not only six illustrated categories |
| Relationship | Stable ID, directed endpoints, original predicate, directional human labels, mapping status and source evidence |
| Evidence | What the locator supports, exact source path/revision, optional anchor, and mapping basis; no invented scientific-confidence percentage |
| Completeness | Loaded records and known total or null; continuation belongs to the data provider for a remote dataset |
| Missing metadata | Omit or explicitly mark unavailable; do not turn unknown references into an affirmative zero |

The current fixture supplies all 20 blog topics and nine Lab categories, with
`blog-topic:ee` distinct from `lab-category:engineering`. Exact tag spellings
`dynamical-systems` and `dynamical systems` remain visible. The shared exact
`chaos` tag is metadata association, not concept identity or scientific equivalence.

## Translation from the KG 01 draft

This table is an integration specification. The prototype does not import or
copy the model owner's implementation.

| KG 01 source | Consumer treatment |
| --- | --- |
| `node.id`, `node.kind`, `node.label` | Pass through unchanged; source model retains authority |
| `node.navigation.href` | Only content-action destination; never derive a URL from a label/slug |
| `node.navigation.action` | `open` yields a native source link; `filter` gives a namespaced list action; `inspect` remains an inspector action |
| `node.navigation.availability`, `build`, `live` | Keep source-resolved, external-unchecked and unverified rendering/live status visible when relevant |
| `node.evidence[].locators` | Convert into pinned source links and precise supporting descriptions, preserving field/AST locator and source hash |
| `node.labels` | Original spellings in metadata/search; do not merge same-named concepts |
| Category `namespace` and `key` | Namespaced facet; preserve the original category node ID independently |
| `edge.predicate`, `source`, `target` | Preserve direction; use source owner's labels with an explicit incoming label |
| Edge evidence/confidence | Present extraction/mapping basis; confidence is not probability of scientific truth |
| `references[].navigationHref` | Native action only if supplied; authored `href` remains audit text when unresolved |
| Reference status | Missing/excluded/invalid/outside-coverage gets recovery text; external-unchecked never becomes independently verified citation support |
| `coverage`, `diagnostics`, `digest` | Preserve partial coverage and diagnostics; compare expected digest before silently reusing selection |
| `resolveSelection` result | Selected, reviewed-ID redirected, removed and stale each need explicit UI treatment; no guessed substitute ID |

The KG 01 draft includes `citation` nodes, which the bounded ten-node fixture
does not exercise. Integration must add that type to the filter inventory and
use `cites` versus `links_to` to distinguish listed references from ordinary
outbound links. It must not label every external target as evidence for a claim.

The example `study:editorial-system` here is an existing **design study** used
solely to exercise the inspector. KG 01 intentionally excludes it from its
learning-packet registry. It must not be inserted into that registry by this
prototype or connected to the chaos material without separate source evidence.

## URL and history

The browser URL is sufficient to reconstruct the current view. The prefix
`kg` prevents collisions with global site search and unrelated query keys.
Foreign parameters, repeated foreign keys, the path and hash are preserved.

| Parameter | Meaning |
| --- | --- |
| `kgView` | `neighbourhood`, `list`, `categories` |
| `kgRoot` | Opaque neighbourhood root ID |
| `kgSelected` | Opaque inspected ID; explicitly empty closes the inspector |
| `kgScope` | `collection` or `neighbours`; the latter uses the root's one-hop connections |
| `kgQ` | Committed search query; typing before submit remains local draft text |
| `kgKind`, `kgCategory` | Exact kind and namespaced category filters |
| `kgPage` | One-based result page; unavailable pages get recovery instead of a silent reset |
| `kgFixture`, `kgTheme` | Review-only scenario and reproducible theme; not a production URL proposal |

Inspection changes selection, never root. Rerooting requires “Explore from
this item”. View, submitted search, filter, pagination and selection changes
push history; a theme change replaces the current entry. Repeated no-op
selection does not create another history entry. Popstate reads the URL and
does not push. Missing IDs survive URL parsing for honest recovery.

Only ephemeral focus ID, origin control and vertical position are placed under
`history.state.kg02`; other history fields are preserved. The graph/list keeps
its native controls mounted on selection changes. Related-link IDs include
both edge and destination so an incoming link cannot steal the identity of an
outgoing link. A disappearing recovery control focuses the stable view heading.

Native source anchors retain exact original URLs, modified activation, copy
link and browser Back behaviour. Article/Lab pages are not modified, so an
in-page “Return to graph” control is an **integration proposal**, not an existing
feature. A future host adapter may accept a same-origin return URL and digest;
it must validate the destination, retain canonical source URLs and avoid
global localStorage state that could mix separate reading tabs.

## Reader journey

1. Search `logistic` and inspect the proposed source-scoped Logistic map record.
2. Read its evidence: the article's authored equation anchor and the equation
   in the Lab explanation. Both concept mappings remain proposed.
3. Follow “Read named passage” or inspect the article and follow “Read article”.
4. Inspect the article's explicitly recorded `Embeds lab` connection, then
   follow the original Logistic Bifurcation destination.
5. Use browser Back to restore graph context. The isolated prototype proves
   only the portion actually exercised in its validation receipt; real article
   reading, Lab computation and production integration are separate checks.

The original editorial study remains independently inspectable, with its own
source and no fabricated scientific connection to this journey.

## Scale, mobile and keyboard

The diagram shows at most six one-hop neighbours and labels its shown/known
total. The inspector previews eight relationships. Both have an explicit route
to the **paginated neighbour list**, which retains every loaded connection and
its evidence. Collection search is separately labelled and can be selected
explicitly. A 1,000-node synthetic fixture exercises the final collection batch
of four and final 999-neighbour batch of three on page 84.

Desktop uses a reading figure and evidence margin. Below 820px the inspector
follows the figure in document order; below 480px the diagram becomes a readable
root-and-neighbour tree. It is not a shrunken desktop canvas. A visible inspector
jump and a return-to-item action avoid a modal or trapped focus. Long labels
wrap, including root titles, inspector jumps, unbroken queries and missing IDs.

Use Tab/Shift+Tab and Enter for native links, Space for native buttons and the
usual native select keys. No graph arrow-key or drag gesture is required.
Escape closes the inspector only when focus is inside it, without capturing
composition or modified shortcuts. Motion is absent; reduced-motion and forced
colours have scoped support. None of this is a screen-reader or physical-touch
certification without the corresponding executed evidence.

## Boundaries for the parallel lanes

| Owner | Interface and preserved boundary |
| --- | --- |
| Graph/source model | Supply immutable records, safe navigation, predicates, provenance and completeness; review the translation above |
| Design system | Adopt the figure/list/inspector anatomy only after review; map local `--kg-*` tokens to shared tokens later, not in this branch |
| Artwork | Optional category marks beside persistent text labels; existing assets and the full taxonomy remain authoritative |
| Motion/accessibility | Review history/focus and the explicit `disposeKnowledgeFolio()` seam; the current module auto-mounts once and does not claim a reusable remount API |

The CSS is scoped to `.kg02-preview` and uses uniquely named local font faces.
It never writes shared global tokens. The connector SVG is decorative; native
links and relation text carry its information. Solid lines mean recorded edges,
dashed lines proposed mappings and dotted lines mock relationships. None is a
scientific plot, measured trajectory or generated factual evidence.

## Integration gates

Inspect the actual Mac route/types; agree this consumer translation; pass the
isolated native-browser cases; review wide/narrow light/dark composition against
the editorial study; then integrate through the owning route in a separate
coordinated change. Learning-packet fixtures, stale/redirected selection and
source-to-graph return controls require their respective owner contracts first.
This branch is reviewable preparation. It authorizes no merge or deployment.
