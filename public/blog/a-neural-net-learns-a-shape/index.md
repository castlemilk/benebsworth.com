---
title: A neural network just learns a shape
date: '2026-07-15T00:00:00.000Z'
description: >-
  A classifier doesn't memorise your data, it learns a shape: watch one hidden
  layer bend a straight decision boundary into the curve between two interleaved
  spirals, and see what breaks when you starve it of units or crank the learning
  rate.
labels: 'machine-learning,neural-networks,classification'
release: true
heroImage: /blog/a-neural-net-learns-a-shape/hero.webp
takeaways:
  - >-
    A classifier learns a decision surface, not a lookup table: training carves
    the input space into regions, and prediction is just asking which region a
    new point fell in.
  - >-
    One linear layer can only draw a straight boundary, so XOR and spirals are
    impossible for it; add a single hidden layer of nonlinear units and it can
    stitch straight pieces into any curve (universal approximation).
  - >-
    Supervised and unsupervised learning both partition the same plane, but from
    opposite ends: a network bends a boundary to fit labels, while k-means draws
    Voronoi walls from nearest centroids with no labels at all.
  - >-
    The two classic failure modes are cheap to trigger by hand: too few hidden
    units can't fit the spiral no matter how long you train, and too high a
    learning rate makes the loss diverge instead of descend.
markdown_url: /blog/a-neural-net-learns-a-shape/
canonical_url: 'https://benebsworth.com/blog/a-neural-net-learns-a-shape/'
---
## Key takeaways

- A classifier learns a decision surface, not a lookup table: training carves the input space into regions, and prediction is just asking which region a new point fell in.
- One linear layer can only draw a straight boundary, so XOR and spirals are impossible for it; add a single hidden layer of nonlinear units and it can stitch straight pieces into any curve (universal approximation).
- Supervised and unsupervised learning both partition the same plane, but from opposite ends: a network bends a boundary to fit labels, while k-means draws Voronoi walls from nearest centroids with no labels at all.
- The two classic failure modes are cheap to trigger by hand: too few hidden units can't fit the spiral no matter how long you train, and too high a learning rate makes the loss diverge instead of descend.

## A classifier learns a shape

Here's the claim I want you to test as you read: a classifier doesn't memorise your data. It learns a *shape*. Feed it a pile of labelled points and what it walks away with is a decision surface, a boundary drawn through the input space that separates one class from the other. After training, prediction is almost boring. Drop a new point on the plane and ask which side of the shape it landed on.

The two-input case is the one you can actually see. Every example is an $(x_1, x_2)$ coordinate with a colour, and the network's job is to paint the whole plane so the colours line up with the data. Get the shape right and the boundary threads exactly between the two classes. Get it wrong and points bleed across the line.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The lab on the right is a tiny network learning a hard dataset: two spirals wound into each other. Watch the background. That shading *is* the decision surface, the network's current guess at where one class ends and the other begins. At the start it's close to a flat smear across the plane, because the weights are random and the boundary hasn't learned to bend yet.

Leave it running. The surface warps, folds around one arm, then the other, and the two colours settle into interleaved bands. Nobody told the network "draw a spiral". It found that shape by being punished, over and over, for every point it got wrong.

## Why a straight line isn't enough

Let's start with the simplest classifier we can build: one linear layer. It takes the input, multiplies by some weights, adds a bias, and thresholds the result. Geometrically that is a single straight cut across the plane. Everything on one side is class A, everything on the other is class B.

For a lot of problems that's plenty. But a spiral is not one of them, and neither is XOR (exclusive-or), the smallest hard example in the book. In XOR the two classes sit on opposite corners of a square, so no single straight line can separate them: any line you draw leaves one point stranded on the wrong side. The spiral is XOR's dramatic cousin. The classes interleave so tightly that a straight boundary gets maybe half of them right, which is to say no better than a coin.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This is the whole limitation in one sentence: a single linear layer can only carve the plane with a straight boundary, so any dataset whose classes aren't separable by one straight cut is out of reach. XOR was the counterexample that stalled neural-network research for over a decade after Minsky and Papert pointed it out in 1969. The fix turned out to be almost embarrassingly small.

## One hidden layer, and the line starts to bend

