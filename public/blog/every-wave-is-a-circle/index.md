---
title: 'Every Wave Is a Circle: Fourier Series as Epicycles'
date: '2026-06-17T00:00:00.000Z'
description: >-
  We are taught Fourier as an integral to memorise. The geometric truth is older
  and stranger: any periodic signal, however square or spiky, is drawn by a
  stack of spinning circles — the same epicycles Ptolemy used for the planets.
labels: 'mathematics,fourier,analysis,signal processing'
release: true
author: Ben Ebsworth
heroImage: /blog/every-wave-is-a-circle/hero.webp
takeaways:
  - >-
    Ptolemy's epicycles were an empirical Fourier theorem 16 centuries early: a
    stack of integer-frequency circular motions is a universal approximator for
    any periodic path.
  - >-
    A Fourier coefficient is a projection, not a recipe: multiplying the signal
    by a probe circle spinning at -nω and averaging isolates one harmonic
    because the bases are orthogonal.
  - >-
    How fast the coefficients decay encodes smoothness: a jump dies as 1/n, a
    kink as 1/n^2, anything infinitely smooth faster than any power.
  - >-
    Gibbs overshoot is permanent at ~8.95% of any jump: more terms make the ear
    narrower but never shorter — energy converges, shape does not.
markdown_url: /blog/every-wave-is-a-circle/
canonical_url: 'https://benebsworth.com/blog/every-wave-is-a-circle/'
---
## Key takeaways

- Ptolemy's epicycles were an empirical Fourier theorem 16 centuries early: a stack of integer-frequency circular motions is a universal approximator for any periodic path.
- A Fourier coefficient is a projection, not a recipe: multiplying the signal by a probe circle spinning at -nω and averaging isolates one harmonic because the bases are orthogonal.
- How fast the coefficients decay encodes smoothness: a jump dies as 1/n, a kink as 1/n^2, anything infinitely smooth faster than any power.
- Gibbs overshoot is permanent at ~8.95% of any jump: more terms make the ear narrower but never shorter — energy converges, shape does not.

A square wave, that brutally flat-topped, vertical-edged shape with corners sharper than anything in nature, is drawn by nothing but spinning circles. Not approximated by circles in some loose hand-wavy sense. *Drawn.* Stack enough circles, each riding on the rim of the last, each turning at its own steady speed, and the tip of the final one traces a perfect square pulse, edges and all. The same machine that draws a square wave draws a violin's vibrato, a heartbeat, the profile of a mountain range repeated across a horizon. Every periodic signal you have ever met is the path of a pen bolted to a tower of rotating wheels.

This is the geometric truth that the integral formula hides. Most of us learned Fourier as a recipe to memorise: an $a_n$ here, a $b_n$ there, an integral from $0$ to $2\pi$ that you computed under exam pressure and never looked at again. But the picture came first by more than a millennium and a half, and it belonged to astronomers who were trying to predict where Mars would be on a Tuesday. They were called wrong. They had, by accident, stumbled onto one of the deepest facts in mathematics.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Watch the circles. The biggest one sets the fundamental rhythm; each smaller circle rides on the edge of the one before it, turning faster, adding a finer wiggle. The tip of the last circle is a pen, and it draws the wave on the right as time scrolls by. Now drag **Terms** up, from 3 toward 30, and watch the trace stiffen: the flat tops flatten, the edges steepen, the curve fights its way toward a true square. But look at the corners as you do it. No matter how many circles you stack, a little overshoot ear stubbornly sticks up at each jump and refuses to leave. Hold that image. We're going to prove that those ears are permanent: roughly 9% of the jump, forever.

## The spinning-circles picture came first

In the second century, Claudius Ptolemy faced a problem. The planets did not move in clean circles around the Earth. Mars, in particular, would sometimes slow, stop, and loop *backwards* against the stars before resuming. This was retrograde motion. Ptolemy's fix, inherited from Apollonius and Hipparchus, was to put a planet not on a circle but on a small circle (an **epicycle**) whose centre rode around a larger circle (the **deferent**). One wheel on another. When the predictions still drifted, medieval astronomers added more epicycles, a wheel on a wheel on a wheel, tuning each one's size and speed until the model matched the sky.

History remembers this as a cautionary tale: a baroque, wrong theory propped up with ever more epicycles until Kepler swept it away with ellipses. The lesson, supposedly, is that adding parameters to save a bad model is a sin. That lesson is real, but it buries something remarkable. The astronomers had discovered, empirically and centuries early, that a sum of circular motions can approximate *any* repeating path to arbitrary accuracy. They weren't wrong about the mathematics. They were wrong about the physics. The wheels were never in the sky, but the wheels can draw the sky's apparent motion as precisely as you like, and that's a theorem, not a coincidence.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

