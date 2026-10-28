# Research-folio component coverage

Source inventory: 28 October 2026. Scope: the blog reading experience and **all 96 custom names registered in `components/mdx/mdx-components.tsx`**, plus its shared shell, controls, media and recovery states. This is a coverage map and implementation backlog, not a statement that every component is redesigned, pictured, browser-verified or deployed. Other site applications are explicitly outside this rollout.

## Direction and evidence boundaries

- Authority: `DESIGN.md`, the accepted `/lab/editorial-system/` specimen, `VISUAL-REVIEW.md` and `INTERACTIVE-STUDY.md`. Use Source Serif 4 reading/display, Barlow Condensed labels, Caveat short selectable notes, locally bundled fonts, fine rules, paper/graphite/copper and theme-specific red handwriting. Gamma owns controls, not the artistic voice.
- Decorative Rough.js marks are deterministic and separate from real scientific geometry. Imagegen boards are art direction, never executable UI, measurements, article evidence, exact scientific diagrams or screenshots of the implementation.
- Preserve authored prose/frontmatter, links, data, units, chart encodings, keyboard behaviour, publishing/search boundaries and iframe permissions. Do not turn every paragraph into an annotation or every scientific renderer into a bespoke card system.
- `Existing` below means source is present, not visual acceptance. `Partial` means reuse/adoption exists but has explicit remaining work. `Review` means the family needs design and consuming-browser review; it does not imply it is broken.

## Seven-board map

| Board | Visual family | Required representative coverage |
| --- | --- | --- |
| 1 | Statistics, semantic notes, quote | StatGroup/Stat; all seven Callout types; PullQuote; FieldNote and evidence/assumption distinctions |
| 2 | Technical prose | Display/inline mathematics, code, long tables, citations/source links, ordered/unordered lists, GithubLink |
| 3 | Interactive studies | Open-margin shared frame; Gamma and native control families; genuine renderer examples; guide hidden/revealed/dismissed/replayed/unavailable |
| 4 | Reading and discovery | Masthead/deck/metadata, post-family briefs and method, heading rhythm, recap/author, related entries, archive/filter, desktop/mobile TOC and preserved navigation context |
| 5 | Figures and media | Figure placements/caption/credit, annotation relationships, generated plate without baked-in text, video, gallery/lightbox and embed framing |
| 6 | Adaptation and resilience | Light/dark/narrow reading, focus/disabled/loading/empty/error, reduced-motion/print intent |

| 7 | Field journal | Trail map/summary, stage/checkpoint, elevation, landmarks, flora/fauna, gear and imagery; separate geographic identity |

These are seven **family boards**, not exhaustive state sheets. Check the rendered images themselves before marking a named item visually covered. The inventory below is the complete registered-name map even when a board shows only a representative.

## 1. Reading, evidence and semantics

| Registered MDX names | Unique primitive / variants | Board | Current scope |
| --- | --- | --- | --- |
| `StatGroup`, `Stat` | Semantic definition-list layout; value, label, optional context; 1/2/3-column reflow | 1 | Existing; review folio alignment, long values and units |
| `PullQuote` | Selectable blockquote, including MDX-wrapped paragraphs | 1 | Existing; review rhythm, not a new testimonial card |
| `Callout` | **info, warning, success, error, thinking, feeling, doing**; optional title, icon and prose | 1, 6 | Existing seven-type component; preserve meaning and non-colour cues. Handwritten red is not error status |
| `FieldNote` | observation/caution/method; short note title and readable body | 1 | Existing folio primitive |
| `Assumptions` | Explicit working assumptions section | 1, 2 | Existing folio primitive; not interchangeable with caution |
| `PostBrief` | explainer/experiment/essay/guide; optional audience/prerequisites | 4 | Existing; two-post adoption described in DESIGN.md is not blanket content migration |
| `EvidenceNote` | measured/simulated/illustrative/interpretation; optional limitations | 1, 2 | Existing composition of FieldNote; never infer evidence basis |
| `MethodSteps` | A real ordered procedure with step title/content | 4 | Existing; numbers communicate actual order only |
| `Equation` | KaTeX children with caption/number/cross-reference ID; optional LaTeX/text copy menu and copied confirmation | 2 | Existing; review long expression overflow, dark legibility, copy hover/focus/open/success/failure and selectable/accessibility output |
| `GithubLink` | Repository/source link with icon and destination text | 2 | Existing bespoke source-link treatment; no fictitious citation component |

