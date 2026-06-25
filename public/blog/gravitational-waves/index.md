---
title: 'Gravitational Waves: Hearing Spacetime Ring'
date: '2026-06-03T00:00:00.000Z'
description: >-
  When two black holes spiral together they shake spacetime itself. In 2015 a
  detector with 4 km arms felt the ripple as a fifth-of-a-second chirp,
  stretching its mirrors by less than a proton's width.
labels: 'cosmology,astrophysics,black holes,relativity,general relativity'
release: true
author: Ben Ebsworth
heroImage: /blog/gravitational-waves/hero.webp
takeaways:
  - >-
    A gravitational wave is not a thing moving through space; it is space itself
    stretching and squeezing, a ripple in the metric travelling at the speed of
    light.
  - >-
    GW150914 changed LIGO's 4 km arms by about 4 × 10⁻¹⁸ metres, a thousandth
    the width of a proton, and that displacement carried the death of two black
    holes 1.3 billion light-years away.
  - >-
    Gravity radiates from the quadrupole, not the dipole, which is why
    gravitational waves are 40 orders of magnitude weaker than the
    electromagnetic kind and took a century to catch.
  - >-
    The signal's rising chirp encodes the binary's chirp mass directly; the
    frequency sweep is the orbit dying in real time, and the final ringdown is
    the new black hole tolling like a struck bell.
markdown_url: /blog/gravitational-waves/
canonical_url: 'https://benebsworth.com/blog/gravitational-waves/'
---
## Key takeaways

- A gravitational wave is not a thing moving through space; it is space itself stretching and squeezing, a ripple in the metric travelling at the speed of light.
- GW150914 changed LIGO's 4 km arms by about 4 × 10⁻¹⁸ metres, a thousandth the width of a proton, and that displacement carried the death of two black holes 1.3 billion light-years away.
- Gravity radiates from the quadrupole, not the dipole, which is why gravitational waves are 40 orders of magnitude weaker than the electromagnetic kind and took a century to catch.
- The signal's rising chirp encodes the binary's chirp mass directly; the frequency sweep is the orbit dying in real time, and the final ringdown is the new black hole tolling like a struck bell.

Here is a number to sit with before any physics arrives. On 14 September 2015, two black holes finished a four-billion-year dance by colliding 1.3 billion light-years from Earth, and the only thing that reached us was a change in the length of a 4 km steel-and-glass instrument of about $4 \times 10^{-18}$ metres. That is roughly a thousandth the diameter of a single proton. We measured it. We measured a fifth of a second of spacetime ringing, from an event so distant the light leaving it has been travelling since before complex life existed on this planet, and the whole signal moved a mirror by less than the width of the atomic nucleus you are made of.

The claim worth resisting is the one your intuition reaches for first: that a wave this faint must be a wave passing *through* space, like sound through air or a swell across the ocean. It isn't. There is no medium. The wave *is* the space, flexing. When the signal arrived, the ground under the detector got momentarily longer in one direction and shorter at right angles to it, not because anything pushed the atoms apart but because the geometry that defines "how far apart" briefly changed. The detector didn't hear a sound. It felt the distance between two points stop being constant. Everything below is an attempt to make that sentence ordinary.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Watch the wiggle on the left grow. Early on the two black holes are far apart and orbiting slowly, so the strain is a gentle, low oscillation. As they spiral in, the orbit speeds up, the frequency climbs, the amplitude swells, and the whole thing sweeps upward into a *chirp* before cutting off. The spectrogram underneath traces that sweep as a rising streak. Drag **m1** and **m2** and notice that heavier binaries chirp lower and die sooner. This shape is the entire phenomenon. The maths below explains why it's forced.

## What Einstein predicted and then doubted

In 1916, a year after he finished general relativity, Einstein worked out a consequence he found almost embarrassing. If gravity is the curvature of spacetime, and if a mass that accelerates changes the curvature around it, then that change should not appear everywhere at once. It should propagate outward at the speed of light, a ripple in the geometry itself. He had predicted gravitational waves. Then he spent the next twenty years unsure whether they were real or an artefact of the coordinates, even submitting a 1936 paper titled *Do Gravitational Waves Exist?* that argued, wrongly, that they didn't.

