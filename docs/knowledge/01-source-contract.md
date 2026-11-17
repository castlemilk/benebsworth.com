# BLOG KG 01 — Source model and navigation contract

## Scope and evidence

This is an isolated source adapter for **Ben Ebsworth's blog**, in
`castlemilk/benebsworth.com`, based on remote `master`
`1121edc4ae6ac8de415b5395d8fadc11450fc55f`. It is not imported by a site route,
component, search pipeline or deployment workflow. It adds no dependencies.

Owned files are `lib/knowledge-source/**`, this document and
`scripts/export-knowledge-source.mts`. The concurrent Mac files
`lib/knowledge/graph.ts`, `lib/knowledge/graph.test.ts`, graph views, study packets
and UI SDK work are not read or modified by this change. That Mac checkout is
not mounted in this environment. Remote master has no corresponding graph or
learning-study registry. The reported localhost `/knowledge/` route is not
evidence of deployment or byte-level compatibility with this adapter.

The existing DESIGN.md, CLAUDE.md, VISUAL-REVIEW.md and the blog Space's canonical
backlog, active-work and asset indexes were inspected before editing. No
AGENTS.md is present in the verified remote tree. `graphify` and Task are absent
from this environment; the committed graph report and source files were read,
and taskfile commands have equivalent npm/local-binary entry points. The stale
code graph is not used as scientific or content-graph authority.

The selected Blog/Lab folio, Source Serif 4, Barlow Condensed, selectable Caveat
notes, restrained red annotations, professional About identity, natural Hiking
identity, original artwork and scientific content remain untouched. Generated
artwork supplies no relationship evidence.

## Current source coverage

The initial inventory at the baseline contains:

| Source family | Verified source | Mapping |
| --- | --- | --- |
| Articles | `content/blog/*/index.mdx`, `lib/content.ts` | 103 source documents; 97 published, six excluded |
| Labs | `lib/lab/registry.ts`, `lib/lab/spatial/catalog.ts` | 85 registered entries, including 20 spatial labs and five concept guides |
| Lab prose | `content/lab/<slug>.mdx` | 77 optional explainers associated with registered Labs |
| Blog taxonomy | `lib/topics.ts` | All 20 topic keys, with actual `topicFor` precedence preserved |
| Lab taxonomy | `CATEGORIES` in the Lab registry | Nine category keys, in a separate namespace |
| Concepts | `lib/knowledge-source/curation.ts` | Seven explicit term occurrences in four source articles; source-scoped and editorially selected |
| References | Supported MDX syntax | Literal authored internal/external links, embeds and bibliography/footnote occurrences |
| Learning study packets | No registry in this remote tree | Input contract and synthetic tests only; no real study records claimed |

The baseline graph has **959 nodes**, **1,601 edges** and **900 reference
occurrences**. Node counts are 97 blog, 85 lab, 29 category, 288 tag, seven
concept and 453 external reference targets. No study nodes are manufactured.
Of the reference occurrences, 341 resolve to included content, 524 are external
and unchecked, and 35 are outside this adapter's coverage. These are source
counts, not traffic, rendered-route acceptance or scientific validation.

The 35 outside-coverage occurrences include dedicated benchmark routes and old
root-level article links. They are retained for review, not labelled broken or
silently rewritten. Registry coverage does not include every dedicated `/lab/`
route: benchmark, local-LLM, cost-dashboard, editorial and review pages need an
explicit route inventory before the Lab coverage flag can become `complete`.

The `study` vocabulary in the SVG/vector library describes artwork studies. It
is not ingested as the separately owned learning-packet model. The five Lab
concept guides remain `kind: lab`, `subtype: guide`; their names do not create
global scientific concepts.

## Identity and collision rules

IDs are independent of display titles, file order, timestamps, content hashes,
layout positions and browser state. Content keys currently follow the actual
article directory/registry slug. A deliberate future route rename can retain
the key only through an explicit owner-reviewed migration.

| Entity | ID form | Example |
| --- | --- | --- |
| Article | `blog:<encoded key>` | `blog:every-wire-is-an-rlc-circuit` |
| Lab | `lab:<encoded key>` | `lab:rlc-resonance` |
| Study packet | `study:<encoded owner key>` | Synthetic contract tests only |
| Blog topic | `category:blog-topic:<encoded key>` | `category:blog-topic:ee` |
| Lab category | `category:lab-category:<encoded key>` | `category:lab-category:engineering` |
| Tag | `tag:<encoded lexical form>` | `tag:signal%20integrity` |
| Concept occurrence | `concept:<owner kind>:<owner key>:<concept key>` | `concept:blog:every-wire-is-an-rlc-circuit:inductance` |
| External reference | `citation:<SHA-256 of parsed URL>` | The exact query and fragment participate in identity |
| Directed edge | `edge:<SHA-256 of source, predicate, target>` | Multiple occurrences retain separate evidence locators |

