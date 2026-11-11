---
title: Power flows around the wire
date: '2026-10-24T00:00:00.000Z'
description: >-
  Use a coaxial cable to turn electric and magnetic fields into the familiar
  circuit result P = VI.
labels: 'electrical-engineering,electromagnetism,poynting-vector,transmission-lines'
release: true
heroImage: /blog/power-flows-around-the-wire/hero.webp
takeaways:
  - >-
    The Poynting vector E × H describes electromagnetic energy flow, including
    in steady DC circuits.
  - >-
    In an ideal coaxial cable, radial electric and azimuthal magnetic fields
    send power along the dielectric.
  - >-
    Integrating the field power density across the annulus gives the circuit
    result P = VI.
  - >-
    A reverse current reverses power flow, while a charged cable with zero
    current has stored energy but no steady axial power flow.
markdown_url: /blog/power-flows-around-the-wire/
canonical_url: 'https://benebsworth.com/blog/power-flows-around-the-wire/'
---
## Key takeaways

- The Poynting vector E × H describes electromagnetic energy flow, including in steady DC circuits.
- In an ideal coaxial cable, radial electric and azimuthal magnetic fields send power along the dielectric.
- Integrating the field power density across the annulus gives the circuit result P = VI.
- A reverse current reverses power flow, while a charged cable with zero current has stored energy but no steady axial power flow.

The voltage and current in a cable tell us how much power it carries. They do not immediately tell us where that power crosses a plane through the cable.

For an ideal coaxial cable, the answer is the dielectric between the conductors. The electric field points out from the centre conductor. The magnetic field circles it. Their cross product points down the cable.

This can happen with steady direct current. Nothing has to oscillate for the fields to carry energy.

I like coax for this calculation because the symmetry keeps us honest. We can draw the directions, calculate the field strengths and integrate the result. At the end, the unfamiliar field picture gives back the familiar $VI$ from circuit theory.

## Look between the conductors

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

The inner cylinder is the centre conductor. The outer cage marks the inside of the return conductor. The space between them is the dielectric.

Choose **24 W forward**. Amber arrows show the radial electric field, purple arrows the azimuthal magnetic field, and cyan arrows the axial power flow. Rotate the camera to look along the cable and the right-angle relationship becomes easier to see.

Now choose **Reverse power**. The voltage keeps the same sign, so the amber arrows still point out. The current changes sign, so the purple arrows reverse. The cyan flow reverses as well.

Finally choose **Charged, no flow**. The electric field remains. The magnetic field and axial power flow disappear because the steady current is zero.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Moving cyan dots are direction markers. They do not represent electrons, and their animation speed is not a measured energy velocity. The power readout comes from the fields, not the dots.

The model takes the inner conductor radius as $a=1\ \mathrm{mm}$. **Outer / inner radius** changes $b/a$. Voltage and current are independent steady-circuit quantities here; we have not imposed the impedance relation of a single travelling wave.

## Recover the fields from V and I

For a long ideal coax, cylindrical symmetry leaves only a radial electric field in the dielectric. Integrating that field between the conductors must reproduce the voltage. Ampère's law gives the circular magnetic field around the centre-conductor current.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\mathbf E(r)=\frac{V}{r\ln(b/a)}\hat{\mathbf r},\qquad \mathbf H(r)=\frac{I}{2\pi r}\hat{\boldsymbol\phi},\qquad a<r<b
```

$$
\mathbf E(r)=\frac{V}{r\ln(b/a)}\hat{\mathbf r},
\qquad
\mathbf H(r)=\frac{I}{2\pi r}\hat{\boldsymbol\phi},
\qquad a<r<b
$$

Both magnitudes fall as $1/r$. The electric field is stronger near the centre conductor because the same voltage difference is distributed across cylindrical surfaces of different circumference. The magnetic result follows directly from $2\pi rH=I$.

With $V=12\ \mathrm{V}$, $I=2\ \mathrm{A}$ and $b/a=3$, the geometric-mean radius is $\sqrt{ab}\approx1.732\ \mathrm{mm}$. The lab evaluates its field readouts there: approximately $6306\ \mathrm{V/m}$ and $183.8\ \mathrm{A/m}$.

Those apparently large field numbers occupy a small cross-sectional area. Units matter here. A field power density in watts per square metre can be large while the total cable power is only a few tens of watts.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## Cross the directions

In SI units, the electromagnetic energy-flux density is the Poynting vector $\mathbf S=\mathbf E\times\mathbf H$. Its units are watts per square metre.

For cylindrical unit vectors, $\hat{\mathbf r}\times\hat{\boldsymbol\phi}=\hat{\mathbf z}$. Substituting the two field magnitudes gives:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\mathbf S(r)=\mathbf E\times\mathbf H=\frac{VI}{2\pi r^2\ln(b/a)}\hat{\mathbf z}
```

$$
\mathbf S(r)=\mathbf E\times\mathbf H
=\frac{VI}{2\pi r^2\ln(b/a)}\hat{\mathbf z}
$$

