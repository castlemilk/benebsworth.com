---
title: The Universe on a Surface
date: '2026-04-28T00:00:00.000Z'
description: >-
  The most information you can pack into a region is set by its boundary area,
  not its volume. In a deep sense the contents of a 3-D space are written on a
  2-D surface, like a hologram.
labels: 'physics,black holes,information,quantum gravity'
release: true
author: Ben Ebsworth
heroImage: /blog/the-universe-on-a-surface/hero.webp
takeaways:
  - >-
    Maximum information in a region scales with its boundary area, not its
    volume — fill a box past that limit and it collapses into a black hole whose
    entropy is exactly its horizon area in Planck units.
  - >-
    One bit lives on every four Planck areas of a surface, about 1.4 × 10^69
    bits per square metre. The bulk inside is bookkeeping you could in principle
    recover from the boundary.
  - >-
    Black hole entropy proportional to area (Bekenstein 1973, Hawking 1974) is
    the single experimental-grade fact the whole holographic principle rests on.
  - >-
    AdS/CFT made the slogan rigorous in one corner of theory-space: a gravity
    theory in a volume is exactly a quantum field theory on its boundary, one
    dimension lower. Whether our universe works this way is still open.
markdown_url: /blog/the-universe-on-a-surface/
canonical_url: 'https://benebsworth.com/blog/the-universe-on-a-surface/'
---
## Key takeaways

- Maximum information in a region scales with its boundary area, not its volume — fill a box past that limit and it collapses into a black hole whose entropy is exactly its horizon area in Planck units.
- One bit lives on every four Planck areas of a surface, about 1.4 × 10^69 bits per square metre. The bulk inside is bookkeeping you could in principle recover from the boundary.
- Black hole entropy proportional to area (Bekenstein 1973, Hawking 1974) is the single experimental-grade fact the whole holographic principle rests on.
- AdS/CFT made the slogan rigorous in one corner of theory-space: a gravity theory in a volume is exactly a quantum field theory on its boundary, one dimension lower. Whether our universe works this way is still open.

Here is a claim that should feel wrong: the amount of information you can stuff into a region of space is not set by how big the region is, but by how big its *surface* is. Not the volume. The area of the boundary. Double the radius of a sphere and its volume grows eightfold, but the most you can know about everything inside only grows fourfold. The inside of the box is, in a precise sense, surplus. Everything that can ever be true about the contents of a three-dimensional region could be written, without loss, on the two-dimensional skin around it.

That sounds like a verbal trick until you try to break it. Take an empty region and start filling it with information: hard drives, books, photons, anything that encodes bits. Pack more and more in. Naively you'd expect the capacity to scale with volume, since that's where the stuff goes. It doesn't. Long before you've filled the volume, the mass of all that information curves spacetime enough to form a black hole, and the black hole's information content is fixed by its horizon area. You can't win. The boundary always gets the last word. This is the holographic principle, and the strange part isn't that it's a fringe idea. It's that it falls out of the most conservative thing we know about black holes.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Watch what happens to the two quantities as you turn up the **radius**. The volume balloons like $r^3$; the surface, where the bits actually live, grows only like $r^2$. The gap between them is the whole story. Toggle **showVolume** to see the bulk you *thought* was doing the storing, then watch the boundary tiling do all the real work. The pixels aren't decorative. Each one is roughly a Planck area, and each carries about one bit. That tiling is the maximum, full stop.

## The one fact this all rests on

Strip away the speculation and there's a single hard result underneath. It comes from black holes, and it predates string theory by two decades.

In the early 1970s a graduate student named Jacob Bekenstein was worrying about the second law of thermodynamics. The second law says entropy never decreases: disorder, in the technical sense of the number of microscopic states consistent with what you can measure, only ever goes up. But black holes seemed to offer a loophole. Drop a hot cup of coffee into a black hole and its entropy vanishes from the universe. The coffee's disorder is gone behind a horizon you can never see past. Has the total entropy of the universe just dropped? If so, the second law is in trouble.

