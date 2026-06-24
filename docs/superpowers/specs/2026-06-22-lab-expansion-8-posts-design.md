# Lab expansion: 8 new posts (4 desk +1, 4 standout)

**Date:** 2026-06-22
**Branch:** `lab-expansion-8-posts`
**Approved slate (user-confirmed):** 4 per-desk posts + 4 standout posts (transformer + diffusion + JPEG + Game of Life).

## Voice guardrail (load-bearing)

Every post is written in Ben's **curious-engineer notebook** voice (the pre-AI 2019
register), not the polished magazine second-person that recent science essays drifted
into. Concretely: a little "we/let's", honest hedges ("probably", "I think"), one real
labelled aside per post, British/Australian spelling (utilise, optimise, behaviour,
colour, visualise), earned humour, a forward-looking sign-off. Em-dash budget ~1 per
600–800 words. Keep the genuine wins (intuition-first lead, 3–5 callouts + 3–5 numbered
equations, interactive labs woven via `LabSide`). See the writing-blog-posts skill,
"The author's voice".

## The 8 posts

### Centerpiece — the transformer deep-dive
- **Slug:** `a-transformer-reads-everything-at-once`
- **Desk:** software (green) · labels `software,machine-learning,deep-learning,transformers`
- **Thesis (told twice, ELI5 + in-depth):** the novelty is reading every token *at once*
  and letting each one decide what matters (soft, learned routing). Parallel → scalable →
  scale turned "guess the next word" into something that writes code. The surprise is that
  there is no reasoning module: just routing + residual refinement + scale.
- **Must NOT duplicate** the three existing AI posts (attention QKV/softmax/MoE, the zoo
  survey, KV-cache inference). New ground: parallelism vs RNN, embeddings, positional
  encoding, the residual stream, the FFN "thinking" step, stack-and-scale / emergence.
- **New components:** `ParallelismRace`, `EmbeddingSpace`, `PositionalEncoder`,
  `ResidualStream`, `FfnStep`. **Reuse:** `self-attention` lab (LabSide), `AttentionHeatmap`,
  `TokenSampler`.
- **Sources:** Vaswani 2017; Elhage et al. *A Mathematical Framework for Transformer
  Circuits* (residual stream); Su et al. RoPE; Kaplan/Hoffmann scaling laws; Sutton *The
  Bitter Lesson*; Karpathy; Alammar *Illustrated Transformer*.

### Maths +1
- **Slug:** `why-everything-becomes-a-bell-curve` · TOPIC.maths (blue) · labels `mathematics,statistics,probability`
- **Thesis:** add enough independent anythings and the sum is Gaussian — the CLT, and why
  the bell curve is a fixed point, not a coincidence.
- **Reuse:** `random-walk` lab. **New:** `GaltonBoard` (balls → binomial → Gaussian).
- **Sources:** the de Moivre–Laplace theorem; Strogatz; Galton's quincunx.

### Physics +1
- **Slug:** `why-time-only-runs-forwards` · TOPIC.physics (violet) · labels `physics,thermodynamics,entropy`
- **Thesis:** the arrow of time is a counting argument — far more microstates look "mixed"
  than "tidy", so disorder wins by overwhelming probability, not by a law of motion.
- **New lab effect:** `entropy-mixing` (two-colour gas mixing + a live microstate/macrostate
  + entropy readout; reversible micro-rules, irreversible macro-behaviour). **New component
  wrapper** if needed.
- **Sources:** Boltzmann S = k log W; Feynman *Character of Physical Law* ch.5; Sethna.

### Software +1
- **Slug:** `backprop-is-just-the-chain-rule` · TOPIC.software (green) · labels `software,machine-learning,calculus`
- **Thesis:** training is one derivative applied backwards through a computation graph;
  reverse-mode autodiff is the chain rule with shared subresults.
- **New:** `ComputeGraph` (forward values + backward grads flowing through a small DAG,
  step-through). **Reuse:** `gradient-descent` lab (LabSide) to close the loop.
