# KG 01: explicit source/discovery integration proposal

## Status, baseline and ownership

This is a local, additive source adapter and a pure host-seam proposal. It is not
installed in `/knowledge/`, does not replace `buildKnowledgeGraph()`, and does
not change the views or ActionNode implementations. No push, merge, deployment,
browser permission or preview-setting change is part of this follow-up.

| Input | Exact revision / status |
| --- | --- |
| Inspected master, merged PR 162 | `69991f75991ed9898808a43e32489bdf6891cedd` |
| Final remote master check, PR 163 merged during this work | `311a07facfc10281eb249dff8d2b29963a3eab84` |
| Published KG 01 draft PR 158 | `85eda8e00d4f2408aef841144bbae5a3a01f6713` |
| Independently reviewed source correction, preserved packet | `87ef266da5ff05ed17f3cf85a0c11ea3e3ef0095` |
| Local import of those 17 unchanged owned files over current master | `dc6b0ec728f3f516ba08cf9e21978c10a8bdec0b` |
| Views PR 161 contract | `f7dd7e57861891ccb81a7c9fb08467a555999190` |
| ActionNode source packet | `ec66089abae09f9c2afebfd025892bc695cc8727` |

The exact final local commit, tree, test receipts and export digests are in the
handoff manifest. Branch: `work/kg01-live-bridge-20261117`. The master baseline
is coordinator-reported live; this work independently read its repository
source and ran source tests, not its deployed browser.

New ownership is limited to `lib/knowledge-source/integration/`,
`scripts/export-knowledge-integration.mts`, and this document, alongside the
previously reviewed KG 01 files. Preserve `lib/knowledge/`, `lib/study/`,
`app/knowledge/`, `components/knowledge/`, `prototypes/knowledge-folio/`,
`prototypes/knowledge-action-node/`, ActionNode design docs, assets and shared
styling. PR 163's separately owned console caption/layout-icon changes merged
while this work was being checked. Its four changed paths are the console CSS,
console TSX, segmented-control TSX and a contrast browser specification; graph,
study and artwork registries are unchanged. This packet preserves its exact
69991f7 baseline rather than rebasing another owner's files mid-verification.
Integration over current master remains a coordinator gate. The dirty Mac
checkout was not available here and was not touched.

## Why a sidecar is required

The current console lowercases raw spelling, replaces every non-ASCII
alphanumeric run with a hyphen, and trims endpoint hyphens. Glossary hubs are
created first. A matching tag joins that glossary hub through a
`normalized-tag-match` edge. This is lexical discovery, not scientific or
conceptual equivalence.

KG 01 retains punctuation, NFC canonicalization, owner-scoped concepts and
separate category namespaces. Equal-looking IDs from these providers cannot be
treated as interchangeable. The adapter keeps both graphs and adds a comparison
sidecar using the views owner's proposed fields:

| Sidecar field | Contract |
| --- | --- |
| `fromProvider` | `benebsworth-console` |
| `fromId` | Exact host ID, never rewritten |
| `fromSnapshotIdentity` | Opaque `git:<host revision>:sha256:<host graph digest>` token |
| `candidateCanonicalIds` | Zero, one or multiple source IDs; sorted and explicit |
| `outcome` | `source-matched`, `unmatched`, `ambiguous` or `invalid` |
| `support` | Identity/registry/lexical basis plus full source evidence |
| `lossNotes` | Information missing from or coalesced by the host payload |
| `semanticEquivalence` | Always `false`; correspondence is not a scientific predicate |

Canonical action identities use provider `blog-kg01/source-v1` and
`Snapshot.digest` as their snapshot token. `BridgeReport.canonicalSnapshotIdentity`
is that same digest, not the host token. The full Git revision remains separate
and is already part of the canonical snapshot's hashed body. Do not shorten or
convert either opaque token in a UI adapter.

This sidecar is not `Snapshot.aliases`. Reviewed canonical ID redirects retain
their existing restrictions; the lexical groups below do not become redirects.
Even when a host ID equals one candidate string, an ambiguous group returns all
candidates and chooses none.

## Actual source census at the inspected baseline

