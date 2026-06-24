---
title: Backprop is just the chain rule
date: '2026-06-23T00:00:00.000Z'
author: Ben Ebsworth
description: >-
  Training a neural network sounds mystical, but the engine underneath is one
  idea from first-year calculus: the chain rule, applied backwards through a
  computation graph and reusing its work. We trace a forward and backward pass
  through a tiny graph, see why we run it in reverse, and connect it to the
  downhill step that actually does the learning.
labels: 'software,machine-learning,calculus'
release: true
heroImage: /blog/backprop-is-just-the-chain-rule/hero.webp
takeaways:
  - >-
    Backpropagation is the chain rule on a computation graph, made efficient by
    reusing shared subresults. There's no extra magic — 'the network learns' is
    one derivative, computed carefully.
  - >-
    Running it backwards (reverse-mode autodiff) gets the gradient for every
    parameter in a single pass; forward mode would need one pass per parameter,
    which is hopeless at a billion of them.
  - >-
    When a variable feeds several paths, its gradient is the sum over those
    paths. Long products of factors are why gradients vanish or explode — and
    why residual connections and normalisation exist.
markdown_url: /blog/backprop-is-just-the-chain-rule/
canonical_url: 'https://benebsworth.com/blog/backprop-is-just-the-chain-rule/'
---
## Key takeaways

- Backpropagation is the chain rule on a computation graph, made efficient by reusing shared subresults. There's no extra magic — 'the network learns' is one derivative, computed carefully.
- Running it backwards (reverse-mode autodiff) gets the gradient for every parameter in a single pass; forward mode would need one pass per parameter, which is hopeless at a billion of them.
- When a variable feeds several paths, its gradient is the sum over those paths. Long products of factors are why gradients vanish or explode — and why residual connections and normalisation exist.

"The network learns" is one of those phrases that does a lot of quiet work. It makes training sound like something the model *does*, some emergent striving toward correctness. The reality is less mysterious and, to me, more impressive: the whole thing runs on a rule you met in your first calculus class. Backpropagation, the algorithm behind every trained neural network, is the chain rule. That's it. The cleverness is entirely in how it's *arranged* so that computing a billion derivatives costs about the same as computing the answer once.

Let's actually work through it, because the idea is small enough to hold in your hand and it demystifies an enormous amount.

## The setup

A neural network is a giant composition of simple functions: multiply by some weights, add a bias, squash through a nonlinearity, repeat, and at the end compare the output to the truth with a loss. Training means nudging every weight in the direction that lowers that loss, which means we need, for every weight $w$, the partial derivative $\partial L / \partial w$: how much the loss moves when you wiggle that weight.

There can be billions of weights. So the question isn't "can we differentiate this" (the chain rule says yes), it's "can we get *all* those derivatives without doing billions of separate calculations". Backprop's answer is a tidy yes.

## One forward pass, one backward pass

Forget the billion for a moment and take a toy. Here's the expression $e = (a + b)\cdot(b + 1)$ drawn as a graph: inputs at the bottom, operations stacked above. Hit forward to compute the value flowing up; hit backward to compute the gradient of $e$ with respect to everything, flowing down.

> [ComputeGraph component] An interactive computation graph for the expression e = (a + b)·(b + 1), showing that backpropagation is just the chain rule on a DAG (for the "backprop is just the chain rule" post). Inputs a and b feed c = a+b and d = b+1, which multiply into e; a forward/backward toggle switches each node between its value and its gradient ∂e/∂node, with edges labelled by local derivatives. The key beat: because b feeds both c and d, two gradient paths converge on it and its gradient is their sum, ∂e/∂b = d + c. Sliders set a and b. The rendered post has the live version.

Forward is ordinary arithmetic. Backward is the interesting half. We start at the top with $\partial e / \partial e = 1$ and push derivatives down, multiplying by each local derivative as we pass through it. The chain rule, one edge at a time:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{\partial e}{\partial a} = \frac{\partial e}{\partial c}\cdot\frac{\partial c}{\partial a}
```

$$
\frac{\partial e}{\partial a} = \frac{\partial e}{\partial c}\cdot\frac{\partial c}{\partial a}
$$

Now look at $b$ in the diagram. It feeds *two* nodes: it goes into $c = a + b$ and into $d = b + 1$. When you wiggle $b$, both paths to $e$ respond, so its gradient is the **sum over both paths**:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{\partial e}{\partial b} = \frac{\partial e}{\partial c}\frac{\partial c}{\partial b} + \frac{\partial e}{\partial d}\frac{\partial d}{\partial b} = d + c
```

$$
\frac{\partial e}{\partial b} = \frac{\partial e}{\partial c}\frac{\partial c}{\partial b} + \frac{\partial e}{\partial d}\frac{\partial d}{\partial b} = d + c
$$

