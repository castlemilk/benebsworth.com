---
title: A lone pair takes up more room than a hydrogen atom
date: '2026-11-10T01:00:00.000Z'
description: >-
  Relax repelling electron domains on a sphere, then give lone pairs a little
  extra push and recover the bond angles of water and ammonia with one number.
labels: 'chemistry,molecular-geometry,vsepr,bonding'
release: true
heroImage: /blog/a-lone-pair-takes-more-room-than-an-atom/hero.webp
takeaways:
  - >-
    Four equally repelling domains on a sphere have exactly one arrangement, so
    methane is tetrahedral at 109.47° by geometry alone.
  - >-
    Giving lone pairs a repulsion weight of 1.25 squeezes water to 104.40° and
    ammonia to 106.69°, each within 0.1° of experiment.
  - >-
    The weight is a fitted parameter, not a prediction; its payoff is that one
    value fits two molecules and gets the SF4 seesaw for free (square-planar
    XeF4 is a local minimum the seed selects, not the global one).
  - >-
    Point repulsion gets the SF4 equatorial angle wrong by 22°, which marks the
    edge of the model.
markdown_url: /blog/a-lone-pair-takes-more-room-than-an-atom/
canonical_url: 'https://benebsworth.com/blog/a-lone-pair-takes-more-room-than-an-atom/'
---
## Key takeaways

- Four equally repelling domains on a sphere have exactly one arrangement, so methane is tetrahedral at 109.47° by geometry alone.
- Giving lone pairs a repulsion weight of 1.25 squeezes water to 104.40° and ammonia to 106.69°, each within 0.1° of experiment.
- The weight is a fitted parameter, not a prediction; its payoff is that one value fits two molecules and gets the SF4 seesaw for free (square-planar XeF4 is a local minimum the seed selects, not the global one).
- Point repulsion gets the SF4 equatorial angle wrong by 22°, which marks the edge of the model.

Methane has four hydrogens around a carbon and every angle between them is 109.47°. Water has two hydrogens around an oxygen and the angle between them is 104.48°. Both central atoms carry four pairs of electrons. So why does water close up?

The usual answer is that oxygen's two lone pairs "take up more room" than its two bonds. I believed that for years without knowing what it meant. More room than what? Measured how? It sounds like a rule of thumb dressed as an explanation.

It turns out to be a sentence about a number. If you treat each electron pair as a point charge pinned to a sphere, let them repel, and then give the lone pairs a weight of about 1.25 instead of 1, the bond angle in water falls from 109.47° to 104.40°. The same weight gives ammonia 106.69° against a measured 106.67°. That is what "more room" means, and we can watch it happen.

## Four points on a sphere

The scene below places $N$ electron domains as unit vectors on a sphere and relaxes them under mutual repulsion. Cyan lines are bonds ending at ligand atoms; pink lobes are lone pairs. The bright amber arc marks the smallest angle between two bonds, and the faint arc marks the angle between lone pairs. Start with **Methane CH4**, then come back to the default water state and compare the two amber arcs. Then drag **Electron domains N** to 6 and see what two lone pairs do to an octahedron.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

The timeline is not time. It ramps the lone-pair weight from its full value at either end down to 1 at the midpoint, so halfway through the sweep you see the molecule water would be if its lone pairs repelled like bonds: a perfect tetrahedron. The readouts always report the fully weighted answer.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The three readouts are the whole model. The smallest bond angle is measured directly from the relaxed vectors. The shape name is a lookup on how many domains and lone pairs you asked for. The repulsion energy is the quantity being minimised, which is why the equal-weight cases land on the textbook Thomson values: 0.500, 1.732, 3.674, 6.475 and 9.985 for two to six domains.

## Where 109.47° comes from

Here is the part that convinced me the "points on a sphere" picture is more than a cartoon. Put four points on a sphere and ask them to spread out as far as possible. There is one answer, the regular tetrahedron, and it does not depend on the force law. Inverse-square, inverse-cube, or a hard shove: four repelling points always end up tetrahedral.