Native MDX mappings explicitly registered: `h2`, `h3`, `p`, `a`, `ul`, `code`. Also cover inherited HTML/prose output: h1/article title, h4–h6 where authored, ordered/nested lists, list items, emphasis/strong, blockquote, horizontal rule, images, preformatted syntax-highlighted blocks, inline math, display math, tables/thead/tbody/headers/cells, footnotes/citation backlinks when produced by content. Tables, citations and code blocks are **not separate named custom exports** in this registry; review their real pipeline/CSS, rather than inventing APIs from a board. Long URLs, unbroken code, wide equations/tables and nested lists need narrow-width specimens.

## 2. Figure and annotation primitives

| Registered MDX names | Unique primitive / variants | Board | Current scope |
| --- | --- | --- | --- |
| `Figure` | full/left/right/inset; image, caption, credit, alt and intrinsic dimensions | 5 | Existing folio frame; verify float clearing and mobile stacking |
| `FigureFocus` | Titled figure with optional caption and separate reading note | 5 | Existing; real target/column-aware annotation layout |
| `AnnotatedBlock`, `AnnotationTarget`, `MarginNote` | Validated target-note composition; above/margin/below/bracket arrangements | 5, 6 | Existing; document-wide duplicate authored IDs still open per DESIGN.md |
| `Video` | Autoplay/muted/loop/inline media, metadata preload and optional dimensions | 5, 6 | Existing; review reduced-motion, loading and media alternatives, not invented play controls |
| `ArtifactFrame` | Sandboxed generated artifact with title/caption and full-page destination | 3, 5, 6 | Existing bespoke embed; **not** claimed migrated to InteractiveStudy |
| `UniverseScale`, `BlackHoleSim` | Dedicated scientific experience embeds | 3, 5 | Existing adapters; retain their renderer/interaction constraints, audit individually |

Non-registry shared primitives: `AnnotationLayout`, measured `HandUnderline`, `AnnotationMark` (arrow/underline/bracket/circle), annotation geometry helpers; `BlogGallery` photo grid/lightbox with captions/location links; `YouTube` media component where consumed. A missing/unassigned gallery currently renders nothing, not a designed loading or error panel. Gallery lightbox and external/sandboxed media are distinct UI surfaces, not proven by a static Figure specimen.

## 3. One shared interactive grammar, many renderers

**Unique shared UI:** `InteractiveStudy` (registered MDX), `LabCanvas`, `LabSide` (registered MDX), `Controls`, `GammaButton`, `RangeSlider`, plus `DemoFrame` in the demo layer and `EffectCanvas` renderer. Treat the frame, guide, control layout and scientific stage as separate responsibilities.

Source/documented initial integrations: LabCanvas/LabSide, TokenSampler, ThresholdCurve, GameOfLife and DemoFrame. DemoFrame only provides a guide for callers that opt into a truthful hint. This is **partial adoption**, not coverage proof for every export below. A renderer using its own legacy controls needs an adapter review even if its surrounding article is folio-styled.

