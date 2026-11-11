---
title: Steering a beam without moving an antenna
date: '2026-10-24T00:00:00.000Z'
description: >-
  Build a phased array from a sum of rotating arrows, then make it fail by
  spacing the elements too far apart.
labels: 'electrical-engineering,rf,antennas,interference'
release: true
heroImage: /blog/steering-a-beam-without-moving-an-antenna/hero.webp
takeaways:
  - >-
    A phase gradient steers an array by compensating the path difference between
    neighbouring elements.
  - >-
    A linear array selects a direction cosine, so its three-dimensional maxima
    can form cones.
  - >-
    Grating lobes are spatial aliases: different directions produce the same
    phase progression.
  - >-
    Phase shifters approximate time delays at one frequency, which creates beam
    squint across a wide band.
markdown_url: /blog/steering-a-beam-without-moving-an-antenna/
canonical_url: 'https://benebsworth.com/blog/steering-a-beam-without-moving-an-antenna/'
---
## Key takeaways

- A phase gradient steers an array by compensating the path difference between neighbouring elements.
- A linear array selects a direction cosine, so its three-dimensional maxima can form cones.
- Grating lobes are spatial aliases: different directions produce the same phase progression.
- Phase shifters approximate time delays at one frequency, which creates beam squint across a wide band.

An antenna can change where it points while every piece of metal stays still. The trick is to make neighbouring elements disagree about what time it is.

That sounds more mysterious than the calculation. We give each element the same sinusoid with a slightly different phase. In one direction, the extra distance travelled cancels those phase differences. The fields arrive together. Elsewhere they partly cancel.

I find this easier to understand as geometry before worrying about radio hardware. Let's start with eight ideal sources and deliberately remove the parts that make an antenna engineer's job difficult.

## A beam built from agreement

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

Select **Broadside**. The amber points lie along the array axis. Their short rotating arrows show the drive phases. The pale cyan surface is a polar plot: its distance from the centre is the normalised far-field amplitude in that direction. It is not an expanding shell of electromagnetic energy.

Choose **Steer 30°** and the highlighted direction moves. Pause the animation and rotate the camera. The pattern remains perfectly meaningful while the little phase arrows are frozen, because the envelope describes steady sinusoidal operation.

There is a useful surprise in the three-dimensional view. A line of isotropic sources does not make a unique pencil beam. Directions with the same projection onto the array axis have the same path differences. They lie on a cone. A planar array, or the directional pattern of the individual elements, can remove this ambiguity.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The familiar two-dimensional antenna plot is a slice through a three-dimensional pattern. A narrow peak in that slice does not prove that the antenna is narrow in every direction.

This model uses an array along $x$. We measure the steering angle $\theta_0$ from the broadside $+z$ direction in the $xz$ plane. A ray at angle $\theta$ therefore has direction cosine $u_x=\sin\theta$.

## Translate distance into phase

Two neighbouring elements are separated by $d$. For a distant observer, their path-length difference is approximately $d\sin\theta$. Dividing by wavelength turns that distance into cycles, and multiplying by $2\pi$ turns cycles into radians.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\Delta\phi=-2\pi\frac{d}{\lambda}\sin\theta_0
```

$$
\Delta\phi=-2\pi\frac{d}{\lambda}\sin\theta_0
$$

The minus sign belongs to our convention for element numbering and propagation phase. Reverse either convention and the sign changes, while the physical requirement remains: cancel the phase difference in the desired direction.

For half-wavelength spacing and a $30^\circ$ steering angle, this gives $-90^\circ$ per element. That is exactly the adjacent-drive readout in the **Steer 30°** preset. Eight elements span seven gaps, so the physical aperture is $3.5\lambda$.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

This is the same path-difference construction used in [Analog Devices' introduction to array factors](https://www.analog.com/en/resources/analog-dialogue/articles/phased-array-antenna-patterns-part1.html). Hardware phase shifters implement the phase progression; the geometry tells us what progression to request.

## Add the arrows

Now give the observer an arbitrary direction cosine $u_x$. Each step along the array contributes the residual phase $\psi$. Summing the complex fields gives the array factor:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
A(u_x)=\frac{1}{N}\left|\sum_{n=0}^{N-1}e^{in\psi}\right|,\qquad \psi=2\pi\frac{d}{\lambda}(u_x-\sin\theta_0)
```

$$
A(u_x)=\frac{1}{N}\left|\sum_{n=0}^{N-1}e^{in\psi}\right|,
\qquad
\psi=2\pi\frac{d}{\lambda}(u_x-\sin\theta_0)
$$

At the steering direction, $\psi=0$. All $N$ arrows align, their sum has magnitude $N$, and our normalised amplitude is 1. This does not imply that the array generates power for free. Normalisation removes the absolute power scale so we can compare shapes.

