---
title: 'How Kimi K3 works: 2.8 trillion parameters, 16 experts awake'
date: '2026-07-19T09:00:00.000Z'
description: >-
  Kimi K3 is the first open 3T-class model: 2.8T parameters, a 1M-token context,
  and only 16 of 896 experts active per token. We take the architecture apart:
  Kimi Delta Attention, Attention Residuals, and Stable LatentMoE, plus what
  each one buys.
labels: 'software,machine-learning,deep-learning,llm'
release: true
heroImage: /blog/how-kimi-k3-works/hero.webp
takeaways:
  - >-
    Kimi K3 is 2.8T parameters but activates only 16 of 896 experts per token:
    capacity and compute are finally separate dials, worth ~2.5x the scaling
    efficiency of K2.
  - >-
    KDA replaces full attention's growing bill with a fixed-size memory, and it
    changes serving too: cached input is $0.30/MTok against $3.00 uncached.
  - >-
    Attention Residuals let blocks retrieve from earlier depth selectively
    instead of inheriting one uniform residual stream.
  - >-
    It ships with honest caveats: keep the thinking history intact, expect it to
    take initiative, and the very top proprietary models still lead it.
markdown_url: /blog/how-kimi-k3-works/
canonical_url: 'https://benebsworth.com/blog/how-kimi-k3-works/'
---
## Key takeaways

- Kimi K3 is 2.8T parameters but activates only 16 of 896 experts per token: capacity and compute are finally separate dials, worth ~2.5x the scaling efficiency of K2.
- KDA replaces full attention's growing bill with a fixed-size memory, and it changes serving too: cached input is $0.30/MTok against $3.00 uncached.
- Attention Residuals let blocks retrieve from earlier depth selectively instead of inheriting one uniform residual stream.
- It ships with honest caveats: keep the thinking history intact, expect it to take initiative, and the very top proprietary models still lead it.

Kimi K3 is a strange thing to hold in your head. It is the largest open model yet released, by a wide margin, and yet a single token passing through it touches only a small fraction of its weights. Capacity and compute, two numbers that used to be welded together, have come apart.

