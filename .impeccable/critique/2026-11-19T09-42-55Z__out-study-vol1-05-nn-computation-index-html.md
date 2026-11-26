# Critique — /study/vol1/05-nn-computation/ (Read mode)

Dual-agent loop (A: `25790f63` design review · B: `3b631c32` detector/static evidence).
Target: built `out/study/vol1/05-nn-computation/index.html` served on :4519.

## Scores

- A design review: **26/40** (weakest: user control 2, error prevention 2,
  aesthetic/minimal 2, error recovery 2)
- B evidence: no score; 2 FAILs, 3 anomaly/notes, rest PASS.

## Findings → fixes (all verified in rebuilt out/ + real browser)

| Sev | Finding | Fix | Verified |
|---|---|---|---|
| P1 | Bare `> [!kind]` promoted first wrapped body line into `.study-note-title` (regex `\s*` ate the newline) | `\s*`→`[ \t]*` in `rehypeStudyCallouts` + 2 regression tests | 0 `study-note-title` on 3 bare callouts; visual confirms |
| P1 | charts.json caption `2B*109,184` paired `*` → `<em>` + stray `*` | `·` multiplication in caption | 0 `<em>` in figcaptions |
| P2 | `intensity-batch` caption claimed "stays bandwidth-bound" while batch-128 bar (29.6) crossed the ~20 ridge | caption rewritten — crossing is the point (stream-everything overstates traffic once weights are cache-resident) | built text |
| P2 | Equation symbol gaps: `A^{(l-1)}`, `Ops`, `M_{act}`, buffer-pair term, `W^{(l)}` missing | added to equations.json | manifest |
| P2 | BAR_STACKED unquantified (hover-only numbers, touch-inaccessible) | `<Bar showValue>` + compact formatter + dark label on `--chart-2` yellow | screenshot: `437.5` labels render in segments |
| P2 | `--chart-1` violet beside `--chart-3` purple merged in stack | gradients→chart-4, optimizer→chart-3 | screenshot: segments distinguishable |
| P2 | SVGs illegible at 390px (~4.3px effective type) | `.study-fig` `overflow-x:auto` + `min-width:38rem` on svg | 2 svgScrollable at 390, no page overflow |
| P2 | Gloss card clipped off-viewport for right-edge marks | margin-left clamp measured against the card's REAL rect (inline marks anchor to fragment boxes, not the visible span) | 10/10 marks, 0 overflow at 390+1440 |
| P2 | Manual "Figures to look at" section duplicated the generated From-the-book gallery | removed from ch5 packet AND ch1–4; skill updated — book-figures.json IS the list | 0 section, galleries intact |
| P3 | 7-item header stats row wrapped to 3 lines at 390 | collapsed artifact counts into one joined span (4 items max) | built markup |
| P3 | TOC rail overlapped footer during fade | IntersectionObserver `rootMargin: '0px 0px 80px'` — hides before footer enters | code |
| P3 | `-bens-world` / `dam-reading--fallacies` slugs | `rehypeTidyHeadingIds` post-slug pass, collision-safe | `id="bens-world"` in build |
| P3 | Marks read as static highlights | dotted underline + `cursor:help` + early `[!note]` affordance callout in packet | screenshot |

## Carried forward (not fixed)

- Quiz MCQ one-shot + nuclear reset (A P3): allow re-pick / per-question reset — deferred, needs quiz-runner state design.
- A's provocative question: should the quiz implement the chapter's own reject option (send-to-review instead of forced answer, score coverage×error)? Pedagogically lovely; bigger change, parked as an idea.
- Marks' amber (author) vs blue (reader) color semantics still undocumented in-page.
- `no-JS` charts/annotations/quiz: captions SSR but interactivity needs JS — by design.
- RSC payload ~460KB on the route (article+transcript+quiz re-serialized) — informational.

## Skill updates folded in (`.agents/skills/mlsys-study/SKILL.md`)

- charts.json: caption-is-markdown (`*`-bug), caption/data agreement rule,
  stack-adjacent contrast rule + `showValue` labels.
- callouts: same-line-short-title contract; bare marker = no title (renderer
  bug documented as failure mode).
- equations.json: symbol coverage extended to inputs/named/compound terms.
- book-figures.json is THE curated list — no manual packet section.
- Early `[!note]` mark-affordance convention.
- Podcast: spoken-form numbers, transcript-both-copies sync rule.
- New failure modes: `\s*`-crosses-newline, JSON-strings-render-markdown,
  caption-claim-vs-data mismatch.
- Checklist: rendered-caption scan, bare-callout title check, symbol coverage.
