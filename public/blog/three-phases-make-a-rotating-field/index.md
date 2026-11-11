---
title: Three phases make a rotating field
date: '2026-10-24T00:00:00.000Z'
description: >-
  Three fixed windings produce a magnetic field that rotates at constant
  strength. The useful part is the vector sum.
labels: 'electrical-engineering,motors,power,magnetism'
release: true
heroImage: /blog/three-phases-make-a-rotating-field/hero.webp
takeaways:
  - >-
    Balanced three-phase currents in windings separated by 120 electrical
    degrees create a constant-magnitude rotating field.
  - >-
    The resultant peak is three halves of one phase's peak field in the ideal
    sinusoidal model.
  - >-
    Exchanging two phases reverses the field's direction without changing its
    magnitude.
  - >-
    The rotating field's synchronous speed and an induction rotor's mechanical
    speed are different quantities.
markdown_url: /blog/three-phases-make-a-rotating-field/
canonical_url: 'https://benebsworth.com/blog/three-phases-make-a-rotating-field/'
---
## Key takeaways

- Balanced three-phase currents in windings separated by 120 electrical degrees create a constant-magnitude rotating field.
- The resultant peak is three halves of one phase's peak field in the ideal sinusoidal model.
- Exchanging two phases reverses the field's direction without changing its magnitude.
- The rotating field's synchronous speed and an induction rotor's mechanical speed are different quantities.

Nothing in the stator has to rotate for its magnetic field to go around.

Each winding stays bolted in place. Its current rises, falls, reverses and repeats. Arrange three winding axes around a circle, stagger the three currents by the same angle, and their combined field rotates with constant strength.

The tempting mental picture is that one coil switches on, then the next takes over. That picture gets us started, but it misses the useful part. All three phases contribute continuously. Their changing vector sum is what makes the motion smooth.

## Watch the sum, then inspect the parts

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

The amber, cyan and purple arrows are the individual phase contributions. Each arrow is restricted to a fixed axis. The white arrow is their sum.

Choose **Forward sequence** and scrub the phase slowly. When one coloured arrow reaches zero, the white arrow does not collapse. The other two still add to the same resultant magnitude. The white circle marks that invariant.

Then choose **Reverse sequence**. The amplitudes stay the same, but the order of phases B and C is exchanged. The white arrow goes around the other way. We have changed a connection order, not the geometry of the machine.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The white arrow represents the field axis. It is not a simulated rotor. This distinction matters because a real rotor needs torque, and torque depends on how the rotor interacts with the field.

The coloured loops indicate winding axes in a deliberately simplified three-dimensional arrangement. They are not instructions for winding a motor. Real machines distribute conductors through slots so their air-gap field is closer to sinusoidal than a single concentrated loop would produce.

## Put the spatial angle into the equation

Let the three winding axes be $\alpha_k=2\pi k/3$, with $k=0,1,2$. Their unit vectors point at $0^\circ$, $120^\circ$ and $240^\circ$ in the cross-sectional plane.

For a balanced forward sequence, the field contribution on each axis is proportional to a current with the same phase offset:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
i_k(t)=I_{\mathrm{pk}}\cos(\omega t-\alpha_k),\qquad \alpha_k=\frac{2\pi k}{3}
```

$$
i_k(t)=I_{\mathrm{pk}}\cos(\omega t-\alpha_k),
\qquad
\alpha_k=\frac{2\pi k}{3}
$$

The word *balanced* is doing work. Equal amplitude, equal frequency and the correct phase separation are assumptions. We cannot change one current arbitrarily and expect the constant-magnitude result to survive.

Let $B_0$ be the peak contribution of one phase. Add the three field vectors:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\mathbf B(t)=B_0\sum_{k=0}^{2}\cos(\omega t-\alpha_k)\begin{pmatrix}\cos\alpha_k\\\sin\alpha_k\end{pmatrix}=\frac{3B_0}{2}\begin{pmatrix}\cos\omega t\\\sin\omega t\end{pmatrix}
```

$$
\mathbf B(t)=B_0\sum_{k=0}^{2}
\cos(\omega t-\alpha_k)
\begin{pmatrix}\cos\alpha_k\\\sin\alpha_k\end{pmatrix}
=\frac{3B_0}{2}
\begin{pmatrix}\cos\omega t\\\sin\omega t\end{pmatrix}
$$

We can check that result without trusting a long derivation. At phase zero, the phase currents are proportional to $1$, $-1/2$ and $-1/2$. The first winding contributes $(B_0,0)$. Reversing the other two axis vectors and halving them gives $(B_0/4,-\sqrt3B_0/4)$ and $(B_0/4,\sqrt3B_0/4)$. Their vertical components cancel; their horizontal components add.

The answer is $(3B_0/2,0)$. A quarter-cycle later it is $(0,3B_0/2)$. Between those snapshots, equation (2) traces a circle.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Select **Half field**. The circle shrinks to a resultant magnitude of $0.75B_0$ in the lab's reference units. The relation is linear because this model excludes magnetic saturation.

