---
title: Singular values are stretches you can see
date: '2026-10-24T00:00:00.000Z'
description: >-
  Turn a sphere into an ellipsoid, flatten it into a plane, and watch a matrix
  inverse become a noise amplifier. A spatial guide to singular values.
labels: 'maths,linear-algebra,numerical-methods'
release: true
heroImage: /blog/singular-values-are-stretches/hero.webp
takeaways:
  - >-
    A linear map sends a unit sphere to an ellipsoid whose principal radii are
    its singular values.
  - >-
    Volume preservation does not imply numerical stability: a map can stretch
    one direction and nearly erase another.
  - >-
    A zero singular value removes a dimension, so no inverse can recover every
    input.
markdown_url: /blog/singular-values-are-stretches/
canonical_url: 'https://benebsworth.com/blog/singular-values-are-stretches/'
---
## Key takeaways

- A linear map sends a unit sphere to an ellipsoid whose principal radii are its singular values.
- Volume preservation does not imply numerical stability: a map can stretch one direction and nearly erase another.
- A zero singular value removes a dimension, so no inverse can recover every input.

A matrix can preserve volume while making a measurement much harder to undo. Stretch one axis by 2 and squeeze another by 2: the volume comes back unchanged, but the squeezed direction now needs twice as much amplification on the way out. Push the squeeze far enough and ordinary measurement noise starts running the experiment.

This is the part of the singular value decomposition (SVD) that I find most useful to keep in mind. The notation looks like another factorisation to memorise. The picture is a sphere being stretched. Let's start with the picture and then work back to the notation.

## A sphere is a complete test input

Every point on the blue sphere below is a vector of length 1. The green shape contains the outputs of one linear transformation applied to all those vectors. Drag the scene to inspect its depth. The blue and amber markers track one input and its output as the time control moves.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

Start with **Volume preserved**. The three stretches are 2, 1, and 0.5. Change **Output rotation** and the ellipsoid turns, while its volume factor and condition number stay put. Then choose **Almost singular**. The third dimension becomes a thin sliver, and the condition number rises from 4 to 20.

