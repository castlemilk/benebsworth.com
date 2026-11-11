---
title: Light draws an ellipse
date: '2026-10-24T00:00:00.000Z'
description: >-
  Rotate a light wave in 3D, turn its polarisation from a line into an ellipse,
  and see exactly what a polarising filter measures.
labels: 'physics,optics,polarisation,electromagnetism'
release: true
heroImage: /blog/light-draws-an-ellipse/hero.webp
takeaways:
  - >-
    Polarisation records the path of the electric-field tip at one position, not
    the path of a photon.
  - >-
    Equal transverse amplitudes separated by a quarter cycle produce circular
    polarisation.
  - >-
    An ideal linear analyser transmits half the mean intensity of circularly
    polarised light at every angle.
markdown_url: /blog/light-draws-an-ellipse/
canonical_url: 'https://benebsworth.com/blog/light-draws-an-ellipse/'
---
## Key takeaways

- Polarisation records the path of the electric-field tip at one position, not the path of a photon.
- Equal transverse amplitudes separated by a quarter cycle produce circular polarisation.
- An ideal linear analyser transmits half the mean intensity of circularly polarised light at every angle.

A light wave can point in every transverse direction during a single cycle and still have a perfectly definite polarisation. The familiar drawing of a sine wave on a page quietly makes the electric field look as though it must stay in that page. We need to give that picture another dimension.

Give it a second perpendicular component, with its own phase, and the tip of the field arrow draws an ellipse. A line and a circle are the special cases. We can get a long way into optics by following that one moving point.

## Start by looking along the beam

Choose **Circular** below and rotate the scene until you are looking approximately along the long axis. The violet cross-section is a circle. Now choose **Linear**. The circle collapses into a diagonal line even though the cyan wave still moves along the beam.

The three-dimensional curve is a snapshot of the field at many positions. The violet curve answers a different question: what directions does the field visit at one position during an entire cycle? Those two views fit together, but they are not interchangeable.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

The **Amplitude ratio** compares the two transverse components. **Phase delay** sets how far one oscillation lags or leads the other in our stated cosine convention. **Analyser angle** rotates an ideal polarising filter at the far end. Pause the timeline and scrub it to compare the instantaneous field with its amber projection.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The spiral is a map of electric-field vectors. It is not a corkscrew flight path for a photon, and the radius is field strength rather than the width of a beam.

## Two oscillations are enough

