---
title: A transformer reads everything at once
date: '2026-06-22T00:00:00.000Z'
author: Ben Ebsworth
description: >-
  The transformer's one real trick is reading every token at once and letting
  each decide what matters. We put the whole machine on the bench — embeddings,
  positions, the residual stream, the feed-forward step — and work out why
  reading everything at once was such a departure, and why something so
  architecturally dull keeps getting smarter the more we feed it. With an
  interactive animation for every piece.
labels: 'software,machine-learning,deep-learning,transformers'
release: true
heroImage: /blog/a-transformer-reads-everything-at-once/hero.webp
takeaways:
  - >-
    The transformer's one trick is reading every token at once and letting each
    one decide what matters. That parallelism, not any reasoning module, is what
    made it scalable in the first place.
  - >-
    A block never overwrites the residual stream; it reads a copy and adds to
    it. Attention is the only step that moves information between tokens —
    everything else works on each token alone.
  - >-
    Order is added, not read: a positional fingerprint stamped onto each token's
    vector so a permutation-blind layer can recover where things were.
  - >-
    Stacking the same dull block and making it enormous is what turns 'guess the
    next word' into capability. The genuinely surprising part is how far that
    goes.
markdown_url: /blog/a-transformer-reads-everything-at-once/
canonical_url: 'https://benebsworth.com/blog/a-transformer-reads-everything-at-once/'
---
## Key takeaways

- The transformer's one trick is reading every token at once and letting each one decide what matters. That parallelism, not any reasoning module, is what made it scalable in the first place.
- A block never overwrites the residual stream; it reads a copy and adds to it. Attention is the only step that moves information between tokens — everything else works on each token alone.
- Order is added, not read: a positional fingerprint stamped onto each token's vector so a permutation-blind layer can recover where things were.
- Stacking the same dull block and making it enormous is what turns 'guess the next word' into capability. The genuinely surprising part is how far that goes.

Here's a claim worth testing as you read: the transformer has no real idea what a sentence *is*. It never reads left to right, never builds meaning up word by word the way you're doing right now. It looks at the whole thing at once, lets every word quietly ask every other word *do you matter to me?*, and then repeats that a few dozen times. That's very nearly the whole idea. The part still worth being surprised by is that it turned out to be enough.

A couple of weeks ago I wrote about [attention itself](/blog/attention-from-the-inside-out/): the queries, keys and values, the softmax, the little √dₖ scaling that keeps it trainable. This post zooms out. I want to put the *whole* machine on the bench, work out why reading everything at once was such a departure from what came before, and why something so architecturally dull keeps getting smarter the more we feed it. We'll build it up one piece at a time, and there's a small animation for each piece so you can poke at it rather than take my word for it.

## The thing that was actually new

Before 2017, the obvious way to handle a sentence was to read it in order. A recurrent network (the [RNN and its smarter cousin the LSTM](/blog/neural-network-zoo-explained/)) keeps a running summary in a hidden state and updates it one token at a time, passing the state along like a baton. It works. But it has two problems that turn out to be the same problem wearing different hats.

The first is speed. Because token *t* depends on the state from token *t−1*, you cannot compute them in parallel; you're stuck walking the sentence end to end. The second is distance. For word 1 to influence word 50, its signal has to survive 49 hops down the chain, and in practice it fades. The path between two tokens is as long as the gap between them.

The transformer throws the baton away. Every token looks at every other token *directly*, in a single step, so the longest path between any two of them is one hop instead of *n*. And with no baton to pass, all the positions can be computed at the same time, which happens to be exactly the dense matrix multiply a GPU does best. Press play and watch the difference: the RNN is still crawling along its sentence while the transformer is already done.

> [ParallelismRace component] Animated comparison of an RNN against a transformer over the same sentence. The RNN row shows a hidden-state "baton" crawling one token at a time (sequential, longest path N−1 hops); the transformer row wires every token to every other in a single parallel step (longest path 1 hop). A sequence-length slider widens the gap — the RNN's step count grows with N while the transformer's stays at 1 — illustrating the O(n) vs O(1) path length that let attention be trained efficiently on a GPU. The rendered post has the live, animated version.

