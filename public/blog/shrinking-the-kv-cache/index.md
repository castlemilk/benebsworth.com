---
title: Four ways to shrink a KV cache
date: '2026-06-18T00:00:00.000Z'
description: >-
  A transformer's KV cache is a four-dimensional tensor, and every compression
  trick — quantisation, eviction, cross-layer sharing, linear attention —
  attacks one of its axes. Here is the tour, and the cautionary tale of a tiny
  code model whose accuracy fell 20 points because a smoke test never exercised
  the one axis that bites.
labels: 'software,machine-learning,llm,transformers'
release: true
author: Ben Ebsworth
heroImage: /blog/shrinking-the-kv-cache/hero.webp
takeaways:
  - >-
    The KV cache is a five-axis tensor (2·L·H_kv·T·d·b) where only sequence
    length T grows unbounded — layers, heads, and head-dim are fixed before
    inference starts.
  - >-
    4-bit quantisation of the cache is behaviourally lossless because precision
    was never load-bearing; eviction is what cost 20 points, by dropping the
    prompt once context exceeded the budget.
  - >-
    Three different eviction configs landing on the exact same wrong score
    (37.8%) is the signature of a shared cause: a budget smaller than the
    prompts, not the policy.
  - >-
    Cross-layer sharing and linear attention aren't bolt-on compressions — they
    change what the model computes and score 0% zero-shot, so the redundancy
    must be trained in from the start.
markdown_url: /blog/shrinking-the-kv-cache/
canonical_url: 'https://benebsworth.com/blog/shrinking-the-kv-cache/'
---
## Key takeaways

- The KV cache is a five-axis tensor (2·L·H_kv·T·d·b) where only sequence length T grows unbounded — layers, heads, and head-dim are fixed before inference starts.
- 4-bit quantisation of the cache is behaviourally lossless because precision was never load-bearing; eviction is what cost 20 points, by dropping the prompt once context exceeded the budget.
- Three different eviction configs landing on the exact same wrong score (37.8%) is the signature of a shared cause: a budget smaller than the prompts, not the policy.
- Cross-layer sharing and linear attention aren't bolt-on compressions — they change what the model computes and score 0% zero-shot, so the redundancy must be trained in from the start.

A small Go code model was about to ship with a compressed KV cache. The recipe stacked two tricks, drop most of the cached tokens and store the survivors in 4 bits instead of 16, and on the 15-problem smoke test it was a free lunch: identical pass rate, a cache an order of magnitude smaller. Then the full 164-problem benchmark ran, and the pass rate fell off a cliff: **57.9% to 37.8%**, twenty points gone. Nothing about the model had changed. The compression that was free on fifteen problems was very expensive on a hundred and sixty-four.

The interesting part isn't that the compression broke. It's *which* compression broke, and why the smoke test couldn't see it coming. Quantising the cache to 4 bits turned out to be genuinely free. Throwing tokens away was the part that cost twenty points, and only on the problems the smoke test happened not to contain. To see why, we have to look at what the KV cache actually is, because every way of shrinking it is an attack on a different part of the same object.

> [KvCacheCompressor component] The centrepiece for the KV-cache compression post: frames the cache as a 4-D tensor (2·layers·KV-heads·tokens·head_dim, fp16) and lets the reader select a compression method to see which axis it attacks. Tabs: fp16 (baseline), TurboQuant 4-bit (precision axis — quantise each number to 4 bits), StreamingLLM and H2O (sequence axis — drop middle tokens, keep sinks + recent), Cross-layer sharing/CLA (layers axis), and linear attention/GLA (collapse the sequence into a fixed recurrent state). Selecting a method morphs a schematic of one layer's KV slab, updates a relative-footprint bar, and shows a card with the axis attacked, the keep/drop rule, the cost class (zero-shot lossless vs lossy vs needs-retraining), and the measured HumanEval-X Go pass@1. The rendered post has the live version.

Pick a method in the panel above. Each one shrinks the cache, but each one shrinks a *different axis of it*, and that single fact organises the entire field. Quantisation makes each number smaller. Eviction throws away tokens. Cross-layer sharing reuses one layer's cache for its neighbours. Linear attention refuses to keep a per-token cache at all. Same goal, four completely different bargains. And, as the code model found out, four completely different failure modes. We'll take them one axis at a time.

