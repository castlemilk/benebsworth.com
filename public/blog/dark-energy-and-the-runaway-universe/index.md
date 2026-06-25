---
title: Dark Energy and the Runaway Universe
date: '2026-06-09T00:00:00.000Z'
description: >-
  The expansion of the universe is speeding up, which forces a strange
  conclusion: roughly 70% of everything is a smooth, invisible energy that
  pushes space apart and resists almost every explanation we have.
labels: 'cosmology,astrophysics,dark energy,relativity'
release: true
author: Ben Ebsworth
heroImage: /blog/dark-energy-and-the-runaway-universe/hero.webp
takeaways:
  - >-
    Gravity should be slowing cosmic expansion down. In 1998 two teams measured
    the opposite: it is speeding up, and that single fact reshaped what we think
    the universe is made of.
  - >-
    Dark energy is not exotic matter; it is a property of empty space with
    negative pressure. The acceleration equation makes pressure gravitate, so a
    vacuum that pushes outward turns gravity repulsive.
  - >-
    The cosmological constant fits every observation and yet quantum field
    theory overestimates its value by about 120 orders of magnitude. That gap is
    among the worst predictions in physics.
  - >-
    Dark energy and dark matter are opposites, not cousins: one pushes space
    apart, the other pulls structure together. Confusing them hides the real
    puzzle.
markdown_url: /blog/dark-energy-and-the-runaway-universe/
canonical_url: 'https://benebsworth.com/blog/dark-energy-and-the-runaway-universe/'
---
## Key takeaways

- Gravity should be slowing cosmic expansion down. In 1998 two teams measured the opposite: it is speeding up, and that single fact reshaped what we think the universe is made of.
- Dark energy is not exotic matter; it is a property of empty space with negative pressure. The acceleration equation makes pressure gravitate, so a vacuum that pushes outward turns gravity repulsive.
- The cosmological constant fits every observation and yet quantum field theory overestimates its value by about 120 orders of magnitude. That gap is among the worst predictions in physics.
- Dark energy and dark matter are opposites, not cousins: one pushes space apart, the other pulls structure together. Confusing them hides the real puzzle.

Here is a result that should not sit comfortably: the universe is full of matter, matter attracts, and so the expansion that began at the Big Bang ought to be slowing down. Everyone expected that. The only open question, through most of the twentieth century, was whether gravity would eventually win and pull everything back into a Big Crunch, or merely coast to a halt. In 1998 two independent teams set out to measure the deceleration and instead found its sign was wrong. The expansion is not slowing. It is speeding up. And the moment you accept that, you are forced to conclude that something like 70% of the entire energy budget of the cosmos is a smooth, invisible, repulsive thing that nobody can detect in a laboratory and almost nobody can explain.

That thing got the placeholder name *dark energy*, and the name is honest about how little it commits to. It is not dark matter (we will come back to that, because conflating the two is the first wrong turn). It is not radiation, not ordinary gas, not any particle on a list. It is whatever makes empty space push outward. The strange part is not that we found a mystery. It is how well we can measure a thing we cannot identify.

## What the supernovae actually showed

The measurement hinges on a particular kind of exploding star. A Type Ia supernova happens when a white dwarf, a dead stellar core, accretes matter until it crosses a mass threshold and detonates. Because the threshold is nearly the same every time, the explosions release nearly the same peak energy. Better still, there is an empirical relation between how bright one gets and how quickly it fades: brighter ones decline more slowly, and once you correct for that, the scatter shrinks to a few percent. That makes them *standard candles*. If you know the true brightness of a light and measure how faint it looks, you know how far away it is.

So both teams (Adam Riess and the High-z Supernova Search, Saul Perlmutter and the Supernova Cosmology Project) did the same thing. They found Type Ia supernovae billions of light-years away, measured how faint they looked, and compared that distance against the redshift, which tells you how much the universe had expanded since the light set out. In a decelerating universe, distant supernovae at a given redshift should sit at a certain brightness. The real ones came in about 10 to 15% *fainter* than that. Fainter means farther, and farther than a decelerating universe allows. The expansion must have sped up over the light's journey to put those stars where they are.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