The source loader rebuilds the current repository, rather than importing the old
959-node snapshot. The new canonical snapshot has **998 nodes and 1,637 edges**.
It contains 97 published articles, 85 registered Labs, 3 real study packets,
288 punctuation-preserving tags, 43 source-scoped concepts (7 curated article
mentions plus 36 authored glossary concepts), 29 categories and 453 citation
targets. Six unreleased/draft articles remain excluded.

The existing provider produces **508 nodes and 746 edge occurrences**: 97 blog,
85 Lab, 3 study, 279 tag, 35 glossary hubs and 9 Lab categories. All nodes and
edge occurrences have a source correspondence at this baseline. The sidecar
keeps 480 canonical-only nodes: 453 citations, 20 blog topics and 7 curated
article concepts. It does not invent a projection to the current six-kind UI.

There are **zero current `normalized-tag-match` edges**: none of the current
tag keys overlap the current glossary keys. That supported policy is tested
with explicitly synthetic examples, not described as an existing study/blog
connection.

### Nine real tag alias groups

Each row is one host hub with two distinct canonical tag candidates. It does
not assert two concepts are the same.

| Host ID | Canonical candidates |
| --- | --- |
| `tag:complex-analysis` | `tag:complex%20analysis`, `tag:complex-analysis` |
| `tag:dynamical-systems` | `tag:dynamical%20systems`, `tag:dynamical-systems` |
| `tag:electrical-engineering` | `tag:electrical%20engineering`, `tag:electrical-engineering` |
| `tag:general-relativity` | `tag:general%20relativity`, `tag:general-relativity` |
| `tag:machine-learning` | `tag:machine%20learning`, `tag:machine-learning` |
| `tag:neural-networks` | `tag:neural%20networks`, `tag:neural-networks` |
| `tag:signal-processing` | `tag:signal%20processing`, `tag:signal-processing` |
| `tag:solid-state` | `tag:solid%20state`, `tag:solid-state` |
| `tag:statistical-mechanics` | `tag:statistical%20mechanics`, `tag:statistical-mechanics` |

Host lookup uses every observed raw tag spelling, rather than normalizing the
already-normalized canonical key. The synthetic `Café` / decomposed `Café`
regression demonstrates the reverse shape: two host keys can map to one
canonical NFC tag. No unobserved spelling is invented.

### Real study packet identity and glossary evidence

Packet existence is authoritative for `hasPacket`; a curriculum status character
is not a publication predicate. The curriculum has 71 chapters across four
volumes, but only these three packets exist:

| Host ID | Preserved canonical ID | Destination |
| --- | --- | --- |
| `study:vol1/01-introduction` | `study:vol1%2F01-introduction` | `/study/vol1/01-introduction/` |
| `study:vol1/02-system-paradigms` | `study:vol1%2F02-system-paradigms` | `/study/vol1/02-system-paradigms/` |
| `study:vol1/03-ml-lifecycle` | `study:vol1%2F03-ml-lifecycle` | `/study/vol1/03-ml-lifecycle/` |

The adapter preserves all 36 authored glossary occurrences. `Arithmetic intensity`
has two source owners, represented by separate IDs:

- `concept:study:vol1%2F01-introduction:arithmetic%20intensity`
- `concept:study:vol1%2F02-system-paradigms:arithmetic%20intensity`

Both are candidates for host `concept:arithmetic-intensity`. Their source evidence
is at `study/mlsys/vol1/01-introduction/packet.md:258` and
`study/mlsys/vol1/02-system-paradigms/packet.md:260–261`. The exported fixture
contains complete raw spans, hashes and definitions, rather than copying one
definition onto the other owner.

The production `getGlossaryIndex()` currently reads the first line of each
definition. Nine definitions in System Paradigms continue onto another line.
The supplement parses Markdown without executing it and retains the full list
item, inclusive line span, authored definition and separate first-line host
projection. Fenced fake headings/bullets are ignored; lazy continuations and
fenced examples in a definition remain in its source evidence. The production
loader is unchanged.

Study coverage is deliberately bounded: `coverage.studyReferences` is
`not-extracted`. The canonical schema's `study: complete` means complete packet
node inventory here. It does not claim exhaustive packet citations, equations,
audio, charts, figures or exercise relationships.

## Edge semantics and loss

