---
title: A loop on a sphere can turn an arrow
date: '2026-10-24T00:00:00.000Z'
description: >-
  Carry a direction around a spherical triangle without twisting it locally. The
  angle left over measures curvature.
labels: 'maths,geometry,parallel-transport'
release: true
heroImage: /blog/a-loop-on-a-sphere-turns-an-arrow/hero.webp
takeaways:
  - >-
    Parallel transport preserves a tangent vector's length while comparing
    directions at different points.
  - >-
    On a sphere, a closed loop can return a vector to its starting point with a
    different direction.
  - >-
    For a geodesic triangle, the rotation magnitude equals its area divided by
    the square of the sphere's radius.
markdown_url: /blog/a-loop-on-a-sphere-turns-an-arrow/
canonical_url: 'https://benebsworth.com/blog/a-loop-on-a-sphere-turns-an-arrow/'
---
## Key takeaways

- Parallel transport preserves a tangent vector's length while comparing directions at different points.
- On a sphere, a closed loop can return a vector to its starting point with a different direction.
- For a geodesic triangle, the rotation magnitude equals its area divided by the square of the sphere's radius.

Walk around a triangle, carry an arrow without twisting it, and come back pointing a different way. On a flat desk that sounds like a mistake. On a sphere it is a measurement of curvature.

There is one condition hidden in “without twisting”: the arrow must stay tangent to the surface. Keeping a direction fixed in the surrounding room would eventually lift it away from the sphere. We need a local rule that respects the surface at every step. That rule is parallel transport, and a three-sided trip gives us a surprisingly manageable way to see it.

## Walk the triangle first

The route below starts at the north pole, follows a meridian to the equator, travels along the equator, and returns on another meridian. All three pieces are great-circle arcs. The amber arrow travels with us; the blue arrow stays at the start for comparison.

> [SpatialLab component] Interactive spatial science workbench. The slug selects a mathematical or physical model with an orbitable 3D scene, parameter sliders, experiment presets, a scrubbable animation timeline, quantitative measurements, a colour legend and explicit model limitations. Play/pause, reset and camera views support careful comparisons. A projected SVG view preserves the same model and controls without WebGL. Each experiment is also available at /lab/<slug>/.

Choose **One octant** and scrub time from the beginning to the end. The moving arrow returns to the north pole at 90° to the blue one. Try **Narrow triangle** and repeat. This time the turn is 30°. Nothing in the control code adds an end-of-loop correction. The net rotation comes from applying the same transport rule on each segment.

I like this example because we can follow the entire calculation with ordinary rotations in three dimensions. The notation of differential geometry can wait a moment. First, check that the amber arrow stays tangent and keeps the same length, including at the corners.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The arrow is a mathematical tangent vector, not a magnetic compass. A compass has its own interaction with a magnetic field. This experiment asks only how a surface lets us compare directions at neighbouring points.

## “The same direction” needs a rule

On a plane, we can slide an arrow without turning it. At every new point, the old arrow still lies in the plane. A sphere changes the tangent plane as we move, so an arrow that remains fixed in ambient space usually stops being tangent.

