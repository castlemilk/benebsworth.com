---
title: The Universe Might Be Inside a Black Hole
date: '2026-06-24T00:00:00.000Z'
description: >-
  Several serious models put our universe inside, or on the horizon of, a black
  hole in a larger parent cosmos — and the Big Bang as that black hole forming.
  A survey of the real physics, then one speculative step further.
labels: 'cosmology,astrophysics,black holes,relativity'
release: true
author: Ben Ebsworth
heroImage: /blog/universe-inside-a-black-hole/hero.webp
takeaways:
  - >-
    The observable universe's mass packed into its own radius gives a
    Schwarzschild radius almost exactly equal to that radius — a numerical
    coincidence that several published models take seriously rather than
    dismiss.
  - >-
    An event horizon is a one-way causal boundary, not a wall. An observer
    inside a universe-mass black hole would feel ordinary local spacetime, which
    is exactly what we do.
  - >-
    Poplawski's torsion bounce and Afshordi's holographic Big Bang both replace
    the initial singularity with something finite: a rebound, or a horizon on a
    higher-dimensional star. Neither needs the singularity that classical
    general relativity forces on us.
  - >-
    Holography says a boundary one dimension lower can encode a bulk. It does
    not say the boundary spawns a smaller universe. The nested-ladder picture in
    the last third of this post is a heuristic I find irresistible, not a
    theorem anyone has proved.
markdown_url: /blog/universe-inside-a-black-hole/
canonical_url: 'https://benebsworth.com/blog/universe-inside-a-black-hole/'
---
## Key takeaways

- The observable universe's mass packed into its own radius gives a Schwarzschild radius almost exactly equal to that radius — a numerical coincidence that several published models take seriously rather than dismiss.
- An event horizon is a one-way causal boundary, not a wall. An observer inside a universe-mass black hole would feel ordinary local spacetime, which is exactly what we do.
- Poplawski's torsion bounce and Afshordi's holographic Big Bang both replace the initial singularity with something finite: a rebound, or a horizon on a higher-dimensional star. Neither needs the singularity that classical general relativity forces on us.
- Holography says a boundary one dimension lower can encode a bulk. It does not say the boundary spawns a smaller universe. The nested-ladder picture in the last third of this post is a heuristic I find irresistible, not a theorem anyone has proved.

Here is a number worth staring at before you decide it's a coincidence. Take all the mass and energy in the observable universe, ordinary matter, dark matter, the energy equivalent of dark energy, and ask what radius a black hole of that mass would have. The answer comes out at roughly 13.8 billion light-years. That is, to within the slop of our measurements, the Hubble radius: the natural light-travel yardstick for how far we can see, and the size that matters for this argument. (The *comoving* radius is larger, about 46 billion light-years, once you account for the expansion that happened while the light was in flight. The coincidence is with the Hubble radius, and it is not an accident of units: a universe at the critical density always has its mass sitting at its own Schwarzschild scale.) If you found any other object whose physical size matched its Schwarzschild radius, you would call it a black hole without hesitating.

So the question almost asks itself. Are we living inside one? Not as a metaphor, not as a thought experiment, but as a literal description of where this cosmos sits in a larger one. The idea sounds like late-night dorm-room physics, and most of the time when something sounds like that it deserves the eye-roll it gets. This one doesn't. A thin but entirely respectable line of published work, running from a 1972 *Nature* paper to peer-reviewed cosmology in the 2010s, has taken the coincidence seriously and built models where the Big Bang is a black hole forming in a parent universe. This post is a tour of those models, what they actually claim, and where they stop. Then, clearly fenced off and labelled, I'll run the idea one step past where the papers go, because the step is too tempting not to take.

> [SchwarzschildCalculator component] Interactive calculator: a mass slider (log scale) computes the Schwarzschild radius r_s = 2GM/c^2, with presets (a person, the Earth, the Sun, Sagittarius A*, the observable universe). It highlights that the observable universe sits at roughly its own Schwarzschild radius. The rendered post has the live widget.

Play with that for a moment. Drag the mass up from a human body to the Earth to the Sun to Sagittarius A\*, the four-million-solar-mass black hole at the centre of our galaxy, and watch the horizon radius track it. Then jump to the observable universe and notice that the predicted horizon and the measured size land essentially on top of each other. That near-equality is the seed of everything below. Whether it's a deep clue or a numerical accident is exactly what's in dispute, and reasonable physicists land on both sides.

