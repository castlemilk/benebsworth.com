---
title: The Sun pulls harder but the Moon makes the tides
date: '2026-11-10T07:00:00.000Z'
description: >-
  The Sun's pull on Earth is 179 times the Moon's, yet the Moon raises 2.2 times
  the tide. Build the equilibrium ocean and spin under its two bulges.
labels: 'earth,oceanography,celestial-mechanics,gravity,tides'
release: true
heroImage: /blog/the-sun-pulls-harder-but-the-moon-makes-the-tides/hero.webp
takeaways:
  - >-
    A tide is a difference of gravitational pulls across Earth's width, and
    differences fall as the inverse cube of distance rather than the inverse
    square.
  - >-
    The equilibrium ocean has two bulges, one facing the Moon and one facing
    away, so a point on the rotating Earth passes two high waters per lunar day
    of 24 h 50 min.
  - >-
    When the Moon stands off the equator, the two daily highs are unequal, and
    at 45° latitude one of them can sit below the undisturbed sea surface.
  - >-
    Equilibrium amplitudes are decimetres; the metres seen in harbours are
    resonant ocean responses to this forcing, not the bulge itself.
markdown_url: /blog/the-sun-pulls-harder-but-the-moon-makes-the-tides/
canonical_url: >-
  https://benebsworth.com/blog/the-sun-pulls-harder-but-the-moon-makes-the-tides/
---
## Key takeaways

- A tide is a difference of gravitational pulls across Earth's width, and differences fall as the inverse cube of distance rather than the inverse square.
- The equilibrium ocean has two bulges, one facing the Moon and one facing away, so a point on the rotating Earth passes two high waters per lunar day of 24 h 50 min.
- When the Moon stands off the equator, the two daily highs are unequal, and at 45° latitude one of them can sit below the undisturbed sea surface.
- Equilibrium amplitudes are decimetres; the metres seen in harbours are resonant ocean responses to this forcing, not the bulge itself.

Here is a number that should bother you. The Sun's gravitational pull on Earth is 178.7 times stronger than the Moon's. Yet the Moon raises a tide 2.2 times taller than the Sun's. If tides were about who pulls hardest, the Sun would win by two orders of magnitude and the Moon would be a rounding error.

Tides are not about who pulls hardest. They are about who pulls *unevenly*. The ocean on the side of Earth nearest the Moon is 6371 km closer to it than Earth's centre, and the far side is 6371 km further away. A tide is the difference between those pulls, and differences of an inverse-square force fall off as the inverse cube. The Sun's enormous distance costs it one extra factor of distance, and that single factor turns 179 into 0.46.

I wanted to see this rather than take it on trust, so we'll build Newton's equilibrium ocean from the real masses and distances, exaggerate its bulge a few million times so it is visible, and then spin an observer under it for one lunar day.

## Spin under two bulges

Start with **Spring tide, new Moon**. The white arrow points at the Moon and the amber arrow at the Sun, both in the same direction, and the blue ocean is stretched along their shared axis into two bulges. Press play. The faint rings of the solid Earth turn beneath the bulges, and the violet observer at 45° latitude rides up and down twice. Then drag the Sun-Moon angle to 90° and watch the ocean slump as the Sun's bulge swings across the Moon's.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

The strip above the globe is the honest part of the picture. It plots the water height under the observer through one lunar day, in metres, while the globe's bulge is scaled up by a factor of about 4.2 million so that both bulges are visible at all. The readouts carry the real magnitudes: a spring range at the equator of 0.781 m, a neap range of 0.289 m.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The far-side bulge needs no centrifugal argument about Earth swinging around the Earth-Moon barycentre. It falls straight out of differential gravity: the far-side water is pulled toward the Moon *less* than Earth's centre is, so relative to the centre it is left behind. Both bulges come from the same subtraction.

## Subtract the pull at the centre

Take a body of mass $M$ at distance $d$ from Earth's centre, and look at the water directly beneath it, at distance $d - R$. Earth as a whole falls toward the body with acceleration $GM/d^2$. The near-side water falls a little faster. What the ocean feels is the difference:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
a_{\text{tidal}} = \frac{GM}{(d-R)^2} - \frac{GM}{d^2} \approx \frac{2GMR}{d^3}
```

$$
a_{\text{tidal}} = \frac{GM}{(d-R)^2} - \frac{GM}{d^2} \approx \frac{2GMR}{d^3}
$$

For the Moon this is $1.10 \times 10^{-6}\ \mathrm{m/s^2}$, about $1.1 \times 10^{-7}$ of surface gravity. That is a tiny tilt in the direction of "down", and it is enough.

The inverse cube is the whole story. Form the Sun-to-Moon ratio of the direct pulls and you get the mass ratio times an inverse-square distance ratio. Form the ratio of tidal accelerations and the distance ratio appears cubed:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{M_s}{M_m}\left(\frac{d_m}{d_s}\right)^2 = 178.7, \qquad \frac{M_s}{M_m}\left(\frac{d_m}{d_s}\right)^3 = 0.459
```