For a broadside eight-element array with $d=\lambda/2$, the first null occurs at $\sin\theta=1/4$, or about $14.48^\circ$. At that angle the eight phasors make one complete polygon and sum to zero. The null is cancellation, not a lack of radiation from any individual element.

Move **Elements** from 8 to 12. The main feature narrows and the nulls move closer together. The side lobes remain because a finite, abruptly terminated aperture has a spreading spectrum. That is the same mathematics behind ringing when we truncate a Fourier series.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

An array pattern is a record of where many small contributions agree.

The lab draws amplitude as radius. Relative power is $A^2$, and a decibel power plot would use $20\log_{10}A$. A faint-looking amplitude lobe can become quite small in power. Always check the plotted quantity before comparing two antenna diagrams.

## Make the array confidently point twice

Select **Grating lobes**. The element spacing becomes one wavelength, while the requested steering angle stays at $30^\circ$. Another equal-height maximum appears at $-30^\circ$ in the highlighted slice.

The source phasors cannot tell the two directions apart. A complete extra cycle between neighbours leaves every complex exponential unchanged:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\sin\theta_m=\sin\theta_0+m\frac{\lambda}{d},\qquad m\in\mathbb{Z},\quad |\sin\theta_m|\leq1
```

$$
\sin\theta_m=\sin\theta_0+m\frac{\lambda}{d},
\qquad m\in\mathbb{Z},
\quad |\sin\theta_m|\leq1
$$

Substitute $\sin30^\circ=0.5$ and $d=\lambda$. The $m=-1$ solution gives $-0.5$, hence $-30^\circ$. The unwanted maximum is as strong as the intended one in this ideal array-factor model.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Adding more uniformly spaced elements narrows both of these maxima. It does not remove the ambiguity. The spacing created the alias.

This is spatial sampling. In an ordinary sampled waveform, frequencies separated by the sample rate can produce the same samples. Here, different arrival directions produce the same sequence of phases along the antenna.

Half-wavelength spacing is the familiar conservative choice for scanning across the visible region. Exactly at endfire, boundary cases need care. If the scan range is restricted, a larger spacing can sometimes be acceptable. The relevant question is whether any unwanted integer solution enters the visible interval, rather than whether a particular spacing looks tidy on a circuit board. [Analog Devices' grating-lobe treatment](https://www.analog.com/en/resources/analog-dialogue/articles/phased-array-antenna-patterns-part2.html) develops that scan-dependent constraint.

## The frequency you forgot to change

There is another limitation hiding in equation (1): wavelength depends on frequency.

A fixed time delay produces a phase proportional to frequency. A fixed phase shift does not. If we choose phase settings at one frequency and transmit a wide band, different frequencies generally point in different directions. This is beam squint.

The lab intentionally holds one frequency and expresses spacing in wavelengths. It therefore cannot show squint by itself. To extend it, we would hold physical spacing and the phase-shifter settings fixed while sweeping frequency. Changing the spacing control is a different experiment because the model recalculates the drive phase to preserve the requested steering angle.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

For a useful sequence, compare Broadside with Steer 30°, then select Grating lobes. Finally increase Elements while keeping the bad spacing. Ask which control moves the beam, which narrows it, and which introduces a second valid answer.

Real arrays add element patterns, mutual coupling, calibration errors and finite phase resolution. Amplitude tapering reduces side lobes at the cost of a wider main lobe. A true-time-delay beamformer addresses the frequency dependence directly, with its own implementation cost. None of those details invalidates our small sum; they tell us which assumptions to replace next.

The connection I like here is with the [Fourier-series experiment](/blog/every-wave-is-a-circle/). One sums contributions across time-frequency components, the other across spatially separated sources. The cancellation arithmetic is remarkably portable.

Open the [standalone phased-array lab](/lab/phased-array/) to explore the cones without the article around them. For the next step, compare the field pattern with an element pattern and see how much of that apparently perfect cone survives.

## Reading further

- [Analog Devices: linear-array beam characteristics](https://www.analog.com/en/resources/analog-dialogue/articles/phased-array-antenna-patterns-part1.html). A practical introduction to the path-difference construction and the distinction between array and element factors.
- [Analog Devices: grating lobes and beam squint](https://www.analog.com/en/resources/analog-dialogue/articles/phased-array-antenna-patterns-part2.html). The two different ways a plausible steering setting can produce the wrong direction.
- [Analog Devices: true time delays and phase shifters](https://www.analog.com/en/resources/technical-articles/true-time-delays-and-phase-shifters.html). Hardware trade-offs when one narrowband phase setting is no longer enough.