- **Sources:** Rumelhart–Hinton–Williams 1986; Baydin et al. autodiff survey; Olah's calc-on-graphs.

### EE +1
- **Slug:** `why-your-shower-temperature-oscillates` · TOPIC.ee (amber) · labels `electrical-engineering,control,feedback`
- **Thesis:** every thermostat / cruise control / shower is a P-I-D loop fighting dead-time;
  oscillation is proportional gain racing transport lag.
- **Reuse:** `pid-tuner` lab (LabSide). Optional new `ShowerLoop` flavour wrapper.
- **Sources:** Franklin & Powell; Åström & Murray *Feedback Systems*; Ziegler–Nichols.

### Standout — diffusion
- **Slug:** `how-to-paint-with-noise` · TOPIC.software (green) · labels `software,machine-learning,diffusion,generative-ai`
- **Thesis:** image generators learn to *remove* a little noise, then run that backwards from
  pure static; the forward process is fixed, only the reverse is learned.
- **New:** `DiffusionLoop` (forward-noising / reverse-denoising over a tiny image),
  `NoiseSchedule` (β/ᾱ schedule curve).
- **Sources:** Ho et al. DDPM 2020; Song score-based; Karras EDM.

### Standout — JPEG
- **Slug:** `what-jpeg-throws-away` · TOPIC.ee (amber) · labels `electrical-engineering,signals,compression`
- **Thesis:** a photo is mostly invisible high-frequency detail; the DCT sorts a block by
  frequency so quantisation can bin away what the eye can't see.
- **New:** `DctBlock` (8×8 pixel block → DCT coefficients → quantisation dial → reconstruct,
  with live error). Ties to the Fourier/FFT labs.
- **Sources:** Wallace 1991 (the JPEG paper); Ahmed–Natarajan–Rao 1974 (DCT); Pennebaker & Mitchell.

### Standout — Game of Life
- **Slug:** `three-rules-build-a-computer` · TOPIC.software (green) · labels `software,emergence,cellular-automata`
- **Thesis:** three local rules produce gliders, guns, and Turing-completeness — emergence,
  and the limits of prediction (the halting problem in a grid).
- **New:** `GameOfLife` (interactive grid + pattern library: glider, gun, pulsar; draw mode).
- **Sources:** Gardner *Scientific American* 1970; Berlekamp–Conway–Guy *Winning Ways*; Rendell's Life-in-Life.

## Wiring (the three-place sync rule, per post)
1. Component file(s) in `components/mdx/<name>.tsx` (`'use client'`, theme tokens, `not-prose`,
   `useInViewport` + reduced-motion gating, rAF pause off-screen).
2. Lazy export in `components/mdx/lazy-mdx-components.tsx`, then register the key in
   `components/mdx/mdx-components.tsx`.
3. `COMPONENT_DESCRIPTIONS` entry in `scripts/gen-md-siblings.mjs`.
4. `BY_SLUG[slug]` topic entry in `lib/topics.ts`.
5. Hero: `gpt-image-2` (OpenAI key in `~/projects/brandbrain/.env` — cross-project, needs
   user OK + unsandboxed), optimise to webp into both `content/blog/<slug>/` and `public/blog/<slug>/`.

## Publish gate (per post)
`npm run build` green · images mirrored to `public/` · math rendered (`.katex` count) ·
`.md` sibling regenerated · light + dark legible · Playwright DOM check on every interactive ·
frontmatter `title`+`date`+`release: true`.

## Execution order
1. **Transformer post first**, end-to-end → auto-deploy staging (`next.benebsworth.com`) for review.
2. Then the remaining 7; component drafting + per-post source research fan out via subagents,
   prose written by hand in voice; each lands on staging as completed.
3. Heroes generated in one batch near the end (single OpenAI-key permission ask). No prod
   deploys without explicit go-ahead.
