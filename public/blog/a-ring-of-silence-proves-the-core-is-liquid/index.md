---
title: A ring of silence proves the core is liquid
date: '2026-11-10T08:00:00.000Z'
description: >-
  Trace earthquake rays through a PREM Earth to see why S waves stop near 103°,
  why P waves vanish in a ring to 143°, and what Lehmann heard inside it.
labels: 'earth science,geophysics,seismology,earthquakes'
release: true
heroImage: /blog/a-ring-of-silence-proves-the-core-is-liquid/hero.webp
takeaways:
  - >-
    No shear wave arrives beyond about 103° from an earthquake, because a liquid
    outer core carries no shear.
  - >-
    Compressional waves vanish in a ring from roughly 103° to 143° because the
    core is slower than the mantle and bends rays toward its centre.
  - >-
    Faint PKIKP arrivals inside that ring, first noticed by Inge Lehmann in
    1936, mark a solid inner core.
  - >-
    Geometric ray theory in PREM puts the model edges at 98° and 145°; the
    observed edges differ because of diffraction and the PKP caustic.
markdown_url: /blog/a-ring-of-silence-proves-the-core-is-liquid/
canonical_url: 'https://benebsworth.com/blog/a-ring-of-silence-proves-the-core-is-liquid/'
---
## Key takeaways

- No shear wave arrives beyond about 103° from an earthquake, because a liquid outer core carries no shear.
- Compressional waves vanish in a ring from roughly 103° to 143° because the core is slower than the mantle and bends rays toward its centre.
- Faint PKIKP arrivals inside that ring, first noticed by Inge Lehmann in 1936, mark a solid inner core.
- Geometric ray theory in PREM puts the model edges at 98° and 145°; the observed edges differ because of diffraction and the PKP caustic.

The deepest hole anyone has drilled is about 12 km, a scratch on a planet 6371 km in radius. Yet every textbook states, without much fuss, that 2891 km down the rock gives way to liquid iron, and that 1221.5 km from the centre the liquid freezes again into a solid ball. Nobody has seen a sample.

What we have instead is silence. Put a seismometer at the right distance from a large earthquake and some of the waves never show up. Shear waves stop arriving beyond about 103° of arc. Compressional waves vanish in a ring from about 103° to 143°, then come back, late and bent, on the far side. The shape of that silence is the core.

I find this one of the most satisfying arguments in science. It uses nothing more than Snell's law, applied a hundred times over, and a planet acting as its own lens. So let's build the lens.

## What to try first

The model below fires a fan of 38 rays from a quake at the top of a PREM Earth, the Preliminary Reference Earth Model of Dziewonski and Anderson (1981). Cyan rays stay in the mantle. Violet rays bend through the liquid outer core (seismologists call them PKP), amber rays cross the solid inner core (PKIKP), and dim grey rays reflect from a core boundary. The sky-blue belt on the globe is the shadow: the gap between the last mantle ray and the first core ray, swept around the axis from the quake to its antipode.

Press play and watch the ray tips sweep the planet like wavefronts. Direct P reaches 90° after 13.0 min. Then the mantle rays run out at 98.4°, and nothing violet lands until 145.1°. Scrub back to about 19 min and look for the amber rays landing inside the belt. Those caused the trouble in 1936.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

Then select the **S waves** preset. The belt grows into a cap covering everything beyond 102.7°, because no shear ray gets through the liquid at all. For a bigger canvas, [the standalone seismic shadow lab](/lab/seismic-shadow/) runs the same model.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Predict before you drag. In the default view, will raising the outer-core speed to 1.5× PREM make the shadow wider or narrower? Will the antipodal PKIKP arrive earlier or later? Will the direct-P edge at 98.4° move at all? Now select **Fast core ×1.5** and check the readouts. Then try **Small core 2800 km** and ask the same three questions.

## Rays bend because the Earth gets faster with depth