It comes down to one comparison. Two universes, same redshift, same supernova: in the one that has been coasting or slowing, the star is closer and looks brighter; in the one that has been accelerating, the same expansion took longer to build up, so the star is farther away and looks fainter. The data sided with fainter. No new particle, no telescope upgrade, just a careful brightness measurement on stars that all detonate at the same mass. Perlmutter, Schmidt and Riess shared the 2011 Nobel Prize in Physics for it.

## Why pressure can push gravity the wrong way

Cosmic expansion is governed by the Friedmann equation, which sets how fast the scale factor $a(t)$ (the size of the universe relative to today) grows from the stuff filling space.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
H^2 = \left(\frac{\dot{a}}{a}\right)^2 = \frac{8\pi G}{3}\rho + \frac{\Lambda}{3}
```

$$
H^2 = \left(\frac{\dot{a}}{a}\right)^2 = \frac{8\pi G}{3}\rho + \frac{\Lambda}{3}
$$

Here $H = \dot a / a$ is the Hubble parameter, $\rho$ is the energy density of matter, and $\Lambda$ is the cosmological constant, a term Einstein first wrote into his equations in 1917. Equation (1) tells you the speed of expansion, but not whether it is speeding up or slowing down. For that you need the companion equation, and this is the one that does the surprising work.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{\ddot{a}}{a} = -\frac{4\pi G}{3}\left(\rho + \frac{3p}{c^2}\right) + \frac{\Lambda}{3}
```

$$
\frac{\ddot{a}}{a} = -\frac{4\pi G}{3}\left(\rho + \frac{3p}{c^2}\right) + \frac{\Lambda}{3}
$$

Look at what sits inside the bracket: not just density $\rho$ but $\rho + 3p/c^2$, where $p$ is pressure. This is the deep lesson general relativity adds to Newton. Pressure has weight. Energy and pressure both gravitate, and the pressure term comes in tripled. For ordinary matter and radiation, pressure is zero or positive, so the whole bracket is positive, the minus sign out front makes $\ddot a$ negative, and the expansion decelerates. Exactly as everyone expected.

Now suppose something fills space with *negative* pressure, strong enough that $3p/c^2$ outweighs $\rho$. The bracket flips sign. The minus sign in front turns it positive. Gravity, of all things, becomes repulsive, and $\ddot a > 0$: the universe accelerates. You do not need the separate $\Lambda$ term at all; a fluid with sufficiently negative pressure does the same job. That is the entire trick behind dark energy. It is not a force pushing matter outward through space. It is a contribution to the source of gravity whose pressure is so negative that gravity reverses.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The instinct is that "negative pressure" must mean some bizarre substance. But pressure is just the work a region does when it changes volume, and a positive cosmological constant has an energy density that stays fixed no matter how much space grows. Stretch a box of vacuum energy and you create more of it, which means the vacuum resists being stretched: it pulls inward on its container, which is exactly negative pressure. The same property that lets dark energy never dilute is the one that makes its pressure negative. Those are two faces of one fact.

## The equation of state, and the magic number minus one

