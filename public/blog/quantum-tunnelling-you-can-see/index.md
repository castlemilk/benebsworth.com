---
title: Quantum Tunnelling You Can See
date: '2026-06-18T12:00:00.000Z'
description: >-
  Quantum tunnelling isn't an energy loophole: a wave decays through a wall
  instead of stopping. Watch a packet split, and see the exponential that keeps
  the Sun lit.
labels: 'physics,quantum,quantum mechanics'
release: true
author: Ben Ebsworth
heroImage: /blog/quantum-tunnelling-you-can-see/hero.webp
takeaways:
  - >-
    Tunnelling isn't an energy loophole: inside a barrier where V>E the
    Schrödinger equation forbids oscillation, so the wave decays exponentially
    rather than stopping at the wall.
  - >-
    Transmission is exponential in barrier width and in the square root of the
    energy shortfall (T ≈ e^{-2κ a}), so doubling the wall squares the
    suppression.
  - >-
    That single exponential explains the Geiger-Nuttall law: a factor-of-ten
    spread in alpha energy maps onto 24 orders of magnitude in half-life.
  - >-
    A wave reflects off any sharp potential step, so even a packet with more
    energy than the barrier partly bounces — the barrier is a filter, not a
    gate.
markdown_url: /blog/quantum-tunnelling-you-can-see/
canonical_url: 'https://benebsworth.com/blog/quantum-tunnelling-you-can-see/'
---
## Key takeaways

- Tunnelling isn't an energy loophole: inside a barrier where V>E the Schrödinger equation forbids oscillation, so the wave decays exponentially rather than stopping at the wall.
- Transmission is exponential in barrier width and in the square root of the energy shortfall (T ≈ e^{-2κ a}), so doubling the wall squares the suppression.
- That single exponential explains the Geiger-Nuttall law: a factor-of-ten spread in alpha energy maps onto 24 orders of magnitude in half-life.
- A wave reflects off any sharp potential step, so even a packet with more energy than the barrier partly bounces — the barrier is a filter, not a gate.

A ball rolled at a hill it hasn't the energy to climb rolls back. Every time. That is conservation of energy, and nothing about being small repeals it. So the standard one-line description of quantum tunnelling, "a particle passes through a barrier it doesn't have the energy to cross", sounds like cheating, and the usual reaction is to file it under quantum weirdness and move on.

It isn't weird, though, and it isn't really about energy bookkeeping. It's about the fact that a quantum particle is described by a wave, and **a wave hitting a wall doesn't stop dead at the surface; it leaks in and dies away smoothly.** If the wall is thin enough, a little of the wave is still alive when it reaches the far side, and out it goes. Let's put a wave packet on a barrier and watch, then read off the maths from what we see.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The dashed line is the packet's energy; the grey block is taller. Classically, the story ends at the wall. Instead the packet hits it and *splits*: a big lump bounces back, and a smaller, fainter lump carries on through and away to the right. That right-hand lump is the tunnelled particle.

Try the **Barrier width** slider. A thin wall lets a respectable fraction through; widen it a touch and the transmitted packet collapses toward nothing. The dependence is savage, and we'll see exactly why.

## The wave doesn't stop, it decays

The packet obeys the time-dependent Schrödinger equation, which is the wave equation of quantum mechanics.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
i\hbar\,\frac{\partial \psi}{\partial t} = -\frac{\hbar^2}{2m}\frac{\partial^2 \psi}{\partial x^2} + V(x)\,\psi
```

$$
i\hbar\,\frac{\partial \psi}{\partial t} = -\frac{\hbar^2}{2m}\frac{\partial^2 \psi}{\partial x^2} + V(x)\,\psi
$$

Outside the barrier, where $V = 0$, solutions are travelling waves, the usual $e^{i(kx - \omega t)}$ ripples. The interesting thing happens *inside*, where the potential $V_0$ exceeds the energy $E$. There the equation no longer asks for an oscillation. Solve it in that region and you get real exponentials instead of complex ones.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

E the wavefunction is a sum of real exponentials, decaying and growing, not a sine. κ sets how fast it dies away." latex="\psi(x) = A\,e^{-\kappa x} + B\,e^{+\kappa x}, \qquad \kappa = \frac{\sqrt{2m(V_0 - E)}}{\hbar}">

$$
\psi(x) = A\,e^{-\kappa x} + B\,e^{+\kappa x}, \qquad \kappa = \frac{\sqrt{2m(V_0 - E)}}{\hbar}
$$

That is the whole secret in one line. In the classically forbidden region the wave does not oscillate and it does not vanish at the boundary. It *decays*, with a length scale set by $\kappa$. The taller the barrier (bigger $V_0 - E$) the larger $\kappa$ and the faster the decay. For a barrier of finite width both terms survive, the falling $A\,e^{-\kappa x}$ and a small rising $B\,e^{+\kappa x}$ reflected off the far wall, which is why the wavefunction inside isn't a pure exponential. But the dominant feature is the decay, and if the wall ends before the wave has died, the leftover amplitude reconnects to a travelling wave on the other side and escapes.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The phrase "classically forbidden region" makes it sound like a wall the wave is banned from entering. The maths says otherwise: the wave is perfectly happy inside, it just can't *oscillate* there, so it does the only other thing a solution of equation (1) can do and decays. The ban is not on being there. It's on travelling there. A standing, fading presence is allowed, and a thin enough barrier means that fading presence reaches the exit with something left.

## How much gets through

Match the waves and their slopes at both walls and you can solve for the fraction of probability that makes it across, the transmission coefficient $T$. For a rectangular barrier of width $a$ the exact answer is tidy.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
T = \left[\,1 + \frac{V_0^{2}\,\sinh^{2}(\kappa a)}{4E(V_0 - E)}\,\right]^{-1}
```