Seismic velocity in the mantle rises with depth, from 5.8 km/s in the crust to 13.7 km/s just above the core. A ray heading down into faster rock bends away from the vertical. Bend it enough and it turns over and comes back up. In a spherically symmetric Earth, the quantity that stays fixed along the whole ray is the ray parameter:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
p = \frac{r\,\sin i}{v}
```

$$
p = \frac{r\,\sin i}{v}
$$

Here $r$ is the radius, $v$ the local velocity and $i$ the angle between the ray and the vertical. The units are seconds per radian, and the take-off angle at the source fixes $p$ once. A ray turns where $\sin i = 1$, which means where $r/v$ has fallen to $p$. Solving equation (1) for the ray that just grazes the inner core gives a take-off of about 5.8°, and the lab always draws that ray.

Each mantle ray in the lab is a chain of Snell's-law refractions through 120 thin shells. Within one shell I let the velocity follow a power law in radius, $v = a r^{1-q}$, because then the angular distance across the shell has a closed form:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\Delta_{\rm shell} = \frac{1}{q}\left[\arccos\frac{p}{\eta_{\rm top}} - \arccos\frac{p}{\eta_{\rm bottom}}\right]
```

$$
\Delta_{\rm shell} = \frac{1}{q}\left[\arccos\frac{p}{\eta_{\rm top}} - \arccos\frac{p}{\eta_{\rm bottom}}\right]
$$

With $q = 1$ the shell has constant velocity and the formula collapses to a straight chord. The payoff is accuracy: 120 and 600 shells agree on every shadow edge to a few hundredths of a degree. Straight chords alone would need thousands of shells, because chords never curve back.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The last mantle ray is the one that grazes the core. Everything steeper falls in.

So where does the mantle run out? The steepest ray that still turns above the core has $p$ equal to $r/v$ at the base of the mantle, $3480 / 13.72 = 253.6$ s/rad. Trace it and it lands at 98.4°. Any ray steeper than that reaches the core-mantle boundary and crosses it. That is the inner edge of the ring.

## The liquid core bends P waves the wrong way

At the core-mantle boundary the P velocity drops from 13.72 km/s to 8.06 km/s, a fall of 41%. Snell's law at that interface reads

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\sin i_{\rm core} = \frac{v_{\rm core}}{v_{\rm mantle}}\,\sin i_{\rm mantle} = \frac{8.06}{13.72}\,\sin 30^\circ = 0.294 \;\Rightarrow\; i_{\rm core} = 17.1^\circ
```

$$
\sin i_{\rm core} = \frac{v_{\rm core}}{v_{\rm mantle}}\,\sin i_{\rm mantle} = \frac{8.06}{13.72}\,\sin 30^\circ = 0.294 \;\Rightarrow\; i_{\rm core} = 17.1^\circ
$$

A ray that hits the boundary at 30° from the normal continues at 17.1°. Entering slower material bends a ray toward the normal, which in a sphere means toward the centre. The core behaves like a glass ball in the middle of the planet: every ray that enters swings inward around a deep turning point and climbs out much further round than a mantle ray could have gone.

That is why the ring is a ring. The mantle rays stop at 98.4°. The core rays start landing at 145.1°, and between the two is a belt where, in geometric ray theory, nothing arrives at all.

Here is a check worth doing by hand. Suppose the mantle had one uniform velocity and the core were simply a slower ball of radius $r_c$. The grazing ray is then a straight chord tangent to the core, and the shadow starts at

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\Delta_{\max} = 2\arccos\frac{r_c}{R} = 2\arccos\frac{3480}{6371} = 113.8^\circ
```

$$
\Delta_{\max} = 2\arccos\frac{r_c}{R} = 2\arccos\frac{3480}{6371} = 113.8^\circ
$$