To feel the scales involved, here's the same physics laid out as a zoom. The marker at the Sun's Schwarzschild radius shows how absurdly small a black hole of a star's mass is (about 3 km), and the cosmic end of the slider shows the radius we're claiming matches the whole observable universe.

> [UniverseScale component] Embedded "Universe Scale" explorer: a logarithmic zoom across 62 orders of magnitude, from the Planck length to the observable universe (ant, human, whale, skyscraper, Mount Everest, Earth, Sun, galaxy, cosmic web). The `focus` prop sets the initial scale. Markers at the Sun's Schwarzschild radius and the Planck length link to the black-hole-cosmology essay. The rendered post has the live, scrollable canvas.

## Why "inside a black hole" doesn't feel like anything

The first objection is visceral. If we were inside a black hole we'd be crushed, or we'd see the horizon looming, or we'd be falling toward a singularity and we'd know it. None of that follows, and clearing the objection is the price of admission to the rest of the post.

An event horizon is not a surface. Nothing is there. It's a causal boundary, the set of points past which light can no longer climb back out to a distant observer. Locally, spacetime at the horizon of a large black hole is unremarkable. The curvature you feel, the tidal stretching that would actually hurt, scales inversely with the square of the black hole's mass. For a stellar black hole the tides at the horizon are lethal. For a supermassive one they're gentle. For a universe-mass black hole they're so far below anything detectable that you would feel precisely nothing. You'd feel ordinary space, with ordinary local physics, which is to say you'd feel exactly what you feel right now.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Tidal force at a horizon goes roughly as $M/r_s^3 \sim 1/M^2$, since the horizon radius $r_s$ itself grows with $M$. Double the black hole's mass and the stretching at its horizon drops by a factor of four. A universe-mass black hole has a horizon $14$ billion light-years across and tidal stresses smaller than anything we could ever measure. "Inside a black hole" does not mean "being crushed". For an object this large it means a region of perfectly ordinary, locally flat spacetime that you cannot signal your way out of. Sound familiar?

There's a second piece. Inside a black hole the roles of space and time partly swap: the radial direction becomes time-like, which is a precise way of saying the singularity is not a *place* ahead of you in space but a *moment* ahead of you in time, as unavoidable as next Tuesday and just as invisible until you arrive. Now flip it around. If our Big Bang were the time-reverse of that, the singularity would be a moment in our past, behind us, the one boundary every worldline in the cosmos emerges from. That structural rhyme between "the inside of a black hole" and "an expanding universe with a beginning" is not proof of anything. But it's the kind of rhyme that makes a physicist look twice.

## The lineage: black-hole cosmology before it was cool

The earliest serious version is Raj Pathria's 1972 letter to *Nature*, baldly titled *The Universe as a Black Hole*. Pathria noticed the same coincidence I opened with and worked through the consequence: if the observable universe's density and size put it at its Schwarzschild radius, then a co-moving observer's universe could be modelled as the interior of a Schwarzschild black hole embedded in some larger space. The maths of an expanding Friedmann universe and the maths of a black-hole interior share more structure than the two pictures, "everything blowing apart" versus "everything trapped inside", suggest at first glance.

Two decades later W.M. Stuckey sharpened the geometry in the *American Journal of Physics*, showing how a matter-filled, expanding cosmology can be matched to a black-hole exterior across a boundary, so that what looks from outside like a black hole of fixed mass looks from inside like an expanding universe. These were not crank papers. They were careful, modest, and largely ignored, because in 1972 and 1994 there was no mechanism. The coincidence was suggestive and the geometry was consistent, but nobody had a story for *how* you'd get from a collapsing black hole in one universe to a hot, expanding Big Bang in another without the physics breaking down at the singularity in between.

The singularity is the whole problem. Classical general relativity, taken at face value, predicts that collapse runs all the way to infinite density at a point, and the Penrose-Hawking theorems make that not a quirk of idealised symmetry but a near-inevitability of gravity plus reasonable matter. A theory that ends in infinities is a theory announcing its own breakdown. So any model that wants the Big Bang to be a black hole forming somewhere else needs to do what the classical theory can't: reach the centre of a black hole and *not* hit a singularity. It needs a bounce, or it needs to dissolve the singularity into something tamer. The next two models do exactly those two things, by completely different routes.