| All other registered scientific/support names, grouped for review | Treatment | Board |
| --- | --- | --- |
| `AttentionCostCurve`, `DeltaMemory`, `AttnResDepth` | Attention/model explanatory plots; preserve actual values and geometry | 3 |
| `IngressFlowBasic`, `EgressFlowBasic`, `EgressFlowAdvanced` | Network-flow renderer family; shared nodes/edges remain distinct from annotation marks | 3 |
| `FfnnFlow`, `RnnFlow`, `LstmFlow`, `VaeFlow`, `GanFlow`, `TransformerFlow` | Neural-graph renderer family, not six independent design systems | 3 |
| `ColorLegend`, `ZooMiniMap`, `PllDiagram` | Legend/index/diagram support; do not force static explanatory content into interactive onboarding | 3, 5 |
| `AttentionHeatmap`, `SoftmaxLab`, `TokenSampler`, `MoEBlock`, `ParallelismRace`, `EmbeddingSpace`, `PositionalEncoder`, `ResidualStream`, `FfnStep` | Heatmap, distribution/sampling, routing, races, spatial and stream renderers | 3 |
| `GaltonBoard`, `ComputeGraph`, `EntropyMixing`, `DiffusionLoop`, `NoiseSchedule`, `DctBlock`, `GameOfLife` | Canvas/SVG/DOM scientific studies; dynamics and data remain real | 3 |
| `HashTableDemo`, `StorageEngineSim` | Data-structure/storage simulations; validate discrete steps and controls | 3 |
| `KvCacheCompressor`, `KvQuantDial`, `KvEvictionWindow`, `KvAblationLedger`, `KvContextHistogram` | Compression/quantization/window/ledger/histogram studies | 2, 3 |
| `MemoryHierarchyChart`, `DramRefreshCell`, `MemoryPackagingTradeoff`, `AiMemorySizer`, `MemoryMarketBars`, `MemoryKnowledgeGraph` | Memory charts, cell simulation, sizing and graph; chart/table/calculator layouts remain distinct | 2, 3 |
| `DeepSpecEli5Flow`, `DeepSpecArchitecture`, `ReasoningTree`, `ComputeScaling`, `CostRace`, `SelectiveScan` | Architecture/branching/scaling/sequence studies | 3 |
| `SurfaceCodeLattice`, `ThresholdCurve`, `DenoisingPlanner`, `ModeCollapseStrip` | Lattice, direct SVG drag, planning and comparison strips | 3 |
| `SchwarzschildCalculator`, `HolographicReduction`, `NestedUniverses`, `WhiteHoleBounce` | Calculator and cosmology visualization family | 3 |

### Controls and guide states (boards 3 and 6)

- Shared controls: range with label/current value/bounds, actions/reset/optional copy, native toggle/checkbox, colour input and select. Also audit actual renderer-local numeric/text inputs, radios, play/pause/step/selection controls and direct manipulation; do not assume Gamma has replaced them.
- For each genuine control: default, hover, focus-visible, active/selected, disabled/read-only, and busy/invalid only where that behaviour exists. Native select popup/colour picker remain OS-owned unless explicitly changed later.
- Guide: not ready/offscreen → first visible eligible target **and readable hint** → meaningful enabled use dismisses → scrolling back does not redisplay → explicit Show guide/Hide guide. Focus, Tab, background click and ordinary scrolling do not dismiss.
- Missing/hidden/disabled/inert target or malformed selector: no misleading guide. Target change, inset middle/right controls, nested studies, replacement nodes and internal scrolling require measured, scoped highlighting. Preserve focus/value/selection when replaying or retargeting.
- Canvas/SVG target: gutter cue without a perimeter around scientific output. Control target: transparent pen perimeter plus safe gutter connector where possible. Annotation overlays never intercept input or replace keyboard focus.
- DOM, SVG, canvas/WebGL and iframe are different acceptance paths. A static board cannot verify their events, numerical behaviour, readiness or sandbox boundary.

## 4. Reading shell, archive and navigation

