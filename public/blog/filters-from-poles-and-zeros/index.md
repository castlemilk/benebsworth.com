---
title: Filters from Poles and Zeros
date: '2026-06-19T12:00:00.000Z'
description: >-
  A filter is two polynomials, and the roots of those polynomials are the whole
  story. Place a few points in the complex plane and you can read the entire
  frequency response straight off the geometry — no calculus required at the
  point of use.
labels: 'ee,signals,filters'
release: true
author: Ben Ebsworth
heroImage: /blog/filters-from-poles-and-zeros/hero.webp
takeaways:
  - >-
    A filter's magnitude response at any frequency is just the product of
    distances from a probe on the imaginary axis to the zeros, divided by the
    distances to the poles.
  - >-
    Roll-off slope is the pole count read off geometry: far above all poles each
    contributes a 1/ω factor, so n poles give a −n slope on log-log axes.
  - >-
    Every Butterworth filter is down exactly 3 dB at its corner regardless of
    order, because its poles sit equally spaced on a circle of radius ω_c.
  - >-
    Butterworth, Chebyshev and Bessel are the same pins relocated — a circle, an
    ellipse, or backed-off poles — trading flatness, steepness and pulse shape.
markdown_url: /blog/filters-from-poles-and-zeros/
canonical_url: 'https://benebsworth.com/blog/filters-from-poles-and-zeros/'
---
## Key takeaways

- A filter's magnitude response at any frequency is just the product of distances from a probe on the imaginary axis to the zeros, divided by the distances to the poles.
- Roll-off slope is the pole count read off geometry: far above all poles each contributes a 1/ω factor, so n poles give a −n slope on log-log axes.
- Every Butterworth filter is down exactly 3 dB at its corner regardless of order, because its poles sit equally spaced on a circle of radius ω_c.
- Butterworth, Chebyshev and Bessel are the same pins relocated — a circle, an ellipse, or backed-off poles — trading flatness, steepness and pulse shape.

Ask an engineer how a filter works and you'll usually get a Bode plot: gain against frequency, a flat passband, a corner, a roll-off into the stopband. True, and useful, but it hides where the shape *comes from*. The shape is not designed curve by curve. It falls out of the position of a handful of points in the complex plane, and once you can see those points you can sketch the whole response by eye.

Here is the claim to test as you read. **A filter's frequency response is the product of distances from a moving probe to a few fixed points.** Mark the special points, walk a probe up the imaginary axis, and at each height the gain is just "distances to the zeros, divided by distances to the poles". That's it. The calculus was all spent up front, in deciding where to put the points. Let's look at one first.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

This is an ordinary low-pass: it passes slow signals and rejects fast ones. Flat for a while, then a knee, then a steady decline. Standard stuff. The point of the post is that the knee's location and the decline's steepness are not separate facts you tune independently. They're two readings of the *same* pair of points, the filter's poles.

Drag the **Pole freq** control and watch the corner slide. You're moving the poles, and the whole curve follows.

## The transfer function is a ratio of polynomials

Any linear, time-invariant circuit has a transfer function $H(s)$, a ratio of two polynomials in the complex frequency $s = \sigma + j\omega$. The reason this object exists is one clean fact: feed a linear circuit a signal $e^{st}$ and it spits out exactly $H(s)\,e^{st}$, the same signal scaled by a complex number. The exponential is the circuit's eigenfunction; $H(s)$ is the eigenvalue. Factor the top and bottom and you expose the points that matter.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
H(s) = \frac{N(s)}{D(s)} = K\,\frac{(s - z_1)(s - z_2)\cdots(s - z_m)}{(s - p_1)(s - p_2)\cdots(s - p_n)}
```

$$
H(s) = \frac{N(s)}{D(s)} = K\,\frac{(s - z_1)(s - z_2)\cdots(s - z_m)}{(s - p_1)(s - p_2)\cdots(s - p_n)}
$$

The **zeros** $z_k$ are the values of $s$ that drive the output to nothing. The **poles** $p_k$ are the values that blow it up. They are usually complex, and the right way to picture them is as pins stuck into the $s$-plane. Everything the filter does is encoded in where those pins are.

## The magnitude is a product of distances

To get the actual frequency response we evaluate $H(s)$ along the imaginary axis, $s = j\omega$, because that is where the steady sinusoids live. Take the magnitude of equation (1) and the product structure survives intact.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\left|H(j\omega)\right| = K\,\frac{\displaystyle\prod_{k=1}^{m} \left|\,j\omega - z_k\,\right|}{\displaystyle\prod_{k=1}^{n} \left|\,j\omega - p_k\,\right|}
```