## Reversing the order reverses the motion

Changing the temporal phase progression from $\omega t-\alpha_k$ to $\omega t+\alpha_k$ gives the same $x$ component and the negative $y$ component. The field follows the same circle in reverse.

That is why exchanging two phases reverses a three-phase motor's commanded field rotation. Cycling all three labels together merely changes the phase origin. Those are different operations.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The windings supply directions. The current timing decides how their sum travels between them.

This is also why a static drawing of three phase arrows can be misleading. If the arrows represent electrical phasors, they rotate together in a mathematical complex plane. If they represent instantaneous physical field contributions, each stays on its own winding axis and changes signed length. The lab uses the second interpretation.

The distinction is small on paper and quite large when writing an animation. Rotating all three physical contribution arrows would teach a different construction.

## Electrical angle is not always mechanical angle

The lab shows one pole pair: a two-pole field. One electrical cycle therefore moves the field axis through one mechanical revolution.

With more pole pairs, the magnetic pattern repeats around the stator. One electrical cycle advances the pattern by a smaller mechanical angle. For $p$ pole pairs and electrical frequency $f$:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
n_s=\frac{60f}{p}=\frac{120f}{P}\quad\mathrm{rpm},\qquad P=2p
```

$$
n_s=\frac{60f}{p}=\frac{120f}{P}\quad\mathrm{rpm},
\qquad P=2p
$$

At $50\ \mathrm{Hz}$, a two-pole field rotates at $3000\ \mathrm{rpm}$. A four-pole field rotates at $1500\ \mathrm{rpm}$. We did not halve the supply frequency in the second example; we doubled the number of pole pairs.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A four-pole motor does not mean four electrical phases. Pole count describes the spatial magnetic pattern. Phase count describes the electrical excitation.

The animation's playback rate is slowed for inspection. It is not a claim that the field in a mains-frequency machine rotates at the speed shown on screen. Phase scrubbing gives a sequence of field snapshots, independent of the wall-clock duration of our demonstration.

## A field still needs something to push

A permanent-magnet rotor can develop torque when its magnetic axis is displaced from the rotating stator field. Under synchronous operation it follows the field at the same average speed, with a load-dependent angle.

An induction rotor works differently. Relative motion between its conductors and the rotating field induces currents. Those currents interact with the field and create torque. At exact synchronous speed in the ideal steady picture, there is no relative motion to induce the rotor currents needed for torque.

For motor operation, the rotor therefore runs a little slower than the field. Slip measures that difference as a fraction of synchronous speed. A hypothetical four-pole motor at $50\ \mathrm{Hz}$ turning at $1440\ \mathrm{rpm}$ has slip $(1500-1440)/1500=0.04$, or 4%. That numerical example describes a possible operating point, not a universal motor rating.

[Kirtley's MIT electric-power notes](https://ocw.mit.edu/courses/6-061-introduction-to-electric-power-systems-spring-2011/pages/readings/) build from winding models to synchronous and induction machines. The extra machinery is necessary if we want current, torque or efficiency predictions. Our vector sum proves the rotating field, and stops there.

## Break an assumption before adding complexity

The next useful experiment would be to weaken one phase independently. The circular tip path would generally become elliptical, with a field magnitude that pulses during the cycle. A decomposition into forward and backward rotating fields makes that unbalanced case easier to analyse.

We have kept that extension out of this lab so the invariant is unambiguous. **Phase field amplitude** scales all three phases together. **Phase sequence** changes only their order. Neither control introduces an unbalance.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Pause at phase zero and add the three coloured vectors by hand. Repeat at a quarter-cycle. Keep the timeline there and change Phase sequence from +1 to −1, then check which component changes sign. These three snapshots are enough to test the explanation.

There is a pleasing connection to [polarisation](/blog/light-draws-an-ellipse/). Two perpendicular field components in quadrature produce a circle there as well. The details of the apparatus differ, but carefully timed oscillations keep turning up as a way to create rotation.

Use the [standalone rotating-field lab](/lab/rotating-field/) for the camera view. After that, the interesting next question is how a rotor turns a moving field into useful shaft power.

## Reading further

- [MIT: Introduction to Electric Power Systems, readings](https://ocw.mit.edu/courses/6-061-introduction-to-electric-power-systems-spring-2011/pages/readings/). James Kirtley's notes cover polyphase networks, winding models and the machines built from them.
- [University of Minnesota: three-phase excitation](https://ece.umn.edu/users/riaz/animations/im3phase.html). A complementary air-gap view of the rotating field distribution.
- [MIT: Basic principles of electric machines](https://dspace.mit.edu/bitstream/handle/1721.1/66486/6-061-spring-2007/contents/readings/ch11.pdf). The machine-level context beyond the vector construction used here.
