---
title: Two different crystals hide in one stack of oranges
date: '2026-11-10T02:00:00.000Z'
description: >-
  Stack hexagonal layers of spheres two ways and you get copper or magnesium.
  Find the cube hiding in one stack, the 74% bound, and the holes between.
labels: 'chemistry,crystallography,solid-state,packing'
release: true
heroImage: /blog/two-crystals-hide-in-one-stack-of-oranges/hero.webp
takeaways:
  - >-
    Equal spheres fill at most 74.05% of space, a bound Kepler guessed in 1611
    and Hales proved in 1998.
  - >-
    The same hexagonal layers give two different crystals, hcp or fcc, depending
    only on where the third layer lands.
  - >-
    A cube with edge √2·d stands on its corner inside the ABC stack, and
    copper's 3.615 Å lattice constant follows from its 2.556 Å atomic spacing.
  - >-
    The gaps between layers hold octahedral and tetrahedral holes of 0.414 and
    0.225 host radii, which is where ionic chemistry puts its small ions.
markdown_url: /blog/two-crystals-hide-in-one-stack-of-oranges/
canonical_url: 'https://benebsworth.com/blog/two-crystals-hide-in-one-stack-of-oranges/'
---
## Key takeaways

- Equal spheres fill at most 74.05% of space, a bound Kepler guessed in 1611 and Hales proved in 1998.
- The same hexagonal layers give two different crystals, hcp or fcc, depending only on where the third layer lands.
- A cube with edge √2·d stands on its corner inside the ABC stack, and copper's 3.615 Å lattice constant follows from its 2.556 Å atomic spacing.
- The gaps between layers hold octahedral and tetrahedral holes of 0.414 and 0.225 host radii, which is where ionic chemistry puts its small ions.

A greengrocer stacking oranges solves a problem that took mathematicians 387 years to close. Lay a hexagonal sheet of oranges, drop the next sheet into the dimples, repeat, and you have filled 74.05% of the space. Nothing you can do with equal spheres beats it. Kepler said so in 1611; Thomas Hales finally proved it in 1998.

The part I find stranger is this. The greengrocer makes a choice at the third layer, probably without noticing. There are two sets of dimples to drop it into. One choice gives the crystal structure of magnesium, zinc and titanium. The other gives copper, aluminium, gold and silver. Same layers, same density, same 12 neighbours per sphere, and yet two different crystals with different symmetry. And a perfect cube is hiding inside one of the two stacks of hexagonal layers, standing on its corner.

Let's build both stacks and find the cube.

## Start with three layers

The model below draws each layer as a hexagonal patch of 37 touching spheres. Pink spheres are at the A positions. Cyan is the same sheet shifted into one set of hollows (B), violet is the sheet shifted into the other set (C). Amber sticks join the white central sphere to every sphere it touches, and the amber outline is the unit cell drawn through sphere centres.

Choose **Magnesium hcp** first and scrub the timeline. The layers pull apart to 1.9 times their spacing so you can look between them, and you can see that the third layer sits directly over the first. Then choose **Copper fcc** and let it close up again. Four layers, and a cube appears.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

The spheres are drawn smaller than their contact radius so you can see through the stack; the **Drawn radius** slider controls that and nothing else. The readouts belong to full-size touching spheres. The [standalone close packing lab](/lab/close-packing/) has the same controls in a bigger window.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Predict before you drag. Push **Layers stacked** from 1 to 5 and write down what the contacts readout will say at each step (it goes 6, 9, then 12 and stays there). Then predict whether flipping **Stacking** changes either the contact count or the slab fraction. It does not, and that is the whole point.

## One layer, two kinds of hollow

A single hexagonal layer is the densest way to pack circles in a plane, and each sphere touches six neighbours. Between them sit triangular hollows, and there are twice as many hollows as spheres: half of them point up, half point down. Call the sphere positions A, the up-pointing hollows B, and the down-pointing hollows C.