| Components / surfaces | Coverage requirement | Board | Status |
| --- | --- | --- | --- |
| `ArticleMasthead`, `ArticleReadingFlow`, `KeyTakeaways`, `AuthorBio`, `MdxContent` | Topic/date/author/read time/tags, title/deck/body/recap; long titles and absent optional content | 4 | Existing folio reading rollout; runtime review separate |
| `TableOfContents`, `MobileToc`, heading discovery | Active h2/h3, long nested labels, anchor offsets; mobile closed/open; no headings | 4, 6 | Existing; preserve real article heading scope |
| `FolioArchiveHeading`, `BlogContent`, `BlogPostCard`, `FolioEntry`, `ReadingEntry` | Lead entry, ordinary reading row, thumbnail/no image, metadata/tags, long title | 4 | Existing shared archive/entry direction |
| `BlogFilter` | Search field/clear, all/topic active states/counts, horizontal overflow, result count/no results | 4, 6 | Gamma actions present; not global search |
| `RelatedPosts`, `RelatedLabs`, `TopicMarker` | Reading-entry reuse, related-lab identity, topic mark and destination context | 4 | Existing; retain topic/lab meaning |
| `SiteNav`, `Breadcrumb`, `SiteFooter`, `ThemeToggle`, `ThemeProvider` | Desktop/mobile menu, current route, breadcrumb truncation, theme toggle, footer links, skip/main-content context | 4, 6 | **Preserved site-wide identity**, compatibility review not blanket folio restyle |
| `SiteSearch` | Trigger/shortcut; dialog idle/loading/results/empty/unavailable, active hit, close and keyboard flow | 4, 6 | Existing separate asynchronous search; shared site identity |
| Blog archive/post loading; post error/not-found; global route recovery | Skeleton geometry where already used, honest recovery message/actions and preserved shell | 6 | Existing route statuses; not replaced by decorative blank paper |

Source locations: `components/blog/`, `components/site/`, `components/search/site-search.tsx`, `components/theme/`, `app/blog/`, shared root route status files. Metadata/JSON-LD and published-state rules have no visual board tile but remain regression requirements.

## 5. TrailKit: a separate field-guide identity

All 15 registered names are covered below. Share reading typography/spacing and annotation discipline only where appropriate; preserve trail green accents, topography, navigation/geography, units, difficulty/safety meaning and hiking-specific imagery. Board 7 is a compatibility preview, not permission to flatten the hiking product into the technical-study palette.

| Registered MDX names | Distinct family |
| --- | --- |
| `TrailMap`, `TrailSummary` | Real route/map and trail metrics/summary |
| `Stages`, `Stage`, `Checkpoint`, `StageProfile` | Ordered journey, stage detail, waypoint and elevation profile |
| `TrailGrid`, `Stop`, `Landmark`, `Quest` | Responsive layout and route/place/task content types |
| `Flora`, `Fauna` | Shared species-card family with distinct species meaning |
| `GearList`, `Gear` | Categorized equipment list; **Gear is data-only**, rendered by GearList, not another standalone visual card |
| `TrailFigure` | Hiking image/caption/metadata/credit, wide and zoom/noZoom variants |

Supporting primitives: `TrailCard`, `SectionLabel`, `StatChip`, `IconPill`, `ContourMotif` and semantic trail icon set. Related hiking route components (`HikeCard`, `HikeGallery`, `HikeJourney`, `JourneyMap`) are identity/context checks, not authorized wholesale redesign. Review map/profile legibility, stage flow, safety labels and image zoom in a dedicated trail sheet before migration.

## 6. Required state matrix and known visual gaps

Apply to each relevant family, not every component indiscriminately:

| Axis | Evidence still required for expanded coverage |
| --- | --- |
| Theme | Actual paper/light and graphite/dark; red handwriting contrast, semantic callout contrast, code/math and scientific encodings |
| Width/content | Narrow phone, narrow desktop column, wide desktop, long title/caption/URL/value, wide table/equation, 200% zoom |
| Interaction | Keyboard focus, hover, pressed/selected, disabled, open overlay/popup, meaningful guide dismissal/replay, direct manipulation alternative |
| Async/recovery | Dynamic imports (current lazy MDX fallback is `null`), search unavailable/no results, artifact idle/loading/ready/fetch error/runtime error and reduced-motion play gate, absent/failed media, route error/404 |
| Preferences/output | Reduced motion, print without decorative connectors, selectable text, forced-colour legibility where applicable |
| Integration | Scroll/anchor offsets, no annotation collisions, no plot or focus obstruction, independent/nested studies, no horizontal page overflow, preserved routes/search/publishing |