## Poplawski's bounce: spin, torsion, and a universe that rebounds

Nikodem Poplawski's mechanism is my favourite of the lot, because it changes nothing you've heard of and everything you haven't. He works in Einstein-Cartan gravity, an old and respectable extension of general relativity that Einstein himself flirted with and that Kibble and Sciama formalised in the 1960s. The whole modification is one extra ingredient: spacetime is allowed to have **torsion** as well as curvature.

Curvature is how mass-energy bends spacetime, the thing general relativity already has. Torsion is a different twisting of the geometry, and in Einstein-Cartan theory it's sourced by the intrinsic spin of fermions, the quarks and electrons that everything is built from. In ordinary conditions torsion is fantastically weak and Einstein-Cartan is indistinguishable from plain general relativity. You only notice it when matter is squeezed to nuclear densities and beyond, where the alignment of all that fermion spin makes torsion matter. The field equations gain a term general relativity simply doesn't have.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
S_{\mathrm{ECKS}} = \frac{1}{16\pi G} \int \left( R + \frac{1}{2}\,\epsilon^{\mu\nu\rho\sigma}\, T_{\mu\nu\lambda}\, T^{\lambda}{}_{\rho\sigma} \right) \sqrt{-g}\; d^4x
```

$$
S_{\mathrm{ECKS}} = \frac{1}{16\pi G} \int \left( R + \frac{1}{2}\,\epsilon^{\mu\nu\rho\sigma}\, T_{\mu\nu\lambda}\, T^{\lambda}{}_{\rho\sigma} \right) \sqrt{-g}\; d^4x
$$

That quadratic torsion term is the engine. At everyday densities it's nothing. As collapse drives matter toward Planck-scale density, the term grows and acts like an enormous **repulsion**, a negative pressure that fights the inward pull of gravity. Run the collapse inside a black hole forward and you don't reach a singularity. Instead the repulsion overwhelms the attraction at a finite, colossal density, halts the collapse, and throws everything back outward. A **bounce**. What was falling in starts expanding out, and from the inside that rebound looks exactly like a hot Big Bang. The matter that fell into the parent black hole becomes the matter of a new, expanding universe on the far side, separated from the parent by the horizon.

> [WhiteHoleBounce component] Interactive schematic of gravitational collapse with a toggle between two endings: a classical singularity, or an Einstein-Cartan torsion bounce (Poplawski) where collapse rebounds into an expanding new universe whose rebound is a white-hole-like Big Bang. The rendered post has the live version.

Toggle that between the classical case and the torsion case and the difference is the whole story. The classical worldlines pile into the singularity and stop. With torsion switched on, they reach a minimum size, turn around, and fan back out. The rebound has white-hole character: from inside the parent black hole, the new universe is being *expelled*, the time-reverse of falling in. Poplawski's phrase for our Big Bang is, roughly, the other end of a black hole. We fell into a black hole in some parent universe; we are the expanding side of its bounce.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Poplawski's torsion model does more than dodge the singularity. The same repulsion drives a brief, violent expansion right after the bounce, which behaves a lot like inflation: it flattens the geometry and smooths out the horizon problem (why distant patches of sky have the same temperature) without needing a separate inflaton field bolted on. The model carries a torsion density parameter of order $\Omega_S \approx -10^{-69}$ today, vanishingly small, but non-zero, and in principle a handle for testing. Solving inflation's two headline puzzles for free, with a field we already know exists (fermion spin), is the kind of economy that makes a model worth a second look.

Is it right? Unknown. Einstein-Cartan gravity is a legitimate theory, classically equivalent to general relativity in vacuum and differing only where spin density is enormous, which means it agrees with every test of general relativity we've ever run. It's also hard to falsify precisely because the differences hide at densities we can't reach. But it's a real, conservative, singularity-free mechanism for "the Big Bang was a black hole forming", and it asks you to believe nothing more exotic than torsion, which the theory had on the shelf for a century.

## The holographic Big Bang: our universe as a brane on a 5-D star

The second mechanism is stranger and, for the dimensional game I want to play later, more important. In 2013 Razieh Pourhasan, Niayesh Afshordi, and Robert Mann published *Out of the White Hole: A Holographic Origin for the Big Bang* in *JCAP*. Their move is to add a dimension.

Picture a universe with four spatial dimensions instead of three, a 4+1-dimensional bulk. In that bigger space, let a star collapse into a black hole, just as a 3-D star can. A black hole in 4+1 dimensions has a four-dimensional event horizon, the higher-dimensional analogue of the two-dimensional spherical surface around an ordinary black hole. Now here's the payoff. That horizon is a 3+1-dimensional surface. It has exactly the dimensionality of our universe. Afshordi, Mann, and Pourhasan propose that everything we call the cosmos, all of space and time, is a **brane**: a membrane living on the horizon of a black hole in a larger four-dimensional-space universe.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

In their picture the Big Bang is not a point of infinite density at the start of time. It's the *formation* of the higher-dimensional black hole's horizon, seen from the inside. The 4-D star collapses; its horizon expands outward into the bulk; and that expanding horizon, the surface we're stuck to, is what we experience as space itself stretching from a hot, dense beginning. The apparent singularity of the Big Bang becomes a **mirage**: a causal horizon in the bulk, not an actual infinity. The naked singularity that plagues the classical story is hidden behind the higher-dimensional horizon, where it can't hurt anyone.

The technical scaffolding is the DGP braneworld model (Dvali, Gabadadze, Porrati), which gives a brane both its own induced 3+1-D gravity and a coupling to the 4+1-D bulk's gravity. That structure is what lets a 3-brane carry realistic cosmology, including expansion that matches what we observe, without requiring an inflationary epoch in the usual sense. The geometry does the smoothing that inflation usually does.

I want to be precise about the claim, because it's easy to over-read. They are not saying "the universe is metaphorically like a black hole horizon". They are saying our 3+1-D spacetime *is* the 3+1-D horizon of a 4+1-D black hole, and the hot Big Bang is the time-reverse of that black hole forming, which is why "white hole" is in the title. The thing throwing matter and space outward, from our point of view at the beginning, is a higher-dimensional collapse running in reverse on its boundary.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The expansion history we actually observe, the scale factor $a(t)$ growing from a hot dense state, is the same curve in both the standard picture and Afshordi's. That's the point. At the redshifts we can see, the holographic Big Bang reproduces ordinary $\Lambda$CDM cosmology. It only departs near the very beginning, at energies approaching the Planck scale, where the brane picture replaces the singularity with a horizon. So the model isn't a rival to standard cosmology over most of history. It's an alternative *origin* glued to the same middle and end. Slide the matter and dark-energy dials and you're moving along the curve both pictures share.

## Why a boundary can hold a whole interior

To take the next step you need to believe one genuinely strange thing, which is by now standard physics: a region of space can be completely described by information living on its boundary, one dimension lower. This is the **holographic principle**, and it grew out of thinking hard about black holes.

In 1973 Jacob Bekenstein argued that a black hole must carry entropy, otherwise you could throw a hot cup of tea past the horizon and violate the second law of thermodynamics. Hawking then nailed the value. A black hole's entropy is proportional not to its volume, as entropy is for ordinary matter, but to the **area** of its horizon, measured in Planck units.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
S = \frac{A}{4\,\ell_P^2}, \qquad \ell_P = \sqrt{\frac{\hbar G}{c^3}}
```

