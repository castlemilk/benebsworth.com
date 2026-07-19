# Design: Kimi K3 blog trilogy (2026-07-19)

Status: approved design, pending spec review
Author: Ben + agent

## Goal

Ship three new interactive blog posts that capitalise on launch-week interest in Kimi K3 and on work this site already has:

1. `how-kimi-k3-works` — architecture explainer (KDA, AttnRes, Stable LatentMoE, systems).
2. `benchmarking-kimi-k3` — our own live benchmark results and what it took to get them.
3. `delta-rule-linear-attention` — the mechanism under KDA, from quadratic attention to the delta rule.

Each post follows the established house format: MDX in `content/blog/<slug>/index.mdx`, mirrored assets in `public/blog/<slug>/`, registered interactive components, hero image, takeaways, "Reading further" citations, and the publish gate from `writing-blog-posts`.

## Sources (accuracy contract)

- [Kimi K3 blog post](https://www.kimi.com/blog/kimi-k3) — architecture, pricing, case studies, limitations. **Only claims present here may be stated as fact about K3.**
- [Kimi K3 quickstart](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart) — API details (max thinking, 131,072 default completion tokens, fixed temperature 1.0/top-p 0.95).
- `lib/lab/llm-benchmark/results.json` — our measured data (fair 5-iteration sweeps of kimi-k2.7 and kimi-k3, plus single/partial runs of gemini-3.5-flash-agy and codex-gpt-5.5).
- DeltaNet lineage for post 3: Schlag et al. 2021 (DeltaNet), Yang et al. 2024 (Gated DeltaNet). Claims about KDA itself must come from the K3 blog; deeper mechanism is presented as "the family KDA belongs to", clearly signposted as such.
- Existing posts to cross-link, not repeat: `a-transformer-reads-everything-at-once`, `attention-from-the-inside-out`, `shrinking-the-kv-cache`, `why-thinking-longer-makes-models-smarter`, `the-loop-that-beats-attention` (Mamba/SSM coverage).

Rules: no invented benchmark numbers, no invented K3 parameter counts beyond the blog (2.8T total, 16/896 experts, 1M context, ~2.5× scaling efficiency vs K2). Any illustrative component numbers are labelled "illustrative" in the component, mirroring the `MoEBlock` convention.

## Shared conventions

- Frontmatter: `title`, `date` (2026-07-19, staggered 09:00/10:00/11:00 UTC so ordering is deterministic), `description`, `labels`, `release: true`, `heroImage`, `takeaways` (3–4 declarative claims each).
- Labels: post 1 `software,machine-learning,deep-learning,llm`; post 2 `software,machine-learning,llm,benchmarking`; post 3 `software,machine-learning,llm,sequence-models,mamba`-adjacent (reuse `llm,sequence-models` pattern from the-loop post).
- `lib/topics.ts` `BY_SLUG`: add all three slugs → `TOPIC.software` (green desk, matching the other LLM posts).
- Voice: per the skill — curious engineer's notebook, "we/let's", hedged body, British spelling, em-dash budget (~1 per 600–800 words), 3–5 `<Callout>`s per post, 3–5 numbered `<Equation>`s for the derivation-heavy post 3.
- Hero images: one per post, generated with `gpt-image-2` using the project `.env` `OPENAI_API_KEY` (no cross-project credential read needed), landscape 1536×1024, strict no-text clause, converted to webp q80 into BOTH `content/blog/<slug>/` and `public/blog/<slug>/`. Distinct visual metaphors:
  - Post 1: a vast dark hall of 896 small dormant cells, one aisle of 16 lit, a single token of light walking the aisle.
  - Post 2: a row of browser windows on a lab bench, each running a different glowing experiment, one window cracked (the failed run).
  - Post 3: a quill writing onto a stone tablet that edits one carved line instead of copying the whole tablet (delta update vs full rewrite).
- `scripts/gen-md-siblings.mjs` `COMPONENT_DESCRIPTIONS`: add entries for every new component (sync rule), then run `npm run md:siblings`.

## Post 1 — `how-kimi-k3-works`

Title: "How Kimi K3 works: 2.8 trillion parameters, 16 experts awake"
Description: "Kimi K3 is the first open 3T-class model: 2.8T parameters, a 1M-token context, and only 16 of 896 experts active per token. We take the architecture apart — Kimi Delta Attention, Attention Residuals, and Stable LatentMoE — and what each one buys."

Outline:
1. **Hook** — the paradox: 2.8T parameters but sparse activation; first open 3T-class model; released 2026-07-16, weights due 2026-07-27. `<StatGroup>` with 2.8T / 1M / 16-of-896 / 2.5×.
2. **Why sparse is the point** — reuse `<MoEBlock />` (existing router demo) for total-vs-active accounting; Quantile Balancing (router-score quantiles, no heuristic balancing hyperparameter), SiTU activation, Per-Head Muon — one paragraph each, flagged as "from the blog, report forthcoming".
3. **KDA** — attention's cost shape at 1M tokens (forward-reference post 3); KDA as a gated delta-rule linear attention; the cache consequence: K3's serving cache is not a KV cache, prefix caching needed a new vLLM implementation; >90% cache-hit rate in coding workloads and the $0.30/$3.00 pricing split.
4. **AttnRes** — NEW component `<AttnResDepth />`: earlier blocks as addressable memory; block n issues a query, earlier blocks' outputs are read with α weights instead of the plain residual sum. Contrast against the "residuals accumulate uniformly" mental model.
5. **Systems layer** — MXFP4 weights / MXFP8 activations with quantization-aware training from SFT; fully balanced expert-parallel training (static shapes, no host sync on the critical path); supernode (64+ accelerator) recommendation; Mooncake disaggregated serving.
6. **What it's for + limitations** — short tour of the blog's case studies (MiniTriton compiler, 48-hour chip design, kernel optimization, astrophysics pipeline) and the blog's own caveats: thinking-history sensitivity, excessive proactiveness, UX gap vs the frontier proprietary models.
7. **Reading further** — K3 blog, quickstart, Gated DeltaNet paper, our own benchmark post (post 2).

New component: `components/mdx/attn-res-depth.tsx` — static-step diagram (FlowDiagram-style hand-rolled, no images needed): a vertical stack of blocks, a query from block n, α-weighted edges from earlier blocks, a readout of the retrieved mix. `'use client'`, `not-prose`, theme tokens, mobile-safe, respects reduced-motion (no rAF needed if stepped-by-click).

## Post 2 — `benchmarking-kimi-k3`

Title: "We pointed our own benchmark at Kimi K3 on launch week"
Description: "Our 7-task harness renders what models actually generate in a sandboxed iframe. Running Kimi K3 against K2.7, Gemini and Codex broke the harness three different ways before it produced a fair table — here's the data, and what K3 is actually good at."

Outline:
1. **Hook** — K3 landed 2026-07-16; we already had a benchmark that executes model output live. What does a 2.8T model do to a platformer?
2. **The harness in one minute** — 7 tasks (game, physics, electronics, UI, maths, security), each generated artifact rendered in a CSP-sandboxed iframe; 5 iterations, mean score; link to `/lab/llm-benchmark/`.
3. **How it broke** (the honest middle):
   - 10–15 minute max-thinking generations dying to idle-connection drops → SSE streaming fix.
   - Billing-cycle quota 403 mid-sweep → circuit breaker + merge protection ("an outage says nothing about the model").
   - K2.7 burning its whole 32k completion budget on reasoning and truncating (`finish_reason: 'length'`, empty content).
   - The n=1-vs-n=5 lesson: K2.7's original single-iteration scores weren't comparable to K3's 5-iteration means.
4. **The fair table** — baked-in static table (no live fetch): both models, 7 tasks, scores from `results.json` at spec time (K3: 100/97.5/86.8/84/65/100/100; K2.7: 63/100/96.4/100/35/100/87). `<StatGroup>`: K3 avg ≈ 90.5 vs K2.7 ≈ 83.1; callouts for the three biggest gaps.
5. **See for yourself** — NEW component `<ArtifactFrame taskId modelId />`: embeds the sandboxed static artifact (K3's n-body) inline via `/lab-data/llm-benchmark/outputs/...` (opaque-origin CSP; lazy-loaded iframe), plus links to the full comparison pages.
6. **What we took from it** — K3 dominates the big interactive artifacts; K2.7 stays sharper on terse text/math; per-token cost vs wall-time trade-offs; the harness code is linked.
7. **Reading further** — K3 blog, the lab benchmark, harness skill notes.

New component: `components/mdx/artifact-frame.tsx` — lazy `dynamic(ssr:false)` iframe embed of a benchmark artifact with a caption + "open full page" link; `sandbox="allow-scripts"`; fixed aspect with min-height; reduced-motion respected (shows a play gate like GeneratedDemo).

## Post 3 — `delta-rule-linear-attention`

Title: "The delta rule: how Kimi K3 reads a million tokens"
Description: "Full attention pays an n² bill that a 1M-token context can't afford. Linear attention swaps the bill for a memory you write to — and the delta rule is what makes that memory smart. This is the family Kimi K3's KDA belongs to, from the kernel trick to gated delta updates."

Outline:
1. **The bill** — attention is O(n²) in sequence length; at 1M tokens that's 10¹² pair scores. NEW component `<AttentionCostCurve />`: log-scale quadratic vs linear cost to 1M, with markers at 128K and 1M. Cross-link `a-transformer-reads-everything-at-once` and `shrinking-the-kv-cache`.
2. **The kernel trick** — drop the softmax, factor the sum; attention becomes "read from a matrix memory". 2–3 numbered equations (softmax attention → kernel form → linear recurrence).
3. **Memory you write to** — NEW component `<DeltaMemory />`: write key→value pairs into a small matrix memory, retrieve by query; toggle "additive write" vs "delta rule write" to show how the delta rule *removes the old value before writing the new one* (Schlag et al. 2021), so keys don't smear.
4. **Gating, and where KDA fits** — Gated DeltaNet (Yang et al. 2024) adds a forget gate; KDA is Kimi's production version of this family (the blog names KDA + "hybrid linear attention"); the-loop-that-beats-attention covered the SSM cousins (Mamba) — signposted comparison, not a re-explanation.
5. **The cache consequence** — a fixed-size state instead of a growing KV cache; why prefix caching had to be re-thought for KDA (the vLLM contribution), and the $0.30/MTok cache-hit price that falls out of it.
6. **Reading further** — DeltaNet, Gated DeltaNet, K3 blog, the-loop post, Mamba paper.

New components:
- `components/mdx/attention-cost-curve.tsx` — SVG/canvas log-log curve, quadratic vs linear, hoverable markers; purely presentational (no sim), illustrative units.
- `components/mdx/delta-memory.tsx` — 4-slot memory matrix; user picks a key to write, watches additive vs delta-rule update; step-through, no rAF loop.

## File map

- `content/blog/{how-kimi-k3-works,benchmarking-kimi-k3,delta-rule-linear-attention}/index.mdx`
- `public/blog/<slug>/hero.webp` (+ mirrored in content/)
- `components/mdx/{attn-res-depth,artifact-frame,attention-cost-curve,delta-memory}.tsx`
- `components/mdx/mdx-components.tsx` (4 registrations)
- `scripts/gen-md-siblings.mjs` (4 COMPONENT_DESCRIPTIONS)
- `lib/topics.ts` (3 BY_SLUG entries → TOPIC.software)

## Verification (publish gate)

1. `npm run build` passes; posts appear at `/blog/<slug>/`.
2. All images in both `content/` and `public/`; zero 404s in network tab.
3. All custom tags PascalCase + registered; drift check between `mdx-components.tsx` and `COMPONENT_DESCRIPTIONS` is clean.
4. `.katex` element count matches the number of math blocks in each served post.
5. Playwright DOM checks: each new component renders the expected node counts (16/896 grid cells, curve paths, memory slots); artifact iframe loads with 200.
6. Both light and dark theme legible; mobile 390px no horizontal overflow.
7. `npm run md:siblings` regenerated; `.md` siblings show component placeholders.
8. `npm run typecheck`, `npm run test -- lib/lab/llm-benchmark/` stay green (harness untouched).

## Deployment

`SKIP_ARCHIVE=1 npm run deploy:next` → verify on next.benebsworth.com → `npm run deploy:prod`. Prod currently carries the benchmark release (deployed 2026-07-19); posts ride the same pipeline.

## Out of scope

- No re-run of benchmark models for these posts (data baked from current `results.json`).
- No K3 technical-report claims (not yet published) — the posts say "report forthcoming" where the blog defers details.
- No changes to the harness, lab effects, or benchmark UI beyond the new MDX components.