$$
\frac{M_s}{M_m}\left(\frac{d_m}{d_s}\right)^2 = 178.7,
\qquad
\frac{M_s}{M_m}\left(\frac{d_m}{d_s}\right)^3 = 0.459
$$

The extra factor is $d_m/d_s = 384{,}400 / 149{,}600{,}000 \approx 1/389$. Multiply 178.7 by it and you get 0.459. The Sun loses because it is 389 times further away, and a tide charges that distance twice over: once in the inverse square, once more because a difference across a fixed width shrinks with distance too.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

A tide charges for distance twice: once in the inverse square, and once more because a difference across a fixed width also shrinks with distance.

## The shape of the equilibrium ocean

Newton's trick, in Book III of the *Principia*, was to ask what shape a frictionless, instantly responding ocean would settle into under this differential force. The answer is a surface of constant total potential. Work it through and the height above the undisturbed sphere is a second-degree Legendre polynomial in the angle $\psi$ between your zenith and the body:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\zeta = \frac{M}{M_E}\left(\frac{R}{d}\right)^3 R\; P_2(\cos\psi), \qquad P_2(x) = \frac{3x^2 - 1}{2}
```

$$
\zeta = \frac{M}{M_E}\left(\frac{R}{d}\right)^3 R\; P_2(\cos\psi),
\qquad
P_2(x) = \frac{3x^2 - 1}{2}
$$

Two things are worth looking at in that expression. First, $P_2$ is even in $\cos\psi$, so the point directly under the body ($\psi = 0$) and the point directly opposite ($\psi = 180^\circ$) have exactly the same height. That is the far-side bulge, and it is why the ranges in the lab are identical at new Moon and full Moon. Second, $P_2$ runs from $+1$ to $-\tfrac12$, not $-1$. The bulges rise one amplitude; the ring of low water around the middle drops only half an amplitude. The range at the equator is therefore $1.5$ amplitudes, not 2.

Put the constants in. With $M_m/M_E = 0.0123$, $d_m = 384{,}400$ km and $R = 6371$ km, the lunar amplitude $A_m$ is 0.357 m. For the Sun, $M_s/M_E = 332{,}946$ and $d_s = 1.496 \times 10^8$ km give $A_s = 0.164$ m. At spring tide the two add: an equatorial range of $1.5 \times (0.357 + 0.164) = 0.781$ m. At neap the Sun's bulge sits on the Moon's low-water ring, and they subtract: $1.5 \times (0.357 - 0.164) = 0.289$ m. At 45° latitude the factor $\cos^2\phi$ halves both, to 0.390 m and 0.145 m. Those are the four numbers the equatorial and observer readouts show as you move the first slider from 0° to 90°.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Some food for thought: Newton derived all of this in 1687 but did not know the Moon's mass. He ran the argument backwards, taking tide heights at Bristol and Plymouth and inferring that the Moon's tidal force was about 4.5 times the Sun's. The modern value is 2.18. The method was right; the input data was a resonant estuary, which is the one thing the equilibrium theory cannot describe. I find it oddly reassuring that Newton was off by a factor of two for exactly the reason this post has to add a warning about.

The Moon's orbit is not circular, and the inverse cube makes that matter. At perigee, 356,500 km, $A_m$ rises to 0.447 m; at apogee, 406,700 km, it falls to 0.301 m. A 12% drop in distance becomes a 48% rise in tide. Drag the Moon distance slider across its range with the spring preset selected and the equatorial range swings from 0.698 m to 0.917 m. That is the "king tide" of the newspapers: a perigee that happens to land on a new or full Moon.

## Why you get two highs a day, and why they are not equal

Now put yourself at latitude $\phi$ and let Earth turn. Your angle from the Moon changes with the hour angle $H$, and if the Moon has declination $\delta$ above the equator, spherical trigonometry gives $\cos\psi$ as a sum of two terms. Push that through $P_2$ and the tide splits into three species:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\begin{aligned} \cos\psi &= \sin\phi\sin\delta + \cos\phi\cos\delta\cos H \\ P_2(\cos\psi) &= \tfrac14(3\sin^2\phi - 1)(3\sin^2\delta - 1) + \tfrac34\sin 2\phi\,\sin 2\delta\,\cos H + \tfrac34\cos^2\phi\,\cos^2\delta\,\cos 2H \end{aligned}
```

$$
\begin{aligned}
\cos\psi &= \sin\phi\sin\delta + \cos\phi\cos\delta\cos H \\
P_2(\cos\psi) &= \tfrac14(3\sin^2\phi - 1)(3\sin^2\delta - 1)
+ \tfrac34\sin 2\phi\,\sin 2\delta\,\cos H
+ \tfrac34\cos^2\phi\,\cos^2\delta\,\cos 2H
\end{aligned}
$$

The last term goes as $\cos 2H$: two cycles per lunar day. That is the semidiurnal tide, the one everyone knows, and the lunar day is 24 h 50 min rather than 24 h because the Moon moves on while Earth turns, so the highs land 12 h 25 min apart. The middle term goes as $\cos H$, once per lunar day, and it is the interesting one. It is proportional to $\sin 2\delta$, so it vanishes when the Moon is over the equator, and to $\sin 2\phi$, so it vanishes at the equator and at the poles and peaks at 45°.