Keys must be nonempty and trimmed. NFC normalization and percent encoding
preserve separators without allowing IDs to collide silently. Duplicate keys,
source paths, concepts, categories or canonical content routes fail the build.
The implementation uses deterministic UTF-16 ordering instead of locale-based
sorting and never reads a clock for graph content.

Tag normalization is deliberately lexical: NFC, trim, collapse whitespace,
lowercase. Original spellings remain in `labels` and evidence. Punctuation is
preserved: `C`, `C++`, `C#`, `machine-learning` and `machine learning` are not
collapsed. The real article tag `dynamical-systems` and Lab tag
`dynamical systems` remain distinct. A shared tag is a discovery label, not a
scientific equivalence assertion.

Concepts are scoped to their source. The curated occurrences of inductance,
capacitance, damping ratio, logistic map, Lyapunov exponent, uniform-cost search
and orbital are anchored to exact text and source hashes. `mentions_concept`
means only that the curated term occurs there. It does not certify the
explanation, assert prerequisites or merge same-named concepts elsewhere.
Missing or ambiguous curated quotes fail rather than drifting to a new passage.

`IdAlias` is a reviewed navigation redirect between IDs of the same kind. It
requires explicit `reviewed-id-alias` evidence, a direct existing target, no
active identity shadowing, no duplicate source, chains or cycles. Category
aliases cannot cross taxonomy namespaces; concept aliases cannot cross owner
scopes. Aliases do not create scientific-equivalence edges or rewrite public
URLs. Redirected edges include the alias evidence, and occurrences expose
`resolvedViaAlias`. No aliases are asserted for the current corpus.

The separate origin-alias contract captures the existing `_redirects` rule
from `https://www.benebsworth.com` to the canonical HTTPS origin. Such references
resolve through the same publication rules and carry the hosting-rule evidence.
The loader accepts only that sole path-preserving rule; competing or unsupported
rules produce `unsupported_redirect_coverage` and no inferred origin aliases.
No other hostname or legacy path redirect is guessed.

## Relationship semantics

| Predicate | Direction and evidence | Meaning excluded |
| --- | --- | --- |
| `tagged_with` | Content → lexical tag, authored metadata | Not a prerequisite or concept identity |
| `classified_as` | Content → namespaced category, actual registry/rule | Not a universal scientific taxonomy |
| `mentions_concept` | Content → source-scoped curated occurrence | Not an endorsement, definition certification or equivalence |
| `embeds_lab` | Article/Lab → Lab, literal supported MDX attribute | Not an inferred association from matching words |
| `companion_article` | Spatial Lab → article, explicit `blogSlug` | Not a prerequisite |
| `links_to` | Content → included content/external target, authored link | Not evidence that the destination supports every claim |
| `cites` | Content → external target in a bibliography or referenced footnote | Listed reference only; no claim-level verification |

`prerequisite`, `equivalent_to`, `proves` and `supports_claim` are not supported
predicates. The builder rejects unsupported relationship semantics. No
co-occurrence edge is added between articles merely because they share a tag.
The existing RelatedLabs recommendation scorer, including its day-dependent
fillers, is not ingested as authored evidence.

Taxonomy decisions are taken from the actual registries. For example, the RLC
article is `blog-topic:ee`, its Lab is `lab-category:engineering`; the A* article
is `blog-topic:software`, while pathfinding is `lab-category:ai`. These
classifications stay intact. The six `custom-v6` symbols are an artwork subset,
not a six-category ontology. Chemistry, biology, Earth & Space, mathematics and
the established technology categories remain available.

## Source evidence and confidence

The snapshot records repository, exact source revision, mapper version, a full
input-manifest digest and its own canonical digest. Public evidence identifies
the exact path and SHA-256 of UTF-8 source bytes, a field or revision-scoped AST selector,
the authored value and one-based inclusive line range where available.
`sourceUrl()` resolves those locators to that commit, never mutable `master`.
AST child indexes are locators within that source revision, not stable entity
IDs across document restructuring.

`confidence` describes mapping evidence, not the probability a scientific claim
is true:

- `explicit`: a literal authored field, link, embed or registry entry.
- `deterministic`: a documented rule, such as the existing topic fallback or
  generated spatial tag projection.