That's the trade in one picture. Slide the length up and the RNN's step count climbs with it while the transformer stays at one step, the same wall-clock whether the sentence is three words or three thousand.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Reading in order isn't only a cost; it's also a *hint*. An RNN gets the sequence for free, baked into the shape of the computation. Attention throws that hint away to win the parallelism, so now the model genuinely cannot tell *the cat sat* from *sat cat the* — to a bag of weighted averages they're identical. The rest of this post is, in a sense, the price of that decision: we have to hand order back to the model on purpose, and we have to give it somewhere to do its thinking now that the hidden state is gone.

## First, words have to become numbers

A transformer never sees letters. Text is chopped into tokens (roughly words, sometimes word-pieces) and each token is looked up in a big table to get a vector, a list of a few thousand numbers. That's the only thing the model reads: a stack of vectors, one per token.

The interesting bit is what those vectors learn to mean. Nobody tells the model that a cat is like a dog. But because cats and dogs show up in similar sentences, training nudges their vectors close together, and words used differently drift apart. Meaning becomes *geometry*. Hover the map below; you'll find the animals huddled in one corner, the numbers in another, the royalty off on their own.

> [EmbeddingSpace component] A hand-placed 2-D map of word embeddings showing that meaning is geometry: similar words (cats by dogs, numbers by numbers, kings by queens) cluster together, and directions carry meaning. Hovering a word lights its three nearest neighbours; a toggle draws the king − man + woman ≈ queen analogy as an exact parallelogram (the man→king "royalty" vector copied onto woman lands on queen). The layout is a toy — real embeddings are high-dimensional — but it conveys the shape of the input space the transformer reads. The rendered post has the live version.

The famous party trick is that directions mean things too. The arrow from *man* to *king* is the same arrow as the one from *woman* to *queen*: somewhere in the space there's a direction that means "royalty", and you can walk along it. Hit the button and watch the parallelogram close. Nobody designed that. It falls out of predicting the next word, which I still think is a little bit magic.

## Then order has to be bolted back on

Now the awkward consequence of the callout above. Attention treats its inputs as a *set*: shuffle the token vectors and the output shuffles with them, unchanged. For a model of language that's useless, since *dog bites man* and *man bites dog* had better come out different.

So we stamp each position with a fingerprint and *add* it to the token's vector before anything else happens. The original idea was a set of sine and cosine waves at different frequencies; each position gets a unique pattern, and, handily, nearby positions get *similar* patterns, so "close together" is something the model can read straight off the sum. Drag the slider and watch one position's fingerprint light up.

> [PositionalEncoder component] Two views of positional encoding, the trick that gives a permutation-blind attention layer a sense of order. The sinusoidal view is the classic heatmap (positions as rows, dimensions as columns) of fast-and-slow sine/cosine waves, with a position slider highlighting one row's unique "fingerprint"; nearby positions look alike, distant ones differ. The RoPE view shows three dimension-pairs as clocks rotating by an angle proportional to position, with a ghost arrow for a later token — demonstrating that the angle between two tokens depends only on their relative offset, which is why rotary models extrapolate to longer contexts. The rendered post has the live version.

Modern models mostly use a slicker version called RoPE, which rotates pairs of dimensions by an angle proportional to position instead of adding waves. Flip to the RoPE view: the lovely property is that the angle *between* two tokens only depends on how far apart they are, not where they sit in the sentence. That's a big part of why today's models can be fed documents far longer than anything they trained on without falling over.

## Attention: the one place tokens talk

I won't re-derive attention here, since [the earlier post](/blog/attention-from-the-inside-out/) does that properly. The one-line version is below for completeness, and then I want to make a single point about *where it sits* in the machine, because I think that's the part people miss.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\text{Attention}(Q,K,V) = \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
```

$$
\text{Attention}(Q,K,V) = \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

Here's the live version: each token is a node, and the weights are the flowing connections. The pronoun has to find its noun; a noun wants to be found. Watch which tokens pull hardest on which.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The thing to hold on to is that this is the **only** operation in the entire transformer where information moves *between* tokens. Embeddings are per-token. Positional encoding is per-token. The feed-forward step we're about to meet is per-token. Layer norm is per-token. Attention is the sole moment in the whole stack where *the cat* gets to find out that *it* refers to it. Everything else is each token, alone, thinking about itself.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Once you see attention as the only mixing step, a lot of the engineering makes sense. The reason long contexts are expensive is that this one step compares every token to every other, so its cost grows with the square of the length. The reason the [KV cache](/blog/shrinking-the-kv-cache/) exists, and why so much effort goes into shrinking it, is that this is the only step that has to remember the whole past. Find the one quadratic operation and you've found where all the bodies are buried.

## The residual stream is the real architecture

If attention gets all the headlines, the part that actually makes the thing *trainable* is quieter, and it's the piece I most wish someone had drawn for me early on. Picture each token riding its own lane straight up through the network. That lane is the **residual stream**, and the crucial rule is that a layer never overwrites it. A layer *reads* the current vector, computes something, and *adds* the result back. One transformer block is just two of those read-and-add steps in a row:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\begin{aligned} x &\leftarrow x + \text{Attention}(\text{norm}(x)) \\ x &\leftarrow x + \text{FFN}(\text{norm}(x)) \end{aligned}
```

