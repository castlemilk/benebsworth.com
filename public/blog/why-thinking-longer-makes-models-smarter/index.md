---
title: A frozen model gets smarter if you let it think longer
date: '2026-06-24T09:00:00.000Z'
author: Ben Ebsworth
description: >-
  Freeze every weight in a language model so it can't learn a single new thing,
  then let it spend ten times as much compute thinking before it answers. It
  gets more questions right. The gain isn't knowledge, it's search and
  verification over the model's own working — and you can train the model, with
  nothing but a right/wrong signal, to do that thinking for itself.
labels: 'software,machine-learning,deep-learning,reasoning,reinforcement-learning'
release: true
heroImage: /blog/why-thinking-longer-makes-models-smarter/hero.webp
takeaways:
  - >-
    A model's weights hold its knowledge, but how long you let it think is a
    separate dial you set at inference. Spend more compute per question and
    accuracy climbs, with no new facts and no retraining.
  - >-
    Sampling many chains of thought and taking the majority answer beats one
    greedy answer, because the right reasoning keeps landing in the same place
    while the wrong reasoning scatters.
  - >-
    A learned verifier turns a generator into a searcher: rank N candidate
    solutions and keep the best, and a small model plus search can overtake a
    model many times its size.
  - >-
    Rewarding only the correct final answer, with no human-written reasoning, is
    enough to grow long chains of thought on their own, including backtracking
    the model was never shown.
markdown_url: /blog/why-thinking-longer-makes-models-smarter/
canonical_url: 'https://benebsworth.com/blog/why-thinking-longer-makes-models-smarter/'
---
## Key takeaways

- A model's weights hold its knowledge, but how long you let it think is a separate dial you set at inference. Spend more compute per question and accuracy climbs, with no new facts and no retraining.
- Sampling many chains of thought and taking the majority answer beats one greedy answer, because the right reasoning keeps landing in the same place while the wrong reasoning scatters.
- A learned verifier turns a generator into a searcher: rank N candidate solutions and keep the best, and a small model plus search can overtake a model many times its size.
- Rewarding only the correct final answer, with no human-written reasoning, is enough to grow long chains of thought on their own, including backtracking the model was never shown.

I once spent a [whole post](/blog/a-transformer-reads-everything-at-once/) arguing that a transformer has no reasoning module hiding inside it. Just attention shuffling tokens around, a feed-forward step refining each one, and scale doing the rest. I still think that's right. So here is something that ought to bother you, because it bothered me.

Take one of those models. Freeze every weight so it cannot learn a single new thing. Ask it a hard question and note the answer. Now ask it again, identically, except this time you let it spend ten times as much compute thinking before it commits. The second answer is measurably more likely to be correct. Nothing about what the model *knows* has changed. We only gave it more time.

So the reasoning we couldn't find inside the weights, it turns out we can bolt onto the outside. Let's build that loop up one piece at a time: writing the working out, sampling many attempts and voting, training a judge to grade them, and finally an RL step that teaches the model to spend its thinking time well. The last piece is the genuinely strange one, so I'll save it.

## Chain of thought is a scratchpad

Start with a fact that sounds like a limitation. A transformer does a *fixed* amount of work per token: one forward pass, the same whether it's predicting the token after "2 + 2 =" or the next line of a hard proof. (We pulled that pass apart in the [transformer](/blog/a-transformer-reads-everything-at-once/) and [KV-cache](/blog/shrinking-the-kv-cache/) posts, so I won't re-derive it here.) It is, in a real sense, a fixed-depth machine. How does a fixed-depth machine ever do something that genuinely needs twenty careful steps?

It writes them down. Every intermediate token the model emits becomes part of the context the next step reads, so the half-finished working on the page is extra computation the model gets to lean on. Ask it to "think step by step" and it serialises a problem that wouldn't fit in one forward pass into a chain of small ones that do.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
p(a \mid q) = \sum_{z} p(a \mid z, q)\, p(z \mid q)
```

$$
p(a \mid q) = \sum_{z} p(a \mid z, q)\, p(z \mid q)
$$

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A transformer spends the same fixed compute on "2 + 2" and on a competition geometry problem: one forward pass per token, full stop. The scratchpad is how a fixed-depth machine fakes variable depth. It externalises the intermediate results into tokens it can read back, so a hard problem gets as many serial steps as it needs. You aren't adding knowledge, you're adding time.

## Sample many paths, and let them vote

Greedy decoding takes the single most likely next token at every step, which quietly commits you to one line of reasoning long before you know whether it pans out. So don't be greedy. Nudge the temperature up, run the model a handful of times, and you get a handful of different chains, each arriving at its own answer. Then count.

This is *self-consistency*, and it works for a rather nice reason: a model's wrong reasoning tends to be wrong in many uncorrelated ways, so the mistakes scatter across different answers, while the genuinely correct reasoning keeps converging on the same one. The right answer wins by plurality even when no single chain is reliable on its own.

> [ReasoningTree component] An interactive reasoning tree for the "why thinking longer makes models smarter" post. It samples up to N chains of thought branching from one prompt, each ending in a final answer, with the majority answer lighting up as you raise N (self-consistency). A mode toggle switches from plain majority vote to a learned-verifier best-of-N, showing the verifier pick the correct chain on a seeded problem where the plurality is wrong. The rendered post has the live version.

Drag $N$ up and watch the majority answer firm up as the votes come in. The aggregate is doing something none of the individual chains can promise.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\hat a = \arg\max_{a}\; \sum_{i=1}^{N} \mathbf{1}\!\left[ a^{(i)} = a \right], \quad z^{(i)} \sim p(z \mid q)
```