The angle falls out of symmetry. The four unit vectors must sum to zero, otherwise the arrangement would have a preferred direction. Dot that sum with any one of them:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\mathbf u_1\cdot(\mathbf u_1+\mathbf u_2+\mathbf u_3+\mathbf u_4)=1+3\cos\theta=0 \quad\Rightarrow\quad \theta=\arccos\!\left(-\tfrac13\right)=109.47^\circ
```

$$
\mathbf u_1\cdot(\mathbf u_1+\mathbf u_2+\mathbf u_3+\mathbf u_4)=1+3\cos\theta=0
\quad\Rightarrow\quad
\theta=\arccos\!\left(-\tfrac13\right)=109.47^\circ
$$

Methane's carbon has four bonding pairs and nothing else. Geometry alone fixes its shape, and the measured angle is 109.47° to the last digit the model can offer. The same logic gives 180° for two domains, 120° for three, and 90° for the six domains of sulfur hexafluoride. Five is the awkward one: the trigonal bipyramid has two kinds of position, and the smallest angle (axial to equatorial) is 90°.

Gillespie and Nyholm wrote this up in 1957 as the valence shell electron pair repulsion (VSEPR) model, and it has survived because the geometry is doing most of the work. The chemistry only enters when the domains stop being equal.

## Give the lone pair more weight

Now water. Oxygen also has four pairs: two bonds to hydrogen and two lone pairs. If all four repelled equally we would get 109.47° again, and we don't. The VSEPR move is to say a lone pair repels more strongly than a bonding pair, and the model's version of that is a weight.

Each domain is a unit vector $\mathbf u_i$ with weight $w_i$. Bonds carry $w=1$, lone pairs carry $w$. The energy is a weighted Thomson sum:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
E=\sum_{i<j}\frac{w_i\,w_j}{\lvert\mathbf u_i-\mathbf u_j\rvert}
```

$$
E=\sum_{i<j}\frac{w_i\,w_j}{\lvert\mathbf u_i-\mathbf u_j\rvert}
$$

The scene minimises this with 200 steps of gradient descent, projecting back onto the sphere after every step. There is nothing clever in it, which is rather the point: the shapes come out of a sum and a slope.

For water there is also a closed form, and it is worth having because it checks the descent. The two bonds sit at half-angle $a$ either side of the symmetry axis, the two lone pairs at half-angle $b$ on the other side, so the full bond angle is $2a$ and the lone-pair angle is $2b$. Three kinds of pair contribute:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
E(a,b)=\frac{1}{2\sin a}+\frac{w^2}{2\sin b}+\frac{4w}{\sqrt{2+2\cos a\cos b}}
```

$$
E(a,b)=\frac{1}{2\sin a}+\frac{w^2}{2\sin b}+\frac{4w}{\sqrt{2+2\cos a\cos b}}
$$

Minimise over $a$ and $b$ and the bond angle comes out as a function of $w$ alone. At $w=1$ you recover 109.47°, as you must. At $w=1.2$ the angle is 105.31°. At $w=1.25$ it is 104.40°. At $w=1.3$ it is 103.53°. The measured 104.48° wants $w\approx1.245$. The 200-step descent in the lab agrees with the closed form to better than 0.01°, which is the test I trust most.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Look at the second number in that middle box. While the bonds close from 109.47° to 104.40°, the two lone pairs open from 109.47° to 114.71°. The lone pair to bond angle barely moves, 109.31°. That redistribution is the literal content of "takes up more room": the heavier domains claim a bigger patch of the sphere and the lighter ones give it up.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

"Takes up more room" is a sentence about the angle between two lone pairs: 114.71°, against 104.40° between the two bonds.

## One number, two molecules

Here I want to be careful, because this is where the model is often oversold. The weight 1.25 was chosen to make water come out right. Saying the model then "predicts" 104.4° for water is circular. A fit to one number is not a prediction of that number.

The honest test is whether the same weight does anything else. Ammonia has three bonds and one lone pair. Select **Ammonia NH3**: with $w=1.25$ the H-N-H angle is 106.69°, and the measured value is 106.67°. Nobody refitted anything. The lone pair to bond angle is 112.13°, again wider than the bonds. One parameter, two molecules, both within 0.1°. That is a modest but real payoff, and I think it is the right thing to claim.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Predict before you drag. From the water default, push **Lone-pair repulsion weight** to 1.5. Will the bond angle fall below 100°? (It lands at 100.41°.) Then set the weight back to 1 and watch the lone pairs become ordinary domains: the angle returns to 109.47° and the energy to 3.674. Finally drag **Lone pairs** to 3 with $N=4$ and read the shape readout. The slider is clamped to two, because two bonds must remain to have an angle between.

Ammonia's number sits in a sweet spot. At $w=1.2$ it would read 107.23°; at $w=1.3$, 106.16°. The water fit and the ammonia fit both prefer something close to 1.25, which is the kind of coincidence that makes you suspect a real effect underneath.

## Five and six domains, mostly for free

Push **Electron domains N** to 6 from the water state. The two lone pairs, which were 114.71° apart, snap to opposite poles, and the four bonds flatten into a square. That is xenon tetrafluoride, square planar, with every bond angle 90.00°. Trans lone pairs in an octahedron are a stationary point for any weight, so the energy has a closed form, and the descent reproduces it:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
E=\frac{4}{\sqrt2}+1+\frac{w^2}{2}+\frac{8w}{\sqrt2}=11.681\ \text{at}\ w=1.25
```