$$
\begin{aligned}
x &\leftarrow x + \text{Attention}(\text{norm}(x)) \\
x &\leftarrow x + \text{FFN}(\text{norm}(x))
\end{aligned}
$$

Drag the depth slider to stack more blocks, and use the toggle to watch each sublayer do its job: attention reaching *across* the lanes, the feed-forward step working *down* each lane on its own.

> [ResidualStream component] A diagram of the residual stream — the mental model the other AI posts skip. Each token rides its own vertical lane; a block never overwrites the lane, it reads the current vector, computes a sublayer, and adds the result back at a ⊕ junction. Two sublayers per block: self-attention (mixes across lanes — the only place tokens interact) and feed-forward (per-lane, where most knowledge lives). A depth slider stacks more blocks (real models stack dozens), a highlight toggle isolates attention vs FFN, and a play button raises every token's marker up the stack in parallel. The rendered post has the live version.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Because every block adds to the stream rather than rebuilding it, there's an unbroken additive path from the very first embedding all the way to the output. Gradients flow straight back down that path without having to squeeze through every layer's nonlinearity, which is what lets you stack ninety-something blocks and still train the thing. It also means a block can choose to do almost nothing (add a near-zero vector) and politely get out of the way, which early layers often do. The residual stream is less a pipe and more a shared notepad: each block reads it, scribbles an edit in the margin, and passes it up.

## Where the knowledge actually lives

So attention moves information sideways between tokens. The other half of each block, the feed-forward network, is where a token sits and *thinks* about what it just gathered. It's almost embarrassingly plain: blow the vector up into a much wider space, apply a nonlinearity that decides which of those wide features switch on, then squash it back down.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\text{FFN}(x) = W_2\,\phi(W_1 x)
```

$$
\text{FFN}(x) = W_2\,\phi(W_1 x)
$$

Slide the input and watch which hidden units light up. Different inputs fire different combinations, which is the rough mechanism by which facts get stored and retrieved.

> [FfnStep component] A genuine forward pass of a 4→16→4 feed-forward sublayer (the transformer's per-token "thinking" step, where most parameters live). The input vector is projected up into a wider hidden space, gated by an activation (ReLU snaps negatives to zero, GELU eases them — toggleable), then projected back down. Bars show real values from fixed deterministic weights; an input slider shifts the pattern and the readout counts how many of the 16 hidden units fire. The rendered post has the live version.

It looks like the least clever part of the model, and yet roughly two-thirds of the parameters live in these two matrices. When people talk about a model "knowing" that Paris is in France, the best current guess is that the knowing is in here, distributed across which hidden units a "Paris"-ish vector switches on. Attention fetches the right context; the feed-forward step is the lookup table that turns context into content.

## Stack it, then make it enormous

And that's the machine. Embed the tokens, add their positions, then repeat one block (attention to mix, feed-forward to think, both added back to the stream) some number of times, and read a next-token guess off the top. Honestly, written out like that it's a bit of an anticlimax. There's no reasoning engine, no logic module, no place where the cleverness obviously lives. It's the same dull block, over and over.

Which makes the next fact the genuinely strange one. If you take that dull block and make it bigger (more blocks, wider vectors, more data) the loss doesn't plateau where you'd expect. It keeps falling, smoothly, as a power law:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
L(N) \approx \left(\frac{N_c}{N}\right)^{\alpha}
```

$$
L(N) \approx \left(\frac{N_c}{N}\right)^{\alpha}
$$

