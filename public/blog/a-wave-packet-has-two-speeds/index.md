---
title: A wave packet has two speeds
date: '2026-10-24T00:00:00.000Z'
description: >-
  Watch crests overtake a wave packet, separate group velocity from phase
  velocity, and discover why unequal speeds do not automatically cause
  spreading.
labels: 'physics,waves,dispersion,signal-processing'
release: true
heroImage: /blog/a-wave-packet-has-two-speeds/hero.webp
takeaways:
  - >-
    Phase velocity follows a crest; group velocity follows the envelope of a
    narrowband packet.
  - >-
    Unequal phase and group velocities do not by themselves make a packet
    spread.
  - >-
    Curvature of the dispersion relation gives different spectral components
    different group velocities.
markdown_url: /blog/a-wave-packet-has-two-speeds/
canonical_url: 'https://benebsworth.com/blog/a-wave-packet-has-two-speeds/'
---
## Key takeaways

- Phase velocity follows a crest; group velocity follows the envelope of a narrowband packet.
- Unequal phase and group velocities do not by themselves make a packet spread.
- Curvature of the dispersion relation gives different spectral components different group velocities.

A wave crest can enter the back of a pulse, travel through its middle, and disappear out of the front. The pulse keeps going at its own pace. If we ask how fast the wave moves, we need to say which part we are following.

This distinction turns up in water waves, optical fibres, radio waveguides, and quantum mechanics. I find it easier to keep the mathematics straight once the moving picture is clear: follow one crest, then deliberately stop following it and watch the packet instead.

## Follow the envelope, then a crest

The **Crests overtake** preset starts with a carrier phase speed of 1 and a group speed of 0.5, in model units. The amber ring marks the centre of the packet. The cyan curve turns inside a violet envelope.

The three-dimensional view plots the real part of a complex wave vertically and its imaginary part in depth. That makes phase visible as rotation around the long axis. The depth is a mathematical quadrature, not a claim that the medium is moving in a second physical direction.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

Pause and scrub through one pass. The envelope advances while the internal winding slides through it. Choose **Together** and both motions agree. Next choose **Spreading**: now the envelope becomes wider and lower as it travels.

There are two different changes hiding in those presets. **Group / phase speed** changes how quickly the packet centre moves. **Dispersion curvature** changes how rapidly it spreads. We will keep those controls separate because they answer different questions.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A packet can have different group and phase velocities while keeping the same width. Spreading requires variation of group velocity across the packet's spectrum.

## One sinusoid cannot locate a pulse

A pure sinusoid extends indefinitely. Its crests move, but none of them says “the disturbance is here”. To make a localised pulse, we add a band of nearby wavelengths so that they reinforce one another around a particular location and cancel farther away.

