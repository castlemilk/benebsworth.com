# Folio uplift — actionable backlog

28 October 2026 · Owner-approved direction; implementation and acceptance tracked separately.

Baseline supplied for this planning pass: draft **PR #83**, commit `84c73e811f985933b43c2f9c5364df222246f694`. Parent task reports artifact and controls CI succeeded for that exact commit; publish/preview were skipped. New style consuming-browser and live acceptance remain pending. This documentation pass does not independently verify remote state, merge or deploy anything. Concurrent working-tree changes are preserved. It is a repository backlog, not a set of newly created GitHub issues.

## Authority, board references and status

Use [component coverage](FOLIO-COMPONENT-COVERAGE.md), [DESIGN.md](../../DESIGN.md), [visual review](VISUAL-REVIEW.md), [interactive contract](INTERACTIVE-STUDY.md) and [post recipes](POST-PATTERNS.txt). This backlog extends the historical `WORK-BACKLOG.txt`; its older PR references are not the current release baseline.

Board references below resolve to the numbered objects in the [retained imagegen prompt set](folio-component-prompts.json) and the seven Library attachments delivered on 28 October. Stable attachment URLs are not recorded here; do not invent them.

- **B1** evidence/statistics/seven callouts/quote; **B2** technical reasoning/prose; **B3** interactive system; **B4** reading/discovery; **B5** figures/media; **B6** responsive/theme/statuses; **B7** field journal.
- Boards are approved **direction**, not implementation screenshots or factual content. B3's varying replay values are not a behaviour specification; replay must preserve values. B5's sample diagram/caption/credits are not production evidence. Do not import generated portraits, dates, quotations or measurements.
- **Proposed:** actionable future work; existing components may already implement part of it. **Source implemented / awaiting visual acceptance:** identified source slice exists, but remaining acceptance gates are open. Neither status means merged, deployed or fully accepted.
- **P0:** foundation/acceptance/release blocker. **P1:** primary uplift. **P2:** subsequent family rollout, still required for full coverage. Priority does not bypass dependencies.

## Per ticket direction and Space record

