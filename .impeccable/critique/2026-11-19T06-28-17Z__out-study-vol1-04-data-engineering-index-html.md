---
target: study chapter page /study/vol1/04-data-engineering
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-11-19T06-28-17Z
slug: out-study-vol1-04-data-engineering-index-html
---
# Critique — /study/vol1/04-data-engineering/ (study chapter page, Read mode)

Method: dual-agent (A: design review 9198a24d · B: detector+browser 6a43707c)

## Design Health Score — 27/40
| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of status | 3 | scrollspy + quiz progress good; hydration crash gave generic 500 |
| 2 | Match real world | 4 | honest study-loop language, licensing, "score saves locally" |
| 3 | User control | 3 | TOC/prev-next/transcript seek good; glosses hover-only, touch suspect |
| 4 | Consistency | 3 | folio identity strong; accent sprawl + generic chrome in patches |
| 5 | Error prevention | 1 | THREE silent failure modes shipped (chart xPoints, gloss regex, callout kinds) |
| 6 | Recognition > recall | 3 | TOC + inline glosses good, undermined by leaks |
| 7 | Flexibility | 3 | transcript seek, LaTeX copy, Anki export, annotations |
| 8 | Aesthetic/minimal | 3 | fine prose measure; header gauntlet + 26-entry TOC |
| 9 | Error recovery | 1 | 500 boundary had no diagnosis, no degraded chart state |
| 10 | Help/docs | 3 | quiz rules stated; Σ/gloss/annotate all undiscoverable |

## Design specificity verdict
Authored research-folio identity (Source Serif 4 + Caveat + mono chrome, gloss marks, dual-host audio overview, bespoke quiz loop) — clearly not a docs template. But execution was leaky: three render defects made the shipped page look untested, and one made it unviewable.

## Priority issues found (all fixed this pass)
- P0 hydration crash: LINE xPoints were categories ('99%', '0'..'12') → new Date → Intl.RangeError → root error boundary. Found independently by A and B.
- P1 gloss regex `(.*)` tail can't cross \n → 8 marks leaked raw {defs}, 2 in the thesis paragraph.
- P1 [!warning]/[!tip] not in NOTE_KINDS → literal blockquotes.
- P1 authored SVGs light-mode-only → near-invisible on canonical dark; data-cascade text overflowed viewBox.
- P2 TOC rail position:fixed overlapped site footer.
- P2 mobile .ao-controls overflow (transcript pill off-screen); KaTeX display clip (scrolls but no affordance).
- P3 Σ explainer invisible affordance; UNREAD chip ambiguity; concepts index raw LaTeX + dupes; preload warnings; error-template h1→h3 skip.

## Detector
21 findings in components/mdx — all in files NOT imported by this page (layout-transition, side-tab). Overlay injection succeeded (1 anti-pattern on the error template itself).

## Persona red flags (worst)
Power-reader: page 500s on load = dead end; hover-locked glosses beat Ctrl-F. Learner: signature comprehension aids (Σ explainer, glosses) are undiscoverable; mobile transcript unreachable.

## Open questions recorded
1. If the packet renderer can't survive one bad chart row, what does "the pipeline is the build" imply for packet CI (visual-diff gate)?
2. Seven comprehension modes surface at once — is there a confident primary path?
3. Three partial definition surfaces (gloss hover, glossary, concept index) — one primitive?