The fix is a hidden layer. Instead of going straight from input to output, route the two inputs through a middle layer of units, each one a little linear cut of its own, then squash each cut through a nonlinear function like $\tanh$. Now the output layer doesn't combine the raw inputs, it combines these bent, warped features. Stack a handful of them and their edges stitch together into a curve. This is a multilayer perceptron (MLP), and the forward pass for a one-hidden-layer version is a single expression.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
a = \sigma\!\left(\mathbf{W}_2\,\tanh(\mathbf{W}_1\mathbf{x} + \mathbf{b}_1) + b_2\right)
```

$$
a = \sigma\!\left(\mathbf{W}_2\,\tanh(\mathbf{W}_1\mathbf{x} + \mathbf{b}_1) + b_2\right)
$$

Read it inside-out. $\mathbf{W}_1\mathbf{x} + \mathbf{b}_1$ is the hidden layer's set of straight cuts. $\tanh$ bends each one into a soft S. $\mathbf{W}_2$ mixes the bent pieces, and $\sigma$ turns the result into a number between 0 and 1. The nonlinearity is the load-bearing part: strip the $\tanh$ out and the whole thing collapses back to one big linear layer, straight line and all. The bend is what lets straight pieces add up to a curve.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Cybenko proved in 1989 that a single hidden layer of sigmoidal units can approximate any continuous function on a bounded region, as closely as you like, given enough units. That's the universal approximation theorem, and it's why the spiral is learnable at all: the curve that separates the two arms is just a continuous function, and one wide-enough hidden layer can bend itself into it. In practice we stack many narrow layers instead of one absurdly wide one, but the existence result is the licence.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## From a score to a probability, and then to a loss

The $\sigma$ at the end is the sigmoid, and it does one job: take any real number and squash it onto the interval $(0, 1)$ so you can read it as "how confident am I this is class 1".

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\sigma(z) = \frac{1}{1 + e^{-z}}
```

$$
\sigma(z) = \frac{1}{1 + e^{-z}}
$$

A score of 0 comes out as 0.5, the "no idea" answer, and lands you right on the boundary. Big positive scores saturate toward 1, big negative toward 0. So the decision surface in the lab is really the contour where $\sigma$ crosses 0.5, the ridge between confident-A and confident-B.

Now we need a way to say how wrong the current shape is, in one number we can push downhill. For yes/no classification that number is the binary cross-entropy (BCE) loss.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\mathcal{L} = -\sum_{i}\big[\,y_i \log a_i + (1 - y_i)\log(1 - a_i)\,\big]
```

$$
\mathcal{L} = -\sum_{i}\big[\,y_i \log a_i + (1 - y_i)\log(1 - a_i)\,\big]
$$

Only one term survives per point. If the true label $y_i$ is 1, you're left with $-\log a_i$, which is near zero when the network confidently says 1 and blows up as it drifts toward 0. If the label is 0, the other term does the same in reverse. The loss is savage about confident mistakes and gentle about hesitant ones, which is exactly the incentive you want: a boundary that's unsure near the messy middle but decisive out in the clear regions.

## Bending the boundary downhill

So we have a shape controlled by 49 numbers, and a loss that scores how badly that shape fits. Training is just the search for the numbers that make the loss small, and the search is the oldest trick going: walk downhill.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\theta \leftarrow \theta - \eta\,\nabla_\theta \mathcal{L}
```

$$
\theta \leftarrow \theta - \eta\,\nabla_\theta \mathcal{L}
$$

The gradient $\nabla_\theta \mathcal{L}$ points in the direction that would *increase* the loss fastest, so you step the other way. Backpropagation, the 1986 result that made this practical, is just the chain rule applied efficiently to hand you that gradient for all 49 parameters in one backward sweep. Each step tugs the weights a little, the shape flexes a little, and the loss drops a little. Do it enough times and the boundary you saw settle in the first lab is the result.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The network never sees a spiral. It sees a number that gets smaller when the shape fits better, and it follows that number downhill until the shape is a spiral.

The lab below is that downhill walk in the abstract: the loss as a landscape, the weights as a ball rolling to the bottom. Every training step of the spiral network is one step on a surface like this, just in 49 dimensions instead of two.

> [LabCanvas component] Inline interactive lab canvas. Embeds any effect registered in `lib/lab/registry.ts` (referenced by its `effect` slug) as a live Canvas2D/WebGL visualisation, with the effect's own controls rendered below unless `controls={false}`. Optional `params` override the effect's defaults and `caption` adds a figcaption. The rendered post has the live, interactive version; this is a static placeholder for the markdown-only sibling — read the matching lab explainer under `/lab/<slug>/` for the full description of what the effect shows.

## The two ways it breaks (and what they cost)

The honest part of any recipe is where it falls over, and this one has two classic failure modes you can trigger by hand in the first lab.

