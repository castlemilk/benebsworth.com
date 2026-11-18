# BLOG KG 02 review receipt

17 November 2026 · Ben Ebsworth blog · **implemented isolated source; visual and
native-browser acceptance remain open**. No merge or deployment is requested.

## Revision and ownership

- Repository: [castlemilk/benebsworth.com](https://github.com/castlemilk/benebsworth.com).
- Tested base: [1121edc4ae6ac8de415b5395d8fadc11450fc55f](https://github.com/castlemilk/benebsworth.com/commit/1121edc4ae6ac8de415b5395d8fadc11450fc55f).
- Isolated branch: `codex/blog-kg02-folio-views-20261117`.
- All candidate files are additions under `prototypes/knowledge-folio/`.
- The final remote check observed master at
  [92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76](https://github.com/castlemilk/benebsworth.com/commit/92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76).
  Its intervening change is the separately owned ART 04 recovered-originals
  documentation/assets. There is no overlapping prototype path, registry,
  instruction or dependency change. This candidate retains its tested base.
- Active neighbouring drafts were checked: [KG 01 #158](https://github.com/castlemilk/benebsworth.com/pull/158)
  and [DESIGN 03 #159](https://github.com/castlemilk/benebsworth.com/pull/159).
- The [dedicated Space child](https://chatgpt.com/space/page_4556c275d5b48191a7e158f07a0da014)
  records the published candidate revision, PR and current review status.

The dirty Mac checkout is not mounted here. Its browser connection timed out,
so the actual localhost `/knowledge/` surface and untracked graph types could
not be directly inspected. Their existence is retained from the user's report;
this work asserts neither absence nor compatibility. No Mac file, existing
route, scientific content, original asset, URL, global token, model file,
dependency or workflow was changed.

## What is implemented

The composition is a reading figure with an evidence margin: Source Serif 4
for narrative hierarchy, Barlow Condensed for technical labels, a selectable
Caveat observation and restrained red state annotations. All fonts reuse the
repository's local editorial assets. The HTML/CSS and connector geometry are
original source work. No generated artwork, image prompt or synthetic browser
capture was used.

The diagram presents one root and at most six immediate neighbours. Selection
only changes the inspector; “Explore from this item” changes the root. Native
list links, category facets and exact primary-source destinations provide
parallel ways to read. An explicit paginated neighbour scope exposes every
loaded connection beyond the diagram/inspector preview, separately from the
whole collection. All twenty blog topics and nine Lab categories retain their
namespaces and labels.

The bounded real-source fixture has ten nodes and sixteen edges. Two concept
associations are visibly proposed, four article-to-Lab connections are recorded
MDX embeds, five associations use the exact `chaos` tag and five are namespaced
category memberships. The existing editorial design study is inspectable but
isolated from the scientific trail. Empty, failed, partial, missing-source,
long-label and 1,000-node scenarios are explicitly mock data.

The proposed reader trail starts with Logistic map, checks its article equation
anchor and Lab equation, opens the original article, follows its recorded Lab
embed and returns through browser history. Native source links are implemented;
actual article reading, Lab execution and a host-page “Return to graph” action
are not claimed as tested or integrated.

## Executed checks

The machine-readable [validation receipt](evidence/validation.json) records
command outcomes and SHA-256 hashes of the final executable/test source. These
are local execution results, separate from any GitHub Actions result.

| Check | Observed result | Scope and limit |
| --- | --- | --- |
| Node source/URL tests | **45 passed** | 16 real-source fixture checks plus 29 URL/index/query/pagination checks |
| Actual application DOM tests | **18 passed** | JSDOM 27.0.1 runs `app.mjs`; scroll methods are stubbed, layout is not computed |
| Combined focused suite | **63 passed, zero failed/skipped** | Includes all 999 mock neighbours across 84 DOM-event pages, focus identity, reversed relationships, unknown IDs, recovery and emulated Back/Forward |
| Focused ESLint | Passed after correcting test-local names | All prototype `.mjs` files; no rule suppression |
| Whole-project TypeScript | Passed | `tsc --noEmit --incremental false` |
| Existing site unit suite | **3,290 passed, five skipped** | 230 passing files and two skipped; prototype Node tests run separately |
| Changed-prose gate | Recorded in the validation receipt | Prototype paths are outside the existing prose manifest; do not imply this audits all prototype copy |
| Native Playwright attempt | **Blocked before page load** | All 32 cases failed at Chromium launch; zero page observations and zero screenshots |
| Production build | **Incomplete** | Standard prebuild hit a `tsx` IPC restriction; equivalent generator invocation compiled/typechecked, then static-generation worker received SIGKILL |

Runtime: Node 24.22.1, npm 11.9.0, existing lockfile dependencies and Playwright
1.60.0. The attempted explicit system browser was Chromium 156.0.8078.79; it is
not represented as the package's pinned bundled browser. Installing the bundled
browser failed on an invalid/truncated download, so it was not available.

The existing site test command was `npm test -- --maxWorkers=2` and completed
in 248.16 seconds. No benchmark/model service was invoked. No complete export,
postbuild, production browser pass or deployment is claimed.

### Browser blocker and reproducible acceptance

The attempted command was:

```bash
KG02_CHROMIUM_EXECUTABLE=/usr/bin/chromium node_modules/.bin/playwright test --config prototypes/knowledge-folio/playwright.config.mjs
```

The report started at `2026-11-17T05:36:29.129Z` and completed in 19.01 seconds.
Every case stopped at the same browser-launch failure:

```text
Error: browserType.launch: Target page, context or browser has been closed
FATAL:chrome/browser/process_singleton_posix.cc:297
Check failed: . socket() failed: Operation not permitted (1)
```

These are 32 launch failures, not 32 observed UI defects. The prepared suite
subsequently received source-only selector/expectation and lint review; it has
not acquired native-browser acceptance. No permission or sandbox change was
made. The cloud-browser fallback also could not reach the isolated localhost
server (`ERR_CONNECTION_REFUSED`).

On an environment with a working browser, use the commands in [README](README.md).
The suite uses its own port 4873 with `reuseExistingServer:false`, one worker
and no retries. It covers wide/narrow light/dark, keyboard focus, modified
activation, history/reload, unknown IDs, empty/error/partial/missing data,
long/unbroken content, pagination, reduced motion and forced colours. Conditional
captures include 1280×900, 390×844 and 320×640 states. Capture context records
the route, source revision, browser, viewport, theme and fixture. A physical
touchscreen, screen reader and the full external source-page round trip still
require their own evidence.

### Build blocker

`npm run build` stopped in prebuild with
`listen EPERM: operation not permitted /tmp/tsx-1000/64.pipe`. The already
documented Node loader form was then used for the remaining benchmark-output
generator, followed by the existing harness generator and Next build. This
changes the invocation, not the repository pipeline or generated inputs.

Next compiled successfully in 23.3 seconds and passed its TypeScript phase. A
static-generation worker was killed with SIGKILL; the last reported progress
was 386/774 pages. The cause of that signal was not established. Postbuild was
not reached. The full build gate remains open; partial progress is not a pass.

## Source review findings and corrections

These are independent code/interaction reviews and manual design lenses. They
are not a visual acceptance or a numerical aesthetic score.

| Finding | Severity | Implemented correction | Evidence / remaining acceptance |
| --- | --- | --- | --- |
| A six-neighbour drawing could hide the rest of a hub | High | Separate paginated neighbour scope with directional relation/evidence details | DOM traversal reaches all 999 neighbours; native pagination pending |
| Reversed inspector links could reuse an outgoing control ID | High | IDs include both edge and destination; focus falls back to the selected visible control | DOM regressions cover both directions and unique IDs |
| Rerendering after an action could discard focus | High | Keep graph/list controls on selection, preserve source IDs, restore a stable heading when a control disappears | DOM identity, Close/Escape and recovery cases pass; native Tab traversal pending |
| Filter/view links could carry stale selection after inspection | Medium | Refresh every native navigation href from the full current state; preserve foreign query/hash fields | URL and DOM tests pass; modified-click browser case prepared |
| Long roots, inspector jumps and missing IDs could overflow narrow columns | High | Wrap headings, context text and recovery content; convert the narrow figure to a root-and-neighbour tree | Source implementation only; 320/390px long-label captures still required |

The manual frontend-design/Impeccable lenses informed source review. The
Impeccable context launcher was attempted and missing; no detector, automated
design critique or live overlay ran. Hallmark/design-taste tools were not run.
The repository's VISUAL-REVIEW rubric remains the acceptance authority.

| Art-direction dimension | Status | Source intention and remaining observation |
| --- | --- | --- |
| Composition and hierarchy | Unverified | Argument, bounded figure, evidence margin; inspect first viewport and full journey together |
| Typography | Unverified | Correct local font roles and wrapping; verify real font load, line length and hierarchy |
| Spatial rhythm | Unverified | Open margins and relation/list rules; check density with six neighbours and a full inspector |
| Artwork and diagrams | Unverified | Geometry encodes metadata, with no scientific trajectory claim; verify line endpoints/label clearance |
| Annotations | Unverified | Selectable note explains association versus equivalence; check proximity and narrow placement |
| Materials and colour | Unverified | Local light/dark paper, ink and red tokens; verify rendered focus/text contrast |
| Interaction/state composition | Source and DOM evidence only | Explicit root/selection, recovery and source actions; native pointer/keyboard still pending |
| Adaptation | Unverified | Inspector stacks below 820px; readable tree below 480px; verify zoom, narrow and long content |

## Handoff and next review

[CONTRACT.md](CONTRACT.md) maps the consumer requirements to the KG 01 draft:
opaque IDs, safe navigation actions, original namespaced taxonomy, directed
predicates, exact evidence locators and source revision/digest, known versus
unknown totals and selection recovery. Citation nodes, real learning packets,
stale/redirected IDs and source-page return actions are explicit integration
requirements, not implemented claims about the fixture.

Next, the route/model owners should compare the Mac draft with this consumer
contract and KG 01's published schema. Then run the prepared native-browser
matrix on the candidate revision and inspect comparable wide/narrow folio
captures before selecting pieces for production integration. Keep the proposed
source-scoped concept mappings visibly proposed until reviewed. No production
route adoption, merge or deployment follows from this receipt.