Parallel transport keeps the arrow tangent while removing any unnecessary change *within* that tangent plane. In other words, its ambient derivative may point normal to the surface, but it has no tangential component. [David Tong's geometry notes](https://www.damtp.cam.ac.uk/user/tong/gr/grhtml/S3.html) express this using the covariant derivative and explain why it is a map between different tangent spaces.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{D\mathbf v}{ds}=0, \qquad \frac{d\mathbf v}{ds}=-\left(\mathbf v\cdot\frac{d\mathbf n}{ds}\right)\mathbf n
```

$$
\frac{D\mathbf v}{ds}=0, \qquad
\frac{d\mathbf v}{ds}=-\left(\mathbf v\cdot\frac{d\mathbf n}{ds}\right)\mathbf n
$$

The second expression is the sphere version in ambient coordinates. Here $\mathbf n$ is the outward unit normal and $s$ measures distance along the route. It follows by differentiating the tangency condition $\mathbf v\cdot\mathbf n=0$ and requiring the derivative of $\mathbf v$ to be normal.

We get a useful consistency check almost for free. The derivative of $\mathbf v\cdot\mathbf v$ is twice the dot product of $\mathbf v$ with its derivative. One is tangent and the other normal, so the dot product vanishes. The arrow's length must stay constant. A numerical visualisation that gradually lengthens its arrow is showing integration error, not a property of curvature.

The lab avoids that drift by using exact rotations along each great circle. If two unit position vectors define an arc, their cross product defines its rotation axis. Rotating both position and arrow by the travelled angle gives the parallel-transport solution along that arc.

## Three corners, three right angles

For the octant route, the two meridians are 90° apart. Each meets the equator at a right angle, and they meet one another at a right angle at the pole. Our triangle therefore has three right angles.

That is allowed. The familiar 180° sum belongs to flat triangles. The spherical triangle has a 270° sum, and the extra 90° is the same angle we found by transporting the arrow.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Let's widen the **Longitude gap** to a general angle $\beta$. The equatorial corners remain right angles, while the angle at the north pole becomes $\beta$. The spherical excess is therefore $\beta$, measured in radians when we calculate an area.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\alpha+\beta+\gamma-\pi=\frac{\mathcal A}{R^2}
```

$$
\alpha+\beta+\gamma-\pi=\frac{\mathcal A}{R^2}
$$

For our special triangle we can also count the area directly. It occupies the fraction $\beta/(2\pi)$ of the northern hemisphere. That hemisphere has area $2\pi R^2$, so the patch has area $\beta R^2$. No differential equation required.

At a corner, the path changes direction abruptly. The transported vector does not receive an extra turn to align it with the next edge. Confusing those two turns is a common way to accidentally erase the effect: a vector tied to the direction of travel is a different experiment.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Keep the arrow continuous at each corner. Turning it to face the next segment adds a rotation that parallel transport never requested. The path's heading and the carried vector are separate pieces of state.

## The angle is integrated curvature

The residual rotation after a closed trip is called holonomy. On a round sphere, its magnitude for this loop is the enclosed area times the Gaussian curvature. The sign depends on which way we traverse the loop; the lab reports the magnitude.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
|\Delta\theta|=\int_{\mathcal A}K\,dA=\frac{\mathcal A}{R^2}, \qquad K=\frac{1}{R^2}
```

$$
|\Delta\theta|=\int_{\mathcal A}K\,dA=\frac{\mathcal A}{R^2}, \qquad K=\frac{1}{R^2}
$$

This is a local form of the connection between geometry and curvature developed in the Gauss–Bonnet theorem. The chapters on parallel transport and Gauss–Bonnet in [Petrunin and Zamora Barrera's surface-geometry notes](https://anton-petrunin.github.io/gauss/index.html) give a broader treatment beyond this round-sphere example.

Now try **Larger sphere**. The surface looks less curved at any fixed physical scale. Yet the complete-loop holonomy still reads 90°. The reason is in the other readouts: the same angular triangle encloses more area. Curvature decreases as $1/R^2$, area increases as $R^2$, and their product stays constant.

For a numerical check, use radius 1.4 and longitude gap 90°. The area is $1.4^2\pi/2$, approximately 3.079 square units. Curvature is approximately 0.5102 per square unit. Multiplying them gives 1.5708 radians, or 90°. Increase the radius to 1.6: the area becomes approximately 4.021, curvature falls to 0.390625, and the product remains $\pi/2$.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The arrow remembers the curvature enclosed by the journey.

## What would make the effect disappear?

Hold the physical size of the loop fixed while making the sphere larger and the rotation tends towards zero. That is a different operation from the radius control here, which preserves the loop's angular shape. Near enough to any ordinary point on a smooth surface, a sufficiently small patch behaves approximately like its tangent plane.

For a plane, Gaussian curvature is zero everywhere and this kind of contractible closed loop gives no residual rotation. A cylinder is an instructive next example: it looks bent in a room, but its Gaussian curvature is zero. A sheet of paper can become a cylinder without stretching. “Looks bent from outside” and “has intrinsic curvature” are not the same test.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The workbench varies one family of geodesic triangles on a round sphere. It does not establish a formula for arbitrary surfaces by animation alone. Its quantitative checks are tangency, constant vector length, return to the starting position, and the known spherical excess.

This is also why the example sits naturally beside [why gravity is geometry](/blog/why-gravity-is-geometry/). Both ask how local directions compare across a curved space. The sphere is a two-dimensional Riemannian surface with positive curvature; spacetime introduces a different metric signature and substantially more structure. The analogy is a foothold, not a replacement for that machinery.

Try predicting the end direction for 60° and 120° gaps before moving the time control. Then open the [standalone transport lab](/lab/parallel-transport/) and check whether changing the radius can ever alter that prediction. The experiment is small enough to understand completely, which makes it a useful place to start before the geometry becomes less forgiving.

## Reading further

- [David Tong: introducing Riemannian geometry](https://www.damtp.cam.ac.uk/user/tong/gr/grhtml/S3.html) develops connections, parallel transport, holonomy, and geodesics with sphere examples.
- [Petrunin and Zamora Barrera: curves and surfaces](https://anton-petrunin.github.io/gauss/index.html) gives an accessible, visual route into parallel transport and Gauss–Bonnet.
- [Cambridge differential geometry example sheet](https://www.dpmms.cam.ac.uk/~md384/examplesheet2.pdf) asks how transport along piecewise smooth loops forms a holonomy group.
