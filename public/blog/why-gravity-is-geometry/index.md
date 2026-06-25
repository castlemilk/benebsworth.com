---
title: Why Gravity Is Geometry
date: '2026-06-25T00:00:00.000Z'
description: >-
  Gravity is not a force that pulls objects together. It is the shape of curved
  spacetime, and a falling object is simply coasting in a straight line through
  a bent geometry.
labels: 'physics,relativity,spacetime,geometry'
release: true
author: Ben Ebsworth
heroImage: /blog/why-gravity-is-geometry/hero.webp
takeaways:
  - >-
    Nothing pulls a falling apple. The apple moves in a straight line; spacetime
    is what's curved, and a straight line through curved geometry looks like a
    fall.
  - >-
    The reason every object falls at the same rate is that the path is a
    property of the geometry, not of the object — mass cancels out of the
    geodesic equation entirely.
  - >-
    Einstein's equations are a two-way conversation: matter tells spacetime how
    to curve, and that curvature tells matter how to move.
  - >-
    Gravity that you can feel is the floor pushing you off your natural path. In
    free fall you feel nothing because you've stopped fighting the geometry.
markdown_url: /blog/why-gravity-is-geometry/
canonical_url: 'https://benebsworth.com/blog/why-gravity-is-geometry/'
---
## Key takeaways

- Nothing pulls a falling apple. The apple moves in a straight line; spacetime is what's curved, and a straight line through curved geometry looks like a fall.
- The reason every object falls at the same rate is that the path is a property of the geometry, not of the object — mass cancels out of the geodesic equation entirely.
- Einstein's equations are a two-way conversation: matter tells spacetime how to curve, and that curvature tells matter how to move.
- Gravity that you can feel is the floor pushing you off your natural path. In free fall you feel nothing because you've stopped fighting the geometry.

Drop a hammer and a feather in a vacuum and they hit the floor together. Every physics class meets this fact early, usually framed as a curiosity about air resistance. But it hides something stranger than the demonstration lets on. Why should a one-gram feather and a one-kilogram hammer accelerate at *exactly* the same rate? In Newton's picture you have to arrange a suspicious coincidence: the Earth pulls harder on the heavier object (more gravitational mass) but the heavier object also resists that pull more (more inertial mass), and the two effects cancel to perfect precision, for every object ever tested, to better than one part in a trillion.

That coincidence is the loose thread. Pull on it and the whole idea of gravity as a *force* unravels. The fall isn't caused by a force at all. The hammer and the feather move identically because they aren't being pulled by anything. They're both coasting along the straightest path available through a spacetime that the Earth has bent. The geometry doesn't care what's moving through it, so everything moves the same way. That's the claim this post is built to defend, and it's worth saying plainly up front: gravity is not a force. It is geometry.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

This is the picture Einstein traded for Newton's force. The central mass doesn't reach out and grab anything. It curves the sheet, and particles rolling across the sheet follow the contours. Turn on **Light rays** and watch even photons bend, though nothing pulls on a massless thing. Push **Mass M** up and the well deepens, the curves tighten. Everything you'd call "gravity" in this scene is the shape of the surface, not a tug across it.

## The equivalence principle: gravity you can't feel

Start where Einstein started, with a thought he later called the happiest of his life. Imagine you're in a sealed lift with no windows. The cable snaps and the lift falls freely down its shaft. For those few seconds, everything inside floats. You feel weightless. A ball released from your hand hangs in the air beside you. There is no experiment you can run inside that box to tell whether you're falling toward Earth or drifting in deep space far from any mass. The two situations are physically identical.

Now flip it. You're in the same windowless box, but in deep space, and a rocket underneath fires with a steady thrust that pushes the box "upward" at $9.8\ \text{m/s}^2$. You feel your normal weight pressing into the floor. Drop a ball and it falls to the floor exactly as it would on Earth. Again, no internal experiment distinguishes "sitting on Earth" from "accelerating in a rocket". This is the **equivalence principle**: a uniform gravitational field is locally indistinguishable from uniform acceleration.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Here's the inversion that takes a while to sit right. You think you feel gravity right now, pressing you into your chair. You don't. What you feel is the chair pushing *up* on you, knocking you off the straight path you'd otherwise take. The genuinely gravitational state of motion is free fall, and in free fall you feel *nothing*. The astronaut in orbit isn't escaping gravity; she's surrendered to it completely, which is why she floats. Weight is the sensation of being prevented from falling.

The equivalence principle is the bridge from physics to geometry. If standing on Earth feels exactly like accelerating through empty space, then whatever gravity *is*, it has to be the kind of thing that acceleration also is. And acceleration is not a force you carry around inside you. It's a feature of your trajectory through spacetime. So gravity, Einstein reasoned, must be a feature of spacetime too. The mass of the Earth doesn't fill the room with an invisible pulling field. It changes the shape of the spacetime you and the room sit in, and "falling" is what moving naturally through that altered shape looks like.