When you drop the second layer, every sphere wants to sit in a hollow. It cannot sit in both kinds, because adjacent B and C hollows are too close together for two spheres. So the whole second layer settles into the B set (or the C set, which is the same choice by symmetry). The second layer is also a hexagonal sheet, just shifted sideways by $d/\sqrt3$, where $d$ is the sphere diameter.

How far does it drop? Three touching spheres in the lower layer have centres on an equilateral triangle of side $d$, and the centroid is $d/\sqrt3$ from each. The sphere above touches all three, so its centre is a distance $d$ from each of theirs:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
h=\sqrt{d^2-\frac{d^2}{3}}=d\sqrt{\tfrac23}\approx0.8165\,d,\qquad \frac{c}{a}=\frac{2h}{d}=2\sqrt{\tfrac23}\approx1.633
```

$$
h=\sqrt{d^2-\frac{d^2}{3}}=d\sqrt{\tfrac23}\approx0.8165\,d,\qquad
\frac{c}{a}=\frac{2h}{d}=2\sqrt{\tfrac23}\approx1.633
$$

That 1.633 is the ideal axial ratio of a hexagonal close-packed (hcp) metal, where $a$ is the in-plane spacing and $c$ is the height of two layers. Real metals are close but never exact: magnesium 1.624, titanium 1.588, zinc 1.856 at room temperature. Zinc is noticeably stretched, which tells you its atoms are not quite hard spheres, and we will come back to that.

## The third layer has to choose

Now the second layer, sitting at B, has its own two kinds of hollow. Look down through it. One set of its hollows is directly above the A spheres below. The other set is directly above the C hollows of the first layer, the ones nobody has used yet.

Drop the third layer over A and you get the sequence ABAB... Every other layer repeats. That is hcp. Drop it into the unused C hollows and you get ABCABC..., with a repeat every three layers. That is cubic close packing, which crystallographers call face-centred cubic (fcc).

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Both stacks are made of identical layers, both fill 74.05% of space, and every sphere in both touches exactly 12 others. The difference is purely which hollow the third layer picked.

The model makes this visible. On the bottom layer, the hollows that layer B will fill are shaded cyan. The C hollows are shaded violet in fcc mode, because layer 3 will land there, and grey in hcp mode, because nothing ever lands there. In hcp those grey columns run straight through the whole crystal as open channels. In fcc every hollow gets filled eventually.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Some food for thought: nothing forces a stack to repeat after two or three layers. Any sequence of A, B and C with no letter twice in a row is a valid close packing at the same 74.05%. Lanthanum, praseodymium and neodymium crystallise as ABAC, a double-hcp. Silicon carbide has hundreds of catalogued stacking sequences, called polytypes, some with repeats over dozens of layers. William Barlow described both simple stackings in Nature in 1883, well before X-ray diffraction could confirm that real metals used them.

## Finding the cube

I had read "cubic close packing" for years without seeing where the cube was. The hexagonal layers do not look cubic. The trick is that the cube is standing on its corner, with its body diagonal pointing straight up through the layers.

Choose **Copper fcc** in the model and pause with the layers touching. The bottom corner of the amber cube is the central pink sphere of layer 0. The three corners next to it are cyan spheres in layer 1, the second ring out from the axis. The three corners after that are violet spheres in layer 2, and the top corner is a pink sphere in layer 3, directly above the bottom one. The six face centres are the first-ring spheres of layers 1 and 2. All 14 cell sites land on drawn sphere centres; the unit test checks this to a millionth of a unit.

Why does a cube appear at all? In the fcc conventional cell, atoms sit at the 8 corners and the 6 face centres. The nearest neighbours are a corner and an adjacent face centre, separated by half a face diagonal. So the lattice constant follows from the touching distance:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
d=\frac{a}{\sqrt2}\;\Rightarrow\;a=\sqrt2\,d,\qquad \sqrt3\,a=\sqrt6\,d=3h
```

$$
d=\frac{a}{\sqrt2}\;\Rightarrow\;a=\sqrt2\,d,\qquad
\sqrt3\,a=\sqrt6\,d=3h
$$