$$
\left|H(j\omega)\right| = K\,\frac{\displaystyle\prod_{k=1}^{m} \left|\,j\omega - z_k\,\right|}{\displaystyle\prod_{k=1}^{n} \left|\,j\omega - p_k\,\right|}
$$

The term $|\,j\omega - p_k\,|$ is literally the distance, in the plane, from the probe point $j\omega$ to the pole $p_k$. So slide the probe up the imaginary axis and at every height multiply up the distances to the zeros and divide by the distances to the poles. (Strictly that $K$ is a magnitude, $|K|$; for the real filters here it's a positive constant out front.) When the probe passes *close* to a pole, that pole's distance shrinks, the denominator dips, and the gain peaks. When the probe passes close to a zero, the numerator dips and the gain drops toward zero. A low-pass response is just what you see when the only pins are a couple of poles sitting off to the side at moderate frequency: near zero frequency the probe is far from them and the gain is flat, and as the probe climbs past them the distances grow and the gain falls.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This is the trick worth internalising. You do not need to evaluate equation (2) numerically to know what a filter does. Sketch the poles and zeros, put your pen at the origin, and slide it up the imaginary axis. Watch the distances. The gain rises as you approach a pole and dives as you approach a zero, and the *rate* it changes tells you the slope. Far above all the poles, every pole-distance grows roughly like $\omega$ itself, so each pole contributes a factor of $1/\omega$ to the gain. Stack $n$ poles and the gain falls like $1/\omega^n$, which on a log-log plot is a straight line of slope $-n$. The roll-off is the pole count, read off geometry.

The phase works the same way, with angles instead of distances.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\arg H(j\omega) = \sum_{k=1}^{m} \angle(j\omega - z_k) - \sum_{k=1}^{n} \angle(j\omega - p_k)
```

$$
\arg H(j\omega) = \sum_{k=1}^{m} \angle(j\omega - z_k) - \sum_{k=1}^{n} \angle(j\omega - p_k)
$$

Far past a single pole the angle from the probe to it approaches $90°$, so each pole drags the phase down by $90°$ in the limit. A two-pole low-pass ends up $180°$ behind, a four-pole one $360°$. That accumulating phase lag is the same quantity that decides whether a [feedback loop](/blog/pll-from-first-principles/) stays stable, which is why control engineers and filter designers are really reading the same diagram.

## Butterworth: put the poles on a circle

Now the design question: *where* should the poles go? The most famous answer, from Stephen Butterworth in 1930, is "spread them evenly on a circle in the left half-plane", and it produces the maximally flat response.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\left|H(j\omega)\right|^2 = \frac{1}{1 + \left(\omega/\omega_c\right)^{2n}}
```

$$
\left|H(j\omega)\right|^2 = \frac{1}{1 + \left(\omega/\omega_c\right)^{2n}}
$$

Two facts fall straight out and they're worth committing to memory. At the corner $\omega = \omega_c$ the bracket is $1 + 1 = 2$, so the gain is $1/\sqrt 2$, which is $-3.01$ dB, *for every order $n$*. Every Butterworth filter, first order or tenth, is down exactly 3 dB at its corner. And far past the corner the response falls at $n \times 20$ dB per decade: 20 for first order, 40 for second, 80 for fourth.

Geometrically the poles sit on a circle of radius $\omega_c$, equally spaced, all in the left half-plane. A second-order Butterworth has its pair at $-0.707 \pm 0.707j$ (taking $\omega_c = 1$), sitting on the unit circle at $45°$ off the negative real axis. A fourth-order one has four poles on that circle at $112.5°, 157.5°, 202.5°$ and $247.5°$, which is $45°$ apart, fanned across the left-half semicircle. Each pole you add steepens the roll-off by another 20 dB/decade and tucks the constellation a little more evenly around the arc.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Be honest about the lab here, because it's a useful lesson in itself. The Bode plotter renders a *single* second-order section with fixed damping $\zeta = \sqrt 2 / 2$, so for the low-pass and high-pass types the Order control changes only the label, not the curve. A real higher-order filter is a *cascade* of such sections, each adding its own pole pair, and the slopes add. So read the low-pass plot as one biquad and picture stacking more to get steeper roll-off. Where the Order slider does bite is the band-pass and notch types, where it sharpens the resonance, as we're about to see.

## A pole near the axis is a resonance

Push a pole pair close to the imaginary axis and equation (2) tells you what happens: as the probe slides past, it comes very near those poles, the denominator nearly vanishes, and the gain spikes. That spike is resonance, and a single damped pole pair captures it.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
p_{1,2} = -\zeta\omega_0 \pm j\,\omega_0\sqrt{1 - \zeta^2}, \qquad Q = \frac{1}{2\zeta}
```

$$
p_{1,2} = -\zeta\omega_0 \pm j\,\omega_0\sqrt{1 - \zeta^2}
$$

$$
Q = \frac{1}{2\zeta}
$$

The damping ratio $\zeta$ is the distance of the poles from the imaginary axis, in disguise. Small $\zeta$ means the poles sit just off the axis, the quality factor $Q = 1/(2\zeta)$ is large, and the peak is tall and narrow. As $\zeta \to 0$ the peak height $M_r = 1/\big(2\zeta\sqrt{1-\zeta^2}\big)$ tends to $Q$ itself, so a pole at $\zeta = 0.05$ gives roughly a tenfold peak. One subtlety the textbooks stress: a real peak only exists for $\zeta < 1/\sqrt 2 \approx 0.707$, and when it does its frequency is $\omega_0\sqrt{1 - 2\zeta^2}$, slightly *below* the natural frequency $\omega_0$, not exactly at it. Above that damping the response just rolls off with no bump, which is precisely the Butterworth case where $\zeta = 0.707$.

> [LabCanvas component] Inline interactive lab canvas. Embeds any effect registered in `lib/lab/registry.ts` (referenced by its `effect` slug) as a live Canvas2D/WebGL visualisation, with the effect's own controls rendered below unless `controls={false}`. Optional `params` override the effect's defaults and `caption` adds a figcaption. The rendered post has the live, interactive version; this is a static placeholder for the markdown-only sibling — read the matching lab explainer under `/lab/<slug>/` for the full description of what the effect shows.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

If that pole pair feels familiar, it should. A series RLC circuit has exactly this transfer function, and its damping $\zeta$ is set by the resistance. We met it in [every wire is an RLC circuit](/blog/every-wire-is-an-rlc-circuit/) as a step response that rings; here it's the same poles seen in the frequency domain as a resonant peak. Underdamped ringing in time and a tall, narrow peak in frequency are two views of one pole pair sitting near the axis. The resistor that damps the ringing is the same resistor that lowers the $Q$ and shortens the peak.

## A zero on the axis kills a frequency

Poles make peaks; zeros make nulls. Put a zero *exactly on* the imaginary axis at height $\omega_n$ and equation (2) sends the gain to zero there, because the probe passes straight through it and that distance becomes zero. That is a notch filter, and it's the cleanest way to remove a single unwanted tone.

> [LabCanvas component] Inline interactive lab canvas. Embeds any effect registered in `lib/lab/registry.ts` (referenced by its `effect` slug) as a live Canvas2D/WebGL visualisation, with the effect's own controls rendered below unless `controls={false}`. Optional `params` override the effect's defaults and `caption` adds a figcaption. The rendered post has the live, interactive version; this is a static placeholder for the markdown-only sibling — read the matching lab explainer under `/lab/<slug>/` for the full description of what the effect shows.

The everyday application is mains hum. In Australia, the UK and Europe the mains runs at 50 Hz, and it leaks into sensitive analog gear as a steady buzz. A notch with its zeros parked at $\pm j\,(2\pi \times 50)$ punches a hole exactly there and leaves the rest of the band alone. (In the Americas you'd move them to 60 Hz.) The zeros come as a conjugate pair, one above and one below the real axis, because a real circuit can only realise real-coefficient polynomials.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

There's a hard line in the $s$-plane and it's the imaginary axis. A pole sitting *exactly* on it would make equation (2) divide by zero, infinite gain at that frequency, which is another name for an oscillator. That's a feature when you want one and a disaster when you don't. A stable filter keeps every pole strictly in the *open* left half-plane, off the axis, where the response stays finite and any transient decays. Zeros are free to sit on the axis (that's the notch) or even in the right half-plane (that gives an all-pass or a non-minimum-phase response), but a pole that drifts onto the axis is a circuit about to sing.

## The named filters are just different pole placements

Once you see a filter as a pattern of pins, the famous filter families stop being separate recipes and become *choices of where to put the poles for a fixed order*. They trade the same three things against each other: passband flatness, roll-off steepness, and phase (pulse) behaviour.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Butterworth puts the poles on a circle for the flattest possible passband. **Chebyshev** squashes that circle into an ellipse that hugs the imaginary axis, which buys a steeper roll-off at the cost of ripple in the passband; for a fourth-order, 1 dB design the poles sit on an ellipse with semi-axes $\sinh v_0 = 0.365$ and $\cosh v_0 = 1.064$, confocal with the Butterworth circle (since $\cosh^2 - \sinh^2 = 1$). **Bessel** goes the other way, pushing the dominant poles further from the axis to get a flat *group delay*, meaning every frequency is delayed by the same time so a pulse passes through with its shape intact and only a small overshoot (a fraction of a percent, not zero). You can't have everything at once. Flatness, steepness and clean pulses are the corners of a triangle, and each family picks a corner.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Worth a moment on the man. Stephen Butterworth published the idea in 1930 in *Experimental Wireless and the Wireless Engineer*, working at the Admiralty Research Laboratory, and he solved only the two- and four-pole cases, by hand, because that was what valve-based "filter amplifier" stages could practically realise. The general theory sat largely unused for some thirty years until the op-amp and active-filter era made arbitrary pole placement cheap and routine. A neat reminder that an idea can be completely correct and still have to wait for the hardware to catch up. Some food for thought about how much good maths is sitting in old journals waiting for its enabling technology.

The deepest connection, and the one that ties this desk together, is to the [Smith chart](/blog/smith-chart-is-geometry/). That chart is a Möbius transform of the impedance plane, a rational function of a complex variable that turns the geometry of reflection into circles and lines. It is not the *same* map as evaluating $H(s)$ on the $s$-plane, but it is the same *kind* of object: a rational function of a complex variable, read geometrically. Filters, transmission lines, and feedback loops all turn out to be the study of where you put a few points in the complex plane and what the distances to them do. Even a [software radio](/blog/software-defined-radio-in-100-lines/) filtering its IQ stream is placing poles and zeros, just in code instead of copper.

So next time you meet a Bode plot, don't read it as a curve someone drew. Read it as a shadow cast by a few pins in the plane, and ask where the pins are. Drag the lab's controls until the corner and the peak move the way you expect, and the response will stop being a formula and start being a picture you can walk through.

## Reading further

- [Butterworth, *On the Theory of Filter Amplifiers* (1930)](https://www.changpuak.ch/electronics/downloads/On_the_Theory_of_Filter_Amplifiers.pdf). Experimental Wireless & the Wireless Engineer 7, 536-541. The original maximally-flat paper, two- and four-pole cases solved by hand.
- [Thomson, *Delay networks having maximally flat frequency characteristics* (1949)](https://doi.org/10.1049/pi-3.1949.0101). Proc. IEE Part III, 96, 487-490. Where the Bessel/Thomson flat-group-delay filter comes from.
- [Sedra & Smith, *Microelectronic Circuits*](https://global.oup.com/academic/product/microelectronic-circuits-9780190853549). The Filters chapter builds pole-zero placement, Bode plots and the Butterworth/Chebyshev families from the ground up; the canonical anchor.
- [Pole-zero plots and the geometric evaluation of frequency response](https://en.wikipedia.org/wiki/Pole%E2%80%93zero_plot). A compact reference for the distance-and-angle reading of equations (2) and (3).