When it is present it adds to one semidiurnal crest and subtracts from the other. Select **Lunar standstill**, which puts the Moon at its maximum declination of 28.5° with the observer at 45°. The two highs under the observer read 0.355 m and −0.094 m. The second "high water" of the day is below the undisturbed sea surface. That is the diurnal inequality, and it is why tide tables for places like the Gulf of Mexico or parts of the Western Australian coast show one tall high and one feeble one.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Predict before you drag, with **Lunar standstill** selected:

1. Move the Sun-Moon angle from 0° to 90°. Will the smaller high get taller, shorter, or disappear? (The readout changes to "one high".)
2. Put the angle back at 0° and set declination to 0°. By how much do the two highs differ now? (They become equal at 0.130 m; leave the angle at 90° instead and they are 0.007 m.)
3. Push latitude to 80° at 28.5° declination. How many highs per lunar day? (One, and the lunar-only maximum is a mere 0.081 $A_m$.)

There is a clean threshold hiding in the lunar-only term. The second lunar high sits at $\cos\psi = -\cos(\phi + \delta)$, so it drops below the undisturbed sphere once $\cos^2(\phi + \delta) < 1/3$, that is once $\phi + \delta > 54.7^\circ$. At 45° latitude the Moon only has to climb past 9.7° declination for the smaller high to go negative in the lunar-only tide. Push $\phi + \delta$ past 90° and the second maximum vanishes altogether: the tide becomes purely diurnal, one high per lunar day, which is what the 80° end of the latitude slider shows.

A small but real wrinkle: the mean of $\zeta$ over a lunar day at a given latitude is not zero. The long-period term in equation 4 shifts it. At 45° with the Moon on the equator the daily mean sits 0.065 m below the undisturbed sphere, which is why the default neap highs of 0.007 m look so weak against the $\zeta = 0$ line while still being 0.07 m above the day's own mean. The lab's reference line is the undisturbed sphere, deliberately, because "mean sea level" would move with latitude and declination.

## What the equilibrium tide is not

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Every metre in this post is an equilibrium value: the height of a frictionless ocean that responds instantly and covers the whole planet. Real oceans do neither. The tide is a forced wave in basins with coastlines, continental shelves and resonances, and it lags the Moon by hours. The Bay of Fundy's 16 m range is a resonant response to a forcing whose equilibrium amplitude is 0.36 m. Do not use the readouts to plan a crossing.

The model holds the Sun in Earth's equatorial plane and freezes the Sun-Moon angle through the lunar day; in reality it drifts about 12° per lunar day, which is how spring and neap alternate on a fortnightly cycle. The Sun's own declination of up to 23.4° is left out. And the solid Earth is not rigid: it yields to the same potential by about 60% of the equilibrium height, and the shifted ocean mass attracts itself. The observed geocentric ocean tide relative to the seabed ends up around 0.69 of the equilibrium figure, the familiar $1 + k_2 - h_2$ factor from Love numbers.

None of this undoes the argument. The resonant response is a response to *this* forcing, with its two bulges, its 12 h 25 min period, its fortnightly beat and its diurnal inequality. The harmonic constituents that tide-prediction software fits to a harbour's record, M2 and S2 and K1 and O1, are the species in equation 4 with the oceans' frequency response applied. The equilibrium tide is the input spectrum; the harbour is the filter.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The harbour is a filter. The equilibrium tide is the signal going in, and its spectrum is already written in the Moon's distance, declination and the length of the lunar day.

If you want to spend more time with the geometry, [the standalone tides lab](/lab/tides/) is the same model with room to rotate. Look at it from the top with declination at 28.5° and watch the observer's path cut obliquely through a tilted bulge. The inverse-cube differential pull also has a much more violent cousin: it is what stretches an infalling observer near a compact object, which [the black-hole anatomy post](/blog/anatomy-of-a-black-hole/) touches on under the word spaghettification.

Next I'd like to let the Sun off its equatorial leash and give the Moon its 18.6-year nodal wobble, so the standstill becomes a real date rather than a slider position. Watch this space.

## Reading further

- [Pugh & Woodworth, *Sea-Level Science*, Cambridge University Press (2014)](https://doi.org/10.1017/CBO9781139235778): chapter 3, "Tidal forces", derives the equilibrium tide and the species expansion with the constants used here.
- [Butikov, "A dynamical picture of the oceanic tides", American Journal of Physics 70, 1001 (2002)](https://doi.org/10.1119/1.1498858): the differential-force derivation of both bulges, and a careful dismantling of the centrifugal explanation.
- [Feynman Lectures, volume I, chapter 7: The theory of gravitation](https://www.feynmanlectures.caltech.edu/I_07.html): section 7-4 explains the two bulges in a few paragraphs of plain argument.
- [NOAA, "Our Restless Tides"](https://tidesandcurrents.noaa.gov/restles1.html): the National Ocean Service's introduction to tidal theory, including the diurnal inequality and the spring-neap cycle.