$$
S = \frac{A}{4\,\ell_P^2}, \qquad \ell_P = \sqrt{\frac{\hbar G}{c^3}}
$$

Sit with how odd that is. Entropy counts microstates, the number of distinct ways the inside can be arranged. For everything else in physics that number scales with volume: twice the box, twice the storage. For a black hole it scales with surface area. The maximum information you can pack into a region is set by the size of the *wall*, not the room. That's the holographic bound, and it says the three-dimensional contents of any region can be encoded on its two-dimensional boundary at roughly one bit per four Planck areas.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Watch the two scalings race. Volume climbs as $r^3$, area only as $r^2$, so the bigger the region, the more dramatically the area "loses", and yet the area is the quantity that limits the information. A region can never hold more bits than its boundary allows. Push past that and the region collapses into a black hole, whose entropy is, once again, exactly the boundary area over four. Nature appears to store its books on the surface.

Gerard 't Hooft proposed in 1993 that this is general, not a black-hole quirk: quantum gravity in any region is equivalent to a theory living on that region's boundary. Leonard Susskind made it sharp in his 1995 paper *The World as a Hologram*. Then in 1997 Juan Maldacena turned the slogan into mathematics with the AdS/CFT correspondence, an exact, calculable duality in which a gravitational theory in a $(d+1)$-dimensional bulk is *the same theory* as a non-gravitational quantum field theory on its $d$-dimensional boundary. Two descriptions, different dimensions, identical physics. This is now one of the most tested ideas in theoretical physics. It is the reason a brane one dimension lower than its bulk can carry the bulk's full content, and it's what makes Afshordi's "our universe is a 3-D horizon of a 4-D black hole" a sentence with mathematical teeth rather than just poetry.