Toggle to backward and you'll see exactly that: the two highlighted paths into $b$, and its gradient being their sum. That "gradients add over paths" rule is the entire generalisation from single-variable to multi-variable calculus, and it's all backprop needs.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Backpropagation is: do a forward pass and remember every intermediate value; then walk the graph backwards, and at each node multiply the gradient coming from above by the node's local derivative, summing where paths rejoin. The reason it's *fast* rather than just *correct* is reuse. Notice that $\partial e/\partial c$ and $\partial e/\partial d$ both get used again further down: they're computed once and shared, not recomputed for every input. That single act of bookkeeping, caching the shared subresults, is the difference between a derivative you can afford and one you can't.

## Why backwards, specifically

You could apply the chain rule in the other direction, pushing derivatives *up* from each input. That's "forward mode", and it works fine, with one fatal catch: each forward sweep gives you the derivatives of *everything* with respect to *one input*. With a billion inputs (weights) and one output (the loss), you'd need a billion sweeps.

Reverse mode flips it. One backward sweep gives you the derivative of *one output* with respect to *everything*. Since we have exactly one loss and a billion weights, that's precisely the direction we want: a single backward pass, and every gradient falls out at once.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Forward mode is cheap when you have few inputs and many outputs; reverse mode is cheap when you have many inputs and few outputs. Training a network is the extreme of the second case (millions to billions of parameters, one scalar loss), so reverse mode (backprop) wins by a factor of however many parameters you have. This is also why the forward pass has to stash its intermediate activations: the backward pass needs them to compute the local derivatives, which is why training a big model eats so much more memory than just running it.

## From gradient to learning

Backprop only *computes* the gradient. The learning is the next, almost embarrassingly simple step: take a step downhill. For every parameter,

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\theta \leftarrow \theta - \eta\, \frac{\partial L}{\partial \theta}
```

$$
\theta \leftarrow \theta - \eta\, \frac{\partial L}{\partial \theta}
$$

That's the loop: forward pass to get the loss, backward pass to get the gradient, one small step against it, repeat a few million times. The lab below is that downhill step in action on a loss surface. I wrote about [the optimisers that steer it](/blog/learning-by-rolling-downhill/) separately, but it's worth seeing here so the picture is complete: backprop tells you which way is down, and gradient descent walks.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

It's a genuinely tight division of labour. Backprop is pure calculus: given the network and the loss, here is the exact slope. The optimiser is pure strategy: given the slope, here is how big a step to take and how to damp the wobble. Neither knows or cares what the other is doing, which is exactly why you can swap optimisers without touching the differentiation, and why autodiff libraries and optimiser libraries are different libraries.

## Where it goes wrong

The chain rule multiplies. Multiply many numbers below one together and the product rushes to zero; multiply many above one and it blows up. Stack a deep network and the gradient reaching the early layers is a long product of factors, so it tends to either vanish (early layers stop learning) or explode (training diverges). This isn't a bug in backprop, it's backprop working correctly on a badly-conditioned graph.

Most of the architectural furniture of modern networks is really about keeping that product well-behaved: normalisation layers keep the factors near a sane scale, careful initialisation starts them there, and the [residual connections](/blog/a-transformer-reads-everything-at-once/) I went on about in the transformer post add a clean $+1$ path so the gradient has an unbroken route home that doesn't get multiplied to death. Once you see training as a long product of derivatives, half the tricks in deep learning reveal themselves as "stop the product from misbehaving".

Some food for thought: the chain rule is about 300 years old, autodiff as an idea is from the 1960s, and backprop-for-networks was nailed down in 1986. None of the maths is new. What changed is that we got enough compute to run the backward pass over enough data, and the old calculus did the rest. It's a good reminder that the breakthrough isn't always a new idea; sometimes it's an old idea that finally became affordable.

## Recap

Backprop is the chain rule, run backwards through the computation graph, caching shared subresults so the cost stays near that of a single forward pass. Run it once and you get every parameter's gradient; feed those to a downhill step and the network "learns". No striving, no magic, just derivatives and good bookkeeping, which I honestly find more impressive than magic would be.

## Reading further

- **Rumelhart, Hinton & Williams (1986), *Learning representations by back-propagating errors***: the paper that put backprop on the map for neural networks. Short and very readable. [nature.com](https://www.nature.com/articles/323533a0)
- **Olah, *Calculus on Computational Graphs***: the clearest visual explanation of forward vs reverse mode going, and the direct inspiration for the graph above. [colah.github.io](https://colah.github.io/posts/2015-08-Backprop/)
- **Karpathy, *micrograd***: backprop in about 100 lines of Python you can read in one sitting, building exactly the graph machinery above from scratch. [github.com/karpathy/micrograd](https://github.com/karpathy/micrograd)
- **Baydin et al. (2018), *Automatic Differentiation in Machine Learning: a Survey***: the thorough reference once you want the full landscape of autodiff. [arXiv:1502.05767](https://arxiv.org/abs/1502.05767)