- `editorial`: an explicitly curated term or reviewed identity mapping.

Every accepted edge has evidence. Repeated embeds deduplicate the directed
edge while preserving distinct occurrence locators. Authored labels and link
syntax remain in occurrence evidence; external-target identity uses the parsed
URL, including its query and fragment. Normal URL parsing can normalize host
case or a default port; title similarity and DOI guesses do not merge references.
General outbound links have the same external-target storage kind but remain
`links_to`, with the `external-reference` subtype. The UI must use the edge
predicate to distinguish a listed reference from an ordinary link.

MDX is parsed through the existing parser without evaluating code. Supported
forms include inline/reference/autolinks, literal JSX `a`/`Link` hrefs,
`LabSide`/`LabCanvas` effect attributes and `SpatialLab` slug attributes.
Recognized bibliography headings and used footnotes qualify external links as
listed references. Code blocks, inline code, math, expressions, comments and
literal code/pre/script/style containers contribute no outgoing references.

Only the first footnote definition for an identifier is traversed, matching the
installed rendering utility; shadowed definitions produce
`duplicate_footnote_definition` and cannot contribute hidden citations.

A real MDX ESM import/export produces `unsupported_local_binding` and suppresses
**all JSX link/embed extraction for that document**, because local bindings can
shadow the usual component names. Ordinary Markdown links are still extracted.
ESM is never evaluated or loaded; an import shown inside a code fence does not
trigger this safeguard. Supporting a local binding requires separate source
review rather than assuming that a component named `LabSide` is the site's Lab.

Dynamic attributes, spreads, conflicting definitions and unresolved explicit
references produce diagnostics. Expression-valued attributes are deliberately
unsupported even when they contain a string literal. Unrecognized bibliography
headings leave links as ordinary links; ambiguous shortcut brackets remain
text. A parse failure aborts extraction. It is not a successful empty reference
list. Existing source currently produces zero extraction diagnostics.

## Publication, freshness and failed reads

The adapter reuses the site's publication rule: `release !== false && !draft`.
It does not invent a future-date embargo or treat all repository files as
published. The existing loader reads whole files, including drafts, but the
adapter never extracts excluded bodies. Excluded records retain only minimal
private identity/publication data for resolution. They contribute no public
node, title, tags, concepts, citations, source locators or facet counts.

An authored published link to excluded content is retained as `excluded`, with
no target metadata or navigable edge. Diagnostic locators must already belong
to public sources. The complete private input manifest is represented publicly
only by its digest; private records themselves are not serialized.

The repository reader captures a complete before/after byte manifest and checks
that the loader returned all expected articles. Missing, changed, truncated or
failed inputs reject the candidate. Loaded topic/Lab/spatial registry values are
also compared with the captured literal AST, including tags, companion links
and guide membership. Module-load hashes prevent cached policy code from
borrowing newer source bytes; curation pins its own policy hash and freezes its
term records. A changed imported policy requires a fresh import before rebuilding.
The manifest includes package manifests, the MDX provider/options and the
supported hosting redirect policy as extraction dependencies.

`verifyInputRevision()` additionally checks
the exact repository origin, committed article/Lab manifest and every input's
bytes against the claimed commit. An untracked mapper or dirty source cannot
borrow an older commit's provenance. The export script performs this check
before writing any deliverable; the pure graph builder does not independently
verify a caller's Git revision.

Incremental builds use an opaque in-process cache. A document fingerprint
includes metadata, references, dependencies and source evidence. Mapping policy,
schema, categories and aliases invalidate affected cached state conservatively.
All references and shared hubs are resolved again against the complete current
manifest, so deletion, unpublishing and rename cannot leave stale edges. Full
and incremental rebuilds are tested for byte equivalence. Serialized/untrusted
cache handles are rejected. On failure, the caller retains its last complete
snapshot; the exporter writes a new directory atomically and refuses overwrite.

`snapshotFreshness()` requires a current revision and complete current file
manifest. Changed/missing public sources, a changed manifest (including added
files) or a different revision mark the snapshot `stale`; missing access is
`unavailable`. Neither state is translated into an empty graph.

## UI and navigation handoff

The UI consumes the immutable `Snapshot` DTO. `schema.ts` is the complete typed
contract; `navigation.ts` supplies `resolveSelection`, `connectionsFor` and
plain relationship labels. No force-layout, motion, focus, component or
history code is owned by KG 01.

- Use `node.id` for selection and layout identity. Use only the supplied
  `navigation.href` for a content action; never reconstruct a URL from a label.