The real value is 98.4°, some 15° shorter, and the whole difference is the mantle's velocity gradient bending the ray back before it gets as far as a straight chord would. The unit tests feed the tracer a single-shell Earth and demand 113.8°. If the shell bookkeeping were wrong, that test would fail first.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The history runs in the opposite order to the physics. Richard Oldham inferred a core in 1906 from the late arrival of shear waves beyond about 130°. Beno Gutenberg used the P shadow in 1913 to put the boundary near 2900 km depth, within 10 km of the modern 2891 km. Harold Jeffreys argued in 1926 that the outer core must be liquid, and Inge Lehmann proposed the solid inner core in 1936 from faint P′ arrivals recorded in Europe from a New Zealand earthquake.

## Shear waves simply stop

Select the **S waves** preset and the picture changes character. S waves move rock sideways, and a liquid has no resistance to being sheared, so the shear velocity in the outer core is zero. There is no refracted ray to draw. Every S ray that touches the core-mantle boundary reflects straight back up as ScS, drawn in grey, and the last direct S ray grazes the core and lands at 102.7°. Beyond that the model shows a cap rather than a ring.

The observed limit is about 103°, so here the geometric model and the seismograms agree closely. Jeffreys' argument in 1926 was essentially this picture plus the Earth's tides. A solid core with any plausible rigidity would carry S waves and the far side of the planet would not be quiet. It is quiet. So the outer core is liquid.

There are footnotes, as there always are. Shear energy can convert to P at the core boundary, cross the liquid, and convert back to S on the way out. That phase is SKS and it does arrive beyond 103°. The lab does not draw conversions, so read "no S beyond 103°" as "no S that stayed S".

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Some food for thought. The same argument works on any body with a seismometer. The Apollo network found the Moon's shear waves attenuated sharply through a partially molten zone near its centre, and InSight used core reflections to measure a liquid Martian core about 1830 km in radius. Nobody drilled there either.

## Lehmann's faint arrivals inside the ring

Scrub the timeline to about 19 min with the default settings and look at the belt. Amber rays land inside it, from about 116° outward. These rays went steeper than the PKP rays, hit the inner-core boundary, and crossed into material that is faster again (10.36 km/s to 11.03 km/s in PREM). Entering faster material bends a ray away from the normal, which undoes some of the inward pull, so inner-core rays land well short of 145°.

Those arrivals are PKIKP. In 1936 Inge Lehmann noticed P′ arrivals in European records of the 1929 Murchison earthquake at distances where the shadow should have been empty, and she argued that a smaller, faster core inside the core was the simplest explanation. Her estimate of its radius, about 1400 km, was within 15% of the modern 1221.5 km.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The shadow is the proof of a liquid core. The whispers inside the shadow are the proof of a solid one.

The lab also draws the rays that reflect from the inner-core boundary, PKiKP, in grey. In the model those are only the rays that totally reflect, a window so narrow that the fan carries a single one, landing near 127°; scanned densely they land from 116° to 153°. Real reflections happen at every incidence and are weak, which is why the classical shadow still looked empty to Gutenberg. Amplitude is a different problem from geometry, and this model only does geometry.

## Where the model and the textbook disagree

I want to be honest about the gap. PREM ray theory gives a P shadow from 98.4° to 145.1°. The number every textbook quotes is 103° to 143°. The lab prints both, and the difference is physics the model omits rather than a bug.

The 98° to 103° gap is diffraction. A wave grazing the core-mantle boundary creeps along it as a diffracted phase, Pdiff, and leaks energy back to the surface for several degrees beyond the last ray. Diffracted P is recorded well inside the shadow, out to 130° and beyond at long periods, but it is weak and arrives late; the catalogues draw the edge near 103°, where the direct arrival fades into the diffracted one.

The 143° to 145° gap is a caustic. The PKP branch folds over at its minimum distance, and near a fold the ray density, and hence the amplitude, goes through a sharp maximum. Seismologists call it the B caustic. Textbooks round the folded edge to 143°. PREM ray theory puts it near 145°, and the 120-shell model converges on 145.1° for this profile.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Everything in the lab is a geometric ray in a spherically symmetric, one-dimensional Earth. There are no amplitudes, no diffraction, no converted phases, no attenuation and no lateral variation in the mantle. The source sits at the surface rather than at depth. The core-radius control stretches the lower-mantle and outer-core profiles onto the new boundary, which is a thought experiment rather than a candidate planet.