Cosmologists package every component of the universe with a single dimensionless number, the equation-of-state parameter $w$, that relates its pressure to its energy density.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
p = w \rho c^2
```

$$
p = w \rho c^2
$$

For ordinary matter, $w \approx 0$ (cold matter has negligible pressure). For radiation, $w = 1/3$. The acceleration in equation (2) needs the bracket to flip, which requires $w < -1/3$. The cosmological constant is the cleanest case: $w = -1$ exactly, so its pressure equals the negative of its energy density. Plug $w = -1$ back into the cosmic bookkeeping and you find a component whose density never changes as space expands, the hallmark of vacuum energy, energy that belongs to empty space itself rather than to anything in it.

This is why $\Lambda$ and a fluid with $w = -1$ are interchangeable descriptions. You can move the $\Lambda/3$ term in equation (1) over to the density side and treat it as a perfect fluid with constant density and $w = -1$. The standard model of cosmology, called $\Lambda$CDM (Lambda plus Cold Dark Matter), takes exactly this view: a constant $\Lambda$ for dark energy, plus cold dark matter, plus ordinary matter. The lab below lets you feel how decisive that single $w = -1$ component is for the universe's fate.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Set the **Cosmic fate** selector to *Λ accelerating* and watch the $a(\tau)$ timeline. Early on the matter density is high, gravity dominates, and the curve rises but flattens, the deceleration everyone expected. Then the matter thins out as space grows ($\rho_M \propto a^{-3}$), while the dark energy density holds flat. There is a crossover point, a few billion years ago for our universe, where dark energy overtakes matter and the curve bends *upward* into acceleration. Now drag **Ω_Λ (dark energy)** to zero. The runaway vanishes; you get the old slowing universe, and the supernovae would have looked brighter, not fainter. The data ruled that version out.

## Why this is not dark matter

Two invisible things, both inferred from gravity, both with "dark" in the name. The temptation to merge them is strong and completely wrong, and keeping them apart is the difference between understanding the puzzle and missing it.

Dark matter is *matter*. It clumps, it has positive energy density and roughly zero pressure ($w \approx 0$), and its gravity is attractive. It pulls gas together to seed galaxies, it bends light around clusters, and it makes the outskirts of galaxies rotate faster than the visible stars alone can explain. Dark matter builds structure. It is the scaffolding the cosmic web hangs on, and it makes up about 27% of the energy budget.

Dark energy does the reverse. It is smooth, never clumping anywhere (it has the same density in a galaxy as in the deepest void), its pressure is strongly negative, and its gravity is repulsive. It pushes space apart. Where dark matter assembles galaxies, dark energy will eventually drive them so far apart that distant ones disappear over the cosmic horizon. They are opposites that happen to share an adjective.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Dark matter pulls the universe into shape. Dark energy pulls the shape apart. The only thing they have in common is that we cannot see either, and that is the worst possible reason to confuse them.

## How well we actually know the number

It would be fair to suspect that a quantity this strange rests on a single shaky measurement. It does not. Three independent lines of evidence, sensitive to completely different physics, converge on the same answer.

The supernovae gave the first direct detection of acceleration. The cosmic microwave background gives a second, independent route: the pattern of hot and cold spots in the radiation left over from the early universe encodes the total geometry and contents, and the Planck satellite's 2018 analysis pinned the dark energy density parameter at $\Omega_\Lambda = 0.686 \pm 0.020$, in a spatially flat universe. The density parameter is dark energy expressed as a fraction of the critical density needed to make space flat.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\Omega_\Lambda = \frac{\Lambda c^2}{3 H_0^2}
```

$$
\Omega_\Lambda = \frac{\Lambda c^2}{3 H_0^2}
$$

The third line is baryon acoustic oscillations. Before the universe cooled enough for atoms to form, sound waves rippled through the hot plasma and froze in place at a characteristic length when it neutralised. That frozen length is a *standard ruler*: a known size imprinted in the spacing of galaxies today. Measure how big it looks at different distances and you read the expansion history directly. The standard ruler, the standard candle, and the microwave background all agree on a flat $\Lambda$CDM universe with about 68 to 70% dark energy. That triple agreement is why dark energy is the consensus picture, however uncomfortable, rather than a fringe idea.

There is one crack in the consensus worth naming, because it might be where new physics gets in. The expansion rate measured locally, from supernovae and Cepheid variable stars, comes out around $73.5 \pm 0.8$ km/s/Mpc. The rate inferred from the early-universe microwave background, run forward through $\Lambda$CDM, comes out around $67.2$ km/s/Mpc. That is roughly a 9% disagreement between two careful measurements that should match. This is the *Hubble tension*, and it has stubbornly refused to go away as the data have improved.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A 9% gap sounds small until you note both numbers carry error bars of about 1%, which means the two are separated by several standard deviations. Either one of these excellent measurements hides a systematic error nobody has found, or $\Lambda$CDM is missing something between the early universe and now, possibly in how dark energy behaves. A constant $\Lambda$ is the simplest assumption, not a proven fact. If dark energy's density or its $w$ has drifted over cosmic time, the early-universe and late-universe rates would not have to agree. Surveys like DESI are now measuring exactly that, looking for any sign that $w$ is not flatly minus one.

## The worst prediction in physics

