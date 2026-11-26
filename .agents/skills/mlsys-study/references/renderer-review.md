# Study renderer regression notes

Use these examples to investigate changes to the study renderer or its shared components.

**Failure modes found in this loop — check for the whole class, not the
instance:**

- Ambient scope vars are silent traps: `var(--folio-accent, …)` resolves to
  the fallback everywhere the surface lacks `.folio-study`/`.research-article`
  (all of /study). Scope component vars with guaranteed literal fallbacks
  (e.g. `.audio-overview{--ao-a:var(--blog);--ao-b:var(--folio-accent,#a34c29)}`)
  and check both themes — a `--chart-*` palette colour under `--bg` text was
  a ~1:1 contrast bug in light mode.
- Silent-failure paths hide authoring errors: unknown `::fig`/`::chart` ids
  and orphaned `::eq` markers all emit a visible `study-fig-missing` stub —
  never an empty element or a vanished marker.
- React portals into server HTML need `createPortal(child, node, key)`, and
  anything the user should see without JS belongs in the server-rendered
  placeholder, not the portaled payload.
- Layout reads (`getComputedStyle`, `clientHeight`) never go on hot paths
  (per-frame / per-timeupdate callbacks) — measure on layout-change events,
  paint per frame.
- Ids are a namespace: `fig-<id>` anchors collide across manifests; check
  built HTML for duplicates, not just counts.
- Selector scope: a `.parent .child` rule silently misses elements under a
  sibling class — style-check embeds AND galleries separately in built HTML.
- The thing that filters must be the thing that embeds: the page used to
  regex-scan source for `::fig`/`::chart` to build galleries — a marker
  inside a fenced code block counted as embedded but never transformed,
  silently dropping the asset. The transform now reports consumed ids via
  an `embeds` out-param (`StudyEmbedReport`); never scan source for
  decisions the renderer owns. Locked by `lib/study/markdown.test.ts`.
- Render is not an effect boundary: `recordQuiz` fired inside render →
  StrictMode double-invocation counted every quiz attempt twice. Any
  write (localStorage, network, DOM side-effect) goes in `useEffect`.
- Module-level localStorage caches + `storage` events: a listener that
  notifies subscribers but leaves the memoized `cache` intact never syncs
  cross-tab. One module listener: invalidate cache, then notify. And
  `useSyncExternalStore`'s server snapshot must be a stable constant
  (`const EMPTY = {}`), not `() => ({})`.
- Keep reference attribution and source-chapter links consistent in inline
  references and end galleries; neither surface republishes upstream images.
- Shared hooks before copies: `useReducedMotion` was inline in one file
  while a sibling component hardcoded `animationDuration` without it —
  extract `components/study/use-reduced-motion.ts` rather than letting
  the second consumer drift.
- Data contracts that only the client enforces are hydration bombs: LINE
  chart x-points were validated kind/length at build but never checked for
  ISO-ness; `new Date('99%')` threw inside `useMemo` and 500'd the page.
  Every "the renderer assumes X" needs a build-time `validate*` throwing
  in `load.ts`, plus a component-level error boundary so one bad asset
  degrades to a note, not the whole route (`ChartBoundary`).
- Regex tails must be `[\s\S]*`, never `.*`: a single `.*` after the gloss
  `}` stopped at soft-wrap newlines and 8 marks leaked raw `{…}` blocks —
  two inside the thesis paragraph, the worst possible spot.
- Authored syntax drifts to familiar spellings: `[!warning]`/`[!tip]`
  (Obsidian conventions) fell through `NOTE_KINDS` to literal blockquotes.
  Alias maps beat silent fallthrough; prefer canonical kinds in packets.
- Palette is theme-context: light-ink SVGs authored for light mode are
  illegible on the canonical dark surface — every diagram ships `.dark`
  attribute-selector overrides (see step 4).
- Marker regexes must not let `\s*` cross the newline they guard: the
  callout title rule `[^\n]*` was preceded by `\s*`, which ate the newline
  and promoted the first wrapped body line into the handwritten title —
  mid-sentence. Same-line titles use `[ \t]*` before `[^\n]*`.
- Content strings render through markdown even in JSON: a `*` in a
  charts.json caption pairs into `<em>` and silently eats multiplication.
  Scan rendered captions for stray italics/lone `*` during verification.
- A caption's claim is data too: it must agree with the plotted values —
  the plot undercutting its own caption ("stays bandwidth-bound" above a
  crossed ridge) is an authoring error, not a modeling error.
- `opacity:0` alone hides nothing: a collapsed overlay stays in the
  accessibility tree and (without pointer-events) can still catch hits.
  Collapsed interactive layers need `visibility:hidden` with a delayed
  `visibility` transition so they don't pop out before the fade finishes.
- Chromium's fat-finger targeting retargets a touch tap's compatibility
  `click` onto the nearest interactive element — it need not be the
  `pointerdown` target. Any gesture that opens a popover under the finger
  will have its click hijacked by the popover's contents; swallow clicks
  for ~500ms after the open or hit-test explicitly.