The reason for his doubt is the reason they're so hard to detect. Start from the metric, the object that tells you the distance between nearby points in spacetime. Far from any strong source, it's almost flat, and you can write it as flat space plus a tiny wrinkle.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
g_{ab} = \eta_{ab} + h_{ab}, \quad |h_{ab}| \ll 1
```

$$
g_{ab} = \eta_{ab} + h_{ab}, \quad |h_{ab}| \ll 1
$$

Here $\eta_{ab}$ is the flat background of special relativity, and $h_{ab}$ is the gravitational wave: a small, dimensionless distortion riding on top. The number that matters is the size of $h$, called the *strain*. It's a fractional length change, $\Delta L / L$: a strain of $10^{-21}$ means a 1-metre ruler changes length by $10^{-21}$ metres as the wave passes. Feed equation (1) into Einstein's field equations and, after discarding everything quadratic in the small quantity $h$, what survives is a wave equation. The wrinkle propagates at $c$. That much Einstein had by 1916.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The hardest mental move here is that there's nothing travelling *across* the detector. A water wave is water moving; a sound wave is air compressing. A gravitational wave is the metric itself oscillating, which means the very notion of "length" wobbles as it passes. Two mirrors at rest, touching nothing, feel their separation grow and shrink. You can't get out of its way, you can't shield against it, and you can't point to the stuff that's waving. The stuff that's waving is the relationship between *here* and *there*.

## Why gravity radiates from the quadrupole

Now to the part that makes gravitational waves a thousand-billion-billion times subtler than light. An accelerating electric charge radiates electromagnetic waves, and the dominant term is the *dipole*: separate a positive and a negative charge, shake them, and they broadcast. Gravity has no negative mass, so it has no dipole radiation at all. There is a deeper reason too. The would-be gravitational dipole is just the system's total momentum, and momentum is conserved, so its time-derivative vanishes and there's nothing to radiate.

That kills the leading term. The first source that survives is the next one up: the *quadrupole*, a measure not of where the mass is but of how lopsided its distribution is, and crucially how that lopsidedness is *accelerating*. A perfectly spherical pulsing star radiates nothing, however violently it pulses. You need asymmetry that changes in time. Two black holes whipping around each other are about as good a time-varying quadrupole as the universe builds.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{dE}{dt} = \frac{G}{5c^5}\sum_{ij}\left(\frac{d^3 I_{ij}}{dt^3}\right)^2
```

$$
\frac{dE}{dt} = \frac{G}{5c^5}\sum_{ij}\left(\frac{d^3 I_{ij}}{dt^3}\right)^2
$$

Look at the prefactor: $G/c^5$. That $c^5$ in the denominator is astronomical, about $2.7 \times 10^{42}$ in SI units, and dividing by it is what makes gravitational radiation so feeble. It's why you can swing your arms all day and not lose a measurable joule to gravitational waves. To radiate anything detectable you need masses comparable to the Sun, moving at a sizeable fraction of $c$, with a quadrupole that changes shape on a timescale of milliseconds. Only the most violent objects in the cosmos qualify.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The $1/c^5$ in equation (2) is the single number that explains the hundred-year gap between prediction and detection. Electromagnetic radiation scales with $1/c^3$ from a dipole; gravity loses the dipole entirely and pays an extra two powers of $c$ on top. The net result is that gravitational coupling to "antennas" is weaker than electromagnetic coupling by something like 40 orders of magnitude. Einstein was right that the waves exist and right to suspect we'd never feel them with the technology of his lifetime. It took laser interferometers, atomic clocks, and seismic isolation he could not have imagined.

## How two test masses feel the wave

