---
title: A p electron is never found between its lobes
date: '2026-11-10T00:00:00.000Z'
description: >-
  A 2p orbital has zero probability density on the plane between its lobes, yet
  nothing crosses it: a standing wave swaps sign while its density holds still.
labels: 'chemistry,quantum-chemistry,atomic-structure,orbitals'
release: true
heroImage: /blog/a-p-electron-is-never-between-its-lobes/hero.webp
takeaways:
  - >-
    The probability density of a 2p orbital is exactly zero on the nodal plane
    through the nucleus, and grows as z² just off it.
  - >-
    A stationary state is a standing wave: the real part of ψ swaps sign every
    half period while |ψ|² never changes, so nothing has to cross the node.
  - >-
    Node counts are bookkeeping: n − l − 1 radial nodes and l angular nodes,
    with the d_z² cones at the 54.74° magic angle.
  - >-
    Most probable radius and mean radius differ: for 2p they are 4 a0 (211.7 pm)
    and 5 a0 (264.6 pm).
markdown_url: /blog/a-p-electron-is-never-between-its-lobes/
canonical_url: 'https://benebsworth.com/blog/a-p-electron-is-never-between-its-lobes/'
---
## Key takeaways

- The probability density of a 2p orbital is exactly zero on the nodal plane through the nucleus, and grows as z² just off it.
- A stationary state is a standing wave: the real part of ψ swaps sign every half period while |ψ|² never changes, so nothing has to cross the node.
- Node counts are bookkeeping: n − l − 1 radial nodes and l angular nodes, with the d_z² cones at the 54.74° magic angle.
- Most probable radius and mean radius differ: for 2p they are 4 a0 (211.7 pm) and 5 a0 (264.6 pm).

Draw a 2p orbital and you get two lobes, one above the nucleus and one below, pinched to nothing at the middle. On the flat plane through that pinch the probability of finding the electron is exactly zero. Not small. Zero. Yet the electron is "in" both lobes, and if you measure it you can find it in either.

The question everyone asks at this point is how the electron gets from the top lobe to the bottom one without passing through the plane. I asked it too. The honest answer is that the question smuggles in a picture that the maths never had: a little ball commuting between two rooms. An orbital is a standing wave, and a standing wave does not travel anywhere.

So let's build one and look at it. The lab below draws the real part of a hydrogen wavefunction, lets you play time forward, and shows what moves and what does not. That split turns out to be the whole answer.

## Watch the sign flip while the density holds still

The default scene is the 2p orbital with its axis vertical. Pink is where the real wavefunction is positive, amber where it is negative, and the white cage is the probability density, which is what you would measure. Press play. The lobes shrink, vanish at a quarter of the cycle, and grow back with the colours swapped. The cage never twitches.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

Before touching anything else, try the **1s ground state** preset. The lobes become a sphere, the floor curve peaks at 52.9 pm (one Bohr radius, $a_0$), and the sphere still does its shrink-and-swap dance. Then come back to 2p and look at the violet circle around the waist. That is the nodal plane, and it is the subject of the title.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

"Between the lobes" here means on the plane $z=0$ through the nucleus, where $|\psi|^2=0$ exactly. Just off that plane the density is small but not zero: it grows as $z^2$, so 5° off the plane at the same radius the density is 0.8% of its on-axis value, and 1° off it is 0.03%. The claim is about a surface, not a slab.

The readouts carry the physical numbers. The lobes themselves are only the angular shape, normalised to a fixed size on screen, which is why a 1s and a 4s orbital look identical up top and differ only on the floor plot. I'll come back to that boundary at the end.

## A standing wave, not a commuter

The hydrogen atom separates. Write the position in spherical coordinates and the time-dependent wavefunction of an energy eigenstate factorises into a radial part, an angular part and a single complex phase:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\psi_{nlm}(r,\theta,\phi,t)=R_{nl}(r)\,Y_{lm}(\theta,\phi)\,e^{-iE_nt/\hbar}
```

$$
\psi_{nlm}(r,\theta,\phi,t)=R_{nl}(r)\,Y_{lm}(\theta,\phi)\,e^{-iE_nt/\hbar}
$$

The real part of $e^{-iE_nt/\hbar}$ is $\cos(E_nt/\hbar)$. That is what the pink and amber lobes show: the spatial shape $R\,Y$ multiplied by a cosine that runs through one full cycle per timeline pass. For $n=2$ the period $h/|E_2|$ is 1.216 fs, so the lab is slowed by roughly sixteen orders of magnitude, which I think we can forgive.

The probability density is the modulus squared, and the phase factor drops out of it entirely:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
|\psi_{2p_z}|^2=R_{21}^2\,Y_{10}^2=\frac{1}{32\pi a_0^5}\,z^2\,e^{-r/a_0}
```

$$
|\psi_{2p_z}|^2=R_{21}^2\,Y_{10}^2=\frac{1}{32\pi a_0^5}\,z^2\,e^{-r/a_0}
$$