That last equality is the tell. The body diagonal $\sqrt3 a$ equals $\sqrt6 d$, and three layer spacings are $3\times0.8165 d=2.449 d=\sqrt6 d$. The cube's diagonal is exactly four layers tall, which is why it takes the **Copper fcc** preset of 4 layers to draw it. The planes perpendicular to that diagonal are the (111) planes, and they are the hexagonal layers we started with.

Copper's nearest-neighbour distance is 2.556 Å, which gives $a=\sqrt2\times2.556=3.615$ Å, matching the measured lattice constant of 3.6149 Å at room temperature. Each copper atom has a radius of 127.8 pm, half the touching distance. The hard-sphere picture is doing surprisingly well for a metal.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## Why 74%, and why it took 387 years

The number itself is easy. The proof that nothing beats it is not.

Take one sphere of radius $r$ in one layer. In the plane it owns a hexagonal cell of area $2\sqrt3\,r^2$. A slab of $n$ layers, measured from the bottom of the lowest spheres to the top of the highest, is $2r+(n-1)h$ tall. Each column of that slab holds $n$ spheres. Divide sphere volume by slab volume:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\phi_n=\frac{n\cdot\frac43\pi r^3}{2\sqrt3\,r^2\left[2r+(n-1)\,2r\sqrt{2/3}\right]}=\frac{n\pi}{3\sqrt3\left(1+(n-1)\sqrt{2/3}\right)}\;\longrightarrow\;\frac{\pi}{3\sqrt2}\approx0.7405
```

$$
\phi_n=\frac{n\cdot\frac43\pi r^3}{2\sqrt3\,r^2\left[2r+(n-1)\,2r\sqrt{2/3}\right]}
=\frac{n\pi}{3\sqrt3\left(1+(n-1)\sqrt{2/3}\right)}
\;\longrightarrow\;\frac{\pi}{3\sqrt2}\approx0.7405
$$

The model's first readout reports this $\phi_n$ for the number of layers you have stacked: 60.46% for one layer, 66.57% for two, 68.89% for three, 70.11% for four, 70.86% for five, climbing toward 74.05%. A finite slab is always below the limit because the top and bottom half-spheres waste space. And notice that nothing in the formula cares about stacking order. Every layer adds the same $n$ spheres and the same height $h$ whether it went to B or to C.

For comparison, body-centred cubic (bcc), the structure of iron at room temperature, reaches $\pi\sqrt3/8=68.02\%$. Simple cubic manages $\pi/6=52.36\%$. Pour ball bearings into a jar and shake and you get about 64%, the random close packing limit. Order buys you 10 points over disorder.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Kepler conjectured the bound in 1611, in a small pamphlet on snowflakes (Strena seu de Nive Sexangula). Gauss proved it in 1831 for lattice packings, where every sphere sits on a regular grid. The hard case is non-lattice arrangements, and it stayed open until Hales announced a proof in August 1998. The proof ran to hundreds of pages plus gigabytes of computer checking; the Annals of Mathematics published it in 2005. Hales then led Flyspeck, a formal verification in the HOL Light and Isabelle proof assistants, completed in 2014 and published in 2017.

## The holes are where chemistry happens

A 74% packing leaves 26% empty, and that empty space has structure. Between two layers there are two kinds of cavity, and the model draws the largest sphere that fits each one as a small amber ball between layers 0 and 1.

The octahedral hole sits over a C hollow of the bottom layer, halfway up to the next layer. Three spheres below and three above surround it, at the corners of a regular octahedron with edge $2R$. The distance from an octahedron's centre to a vertex is its edge divided by $\sqrt2$. A sphere of radius $r$ fits if $r+R$ equals that distance. The tetrahedral hole is the gap under a single upper sphere, where it rests on three lower ones. Four spheres at the corners of a regular tetrahedron, centre-to-vertex distance $\sqrt{3/8}$ times the edge:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{r_{\rm oct}}{R}=\sqrt2-1\approx0.414,\qquad \frac{r_{\rm tet}}{R}=\sqrt{\tfrac32}-1\approx0.225
```