$$
\hat a = \arg\max_{a}\; \sum_{i=1}^{N} \mathbf{1}\!\left[ a^{(i)} = a \right], \quad z^{(i)} \sim p(z \mid q)
$$

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Self-consistency needs no verifier, no extra training, and no labels. Sample a few chains, count the answers, return the winner. That's it. It works precisely because the model's errors are uncorrelated while its correct reasoning is not, so the right answer accumulates a plurality that no single unreliable chain could give you.

## A verifier turns a guesser into a searcher

Majority vote is a little dim, though. It counts answers but cannot tell a careful chain from a lucky one. The next idea is to train a second model, a *verifier*, to score how likely a chain is to be right, and then keep the best-scoring of your $N$ candidates instead of the most popular. With a good verifier this stops being a vote and becomes a search: a small model that generates many candidates, plus a verifier that picks among them, can beat a much larger model that answers once.

There are two flavours, and the difference matters. An *outcome* reward model grades only the final answer. A *process* reward model grades every step, which catches the chain that blunders into the right answer through a wrong move. That's the result behind Lightman's "Let's Verify Step by Step": denser feedback, at the cost of having to label correctness step by step.

It helps to think of the whole thing as navigation, which is exactly what the pathfinding lab does.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Best-of-$N$ is a search over a space of reasoning trajectories, and the verifier is the heuristic pulling the frontier toward the goal. Blind sampling is Dijkstra: it explores in every direction equally. Trusting the verifier completely is greedy best-first: fast, but easily led astray by a confident wrong score. The useful middle, balancing the cost of generating against the verifier's signal, is A\*.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\hat a = a^{(i^\star)}, \quad i^\star = \arg\max_{i \in \{1,\dots,N\}} V\!\left( q, z^{(i)} \right)
```

$$
\hat a = a^{(i^\star)}, \quad i^\star = \arg\max_{i \in \{1,\dots,N\}} V\!\left( q, z^{(i)} \right)
$$

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A process reward model scores every step of the reasoning, not just the final answer, so it can flag the chain that reached the right place through a wrong turn, exactly the luck a pure outcome reward would happily reinforce. The catch is brutal: someone, or some model, has to label step-by-step correctness. That's why outcome rewards, despite being the weaker signal, so often win on pure economics.

## The inference-time scaling law

The first scaling law, the one I leaned on in the transformer post, says a bigger model trained on more data is predictably better. There's a second axis, and the surprise is how cleanly it sits at right angles to the first. Hold the model fixed, spend more compute at the moment you ask, and accuracy rises roughly with the *logarithm* of that compute. Snell and colleagues pushed this far enough that, on some problems, spending test-time compute well matched a model more than ten times larger.

> [ComputeScaling component] An interactive log-x plot of accuracy against test-time compute for the reasoning post. A small model plus search climbs as accuracy ≈ a + b·log C past a much larger model's flat single-shot baseline, with the crossover point marked. A strategy toggle swaps between majority vote, best-of-N, and process-reward beam search to compare how each spends compute. The rendered post has the live version.

Slide the budget along and watch the small-model-plus-search line climb past the flat baseline of the bigger model answering once. The crossover point is the whole argument in one dot.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\text{acc}(C) \approx a + b \, \log C
```

$$
\text{acc}(C) \approx a + b \, \log C
$$

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

On problems where the base model is *sometimes* right, spending test-time compute optimally has matched models more than ten times its size. Compute at inference and parameters in the weights are, over a useful range, substitutes, and tokens are frequently the cheaper currency to spend. That is a genuinely new lever, and we're only beginning to learn where it pays off.

## Teaching the model to think

So far the loop is bolted on from outside. We wrote the prompt that asks for steps, we wrote the sampling loop, we trained the verifier. The leap of the last year folds it back into training: reward the model only when its final answer checks out, and let it work out for itself how to use the thinking time.