$$
E=\frac{4}{\sqrt2}+1+\frac{w^2}{2}+\frac{8w}{\sqrt2}=11.681\ \text{at}\ w=1.25
$$

The four cis bond pairs sit $\sqrt2$ apart, the two trans pairs 2 apart, the lone pairs 2 apart with weight $w^2$, and the eight lone pair to bond pairs $\sqrt2$ apart with weight $w$. Nothing to fit, but also nothing predicted: in this model the cis arrangement is actually lower (11.679 against 11.681 at w 1.25), and the lab lands on the square only because its seed starts the two lone pairs at opposite poles, where trans is a stable local minimum. Real XeF4 is square planar; point charges alone do not know that.

Now select **Sulfur tetrafluoride SF4**. Five domains, one lone pair. The lone pair takes an equatorial seat (the model's energy there is 7.110 against 7.123 for an axial seat, so the seesaw wins on its own), and the two axial fluorines lean away from it to 87.33°. Experiment gives roughly 87.8°. Chlorine trifluoride, with two equatorial lone pairs, comes out T-shaped at 85.46° against a measured 87.5°. Xenon difluoride, with three, is linear at 180.00°. All the shapes are right.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Here is the boundary. The SF4 model gets the equatorial F-S-F angle badly wrong: 123.6° in the lab, 101.6° in the molecule. Point repulsion on a sphere pushes the two equatorial bonds apart, while the real molecule pulls them together. Gillespie's own fifty-year review discusses why AX4E needs more than point charges. The seesaw shape and the axial lean survive; the equatorial number does not. The same model also knows nothing about electronegativity, multiple bonds or d orbitals, and the pink lobes have no physical size. They are a weight drawn as a width.

One more thing the lab can show you about the five-domain case: it is a shallow landscape. The residual gradient after 200 steps is around $10^{-8}$ for SF4 against machine precision for water, and the test suite checks it stays below $10^{-4}$ at every reachable combination of the sliders. With a smaller step the seesaw would still be settling when the frame was drawn.

## What the weight is standing in for

So what is a lone pair, physically, that it should push harder? It is not that the electrons are unheld. A lone pair is bound to the central nucleus like any other pair. The difference is that a bonding pair also has a second nucleus pulling it outward, along the bond, which stretches that domain into a thinner, longer shape. A lone pair has no second nucleus, so it sits closer to the central atom and spreads wider across the sphere. Wider domain, bigger patch, larger effective repulsion. The weight 1.25 is that geometry collapsed into one number.

I find it useful to notice how little the weight has to do. It is a 25% change in one coupling and it produces a 5° change in one angle. The sphere is doing most of the work; the chemistry is a nudge. That ratio feels right for a model that is a hundred years downstream of J. J. Thomson asking where $N$ electrons would sit on a sphere, long before anyone knew what a lone pair was.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Some food for thought. The Thomson problem is only solved rigorously for a handful of $N$ (two to six among them, plus twelve). For a hundred charges nobody can prove the best-known arrangement is optimal. Chemistry gets away with it because real molecules rarely need more than six domains, which is precisely the range where the geometry is settled. Had the valence shell held eight, the textbook would have needed a footnote.

The model's limits are also instructive. Hydrogen sulfide has the same shape as water but an angle of 92.1°. The closed form can reach that, but only at $w\approx2.26$, far outside the slider, and that weight gives phosphine 97.6° against its measured 93.5°: the one-number trick that works for the first row fails for the second. The heavier hydrides all drift in ways the sphere cannot follow. The point-charge picture is a first-order account of where electron pairs sit, and the next order needs orbital hybridisation (Bent's rule) and the actual sizes of the atoms. Those are posts for another day.

If you want to practise, [the standalone electron-domain lab](/lab/vsepr/) is the place. Freeze the timeline, set a weight, and predict the bond angle before reading it. Then try to guess the lone-pair angle too. Once the second guess starts landing, you have stopped reciting the rule and started seeing the sphere.

## Reading further

- [OpenStax Chemistry 2e, section 7.6: Molecular structure and polarity](https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity): the standard VSEPR tables and the lone-pair ordering of repulsions, with worked examples.
- [Gillespie, R. J. (2008) "Fifty years of the VSEPR model", Coordination Chemistry Reviews 252, 1315](https://doi.org/10.1016/j.ccr.2007.07.007): the model's originator on what it gets right, where it fails, and what the domains physically are.
- [Erber, T. and Hockney, G. M. (1991) "Equilibrium configurations of N equal charges on a sphere", J. Phys. A 24, L1369](https://doi.org/10.1088/0305-4470/24/23/008): the Thomson-problem energies the equal-weight presets reproduce.
- [NIST Computational Chemistry Comparison and Benchmark Database](https://cccbdb.nist.gov/): the experimental geometries quoted here, including the 104.48° water angle from Hoy and Bunker.