## What the cache is, and why it grows

When a transformer generates text, it produces one token at a time, and each new token attends to *every* token before it. The naive way to do that would recompute the key and value vectors for the whole sequence on every step: quadratic work, most of it repeated. The KV cache is the standard fix: compute each token's key and value vectors once, when the token first appears, and keep them around. Generation then attends against the cache instead of recomputing it. We're trading memory for arithmetic, and it's one of the best trades in systems. Without it, autoregressive decoding is unusably slow.

The bill arrives as memory. The cache has to hold a key and a value vector for every token, in every attention head, in every layer. Write that down and it's a tensor with a very specific size:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\text{bytes} = 2 \cdot L \cdot H_{kv} \cdot T \cdot d \cdot b
```

$$
\text{bytes} = 2 \cdot L \cdot H_{kv} \cdot T \cdot d \cdot b
$$

For the model in this story (16 layers, 3 key/value heads, a head dimension of 64, in fp16), every term except $T$ is fixed the moment you choose the architecture. $L$, $H_{kv}$, $d$ are baked in. The bytes-per-element $b$ is 2 because the weights are fp16. Only $T$, the sequence length, moves, and it moves *linearly and without bound* as the model generates. A long conversation, a long document, a long chain of reasoning: the cache grows one slab per token until it dominates the memory budget and caps how many requests you can batch. That linear-in-$T$ growth is the whole problem, and it's exactly what the compression methods attack.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Look back at equation (1) and notice how little room there is. $L$ and $d$ are architectural givens. The factor of 2 for K and V is non-negotiable. The head count $H_{kv}$ has *already* been attacked before inference even starts: this model uses **grouped-query attention**, where 12 query heads share just 3 key/value heads. That 4× cut, applied at training time, is why $H_{kv}$ is 3 and not 12. Multi-query attention pushes that to a single shared head. By the time you're choosing an inference-time trick, the heads axis is spent. What's left to attack is the precision $b$, the length $T$, and the layer count $L$, which is exactly the menu.

## The precision axis: TurboQuant

The least invasive thing we can do is keep every token and just store each number in fewer bits. fp16 spends 16 bits on each entry of the cache; most of that precision is probably wasted, because the values in a small group cluster tightly and a coarse grid would land close enough. Quantisation replaces each number with an index into $2^{\text{bits}}$ evenly-spaced levels spanning the group's range, plus a per-group scale to reconstruct it.

> [KvQuantDial component] A TurboQuant quantisation explainer. Shows a 16-value group of cached numbers; a bit-width selector (fp16 / 8-bit / 4-bit) draws the quantisation grid and snaps each value to its nearest of 2^bits levels, drawing the residual error; a "rotate" toggle applies a fixed orthogonal (Hadamard) rotation that spreads a lone outlier across the group so the same levels land closer to every value — the trick that makes 4-bit essentially lossless. Read-outs: bits per value (including the per-group scale overhead at group size 32), memory ratio, and mean reconstruction error. The rendered post has the live version.

Drag the bit selector. At 8 bits the 256 levels sit so close to the originals that the error is invisible. At 4 bits, only 16 levels, you'd expect trouble, and you get it *if one value is an outlier*: a single large number stretches the range, the levels spread out, and every small value quantises badly. That's what the **rotate** toggle fixes. Multiplying the group by a random orthogonal matrix spreads one value's magnitude across all of them without changing the vector's length, so the range shrinks and the same 16 levels land close to everything. Rotate, then quantise per group: that's the core idea behind TurboQuant.[^turboquant]

The memory math is direct. Going from 16 bits to 4 is a 4× cut on the codes themselves; the only overhead is a per-group scale and zero-point, shared across a group of 32 values, which adds about one bit per value:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{4 + \tfrac{32}{32}}{16} \approx 0.31 \;\Rightarrow\; \approx 3.2\times \text{ smaller}
```

$$
\frac{4 + \tfrac{32}{32}}{16} \approx 0.31 \;\Rightarrow\; \approx 3.2\times \text{ smaller}
$$