> [HolographicReduction component] Interactive diagram of the holographic principle: a 3-D bulk region beside its 2-D boundary, with a radius slider showing volume growing as r^3 while the maximum entropy (information) grows only as the boundary area r^2 (in Planck units). The rendered post has the live version.

Drag the radius and watch the two ledgers diverge: the bulk's volume runs away as $r^3$ while the boundary's encoding capacity grows only as $r^2$, and yet the boundary is enough. Every state of the cube on the left has a faithful description in the pixels tiling the surface on the right. That's the equivalence, not a lossy projection but a genuine dictionary between two complete descriptions, and it's the rung the next section tries (perhaps too eagerly) to climb.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The maximum information in any region of space is set by the area of its boundary, not the volume it encloses. Reality keeps its accounts on the surface.

## A speculative step further (this part is mine, not the literature's)

Everything to this point is published, peer-reviewed, and defended by people who do this for a living. What follows is not. It's a heuristic I find irresistible, and I want it sealed off behind a clear label so nobody mistakes it for established physics. With that warning planted firmly, here's the step.

The holographic Big Bang gives us one rung of a ladder: a 4-D bulk whose black-hole horizon is our 3-D universe. The holographic principle, taken at face value, suggests the rung repeats. Our own 3-D universe is full of black holes. Each has a 2-D horizon that, by Bekenstein and Hawking, encodes everything that fell in. So what stops you running Afshordi's logic *downward*? If our 3-D cosmos is the horizon of a 4-D black hole, then perhaps each 3-D black hole we observe is the bulk for a 2-D "universe" living on its horizon, complete with its own internal observers who'd swear their space is fundamental. And those would host 1-D horizons below them, and so on, a fractal staircase of cosmoses, each one a horizon of the level above and a bulk for the level below, losing a spatial dimension at every step.

> [NestedUniverses component] Interactive, clearly-speculative ladder of nested universes: a 4-D bulk universe whose black-hole horizon is our 3+1-D universe, whose black holes in turn encode 2-D "universes", and so on. Click a level to descend; each shows its dimensionality and what plays the role of its Big Bang. The rendered post has the live version.

Click down through the levels. The 4-D bulk holds our 3-D universe on its horizon; our universe holds 3-D black holes; each of those, in this picture, presents a 2-D horizon that's a "universe" to whatever lives on it. At each rung, the moment of creation, what the inhabitants call their Big Bang, is the parent's collapse running in reverse, a white-hole output spilling matter and space onto the new horizon. It's the same move Poplawski and Afshordi make once, repeated forever in both directions: an infinite regress of universes nested in black holes nested in universes.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

I have to be honest about where this breaks. Holography says a bulk can be *encoded on* its boundary. It does **not** say the boundary *spawns* a lower-dimensional universe with its own time and inhabitants. Those are different claims, and only the first is established. Afshordi's model is one carefully constructed rung with a specific higher-dimensional bulk and a specific brane; it is not a licence to iterate the construction indefinitely. "Loses a dimension per level" is a pattern I'm noticing, not a theorem anyone has proved, and there are concrete reasons (the dimensional dependence of gravity, what "a 2-D universe" even means dynamically) to doubt the rungs below ours exist at all. Enjoy the picture. Don't bank on it.

So why include it? Because the honest scientific posture isn't to suppress the tempting extrapolation, it's to state it plainly *and* mark exactly where the evidence stops. The nested ladder is the natural shape the published models hint at if you squint and keep walking. Whether nature actually walks that far is a separate question, and the current answer is that we don't know, with a strong prior that the heuristic is over-reaching. That's the difference between speculation done in the open and speculation smuggled in as fact.

## Can we test any of this?

A model that can't be tested is philosophy wearing a lab coat. So what would distinguish "the Big Bang was a black hole forming" from the standard story, and is any of it within reach?