## Straight lines in a place where straight is bent

To make that precise we need a way to talk about "the straightest possible path" when the space itself is curved. On a flat plane, a straight line is obvious. On the curved surface of the Earth, it isn't, but there's a clean replacement. A **geodesic** is the locally straightest path: walk forward without ever turning left or right, and you trace one. On a sphere, geodesics are great circles. That's why long-haul flights from Sydney to London arc up over Asia rather than following a flat-map straight line. The plane is flying as straight as the curved Earth allows.

Geodesics are also the *extremal* paths, the ones whose length is stationary against small wiggles. For a particle moving through spacetime, the relevant quantity isn't spatial length but **proper time**, the time ticked off by a clock carried along the path. A free particle follows the geodesic that *maximises* its own proper time. This is sometimes called the principle of extremal ageing, and it's the relativistic descendant of Newton's first law. A free object doesn't move in a spatial straight line at constant speed; it moves so as to age as much as possible between two events.

The geometry that decides all of this is encoded in a single object, the **metric tensor** $g_{\mu\nu}$. The metric is the rule that tells you the proper interval between two nearby points. In flat spacetime, far from any mass, it takes the simple Minkowski form:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
ds^2 = g_{\mu\nu}\,dx^\mu dx^\nu = -c^2\,dt^2 + dx^2 + dy^2 + dz^2
```

$$
ds^2 = g_{\mu\nu}\,dx^\mu dx^\nu = -c^2\,dt^2 + dx^2 + dy^2 + dz^2
$$

The minus sign on the time term is the entire difference between space and spacetime, and it's doing enormous work. Near a mass the metric coefficients change: clocks low in a gravitational well tick slower, rulers stretch, and the geometry stops being flat. Once you know $g_{\mu\nu}$ everywhere, you know everything about the gravitational field. There's nothing else to specify. The metric *is* the gravity.

## The geodesic equation: how matter moves

Given a metric, the path of a free particle is fixed by the **geodesic equation**. It's the formal statement of "go as straight as the geometry allows", and it reads:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{d^2 x^\mu}{d\tau^2} + \Gamma^\mu_{\alpha\beta}\,\frac{dx^\alpha}{d\tau}\,\frac{dx^\beta}{d\tau} = 0
```

$$
\frac{d^2 x^\mu}{d\tau^2} + \Gamma^\mu_{\alpha\beta}\,\frac{dx^\alpha}{d\tau}\,\frac{dx^\beta}{d\tau} = 0
$$

Don't be put off by the indices. The first term, $d^2x^\mu/d\tau^2$, is just acceleration: how the particle's four-velocity changes along its own clock. In flat space the second term vanishes and you recover $d^2x^\mu/d\tau^2 = 0$, which says "no acceleration, move in a straight line at constant speed". Newton's first law, exactly. The second term, with the **Christoffel symbols** $\Gamma^\mu_{\alpha\beta}$, is the geometry's correction. The Christoffel symbols are built entirely from derivatives of the metric, so they're a pure measure of how the geometry bends from place to place. They are what a Newtonian would mistake for "the gravitational force per unit mass".

Now look at what is *missing* from equation (2). There is no mass in it. None. The path a particle takes depends only on the geometry (through $\Gamma$) and on the particle's current position and velocity. It does not depend on what the particle is, how heavy it is, or what it's made of. That's the whole hammer-and-feather mystery, dissolved. They fall together not because of a delicate cancellation between two kinds of mass, but because mass was never in the equation of motion to begin with. The trajectory is a property of spacetime, and spacetime offers the same straightest path to everyone.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Newton needed gravitational mass and inertial mass to be equal by a cosmic coincidence. Einstein needed them to be the same thing, because in his theory there's no mass in the falling at all.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The Christoffel symbols aren't tensors, which sounds like a technicality but carries a deep message. Because they're not tensors, you can always make them *vanish at a single point* by choosing the right coordinates, namely the free-falling frame. That's the equivalence principle in mathematical dress: at any one event, you can transform away the apparent gravitational acceleration entirely, just by jumping into the falling lift. What you *cannot* transform away is how the symbols *change* from point to point. That residue is real, coordinate-independent curvature, and it's why a large enough falling lift would eventually notice the floor and ceiling drifting together: tidal gravity, the part of curvature that no choice of frame can erase.

## Curvature you can measure: the Riemann tensor