Let the beam propagate along $x$. Its electric field lies in the $yz$ plane. A convenient description is a cosine in each direction, with amplitude ratio $r$ and relative phase $\delta$. This is the classical construction developed in [Feynman's chapter on polarisation](https://www.feynmanlectures.caltech.edu/I_33.html).

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
E_y=A\cos\psi,\qquad E_z=Ar\cos(\psi+\delta),\qquad \psi=kx-\omega t
```

$$
E_y=A\cos\psi,\qquad E_z=Ar\cos(\psi+\delta),\qquad \psi=kx-\omega t
$$

Set $\delta=0$. Both components reach their maxima together. Their ratio is always $r$, except at the instants when both vanish, so the resultant moves along a straight line. Changing $r$ tilts that line. Setting $r=0$ removes the second component entirely.

Now set $r=1$ and $\delta=90^\circ$. When one component is largest, the other crosses zero. A quarter of a cycle later they exchange jobs. The sum of their squared values stays constant, which is why the arrow can turn without changing length.

The lab normalises $A=1/\sqrt{1+r^2}$. That keeps the time average of $|\mathbf E|^2$ at $0.5$ as the amplitude ratio changes. Without this adjustment, adding a second component would also increase the incident intensity. Then a brightness change could be mistaken for a polarisation effect.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## The ellipse hides the phase

We can eliminate time from the two cosines. Divide each component by its amplitude, use the angle-addition identity, and rearrange. For nonzero $r$, the result is an ellipse equation:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\left(\frac{E_y}{A}\right)^2+\left(\frac{E_z}{Ar}\right)^2-2\frac{E_yE_z}{A^2r}\cos\delta=\sin^2\delta
```

$$
\left(\frac{E_y}{A}\right)^2+\left(\frac{E_z}{Ar}\right)^2-2\frac{E_yE_z}{A^2r}\cos\delta=\sin^2\delta
$$

Try **Elliptical**, which sets $r=0.4$ and a quarter-cycle delay. The ellipse's minor axis is $0.4$ times its major axis. Move the delay towards zero and the shape narrows, then collapses. The component amplitudes have stayed the same throughout. Relative timing alone changed the geometry.

Changing the delay from $90^\circ$ to $-90^\circ$ reverses the direction in which the field traverses the ellipse. A still image loses that information. This is one reason to pause, move the timeline a little, and watch which way the marker goes.

I have deliberately avoided stamping “left” and “right” on the two cases. Handedness labels need a viewing convention: looking towards the source reverses the apparent rotation compared with looking along propagation. For a piece of hardware, check the manufacturer's convention before trusting the adjective.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The ellipse tells us which directions the field visits. The moving point tells us the order.

## A filter measures a projection

An ideal linear analyser passes the component of the electric field along its transmission axis. If that axis makes angle $\alpha$ with $y$, its instantaneous output is $E_y\cos\alpha+E_z\sin\alpha$. Intensity depends on the time average of the square of that output.

Squaring before averaging matters. The cross term remembers the relative phase between the two components. Divide by the incident mean intensity and we get the fraction shown in the workbench:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
T=\frac{\cos^2\alpha+r^2\sin^2\alpha+2r\cos\delta\sin\alpha\cos\alpha}{1+r^2}
```

$$
T=\frac{\cos^2\alpha+r^2\sin^2\alpha+2r\cos\delta\sin\alpha\cos\alpha}{1+r^2}
$$

For $r=0$, this becomes $T=\cos^2\alpha$, the usual Malus law. A $30^\circ$ analyser transmits $75\%$ of that linearly polarised input. At $90^\circ$, ideal transmission is zero. [OpenStax's treatment of polarising filters](https://openstax.org/books/university-physics-volume-3/pages/1-7-polarization) is a useful reference for this intensity calculation and its physical interpretation.

For the circular state, $r=1$ and $\cos\delta=0$. The numerator becomes $\cos^2\alpha+\sin^2\alpha=1$, while the denominator is $2$. Turn the analyser through every angle: the **Mean transmission** readout should remain $50\%$. The instantaneous amber arrow still grows and shrinks; it is the average that stays fixed.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Choose Linear and set the analyser to 135°. The input line sits at 45°, so the axes are perpendicular and the output vanishes. Change Phase delay to 90° while keeping the analyser at 135°. Half the mean intensity returns.

## A numerical example with an uneven ellipse

Take the **Elliptical** preset: $r=0.4$, $\delta=90^\circ$, and $\alpha=30^\circ$. The interference cross term is zero because $\cos90^\circ=0$. The numerator is $0.75+0.16\times0.25=0.79$. The denominator is $1.16$, giving $T\approx0.6810$.

The lab reports **68.1%**. Rotate the analyser to $90^\circ$ and only the weaker component gets through: $0.16/1.16\approx13.8\%$. At $0^\circ$, transmission is about $86.2\%$. These extrema give us a practical way to distinguish this ellipse from a circle.

There is a nice connection here to [singular values](/blog/singular-values-are-stretches/). The matrix that maps a unit circle of sine and cosine values into the two field components has singular values equal to the ellipse's semiaxes. The workbench computes the axis ratio from that geometry, so the readout works even when the ellipse is tilted.

## What one rotating filter cannot tell you

Circularly polarised light and unpolarised light both transmit half their mean intensity through an ideal linear analyser at every angle. A rotating analyser alone cannot distinguish them. The underlying states are different: circular light maintains a definite relative phase; unpolarised light does not maintain one fixed ellipse over the measurement interval.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Constant brightness through a rotating linear polariser is insufficient evidence for circular polarisation. You need another measurement, typically involving a retarder such as a quarter-wave plate.

We can also see the measurement gap directly in equation (3). Transmission depends on $\cos\delta$, which is unchanged when the sign of $\delta$ flips. So the two opposite circular rotations give identical readouts for every analyser angle. An instrument can be perfectly accurate and still leave two different states indistinguishable. The missing measurement is about relative phase, rather than a need for more decimal places on the same intensity reading.

The connection to quantum states is tempting too. A coherent superposition of two orthogonal polarisation amplitudes has the same two-component mathematics that appears in [the Bloch sphere](/blog/every-qubit-gate-is-a-rotation/). [Feynman's discussion of photon polarisation](https://www.feynmanlectures.caltech.edu/III_11.html) develops that bridge. The classical field picture here does not simulate individual photon detections.

For now, the useful exercise is simpler: choose a state, predict the transmitted fraction, and then rotate the filter. The [standalone polarisation lab](/lab/polarisation/) leaves more room to inspect the geometry. Once the ellipse feels ordinary, wave plates become a problem about changing relative phase, which is a much friendlier starting point.

## Reading further

- [Feynman, volume I, chapter 33: Polarization](https://www.feynmanlectures.caltech.edu/I_33.html): the vector-field construction and the geometry behind elliptical states.
- [OpenStax, University Physics, section 1.7](https://openstax.org/books/university-physics-volume-3/pages/1-7-polarization): Malus law, polarising filters, and applications involving reflection.
- [Feynman, volume III, chapter 11: More two-state systems](https://www.feynmanlectures.caltech.edu/III_11.html): the connection between classical polarisation components and quantum amplitudes.