Bekenstein's fix, proposed in 1972 and 1973, was audacious: the black hole itself must carry entropy, and when you throw the coffee in, the black hole's entropy goes up by at least as much as the coffee's went down. The books balance. But that forces a question: *how much* entropy does a black hole have, and in terms of what? Bekenstein's answer was that it must be proportional to the area of the event horizon. Not the mass, not some hidden volume. The area.

This was a guess with a good argument behind it, and most people thought it was wrong, because a thing with entropy has a temperature, and a thing with temperature radiates, and everyone *knew* nothing escapes a black hole. Then in 1974 Stephen Hawking, trying to prove Bekenstein wrong, did the quantum field theory near the horizon properly and found that black holes do radiate. They have a real temperature. Bekenstein was right, and the radiation has carried Hawking's name ever since. Out of that calculation came a formula clean enough to carve on a wall.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
S_{BH} = \frac{k_B\, A}{4\, \ell_P^2}
```

$$
S_{BH} = \frac{k_B\, A}{4\, \ell_P^2}
$$

Read it slowly. $A$ is the area of the event horizon. $\ell_P$ is the Planck length, the scale built from gravity, quantum mechanics, and the speed of light, $\ell_P = \sqrt{G\hbar/c^3} \approx 1.6 \times 10^{-35}$ metres. So $\ell_P^2$ is a Planck area, around $2.6 \times 10^{-70}$ square metres. The constant $k_B$ is just Boltzmann's, converting entropy into the units physicists like. Drop it and read the formula as pure information: the entropy of a black hole, in bits, is one quarter of its horizon area measured in Planck areas. One bit for every four Planck tiles on the surface. Nothing about the interior appears anywhere in this equation.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Every other system you know has entropy that scales with volume. A box of gas at fixed density holds twice the entropy in twice the volume, because entropy counts microscopic states and there are twice as many places to put molecules. That's the intuition the holographic principle violates. A black hole's entropy ignores its volume entirely and tracks its *surface*. A black hole the size of a proton and a black hole the size of a galaxy obey the same rule: count the horizon's area, divide by four Planck areas, that's the bit budget. The interior, however vast, contributes nothing extra. That single mismatch, area where you expected volume, is the seam the whole idea is prised open along.

## Why the boundary always wins

Bekenstein went one step further, and this is the step that turns a fact about black holes into a law about everything. He asked: what's the *most* entropy any region can hold, black hole or not? His answer is now called the Bekenstein bound, and the argument is almost embarrassingly physical.

Take any region of space and suppose it holds some amount of entropy $S$ inside a boundary of area $A$. Now imagine cramming more and more matter in. As you add mass-energy, the region gets denser. Keep going and at some point it crosses the threshold where it must collapse into a black hole whose horizon is roughly the size of your region. At that moment its entropy is fixed by equation (1): $A/4\ell_P^2$. The punchline is that you could never have exceeded this on the way in. If your region's entropy had been larger than the black-hole value *before* collapse, then collapse would have decreased the total entropy, breaking the second law. So the second law itself forbids any region from holding more information than would fit on a black hole of the same size.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
S \leq \frac{A}{4\, \ell_P^2}
```

$$
S \leq \frac{A}{4\, \ell_P^2}
$$

Raphael Bousso sharpened this in 2002 into the *covariant* entropy bound, a version that works in curved, expanding spacetime where the naive idea of "a region and its boundary" gets slippery. The number it gives is staggering. Run the units on equation (2) and you find that a single square metre of any surface in the universe can record at most about $1.4 \times 10^{69}$ bits. That's the absolute ceiling on information density set by the laws of physics, and it has nothing to do with engineering. No conceivable technology beats it, because beating it means making a black hole instead.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Notice what just happened. We started with a property of black holes and derived a limit on *every* region of space, whether or not it contains a black hole. The boundary area, not the enclosed volume, sets the capacity. A volume's worth of physics has to be describable using only an area's worth of data. That is the holographic principle stated plainly, and it was Gerard 't Hooft in 1993 and Leonard Susskind in 1995 who first said it out loud in those terms. Susskind's paper was titled, with characteristic bluntness, *The World as a Hologram*.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The interior of any region is not where its information lives. It's where the information's consequences play out. The data itself fits on the wall.