So how do you tell genuine curvature from a mere bad choice of coordinates? The honest measure is the **Riemann curvature tensor**. Its definition is a mouthful, but the idea behind it is wonderfully concrete: take a vector, carry it around a small closed loop while keeping it "as parallel as possible" at each step, and check whether it comes back pointing the same way.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
R^{\rho}{}_{\sigma\mu\nu} = \partial_\mu \Gamma^{\rho}_{\nu\sigma} - \partial_\nu \Gamma^{\rho}_{\mu\sigma} + \Gamma^{\rho}_{\mu\lambda}\Gamma^{\lambda}_{\nu\sigma} - \Gamma^{\rho}_{\nu\lambda}\Gamma^{\lambda}_{\mu\sigma}
```

$$
R^{\rho}{}_{\sigma\mu\nu} = \partial_\mu \Gamma^{\rho}_{\nu\sigma} - \partial_\nu \Gamma^{\rho}_{\mu\sigma} + \Gamma^{\rho}_{\mu\lambda}\Gamma^{\lambda}_{\nu\sigma} - \Gamma^{\rho}_{\nu\lambda}\Gamma^{\lambda}_{\mu\sigma}
$$

On the flat surface of a table, transport a pencil around any loop and it comes back unchanged: Riemann is zero. On the curved surface of a globe, walk a closed triangle (up a meridian, along the equator, back down) keeping a pencil pointing "forward" the whole way, and it returns rotated. The angle of that rotation is curvature, and you measured it without ever leaving the surface or referring to anything outside it. This is the key point: curvature is *intrinsic*. You don't need to embed spacetime in some higher space to detect its bending. A creature confined to the surface can find it with a pencil and a loop.

The rubber-sheet picture in the lab above is a useful crutch, but it's also a small lie. It shows you the geometry *embedded* in a third dimension, dimpled like a trampoline, which makes it look as if gravity needs some external "down" for things to roll into. It doesn't. The Riemann tensor is the truth the embedding only gestures at: spacetime is curved on its own terms, from the inside, with no surrounding space required and no preferred "down" anywhere. The trampoline rolls things downhill because of Earth's gravity, which is precisely the thing the picture is supposed to be explaining. Hold the geodesic equation in mind as the real story and the sheet as a sketch of it.

Contract the Riemann tensor (sum over a pair of its indices) and you get the **Ricci tensor** $R_{\mu\nu}$; contract again and you get the **Ricci scalar** $R$, a single number at each point measuring how the volume of a small ball of free-falling particles shrinks relative to flat space. These contractions throw away some information about curvature, and the part they keep is exactly the part that responds to the matter sitting at that point. That's the bridge to the second half of the story.

## The field equations: how matter curves spacetime

We have half the conversation. Geometry tells matter how to move, via geodesics. The other half is the reverse: matter tells geometry how to curve. That's the content of the **Einstein field equations**, which he arrived at in November 1915 after years of false starts:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
G_{\mu\nu} + \Lambda g_{\mu\nu} = \frac{8\pi G}{c^4}\,T_{\mu\nu}
```

$$
G_{\mu\nu} + \Lambda g_{\mu\nu} = \frac{8\pi G}{c^4}\,T_{\mu\nu}
$$

Read it left to right as a sentence. The **Einstein tensor** $G_{\mu\nu}$ (a specific combination of the Ricci tensor and scalar) is pure geometry: it's how spacetime is curved. The **stress-energy tensor** $T_{\mu\nu}$ on the right is everything that has energy or momentum: mass, radiation, pressure, the lot. The constant $8\pi G/c^4$ is the exchange rate between the two, and it's a famously tiny number, which is why you need something as enormous as a planet to curve spacetime enough to notice. The $\Lambda$ term is the cosmological constant, a uniform curvature of empty space itself, the modern face of dark energy. John Wheeler's one-line gloss is the best summary anyone has managed: *spacetime tells matter how to move; matter tells spacetime how to curve*.

This is a genuinely closed loop, and it's what makes general relativity hard and beautiful at once. Matter curves spacetime through equation (4); the curved spacetime then dictates how that same matter moves through equation (2); the rearranged matter re-curves the spacetime. Everything is reciprocal. There's no external stage on which the drama plays out, because the stage is one of the actors.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Newton's gravity was instantaneous action at a distance: move the Sun and the Earth's orbit responds *now*, across 150 million kilometres with no delay. Einstein's gravity is strictly local. The field equations relate curvature at a point only to the matter-energy *at that point*. A change in the mass distribution doesn't teleport; it propagates outward as a ripple in the geometry, a gravitational wave, travelling at exactly the speed of light. If the Sun vanished, Earth would keep orbiting the empty spot for the eight minutes it takes the news to arrive. We've now confirmed this directly: the 2017 neutron-star merger GW170817 arrived with its gravitational waves and its gamma rays within seconds of each other after a 130-million-year journey, pinning the speed of gravity to that of light to better than one part in $10^{15}$.

## How we know: light bends, and Mercury wanders

A beautiful idea is still just an idea until it predicts something Newton's force cannot. General relativity made two predictions sharp enough to bet on, and both came in.