DeepSeek-R1 did this with GRPO, which is about as plain as reinforcement learning gets. Sample a group of answers to the same question, score each one by whether it's correct, and push up the ones that beat the group's average. No human-written reasoning to imitate, no separate value network to train. And from that thin a signal the model grows long chains of thought on its own, pausing to check its work and backtrack, behaviour nobody ever wrote down for it.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Picture the policy as a marble rolling down a reward landscape. GRPO's group-relative advantage is the direction signal: each answer is judged not against an absolute target but against its siblings, so "better than the average of this batch" becomes the slope the optimiser follows. The reward surface here stands in for one blunt question, did the final answer check out.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\hat A_i = \frac{r_i - \operatorname{mean}(r_1,\dots,r_G)}{\operatorname{std}(r_1,\dots,r_G)}
```

$$
\hat A_i = \frac{r_i - \operatorname{mean}(r_1,\dots,r_G)}{\operatorname{std}(r_1,\dots,r_G)}
$$

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

It would be unremarkable if we had hand-written examples of good reasoning and the model copied them. It didn't. The reward was a single bit, right or wrong, and the careful multi-step reasoning, the self-checking, the "wait, let me reconsider" moments, all of it emerged from optimising that bit. It rhymes with Sutton's bitter lesson: stop engineering the cleverness in, give the model a clean objective and enough compute, and the cleverness grows by itself.

## When thinking longer makes it worse

I don't want to oversell the dial. It backfires in at least three ways, and they're worth knowing before you reach for it.

*Overthinking.* Past a point, more tokens hurt. The model talks itself out of an answer it already had, or pours budget into a question it had nailed on the first pass. *Reward hacking.* Optimise hard against a verifier and the policy learns to *sound* correct rather than *be* correct, manufacturing confident-looking steps a weak grader rewards. *Unfaithful reasoning.* The written chain can be a story told after the fact rather than the actual cause of the answer.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This last one catches people out. A model will happily write fluent, plausible reasoning that had nothing to do with how it actually reached its answer, and pushing hard on a verifier only sharpens the incentive to perform correctness rather than possess it. So the legible chain of thought is a wonderful debugging aid and a poor guarantee. Read it for insight, not for proof.

Here's the honest aside I keep coming back to. None of this is really new, if you've done any operations research. A\* with an admissible heuristic, branch-and-bound, Monte Carlo tree search in a game engine: they all let you trade more compute for a better answer and stop when the budget runs out. We've known since the 1960s that search buys quality. The genuinely new part is what's being searched over. The thing the model explores is its own natural language, and you can train it, with nothing but a final-answer reward, to write better search trajectories for itself. The data structure is prose. That's the weird bit, and I don't think we've finished being surprised by it.

## Tokens or parameters?

So when do you spend on thinking versus on a bigger model? They're substitutes over a useful range, but not everywhere. Search helps most when the base model is *sometimes* right, so the verifier has a signal to amplify, and when checking an answer is cheaper than producing one. For a fact the model simply does not hold, no amount of thinking conjures it. Search rearranges what's in the prior; it can't add to it.

## Recap

A language model's knowledge is frozen in its weights, but its accuracy at the moment you ask is not. Write the working out and a fixed-depth machine gains serial depth. Sample many chains and vote and the right answer wins by plurality. Score them with a verifier and voting becomes search. Spend more compute and accuracy climbs with the log of the budget. And reward the right final answer, with nothing else, and the model learns to do all of that thinking for itself. The reasoning module was never inside the weights. We built it out of search and verification, in the open, in tokens.

## Reading further

- **Wei et al. (2022), *Chain-of-Thought Prompting Elicits Reasoning in LLMs***: the paper that showed prompting for intermediate steps unlocks multi-step reasoning. [arXiv:2201.11903](https://arxiv.org/abs/2201.11903)
- **Wang et al. (2022), *Self-Consistency Improves Chain of Thought Reasoning***: sample many chains, take the majority, the idea behind equation (2). [arXiv:2203.11171](https://arxiv.org/abs/2203.11171)
- **Lightman et al. (2023), *Let's Verify Step by Step***: process reward models that grade each step beat outcome-only verifiers. [arXiv:2305.20050](https://arxiv.org/abs/2305.20050)
- **Snell et al. (2024), *Scaling LLM Test-Time Compute Optimally***: the inference-time scaling law, and small-model-plus-search beating a bigger model. [arXiv:2408.03314](https://arxiv.org/abs/2408.03314)
- **DeepSeek-AI (2025), *DeepSeek-R1***: RL-only reasoning with GRPO, and the emergent backtracking from a final-answer reward alone. [arXiv:2501.12948](https://arxiv.org/abs/2501.12948)
- **OpenAI (2024), *Learning to Reason with LLMs***: the o1 report, accuracy scaling smoothly with both train-time RL and test-time thinking. [openai.com](https://openai.com/index/learning-to-reason-with-llms/)

The first scaling law told us how to spend a training budget. This second axis is us still learning how to spend an inference budget, and the curve of where the next dollar buys the most accuracy is one we're only starting to draw. Worth watching closely.