## What "hologram" actually means here

The word is doing real work, so it's worth getting right, because it's also the source of nearly every misconception about this idea.

An optical hologram is a flat photographic plate that, when lit correctly, throws up a fully three-dimensional image. The trick is that the plate doesn't store a picture. It stores an interference pattern, and every patch of the plate contains information about the *whole* scene, just at lower resolution. Cut the plate in half and you still see the entire 3-D object, slightly fuzzier. The two-dimensional surface encodes a three-dimensional world.

That's the analogy, and it's a good one as far as it goes. A surface of one lower dimension carrying a complete description of a higher-dimensional interior. The holographic principle says the universe works like that at the deepest level: the three-dimensional contents of any region are encoded in two-dimensional data on its boundary, with one binary degree of freedom per few Planck areas, exactly as equation (1) demands.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

It does *not* mean the universe is "literally a hologram" or that we're inside a simulation. That's a category error the headlines love. The principle is a statement about mathematical *equivalence*: the same physics admits two complete descriptions, one in the bulk and one on the boundary, and you can translate losslessly between them. It also does not mean information is erased from the interior and stuck to the wall like a sticker. Both descriptions are real and they carry the same content. The boundary picture isn't more fundamental than the bulk; it's a faithful re-encoding of it. And crucially, none of this is yet established for our actual universe. It's proven rigorously in one idealised setting, strongly suggested in others, and an open question in general.

The misconception to kill is the picture of particles "shrinking onto the boundary" or matter being "projected" from the edge. Nothing shrinks and nothing is projected. The claim is informational: every quantum state describing the bulk corresponds to a quantum state on the boundary, and vice versa, by an exact dictionary. A particle in the middle of the room is perfectly real. It's just that its existence, position, and everything else about it can be reconstructed from data living on the surface around the room, because there was never any independent bulk information to begin with. The bulk had only an area's worth of freedom all along.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Push **pixelScale** up and down. Each tile is a fundamental cell of the boundary's information, and the total number of them is the surface area in Planck units, capped by equation (2). Coarsen the tiling and the recoverable bulk gets blurrier, the way a halved hologram does. What you can never do is sneak more bits onto the surface than its area allows. The resolution of reality, if you like, is set at the boundary.

## From a slogan to a theorem

For a few years the holographic principle was a beautiful suspicion held up by black-hole thermodynamics and not much else. Then in 1997 Juan Maldacena wrote down something extraordinary, and it remains the most-cited paper in modern theoretical physics for a reason.

