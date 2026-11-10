---
title: A waveguide is a high-pass filter
date: '2026-10-24T00:00:00.000Z'
description: >-
  A hollow metal pipe can carry microwaves, but only when the field pattern
  fits. Explore TE₁₀ cutoff in three dimensions.
labels: 'electrical-engineering,microwaves,waveguides,electromagnetism'
release: true
heroImage: /blog/a-waveguide-is-a-high-pass-filter/hero.webp
takeaways:
  - >-
    An air-filled rectangular guide has a TE₁₀ cutoff frequency of c/(2a), set
    by its wide wall.
  - >-
    Below cutoff, a single driven evanescent mode decays along the guide instead
    of travelling through it.
  - >-
    Above cutoff, longitudinal phase velocity exceeds c while group velocity
    stays below c.
  - >-
    A hollow rectangular guide has no TEM mode; its boundary conditions require
    a transverse field pattern.
markdown_url: /blog/a-waveguide-is-a-high-pass-filter/
canonical_url: 'https://benebsworth.com/blog/a-waveguide-is-a-high-pass-filter/'
---
## Key takeaways

- An air-filled rectangular guide has a TE₁₀ cutoff frequency of c/(2a), set by its wide wall.
- Below cutoff, a single driven evanescent mode decays along the guide instead of travelling through it.
- Above cutoff, longitudinal phase velocity exceeds c while group velocity stays below c.
- A hollow rectangular guide has no TEM mode; its boundary conditions require a transverse field pattern.

A hollow metal pipe can carry an electromagnetic signal with no centre conductor. Make the frequency too low and the same pipe refuses to support a travelling version of the field.

There is no capacitor hidden in this filter. Its dimensions do the filtering.

The explanation starts with the metal walls. An ideal conductor forces the tangential electric field at its surface to vanish. That requirement leaves a restricted set of field shapes, rather like the allowed vibration patterns of a stretched string. Each transverse shape consumes part of the wave's spatial variation. Only what remains is available for propagation down the pipe.

## Cross the threshold

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

Select **Propagating**. The cyan arrows show the electric field inside a rectangular guide. Their lengths and directions change together as the pattern travels along its length. The field is vertical, zero at the side walls and strongest halfway between them.

Now choose **Below cutoff**. The arrows still oscillate near the entrance, but the envelope shrinks with distance. The pattern no longer advances along the guide. It changes sign in place.

Finally choose **Near cutoff**. The longitudinal wavelength becomes long. The visible section contains only a small part of a cycle along its length, even though the transverse half-sine still fits exactly across the wide wall.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The amber curves mark the electric-field envelope. Below cutoff they decay exponentially. Above cutoff they remain flat because this model has perfectly conducting walls and no dielectric loss.

The guide in the lab has height $b=a/2$ and length $2a$. The **Wide wall** control sets the physical size in millimetres. The drawing uses normalised dimensions, so changing the physical size changes the frequency readouts while preserving the shape on screen.

## One half-sine across the width

Call the guide's wide dimension $a$, its height $b$, and its propagation direction $z$. The lowest-cutoff mode of a guide with $a>b$ is usually labelled $\mathrm{TE}_{10}$.

TE means transverse electric: the electric field has no longitudinal component, so $E_z=0$. It does not mean that every field is transverse. The magnetic field of this mode includes a longitudinal component.

The first index counts half-wave variations across the width; the second counts them across the height. For $\mathrm{TE}_{10}$ there is one across $x$ and none across $y$:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
E_y(x,z,t)=E_0\sin\left(\frac{\pi x}{a}\right)\cos(\beta z-\omega t)
```

$$
E_y(x,z,t)=E_0\sin\left(\frac{\pi x}{a}\right)
\cos(\beta z-\omega t)
$$

At $x=0$ and $x=a$, the sine vanishes. This satisfies the tangential-electric-field condition at those walls. At the horizontal walls the electric field is normal to the metal, which is allowed because surface charge can support it.

That last detail is worth keeping straight. "Electric field is zero at metal" is too broad. For the ideal conductor boundary, it is the tangential electric field just outside the surface that must vanish. Normal fields and surface charge are part of the solution.

[Markus Zahn's field-theory treatment](https://eng.libretexts.org/Bookshelves/Electrical_Engineering/Electro-Optics/Electromagnetic_Field_Theory%3A_A_Problem_Solving_Approach_%28Zahn%29/08%3A_Guided_Electromagnetic_Waves/8.06%3A_The_Rectangular_Waveguide) derives the rectangular modes from these boundary conditions. The animation takes the resulting single mode and makes its spatial factors separately visible.

## Where cutoff comes from

In unbounded air, the wavenumber is approximately $k_0=\omega/c$. Inside the guide, the required transverse variation has wavenumber $\pi/a$. The longitudinal propagation constant must satisfy:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\beta^2=\left(\frac{\omega}{c}\right)^2-\left(\frac{\pi}{a}\right)^2,\qquad f_c=\frac{c}{2a}
```

$$
\beta^2=\left(\frac{\omega}{c}\right)^2-\left(\frac{\pi}{a}\right)^2,
\qquad
f_c=\frac{c}{2a}
$$

Above cutoff, the right-hand side is positive and $\beta$ is real. The cosine in equation (1) shifts its crests along $z$ as time advances.

