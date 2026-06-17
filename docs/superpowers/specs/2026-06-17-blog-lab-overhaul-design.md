# Blog & Lab Overhaul — Design Spec

**Date:** 2026-06-17 · **Branch:** `redesign` · **Status:** approved (shape), Phase 1 in progress

## Goal

Bring the whole content surface of benebsworth.com to flagship quality and grow it:

1. **Refine & clean** every existing blog post and lab (fix real defects, delete dead stubs).
2. **Add 3 new standalone simulations** (lab effects): Gradient Descent, A*/Dijkstra Pathfinder, Reaction-Diffusion.
3. **Write 12 new flagship articles** — 3 each for Maths, Physics, Software, Electrical Engineering — each weaving 2–3 interactive labs/diagrams in the house style.
4. **Extend the `writing-blog-posts` skill** to the operational rigor of Shorted's `newsroom` skill.

Sourced from the owner's own `content/blog/_article-backlog.mdx` (scored 3-axis rubric) + a 13-agent read-only audit (`docs/` not committed; results captured below).

## House quality bar (the template)

The four flagship posts (`smith-chart-is-geometry`, `pll-from-first-principles`, `attention-from-the-inside-out`, `neural-network-zoo-explained`) define the bar:

- Lead with a **counter-intuitive thesis** ("the Smith chart is a picture of a Möbius transform").
- Weave **2–3 labs** via `<LabSide>` at strategic moments (problem → intuition → solution), not one dumped figure.
- **3–5 numbered `<Equation>`** blocks (with `latex` prop for copy buttons) + inline `$…$` elsewhere.
- **3–5 typed `<Callout>`** ("stop, look at this" moments: counter-intuitive result, common mistake, unifying insight).
- **Cross-field connections** (the same math in another domain).
- **Annotated "Reading further"** — canonical textbook + original paper + teaching case, 3–4 links.
- ~2000–2600 words. Both light & dark themes. Diagram-accuracy verified, not eyeballed.

## The 12 articles (approved slate)

| Desk | Article | Thesis | Labs reused | New component |
|---|---|---|---|---|
| Maths | The Lorenz Attractor & the Limits of Prediction | determinism ≠ predictability; Lyapunov stretch-and-fold | lorenz-attractor, double-pendulum, phase-portrait | — |
| Maths | Phase Portraits: see an ODE before you solve it | qualitative behaviour is visible in the vector field pre-solution | phase-portrait, double-pendulum, lorenz-attractor | — |
| Maths | Every Wave Is a Circle: Fourier as epicycles | any periodic signal = stack of spinning circles; Gibbs 9% ringing | fourier-series, wave-superposition, fft-spectrum | — |
| Physics | Every Qubit Gate Is a Rotation | every single-qubit op is a rigid rotation of an arrow on a ball | bloch-sphere | — |
| Physics | Band Gaps Are Just Bragg Reflection | the semiconductor gap is the same interference as X-ray diffraction | band-structure, wave-superposition | — |
| Physics | Normal Modes → Chaos | a coordinate change makes coupled mess into independent modes; breaks past equilibrium | coupled-oscillators, double-pendulum, phase-portrait | — |
| Software | A* Search, Visually | A* = Dijkstra + a bet; the heuristic's admissibility is the whole game | (new sim) | GridSearch = Pathfinder sim |
| Software | How Python Dicts Really Work | open addressing, tombstones, load factor; clustering is the enemy | — | HashTableDemo |
| Software | B-Trees vs LSM-Trees | read/write/space amplification — RUM conjecture; pick your poison | — | StorageEngineSim |
| EE | Every Wire Is an RLC Circuit | there is no digital signal at the physical layer; ringing = RLC step response at 10 GHz | rlc-resonance, transmission-line, smith-chart | — |
| EE | AM, FM, QAM: the modulation zoo | every scheme paints info on a carrier; constellation = packing problem | am-modulation, constellation-plot, fft-spectrum | — |
| EE | Build a Software-Defined Radio in 100 Lines | the antenna is the last analog component; the rest is a for-loop | constellation-plot, fft-spectrum, am-modulation, bode-plotter | IQ waterfall (optional; fft-spectrum can stand in) |

## The 3 new simulations

Lab effects in the existing Canvas2D engine (`EffectModule = { controls, defaults, createRenderer(ctx,dims,theme) → { step(t,p) } }`). Each: effect `.ts` + `lib/lab/registry.ts` entry (LAB_EFFECTS + EFFECT_LOADERS) + `content/lab/<slug>.mdx` explainer.