Nothing in equation (2) depends on time. The white cage is drawn from $Y_{10}^2$ and has no reason to move, so it does not. The lobes swap sign because $\cos$ passes through zero. The density does not care about the sign, and neither does anything you can measure.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The real part of ψ breathes and swaps sign. The density, the thing that is physically there, never moves.

So where does the "crossing" happen? Nowhere. There is no trajectory in this description. The electron does not have a position that evolves and must pass through the plane. It has a density that sits still. The same complex rotation sits behind the helix in [a wave packet has two speeds](/blog/a-wave-packet-has-two-speeds/), where the imaginary part is drawn as depth. Here we only draw the real part, which is why it seems to disappear: at a quarter cycle the wavefunction is entirely imaginary, and the imaginary part has exactly the same lobes.

This is, I suspect, the place where a guitar string helps more than any amount of algebra. A string vibrating in its second harmonic has a node at its midpoint. The two halves move in opposite directions. Nobody asks how the string "gets across" the node, because it is obvious that nothing is travelling along the string. The standing wave is the whole string doing one thing. The orbital is the same idea in three dimensions, with a complex phase instead of a real displacement.

## Nodes are bookkeeping

The nice thing about hydrogen is that you can count. A state with quantum numbers $n$ and $l$ has $n-l-1$ radial nodes, spheres where $R_{nl}$ changes sign, and $l$ angular nodes, cones or planes where $Y_{lm}$ changes sign. The total is always $n-1$. The lab prints both counts in the first readout.

The 2p state has $n=2$, $l=1$: no radial nodes and one angular node, the plane. Select **2s radial node** and the roles swap: one radial node and no angular nodes. The cage is a sphere again, but the white floor curve now touches zero at exactly $2a_0$, which is 105.8 pm, before rising to its outer peak.

Select **3d z² magic angle** and the angular node becomes two cones. The angular factor for $l=2$, $m=0$ is proportional to $3\cos^2\theta-1$, so the cones sit where that vanishes:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
3\cos^2\theta-1=0\quad\Rightarrow\quad\theta=\arccos\frac{1}{\sqrt3}=54.74^\circ,\;125.26^\circ
```

$$
3\cos^2\theta-1=0\quad\Rightarrow\quad\theta=\arccos\frac{1}{\sqrt3}=54.74^\circ,\;125.26^\circ
$$

That angle turns up all over physics as the magic angle, because the same polynomial governs the dipole interaction between two spins. It is also the angle between a cube's body diagonal and any of its edges. Some food for thought: the shape of a chemist's d orbital and the tilt of a solid-state NMR rotor are set by the same Legendre polynomial. I had not connected those two until I wrote the nodal-cone table for this lab.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Predict before you drag. Starting from the default 2p:

1. Push **Angular momentum l** to 3. How many violet circles will appear, and will the energy go up or down?
2. Set **Principal number n** to 4 with $l=1$. How many violet dots will land on the floor curve, and roughly where?
3. Select **3d x²−y² planes**. The energy and radii should not change from **3d z² magic angle**. Does the cage look like the same orbital?

The answers are three cones (39.23°, 90° and 140.77°) with the energy rising to −0.850 eV, two dots at 5.528 and 14.472 $a_0$ (292.5 pm and 765.8 pm), and no. Same energy, different shape.

The third experiment deserves a moment. The $3d_{z^2}$ and $3d_{x^2-y^2}$ orbitals have the same $n$ and $l$, so the same energy, the same most probable radius of 476.3 pm and the same mean radius of 555.6 pm. Only the angular bookkeeping differs: two cones versus two vertical planes at 45° and 135°. The planes come from the $\cos 2\phi$ factor, and that factor is also why I keep saying "real" orbital.

## Nothing orbits, at least not in the chemist's set

The $m\neq0$ solutions that fall straight out of the Schrödinger equation carry a factor $e^{im\phi}$. Those complex orbitals do have angular momentum about the $z$ axis, $m\hbar$ of it, and their density is a doughnut with no $\phi$ dependence at all. If you want a picture of something circulating, that is the place to look, and the claim in the title should be read with that caveat.

Chemists almost never draw those. They take the two combinations $e^{i\phi}+e^{-i\phi}\propto\cos\phi$ and $e^{i\phi}-e^{-i\phi}\propto\sin\phi$, which are the $p_x$ and $p_y$ orbitals, because those point along bonds. The lab uses the cosine set: $p_x$, $d_{xz}$, $d_{x^2-y^2}$, $f_{xz^2}$ and so on. Each is an equal mix of $+m$ and $-m$, so the expectation value of $L_z$ is zero. They are standing waves in $\phi$ as well as in $\theta$ and $r$, which is exactly why they have planar nodes where the travelling versions have none.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

If nothing moves and nothing orbits, what is the electron doing? I find it more honest to say the question has no answer in this model than to invent one. A stationary state is a complete description of what we can predict about measurements, and all those predictions are constant in time. "Doing" is a word for trajectories, and there are none here. The reassuring part is that the moment you measure position, you do get a position, and the standing wave tells you the odds.

## Where the electron most probably is

The floor plot is in physical units, and it answers a different question from the lobes: not which direction, but how far. The radial probability density is $P(r)=r^2R_{nl}^2$, the chance per unit radius of finding the electron in a shell of radius $r$ regardless of direction. For the ground state it is a clean function with a clean maximum:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
P_{1s}(r)=\frac{4}{a_0^3}\,r^2e^{-2r/a_0},\qquad \frac{\mathrm dP}{\mathrm dr}=0\;\Rightarrow\;r=a_0,\qquad \int_0^{a_0}P\,\mathrm dr=1-5e^{-2}=0.3233
```