For each work item, establish imagegen direction before visual implementation: link the applicable approved family board and create a focused variation when the component/state needs further direction. Preserve the prompt, concept image and design decisions. Keep concepts distinct from actual browser captures, tests and deployment evidence. Update the [blog component Space page](https://chatgpt.com/space/page_47a9ae7ffb108191b4cefebcd1fe56ad) and [rollout page](https://chatgpt.com/space/page_8d9cfc951e9081918a9b9e720f19cb92) with assets/wireframes and exact progress for each item, preserving prior material and access. Do not regenerate or alter scientific content just to match a mockup.

## Shared acceptance contract (applies to every ticket)

**V** — Capture the actual consuming route in light and dark at desktop and narrow phone width (record exact dimensions; use 390px as the initial phone target), plus a narrow article column where distinct. No page overflow, clipped text or covered focus; test 200% zoom and long content where relevant. Record screenshots/state/commit, artistic findings and what remains unverified. A generated board or mocked rectangle test cannot satisfy V.

**K** — For interactive surfaces: keyboard-only traversal/activation, visible unobscured focus, semantic labels and disabled/selected state; preserve input/value/focus on unrelated actions. Touch/direct manipulation needs an appropriate non-drag path. Static components retain semantic/selectable content and do not gain fake controls.

**R** — Relevant component/unit/integration regressions pass; authored prose/frontmatter, numerical model, units, chart encodings, source links, routes, metadata, publishing/search rules and security boundaries are unchanged except for explicit ticket scope. Review non-blog siblings for style leakage. Build/export and deployed checks are separate rollout gates, not implied by unit success.

Each ticket must satisfy applicable V/K/R **and** its specific acceptance below. Record N/A with a reason rather than omitting an axis. Keep implementation batches to the three highest-impact findings from visual review.

## Work items

### FOLIO-028 · P0 · Restore a reliable local visual-review harness
**Status:** Source implemented / partial local acceptance · **Boards:** B1–B7 · **Depends:** none

**Scope:** Existing local preview/static-export and screenshot workflow, including the OG-font fetch dependency that previously blocked full export at `fonts.gstatic.com`.

**Acceptance:** Provide a documented, repeatable local preview command for actual changed routes and their exact JS/CSS/assets without requiring a denied external font request. Reuse licensed local fonts or an existing supported scoped preview path; do not bypass network policy, relax permissions or silently substitute a fake screenshot. If using a scoped route preview, explicitly distinguish it from a successful full export and keep the production OG contract intact. Prove clean-start route loads, capture desktop/narrow light/dark and record build commit, port/URL, viewport and console errors. A fresh agent can repeat the command. Test any changed build/font handling and retain the separate full-export release gate.

**Progress:** Local licensed OG fallback fonts eliminate the observed external-font build dependency. Full export and clean-start real RLC article loading passed; desktop light/dark captures are in the Space. True phone viewport, reduced-motion and print matrix remain open. The new review route adds an explicit 390px content-column fixture, not phone emulation.

### FOLIO-001 · P0 · Evidence baseline and coverage ledger
**Status:** Proposed · **Boards:** B1–B7 · **Depends:** FOLIO-028

**Scope:** `/lab/editorial-system/`, representative RLC explainer/logistic-map experiment, text-led essay or practical guide, archive and Latest writing; all 96 registry names in the coverage map.

**Acceptance:** Establish route/fixture for every registered name (grouped fixtures allowed); machine-check none are missing. Record existing-vs-proposed and source/CI/local-browser/deployed evidence separately. Capture baseline opening, figure/commentary and ending in V; list known missing search/lightbox/embed/long-content states. No invented data or generated-board content is introduced.

### FOLIO-002 · P0 · Accept the statistics and seven-callout first slice
**Status:** Source implemented / partial local acceptance · **Boards:** B1, B6 · **Depends:** FOLIO-001

**Scope:** `StatGroup`, `Stat`, `Callout`; `editorial-blocks.module.css`, scoped `.research-article`/`.folio-study` consumers.

**Acceptance:** V on real article and specimen: open rules, serif values, case-sensitive symbols/units, wrapping long labels and 1/2/3-column compositions. All info/warning/success/error/thinking/feeling/doing remain identifiable without colour; red handwriting never silently means error. Optional titles and nested MDX render correctly. Existing non-blog appearance remains unchanged. Re-run focused editorial-block tests after corrections. Coverage records 1,672 tests passed/5 skipped and lint/types/prose passed for the earlier source slice; this is **not** new browser, full-export or CI evidence.

**Correction, 28 October:** Restored the measured red hand-drawn insight hook/rail/dot and added seven original transparent SVG icons beside explicit type labels. Light/dark specimens and the real RLC article were reviewed; a 390px content column preserves the continuous rail and wrapped title without page overflow. Full verification: 1,750 tests passed, 5 skipped; 535-route export and 76-page search index passed. True phone, zoom/print matrix and production adoption remain unverified.

### FOLIO-003 · P1 · Notes, quotation and post-family composition
**Status:** Source implemented / partial local acceptance · **Boards:** B1, B2, B4 · **Depends:** FOLIO-001, FOLIO-002

**Scope:** `PullQuote`, `FieldNote`, `Assumptions`, `PostBrief`, `EvidenceNote`, `MethodSteps`.

**Acceptance:** V fixtures cover note observation/caution/method; all four post kinds; audience/prerequisites absent/present; all four explicit evidence bases with/without limitations; long MDX quote and real ordered method. Valid blockquote/paragraph nesting and heading semantics pass render tests. Reject invalid kinds/empty steps consistently; never infer measured evidence or add ornamental numbering. Preserve existing article text.

**Progress:** Scoped serif pull quotes, validated explicit note kinds and complete brief/evidence/assumption/method specimens are implemented. Actual 390px-column review caught and corrected fixed note columns, excessive long-title margins and a missing dark prose context. Narrow light/dark captures now show readable bodies and stacked notes with no overflow. True phone/zoom/preference/print checks and production rollout remain open.

### FOLIO-004 · P1 · Technical prose, tables, code and source links
**Status:** Source implemented / partial local acceptance · **Boards:** B2, B6 · **Depends:** FOLIO-001

**Scope:** Registered `h2`, `h3`, `p`, `a`, `ul`, `code`; inherited headings/lists/emphasis/blockquotes/rules/images/pre/tables/footnotes; `GithubLink`; actual MDX pipeline and scoped prose CSS.

**Acceptance:** V uses long code line, long URL, nested lists, wide table with proper headers and citation/backlink where supported by existing content. Wide content scrolls locally without hiding scrollbars or forcing body overflow; prose retains readable measure. K reaches links/scroll regions and preserves source destinations. Syntax contrast works in both themes. No fictitious Table/Citation API or copy button is added merely because a mockup shows one.

**Progress:** Production MDX pipeline is shared with a genuine server-rendered review fixture. Native pre/table scroll surfaces preserve syntax/header semantics and contain overflow in reading and non-reading consumers. Local 390px-column browser review measured code388/1590px and table388/768px client/scroll widths; keyboard ArrowRight moved each40px with no page overflow. Footnote/backlink hashes and dark syntax/table contrast were checked. Full1703-test pass with5 skipped and535-route export completed; phone/zoom/preference/print and wider consumer acceptance remain open.

### FOLIO-005 · P1 · Equation reading and copy states
**Status:** Source implemented / partial local acceptance · **Boards:** B2, B6 · **Depends:** FOLIO-004

**Scope:** `Equation`, KaTeX inline/display output, captions/numbers/cross-reference anchors and optional LaTeX/text copy menu.

**Acceptance:** V covers long expression, numbered/unnumbered, caption/no caption and inline math. K opens copy actions without hover and retains focus; tests assert exact clipboard payload, copied feedback/reset and failed clipboard fallback without false success. Missing `latex` hides copy controls; children remain the rendered math source. Anchor links, selectable math and local horizontal overflow remain usable.

**Progress:** Canonical Gamma ActionMenu replaces the bespoke popup; exact LaTeX and math payloads, truthful fallback, source-change invalidation and focus recovery are tested. Browser verified ArrowDown/End/Escape, exact clipboard payload and stable feedback geometry (288.34px figure height and69px math offset unchanged). Existing PLL identity exercises actual390/772px client/scroll widths with accessible left edge and40px keyboard scrolling. Normal browser200% zoom was verified at590px CSS viewport with menu inside bounds, then restored. Full1727 tests passed,5 skipped;535-route export passed. Error branches have automated coverage, not forced live clipboard-failure evidence. No production deployment.

### FOLIO-006 · P1 · Complete article hierarchy and endings
**Status:** Source implemented / partial local acceptance · **Boards:** B4, B6 · **Depends:** FOLIO-003, FOLIO-004

**Scope:** `ArticleMasthead`, `ArticleReadingFlow`, `KeyTakeaways`, `AuthorBio`, `MdxContent`, article route shell.

**Acceptance:** V across explainer/experiment/essay-or-guide: long title/deck/tags, missing optional description/takeaways, first paragraph, recap and author ending. Title/author/date/read time/canonical data remain exact; recap does not displace the argument. Heading discovery excludes incidental figure/control labels. Prose/frontmatter regression and published-state tests pass; no per-post rewrites required.

**Progress:** Existing approved masthead/endings retained. Heading discovery now excludes figure/interactive/ancillary labels while preserving authored nested sections; focused contracts pass. Actual practical-guide route had one H1, correct canonical, six displayed tags, recap before author and no overflow; Hello World had no empty recap. Full visual/optional-data matrix remains open. No production deployment.

### FOLIO-007 · P1 · Archive, filters and related reading
**Status:** Source implemented / partial local acceptance · **Boards:** B4, B6 · **Depends:** FOLIO-004, FOLIO-006

**Scope:** `FolioArchiveHeading`, `BlogContent`, `BlogPostCard`, `FolioEntry`, `ReadingEntry`, `BlogFilter`, `RelatedPosts`, `RelatedLabs`, `TopicMarker`, Latest writing.

**Acceptance:** V covers lead/ordinary entries, thumbnail/no thumbnail, long titles, many tags, result count and no-results. K exercises search/clear (focus returns), All/topic toggling and links; counts/order/filter intersection are correct. Preserve related-lab/topic identity and destination URLs. Filter overflow remains usable on phone; no unapproved pagination or URL-state change. Shared entry style does not restyle GridNav/LabMatrix.

**Progress:** Improved metadata wrapping, semantic lead date, decorative linked thumbnails, long entry wrapping and blog-scoped related-lab typography. Empty archive and trimmed result messages are tested. Actual browser checks verified no-results, clear-search focus restoration and Electrical Engineering’s nine results. Full light/dark/phone/long-content matrix remains open. Direction prompt retained in `folio-007-direction.txt`; no production deployment.

### FOLIO-008 · P1 · TOC and preserved site navigation compatibility
**Status:** Proposed · **Boards:** B4, B6 · **Depends:** FOLIO-006

**Scope:** `TableOfContents`, `MobileToc`, heading discovery, `SiteNav`, `Breadcrumb`, `SiteFooter`, `ThemeToggle`/provider and skip/main-content context.

**Acceptance:** V/K for long h2/h3 labels, no headings, active section, mobile disclosure/menu open/closed, theme switch and breadcrumb overflow. Anchor arrival clears sticky UI; navigation/focus order and current-route cues remain accurate. Disclosure names/expanded state match content; theme switching does not lose location. Preserve site-wide route identities, not a global folio repaint.

### FOLIO-009 · P1 · Site search dialog and recovery
**Status:** Proposed · **Boards:** B4, B6 · **Depends:** FOLIO-008

**Scope:** `SiteSearch` only; separate from local `BlogFilter`.

**Acceptance:** Create real V state captures: idle/loading/results/empty/unavailable. K covers shortcut/trigger, clear, hit selection, Enter, Escape, focus containment/restoration and labelled close. Tests simulate rejected index load and older search resolving after newer input; no stuck loader/stale overwrite. Empty/unavailable give honest recovery. Preserve existing Pagefind/search-action URL contract and published-content boundary.

### FOLIO-010 · P1 · Figures and measured annotation grammar
**Status:** Proposed · **Boards:** B5, B6 · **Depends:** FOLIO-003, FOLIO-004

**Scope:** `Figure`, `FigureFocus`, `AnnotatedBlock`, `AnnotationTarget`, `MarginNote`; `AnnotationLayout`, `HandUnderline`, `AnnotationMark` and geometry helpers.

**Acceptance:** V for full/left/right/inset, optional caption/credit/note, wrapped underline, above/margin/below/bracket, nested/changed targets and narrow columns. Curves land on real targets without crossing prose/plot; overlap/print fallback remains honest; scientific strokes remain untouched. Tests reject missing/mismatched/duplicate children and add document-wide duplicate authored-ID validation without confusing React-generated IDs. Notes stay selectable, overlays decorative/pointer-transparent. Verify optional annotations both present and omitted without phantom gutter/connector or lost caption; any supported on/off control uses consistent labels/state and never changes scientific output. Do not invent a site-wide annotation preference without a product requirement.

### FOLIO-011 · P1 · Gallery, lightbox and playable media
**Status:** Proposed · **Boards:** B5, B6 · **Depends:** FOLIO-010, FOLIO-008

**Scope:** `Video`, `BlogGallery`, `YouTube`; figure/media loading footprint, captions/alt/credits/location links.

**Acceptance:** V covers grid/lightbox, long caption, portrait/landscape media and failed image/video. K verifies open/close, Escape, focus restoration and any existing next/previous actions. Empty/unassigned gallery remains intentionally absent; distinguish failed fetch without inventing content. Test reduced-motion handling and genuine play semantics; do not paint fake progress/controls. Reserve dimensions, preserve exact credits/links and existing external-media privacy boundaries.

### FOLIO-012 · P1 · Sandboxed artifact framing and failure states
**Status:** Proposed · **Boards:** B3, B5, B6 · **Depends:** FOLIO-011, FOLIO-013

**Scope:** `ArtifactFrame`, existing artifact loader/error bridge and full-page destination.

**Acceptance:** V/K for idle/reduced-motion play gate, loading, ready, fetch error, empty output, runtime error and recovery. Switching task/model/version cannot display stale content under a new caption; race tests pass. Do not loosen sandbox/CSP or treat iframe focus as meaningful use. Any guide requires an independently validated existing-policy interaction bridge; otherwise retain honest unguided framing. No generated image substitutes for runnable output.

### FOLIO-013 · P0 · Shared study contract: finish browser acceptance
**Status:** Source implemented / awaiting visual acceptance · **Boards:** B3, B6 · **Depends:** FOLIO-001

**Scope:** `InteractiveStudy`, `LabCanvas`, `LabSide`, `DemoFrame`, `EffectCanvas`; existing representative TokenSampler/ThresholdCurve/GameOfLife integrations. Status applies to the shared source mechanism, **not** all legacy adapters.

**Acceptance:** V/K verifies target and readable hint visibility before first reveal; use dismisses, scroll re-entry does not, replay/retarget preserves values/focus. Test missing/disabled/inert/read-only/malformed/replaced targets, inset middle/right controls, nested independent studies, internal scroll and observer cleanup. Control perimeter stays distinct from focus; pure plots keep safe gutter cue. Complete new dark/narrow/reduced-motion browser evidence; earlier desktop/mocked-layout evidence is not a substitute.

### FOLIO-014 · P1 · Control-state and legacy-control migration contract
**Status:** Proposed · **Boards:** B3, B6 · **Depends:** FOLIO-013

**Scope:** `Controls`, `GammaButton`, `RangeSlider`, renderer-local native numeric/text/select/toggle/colour/radio/action controls.

**Acceptance:** V/K state sheet includes default/hover/focus/selected/disabled/read-only and busy/invalid only where real; native popup and colour picker documented as OS-owned. Label/value/bounds/unit, arrows/Home/End, reset and optional copy retain behaviour. Classify each renderer's controls as reuse/migrate/intentional native, preventing duplicate control systems. Reset does not reset guide dismissal. No new fake tabs/actions from board B3.

### FOLIO-015 · P2 · Attention explanatory plot adapters
**Status:** Proposed · **Boards:** B3, B6 · **Depends:** FOLIO-013, FOLIO-014

**Scope:** `AttentionCostCurve`, `DeltaMemory`, `AttnResDepth`.

**Acceptance:** Per-renderer fixture uses actual inputs/data; compare representative numerical output and scientific labels before/after. Apply shared stage/controls only to real affordances; static views get no guide. V confirms axes/legend/annotations remain legible; K exercises each existing interactive control. Record each name's adapter/intentional-no-adapter result.

### FOLIO-016 · P2 · Network/neural graphs and diagram support
**Status:** Proposed · **Boards:** B3, B5, B6 · **Depends:** FOLIO-010, FOLIO-013, FOLIO-014

**Scope:** `IngressFlowBasic`, `EgressFlowBasic`, `EgressFlowAdvanced`, `FfnnFlow`, `RnnFlow`, `LstmFlow`, `VaeFlow`, `GanFlow`, `TransformerFlow`, `ColorLegend`, `ZooMiniMap`, `PllDiagram`; shared diagram nodes/edges.

**Acceptance:** Fixture per named renderer; tests preserve node/edge/legend correspondence and meaningful flow direction. V checks dense labels, clipping, legend wrapping and diagram size on phone. K covers actual selection/navigation controls; static diagrams remain static. Rough annotation strokes must not alter exact graph edges or suggest false connections.

### FOLIO-017 · P2 · Transformer and sampling studies
**Status:** Proposed · **Boards:** B3, B6 · **Depends:** FOLIO-013, FOLIO-014

**Scope:** `AttentionHeatmap`, `SoftmaxLab`, `TokenSampler`, `MoEBlock`, `ParallelismRace`, `EmbeddingSpace`, `PositionalEncoder`, `ResidualStream`, `FfnStep`.

**Acceptance:** Per-name fixture and preserved calculation/selection tests; deterministic inputs where possible, statistical invariants rather than random screenshot equality where not. V includes heatmap/spatial/distribution/race layouts and real legends; K covers control changes and existing direct manipulation alternatives. Existing TokenSampler guide behaviour remains intact; each newly guided adapter has a truthful target and readiness condition.

### FOLIO-018 · P2 · Dynamic physical/computational studies
**Status:** Proposed · **Boards:** B3, B6 · **Depends:** FOLIO-013, FOLIO-014

**Scope:** `GaltonBoard`, `ComputeGraph`, `EntropyMixing`, `DiffusionLoop`, `NoiseSchedule`, `DctBlock`, `GameOfLife`.

**Acceptance:** Per-name fixtures preserve simulation update/reset/step and parameter bounds; tests cover unmount/pause lifecycle where present. V/K checks canvas/SVG/DOM stages, controls and phone touch without obstructing output. Reduced-motion must not silently start avoidable animation; existing GameOfLife guide remains correct. Preserve distribution/frequency/cell encodings rather than applying decorative red to data.

### FOLIO-019 · P2 · Storage and KV studies
**Status:** Proposed · **Boards:** B2, B3, B6 · **Depends:** FOLIO-004, FOLIO-013, FOLIO-014

**Scope:** `HashTableDemo`, `StorageEngineSim`, `KvCacheCompressor`, `KvQuantDial`, `KvEvictionWindow`, `KvAblationLedger`, `KvContextHistogram`.

**Acceptance:** Per-name fixture; tests preserve hash/storage steps, quantization bounds, eviction ordering and ledger/histogram values. V handles long keys, dense cells and table scrolling without body overflow. K executes existing discrete-step/reset/selection actions and reads state changes. Do not turn noninteractive ledger rows into invented controls.

### FOLIO-020 · P2 · Memory ecosystem studies
**Status:** Proposed · **Boards:** B2, B3, B6 · **Depends:** FOLIO-004, FOLIO-013, FOLIO-014

**Scope:** `MemoryHierarchyChart`, `DramRefreshCell`, `MemoryPackagingTradeoff`, `AiMemorySizer`, `MemoryMarketBars`, `MemoryKnowledgeGraph`.

**Acceptance:** Per-name fixture and known-input checks preserve units, sizing outputs, categories and graph relationships. V checks chart labels, calculator entry/result and dense graph on phone; K reaches genuine controls. Market values remain authored/source-linked, not new live claims. Refresh animation respects preferences without misrepresenting the model.

### FOLIO-021 · P2 · Architecture, reasoning, QEC and planning studies
**Status:** Proposed · **Boards:** B3, B6 · **Depends:** FOLIO-013, FOLIO-014, FOLIO-016

**Scope:** `DeepSpecEli5Flow`, `DeepSpecArchitecture`, `ReasoningTree`, `ComputeScaling`, `CostRace`, `SelectiveScan`, `SurfaceCodeLattice`, `ThresholdCurve`, `DenoisingPlanner`, `ModeCollapseStrip`.

**Acceptance:** Per-name fixture preserves branching/scaling/sequence/lattice/planning data and labels. V checks long trees/comparison strips and existing ThresholdCurve drag/perimeter geometry. K offers equivalent operation for drag where applicable; numerical regression verifies drag/keyboard changes the intended point only. No guide retarget/replay changes model output or animation state.

### FOLIO-022 · P2 · Cosmology calculators and dedicated experiences
**Status:** Proposed · **Boards:** B3, B5, B6 · **Depends:** FOLIO-012, FOLIO-013, FOLIO-014

**Scope:** `SchwarzschildCalculator`, `HolographicReduction`, `NestedUniverses`, `WhiteHoleBounce`, `UniverseScale`, `BlackHoleSim`.

**Acceptance:** Per-name fixture preserves formulas, scales/units and illustrative-vs-evidence distinctions. V checks extreme allowed values, scientific scenes and dedicated embed footprint; K handles actual controls/navigation. Test loading/reduced motion and renderer lifecycle; preserve camera/model behaviour and any embed security constraints. No universal iframe guide inference or generated replacement physics.

### FOLIO-023 · P2 · Trail route and stage field-journal adaptation
**Status:** Proposed · **Boards:** B7, B6 · **Depends:** FOLIO-010, FOLIO-014

**Scope:** `TrailMap`, `TrailSummary`, `Stages`, `Stage`, `Checkpoint`, `StageProfile`; compatibility with `HikeJourney`, `JourneyMap`.

**Acceptance:** Preserve trail green/topography/geography, distances/elevations, stage order and safety semantics. Per-name V fixtures cover long route/stage labels and profile/map on phone; test route/metric parity. K reaches genuine map/stage controls and meaningful alternatives. Adapt shared reading rhythm without replacing geographic geometry with sketch decoration or redesigning hiking routes wholesale.

### FOLIO-024 · P2 · Trail places, species, gear and photography
**Status:** Proposed · **Boards:** B7, B5, B6 · **Depends:** FOLIO-011, FOLIO-023

**Scope:** `TrailGrid`, `Stop`, `Landmark`, `Quest`, `Flora`, `Fauna`, `GearList`, `Gear`, `TrailFigure`; `TrailCard`, `SectionLabel`, `StatChip`, `IconPill`, `ContourMotif`, trail icons; HikeCard/HikeGallery compatibility.

**Acceptance:** Fixtures cover 1/2/3-column grids, species distinctions, long equipment/category lists, wide/zoom/noZoom photography, metadata/credit. `Gear` stays data-only, rendered by GearList. V/K checks zoom close/return focus and existing actions; preserve trail icons/colours, quantities, place names and safety context. Do not copy B7 placeholder route facts or imagery credits.

### FOLIO-025 · P1 · Async, route and unsupported-state resilience
**Status:** Proposed · **Boards:** B6 · **Depends:** FOLIO-006, FOLIO-009, FOLIO-011, FOLIO-012

**Scope:** Blog archive/post loading, post error/not-found and shared root recovery; `lazy-mdx-components` null fallback; media/renderer readiness boundaries.

**Acceptance:** Real throttled/failure fixtures demonstrate stable reserved geometry where feasible and honest retry/navigation. Keep existing skeletons only where appropriate; decide each null fallback deliberately rather than inserting misleading guides. V/K for loading/error/404 actions and no-results; test retry success and repeated failure, no infinite spinner. Do not expose unpublished content through recovery/search links; no invented offline/session state unsupported by this product.

### FOLIO-026 · P0 · Cross-family visual/accessibility acceptance
**Status:** Proposed · **Boards:** B1–B7 · **Depends:** FOLIO-002–FOLIO-025 for full completion; may run incrementally per accepted batch

**Scope:** Consuming-browser regression suite and evidence ledger, not another component redesign.

**Acceptance:** Every applicable ticket meets V/K/R; all 96 names resolve to actual reviewed fixture/consumer and status. Cover light/dark, phone/narrow column, long content/200% zoom, reduced motion, print and relevant forced-colour states. Verify no plot/focus obstruction, page overflow, detached pointers or application/ResizeObserver errors. At least one actual DOM, SVG, canvas and separately checked iframe path; no extrapolation from one representative to untested variants. Record unresolved blockers and do not call coverage complete while they remain.

### FOLIO-027 · P0 · Regression, release path and deployed verification
**Status:** Proposed · **Boards:** B1–B7 · **Depends:** FOLIO-026 for full rollout; each smaller release requires its scoped FOLIO-026 gate

**Scope:** Existing draft PR/release process, CI, static-export/publishing checks and live evidence. Planning this ticket is not executing a release.

**Acceptance:** Reconcile concurrent work without overwriting unrelated changes. Run project-prescribed tests/lint/types/prose and full export; record exact commands/results and blocked environmental dependencies (prior font-network denial is not a passing export). Verify MDX/Markdown siblings, feed/sitemap/OG/schema/canonicals, routes, published-state/search boundaries and non-blog appearance. Use existing validated release path only; record resulting commit/deployment, then smoke-test accepted article/archive/study/trail scope live in both themes and narrow layout. No new spending, credentials, security permissions or unrelated product decisions. Keep rollback/recovery available through existing process; distinguish source, CI, staging and production acceptance.

## Rollout order and first implementation batch

1. **Immediate:** FOLIO-028 reliable local review harness, then FOLIO-001 baseline, FOLIO-002 first-slice browser acceptance, FOLIO-013 shared-study browser acceptance. Fix the three highest-impact observed issues together before enlarging the rollout. Source already exists for the latter two; do not reimplement it merely to mark progress.
2. **Reading foundation:** FOLIO-003–008 and FOLIO-010; parallelize prose/equations and figure grammar after baseline. Then FOLIO-009/011/014, respecting listed dependencies.
3. **Recovery and adapters:** FOLIO-012/025; FOLIO-015–022 in small renderer-family batches after the shared control contract. Review rather than add onboarding where there is no genuine interaction.
4. **Separate field-journal pass:** FOLIO-023/024; preserve hiking identity and assess all variants, not just the B7 representative.
5. **Each batch:** scoped FOLIO-026 acceptance, then scoped FOLIO-027 release gate only when implementation is actually authorized/executed. Full completion requires every family, not merely the initial reading slice.

## Definition of done / progress recording

A ticket is done only when scope is implemented or explicitly retained with rationale, its tests pass, applicable V/K/R evidence is linked, any accessibility/interaction blockers are resolved and its source/CI/browser/deployment status is recorded honestly. “Visually accepted locally” is a valid intermediate result, not “deployed.” Record owner, commit/PR, tested routes, screenshots, commands and remaining risks when work starts; do not fabricate owners or dates now.

The backlog covers all **96 custom MDX registry names** through scoped families, plus native prose, reading/discovery/navigation/search/media/statuses and trail support. It intentionally avoids 96 duplicate implementation tickets. Changes to the registry require updating FOLIO-001's ledger and assigning coverage to a ticket. No app edits, issue creation, app tests, build, merge or deployment were performed by this planning document; a static inventory check verified all 96 names are assigned across 28 distinct ticket IDs.