"Adding epicycles" became shorthand for desperate model-patching. But the underlying fact is one of the strongest in analysis: a stack of uniform circular motions, sinusoids of integer-related frequencies, is a *universal approximator* for periodic functions. From Ptolemy onward, astronomers were wielding an empirical version of the Fourier theorem more than sixteen centuries before Joseph Fourier wrote it down in 1822. They lost the scientific argument and won, unknowingly, a mathematical one.

## From circles to the series

Translate the picture into algebra and the Fourier series falls out. A single circle of radius $A$, turning at frequency $f$ with a head start $\phi$, projects onto your screen as $A\cos(2\pi f t + \phi)$ horizontally and $A\sin(2\pi f t + \phi)$ vertically. Let's stack circles whose frequencies are all integer multiples of one fundamental $\omega = 2\pi/T$, the only way to guarantee the whole pattern repeats with period $T$, and the vertical position of the pen, as a function of time, is a sum of sines and cosines. That sum is the **Fourier series**.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
f(t) = \frac{a_0}{2} + \sum_{n=1}^{\infty} \left( a_n \cos(n\omega t) + b_n \sin(n\omega t) \right)
```

$$
f(t) = \frac{a_0}{2} + \sum_{n=1}^{\infty} \left( a_n \cos(n\omega t) + b_n \sin(n\omega t) \right)
$$

The $a_0/2$ term is the DC offset: the centre of the whole stack, the average value of the signal. Each $n$ contributes one harmonic: a cosine and a sine at frequency $n\omega$, which together are just one circle of some radius and some starting phase. The real form splits each circle into its cosine and sine shadows, which is convenient for hand computation but obscures the geometry. To see the circles directly, we pair each positive frequency with its negative twin and use Euler's formula, $e^{i\theta} = \cos\theta + i\sin\theta$. A point spinning on a circle in the complex plane is literally $c_n e^{i n\omega t}$, a vector of length $|c_n|$, rotating at angular speed $n\omega$.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
f(t) = \sum_{n=-\infty}^{\infty} c_n\, e^{i n \omega t}, \qquad c_n = |c_n|\, e^{i\arg(c_n)}
```

$$
f(t) = \sum_{n=-\infty}^{\infty} c_n\, e^{i n \omega t}, \qquad c_n = |c_n|\, e^{i\arg(c_n)}
$$

This is the equation the lab is drawing. Each $c_n$ is a complex number, and a complex number is a circle waiting to spin: its magnitude $|c_n|$ is the radius, and its argument $\arg(c_n)$ is the starting angle. The signal $f(t)$ is the tip of the last circle when you chain them tip-to-tail, biggest first. Negative $n$ are circles spinning the other way; pairing $n$ and $-n$ recovers the real cosine of equation (1). The whole of Fourier analysis is this sentence: *give me the radii and starting angles of the circles, and I will give you the wave.*

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

A complex number is a circle waiting to spin. Its magnitude is the radius, its argument is where the spin begins.

## Computing the coefficients by projection

So how do we find the radii? Here's where the integral you memorised finally earns its place, not as a formula handed down but as a measurement. The circles' frequencies are all distinct integer multiples of $\omega$, and sinusoids of different integer frequencies are **orthogonal** over one period: multiply two of them, integrate over $T$, and you get zero unless they're the same frequency. They don't interfere with each other's bookkeeping. That orthogonality is what lets us pull out one coefficient at a time.