The first concerns light. If gravity is geometry, then light has no choice but to follow the curved spacetime, even though it's massless and nothing can "pull" on it. Starlight grazing the edge of the Sun should be deflected by the curvature there. Newton's theory, pressed into service by treating a photon as a fast corpuscle, predicts a deflection of about **0.87 arcseconds**. General relativity predicts exactly twice that, **1.75 arcseconds**, because in Einstein's theory both the time *and* the space parts of the metric bend the path, and Newton only had the one. The factor of two was the experiment.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

In May 1919, Arthur Eddington's expeditions photographed stars near the eclipsed Sun from Sobral in Brazil and Príncipe off West Africa. The Sobral plates gave $1.98 \pm 0.18$ arcseconds; Príncipe gave around 1.61. Both sat on Einstein's prediction and excluded Newton's. The result made the front pages and made Einstein famous overnight, and it remains one of the cleanest tests of the geometric picture: light, with no mass for a force to act on, bends anyway, because the geometry it travels through is bent.

The second test was already sitting in the data, unexplained for decades. Mercury's elliptical orbit doesn't close perfectly; its perihelion (the point of closest approach to the Sun) creeps forward a little each lap. Most of that precession is straightforward Newtonian tugging from the other planets, but after accounting for all of it, **43 arcseconds per century** stubbornly remained. Astronomers had even hypothesised an unseen planet, Vulcan, to supply the missing pull. There was no planet. There was extra curvature. Solve the geodesic equation in the spacetime around the Sun (the Schwarzschild geometry) and the orbit precesses by precisely 43 arcseconds per century, with no free parameters to tune. When Einstein worked that number out in 1915, he later said it gave him heart palpitations.

> [SchwarzschildCalculator component] Interactive calculator: a mass slider (log scale) computes the Schwarzschild radius r_s = 2GM/c^2, with presets (a person, the Earth, the Sun, Sagittarius A*, the observable universe). It highlights that the observable universe sits at roughly its own Schwarzschild radius. The rendered post has the live widget.

The calculator above makes the geometry tangible in a different way. Every mass has a **Schwarzschild radius**, $r_s = 2GM/c^2$, the size to which you'd have to crush it for the curvature to close off completely into a black hole. For the Sun it's about three kilometres; for the Earth, nine millimetres. These are tiny compared to the actual objects, which is exactly why spacetime around us is only gently curved and Newton's approximation works so well in daily life. The curvature is real everywhere mass exists. It's just usually faint.

## The misconceptions worth retiring

A few stubborn intuitions survive even after the maths lands, so let's name them directly.

Heavier objects do not fall faster, and not because of a lucky cancellation, but because mass is absent from the geodesic equation. What heavier objects *do* differently is curve spacetime *more* for everything else. Your body curves spacetime too, immeasurably faintly; the Earth simply does it far more. Curvature isn't reserved for black holes and stars. It's wherever there's energy, here in this room included, and the reason you stay on the floor is that the floor keeps shoving you off the geodesic you'd otherwise follow toward the Earth's centre.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

There is no gravitational force. Mass and energy curve spacetime according to Einstein's field equations. Free objects, including light, follow the straightest available paths through that curved geometry, which we observe as falling, orbiting, and bending. What you feel as weight is something solid pushing you off your natural path. Free fall feels like nothing because it *is* nothing, gravitationally: it's the absence of any push, the pure expression of geometry. Falling isn't being pulled. Falling is being left alone.

That last line is the one to keep. The apple doesn't fall because the Earth reaches up and grabs it. The apple was already moving as straight as it could through spacetime, and the only thing that ever interrupted that motion was the branch holding it still. Cut the stem and you don't *start* a force. You *stop* resisting the geometry. The fall is what freedom looks like in a curved world. Some food for thought, next time you watch something drop.

## Reading further

- [Carroll, *Spacetime and Geometry: An Introduction to General Relativity*](https://www.cambridge.org/9781108488396). The clearest modern textbook bridge from differential geometry to Einstein's equations; if you want to actually compute a Christoffel symbol, start here.
- [Misner, Thorne & Wheeler, *Gravitation*](https://press.princeton.edu/books/hardcover/9780691177793/gravitation). The canonical reference (known universally as "MTW") for curved spacetime, geodesics, and the geometric foundations of gravity, dense and rewarding.
- [Einstein, *The Field Equations of Gravitation* (1915)](https://en.wikisource.org/wiki/Translation:The_Field_Equations_of_Gravitation). The short original paper where equation (4) first appears; remarkable to read the geometry click into place in real time.
- [Dyson, Eddington & Davidson, *A determination of the deflection of light by the Sun's gravitational field* (1920)](https://royalsocietypublishing.org/rsta/article/373/2039/20140287/114810/Bending-space-time-a-commentary-on-Dyson-Eddington). The 1919 eclipse measurement that turned the geometric picture from elegant theory into confirmed fact.