$$
P_{1s}(r)=\frac{4}{a_0^3}\,r^2e^{-2r/a_0},\qquad
\frac{\mathrm dP}{\mathrm dr}=0\;\Rightarrow\;r=a_0,\qquad
\int_0^{a_0}P\,\mathrm dr=1-5e^{-2}=0.3233
$$

So Bohr's radius survives as the most probable radius, which is a pleasing thing for a 1913 model to get right. But the distribution is skewed, with a long exponential tail outward, so the mean radius sits further out at $1.5a_0$, or 79.4 pm. The lab marks the most probable radius with a white dot and the mean with a faint grey tick. They are never in the same place.

For a general state the mean has a closed form that I did not know until I checked it by quadrature for this lab:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\langle r\rangle_{nl}=\frac{a_0}{2}\left[3n^2-l(l+1)\right]
```

$$
\langle r\rangle_{nl}=\frac{a_0}{2}\left[3n^2-l(l+1)\right]
$$

For 2p that gives $5a_0$, while the most probable radius is $4a_0$ exactly (whenever $l=n-1$ the radial function has a single hump peaking at $n^2a_0$). In picometres:

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Push **Principal number n** to 4 and both numbers grow by a factor of five or six: the 4p most probable radius lands at 1247.8 pm and the mean at 1217.1 pm. Notice that for 4p the mean is now inside the most probable radius. The two inner humps pull the average inward while the outer hump still sets the peak. Which of those is "the size of the orbital" is a question of what you plan to do with the answer.

## What the picture leaves out

The lobes are the angular factor only, normalised so the biggest one always reaches the same radius on screen. A real 90% isosurface would be a product of the radial and angular parts, and the radial part is the thing that makes a 4p orbital five times the size of a 2p. I kept the two scenes separate on purpose, because a polar plot in dimensionless units and a radius in picometres should never share an axis.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Three places the model stops. The shrinking lobes are the real part of ψ, not a pulsation of the electron cloud, and the cage is the physical object. The energies use the Rydberg constant for an infinitely heavy nucleus, 13.6057 eV, so real hydrogen is 0.05% shallower (2p at −3.400 eV rather than −3.401 eV). And there is no spin, no fine structure and no Lamb shift, so the 2s and 2p levels sit exactly together here when in nature they do not.

The sliders can also ask for states that do not exist, such as $n=2$ with $l=3$. The lab rounds to the nearest real orbital ($n$ must be at least $l+1$, and $|m|$ at most $l$) and prints the result, so pushing $l$ to 3 from the default takes you to $4f_{z^3}$ and the readout says so. I'd rather alias loudly than draw something that is not a solution.

What I'd like to add next is the complex $e^{im\phi}$ orbital alongside the real one, with the imaginary part drawn as a second cage, so the doughnut and the dumbbell can be seen as two bases for the same space. That, and a two-electron helium model to see how much of this hydrogen tidiness survives. Watch this space. In the meantime, [the standalone hydrogen orbitals lab](/lab/hydrogen-orbitals/) has every state up to $n=4$ waiting to be counted.

## Reading further

- [HyperPhysics: Hydrogen wavefunctions](http://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hydwf.html): the radial and angular functions tabulated for n ≤ 3, with the radial probability plots the floor curve reproduces.
- [OpenStax, University Physics Volume 3, section 8.1: The hydrogen atom](https://openstax.org/books/university-physics-volume-3/pages/8-1-the-hydrogen-atom): quantum numbers, the separable solution and the node-counting rules at an introductory level.
- [Feynman Lectures, volume III, chapter 19: The hydrogen atom and the periodic table](https://www.feynmanlectures.caltech.edu/III_19.html): the derivation of the radial equation and a frank discussion of what the states do and do not describe.
- [The Orbitron, University of Sheffield](https://winter.group.shef.ac.uk/orbitron/): rendered isosurfaces, nodal surfaces and radial distribution plots for every orbital up to 7g, useful for checking the lab's shapes against the textbook pictures.