The simpler version uses only two neighbouring frequencies. Their sum can be written as a rapid oscillation multiplied by a slowly varying envelope. [Feynman's chapter on beats](https://www.feynmanlectures.caltech.edu/I_48.html) develops this superposition picture. A Gaussian packet uses a continuous range of frequencies, but the organising idea is the same.

For a monochromatic wave, a particular crest obeys $kx-\omega t=\text{constant}$. Differentiating that condition gives its speed. A packet's envelope depends on phase differences between nearby waves, so its velocity involves a derivative of frequency with respect to wavenumber:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
v_p=\frac{\omega_0}{k_0},\qquad v_g=\left.\frac{\mathrm d\omega}{\mathrm dk}\right|_{k_0}
```

$$
v_p=\frac{\omega_0}{k_0},\qquad v_g=\left.\frac{\mathrm d\omega}{\mathrm dk}\right|_{k_0}
$$

The function $\omega(k)$ is the **dispersion relation**. It is a compact account of how the medium treats each spatial frequency. The ratio $\omega/k$ and the slope $\mathrm d\omega/\mathrm dk$ happen to agree for a straight line through the origin. They do not generally agree for other curves.

That distinction is easy to miss on a graph. A line from the origin to a point on the curve has one slope; the tangent at that point can have another. Those are the two velocities.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Following a crest and following a pulse are different measurements, even when they happen to give the same number.

## Give the dispersion curve three independent features

The workbench uses a quadratic expansion around a carrier wavenumber $k_0=10$. Its carrier frequency is $\omega_0=10$, so the central phase velocity is fixed at 1. We vary the local slope and curvature independently:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\omega(k)=\omega_0+v_g(k-k_0)+\frac{\beta_2}{2}(k-k_0)^2
```

$$
\omega(k)=\omega_0+v_g(k-k_0)+\frac{\beta_2}{2}(k-k_0)^2
$$

Here $\beta_2$ means $\mathrm d^2\omega/\mathrm dk^2$. Optical-fibre texts often use the same symbol for $\mathrm d^2k/\mathrm d\omega^2$, because they evolve pulses along a propagation distance. Those are different derivatives with different units. This lab evolves a spatial packet forward in time, so keep its definition attached to the symbol.

When $\beta_2=0$, all components near the carrier have the same group velocity. The packet can translate without distorting even if $v_g$ differs from $v_p$. [Jon Thaler's University of Illinois explanation](https://courses.physics.illinois.edu/phys436/sp2017/Phase_group_vel.html) makes exactly this distinction between slipping crests and spreading envelopes.

When $\beta_2$ is nonzero, differentiating equation (2) gives $v_g(k)=v_g+\beta_2(k-k_0)$. Components above and below the carrier travel with different envelope velocities. Their original alignment gradually unwinds.

## A Gaussian lets us calculate the whole picture

At time zero, take an envelope proportional to $\exp[-(x-x_0)^2/(2\sigma_0^2)]$. The lab starts at $x_0=-1.6$. For the quadratic dispersion law, its width has an exact expression:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\sigma(t)=\sigma_0\sqrt{1+\left(\frac{\beta_2t}{\sigma_0^2}\right)^2},\qquad x_c(t)=x_0+v_gt
```

$$
\sigma(t)=\sigma_0\sqrt{1+\left(\frac{\beta_2t}{\sigma_0^2}\right)^2},\qquad x_c(t)=x_0+v_gt
$$

The displayed curve is evaluated from the Gaussian's full complex solution, including its phase chirp. The surface around it follows the magnitude of that same solution. We are not stretching a decorative tube independently of the wave.

As the packet widens, its peak amplitude falls by a factor $\sqrt{\sigma_0/\sigma(t)}$. That preserves the spatial integral of $|\psi|^2$ for this lossless model. The workbench's finite viewing window can crop a tail, but the underlying solution continues beyond the frame.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Set Dispersion curvature to 0 and change Group / phase speed. The readout for width after 3 time units stays unchanged. Now hold the speed fixed and increase curvature: the width grows even though the centre follows the same path.

## Work one example all the way through

Use **Spreading**, which sets $v_g=0.5$, $\beta_2=0.3$, and $\sigma_0=0.65$. One complete timeline pass represents 3 model time units. The packet centre moves from $-1.6$ to $-0.1$.

The initial squared width is $0.4225$, and the dispersion term $\beta_2t$ is $0.9$. Substituting into equation (3) gives a final width of approximately $1.5296$. Its peak amplitude is about $0.6519$ of its initial value. The envelope has become over twice as wide without losing integrated intensity.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Now reduce the initial width to 0.4 while keeping the curvature and elapsed time fixed. The dimensionless spreading term contains $\sigma_0^2$ in the denominator, so making a tighter initial packet increases its relative spreading much more rapidly than a first glance might suggest. A narrow spatial feature needs a wider spectrum; it samples more of the dispersion curve.

The available width slider stops at 0.4 to keep several carrier oscillations under the initial envelope. This is a teaching model of a narrowband packet, so taking the width towards zero would undermine the approximation we are trying to examine.

## The medium chooses the curve

The sliders are independent here because the point is to isolate their effects. In a real medium, the dispersion relation fixes them together. Deep-water gravity waves provide a familiar example: neglecting surface tension, $\omega^2=gk$, which gives a group velocity half the phase velocity. [Feynman's discussion of waves](https://www.feynmanlectures.caltech.edu/I_51.html) connects dispersion with wave groups on water.

The **Crests overtake** preset uses that same velocity ratio, but it deliberately sets curvature to zero. It shows the ratio without simulating the full deep-water dispersion law. The **Spreading** preset adds a chosen quadratic curvature. Neither preset is a calibrated ocean model.

Our [waveguide experiment](/lab/waveguide/) offers another context: the boundary conditions of a conducting guide produce dispersion even when the material inside is vacuum. That is a useful reminder that geometry can change how a wave travels.

## A pulse speed is not always a message speed

It is tempting to promote group velocity into “the speed of information”. That works in many simple, narrowband settings, but it is not a universal definition. In strongly dispersive or absorbing systems a pulse can reshape enough that following its maximum becomes a poor way to identify the arrival of new information.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This lossless quadratic model follows an envelope, not a causal signal front. It cannot establish information speeds, superluminal signalling, absorption, or the behaviour of a broad spectrum far from the carrier.

The exercise I would keep is modest: before running a new preset, predict whether the centre moves, the width changes, or both. Then inspect the [standalone wave packet lab](/lab/group-velocity/) from the side so the envelope is easy to track. Once the two motions are separate in your head, dispersion curves become much less mysterious.

## Reading further

- [Feynman, volume I, chapter 48: Beats](https://www.feynmanlectures.caltech.edu/I_48.html): how nearby oscillations combine into a slower envelope.
- [Jon Thaler, University of Illinois: Phase and group velocity](https://courses.physics.illinois.edu/phys436/sp2017/Phase_group_vel.html): a particularly clear distinction between unequal velocities and pulse spreading.
- [Feynman, volume I, chapter 51: Waves](https://www.feynmanlectures.caltech.edu/I_51.html): physical examples involving water waves, dispersion, and wave groups.
