# KG 02 source view contract V2

## Scope and status

This is an implemented, isolated DTO and pure adapter against the merged
`lib/knowledge-source` types. It adds no production import, page, provider,
ActionNode callback or browser operation. All owned files are under
`prototypes/knowledge-folio/`. The V1 fixture prototype in draft PR #161 remains
unchanged at `f7dd7e57861891ccb81a7c9fb08467a555999190`.

Implementation base: `deb289b741b55c48e12b4448e60268b9edee35a2`, following source
bridge PR #165 (`06438f05c829a0df0d05e625e7adebec09eb895c`) and documentation PR
#166. This consumes the merged source contract; stale draft #158 is excluded.
The shared graph/provider/console, ActionNode `ec66089`, design/motion work,
artwork, root instructions, dependencies and workflows are outside this change.

[KG 02 agreement and handoff](https://chatgpt.com/space/page_4556c275d5b48191a7e158f07a0da014)
and [ActionNode agreement](https://chatgpt.com/space/page_ba64e3a87b908191b185bdfc76e46171)
remain the owner boundaries. Native integration and current-revision CI/browser
acceptance belong to the coordinator.

## Files and public interface

| File | Responsibility |
| --- | --- |
| `view-contract-v2.ts` | Versioned source/load/state/candidate/transition types; protocol literals constrained by model-owned types |
| `source-view-v2.ts` | Envelope checks, qualified candidate selection, visibility, selected-inspector descriptors and pure transitions |
| `source-state-v2.ts` | Combined URL codec, strict original-destination guard and history plans |
| `source-view-v2.test.ts` | Real current-checkout capture plus explicitly synthetic failure/interruption cases |
| `source-state-v2.test.ts` | Synthetic URL, encoding, restoration and original-destination cases |
| `vitest.v2.config.ts` | Opt-in Node source suite; shared test configuration is unchanged |
| `CONTRACT-V2.md` | This contract, reproducible checks and remaining integration gates |

The runtime adapter imports only the model's pure `host-seam`/`navigation`
helpers. Model build, extraction, filesystem and hashing imports are type-only.
The two provider literals use `typeof SOURCE_PROVIDER`/`typeof HOST_PROVIDER` so
the typecheck detects protocol drift without pulling `node:crypto` into a
future browser bundle.

### Data and requested state

`sourceViewData` retains the complete `Snapshot`, host `KnowledgeGraph`,
`BridgeReport`, `StudySourceSlice.coverage` and authored glossary occurrences.
Evidence, reference statuses, aliases, canonical-only records, edge occurrence
multiplicity and loss notes are not flattened into V1 fields. Returned record
references are unchanged; the adapter does not mutate them.

Inputs are producer-validated source records. `sourceEnvelopeError` checks the
binding version, repository, canonical digest/revision correspondence and host
inventory counts. It is not an arbitrary-JSON validator or a replacement for
the model owner's digest, source-byte and inventory verification.

One correction to the earlier type-only proposal is necessary: persisted
**requested** `navigation` uses `HostState`, and `candidateOrigin` uses
`HostIdentity | null`. Literal-only provider types cannot represent stale,
wrong-provider or unbound URL requests. The adapter resolves them only in the
canonical context; `CanonicalIdentity` and `ConsoleOrigin` name accepted
identities. Invalid requests remain visible for recovery instead of being cast
to accepted types. `inputError` suspends malformed owned URL state.

`SourceViewLoadV2` separates ready data from loading/error/unavailable state and
can retain last-good data. Every actionable adapter operation takes this load
union; a failed load cannot expose actions merely because old data remains.
`currentness` and exact-source `sourcePublication` are independent of transport,
coverage, native content URLs and live-page availability.

### Candidate choice

`resolveSourceCandidates` checks both snapshot domains, source revision,
original host provider/ID/token, correspondence cardinality, candidate
membership and candidate existence. It keeps the original correspondence and
loss notes. Each candidate retains its own node evidence and glossary entries
matched by `conceptId` and `ownerId`; aggregate correspondence evidence is not
copied onto each candidate.

`open-origin` installs a qualified chooser. An ambiguous group leaves selection
null until `choose-candidate` supplies the active origin and a qualified
canonical member. A source-matched singleton can resolve explicitly through
the same guarded choice path. Hidden candidates require a separate Reveal.
Neither path creates aliases or chooses a lexical winner.

`inspect-direct` is the explicit way to leave chooser context for a direct
canonical record. Ordinary Inspect cannot bypass an unresolved chooser.
Canonical-only citations, categories and concepts need no fabricated host
correspondence. A malformed/stale origin never silently becomes direct mode.

### Root, selection, visibility and recovery

All active navigation uses `blog-kg01/source-v1` plus `Snapshot.digest`.
The original `benebsworth-console` qualifier stays in `candidateOrigin`.
The helper has one provider/snapshot pair: a discovery-root ID and a canonical
selection must never be placed together under it.

Inspect changes selection; reroot changes root; camera changes neither and
writes no history. Initial root and selection are null. Requested IDs survive
query/kind/category filtering. Hidden, missing, invalid, stale, unbound and
wrong-provider records have unavailable actions and explicit reasons.
Missing means absent from this snapshot, not proven deleted from the corpus.

The category projection includes the exact canonical category node and direct
`classified_as` members. It infers no membership through normalized labels,
artwork, tags or conceptual similarity. Pagination, display caps, list scope
and layout are not semantic visibility filters.

Explicit Reveal clears query/category and enables the target kind without
selecting, rerooting, opening an inspector or moving a camera. Explicit
`load-current` recovery clears old identity/chooser requests and enters a newly
qualified empty selection/root state while retaining view/scope/theme. No
first-record fallback is used. Restore never rebinds old tokens.

### Selected inspector actions

`describeSourceSelection` produces a serialized descriptor for the current
selection. It does not construct `ActionNodeCapabilities` or install callbacks.
Inspect, reroot, camera, native-source and copy support default unavailable.
Graph copy additionally requires an installed graph-state URL controller and
an exact absolute original graph URL.

This API is scoped to selected-inspector actions. While a chooser origin is
retained, reroot/camera target the accepted selected candidate; it is not a
general mixed-provider graph-card controller. Reroot remains independent of
selection. The helper's `focus` descriptor means **Explore from this item**;
camera and keyboard focus are separate responsibilities.

Native source descriptors preserve exact supplied navigation hrefs and their
availability/build/live/fragment qualifications. A relative native href stays
relative. Source copy needs an exact supplied absolute source href; it does not
infer an origin from the graph URL. Graph copy uses the complete V2 wrapper,
including chooser origin, rather than the helper's six-key URL alone.

`safeViewHref` validates original bytes before any URL construction. It rejects
malformed authorities such as `https:///example.test/path` and
`https:////example.test/path`, credentials, scheme-relative input, whitespace,
controls and backslashes. This closes the reviewed ActionNode/bridge guard gap
without changing either owner. Suspended identity/visibility reasons take
precedence over missing URLs or host support.

`revalidateSourceAction` must run at activation and again before a future
asynchronous host effect commits. Recheck current identity, snapshot,
visibility and actual host support. A prior descriptor is not a lease. A
repeated Inspect can return `history: none` while still emitting an inspector
intent. Effects here are data only: no focus, clipboard, camera, browser
history or native navigation executes in this module.

### URL and history

| State | Owned parameters |
| --- | --- |
| Canonical navigation | `kgProvider`, `kgSnapshot`, `kgRoot`, `kgSelected`, `kgKinds`, `kgQuery` |
| Views | `kgView`, `kgScope`, `kgCategory`, `kgPage`, `kgTheme` |
| Original chooser | All-or-none `kgOriginProvider`, `kgOriginSnapshot`, `kgOriginId` |

Omitted kinds means all; `kgKinds=` means none. IDs and tokens are opaque and
literal percent sequences survive round trips. Legacy `kgQ`, `kgKind` and
`kgFixture` remain foreign; they are not automatically migrated.

The codec preserves the original path/authority/hash and raw unrelated query
pairs, including repeated parameters, global `q`, percent encoding and `+`.
Duplicate or malformed owned parameters suspend actions. Partial origin
requests remain non-null and unavailable. A builder never repairs an unsafe
original into an acceptable graph link.

Semantic changes push one complete state; theme changes replace; no-ops and
Back/Forward restoration write none. `sourceHistoryPlan` passes caller-owned
history metadata through unchanged, including non-object values. It does not
call History APIs. A future host must commit wrapper and navigation state
atomically and own focus/scroll restoration.

## Source-backed verification

The real-fixture test captures the current checkout in a fresh Vitest worker,
then runs `verifyIntegrationRevisions` for both declared revisions. A separate
fresh-process export was also run against the implementation base:

```bash
node --import tsx scripts/export-knowledge-integration.mts \
  --revision deb289b741b55c48e12b4448e60268b9edee35a2 \
  --host-revision deb289b741b55c48e12b4448e60268b9edee35a2 \
  --out /tmp/kg02-v2-source-export
```

The output directory must be new. The captured canonical token is
`b763017528a4e967bc28f3a2637f6414fb54d90387bb69ed6d374ddcf327a7e2`.
The host token is
`git:deb289b741b55c48e12b4448e60268b9edee35a2:sha256:5915db5b58a79513ec6153bd5a8076f9103a41d156d1861f9504e595d2392a45`.
These are capture-specific identities, not constants to hard-code in a runtime.

The capture retains 998 canonical nodes/1,637 edges, 508 host nodes/746 edge
occurrences, nine two-candidate lexical tag groups and two chapter-owned
Arithmetic intensity candidates. There are three packets out of 71 chapters,
36 glossary occurrences/35 host hubs, nine multiline definitions, 35
outside-coverage references and zero actual normalized-tag-match edges.
Lab coverage remains registry-only; study citations/assets are not exhaustively
extracted. Complete packet inventory is not complete curriculum coverage.

From the repository root, with its pinned dependencies installed:

```bash
node_modules/.bin/vitest run --config prototypes/knowledge-folio/vitest.v2.config.ts
node_modules/.bin/tsc --noEmit
node_modules/.bin/eslint prototypes/knowledge-folio/*-v2.ts prototypes/knowledge-folio/*-v2.test.ts prototypes/knowledge-folio/vitest.v2.config.ts
node_modules/.bin/esbuild prototypes/knowledge-folio/source-view-v2.ts --bundle --platform=browser --format=esm --outfile=/tmp/kg02-v2-browser-neutral.mjs
```

The opt-in suite is intentionally separate from the shared CI test inventory.
It tests pure source behavior, including synthetic empty/error/stale/hidden,
missing-data, malformed-URL and long-label cases. The actual source census and
all 638 native open destinations are separately checked. Browser-target
bundling verifies the absence of Node runtime imports; it is not a browser run.

## Remaining integration gates

No consumer is activated. A future owned host binding must provide real
inspector/camera/reroot/clipboard support, native anchors, reference actions
using `references[].navigationHref`, a combined URL controller, and focus/scroll
restoration. It must preserve current console behavior until explicitly
integrated and accepted, without reusing selection-as-orbit-root as Inspect.

Coordinator gates remain: current integrated revision CI/static export,
native chooser and stale/hidden recovery, rapid-selection interruption,
independent root/selection, Back/Forward/reload, exact article/Lab/study anchors,
article/Lab return journeys, keyboard/Escape/focus return, narrow/touch layouts,
light/dark contrast and long-label/large-graph rendering. The existing 32 KG 02
and 16 ActionNode native cases are not executed by this source step. There are
no new browser captures, permission changes, release or deployment claims.