Maldacena found an explicit, calculable example where the holographic dictionary is exact. On one side: a theory of gravity, with all its strings and curvature and dynamics, living in the interior of a particular spacetime called Anti-de Sitter space, a kind of negatively curved "box" with a well-defined boundary at infinity. On the other side: an ordinary quantum field theory, no gravity at all, living *only on that boundary*, one dimension lower. His claim, the AdS/CFT correspondence, is that these two theories are not similar. They are the *same theory*, written two ways. Every question you can ask about the gravitating bulk has an exact translation into a question about the boundary field theory, and the answers match.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
Z_{CFT}(g) = \int \mathcal{D}g\; e^{-S_{AdS}[g]}
```

$$
Z_{CFT}(g) = \int \mathcal{D}g\; e^{-S_{AdS}[g]}
$$

Equation (3) is the holographic principle promoted from slogan to identity. The left side, $Z_{CFT}$, is the generating function of a quantum field theory on the boundary, with no gravity in it. The right side is a sum over all the gravitational geometries of the bulk, weighted by their action $S_{AdS}$. The equals sign says: these compute the same numbers. A theory *with* gravity in $D$ dimensions equals a theory *without* gravity in $D-1$ dimensions. Gravity, in this setting, is what an extra dimension *looks like* from the boundary. The bulk volume is emergent. The boundary is where the real degrees of freedom sit, exactly $A/4\ell_P^2$ of them, exactly as Bekenstein's formula said.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This isn't hand-waving. In AdS/CFT you can count the boundary field theory's degrees of freedom independently, and the number you get matches the bulk gravitational entropy of equation (1) to the leading factor, including the factor of four. The match is so precise that string theorists used it to *derive* the Bekenstein-Hawking formula from first principles for certain black holes, counting the underlying quantum microstates one by one. That was the moment the area law stopped being a thermodynamic analogy and became a literal count of something. The bits are real, and they live on the surface.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This is also where the black-hole information paradox starts to dissolve. Throw a book into a black hole and Hawking's radiation seems to come out perfectly thermal, carrying no trace of the book. The information looks destroyed, which quantum mechanics forbids. But in AdS/CFT the whole process, book and black hole and radiation, has an exact dual description on the boundary, where it's plainly an ordinary quantum evolution that loses nothing. So the information *can't* be lost; the boundary theory is unitary by construction. It was saturated onto the horizon at the holographic limit and comes back out, scrambled but intact. The boundary determines the bulk so completely that nothing can fall out of the story.

## Honest about what we don't have

It would be easy to oversell this, so here's the cold water. AdS/CFT is rigorous, but it's rigorous about *Anti-de Sitter space*, a universe with negative curvature and a tidy boundary at infinity. Ours isn't that. Our universe is expanding, accelerating, and appears to have a small *positive* cosmological constant, which makes it de Sitter-like, not Anti-de Sitter. De Sitter space doesn't have the same clean boundary, and a fully worked holographic description of a universe like ours doesn't yet exist. The principle is on the firmest ground precisely where the universe doesn't live.

So what's actually solid? The Bekenstein-Hawking entropy, equation (1), is as close to experimental physics as black-hole thermodynamics gets, and it unambiguously scales with area. The entropy bound, equation (2), follows from it plus the second law, and is hard to escape in any theory that respects both. Those two are load-bearing and widely accepted. The leap from "black holes are holographic" to "*all* of spacetime is holographic" is the part still under construction. AdS/CFT is a proof of concept that the leap can be made somewhere; whether it can be made *here* is one of the open problems of the field.

What survives all the caveats is the seam Bekenstein found in 1973. Information density has a hard ceiling, and that ceiling is set by surface area in Planck units. Fill any region past it and gravity itself intervenes, collapses the region, and stamps the answer onto a horizon. Whatever the final theory of quantum gravity turns out to be, it will have to reproduce that fact, and the fact already tells us something disorienting and probably true: the world has fewer independent degrees of freedom than it appears to. The volume is mostly redundancy. The real bookkeeping happens on the wall. Some food for thought, the next time a room looks full.

## Reading further

- [Bekenstein, *Black Holes and Entropy* (Phys. Rev. D 7, 1973)](https://journals.aps.org/prd/abstract/10.1103/PhysRevD.7.2333). The original proposal that black-hole entropy scales with horizon area; equation (1) and the second-law argument start here.
- [Susskind, *The World as a Hologram* (J. Math. Phys. 36, 1995)](https://arxiv.org/abs/hep-th/9409089). The paper that named the principle and gave it a string-theoretic reading: 3-D physics encoded on 2-D surfaces, one degree of freedom per Planck area.
- [Maldacena, *The Large N Limit of Superconformal Field Theories and Supergravity* (1997)](https://arxiv.org/abs/hep-th/9711200). The AdS/CFT paper: the first exact realisation of holography, bulk gravity equal to a boundary field theory one dimension lower.
- [Bousso, *The Holographic Principle* (Rev. Mod. Phys. 74, 2002)](https://arxiv.org/abs/hep-th/0203101). The standard review: entropy bounds, the covariant version of equation (2), black-hole thermodynamics, and where the 1.4 × 10^69 bits per square metre comes from.