So the wave arrives. What does it actually *do* to matter? Nothing, in one sense: it doesn't push individual particles. What it changes is the distance between particles that are otherwise free. The right tool is the geodesic deviation equation, which tracks the separation vector $\xi$ between two nearby free-falling test masses as spacetime curvature acts on them.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{d^2\xi_j}{dt^2} = -c^2\, R_{0j0k}\,\xi^k
```

$$
\frac{d^2\xi_j}{dt^2} = -c^2\, R_{0j0k}\,\xi^k
$$

The left side is the relative acceleration of the two masses; the right side is curvature, the Riemann tensor, doing the pushing. A passing gravitational wave makes $R_{0j0k}$ oscillate, so $\xi$ oscillates: the masses drift apart, then together, then apart, in step with the wave. Here's the geometry that makes the whole detection scheme work. The wave has two polarisations, and the dominant one stretches space along one axis while squeezing it along the perpendicular axis, then reverses. A ring of free test masses with a wave passing through it pulses into an ellipse, taller then wider then taller, like a balloon someone is gently rolling between two hands.

That is exactly why LIGO has two arms at right angles. When one arm gets longer, the other gets shorter, and a laser bouncing down both can compare their lengths by watching its own light go in and out of step. The differential design is not an engineering nicety; it's matched to the literal shape of the distortion equation (3) describes.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

With the spectrogram off, the strain trace tells the orbital story directly. Each oscillation is half an orbit (the quadrupole is symmetric, so the wave frequency is *twice* the orbital frequency). The envelope swelling toward the end is the orbit decaying: as the black holes lose energy to the waves they fall closer, orbit faster, and radiate harder, which makes them fall faster still. It's a runaway. The last few cycles, where the curve goes vertical, are the final orbits before they touch.

## The chirp: an orbit dying in your ear

The shape in the lab has a name, and the name is the whole insight. As the binary loses orbital energy to gravitational waves, equation (2) feeds back on itself: radiating shrinks the orbit, a smaller orbit radiates more, so the frequency and amplitude both run away upward in the final moments. That rising sweep, low to high in a fraction of a second, is acoustically a *chirp*, the sound a bird makes. Shift GW150914 into audio and it's a swift "whoop" rising from a low note to a high one and stopping. The signal swept from 35 Hz to 250 Hz in about 0.2 seconds.

The strain you measure during that inspiral has a beautifully compact form. It depends on distance, on frequency, and on a single combination of the two masses called the *chirp mass*.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
h(t) = \frac{4G}{c^4}\,\frac{m_c^{5/3}}{r}\left(\frac{\pi f}{c}\right)^{2/3}
```

$$
h(t) = \frac{4G}{c^4}\,\frac{m_c^{5/3}}{r}\left(\frac{\pi f}{c}\right)^{2/3}
$$

The chirp mass is $m_c = (m_1 m_2)^{3/5}/(m_1+m_2)^{1/5}$, a particular weighted blend of the two masses. The reason it matters so much is that the *rate* at which the chirp sweeps upward in frequency depends on $m_c$ alone. Measure how fast the note rises and you have weighed the binary, without ever seeing it, from a wiggle in a detector. Once you know the masses, the amplitude in equation (4) tells you the distance, because a heavier-sounding chirp that arrives faint must be far away. From 0.2 seconds of signal LIGO read off two masses, a distance, and a final mass. That is what the chirp is: an orbit converting itself into a signature you can decode.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Pause on that last number, because it's the most violent statistic in modern physics. Three solar masses of energy, $3 \times M_\odot c^2$, were radiated as gravitational waves in roughly a fifth of a second. For that brief instant the merger outshone the combined light of every star in the observable universe, by a factor of fifty, in a channel that emits no light at all. None of it reached us as heat or radiation. It reached us as geometry, a passing flex in the shape of space, and even at that absurd luminosity it moved a mirror by less than a proton's width because it had spread across 1.3 billion light-years of sky.

## Reading the merger and the ringdown

GW150914 was two black holes of 36 and 29 solar masses, give or take a few each, that merged into a single black hole of 62 solar masses. Add the parents: 36 plus 29 is 65. The remnant is 62. The missing 3 solar masses are exactly the energy radiated, by $E = mc^2$, the most expensive accounting in the sky. The signal records all three acts. The long inspiral chirp, building over the visible part of the wave. The merger, where the two horizons touch and the equations stop being solvable by hand and need supercomputers. Then the third act, the part that makes the whole event sound like an instrument.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

When the two horizons merge, the result is a single distorted black hole that can't stay distorted. It sheds its lumps by *ringing*: damped oscillations at a few characteristic frequencies, exactly like a struck bell settling to silence, called the *ringdown*. These are the black hole's quasinormal modes, and their pitch and decay time are set entirely by the final mass and spin. So the ringdown is an independent measurement of the remnant, and it agreed with the mass and spin the inspiral chirp had already implied. A black hole tolls, briefly, in gravitational waves, and the note tells you its size. After a few cycles it falls quiet, having settled into the smooth, featureless Kerr geometry that is the only shape a black hole is allowed to keep.