**Remaining detail gaps:** (1) board 7 now supplies the dedicated trail family direction, but does not enumerate every TrailKit variant or state, (2) search dialog, gallery lightbox and sandbox artifact recovery need their own state/detail sheet, (3) dense tables/code/math require a long-content narrow-width detail, (4) controls need a real browser state sheet, including native popup appearance; (5) one study screenshot cannot certify every scientific renderer. These are explicit follow-ups, not missing names disguised as completed coverage. Additional imagegen sheets can clarify visual intent; only implemented-browser captures establish runtime fidelity.

## Phased backlog and acceptance

1. **Direction coverage (this document + seven boards):** reconcile every registered name to the map; inspect actual generated panels; mark pictured vs representative vs absent without treating mockup text/data as authoritative. Exit: complete inventory and honest board index.
2. **Static reading primitives:** align stats, seven callouts, quote, technical prose/source links, post-pattern variants and figure placements through shared styles/components. Preserve semantic distinctions; no article rewriting. Exit: component/prose regression tests and real light/dark/narrow captures.
3. **Interactive adapters:** reuse InteractiveStudy/Gamma where appropriate; audit renderer-local controls and readiness one family at a time. Keep static diagrams static and iframe policy unchanged. Exit: target/guide lifecycle tests, unchanged model checks and browser evidence for DOM/SVG/canvas plus separately validated iframe behaviour.
4. **Discovery/media/recovery:** review archive/TOC/search, gallery/lightbox, embeds and loading/empty/error/404 as complete flows; preserve site-wide identity. Exit: keyboard, focus/close/recovery, async race and responsive visual evidence.
5. **Trail compatibility:** use board 7 as the field-guide direction, adapt shared reading surfaces selectively, verify geography/elevation/safety/gear/zoom semantics. Exit: trail-specific browser review, not blanket recolouring.
6. **Rollout gates:** follow `VISUAL-REVIEW.md`; record exact route, viewport, theme, data/state and capture provenance. Run project tests/typecheck/export through existing workflow; distinguish local source, CI, deployed and browser acceptance. No generated board alone establishes implementation, successful export or deployment.

This documentation-only inventory performs no implementation, test run, build, merge or deployment. Earlier verification documented elsewhere applies only to its explicitly recorded scope.


## Generated-board review cautions
Seven imagegen boards were generated and delivered as Library image attachments on 28 October. Their prompts are retained in the companion prompt set. The images are proposals only. Do not copy generated author portraits, dates, quotations, attribution, validation claims, invented links or scientific geometry into the site. Board3 incorrectly varies the numeric value between its editing/replay mockups; the actual component preserves values, and board6 explicitly depicts that invariant. Board5 contains an ambiguous circuit/caption pairing and illustrative image credits; retain the authored real diagrams and credits. All96 registered names are inventoried, but not every state is pictured.

## Implemented first slice, pending consuming-browser review
StatGroup/Stat and Callout have scoped folio treatments for research-article/folio-study only. Stats use open top rules and serif values with case-preserving scientific labels. Editorial insight/reflection callouts use red handwriting rather than orange rounded cards; all seven type labels remain distinct, and warning/error have explicit labels/rules. Non-blog appearance and authored MDX are preserved. Local Task verify:1,672 tests passed,5 skipped; lint/types/prose passed. Full local export was not retried after the earlier font-network policy denial; new consuming-browser and narrow/dark acceptance remain pending, and CI is a separate gate.