A straight line on a log-log plot is a quietly astonishing thing to find in a system this complicated. It says: build it ten times bigger and you'll get a predictable amount better, and we mostly don't know where it stops. Somewhere along that line the model stops merely finishing your sentences and starts doing arithmetic you never trained it on, or following an instruction it's seeing for the first time in the prompt. That last one, *in-context learning*, still doesn't have a tidy explanation, and it's the bit I find hardest to be blasé about.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Rich Sutton has an essay every few months I end up re-reading, called *The Bitter Lesson*. The short version: over and over in AI history, the clever hand-built method that encodes what we know about the problem eventually loses to the dumb general method that just scales with compute. The transformer is the cleanest example yet. We didn't teach it grammar or facts or reasoning. We built something that reads everything at once, made it differentiable end to end so it could be trained at scale, and then made it very, very large. The architecture's job, it turns out, was mostly to *get out of the way* of the scaling.

Some food for thought, and I genuinely don't know the answer: a model trained only to guess the next token, with no notion of truth or intent, nonetheless has to model *whatever produced the text* to do that well, and the text was produced by people who do have truth and intent. Does it follow that a good enough next-word guesser ends up with something worth calling understanding, or is that just us seeing faces in clouds? I lean somewhere in the middle on a good day. Worth chewing on, anyway.

## From a vector back to a word

One loose end. The top of the stack gives you, per position, a rich vector. To actually *say* something the model turns that into a score for every word in its vocabulary and samples one. That's the same softmax from the attention equation, now with a temperature knob, and I covered the [sampling knobs in the earlier post](/blog/attention-from-the-inside-out/), so here's the toy to close the loop:

> [TokenSampler component] Interactive next-token sampler for the "Temperature & sampling" section. Renders the model output logits over 8 candidate continuations as horizontal probability bars, plus three sliders: temperature T (divides the logits before the softmax — T→0 is greedy, T→∞ is uniform, exactly analogous to the √dₖ knob in attention), top-k (keep only the k most likely, zero the rest), and top-p / nucleus (keep the smallest set whose cumulative probability ≥ p). A "sample" button draws from the live distribution; anime.js dims the field and pulses the chosen bar. Dimmed rows were truncated by top-k / top-p and can no longer be drawn. The rendered post has the live version.

Turn the temperature down and it plays it safe; turn it up and it gets adventurous and occasionally silly. Then the chosen token gets appended to the input and the whole thing runs again for the next one. That's all "generation" is: this machine, in a loop, one word at a time, which is a funny ending given we started by celebrating that it reads everything at once.

## So, the whole thing in plain words

A transformer turns words into vectors, tells each vector where it sits, then refines them by letting them look at each other (attention) and think on their own (feed-forward), over and over, adding each refinement to a shared running total. Stack that a few dozen times, make it enormous, and a machine whose only goal is guessing the next word turns out to be able to write code, hold a conversation, and surprise the people who built it. The architecture is simple on purpose. The behaviour is not, and we're still working out why.

Next time I want to look at the *other* half of the modern AI story, the image generators, which pull off something that sounds impossible when you first hear it: they paint by removing noise that was never there. Different trick, same flavour of "surely that can't work, and yet". Watch this space.

## Reading further

- **Vaswani et al., *Attention Is All You Need* (2017)**: the paper that dropped recurrence and started all of this. Short, and still the canonical reference. [arXiv:1706.03762](https://arxiv.org/abs/1706.03762)
- **Elhage et al., *A Mathematical Framework for Transformer Circuits* (2021)**: where the residual-stream-as-shared-notepad picture is made precise. If this post's framing clicked, read this next. [transformer-circuits.pub](https://transformer-circuits.pub/2021/framework/index.html)
- **Su et al., *RoFormer: Rotary Position Embedding* (2021)**: the RoPE trick in the positional-encoding section. [arXiv:2104.09864](https://arxiv.org/abs/2104.09864)
- **Kaplan et al., *Scaling Laws for Neural Language Models* (2020)** and **Hoffmann et al., *Chinchilla* (2022)**: where the straight line on the log-log plot comes from, and how to spend a compute budget. [arXiv:2001.08361](https://arxiv.org/abs/2001.08361), [arXiv:2203.15556](https://arxiv.org/abs/2203.15556)
- **Sutton, *The Bitter Lesson* (2019)**: two pages, no equations, and it'll change how you read every result above. [incompleteideas.net](http://www.incompleteideas.net/IncIdeas/BitterLesson.html)
- **Alammar, *The Illustrated Transformer***: the diagrams most people picture when they say "attention". A gentler visual companion to all of this. [jalammar.github.io](https://jalammar.github.io/illustrated-transformer/)