$$
T = \left[\,1 + \frac{V_0^{2}\,\sinh^{2}(\kappa a)}{4E(V_0 - E)}\,\right]^{-1}
$$

For any barrier worth the name, $\kappa a$ is bigger than one, $\sinh(\kappa a) \approx \tfrac{1}{2}e^{\kappa a}$, and equation (3) collapses to the form everyone actually remembers.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
T \approx e^{-2\kappa a} = \exp\!\left(-\frac{2a}{\hbar}\sqrt{2m(V_0 - E)}\right)
```

$$
T \approx e^{-2\kappa a} = \exp\!\left(-\frac{2a}{\hbar}\sqrt{2m(V_0 - E)}\right)
$$

Transmission is *exponential* in the width and in the square root of the energy shortfall. That single fact, the exponential, is why tunnelling is at once ubiquitous and almost invisible: double the barrier width and you don't halve the odds, you square the suppression. (The bare exponential is a slight underestimate. For the textbook case $E = 2$, $V_0 = 4$, $a = 1$ in natural units, $\kappa = 2$ and the exponential gives $T \approx 0.018$, while the exact formula gives $T \approx 0.071$, almost four times more, the difference being the $16E(V_0-E)/V_0^2$ prefactor we dropped. The shape is right; the constant out front is a detail.)

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Lean on the exponential and you can predict one of the strangest facts in nuclear physics. Alpha decay is tunnelling: an alpha particle rattling inside a nucleus, occasionally leaking through the Coulomb barrier. Because $T$ is exponential in the barrier, a tiny change in the alpha's energy (a factor of two or three across all known emitters) maps onto a colossal change in how long the nucleus lives. Alpha-decay half-lives span more than twenty-four orders of magnitude, from microseconds to longer than the age of the universe, off an energy range of less than ten. That is the Geiger-Nuttall law, and it is the exponential in equation (4) wearing a lab coat.

## How the lab actually computes it

There is no closed form for a *packet* (a spread of energies) hitting a barrier and evolving in time, so the lab integrates equation (1) numerically with a beautiful trick called the **split-step Fourier method**. The Hamiltonian has two parts, the potential $V$ (simple in position space, just multiply) and the kinetic energy (simple in momentum space, also just multiply). The catch is they don't share a basis. The split step alternates: a half-step of $V$ in position space, a full kinetic step in momentum space, another half-step of $V$.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
e^{-i\hat H \Delta t/\hbar} \approx e^{-i\hat V \Delta t/2\hbar}\; e^{-i\hat K \Delta t/\hbar}\; e^{-i\hat V \Delta t/2\hbar} + \mathcal{O}(\Delta t^{3})
```

$$
e^{-i\hat H \Delta t/\hbar} \approx e^{-i\hat V \Delta t/2\hbar}\; e^{-i\hat K \Delta t/\hbar}\; e^{-i\hat V \Delta t/2\hbar} + \mathcal{O}(\Delta t^{3})
$$

The hop between position and momentum space is a Fourier transform, done here with an in-house radix-2 FFT on a 512-point grid. So the same fast Fourier transform from the [every-wave-is-a-circle](/blog/every-wave-is-a-circle/) post is doing the heavy lifting: every frame, the packet is decomposed into its momentum components, each is advanced, and it is reassembled. Tunnelling, it turns out, is computed by repeatedly asking "what frequencies are you made of?".

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

One honest footnote about the lab. The control labelled "energy" actually sets the packet's central wavenumber $k_0$, so the true kinetic energy is $k_0^2/2$ in the lab's natural units. The on-screen energy line is drawn from the slider value directly, which keeps the picture readable (line below the barrier top reads as $E < V_0$), but if you want to reason quantitatively, remember the real comparison is $k_0^2/2$ against $V_0$. The lead embed sits comfortably in the genuine tunnelling regime; crank the slider near the top and you cross into the next caveat.

## Tunnelling runs the universe

This is not an exotic correction. Several things you depend on are tunnelling all the way down.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