And the accuracy cost? On the full benchmark, 4-bit quantisation alone scored **58.5%** against the baseline's **57.9%**: 96 problems solved versus 95. That's not a real improvement; it's one problem out of 164, comfortably inside run-to-run noise. But it is decisively *not* a regression. Quantising the cache to a quarter of its size changed nothing the benchmark could measure.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

"Lossless" here doesn't mean bit-identical. The reconstruction error in the panel above is real. It means *behaviourally* lossless: the model solves the same problems. When a 4× memory cut moves your score by a single problem out of 164, the honest reading is that the precision was never load-bearing. Most of those 16 bits were storing noise. This is the comfortable result, the one we hope for, and it makes the contrast with the next axis all the sharper.

## The sequence axis: eviction, and the attention sink

The length axis is more tempting and more dangerous. $T$ is the term that grows without bound, so capping it caps the cache. Eviction does exactly that: keep a fixed budget of tokens and throw the rest away. The question is *which* tokens.

The naive answer, keep the most recent ones and slide a window, fails badly, and the reason is one of the more surprising findings in the field. Language models dump a huge fraction of their attention onto the *first* few tokens of the sequence, almost regardless of content. These **attention sinks** act as a kind of no-op bucket the softmax can park probability in when no real token deserves it; evict them and the attention distribution destabilises and generation falls apart. StreamingLLM's recipe follows directly: keep a handful of sink tokens at the very start, plus a sliding window of recent tokens, and drop the middle.[^streaming] (A no-op bucket the model leans on this hard is worth a moment's pause.)

> [KvEvictionWindow component] The eviction failure-mode animation. Plots a token sequence (prompt + generated) along a token axis and shades what a streaming/H2O KV cache keeps (4 attention sinks + a recent window of budget−4 tokens) versus evicts, as generation advances. Controls: budget (64 / 256 / 512), prompt length, a generation scrubber + play, and a streaming/H2O policy toggle. The verdict line states whether the whole prompt is still cached: once the context length (prompt + generated) exceeds the budget, the prompt body scrolls out of the recent window and is evicted — the model writes code for a problem it can no longer see. The rendered post has the live version.

The widget shows the bargain. Four sink tokens are pinned at the head; a recent window of `budget − 4` tokens rides the generation frontier; everything between them is evicted. H2O refines this by also pinning a few "heavy hitter" tokens from the middle, the ones with the highest accumulated attention, but the budget is the same.[^h2o] Press **generate** and watch the window slide. As long as the whole sequence fits inside the budget, nothing is lost. But push the prompt length up or let generation run, and the moment the context exceeds the budget, the recent window's left edge marches *past the end of the prompt*. The prompt body falls into the evicted region. The model is now generating code for a problem it can no longer see.