The local flux density falls as $1/r^2$. Double the observation radius within the same cable and the flux density falls to one quarter. That is a statement about power per area, not power through a whole cylindrical annulus.

The [Feynman lectures on field energy and momentum](https://www.feynmanlectures.caltech.edu/II_27.html) develop the energy-conservation argument behind this vector. Its direction is easy to draw once the fields are known. Finding the fields is usually the harder part.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Circuit power is the cross-sectional integral of a field flow that the circuit diagram leaves out.

Notice that the calculation used no frequency. In this steady DC example, $\mathbf E$ and $\mathbf H$ are time-independent, and so is $\mathbf S$. The energy stored at a location can remain constant while energy continuously passes through it, just as the water level in a flowing pipe can remain constant.

## Integrate the picture back into a circuit

To find total axial power, integrate $\mathbf S$ over a plane cutting across the cable. A thin annulus of radius $r$ and thickness $dr$ has area $2\pi r\,dr$.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
P=\int_a^b S_z(r)\,2\pi r\,dr=\frac{VI}{\ln(b/a)}\int_a^b\frac{dr}{r}=VI
```

$$
P=\int_a^b S_z(r)\,2\pi r\,dr
=\frac{VI}{\ln(b/a)}\int_a^b\frac{dr}{r}
=VI
$$

The logarithm from the integral cancels the logarithm in the electric field. The dimensions of the coax still affect the local distribution, but the total is exactly what the terminal voltage and current promised.

There is a neat consequence. Equal intervals of $\ln r$ carry equal fractions of the total power. The annulus from $a$ to $\sqrt{ab}$ carries half, and the annulus from $\sqrt{ab}$ to $b$ carries the other half.

That does not mean the two annuli have equal area. The outer one is larger, with lower average flux density. The geometric mean is the dividing radius because the integral is logarithmic.

Try changing **Outer / inner radius** while holding voltage and current fixed. The field readouts change, but integrated power stays at $24\ \mathrm{W}$. That is a stronger test than watching a collection of glowing arrows move in a plausible direction.

## What the conductors are doing

The field picture sometimes gets retold as though the metal were incidental. It is not.

Charges and currents on the conductors establish the boundary conditions that shape the fields. The outer conductor provides the return path and confines the ideal TEM field to the dielectric region. Remove or rearrange it and you have changed the electromagnetic problem, even if a rough circuit sketch still labels something "wire".

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The claim about flow in the dielectric applies to this ideal lossless coax model. In a resistive conductor, fields penetrate the metal and energy flows into it to supply Joule heating. Real cables also dissipate energy in their dielectric.

The idealisation gives us a particularly clean integral, not a reason to ignore resistance. At high frequencies, conductor loss, skin effect and dielectric loss all affect how much of the launched power reaches the load.

The distinction between field flow and conductor loss is visible in [the University of Illinois conservation notes](https://courses.physics.illinois.edu/phys436/fa2013/p436web/p436web/conservation-notes.pdf), which use coax as a Poynting-vector example. For the simple calculation here, the conductor surfaces guide the power without absorbing it.

## Stored energy is not the same as power flow

Select **Charged, no flow** again. A radial electric field means energy is stored in the dielectric. With zero current, the magnetic field is zero in this steady model, and the axial Poynting vector vanishes.

That describes the state after charging has settled. During charging, displacement current, propagating disturbances and changing fields matter. The static preset does not show that transient.

Similarly, a negative current at positive voltage reverses the sign of the power through our chosen cross-section. It might describe energy returning towards a source or another arrangement of supply and load. A sign tells us direction relative to a convention; the surrounding circuit tells us the physical story.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Set Voltage to 24 V and Current to 1 A. Compare the result with 12 V and 2 A. Total power is 24 W in both cases, but the electric and magnetic fields differ. Then set Current to zero and identify which quantities remain.

This is a useful bridge to [transmission-line reflections](/blog/every-wire-is-an-rlc-circuit/). Once voltage and current vary along the cable, power can travel in both directions and energy can exchange between electric and magnetic storage. The local cross product still gives us a way to keep the accounting straight.

For now, the [standalone coax lab](/lab/poynting-flow/) is enough to inspect the three perpendicular directions. The next extension would be to launch a pulse and watch the fields establish themselves, rather than beginning with the steady state already in place.

## Reading further

- [Feynman Lectures, Volume II, Chapter 27](https://www.feynmanlectures.caltech.edu/II_27.html). The energy-conservation reasoning behind electromagnetic energy flux, with examples that challenge the usual circuit intuition.
- [University of Illinois: conservation notes](https://courses.physics.illinois.edu/phys436/fa2013/p436web/p436web/conservation-notes.pdf). A field-theory treatment including the coaxial-cable Poynting-vector calculation.
- [MIT: electricity and magnetism, problem set 11](https://ocw.mit.edu/courses/8-022-physics-ii-electricity-and-magnetism-fall-2004/3feaf8e5d972bbf737fed4fc532c3c93_pset11.pdf). Problem 4 asks for the DC coax fields and their power flux; the neighbouring capacitor problem makes a useful extension.