1. **`gradient-descent`** (category `ai`) — loss-landscape contour with SGD / Momentum / RMSProp / Adam balls racing; controls: optimizer, learning rate, momentum, landscape preset, reset. Fills the empty AI category.
2. **`pathfinding`** (category `engineering`) — A*/Dijkstra/greedy frontier on a maze grid; colour by f-score; open vs closed set; nodes-expanded counter. **Doubles as the GridSearch component** for the A* article.
3. **`reaction-diffusion`** (category `maths`) — Gray-Scott Turing patterns; F/k sliders, diffusion rates, brush, preset (spots/stripes/maze/mitosis). Follow the gold-standard guards from `rlc-resonance` (param-hash reset where relevant).

## Existing-content fixes (Phase 1 cleanup)

**Flagship factual fixes:**
- `smith-chart-is-geometry`: "one full rotation per wavelength" → **half-wavelength**; remove duplicated Eq (1); fix cross-ref ("Walking down the line" → real heading); drop/justify "stereographic projection"; unify `Z₀`/`Γ` typography; un-backtick proper nouns.
- `pll-from-first-principles`: "critically damped ζ=0.5" → **underdamped**; reconcile Eq (4) damping term with ζ; fix cross-ref to non-existent "Bode plot" section; fix tautological pull-quote; soften unsourced "90%".
- `attention-from-the-inside-out`: `W_W` → **`W_V`**; promote the 3 bare display equations to numbered `<Equation>`; tie 46B/1T to a named model or label illustrative; add `author`.
- `neural-network-zoo-explained`: reconcile architecture count; fix LSTM gate-order (i,f,o vs input/output/forget); add Ramsauer 2020 citation; pin date-bound claims ("as of 2026").