That is the failure, stated precisely. The cache keeps the sinks $[0, 4)$ and the recent window, so the entire prompt survives only while

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
T_{\text{prompt}} + T_{\text{generated}} \;\le\; B
```

$$
T_{\text{prompt}} + T_{\text{generated}} \;\le\; B
$$

For a short prompt with a short answer, that inequality holds for the whole run and eviction is free. For a real coding problem (a docstring, a signature, some imports, then a hundred-token function body to generate) it stops holding partway through, and the prompt scrolls out of memory mid-generation. The budget, not the policy, is what decides. That'll matter a lot in a moment.

## The collapse, and the attribution

So the compound recipe, eviction at a 256-token budget plus 4-bit quantisation, lost twenty points on the full benchmark. The natural suspect is the 4-bit quantisation; aggressive low-precision *feels* like the risky move. The way to find out is to take the compound apart and run each piece alone, so let's do that.

> [KvAblationLedger component] The attribution payoff chart. Lists every config from the compound-compression ablation as a pass@1 bar (exact counts out of 164) against the fp16 baseline, grouped as: quantise-only (8-bit and 4-bit sit on the baseline — lossless), evict @ budget 256 (streaming, H2O, and streaming+quant all collapse to the same 37.8% — so the budget is the cause, not the policy or the quantisation), evict @ budget 512 (recovers to baseline; streaming-512 + 4-bit is the recommended best), and needs-training (cross-layer and linear-attention collapse to 0% zero-shot). A toggle switches the bars to relative cache footprint. The rendered post has the live version.

Read down the **evict @ 256** group. Streaming at budget 256, H2O at budget 256, and streaming-plus-4-bit-quant all land on *exactly* 37.8%: 62 problems out of 164, to the problem. Quantisation adds nothing to the drop (it scores 58.5% on its own). A smarter eviction policy adds nothing either (H2O matches streaming exactly). The only thing those three configs share is the budget. Now read the **evict @ 512** group: doubling the budget to 512 recovers the full baseline, 57.9%, and the recommended streaming-512-plus-4-bit config sits at 59.1%, within noise of baseline while shrinking the cache to roughly a fifth.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Three different methods landing on exactly the same wrong number is not a coincidence. It is the signature of a cause they all share, and the only thing they shared was a budget smaller than the prompts.

This is the clean part of the story. A controlled ablation, three independent knobs, and the degradation tracks exactly one of them. The twenty-point drop was never about precision. It was about a budget that was smaller than the problems, evicting the problem statement before the model had finished answering it.

## Why the smoke test lied

Which leaves the real question: how did fifteen problems show this as a free lunch? The answer's in the one thing the smoke test never did. It never made the cache overflow.

> [KvContextHistogram component] Shows why the 15-problem smoke set was blind. A histogram of measured prompt lengths (tokens ≈ chars/4): the smoke set (15 problems, all under 48 tokens) overlaid on the full HumanEval-X Go set (164 problems, median ~100, max 334), with a movable eviction-budget line at 256 or 512. The smoke set never crosses 256, so a 256-token budget never evicted anything there. A "generated so far" slider shifts the distribution right (effective context = prompt + output), showing the count of problems that overflow the budget — and lose their prompt mid-generation — climbing far past the 4-of-164 visible at prefill. The rendered post has the live version.

The smoke set's prompts top out at 48 tokens. Sinks plus prompt plus a 64-token answer is barely over a hundred, nowhere near the 256-token budget, so eviction *never triggered*. The trim function looked at every smoke problem, saw it fit, and kept everything. The 15-problem benchmark wasn't measuring lossy compression that happened to be harmless; it was measuring a mechanism that **never ran**. A green light from a test that doesn't exercise the thing under test is not evidence. It's the absence of evidence wearing evidence's clothes.

Drag the **generated so far** slider and the trap becomes visible. At prefill, with nothing generated yet, only 4 of the 164 full-set prompts even exceed 256 tokens, which is why this is so easy to miss by eyeballing prompt lengths. But the cache doesn't stop growing at prefill. Every generated token pushes the *effective* context right, and as the slider climbs, problem after problem crosses the budget line and starts shedding its prompt. The smoke set, meanwhile, never moves off zero. It can't cross a line it starts a quarter-mile short of.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The dangerous failure is not a test that goes red. It's a test that goes green because it never reached the code path that would have failed. Aggressive eviction looked lossless on the smoke set for the same reason a fire alarm looks functional when there's no fire. If you're validating a mechanism, your test set has to *trigger* it: here, that means prompts long enough, and generations long enough, to overflow the budget. Coverage is not how many cases you run; it's how many of the failure modes your cases can actually reach.

## The other two axes, and why they need training

Quantisation and eviction are inference-time tricks: bolt them onto a finished model and they work (or, in eviction's case, work until the budget bites). The remaining two axes aren't so polite.

**Cross-layer sharing** attacks the layer count $L$. Adjacent transformer layers compute surprisingly similar keys and values, so you can compute K and V once and reuse them across a group of layers: halve the layers you store, halve the cache. But "surprisingly similar" is a property a model has to *learn*. Bolted onto this already-trained checkpoint with no retraining, cross-layer sharing collapsed generation to 0%; even several rounds of fine-tuning didn't recover it. The redundancy CLA exploits has to be trained in from the start, not assumed after the fact.

**Linear attention** is the most radical: it attacks $T$ by abolishing it. Instead of caching one entry per token, it folds the whole past into a fixed-size recurrent state, so memory stops growing with sequence length entirely, the real prize for very long contexts. The catch is the same, only harder: a linear-attention layer is a different computation, and loading attention-trained weights into it leaves the layer effectively random. Zero-shot, it scores 0%. It's not a compression you apply; it's a model you train.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

There's a clean gradient here. Attack **precision** (quantise) and the model doesn't notice, because the bits were slack. Attack the **sequence** (evict) and it's free *until* you cross the context the task actually needs, then it falls off a cliff. Attack **layers** or **replace attention**, and you're changing what the model computes, so the model has to be trained for it or it produces nothing. The further the axis is from "redundant storage" and the closer to "load-bearing computation," the more the method costs, and the more a too-easy benchmark will tend to hide that cost.

## What to actually ship

The fix wasn't to abandon compression. It was to use the axis that was free and size the dangerous one to the task. Quantise to 4 bits, because precision was never load-bearing; evict, but with a budget large enough that the running context fits inside it. For this benchmark, a 512-token budget plus 4-bit quantisation matched the uncompressed baseline (97 problems versus 95, noise) while cutting the cache to roughly a fifth.

```yaml
# the recipe that survives the full benchmark, not just the smoke set
use_kv_eviction: true
kv_eviction_mode: streaming   # 4 attention sinks + recent window
kv_eviction_budget: 512       # ≥ prompt + generation for this task
use_turboquant: true
turboquant_key_bits: 4        # quantisation was the free part all along
turboquant_val_bits: 4
```

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Before you believe a compression number, ask three things. **Did the test trigger the mechanism?** Eviction that never overflows isn't being tested. **Can you attribute the result?** Run each knob alone; if a compound moves and you don't know which part moved it, you know nothing. **Is the win inside the noise?** A one- or two-problem swing out of 164 is a wobble, not a gain, so report compression as "matched the baseline at a fifth the size," never as "improved accuracy." Get those three right and the KV cache is one of the most compressible things in the whole inference stack. Get the first one wrong and you'll ship a model that forgets the question.

The KV cache is a tensor with five axes, four of them effectively fixed before you start. The art of shrinking it is knowing which of the remaining ones you're allowed to touch for free, which one will bite the moment your real workload is longer than your test, and which ones aren't compression at all but a different model wearing the same weights. The tiny Go model got there in the end, but only because a hundred and sixty-four problems told it what fifteen never could. The next time a "free lunch" lights up green, that's the question I'll be asking first.

## Reading further

- [Efficient Streaming Language Models with Attention Sinks](https://arxiv.org/abs/2309.17453). Xiao et al., 2023 (ICLR 2024). The attention-sink finding and the sink-plus-recent-window recipe that "streaming" eviction implements.
- [H2O: Heavy-Hitter Oracle for Efficient Generative Inference](https://arxiv.org/abs/2306.14048). Zhang et al., NeurIPS 2023. Eviction by accumulated attention; the "heavy hitter" tokens worth keeping from the middle.
- [SnapKV: LLM Knows What You're Looking For Before Generation](https://arxiv.org/abs/2404.14469). Li et al., NeurIPS 2024. Prompt-side eviction that picks important tokens using an observation window at the end of the prompt.
- [TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate](https://arxiv.org/abs/2504.19874). Zandieh et al., 2025. The rotate-then-quantise vector-quantisation method; KV-cache quantisation is one of its applications. (The experiment here uses a deliberately simplified, uniform-quantisation variant.)
- [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374). Chen et al., 2021. Introduces Codex, HumanEval, and the pass@k metric used throughout.
- [CodeGeeX: Multilingual Benchmarking on HumanEval-X](https://arxiv.org/abs/2303.17568). Zheng et al., KDD 2023. The 164-problem HumanEval set hand-ported to Go and four other languages.

[^turboquant]: TurboQuant (Zandieh et al., 2025) is a general near-optimal vector-quantisation algorithm; KV-cache quantisation is one application of it. The model here implements a *simplified* variant, random orthogonal rotation plus per-group uniform quantisation with the scales kept in full precision, not the full method.

[^streaming]: The "sink" framing comes from StreamingLLM (Xiao et al., 2023). The configuration here keeps 4 sink tokens and a recent window of `budget − 4`.

[^h2o]: H2O (Zhang et al., 2023) is an *eviction* policy that chooses which token entries to keep, not a quantisation method. That streaming and H2O land on the identical score at budget 256 is precisely what isolates the budget, rather than the policy, as the cause.