| Current host evidence | Permitted source edge correspondence |
| --- | --- |
| `authored-glossary` | `mentions_concept`, only for the exact owning study packet and authored term |
| `shared-tag` | `tagged_with`, preserving the original canonical lexical tag |
| `normalized-tag-match` | `tagged_with` only; no invented glossary membership edge |
| `registry-category` | `classified_as`, only in the Lab registry category namespace |
| Missing/inconsistent classification | `invalid`; no predicate inferred merely from display kind |

Projected edge records expose `candidateCanonicalEdgeIds`. When two authored
tags on one content record collapse to identical host occurrences, both
occurrences survive but their exact association with source edges cannot be
recovered from the host DTO. The result is `ambiguous`, with candidates and a
loss note. Repeated identical tags retain occurrence count while canonical
edges aggregate evidence. No prerequisite, equivalence or claim-support edge
is generated.

The constructor rejects duplicate node IDs, dangling endpoints, invalid glossary
ownership and incompatible category node kinds. Filtering retains only edges
whose two endpoints remain visible. Regression coverage exercises all 64 subsets
of the existing host's six kinds.

## Registry categories and existing artwork

Only `category:lab-category:<key>` maps to `category:cat-<key>`. All twenty
`category:blog-topic:*` nodes remain distinct and canonical-only. In particular,
blog `ee` does not become Lab `engineering`, nor blog `software` Lab `ai`.

| Lab registry key | Current host artwork |
| --- | --- |
| `art` | `/topics/artwork/topology.png` |
| `maths` | `/topics/artwork/mathematics.png` |
| `physics` | `/topics/artwork/optics.png` |
| `chemistry` | `/topics/artwork/chemistry.png` |
| `biology` | `/topics/artwork/life-sciences.png` |
| `earth` | `/topics/artwork/earth-space.png` |
| `engineering` | `/topics/artwork/engineering.png` |
| `ai` | `/topics/artwork/neuroscience.png` |
| `cosmology` | `/topics/artwork/astronomy.png` |

These assignments are illustrative presentation metadata, not taxonomy or
scientific equivalence. The bridge preserves all 32 current decorated hubs,
captures all 50 PNG hashes, and retains the exact `topic-art.ts` mapping hash.
It changes no artwork bytes or original category icons. A file hash proves
which existing file was referenced; original generation provenance/licensing
remains with the artwork owner and is not invented from this mapper.

## Host seam: explicit proposal for the two UI owners

At master 69991f7, the console has local React selection/query/filter state.
Orbit uses selection as its root; there is no observed URL or popstate graph
state. Its kind toggle clears a selection when that kind is disabled. The views
prototype independently preserves selection when a list filter hides it.

The new pure seam deliberately separates requested identity from active,
visible identity. It is a proposal to reconcile those behaviors, not an installed
fix or an assertion that both owners have accepted it.

| Concern | Proposed data/action behavior |
| --- | --- |
| Root vs inspection | Independent `rootId` and `selectedId`; inspect changes selection, reroot changes root, camera produces a separate effect |
| Hidden kind/query | Retain requested IDs for recovery/history; return `hidden`, suspend active root/selection and expose no hidden open/copy/inspect capability |
| Explicit reveal | The caller can deliberately clear query and enable a kind; ordinary inspection does not silently change filters |
| Unknown/stale/unbound | Preserve requested IDs with recovery status; no first-item or fixture fallback |
| Lexical candidates | Resolve through correspondence first; an ambiguous group never supplies a chosen canonical action identity |
| ActionNode flags | `isRoot`/`isSelected` report resolved active identities independently; suspended requested identities remain in host state/resolution |
| Evidence | Preserve full host-owned evidence; a small status label never becomes scientific confidence |
| Source action | Exact supplied `navigation.href`, with availability/build/live notes, as a native-anchor intent |
| Copy | Graph permalink is an absolute graph URL; source copy is separately labelled and requires a supplied absolute source destination |
| Focus | Host retains `returnFocus` until inspector closure; the source adapter creates no DOM callbacks |

The serialized descriptor is not a direct cast to ActionNode. Its owner installs
the actual `run({ identity, returnFocus })` callbacks and chooses camera versus
reroot presentation. The views DTO still needs an agreed extension for citation
nodes, detailed evidence, references, statuses and freshness; nothing here edits
that owner's DTO.

### URL and history proposal

