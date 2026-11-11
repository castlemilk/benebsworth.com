---
title: Every virus shell built from hexagons has exactly twelve pentagons
date: '2026-11-10T03:00:00.000Z'
description: >-
  Tile one protein across an icosahedron with two integers and see why Euler's
  formula forces twelve pentamers into every closed shell, from 60 subunits to
  1500.
labels: 'biology,structural-virology,geometry,caspar-klug'
release: true
heroImage: /blog/every-virus-shell-has-twelve-pentagons/hero.webp
takeaways:
  - >-
    A closed shell of hexagons and pentagons with three edges meeting at each
    corner has exactly twelve pentagons, whatever the number of hexagons.
  - >-
    Two lattice integers fix a Caspar-Klug capsid through T = h² + hk + k²,
    giving 60T protein positions and 10T + 2 capsomers.
  - >-
    T can be 1, 3, 4, 7, 9, 12, 13 or 16 but never 2, 5, 6 or 8, and T = 7 comes
    in two mirror-image hands.
  - >-
    Real viruses bend the lattice rule: adenovirus hexons are trimers,
    herpesvirus swaps a penton for a portal and polyomavirus uses only
    pentamers.
markdown_url: /blog/every-virus-shell-has-twelve-pentagons/
canonical_url: 'https://benebsworth.com/blog/every-virus-shell-has-twelve-pentagons/'
---
## Key takeaways

- A closed shell of hexagons and pentagons with three edges meeting at each corner has exactly twelve pentagons, whatever the number of hexagons.
- Two lattice integers fix a Caspar-Klug capsid through T = h² + hk + k², giving 60T protein positions and 10T + 2 capsomers.
- T can be 1, 3, 4, 7, 9, 12, 13 or 16 but never 2, 5, 6 or 8, and T = 7 comes in two mirror-image hands.
- Real viruses bend the lattice rule: adenovirus hexons are trimers, herpesvirus swaps a penton for a portal and polyomavirus uses only pentamers.

A virus has a packaging problem. Its genome has to fit inside a protein shell, but the genome also has to pay for that shell, and a gene for one huge shell protein would be longer than the genome it was meant to protect. Crick and Watson pointed this out in 1956: the only affordable option is to make one small protein and use many identical copies of it.

Identical copies in identical surroundings means symmetry, and the most copies you can place in equivalent positions on a closed surface is 60, the rotation group of the icosahedron. Bigger shells cheat a little. They tile the same protein 60T times, with the copies sitting in slightly different, quasi-equivalent neighbourhoods, and the proteins cluster into hexamers and pentamers.

Here is the claim worth testing as you read. However many hexamers a shell has, from zero to a few hundred, it has exactly twelve pentamers. Not about twelve. Twelve.

## Drag the integers first

Below is a Caspar-Klug shell. Amber spheres are pentamers at the five-fold vertices of an icosahedron, cyan spheres are hexamers, and the lime honeycomb outlines every capsomer's cell. The violet path is the walk between two neighbouring pentamers. Start with the default $(h, k) = (2, 1)$ and push **Lattice step h** up to 5: the shell fills with hexamers, the readouts jump from 72 capsomers to 312, and the amber count stays put.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

The timeline pulls the shell apart along radial lines and lets it reassemble. I like scrubbing through the second half, where the honeycomb tears into separate cells as capsomers land out of step with their neighbours, and watching the twelve pentagons settle back onto their corners among them. Nothing in the animation is kinetic; it is a staging that makes the lattice easy to see. The [standalone Caspar-Klug lab](/lab/virus-capsid/) has the same model with room to orbit.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Capsomer is the morphological word: the lump you see in an electron micrograph, which is a pentamer at a five-fold vertex and a hexamer elsewhere. The protein count is a different number. A T = 7 shell has 72 capsomers but 420 protein positions, because 12 × 5 + 60 × 6 = 420.

## Why twelve, and why Euler gets the credit

The twelve has nothing to do with viruses. It belongs to any closed surface built from pentagons and hexagons where three edges meet at every corner, which is what a honeycomb on a sphere looks like. Footballs, fullerene cages and geodesic domes all obey it. The proof takes four lines and starts with Euler's formula for a polyhedron with $V$ corners, $E$ edges and $F$ faces:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
V - E + F = 2
```

$$
V - E + F = 2
$$

Let the shell have $P$ pentagons and $H$ hexagons. Each edge borders two faces, so $2E = 5P + 6H$. Each corner is shared by three edges, so $3V = 2E$. The face count is $F = P + H$. Substitute all three into Euler's formula and the hexagons vanish:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{5P + 6H}{3} - \frac{5P + 6H}{2} + P + H = 2 \;\Rightarrow\; P = 12
```

$$
\frac{5P + 6H}{3} - \frac{5P + 6H}{2} + P + H = 2 \;\Rightarrow\; P = 12
$$