To find $c_n$, the radius and phase of the $n$th circle, you *project* the signal onto that circle's motion. Multiply $f(t)$ by $e^{-i n\omega t}$ (a probe circle spinning at exactly $-n\omega$, which cancels the $n$th term's spin and leaves it standing still) and average over one period. Every other term, still spinning, averages to zero. Only the $n$th term survives.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
c_n = \frac{1}{T} \int_{0}^{T} f(t)\, e^{-i n \omega t}\, \mathrm{d}t
```

$$
c_n = \frac{1}{T} \int_{0}^{T} f(t)\, e^{-i n \omega t}\, \mathrm{d}t
$$

That's the whole "memorise this integral," and it isn't a recipe, it's a question. It asks: *how much of the signal points in the direction of a circle spinning at $n\omega$?* The integral is a correlation, a dot product between your signal and a pure rotation. Big answer, big circle. Zero answer, no circle at that frequency. The real coefficients of equation (1) are just $a_n = 2\,\text{Re}(c_n)$ and $b_n = -2\,\text{Im}(c_n)$, the cosine and sine shadows of the same complex circle.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The reason you can compute each coefficient independently, without solving a giant simultaneous system, is that the basis functions $e^{i n\omega t}$ are mutually orthogonal. Each circle lives in its own dimension. This is the exact same structure as decomposing a 3D vector into its $x$, $y$, $z$ components: you project onto each axis separately *because the axes are perpendicular*. Fourier analysis is geometry in an infinite-dimensional space, and the harmonics are the coordinate axes.

## Watching the circles interfere

Before we attack the square wave, let's look at what summing just two sinusoids actually does, because all the richness of Fourier hides in the interference between circles.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Turn **Show components** on so you can see the two contributing sinusoids alongside their sum. Now drag **Frequency 2** so the two frequencies are close, say 2 and 2.2, and watch the sum swell and collapse in slow beats: that throb is the two circles drifting in and out of phase. Set them to a clean integer ratio like 2 and 4 and the sum locks into a stable repeating shape. This is the engine of Fourier: a complicated waveform is not one thing, it is many circles constructively reinforcing at some moments and cancelling at others. The square wave's flat top is many harmonics agreeing; its vertical edge is many harmonics conspiring to flip sign all at once.

And that conspiracy at the edge is exactly where the trouble starts.

## The square wave and why corners are hard

A square wave is the natural enemy of a smooth circle. Sinusoids are infinitely differentiable, buttery smooth, with no corners anywhere. A square wave is the opposite: flat, then a vertical cliff, then flat again. Asking smooth circles to build a corner is asking the impossible, and they pay for the attempt at the edges. (That tension is most of the story, so it's worth dwelling on.)

Let's run the numbers. For an odd square wave the coefficients are clean: only the **odd** harmonics survive, and each one's amplitude falls off as $1/n$. The first three nonzero terms have amplitudes $\tfrac{4}{\pi}$, $\tfrac{4}{3\pi}$, $\tfrac{4}{5\pi}$: the fundamental, then a third the size at triple the frequency, then a fifth the size at five times. Slow decay. The high harmonics matter, because the corner is *made of* high frequency: an instantaneous jump needs arbitrarily fast wiggles to build. A signal with a discontinuity has a Fourier spectrum that dies only as $1/n$, and that slow death is the corner's signature.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The rate at which a signal's Fourier coefficients shrink tells you exactly how smooth it is. A jump discontinuity (square wave): coefficients decay as $1/n$, which is slow. A corner with no jump but a kink (triangle wave): $1/n^2$, faster. Infinitely smooth: faster than any power of $n$. You can *hear* the discontinuity in the spectrum's tail. This is why compressing a sharp-edged image is harder than a blurry one. Sharp edges spray energy across every harmonic.

Switch the **Shape** control in the lab at the top between square, sawtooth, and triangle and watch the convergence speed change. The triangle, with its gentler kinks ($1/n^2$ decay), snaps to its target with far fewer terms. The square and sawtooth, carrying true jumps, crawl, and they crawl with a defect that never heals.

## Gibbs: the 9% that never goes away

Here's the part that should bother you. Drag **Terms** all the way to 30 on the square-wave lab. The flat sections are now nearly perfect. The edges are nearly vertical. But at the top and bottom of each jump there's still a little spike, an overshoot ear, that pokes past the true square's level. Add more terms and the ear gets *narrower*, sliding closer to the edge. But it doesn't get *shorter*. It plateaus at a fixed height and stays there forever.

This is the **Gibbs phenomenon**, and its height is a specific, computable constant. As you add harmonics, the overshoot at a jump discontinuity converges not to zero but to a fixed fraction of the jump: the partial sum overshoots by about 8.95% of the gap, on each side, no matter how many terms you take.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
G = \frac{1}{\pi}\int_{0}^{\pi} \frac{\sin t}{t}\,\mathrm{d}t - \frac{1}{2} \approx 0.0895
```

$$
G = \frac{1}{\pi}\int_{0}^{\pi} \frac{\sin t}{t}\,\mathrm{d}t - \frac{1}{2} \approx 0.0895
$$

That number, $0.0895$, about one part in eleven, comes from the **sine integral** $\text{Si}(\pi) = \int_0^\pi \frac{\sin t}{t}\,\mathrm{d}t \approx 1.8519$. The partial sum near the jump behaves like that integral, which climbs to $\text{Si}(\pi)$ before settling back to its limit of $\pi/2$. The overshoot is about $8.95\%$ of the full jump on each side: for a square wave running from $-1$ to $+1$ (a jump of $2$), the peak of the partial sum sits near $1.18$ rather than $1$. It's baked into the geometry of summing finitely many circles across a discontinuity, and it's *scale-invariant*. It doesn't care about the size of the jump, only that there is one.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Adding harmonics makes the overshoot region *narrower*, squeezing it toward the discontinuity, but never *shorter*. In the limit the spike has zero width but the same finite height, contributing nothing to the energy of the error (which does go to zero), yet always visibly there. The pointwise sum at any fixed point near the edge does converge. It is the *peak of the partial sum*, a moving target that slides toward the edge, that stays stuck at $+8.95\%$. Convergence in energy is not convergence in shape. That distinction is the whole subtlety of Fourier analysis in one picture.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