## Numbers for a planet you cannot drill

Travel times are the second half of the evidence, because they turn a yes-or-no shadow into a velocity profile. Along a ray with parameter $p$, the angular distance and travel time are integrals over radius:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\Delta(p) = 2\int_{r_t}^{R}\frac{p\,\mathrm{d}r}{r\sqrt{\eta^2 - p^2}},\qquad T(p) = 2\int_{r_t}^{R}\frac{\eta^2\,\mathrm{d}r}{r\sqrt{\eta^2 - p^2}}
```

$$
\Delta(p) = 2\int_{r_t}^{R}\frac{p\,\mathrm{d}r}{r\sqrt{\eta^2 - p^2}},\qquad
T(p) = 2\int_{r_t}^{R}\frac{\eta^2\,\mathrm{d}r}{r\sqrt{\eta^2 - p^2}}
$$

Equation (2) is what you get when you do these integrals exactly inside one power-law shell. Summed over 120 shells, the lab reproduces the IASP91 travel-time tables of Kennett and Engdahl (1991) to within a few seconds. Direct P lands at 90° after 779.7 s in the model against 779 s in the tables. The vertical ray through the inner core to the antipode takes 1210.5 s against 1212 s. A wrong profile cannot be right about both the shadow edges and the clock.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

The presets break the agreement on purpose. **Fast core ×1.5** leaves the direct edge at 98.4° alone, because the mantle has not changed, but pulls the first PKP arrival in to 108.0° and brings the antipodal PKIKP forward to 17.5 min. The refraction readout moves from 17.1° to 26.2°. It also does something I did not expect: the outer core becomes faster than the inner core, so inner-core rays bend toward the normal and retreat to within 2° of the antipode. **Small core 2800 km** shifts the belt outward to 115.5°-153.6° and slows P at 90° to 13.3 min, because the stretched lower mantle is slower per kilometre.

Run the outer-core speed the other way, to 0.7× PREM, and the PKP edge walks out to 165°. Push it to 0.6× and the belt reaches 175°, with a slow antipode at 25.5 min. The observed 143° only fits a core whose P velocity drops by roughly 40% at the boundary, which is the quantitative version of "the core is slow".

## A lens the size of a planet

Perhaps the thing I take from building this is how little it took. Snell's law, a velocity that increases with depth, and a boundary where it drops. From those, a ring of silence at a predictable distance, a cap of silence for shear, and whispers inside the ring where the inner core says they should be. The planet is a lens, and the seismometers on its surface read the focal pattern.

What I would like to add next is amplitude. A geometric ray fan cannot show the B caustic brightening or the Pdiff fade, and those two effects are exactly where the lab and the catalogue part ways. Tracking the ray-tube cross-section through the same 120 shells should be enough to paint intensity onto the globe. Then the belt would lose its hard edges and look like the real thing: a shadow with a penumbra. Watch this space.

## Reading further

- [Dziewonski & Anderson (1981), Preliminary reference Earth model](https://doi.org/10.1016/0031-9201(81)90046-7): the PREM velocity polynomials the lab samples, with the 13.72 → 8.06 km/s drop at the core-mantle boundary.
- [Kennett & Engdahl (1991), Traveltimes for global earthquake location and phase identification](https://doi.org/10.1111/j.1365-246X.1991.tb06724.x): the IASP91 tables the model's 90° and antipodal times are checked against.
- [USGS, The Interior of the Earth](https://pubs.usgs.gov/gip/interior/): a short public-domain account of how shadow zones and travel times gave us the layered Earth.
- [IRIS, Seismic shadow zone: basic introduction](https://www.iris.edu/hq/inclass/animation/seismic_shadow_zone_basic_introduction): an animated classroom explanation of the P and S shadow zones to set beside the lab.