Let's work it through: the left side collapses to $P/6 = 2$. Hexagons contribute zero curvature, so you can add as many as you like, but the sphere needs a total angular deficit of $4\pi$, and each pentagon in a hexagonal sheet supplies exactly $2\pi/6$ of it. Twelve of them close the surface.

The lab draws the dual picture, which is the one Caspar and Klug used in 1962. Instead of faces, look at lattice sites: the capsomer centres, each joined to its neighbours. A hexamer has six neighbours and a pentamer has five, and the same Euler argument says the degree deficits must sum to 12. That is why the readout reports "12 + 60" for T = 7 and "12 + 480" for T = 49, and why the unit tests behind the lab count exactly twelve five-fold sites for every lattice the sliders can reach.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Euler's formula needs a closed surface without holes and a corner rule. Herpes simplex virus has a portal at one vertex where the DNA goes in, so a strict count of its pentons gives eleven, not twelve. The lattice still has twelve five-fold positions; one of them is occupied by something other than a pentamer. The theorem is about geometry, and biology is allowed to put a different protein at a five-fold site.

## Two integers fix the whole shell

So twelve pentamers are forced. What decides how many hexamers we get between them? Caspar and Klug's answer is a hexagonal sheet of paper. Draw a triangular lattice, pick a lattice point as one pentamer, and walk $h$ steps along a row, turn 60° to the left, and walk $k$ more steps. Wherever you land is the next pentamer. The equilateral triangle on that step vector becomes one face of the icosahedron, and its area in lattice triangles is the triangulation number:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
T = h^2 + hk + k^2
```

$$
T = h^2 + hk + k^2
$$

Because the icosahedron has 20 faces, the shell has $20T$ lattice triangles and $60T$ protein positions (three per triangle). The numbers this quadratic form can produce are the Löschian numbers: 1, 3, 4, 7, 9, 12, 13, 16, 19, 21, 25, 27, 28, 31, and so on. It skips 2, 5, 6 and 8. There is no T = 5 virus, and no T = 2 virus, because no pair of integers gets you there. That felt like numerology to me the first time I met it, but the lab makes it tangible: there is simply no slider position between (2, 0) at T = 4 and (2, 1) at T = 7.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

A T = 7 shell can be built two ways that are mirror images, and both exist in nature.

The walk also carries a hand. If $h > k > 0$ the turn comes late and the lattice skews one way; swap them and it skews the other. By the convention of Caspar and Klug (and of Baker, Olson and Fuller's review, where the walk is defined from outside the particle), $h > k$ is laevo and $k > h$ is dextro. The tailed phages HK97, lambda, P22 and T7 are all 7-laevo. SV40, polyomavirus and papillomavirus are 7-dextro. Drag the sliders from (2, 1) to (1, 2) and watch the violet walk flip while the capsomer count stays at 72. When $k = 0$, or $h = k$, the walk runs along a mirror line and the shell is achiral, which is why herpes simplex at (4, 0) has no hand to report.

## Counting capsomers with Pick's theorem

The lab's third readout, $10T + 2$, is also a four-line proof, and one I had never seen written out before building this model, so let's do it here. Each icosahedron face is a lattice triangle of area $T$ unit triangles, which is $T/2$ fundamental parallelograms. Pick's theorem for a lattice polygon says area equals interior points plus half the boundary points minus one. The boundary points are the three corners plus $g - 1$ points along each edge, where $g = \gcd(h, k)$, so $B = 3g$:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
I = \frac{T}{2} - \frac{3g}{2} + 1, \qquad 12 + 30(g - 1) + 20\,I = 10T + 2
```

$$
I = \frac{T}{2} - \frac{3g}{2} + 1, \qquad 12 + 30(g - 1) + 20\,I = 10T + 2
$$

The 12 corners are shared by five faces each, the 30 edges by two, and the interior points belong to one face. Expand the sum and $g$ cancels. For the default (2, 1), $T = 7$ and $g = 1$, so each face holds $I = 7/2 - 3/2 + 1 = 3$ interior hexamers, and the shell has $12 + 20 \times 3 = 72$ capsomers. For adenovirus at (5, 0), $g = 5$, so each edge carries four hexons and each face holds six more: $12 + 120 + 120 = 252$, which is the count Horne, Brenner, Waterson and Wildy made from micrographs in 1959, before anyone had the theory to explain it.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

The unit tests behind the lab check this identity for every (h, k) the sliders can reach, and they also check Euler directly on the generated mesh: at (5, 3), the shell has 492 capsomers, 1470 lattice edges and 980 triangles, and $492 - 1470 + 980 = 2$. I find that reassuring in a way the algebra alone is not. The mesh is folded across twenty faces with chiral lattices that must meet along every edge, and the count is where any seam error would show.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Predict before you drag.

1. From the default, set **Lattice step k** to 0. Does T go up or down? (It drops to 4, and the shell loses 30 capsomers.)
2. Set **k** to 3 with **h** at 5. How many amber spheres will there be at T = 49? Count them after the shell reassembles.
3. Choose **T = 16 herpes simplex**. The readout gives 960 protein positions; the real virion has 955 copies of VP5. Where did five go?
4. Drag **Sphericity** to 0 on the adenovirus preset. Which capsomers move the most, and why do the vertices not move at all?