Below cutoff, the right-hand side is negative. Write $\beta=i\alpha$ with positive decay constant $\alpha$. The physically selected solution for a guide extending away from a driven entrance contains $e^{-\alpha z}$. This is an evanescent field.

For the **Below cutoff** preset, $f/f_c=0.75$. The dimensionless decay constant is $\alpha a=\pi\sqrt{1-0.75^2}\approx2.078$. After one width of travel, the envelope is about 12.5% of its entrance value. After the displayed length of two widths it is about 1.57%.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

These numbers are convenient sanity checks for the lab. If the below-cutoff field grows with distance, or if its envelope travels down the guide like a crest, the animation is solving the wrong problem.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A single decaying evanescent solution carries no net time-averaged power down an ideal semi-infinite guide. A finite below-cutoff section can transmit through a combination of evanescent solutions. The lab models the former, not a complete tunnelling device.

## A phase crest can outrun light

The longitudinal phase velocity is $\omega/\beta$. Since the guide's $\beta$ is smaller than the free-space wavenumber, this velocity exceeds $c$.

That result often looks like a mistake. The resolution is that a constant-phase point is not a parcel of information. A narrowband envelope follows the derivative of the dispersion relation:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
v_p=\frac{c}{\sqrt{1-(f_c/f)^2}},\qquad v_g=c\sqrt{1-(f_c/f)^2},\qquad v_pv_g=c^2
```

$$
v_p=\frac{c}{\sqrt{1-(f_c/f)^2}},
\qquad
v_g=c\sqrt{1-(f_c/f)^2},
\qquad
v_pv_g=c^2
$$

At $f=1.5f_c$, the group velocity is about $0.745c$ and the phase velocity is about $1.342c$. The drive frequency for our $22.86\ \mathrm{mm}$ example is about $9.836\ \mathrm{GHz}$. All three values follow from the same geometry.

The lab animates monochromatic field phase; it does not launch a pulse. Its group-velocity readout is calculated from the ideal dispersion relation. To watch a carrier and envelope separately, try [the wave-packet article](/blog/a-wave-packet-has-two-speeds/).

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Cutoff appears when the transverse field pattern leaves no real longitudinal wavenumber.

## Why coax has an extra option

A coaxial cable has two conductors and can support a transverse electromagnetic, or TEM, mode. Both electric and magnetic fields are transverse in that mode. Its low-frequency behaviour does not have the same geometrical cutoff as a hollow single-conductor guide.

A hollow rectangular guide cannot sustain that TEM solution. The allowed fields must satisfy the closed conducting boundary without a second conductor to support the corresponding transverse voltage difference. TE and TM modes remain, each with its own cutoff.

This is a useful reason to be precise about the word *waveguide*. Coax guides waves too. The high-pass behaviour here belongs to the hollow rectangular guide and its chosen mode.

The next modes in our ideal $b=a/2$ geometry have a threshold at twice the $\mathrm{TE}_{10}$ cutoff. The frequency control stops at $1.9f_c$ so the experiment stays below that next threshold. Above it, the guide can support more shapes, and the launched field depends on how it is excited.

## What the filter analogy leaves out

Calling the pipe a high-pass filter captures the existence of a propagation threshold. It does not describe the insertion loss or reflection coefficient of a complete component with transitions, finite length and imperfect walls.

Near cutoff, real conductor loss becomes significant and matching can be awkward. A practical operating band leaves margin above the threshold and below higher-mode operation. Michael Steer's [rectangular-waveguide chapter](https://eng.libretexts.org/Bookshelves/Electrical_Engineering/Electronics/Microwave_and_RF_Design_II_-_Transmission_Lines_%28Steer%29/06%3A_Waveguides/6.04%3A_Rectangular_Waveguide) connects those modal constraints to engineering use.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Hold Frequency / cutoff at 1.5 and set Wide wall to 15 mm, then 30 mm. Both frequency readouts halve, while the group-velocity ratio stays unchanged. Then select Propagating to restore the defaults and lower the ratio through 1. Geometry scaling and crossing cutoff are different experiments.

For a small extension, calculate how long a below-cutoff section must be to reduce the field envelope by a chosen factor. Be careful to call it field attenuation, since power ratios involve a square when a propagating-wave power interpretation applies.

The [standalone waveguide lab](/lab/waveguide/) keeps the three-dimensional boundary visible while you work through that calculation. The next interesting addition would be an actual input transition, where mode excitation and impedance matching finally get a vote.

## Reading further

- [Zahn: the rectangular waveguide](https://eng.libretexts.org/Bookshelves/Electrical_Engineering/Electro-Optics/Electromagnetic_Field_Theory%3A_A_Problem_Solving_Approach_%28Zahn%29/08%3A_Guided_Electromagnetic_Waves/8.06%3A_The_Rectangular_Waveguide). Boundary conditions, field components and power flow derived from Maxwell's equations.
- [Steer: rectangular waveguide](https://eng.libretexts.org/Bookshelves/Electrical_Engineering/Electronics/Microwave_and_RF_Design_II_-_Transmission_Lines_%28Steer%29/06%3A_Waveguides/6.04%3A_Rectangular_Waveguide). Mode charts and the practical relationship between cutoff and usable bandwidth.
- [Duke: rectangular waveguides](https://webhome.phy.duke.edu/~rgb/Class/Electrodynamics/Electrodynamics/node103.html). A compact electrodynamics derivation of the allowed modes and dispersion relation.