The sphere is useful because it asks the same question in every direction: what happens to a unit input? A single test vector can miss the direction that a matrix almost destroys. The sphere cannot. This geometric interpretation is also the starting point of [Michael Heath's University of Illinois SVD module](https://heath.cs.illinois.edu/iem/least_squares/svd/).

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The scene shows a family of matrices constructed from known factors. The stretch controls label three axes; they are not automatically sorted from largest to smallest. The condition number always uses the largest and smallest current stretches.

## Rotate, stretch, rotate

For a real matrix, the SVD separates the transformation into two changes of orthonormal coordinates and one diagonal scaling. Here is the familiar formula, with the order made explicit: the rightmost operation acts first.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
A = U\Sigma V^{\mathsf T}, \qquad A v_i = \sigma_i u_i
```

$$
A = U\Sigma V^{\mathsf T}, \qquad A v_i = \sigma_i u_i
$$

The columns of $V$ pick special input directions. The diagonal entries of $\Sigma$ stretch those directions by nonnegative amounts. The columns of $U$ tell us where the resulting axes point in the output space. Orthogonal factors can include reflections as well as rotations; this particular lab uses rotations so that the behaviour is easier to follow.

There is a small trap in the sphere picture. Rotating a featureless sphere changes nothing visible. That does not make $V$ redundant. Paint a latitude grid on the sphere, or track a labelled point, and changing the input basis changes which material point ends up where. The outer shape reveals the stretches and output axes. The correspondence between individual input and output vectors carries the rest of the information.

Our matrix has a fixed 30° input rotation, the three adjustable stretches, and an adjustable output rotation. It is deliberately a small family we can inspect, rather than a general matrix-entry calculator. [Gilbert Strang's MIT lecture](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-6-singular-value-decomposition-svd/) develops the factorisation and its connection to rank-one pieces.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The sphere finds the weak direction that a convenient test vector can miss.

## The ellipse remembers an equation

Suppose the output coordinates are measured along the columns of $U$. An input vector on the unit sphere has squared coordinates summing to 1. Each output coordinate is its corresponding input coordinate multiplied by a singular value, so dividing by the stretch reconstructs the sphere equation.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{y_1^2}{\sigma_1^2}+\frac{y_2^2}{\sigma_2^2}+\frac{y_3^2}{\sigma_3^2}=1
```

$$
\frac{y_1^2}{\sigma_1^2}+\frac{y_2^2}{\sigma_2^2}+\frac{y_3^2}{\sigma_3^2}=1
$$

This version assumes all three singular values are positive. Set **Third stretch** to 0 and we can no longer divide by it. The geometry still makes sense: the sphere maps to a filled elliptical disc in a plane. The two hemispheres can land on the same output, and every input displacement in the missing direction becomes invisible.

That distinction matters. A very small stretch is difficult to invert accurately. A zero stretch is impossible to invert uniquely. More decimal places can help the first problem if the data deserve them; they cannot recover information the measurement never contained.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The flattened view is a rank-two map. Two inputs separated along its null direction have identical outputs. A pseudoinverse can choose one solution, usually the minimum-length one, but it cannot discover the discarded component.

## Same volume, different trouble

Let's use the default stretches as a worked example. Their product is $2\times1\times0.5=1$, so a small input volume keeps its size after transformation. The longest radius is 2 and the shortest is 0.5. Their ratio is 4.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

For an invertible square matrix, the Euclidean condition number compares the maximum forward stretch with the maximum inverse stretch.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\kappa_2(A)=\frac{\sigma_{\max}}{\sigma_{\min}}, \qquad \frac{\|\delta x\|_2}{\|x\|_2}\leq\kappa_2(A)\frac{\|\delta b\|_2}{\|b\|_2}
```

$$
\kappa_2(A)=\frac{\sigma_{\max}}{\sigma_{\min}}, \qquad
\frac{\|\delta x\|_2}{\|x\|_2}\leq\kappa_2(A)\frac{\|\delta b\|_2}{\|b\|_2}
$$

Here $Ax=b$, the matrix is fixed, and we perturb the measured right-hand side by $\delta b$. The inequality is a worst-case bound. It does not say every 1% measurement error produces a 4% solution error. Direction matters, which is exactly what the ellipsoid keeps showing us.

For a more concrete calculation, put an output error of 0.01 along the shortest principal axis. Dividing by 0.5 produces an input error of 0.02 along its corresponding input direction. With **Almost singular**, that same output error becomes 0.1 because the third stretch is only 0.1. We changed no sensor. We changed how much the geometry asks of it.

The same idea appears in fitting a line to data. If the measurements barely distinguish two combinations of coefficients, those combinations lie along a thin direction of the design matrix. A solver can return many digits while the experiment supports very few of them. That is a useful reason to inspect singular values before arguing about the solver.

## Throwing away a direction on purpose

Sometimes the tiny direction contains mostly noise. Then retaining every dimension is the wrong objective. A rank-$k$ approximation keeps the largest singular contributions and discards the rest. With singular values ordered from largest to smallest:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
A_k=\sum_{i=1}^{k}\sigma_i u_i v_i^{\mathsf T}, \qquad \|A-A_k\|_2=\sigma_{k+1}
```

$$
A_k=\sum_{i=1}^{k}\sigma_i u_i v_i^{\mathsf T}, \qquad \|A-A_k\|_2=\sigma_{k+1}
$$

For the default map, dropping the 0.5 direction gives a rank-two approximation with spectral-norm error 0.5. For the almost-singular map, the same rank-two choice costs only 0.1 in that norm. This is the geometric seed of low-rank compression. [Daniel Hsu's Columbia notes](https://www.cs.columbia.edu/~djhsu/CLA/notes/svd.pdf) connect best-fitting subspaces, the decomposition, and its approximation properties.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Small does not automatically mean unimportant. A low-variance sensor direction can contain the signal you care about. Truncation needs a noise model or a task-specific justification, not just an attractive looking spectrum.

An interesting aside: this gives image compression and unstable inverse problems a shared picture. One problem deliberately removes faint directions to save space. The other tries to recover faint directions without amplifying noise too much. The algebra is nearly the same, but the acceptable mistake is different.

Before leaving the lab, predict what **Output rotation** should do to rank, volume, and condition number. Rotate it through 180°. Then try the same experiment with **Flatten to a plane**. The shape moves, but no lost dimension returns. For a next step, compare this thin geometry with the ravines in [learning by rolling downhill](/blog/learning-by-rolling-downhill/), or open the [standalone SVD workbench](/lab/singular-values/) and find a map with volume factor 1 and a larger condition number than the default.

## Reading further

- [MIT: singular value decomposition, Gilbert Strang](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-6-singular-value-decomposition-svd/) introduces the factorisation through its matrix and geometric interpretations.
- [Columbia: singular value decomposition, Daniel Hsu](https://www.cs.columbia.edu/~djhsu/CLA/notes/svd.pdf) gives the best-subspace argument and the low-rank approximation results.
- [University of Illinois: SVD interactive module](https://heath.cs.illinois.edu/iem/least_squares/svd/) provides a complementary two-dimensional experiment with editable matrix entries.