Afshordi and collaborators have argued their holographic Big Bang leaves faint fingerprints on the cosmic microwave background, the relic light from when the universe was 380,000 years old. The brane-origin scenario predicts a slightly different spectrum of primordial fluctuations than standard inflation does, with small departures that future high-precision CMB measurements and primordial gravitational-wave searches could in principle confirm or kill. Poplawski's torsion model is falsifiable in a similar spirit: torsion couples to spin, so precision tests of the equivalence principle, or dispersion in gravitational waves, could surface its tiny effects. Neither prediction is a slam-dunk we can check tomorrow. But neither is unfalsifiable, and that distinction matters.

The cleanest falsifiable cousin of all this comes from Lee Smolin, and it doesn't need extra dimensions. His **cosmological natural selection** takes the black-hole-makes-a-universe idea and asks: what if it happens, and what if the new universe inherits the parent's physical constants with small random tweaks? Then universes that are good at making black holes have more "offspring", and after many generations the ensemble is dominated by universes tuned to maximise black-hole production.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\mathcal{N} \;\propto\; \exp\!\left(-\,\frac{\beta\, M}{M_*}\right)
```

$$
\mathcal{N} \;\propto\; \exp\!\left(-\,\frac{\beta\, M}{M_*}\right)
$$

The payoff is a genuine prediction with teeth. If Smolin is right, our universe's constants should sit at a *local maximum* for black-hole production, so almost any small change to a fundamental constant should make fewer black holes, not more. That's checkable in principle. Find one easy tweak to the constants that would clearly boost black-hole formation, and cosmological natural selection is in serious trouble. It's a rare example of a multiverse-flavoured idea that sticks its neck out far enough to get it chopped off.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## What this is, and what it isn't

Let me land this honestly, because the failure mode for a topic like this is breathless overreach, and the topic is interesting enough not to need it.

There are real, published, mathematically careful models in which our universe is the interior, or the horizon, of a black hole in a larger cosmos, and in which the Big Bang is that black hole's formation rather than a naked singularity. Pathria and Stuckey set up the geometry. Poplawski supplies a concrete singularity-free mechanism with torsion. Afshordi, Mann, and Pourhasan supply another with an extra dimension and a brane, grounded in the holographic principle that AdS/CFT made rigorous. None of these is fringe. All of them are honest attempts to dissolve the worst feature of the standard story, the initial singularity, the one place where our best theory openly admits it has broken.

What none of them establishes is the romantic version: an endless fractal of universes spawning universes, each losing a dimension, all the way down. Holography encodes a bulk on a boundary. It does not breed lower-dimensional cosmoses on the horizons of black holes. The nested ladder in the middle of this post is a heuristic, the shape the real models suggest if you let your hand keep drawing past the data. I find it beautiful. I also think it's probably wrong, and saying both at once is the whole job.

The coincidence I opened with stays standing through all of it. The observable universe really does sit at its own Schwarzschild radius. That fact demands either an explanation or a shrug, and a handful of serious people have decided it deserves an explanation. Whether they're right is, gloriously, still open. Some food for thought, the next clear night you're under the sky and wondering what's holding it up.

## Reading further

- [Pourhasan, Afshordi & Mann, *Out of the White Hole: A Holographic Origin for the Big Bang* (JCAP 04, 2014; arXiv:1309.1487)](https://arxiv.org/abs/1309.1487). The core peer-reviewed paper: our 3+1-D universe as a brane on the horizon of a 4+1-D black hole, with the Big Bang as a higher-dimensional collapse seen from inside.
- [Poplawski, *Cosmology with torsion: An alternative to cosmic inflation* (Phys. Lett. B 694, 2010; arXiv:1007.0587)](https://arxiv.org/abs/1007.0587). The torsion-bounce mechanism in Einstein-Cartan gravity, and the suggestion that our universe lives inside a black hole in another universe.
- [Susskind, *The World as a Hologram* (J. Math. Phys. 36, 1995; arXiv:hep-th/9409089)](https://arxiv.org/abs/hep-th/9409089). The foundational statement of the holographic principle, the idea that makes a lower-dimensional boundary able to encode a higher-dimensional interior.
- [Smolin, *The Life of the Cosmos* (Oxford University Press, 1997)](https://global.oup.com/academic/product/the-life-of-the-cosmos-9780195126648). Cosmological natural selection: black holes as cosmic reproduction, and the rare multiverse idea that makes a falsifiable prediction about our own constants.