The Gibbs ringing is not a mathematical curiosity locked in a textbook. It is why a sharply equalised audio track can "pre-echo" before a drum hit, why a JPEG with hard edges shows faint ripples beside high-contrast borders (ringing artifacts), and why filter designers taper their coefficients with windows to tame the overshoot. The medieval astronomers' wheels have a permanent quiver at every cliff, and that quiver leaks into every device that reconstructs a signal from a finite set of frequencies.

## Why JPEG and MP3 work — and the bridge to the FFT

Step back and the cross-field payoff is enormous. Equation (2) says any signal is a stack of circles with radii $|c_n|$. Most real signals (a photo, a song, a voice) are dominated by a *few big circles* and a long tail of tiny ones. The big circles carry the gist; the small ones carry detail your eye and ear barely register. Throw the small circles away and the wave stays almost intact. That's the entire idea behind lossy compression.

**JPEG** chops an image into 8×8 blocks and runs a cosine transform (a real-valued cousin of equation (2)) on each. It keeps the low-frequency circles, the big blobs of brightness and colour, and aggressively discards the high-frequency ones, because human vision is poor at fine spatial detail. **MP3** does the same in time: it transforms short windows of audio into their frequency circles and drops the ones a psychoacoustic model says you cannot hear. Both are equation (2) with a budget: keep the big radii, drop the small ones, reconstruct from what is left. The Gibbs ringing is the price. Discard the high circles near a sharp edge and you get visible ripples (JPEG) or audible pre-echo (MP3).

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Set **Waveform** to Square and read the spectrum: spikes at the odd harmonics only (1, 3, 5, 7), each shorter than the last by that $1/n$ law we derived. This is equation (2) turned on its side: instead of watching the circles spin in time, you are reading off their radii directly, sorted by frequency. Switch to Sine and the spectrum collapses to a single spike: one circle, one frequency. Switch to Two Tones to see two clean spikes. The spectrum *is* the list of coefficients; the waveform is what those coefficients draw. Now nudge **Noise (dB)** up from −60 and watch a grass of small random circles fill the floor between the harmonics. That is the noise added to the signal, spread across every frequency.

The continuous integral of equation (3) is beautiful but uncomputable on a machine: you can't integrate over a continuum of points. Sample the signal at $N$ discrete instants and the integral becomes a finite sum: the **Discrete Fourier Transform** (DFT). Computed naively the DFT costs $N^2$ multiplications, which is ruinous for a song with millions of samples. The breakthrough, the Cooley–Tukey **Fast Fourier Transform** (FFT) of 1965, foreshadowed by Gauss himself in 1805, exploits the symmetry of the circles to compute the same answer in $N\log N$ operations. That single algorithmic trick is what makes the spectrum lab above run in real time, what makes your phone decode audio, what makes a software-defined radio possible. The FFT is the engine; the epicycle picture is the soul. They're the same circles, counted cleverly.

So the next time you meet the Fourier integral, don't reach for the formula. Reach for the wheels. Every periodic signal in the universe is a tower of spinning circles, biggest first, each one a complex number waiting to turn, and the only thing the integral does is measure their radii. Once you've seen the wheels, you can't unsee them, and I think that's the better way to carry the idea around.

## Reading further

- [Fourier, *Théorie analytique de la chaleur* (1822)](https://gallica.bnf.fr/ark:/12148/bpt6k1045508v). The founding text, where Fourier claimed (to the disbelief of Lagrange and Laplace) that *any* function could be written as a trigonometric series; the audacity is what made it revolutionary.
- [Körner, *Fourier Analysis* (Cambridge, 1988)](https://www.cambridge.org/core/books/fourier-analysis/). The canonical modern textbook: rigorous on convergence and the Gibbs phenomenon, but written with wit and a historian's eye for where the ideas came from.
- [3Blue1Brown, *But what is a Fourier series? From heat flow to drawing with circles*](https://www.youtube.com/watch?v=r6sGWTCMz2k). The definitive visual teaching case for the epicycle picture; if equation (2) still feels abstract, this animation makes the spinning circles undeniable.
- [Gibbs, *Fourier's Series* (Nature, 1899)](https://www.nature.com/articles/059606a0). The terse letter where Gibbs corrected the record on the overshoot at a discontinuity, settling a debate Michelson had stumbled into with a mechanical harmonic analyser.