## Where real viruses break the lattice

Caspar and Klug offered quasi-equivalence as a design principle, and the exceptions are where structural virology has spent much of the last sixty years. Three are worth knowing because the lab's presets name them.

Adenovirus is pseudo-T = 25. The lattice says 252 capsomers and 1500 protein positions, and the 252 is right: 240 hexons and 12 pentons. But each hexon is a trimer of one protein, with three copies folding into a shape that fills a six-fold site, so the real count is 720 hexon polypeptides plus 60 in the penton bases. The lattice geometry holds while the stoichiometry does not, hence the "pseudo".

Herpes simplex virus type 1 is a true T = 16 built from 150 hexons and 12 pentons of the protein VP5, giving 162 capsomers, except that one penton is replaced by the UL6 portal dodecamer through which the genome is packaged. The virion carries 955 copies of VP5 rather than the nominal 960. Rotavirus and the other reoviruses push the lattice further: their T = 13 laevo layer of 132 sites is built from 260 trimers (780 copies of VP6), and what you see at the 132 sites are aqueous channels rather than lumps.

Polyomavirus is the one that bothered people most. Its lattice is 7-dextro, 72 sites, but Rayment, Baker, Caspar and Murakami showed in 1982, at 22.5 Å, that all 72 are pentamers of VP1, 360 copies in total, with no hexamers anywhere; Liddington and colleagues' 1991 SV40 structure confirmed it at atomic resolution. Five-fold units sitting on six-fold sites breaks quasi-equivalence outright. Twarock and Luque's 2019 extension of the theory, which tiles with more than one kind of unit, recovers these cases, and it is a good reminder that the hexagon-and-pentagon rule is a statement about a lattice, with the protein chemistry free to decorate it.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Some food for thought. Buckminsterfullerene, C60, is a T = 3 shell in the dual picture: 60 carbon atoms at the honeycomb corners, 12 pentagons and 20 hexagons, 32 cells in all, which is 10T + 2 with T = 3. The same arithmetic counts the panels on a 1970 football, and the twelve black pentagons are Euler's twelve. Nobody chose that number. A hexagonal sheet cannot close any other way.

## What the model is, and is not

The lab draws points on an exact Caspar-Klug lattice folded onto an icosahedron whose circumradius is fixed at 2 world units, so a bigger T packs more capsomers into the same shell instead of growing the particle. Real T = 1 satellite viruses are about 17 nm across and herpesvirus capsids about 125 nm. Capsomers are drawn as spheres and the honeycomb is a geometric dual; no protein shape is modelled. The sphericity slider interpolates between the flat faceted icosahedron and a round shell, a cosmetic parameter that stands in for the range of real particles from the sharply faceted adenovirus to nearly spherical phages. The hand label follows the stated walking convention, and swapping that convention swaps every label at once, which is exactly the kind of thing a unit test should pin down.

I built this expecting the pentagon count to be the interesting part, and it turned out the folding was. Getting twenty chiral lattices to meet along thirty edges without a seam needs an exact integer identity for every lattice point, and once that identity exists the Euler count is free. Next I want to try the Twarock and Luque tilings, where pentamers and hexamers are joined by a third unit and the lattice is no longer triangular. I suspect the same folding trick carries over, but I have not checked. Watch this space.

## Reading further

- [Caspar, D. L. D. and Klug, A. (1962), "Physical principles in the construction of regular viruses", Cold Spring Harbor Symposia on Quantitative Biology 27, 1-24](https://doi.org/10.1101/SQB.1962.027.001.005): the original lattice construction, the T-number, and quasi-equivalence as a design principle.
- [Baker, T. S., Olson, N. H. and Fuller, S. D. (1999), "Adding the third dimension to virus life cycles", Microbiology and Molecular Biology Reviews 63, 862-922](https://doi.org/10.1128/MMBR.63.4.862-922.1999): a review of icosahedral reconstructions with the laevo and dextro convention spelled out.
- [Crick, F. H. C. and Watson, J. D. (1956), "Structure of small viruses", Nature 177, 473-475](https://doi.org/10.1038/177473a0): the genome-economy argument for shells made of identical subunits.
- [Liddington, R. C. et al. (1991), "Structure of simian virus 40 at 3.8-Å resolution", Nature 354, 278-284](https://doi.org/10.1038/354278a0): the atomic structure of the all-pentamer T = 7d shell first seen by Rayment et al. (1982).
- [Rayment, I., Baker, T. S., Caspar, D. L. D. and Murakami, W. T. (1982), "Polyoma virus capsid structure at 22.5 Å resolution", Nature 295, 110-115](https://doi.org/10.1038/295110a0): the 72-pentamer shell that broke quasi-equivalence.