**Lab effect bug fixes** (bring up to `rlc-resonance` standard):
- `fft-spectrum`: add bit-reversal permutation; reconcile dB axis vs linear bars.
- `pll-lock-in`: phase detector → `sin(refPhase − vcoPhase)` so it truly locks; auto-retrigger chirp; reset on param change; remove dead `refPhase` buffer.
- `inverse-kinematics`: solve & render in one uniform coordinate system so end-effector reaches target; fix "FABRIK" label (it's closed-form 2R); draw or remove θ₂ arc.
- `pid-tuner`: reset-on-param; clamp output & control traces; auto-retrigger; bump yMax.
- `smith-chart` (effect): clip constant-X arcs to the unit disk; use the real bilinear transform for z/y; fix the fake ring-buffer trail; simplify no-op.
- `band-structure`: implement the 2×2 secular gap (or honestly re-doc the heuristic).
- `am-modulation`: single shared time→x mapping so the envelope hugs the carrier.
- `random-walk`: auto-retrigger at MAX_STEPS; optional re-seed.
- `double-pendulum`: move module-level mutable state into `createRenderer` closure.
- `fourier-series`: remove dead trace ring buffer.

**Explainer fixes:**
- `conformal-grid.mdx`: `map:"exp"` → `"exponential"`; replace the non-existent "Möbius" section with **Joukowski** + **Inversion** (which the effect actually offers); add a "switch the Map dropdown" nudge.
- `double-pendulum.mdx`: `pendulums:5` → `3`; reword caption/body to the real 1–3 range.
- Minor: `orbits.mdx` trail colour, `cyclic-automaton.mdx` missing "Hue base" control, add "Further reading" to `transmission-line`/`am-modulation`, surface `smith-chart` Type modes.

**Broken published posts (must fix — they 404 / show wrong topic live):**
- `using-helm`: write real Helm content (Tiller-free Helm 3, charts, templating, releases); fix `kustomize.webp` → existing `kustomize.jpg`.
- `using-kapitan`: write real Kapitan content (inventory, Kadet, jsonnet, components); fix image ref.

**Command/correctness typos in published posts:**
- `gke-development-auto-scale-down`: `cloud`→`gcloud` ×3; remove dangling backslash.
- `kubernetes-cicd-part-1`: `cd kubernetes-cdcd`→`cicd`; second `git checkout feature/products`→`feature/ratings`; replace `<center>` caption tags.
- `getting-started-with-tekton`: `piVersion`→`apiVersion`.
- `kubernetes-cicd-part-2`: fix malformed `castlemilk/...` link (add `/blob/master/`); note query-param auth removal.

**Algo/frontend fixes:**
- `two-number-sum`: O(n log n) → **O(n)** for the two-pointer scan; `previousNum` list → `set()` for real O(1).
- `common-hooks`: `setCount(count+1)` → `setCount(c => c+1)`; fix ResizeObserver-misattributed-to-IntersectionObserver prose.
- `hello-world`: `overreacted.io` → `https://overreacted.io`; frame Gatsby provenance as historical.

**Deletions (10 confirmed `release:false` empty stubs):** `tekton-pipelines`, `knative-the-good-the-bad-and-the-ugly`, `contact-me-lambda`, `contact-me-cloudfunction`, `join-mailing-list-lambda`, `skaffold-in-action`, `serverless-benchmarks`, `kubernetes-developer-experience`, `managing-istio`, `debugging-istio`. (Keep hidden-but-salvageable: `kustomize-examples`, `kubernetes-cicd-part-3`, `nextjs-starter-project`, `binary-search-tree`, `s3-blog-hosting`.)

## Skill extension (`writing-blog-posts/SKILL.md`)

Add, in newsroom style:
1. **Consolidated MDX Component Palette** table (every registered component | props | when-to-use | reusable/one-off).
2. **THE COMPONENT SYNC RULE** (component file ↔ `mdx-components.tsx` key ↔ `gen-md-siblings.mjs` `COMPONENT_DESCRIPTIONS`) + drift check. **Fix the real drift**: add descriptions for `LabCanvas`, `LabSide`, `PllDiagram`.
3. **Publish gate** — 8 numbered NEVER-ship-without invariants.
4. **Commissioning a post** — the 3-axis score table + per-desk house-angle guide.
5. **Voice & house style** — positive rules + banned-phrases/AI-tells list + pacing note.

## Topic accents

`lib/topics.ts` has no accent for maths/physics/EE science posts (they fall back to teal/orange). Add `maths`, `physics`, `ee` topic markers (or `BY_SLUG` overrides) so the 12 new posts colour-code distinctly. (Low-risk refinement, folded into article wiring.)

## Execution model (conflict-safe)

File-mutating work is **sequenced by shared-file risk**, verified with `npm run build` between stages:

- **Disjoint per-file work** (each post / each effect / each new file) → parallelised via Workflow agents that own exactly one file.
- **Shared files** (`lib/lab/registry.ts`, `components/mdx/mdx-components.tsx`, `lib/topics.ts`, `scripts/gen-md-siblings.mjs`) → wired by the orchestrator directly (surgical, conflict-prone; `git checkout` + re-apply if corrupted, per the skill).
- **Deletions** → done by the orchestrator after release-state verification (destructive).
- **Articles** → per-article pipeline: draft → editorial+factual critique → revise, then orchestrator mirrors images, wires registrations, regenerates `.md` siblings, verifies build.

## Phase plan

**Phase 1 (this session):**
- A. Content & lab fixes + 10 deletions.
- B. Skill extension + sync-rule drift fix.
- C. 3 new simulations (effects + explainers + registry wiring).
- D. 4 articles (1/desk): Lorenz (maths), Qubit=Rotation (physics), A* Search (software, uses sim C2), Every Wire Is an RLC Circuit (EE).
- **Checkpoint:** owner reviews the 4 articles + quality bar.

**Phase 2 (next session):** the remaining 8 articles (Phase Portraits, Fourier; Bragg, Normal Modes; Python Dicts + HashTableDemo, B-Trees + StorageEngineSim; Modulation Zoo, SDR), each with its bespoke components, mirrored images, `.md` siblings.

## Verification (every stage)

`npm run build` passes → serve `out/` → Playwright DOM checks (component counts, `.katex` count = math-block count, cursor-rides-trace, legend matches diagram, traces stay in-box) → both themes → `npm run md:siblings` → spot-check `out/blog/<slug>/index.html`.

## Risks

- **Working tree already has heavy `redesign` WIP** — edits mix with existing uncommitted changes; do not commit unless asked.
- **Shared-file corruption** — mitigated by orchestrator-owned wiring + build between stages.
- **Article quality drift across 12** — mitigated by the staged checkpoint after the first 4.
- **A* article depends on the Pathfinder sim** — build sim C2 before article D-software.