The facts, from [Kimi's announcement post](https://www.kimi.com/blog/kimi-k3): K3 is a 2.8T-parameter model with native vision and a 1-million-token context window, launched this month (July 2026), and "the world's first open 3T-class model". The full model weights will be released "by July 27, 2026", with a technical report to follow. Kimi has been creeping up on this for a while: for nine of the past twelve months, its models have set the upper bound of open-model sizes.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

2.8 trillion parameters, and most of them are asleep.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

So how do you actually build something like this? Three pieces carry the design: a sparse mixture of experts (MoE) that picks which 16 experts wake up, a linear-attention mechanism called Kimi Delta Attention (KDA) that makes a million tokens affordable, and Attention Residuals (AttnRes), a change to how information flows between layers. Let's take them in that order.

## Why sparse is the point

A dense model spends every parameter on every token; a sparse one refuses to. In a mixture-of-experts transformer block, each token still flows through the shared attention, but then a router scores the feed-forward experts and only the top few run. The rest stay in memory, holding capacity but doing no maths. The demo below is the toy version we built for an earlier post: 64 experts, top 2 per token.

> [MoEBlock component] Interactive Mixture-of-Experts diagram for the "where the parameters live" section. Shows a token flowing through the shared attention block, a router/gate that selects 2 of 64 expert FFNs per token, and the combine→output path. The 64 experts render as an 8×8 grid; the 2 selected experts light up (anime.js stagger + glow) and routing lines draw in from the gate (anime.js line-drawing). A three-cell parameter accounting below shows total params (≈1T, all experts + shared), active-per-token params (≈46B, shared + 2 experts), and the resulting sparsity (~5%). The numbers are illustrative but calibrated (64 × 15B experts + 16B shared, top-2) to reproduce the 46B-active / 1T-total ratio of the DeepSeek-V3 / GLM / Kimi model class. Auto-advances to a new token (new expert pair) every couple of seconds. The rendered post has the live version.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Our demo routes 2 of 64 experts (about 3%); K3 routes **16 of 896**, under 2%. The ratio is the point, not the count: most of the network sits idle for any given token, and the router decides, per token, which slice wakes.

The payoff is accounting. Kimi's blog says K3 effectively activates 16 of 896 experts under its Stable LatentMoE framework, so each token pays for the shared weights plus a thin slice of the routed ones:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
P_{\text{active}} \approx P_{\text{shared}} + \frac{16}{896}\, P_{\text{routed}}
```

$$
P_{\text{active}} \approx P_{\text{shared}} + \frac{16}{896}\, P_{\text{routed}}
$$

Kimi doesn't publish the split between shared and routed parameters, so treat that as the shape of the bill rather than an itemised invoice. The claimed result, quoting the blog, is "an approximate 2.5× improvement in overall scaling efficiency compared to Kimi K2". In plainer terms: each unit of training compute bought noticeably more capable model than it did a generation ago, and sparsity is the biggest single reason.

## Inside Stable LatentMoE

At this level of sparsity, the blog is blunt that "routing and optimization become first-order challenges". It then names four pieces of machinery that keep training stable at 2.8T parameters. One short paragraph each, and a caveat up front: everything in this section comes from a single paragraph of the announcement, with the technical report forthcoming.

**Quantile Balancing.** Expert allocation is derived "directly from router-score quantiles, eliminating heuristic updates and a sensitive balancing hyperparameter". Reading between the lines, instead of a hand-tuned auxiliary objective nudging tokens away from crowded experts, the allocation rule reads the distribution of the router's own scores. One less hyperparameter to be wrong about, if it works as described.

**SiTU.** The Sigmoid Tanh Unit is a new activation, credited (with Gated MLA) for better "activation control". The name suggests a sigmoid-shaped, tanh-bounded squiggle; what it fixes in practice is presumably activation outliers in the expert layers. Presumably, though. The report will say.

**Per-Head Muon.** Muon is the optimiser Kimi has championed in its recent models; Per-Head Muon "extends Muon by optimizing attention heads independently for more adaptive learning at scale". Rather than one update rule shared across a whole attention layer, each head gets its own optimisation treatment.

**Gated MLA.** Credited with better "attention selectivity". The blog doesn't expand the acronym; MLA usually reads as multi-head latent attention, the compressed-KV attention design, and the "gated" prefix plus its seat next to KDA in the architecture diagram is all we officially know.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Worth repeating: those four paragraphs are all there is. The names are a map of where the detail will land, not the detail itself, and I've flagged the two spots where I've guessed past the text. When the technical report arrives, this section is the first place to re-read.

## KDA: a fixed memory instead of a growing bill

Full attention's cost grows with the square of the context. Every query scores against every key, so a 1M-token context means a trillion pair scores per layer per head, plus a key–value (KV) cache that keeps growing one slab per token. We took that arithmetic apart in [the delta-rule post](/blog/delta-rule-linear-attention/), so the short version will do here: linear attention swaps the growing bill for a fixed-size memory that each token writes to and reads from, and the per-token cost stops depending on how much past there is.

Kimi's quickstart describes KDA as "a hybrid linear attention mechanism", which places it squarely in that family. The architecture diagram seats KDA blocks alongside Gated MLA, so "hybrid" presumably means the two interleaved: cheap linear layers doing the long-range carrying, a few full-quality layers keeping exact recall honest. (Presumably. The delta-rule post separates what's documented from what's inferred.)

The easy bit to miss is what KDA does to *serving*. A recurrent state isn't shaped like a per-token KV cache, so conventional prefix caching, replaying stored KV slabs for a repeated prompt, doesn't apply directly. The blog is upfront that KDA "poses new challenges for conventional prefix caching", and that Kimi has "contributed a corresponding implementation to the vLLM community". The result is "KDA with prefill cache", and it matters enough to show up in the price list: cache-hit input is billed at \$0.30 per million tokens (MTok) against \$3.00 for a cache miss, with output at \$15.00 per MTok. Kimi reports a cache hit rate above 90% in coding workloads, with the official API served by Mooncake's disaggregated inference architecture.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The quickstart's caching story is refreshingly low-ceremony: caching is automatic, "no cache ID, TTL, or extra parameter is required", you just "keep the long prefix unchanged so later requests can automatically attempt a cache hit". At a 10:1 price spread, append-only prompts are worth real money.

## Attention Residuals: reading across depth

The residual stream rarely gets top billing, but it constrains everything. In a standard transformer, each block reads the running vector, adds its contribution, and hands it on. Block n inherits whatever block n−1 happened to pass it, and everything older arrives pre-mixed inside that one vector: uniform accumulation, every earlier block in there somewhere, with no way to ask for one in particular.

Attention Residuals change the inheritance. The blog's claim, in its exact words: AttnRes "selectively retrieves representations across depth rather than accumulating them uniformly".

> [AttnResDepth component] Contrast diagram of residual connections: a plain residual passes only the previous block's output upward, while attention residuals let a block read several earlier blocks' outputs with different weights (alpha), i.e. selective retrieval across depth. Illustrated weights; K3 details pending the technical report.

The mental model we've drawn is a weighted read across depth: block n mixes the outputs of several earlier blocks with learned weights $\alpha$, instead of accepting whatever the previous block handed over.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\tilde{h}_n = \sum_{k=1}^{5} \alpha_k\, h_{n-k}, \qquad \sum_k \alpha_k = 1
```

$$
\tilde{h}_n = \sum_{k=1}^{5} \alpha_k\, h_{n-k}, \qquad \sum_k \alpha_k = 1
$$

Flip the toggle in the figure and the contrast is the whole idea. The plain residual has exactly one wire into block n; the attention version has five, and the stroke widths, $\alpha$ fixed at 0.42, 0.27, 0.16, 0.10 and 0.05, are chosen to look like a sensible recency profile. They are not measured from K3.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Documented: the claim sentence above, and an α symbol sitting on the AttnRes operation in the blog's architecture diagram. Ours: the weighted-mix picture, the five-block window, and the specific weights. If the technical report contradicts the sketch, the sketch loses.

## The systems layer

Two more details from the blog deserve surfacing, because they're about making K3 trainable and servable rather than clever on paper.

First, precision. K3 applies quantisation-aware training from the supervised fine-tuning (SFT) stage onward, using MXFP4 weights with MXFP8 activations "for broad hardware compatibility". The 4-bit weights aren't a compression pass bolted on at export; the model trains with the quantisation in the loop from fine-tuning onwards, which is usually what makes 4-bit weights survivable.

Second, keeping 896 experts busy at once. To stop expert imbalance degrading throughput at large expert-parallel scales, Kimi uses "a fully balanced expert-parallel training method with static shapes and no host synchronization on the critical path", and recommends deploying on "supernode configurations with 64 or more accelerators". Dry sentences, but this is the difference between a model that exists and a model you can afford to serve.

## What K3 is for, and what to watch

The blog's case studies are long-horizon and agentic, and worth a skim in full. The short tour:

- **MiniTriton.** K3 built a compact Triton-like GPU compiler from scratch: a tile-level intermediate representation over MLIR, optimisation passes, a PTX code-generation pipeline. On supported roofline benchmarks it matches or beats Triton and torch.compile, and it sustains end-to-end nanoGPT training.
- **Chip design.** In a single 48-hour autonomous run, K3 designed, optimised and verified a chip for a nano model of its own architecture, using open-source electronic design automation (EDA) tools on the Nangate 45nm library: 4 mm², timing closed at 100 MHz, over 8,700 tokens/s decode throughput in simulation.
- **GPU kernel optimisation.** Given up to 24 hours across four kernel tasks, K3 ran competitive with Claude Fable 5 and ahead of Opus 4.8 and GPT 5.6 Sol in Kimi's own evaluation. The quietly remarkable line: late in K3's development, an early version of K3 "handled the majority of the team's kernel optimization works".
- **I–Love–Q.** Reproducing the I–Love–Q universal relations from computational astrophysics took K3 about two hours, against the blog's estimate of one to two weeks for an experienced researcher: 20+ papers cross-validated, 300+ equations of state evaluated, 3,000+ lines of Python, and inconsistencies in published formulas flagged along the way.

And then, unusually candid for an announcement post, the blog's own three caveats:

1. **Thinking-history sensitivity.** K3 was trained in "the preserved thinking history mode". If your agent harness doesn't pass back all historical thinking content, or you switch to K3 from another model mid-session, "generation quality may become highly unstable". Kimi recommends a verified harness (its own Kimi Code) and not switching mid-session.
2. **Excessive proactiveness.** Long-horizon training means K3 "may make unexpected decisions on the user's behalf" when it hits ambiguity. The blog's remedy is explicit behavioural constraints in the system prompt or in `AGENTS.md`.
3. **The top is still proprietary.** Overall performance "still trails the most powerful proprietary models, Claude Fable 5 and GPT 5.6 Sol", with "a noticeable gap in user experience" alongside.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

If you wire K3 into an agent loop, the thinking history is part of the model's working state, not a debug log you can truncate. Pass it back verbatim, and don't swap models mid-session; both failure modes are called out by name in the blog.

## Reading further

- [Kimi K3](https://www.kimi.com/blog/kimi-k3). The announcement: full benchmarks, the architecture diagram, and the case studies with their videos and numbers.
- [K3 quickstart](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart). The API shape: thinking effort (max only, at launch), automatic context caching, and the limits that matter.
- [Gated Delta Networks: Improving Mamba2 with Delta Rule](https://arxiv.org/abs/2412.06464). Yang, Kautz & Hatamizadeh, 2024. The linear-attention lineage that KDA's name points at.
- [Benchmarking Kimi K3](/blog/benchmarking-kimi-k3/). Our own runs against it, on our own tasks.
- [The delta rule: linear attention for a million-token context](/blog/delta-rule-linear-attention/). The mechanism deep-dive this post deliberately kept short.

The weights and the technical report are due within the week, by July 27. The first thing I'll be checking is how much of the Stable LatentMoE cast survives contact with the ablations, and whether AttnRes really is the weighted read we've sketched. Watch this space.