If dark energy is vacuum energy, the energy of empty space itself, then quantum field theory ought to be able to compute it. Empty space is not truly empty; it seethes with quantum fields whose ground-state fluctuations carry energy. Add up the contributions and you get a vacuum energy density. So the calculation is well posed, and we can compare it against the measured $\Lambda$.

The answer is off by about 120 orders of magnitude. The theoretical estimate exceeds the observed value by a factor of roughly $10^{120}$. That is not a missing factor of two; it is the largest mismatch between theory and experiment anywhere in science, and it has a name: the cosmological constant problem. Something must be cancelling that enormous predicted vacuum energy almost perfectly, down to 120 decimal places, leaving the tiny residue we observe. Nobody knows what does the cancelling, or why it stops just short of perfect instead of going all the way to zero.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The usual story says Einstein introduced $\Lambda$ in 1917 to keep the universe static, then called it his greatest blunder once Hubble showed the universe was expanding. The tidy moral is that he should never have written it. But the modern verdict is the opposite. The acceleration is real, $\Lambda$ fits it beautifully, and the term Einstein crossed out turned out to be necessary after all. His mistake was not adding $\Lambda$; it was assuming it had to produce a static universe, and then losing his nerve and removing it. The constant was right. The interpretation was wrong.

## If it is not a constant

The cosmological constant is the simplest story, and so far the data have not forced anyone off it. But it is not the only story, and the alternatives change the universe's ending.

*Quintessence* replaces the fixed $\Lambda$ with a dynamical scalar field, a bit like the inflaton thought to have driven the early universe, whose energy slowly evolves. Its equation of state sits near but not exactly at $w = -1$, and crucially $w > -1$ with the possibility of drifting in time. If quintessence is right, dark energy was different in the past and will be different in the future, and the Hubble tension might be one of its fingerprints.

Then there is *phantom energy*, the unsettling case $w < -1$. With pressure even more negative than the cosmological constant allows, the dark energy density actually *grows* as the universe expands, accelerating the acceleration. Carried to its conclusion this produces a *Big Rip*: a finite time in the future when the expansion becomes so violent it tears apart galaxies, then solar systems, then atoms, then spacetime itself, all in a last cascade. The current data do not require phantom energy, but they have not entirely excluded it either.

A more radical option drops dark energy altogether and modifies gravity instead. Maybe general relativity is subtly wrong on the largest scales, and what looks like a repulsive energy is really a correction to Einstein's equations that only matters across billions of light-years. These modified-gravity theories have to thread a hard needle: pass every precise test of general relativity in the Solar System, reproduce the acceleration on cosmic scales, and match the microwave background and the standard ruler. Most proposals die against that gauntlet, but the survivors keep the question open.

For now the honest summary is that we have a thing we can measure to a few percent and cannot identify at all. We know its sign, its strength, and how it has shaped 14 billion years of expansion. We do not know whether it is a constant, a field, or a sign that gravity itself needs mending. Dark energy is the rare case where the data are sharp and the understanding is blunt, and that is exactly what makes it the most important unsolved problem in cosmology. Some food for thought, the next clear night you look up: most of what is out there is doing something we have no name for.

## Reading further

- [Riess et al., *Observational Evidence from Supernovae for an Accelerating Universe* (Astron. J. 116, 1998)](https://iopscience.iop.org/article/10.1086/300499). The High-z team's discovery paper, where distant Type Ia supernovae first came in too faint and the sign of the deceleration came out wrong.
- [Perlmutter et al., *Measurements of Ω and Λ from 42 High-Redshift Supernovae* (Astrophys. J. 517, 1999)](https://www.osti.gov/pages/biblio/840560). The independent Supernova Cosmology Project confirmation, with the joint constraint on matter and dark energy that sealed the case.
- [Carroll, *The Cosmological Constant* (Living Reviews in Relativity 4, 2001)](https://link.springer.com/article/10.12942/lrr-2001-1). The definitive pedagogical review of vacuum energy, the equation of state, and the 120-order-of-magnitude problem that still has no solution.
- [NASA Science: Dark Energy](https://science.nasa.gov/dark-energy/). A current, accessible summary of the observations (supernovae, the microwave background, baryon acoustic oscillations) and the competing models, kept up to date with Planck-era numbers.