$$
\frac{r_{\rm oct}}{R}=\sqrt2-1\approx0.414,\qquad
\frac{r_{\rm tet}}{R}=\sqrt{\tfrac32}-1\approx0.225
$$

There is one octahedral hole and two tetrahedral holes per sphere; the model draws just one of each so you can see them. The tetrahedral hole shown is the apex-up one, a quarter of the way up under a layer-1 sphere; its twin is apex-down, three quarters of the way up above a layer-0 sphere.

This is where the hard-sphere picture earns its keep in chemistry. Rock salt is a close packing of chloride ions with sodium in every octahedral hole. The radius ratio is 102 pm over 181 pm, or 0.564, comfortably above 0.414 and below the 0.732 at which a cubic hole would be preferred. Carbon in steel sits in the octahedral holes of iron, far too large for them (a 77 pm atom in a 53 pm hole in fcc iron, and a much smaller one in bcc), and the strain is a large part of why steel is harder than iron. The radius-ratio rules are only a guide, and they fail often enough to keep crystallographers employed, but they fall straight out of the geometry in the model.

## Why copper bends and magnesium cracks

If both structures pack the same and have the same 12 contacts, why do engineers care which one a metal picked?

A metal deforms by letting planes of atoms slide over each other, and sliding is easiest along close-packed planes in close-packed directions. In fcc there are four distinct families of close-packed (111) planes, because the cube has four body diagonals, and each plane has three close-packed directions. That makes 12 slip systems. However you load a copper crystal, some slip system is well aligned with the shear, so copper, aluminium, gold and silver bend, draw into wire and roll into foil.

In hcp there is only one family of close-packed planes, the basal planes you have been stacking, with three directions in them. Three slip systems. Load a magnesium or zinc crystal perpendicular to those planes and nothing wants to slide; it cracks instead. This is why magnesium parts are usually cast or extruded hot, and why zinc sheet is brittle when cold.

I should hedge that. The three-system argument holds for metals near or above the ideal 1.633 ratio, where basal slip dominates: magnesium, zinc, cadmium. Titanium and zirconium, with $c/a$ below 1.633, slip on prism faces as well and are usefully ductile at room temperature. The stacking still matters, but it is not the only thing that matters. Callister's Table 7.1 lists the slip systems if you want the full inventory.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The model is a hard-sphere idealisation. Spheres are drawn below contact size so you can see inside, and the packing fraction in the readout is for an infinite slab of full-size spheres, not for the 37-sphere patch on screen. While the timeline pulls the layers apart, the cube is a stretched rhombohedron and the hole markers are no longer touching anything. Real metal atoms are soft and bonded, which is why zinc's axial ratio is 1.856 and why the radius-ratio rules have exceptions.

So two crystals hide in one stack of oranges, and the choice between them is made at the third layer and then inherited forever. The next question I want to chase is what happens at a boundary where the stacking slips from ABC to ABA for a single layer, a stacking fault, because that is the defect that makes work-hardening possible. Watch this space.

## Reading further

- [Hales, "A proof of the Kepler conjecture", Annals of Mathematics 162 (2005)](https://doi.org/10.4007/annals.2005.162.1065): the published proof that π/(3√2) is the densest packing of equal spheres.
- [Hales et al., "A formal proof of the Kepler conjecture", Forum of Mathematics, Pi 5 (2017)](https://doi.org/10.1017/fmp.2017.1): the Flyspeck project write-up, with the history of the refereeing and the formalisation.
- [OpenStax Chemistry 2e, section 10.6, Lattice structures in crystalline solids](https://openstax.org/books/chemistry-2e/pages/10-6-lattice-structures-in-crystalline-solids): fcc, hcp, the holes, and worked radius-ratio examples at introductory level.
- [Barlow, "Probable nature of the internal symmetry of crystals", Nature 29 (1883)](https://doi.org/10.1038/029186a0): the first description of the two close packings as candidate crystal structures.