Turn the **hidden units** down toward the bottom of the slider. With only four or six units the network has too few straight pieces to stitch a tight spiral, and it can't fit the data no matter how long you let it run. The loss stalls at a floor well above zero and the boundary stays lumpy, catching one arm and losing the other. No amount of patience buys you a shape the model can't represent. That's the cost of too little capacity: not a slow answer, a wrong one that never improves.

Now put the units back and push the **learning rate** up instead. Small steps crawl but converge. Past a threshold the steps overshoot the bottom of the loss surface, land higher on the far wall, overshoot again, and the loss climbs instead of falling. The shape thrashes and never settles. Same idea as shoving a ball too hard: it doesn't roll to the bottom, it launches out of the valley.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

These two knobs fail for opposite reasons, and the difference matters. Too few hidden units is a *representation* failure: the shape you need isn't in the model's vocabulary, so training converges neatly to the wrong answer. Too high a learning rate is an *optimisation* failure: the right shape is reachable, but the search takes steps so big it steps over the target and diverges. One is "I can't draw that curve", the other is "I can draw it but I keep overshooting the pen". Working out which one you're hitting is half of debugging a model that won't learn.

## Carving the same plane, with no labels at all

Everything so far leaned on labels. Every point came pre-coloured, and the loss measured disagreement with those colours. That's supervised learning, boundary-drawing with an answer key. But you can partition the very same plane without any labels, and the contrast is the point, because it's the same geometry approached from the other direction.

k-means does exactly this. Scatter $k$ centres on the plane, assign every point to its nearest centre, move each centre to the mean of the points it caught, and repeat until nothing moves. There are no classes and no right answers, just structure the algorithm finds on its own. What it carves out is a Voronoi partition: the plane split into cells, each cell the territory closest to one centre.

> [LabCanvas component] Inline interactive lab canvas. Embeds any effect registered in `lib/lab/registry.ts` (referenced by its `effect` slug) as a live Canvas2D/WebGL visualisation, with the effect's own controls rendered below unless `controls={false}`. Optional `params` override the effect's defaults and `caption` adds a figcaption. The rendered post has the live, interactive version; this is a static placeholder for the markdown-only sibling — read the matching lab explainer under `/lab/<slug>/` for the full description of what the effect shows.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Both methods end with the plane cut into regions, but they start from opposite places. The network is *told* the answer and bends its boundary until it matches. k-means is told nothing and lets the data's own clumping decide where the walls go. One minimises disagreement with labels, the other minimises distance to centres. Lloyd's algorithm for this was worked out at Bell Labs in 1957 and didn't see print until 1982, which tells you how long a good idea can sit in a drawer.

The join between the two is the loss landscape. k-means is descending a within-cluster distance; the spiral network is descending cross-entropy; both are the same move, roll the parameters downhill until the shape stops improving. Change what you're measuring and you change what shape falls out, but the engine is identical. Some food for thought next time someone files "supervised" and "unsupervised" in separate drawers.

## Where this goes next

A 2-input, one-hidden-layer net learning a spiral is the whole idea of deep learning at a scale you can watch in one screen. Stack more layers and the bent pieces compose into shapes no single layer could draw. Swap the two inputs for a few thousand pixels and the plane becomes a space you can't picture, but the story doesn't change: it's still a shape being bent downhill to separate one class from another. Next time you meet a classifier with a billion parameters, picture the spiral lab and add dimensions. The maths is the same, only the count is bigger. Play with the sliders above and watch a shape being learned, one downhill step at a time.

## Reading further

- [Cybenko, *Approximation by Superpositions of a Sigmoidal Function* (1989)](https://doi.org/10.1007/BF02551274). Math. Control Signals Systems 2, 303-314. The universal approximation theorem: one hidden layer of sigmoidal units can approximate any continuous function. The licence for everything above.
- [Rumelhart, Hinton & Williams, *Learning representations by back-propagating errors* (1986)](https://doi.org/10.1038/323533a0). Nature 323, 533-536. The paper that made training practical, deriving the backward pass that hands you the gradient for every weight at once.
- [Lloyd, *Least squares quantization in PCM* (1982)](https://doi.org/10.1109/TIT.1982.1056489). IEEE Trans. Information Theory 28, 129-137. The k-means algorithm, written at Bell Labs in 1957 and finally published a quarter-century later.
- [Goodfellow, Bengio & Courville, *Deep Learning* (2016)](https://www.deeplearningbook.org/). Chapters 6 and 8 cover feedforward nets and the optimisation that trains them. Free online.