There's a subtlety in the duration worth getting right. The signal lasted about 0.2 seconds, but the merger was not a 0.2-second event. The black holes had been spiralling in for billions of years. What lasted 0.2 seconds was the slice of the inspiral that happened to sweep through LIGO's sensitive band, from 35 Hz up to 250 Hz. Below 35 Hz the wave was real but too low and slow for the detector to pick out of the seismic noise. The "fifth of a second" is the window in which the dying orbit was loud enough and fast enough to register, not the lifetime of the system. The black holes had been falling toward this for longer than the Earth has existed.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

We did not photograph the collision. We felt its shockwave in the geometry of our own laboratory, 1.3 billion years after the event, as a chirp lasting a fifth of a second.

## We had a witness before LIGO

None of this should suggest the 2015 detection came out of nowhere. There was indirect proof on the books for forty years. In 1974, Russell Hulse and Joseph Taylor found a pulsar, a spinning neutron star sweeping a radio beam past Earth like a lighthouse, locked in orbit with another neutron star. A pulsar is a clock of extraordinary precision, so they could track the orbit with exquisite accuracy. And the orbit was shrinking.

If general relativity is right, that binary must be radiating gravitational waves, bleeding orbital energy by exactly the amount equation (2) prescribes, which means the two stars should spiral together and the orbital period should shorten at a calculable rate. Hulse and Taylor measured the orbit decaying by about 76.5 microseconds per year. The quadrupole formula predicted that decay to better than 0.2 percent, with no free parameters. The stars were falling together precisely as fast as the energy carried off by gravitational waves required. It won the 1993 Nobel Prize, and it told everyone the waves were real two decades before anyone caught one directly. LIGO confirmed what the Hulse-Taylor binary had already all but proven: spacetime radiates, and you can hear an orbit die.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Two quick corrections to the cartoon. First, the black holes don't crash and stop like billiard balls. They undergo a smooth, accelerating inspiral, radiating away orbital energy continuously until the horizons merge; there's no impact, just a runaway fall. Second, although we keep saying "hear", LIGO is not an ear. It measures a physical length change between mirrors with laser interferometry, then we *sonify* the result, shifting the strain into the audible range so a human can recognise the chirp. The "sound" is a translation for our benefit. The signal itself is silent geometry.

## A new sense

For all of recorded history, astronomy meant catching light: visible, radio, X-ray, infrared, every window onto the electromagnetic spectrum. GW150914 opened a channel that has nothing to do with light. Gravitational waves pass through dust, through stars, through the opaque early universe that no telescope can see past, because they couple to mass-energy itself and almost nothing absorbs them. The thing that makes them maddening to detect, that they barely interact, is the thing that makes them priceless: they arrive unscattered, carrying the unfiltered motion of the densest objects in existence.

What we caught was a collision of two black holes, an event that emits no light at all, invisible to every telescope ever built, and we caught it cleanly. Since then the detectors have logged neutron stars merging (with a gamma-ray flash and a kilonova that forged gold and platinum), dozens more black hole pairs, and the slow groan of supermassive binaries showing up in the timing of pulsars across the galaxy. We spent a century deaf to it. Now there's a second way to listen to the universe, and the first thing it told us was the precise weight of two black holes that died before the Earth was born. Some food for thought, the next time you read that a number can't matter much because it's small.

## Reading further

- [Abbott et al., *Observation of Gravitational Waves from a Binary Black Hole Merger* (Phys. Rev. Lett. 116, 061102, 2016)](https://link.aps.org/doi/10.1103/PhysRevLett.116.061102). The discovery paper for GW150914; the masses, the strain, the chirp and ringdown all come straight from here. It led to the 2017 Nobel Prize.
- [Abbott et al., *Properties of the binary black hole merger GW150914* (Astrophys. J. Lett. 818, L22, 2016)](https://dcc.ligo.org/LIGO-P1500218/public). The companion paper that nails down the precise masses (36 and 29 M☉), the distance, and the ringdown analysis.
- [Hulse & Taylor, *Discovery of a pulsar in a binary system* (Astrophys. J. Lett. 195, L51, 1975)](https://en.wikipedia.org/wiki/Hulse%E2%80%93Taylor_pulsar). The binary pulsar whose decaying orbit confirmed the quadrupole formula to 0.2 percent, forty years before a direct detection.
- [Thorne, *Black Holes and Time Warps: Einstein's Outrageous Legacy* (W. W. Norton, 1994)](https://www.amazon.com/Black-Holes-Time-Warps-Commonwealth/dp/0393312763). The Nobel laureate's narrative of the physics and the people behind LIGO; the best long-form account of how the detectors came to be.