The Sun is the headline. The core sits at about 15 million kelvin, a thermal energy near 1.3 keV, while two protons must approach against a Coulomb barrier of order an MeV, roughly a thousand times higher. Classically the Sun is far too cold to fuse and we shouldn't be here. The protons get through by tunnelling, at a rate set by the Gamow factor $T \approx e^{-2\pi\eta}$, the deep-barrier cousin of equation (4) for a Coulomb wall. Sunlight is tunnelling made visible.

The scanning tunnelling microscope turns the brutal exponential into a feature. Hold a sharp tip an ångström or two above a surface and run a tunnelling current across the gap; because the current is exponential in the gap, moving the tip a single atom closer multiplies the signal by seven or eight. That sensitivity is how the STM resolves individual atoms. Flash memory uses the same effect deliberately, pushing electrons through a thin oxide to trap charge on a floating gate. The bit you just saved was tunnelled into place.

## When "enough energy" still isn't enough

Worth a quick play to keep yourself honest: tunnelling's mirror image is **above-barrier reflection**. Give the packet *more* energy than the barrier and, classically, it should sail over with nothing lost. Quantum mechanically it partly bounces, because any sharp change in potential is an impedance mismatch a wave reflects off, exactly like light hitting a pane of glass.

> [LabCanvas component] Inline interactive lab canvas. Embeds any effect registered in `lib/lab/registry.ts` (referenced by its `effect` slug) as a live Canvas2D/WebGL visualisation, with the effect's own controls rendered below unless `controls={false}`. Optional `params` override the effect's defaults and `caption` adds a figcaption. The rendered post has the live, interactive version; this is a static placeholder for the markdown-only sibling — read the matching lab explainer under `/lab/<slug>/` for the full description of what the effect shows.

So the wall reflects waves that are too weak to cross *and* waves that are strong enough to clear it. Transmission is only ever exactly one at special resonant widths where the reflections off the two walls cancel. The barrier is a filter, not a gate.

One caveat if you push the sliders hard: the method assumes periodic boundaries, so a fast packet that reaches the edge of the box wraps around to the other side. The runs are sized to finish before that happens, but a very high $k_0$ can outrun the window. It's an artefact of the grid, not the physics.

## How long does the crossing take?

Here is a question that looks innocent and isn't: how long does a particle spend *inside* the barrier? It has bothered people since the 1930s, because some natural definitions of the time give an answer that stops growing as you thicken the barrier, the **Hartman effect**, which naively reads as the particle crossing faster than light through a longer wall. The resolution is subtle and the short version is reassuring: no signal or information outruns light, because the transmitted packet is a reshaped, attenuated remnant of the incident one, not a thing that was teleported.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

For decades this was a theorists' argument. Then in 2020 Aephraim Steinberg's group in Toronto built a clever Larmor clock out of ultracold rubidium atoms, using the atoms' own spin precession to time their passage through an optical barrier, and measured a finite, definite traversal time, around 0.6 milliseconds for that setup. A genuine number, at last, for "how long does tunnelling take". The fact that it took ninety years and a cloud of laser-cooled atoms to measure a duration is a nice reminder that the simple-looking questions are often the deep ones. Some food for thought.

The same equation (2) shows up far from quantum mechanics, incidentally. Shine light into glass past the critical angle and it totally internally reflects, but the field doesn't stop at the surface; it leaks out as an *evanescent* wave that decays exponentially, the optical twin of $e^{-\kappa x}$. Bring a second glass within a wavelength and some light hops the gap. Frustrated total internal reflection is photon tunnelling, the same maths with light instead of electrons, which is the sort of cross-field rhyme that makes the whole picture feel less like a special rule and more like what waves simply do.

So: a wave that decays instead of stopping, a transmission that's exponential in the wall, and a universe that runs on the leftover. Drag the barrier wider and watch the far packet die, then remember that's the curve keeping the Sun lit. The same wave story runs through the [band gaps](/blog/band-gaps-are-bragg-reflection/) and [qubit](/blog/every-qubit-gate-is-a-rotation/) posts; tunnelling is just the chapter where the wave goes somewhere it was told it couldn't.

## Reading further

- [Griffiths & Schroeter, *Introduction to Quantum Mechanics*, 3rd ed.](https://doi.org/10.1017/9781316995433). Chapter 2.6 derives the square-barrier transmission, equation (3); the WKB chapter gives equation (4). The canonical anchor.
- [Gamow, *Zur Quantentheorie des Atomkernes* (1928)](https://doi.org/10.1007/BF01343196). Z. Physik 51, 204. The 24-year-old's paper explaining alpha decay as tunnelling, written days after arriving in Göttingen.
- [Condon, *Tunneling — How It All Started* (1978)](https://doi.org/10.1119/1.11330). Am. J. Phys. 46, 319. A first-hand retrospective on the near-simultaneous 1928 discovery (Gurney & Condon published in Nature the day after Gamow submitted).
- [Ramos, Spierings, Racicot & Steinberg, *Measurement of the time spent by a tunnelling atom* (2020)](https://doi.org/10.1038/s41586-020-2490-7). Nature 583, 60. The Larmor-clock experiment that finally timed the crossing.