Owned parameters are `kgProvider`, `kgSnapshot`, `kgRoot`, `kgSelected`,
`kgKinds` and `kgQuery`. They preserve opaque IDs, unrelated/repeated parameters,
global `q`, pathname and hash. Omitted kinds means all; `kgKinds=` means none.
An old link containing IDs without provider/snapshot is `unbound`, not silently
interpreted as a source ID. The owner must deliberately add the current provider
context after resolving its correspondence.

Explicit state changes produce `push` or requested `replace` intents; no-op
actions produce `none`. Back/Forward restoration produces no new write.
Caller-owned `history.state`, including existing framework/owner fields, is
passed through untouched. The proposal does not overwrite `kg02` focus/scroll
metadata or Next.js state.

Tests include an in-memory sequence through inspection, independent reroot,
filters, source navigation, Back and Forward. This proves pure serialization and
history-plan semantics only. It does not execute native anchors, Next.js router
history, `popstate`, browser Back, focus, clipboard or a deployed graph. Those
remain explicit owner acceptance cases.

## Provenance, reproducibility and tests

Verified export requires a fresh Node process and stable isolated checkout.
All captured input bytes are checked against the exact local commit; existing
owner inputs are additionally checked against the pinned host revision. Packet
and artwork inventories are compared at both revisions, preventing an omitted
file from borrowing an older baseline's provenance. This is not arbitrary
execution attestation or support for hot reload/mixed module caches.

Run from the isolated checkout after committing its owned files:

```bash
node --import tsx scripts/export-knowledge-integration.mts --host-revision 69991f75991ed9898808a43e32489bdf6891cedd --out ../kg01-integration-export
```

The exporter refuses an existing output directory or ordinary library import.
It produces the canonical and host snapshots, correspondence sidecar, actual
fixtures, glossary spans, input manifest, destination source checks and summary.
It rejects unmatched/invalid mappings or destination mismatches; explicit
ambiguous candidates remain review data. Publication of a new integration
commit requires a fresh export, not relabeling this packet.

Relevant verification commands:

```bash
node_modules/.bin/vitest run lib/knowledge-source lib/knowledge components/knowledge --maxWorkers=1 --reporter=verbose
node_modules/.bin/tsc --noEmit --incremental false
node_modules/.bin/eslint lib/knowledge-source scripts/export-knowledge-source.mts scripts/export-knowledge-integration.mts
npm test -- --maxWorkers=1 --reporter=verbose
git diff --check
```

The exact checked-in `package.json` still exposes direct npm scripts, despite
CLAUDE.md describing them as Task aliases. Task and graphify are unavailable in
this environment. This work uses the existing npm pretest/test flow and local
compiler/linter; it changes no package, lockfile, Taskfile, hooks or dependencies.

Current destination checks cover 185 content routes and 35 glossary-index
destinations. The three dedicated Lab routes are handled explicitly. These
checks verify source identity, registry membership and captured route files,
not static-export output or live HTTP responses.

## Coordination and integration order

The views owner's pinned contract and Space receipt, and ActionNode's complete
preserved source contracts/integration guide, were read. Direct ordinary-chat
messaging is unavailable. Contract-review comments were posted on the views
Space sidecar block and the central ActionNode handoff; these are requests,
not owner agreement. Final links and receipts stay on the existing KG 01 page.

1. Coordinator reviews the exact packet, both provider baselines, loss notes and
   strict export. Preserve the source87 provenance correction's bounded contract.
2. Views and ActionNode owners agree the provider envelope, candidate chooser,
   unsupported field handling and retain-versus-clear hidden identity policy.
3. Route owner binds the pure intents to actual navigation, native anchors and
   callbacks in their separately owned files. Keep production provider selection
   explicit; no direct DTO cast or old-snapshot replacement.
4. Run exact integrated-revision checks and built destination validation, then
   native source-page/Back/Forward, root-versus-selection, hidden-action, focus,
   keyboard and responsive acceptance. Existing browser/preview holds remain.
5. Only a separately authorized publication may update the branch or deployment.

Remaining source gaps: 35 pre-existing outside-coverage reference occurrences,
dedicated nonregistry Lab coverage beyond the registered corpus, study citation
and asset relationships, external link/fragment health, and original artwork
provenance beyond preserved source mappings. The current dirty Mac state cannot
be compared byte-for-byte here even though merged #162 source is now accessible.