- Content nodes expose a canonical route with `availability: source-resolved`.
  External references are `external-unchecked`. Every node separately records
  `build: unverified` and `live: unverified` in this source-only adapter.
- Tag/category nodes are `filter` actions with no invented landing URL.
  Concept nodes are `inspect` actions with an `ownerId` and exact source trail.
- `references[].href` retains the authored destination as audit data. Use
  `navigationHref` for an action: it resolves relative text against the source
  route and preserves query strings/fragments. It is null for invalid, excluded,
  missing and outside-coverage references, which need review/recovery. Fragments
  remain unverified even when the base content node resolves.
- Preserve edge direction and predicate. Incoming and outgoing neighbors are
  explicit; a visual line must not suggest a prerequisite or equivalence.
- `resolveSelection` returns `selected`, reviewed-ID `redirected`, `removed`,
  or `stale` when the caller expects another snapshot digest. The UI owner
  chooses focus return, recovery copy and URL/history behavior.
- A shared-hub discovery journey may be displayed as such with the contributing
  hub visible. It must not silently become a new asserted content-to-content edge.

The unavailable Mac draft reportedly uses blog/lab/study/tag/concept/category
kinds. Those names are retained, but exact property-level compatibility is not
claimed. The UI owner should review this DTO and write a thin translation at
its own boundary once the actual draft types are available. Do not replace the
existing graph implementation with this adapter by filename coincidence.

## Concrete source fixtures

The exporter writes six real-source cases alongside the full snapshot:

1. RLC: three literal embeds (RLC, transmission line, Smith chart), distinct
   authored article/Lab links, four reading-list references and three curated
   source-scoped terms.
2. Chaos: logistic bifurcation, Lorenz and double-pendulum embeds, four listed
   references and two curated terms. No cross-lab scientific equivalence edge.
3. A*: three pathfinding occurrences coalesce to one edge with three locators;
   the Software/AI taxonomy distinction is retained.
4. Hydrogen orbitals: chemistry article and explicitly paired spatial Lab,
   source-scoped orbital term, real links and reading references.
5. Shell coiling: biology article/Lab mapping, with the scientific title and
   original source preserved.
6. Seasons: Earth & Space article/Lab mapping, preserving the actual category.

Study-packet tests use clearly synthetic records. They establish the input and
navigation shape without claiming that a packet, glossary or route exists in
the verified repository.

## Verification and reproduction

From the isolated checkout, after installing the committed lockfile:

```bash
npm ci --ignore-scripts --no-audit --no-fund
node_modules/.bin/vitest run lib/knowledge-source
node_modules/.bin/tsc --noEmit --incremental false
node_modules/.bin/eslint lib/knowledge-source scripts/export-knowledge-source.mts
npm test
npm run build
```

The last command includes the existing prebuild/export/postbuild phases. It
does not deploy. Preserve their artifact output and the exact exit status.
The new adapter has no production consumer, so a successful existing site build
does not establish a rendered graph route or graph interaction acceptance.

After committing the adapter, export against that exact source with a **new**
output directory:

```bash
node --import tsx scripts/export-knowledge-source.mts --out ../kg01-review-artifacts
```

The script defaults to exact `HEAD`, verifies all input bytes and emits
`knowledge-source-snapshot.json`, `source-mapped-fixtures.json` and `summary.json`.
An optional `--revision` accepts an exact commit only, and succeeds only if all
captured bytes match it. No network requests are made for citations, and no
files are written to public/runtime output.

Keep the PR/Space receipt for exact executed counts, revision, commands and
artifacts; this document is the durable contract rather than a rolling test log.

## Actual gaps and integration order

1. Independently review this additive schema, extraction rules and real-source
   fixtures. Keep merge/deployment held.
2. Inspect the graph/study owner's actual draft types and publication contract;
   agree a narrow translation. The dirty Mac checkout remains untouched.
3. Add verified study packets, their source-scoped glossary records and approved
   ID redirects through that contract. Shared glossary/tag aliases are proposals
   until reviewed; matching words alone is insufficient.
4. Inventory dedicated Lab and legacy redirect routes explicitly. Resolve the
   current outside-coverage occurrences without guessing redirects or treating
   unvisited URLs as broken.
5. Let the graph UI owner adopt the DTO, then verify exact exported routes,
   fragments, selection/history/focus recovery, narrow layouts and accessible
   relationship descriptions. Source tests are not browser evidence.
6. Complete coordinated review before any separate merge or release decision.
   This lane does not authorize, perform or claim either.
