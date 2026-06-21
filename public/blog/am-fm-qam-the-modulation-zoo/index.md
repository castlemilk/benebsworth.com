---
title: 'AM, FM, QAM: A Tour of the Modulation Zoo'
date: '2026-06-17T00:00:00.000Z'
description: >-
  Every modulation scheme is the same act — painting information onto a carrier
  — and they differ only in which property of the carrier you paint on. Plotted
  as a constellation, AM is a line, FM is a circle, and QAM is a grid.
labels: 'electrical engineering,communications,modulation,dsp'
release: true
author: Ben Ebsworth
heroImage: /blog/am-fm-qam-the-modulation-zoo/hero.webp
takeaways:
  - >-
    A sine has only three knobs — amplitude, frequency, phase — so AM, FM and
    QAM aren't separate inventions but the same act of spoiling a carrier on a
    different property.
  - >-
    Plotted on the IQ plane, each scheme is a shape: AM is a line on the I-axis,
    FM a constant-radius circle, and QAM a grid of discrete points.
  - >-
    FM's constant envelope is its superpower — a receiver can hard-limit away
    all amplitude noise and lose nothing, because no information lives in the
    carrier's height.
  - >-
    Shannon's C = B·log2(1+SNR) makes spectral efficiency grow only as the log
    of SNR, so each extra bit/symbol costs roughly 3 dB more power — and caps
    how dense a constellation a channel allows.
markdown_url: /blog/am-fm-qam-the-modulation-zoo/
canonical_url: 'https://benebsworth.com/blog/am-fm-qam-the-modulation-zoo/'
---
## Key takeaways

- A sine has only three knobs — amplitude, frequency, phase — so AM, FM and QAM aren't separate inventions but the same act of spoiling a carrier on a different property.
- Plotted on the IQ plane, each scheme is a shape: AM is a line on the I-axis, FM a constant-radius circle, and QAM a grid of discrete points.
- FM's constant envelope is its superpower — a receiver can hard-limit away all amplitude noise and lose nothing, because no information lives in the carrier's height.
- Shannon's C = B·log2(1+SNR) makes spectral efficiency grow only as the log of SNR, so each extra bit/symbol costs roughly 3 dB more power — and caps how dense a constellation a channel allows.

AM, FM, and the dense digital schemes inside your phone are not three different inventions. They are one act performed three ways. A radio carrier is a pure tone, a sine wave that, on its own, says nothing. To send information you have to *spoil* that tone, deliberately, in a way the receiver can undo. Every modulation scheme ever built is a choice about *which property of the sine you spoil*: its height, its rate, or the modern answer, both at once, treated as a single complex number.

A sine wave has exactly three knobs: amplitude, frequency, and phase. That's the whole zoo. Amplitude modulation (AM) paints the message onto the height. Frequency modulation (FM) paints it onto the rate. Quadrature amplitude modulation (QAM) paints onto amplitude and phase together, which turns out to be the same as steering a point around a 2D plane. The reason the industry spent a century marching from AM's wobbling height to QAM's dense grid is not fashion. It's a packing problem, and Claude Shannon wrote down its hard limit in 1948.

The fastest way to feel this is to spoil a carrier yourself and watch what breaks. So let's break one on purpose.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The top trace is the message, the information you want to send. The middle trace is the carrier after AM: a fast sine whose *envelope*, the smooth curve hugging its peaks, is a copy of the message. The receiver throws away the carrier and keeps the envelope. That's all AM is. Now drag **Mod index (m)** up from 0.5 toward 1.0 and the envelope swells to touch zero at the troughs. Push past 1.0 and watch the envelope try to go *negative*: it folds back on itself, the carrier inverts, and the recovered message is mangled. That fold is overmodulation, and it's the first hard wall in the zoo.

## Paint on the amplitude: AM and its sidebands

Write the carrier as $\cos(\omega_c t)$, a tone at angular frequency $\omega_c = 2\pi f_c$. To send a message $m(t)$, normalised so it lives between $-1$ and $1$, we scale the carrier's height by a factor that rides up and down with the message:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
s(t) = \left[\,1 + m\,\mathrm{msg}(t)\,\right]\cos(\omega_c t)
```

$$
s(t) = \left[\,1 + m\,\mathrm{msg}(t)\,\right]\cos(\omega_c t)
$$

The modulation index $m$ sets how deeply the message bites into the carrier. The constant $1$ matters: as long as $m \le 1$, the bracket $[1 + m\,\mathrm{msg}(t)]$ never goes negative, so the envelope is a faithful, always-positive copy of the message and a simple diode-and-capacitor detector recovers it.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

When $m > 1$ the bracket $[1 + m\,\mathrm{msg}(t)]$ dips below zero at the message troughs. The envelope can't go negative. It folds back on itself, the carrier phase inverts, and the diode detector reads the *absolute value*, which is the wrong waveform. The recovered audio gains a fold-distortion that no filter undoes, because the information was destroyed at the transmitter. This is why AM broadcast modulators clamp $m$ below 1 and why the lab's envelope mangled the instant you pushed past 1.0.

Now let's do the algebra that explains the *spectrum* trace at the bottom. Take a single-tone message, $\mathrm{msg}(t) = \cos(\omega_m t)$, and multiply it out. The product-to-sum identity splits the modulated term into two new tones:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
s(t) = \underbrace{\cos(\omega_c t)}_{\text{carrier}} + \frac{m}{2}\underbrace{\cos\!\big((\omega_c{+}\omega_m)t\big)}_{\text{upper sideband}} + \frac{m}{2}\underbrace{\cos\!\big((\omega_c{-}\omega_m)t\big)}_{\text{lower sideband}}
```

$$
s(t) = \underbrace{\cos(\omega_c t)}_{\text{carrier}} + \frac{m}{2}\underbrace{\cos\!\big((\omega_c{+}\omega_m)t\big)}_{\text{upper sideband}} + \frac{m}{2}\underbrace{\cos\!\big((\omega_c{-}\omega_m)t\big)}_{\text{lower sideband}}
$$

The single message tone became *three* spikes in the spectrum: the original carrier, plus a copy shifted up by $f_m$ and a copy shifted down by $f_m$. Those are the sidebands. The message frequency itself is nowhere in the spectrum. It lives in the *gap* between the carrier and each sideband. The message is in the spacing, not the spikes.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The carrier spike carries no information; it is the same fixed tone no matter what you say. Everything you transmit lives in the two sidebands, and they are mirror images of each other, so one of them is redundant. This is the dirty secret of AM broadcast: most of the transmitted power heats the carrier, which says nothing, and half of what's left is a duplicate. Single-sideband (SSB) radio fixes both, killing the carrier and one sideband, and gets the same message across in half the bandwidth and a fraction of the power. The packing instinct starts here.

The cost of AM is now visible: a message that reaches up to $f_m$ in frequency forces you to occupy a band $2 f_m$ wide around the carrier. Bandwidth is the scarce resource. Hold that thought. It's the whole game.

## Paint on the frequency: FM and the constant-envelope circle

AM's weakness is that the message lives in the carrier's *height*, and height is exactly what noise corrupts. A lightning strike, a passing car's ignition, a fridge compressor: they all add amplitude spikes, and an envelope detector reads them as signal. FM sidesteps this by refusing to put information in the amplitude at all. Instead, the message bends the carrier's *instantaneous frequency*: louder means faster, quieter means slower.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
s(t) = \cos\!\left(\omega_c t + \beta \int_{0}^{t} \mathrm{msg}(\tau)\, \mathrm{d}\tau\right)
```

$$
s(t) = \cos\!\left(\omega_c t + \beta \int_{0}^{t} \mathrm{msg}(\tau)\, \mathrm{d}\tau\right)
$$

Read the argument of the cosine carefully. The carrier phase $\omega_c t$ marches forward at a constant rate, and the message adds a *wobble* to that march through the integral. The modulation index $\beta$ sets how hard the message pulls the frequency around. Because the message touches only the *phase* and never the leading $\cos$ coefficient, the amplitude of $s(t)$ is locked at 1 for all time. FM is a **constant-envelope** scheme: the carrier never gets taller or shorter, it only speeds up and slows down.

That single fact is FM's superpower. A receiver can hard-limit the signal, clipping it to a fixed amplitude and destroying every amplitude variation, and lose *nothing*, because nothing was stored there. The amplitude noise gets clipped away with it. This is why FM radio survives a thunderstorm that turns AM to mush, and why FM trades bandwidth for that immunity: the wobble spreads the signal across a far wider band than AM (Carson's rule puts it near $2(\beta{+}1)f_m$), and that spread is roughly the price of the noise resistance.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

AM and FM are the same carrier seen from two angles: one paints the message onto how tall the wave is, the other onto how fast it turns. Plotted in the right plane, one is a line and the other is a circle.

To see why "line" and "circle" are the right words, we need the plane where all of this becomes geometry.

## Paint on both: the complex baseband and QAM

Let's stop thinking of the carrier as a wiggle in time and start thinking of it as a *spinning vector*. A cosine is the real-axis shadow of a point going around a circle at rate $\omega_c$. The point has two coordinates: how far it reaches along the in-phase axis, called $I$, and how far along the quadrature axis (the carrier shifted by $90°$), called $Q$. Any modulated signal can be written as that spinning vector with a slowly-changing $(I, Q)$ position:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
s(t) = I(t)\cos(\omega_c t) - Q(t)\sin(\omega_c t)
```

$$
s(t) = I(t)\cos(\omega_c t) - Q(t)\sin(\omega_c t)
$$

This is the master equation of the whole zoo. The carrier $\cos(\omega_c t)$ and its quarter-cycle-shifted twin $-\sin(\omega_c t)$ are *orthogonal*, so they don't interfere, and $I(t)$ and $Q(t)$ are two completely independent channels riding the same frequency. A receiver pulls them apart by multiplying by each carrier and averaging. We've doubled our real estate for free: two numbers per symbol instead of one.

Now everything snaps into place. Plot the $(I, Q)$ pair as a point in a plane, the **constellation**, and read off each scheme as a *shape*:

- **AM** moves only the height of a single carrier, so $Q = 0$ and the point slides along the $I$-axis. AM is a **line segment**.
- **FM** holds the amplitude fixed and changes only the phase, so $\sqrt{I^2 + Q^2}$ is constant while the angle sweeps. FM is a **circle**.
- **QAM** lets $I$ and $Q$ each take several discrete levels independently. The allowed points form a **grid**: 4 points for QPSK, 16 for 16-QAM, 64 for 64-QAM.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

In digital QAM you don't send a continuous $(I, Q)$. You send one of a fixed set of points, and each point stands for a chunk of bits. A 4-point grid (QPSK) carries 2 bits per symbol; a 16-point grid carries 4 bits; a 64-point grid carries 6 bits. Sending faster is not about sending more symbols per second, which bandwidth bounds. It's about packing *more points* into the same plane, so each symbol you do send carries more bits. The constellation is the alphabet, and a bigger alphabet means more bits per letter.

So the receiver's job is brutally simple to state: a point arrives somewhere in the IQ plane, and the receiver decides which constellation point you *meant* by snapping to the nearest one. In a perfect world the point lands exactly on a grid vertex. The real world, of course, is never perfect.

## Noise and the packing problem

Drop the receiver into a real channel and the clean grid point arrives as a *fuzzy blob*. Thermal noise, the random jostle of electrons present in every receiver above absolute zero, adds a small random vector to each symbol, scattering it off its ideal position. This is additive white Gaussian noise (AWGN), and it's the fundamental adversary.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

This is the IQ plane made real. Each fuzzy cloud is one constellation point, one symbol, smeared by noise into a blob of received samples. As long as the clouds stay separate, the receiver snaps each sample to the nearest vertex and recovers the bits perfectly. Drag **SNR (dB)** down from 20 toward 10 and watch the clouds swell. Where neighbouring clouds start to *touch*, the receiver can no longer tell them apart: a sample from one symbol lands in another's territory, and you get a bit error. Switch **Modulation** to 64-QAM and the same SNR is suddenly catastrophic. Four times as many points share the same plane, so the spacing halves and the clouds overlap far sooner. That's the entire trade in one slider.

The spread of each cloud has a name: error vector magnitude (EVM), the distance from where a symbol landed to where it should have been, averaged across the constellation. Low EVM, tight clouds, clean grid. High EVM, fat clouds, errors. And the squeeze is geometric:

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Each rung up the QAM ladder doubles the points along each axis, halving the spacing between them. To keep the clouds from overlapping you must shrink the noise, raising the signal-to-noise ratio by roughly the same factor. Denser grid, more bits per symbol, but a steeper SNR requirement. There has to be a law governing this exchange, and happily, there is.

## Shannon: why a denser grid, up to a limit

In 1948 Claude Shannon asked the question the whole zoo had been circling: given a channel of bandwidth $B$ corrupted by noise, what is the *absolute maximum* rate at which you can send error-free bits? Not the best scheme known in 1948, but the best scheme *possible*, ever. His answer is one of the most consequential equations in engineering:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
C = B \log_2\!\left(1 + \mathrm{SNR}\right)
```

$$
C = B \log_2\!\left(1 + \mathrm{SNR}\right)
$$

Read it as a budget. $C$ is bits per second. $B$ is your slice of spectrum in hertz. The ratio $C/B$, bits per second per hertz, is the **spectral efficiency**, and it's exactly the "how many points can I pack into the plane" number. Shannon's law says that number can grow without bound *only* if SNR does, and it grows as the *logarithm* of SNR. To double your spectral efficiency you don't double the SNR; you square it. Each extra bit per second per hertz costs you about 3 dB more signal power.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The capacity formula is the reason the industry crawled up the QAM ladder instead of jumping. Spectrum is fixed and expensive; you can't conjure more hertz. So the only way to push more bits through a fixed band is to raise spectral efficiency $C/B$, which equation (5) says you buy with SNR, one logarithmic step at a time. A cleaner channel (better SNR) lets you safely pack a denser constellation (more bits/symbol) without the clouds overlapping. AM's line is one bit's worth of geometry; QAM's grid is many. Every generation of better amplifiers, better antennas, and better error coding bought a little more SNR, and engineers immediately spent it on a denser grid. The march from the line to the grid is the field cashing in Shannon's logarithm, rung by rung.

This also explains *why you can't just keep going*. A 1024-point QAM grid would carry 10 bits per symbol, gorgeous spectral efficiency, but its points are packed so tightly that the tiniest noise smears them into each other. Equation (5) is the wall: at a given SNR there's a maximum constellation density beyond which errors are guaranteed, and no amount of cleverness in the modulator gets you past it. In practice you climb the ladder exactly as far as your SNR allows, and not one rung further.

To see the bandwidth half of the budget directly, let's watch where a modulated signal actually sits in frequency.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Switch **Waveform** to Two Tones and you see two clean spikes, a stand-in for the two sidebands of equation (2), each one a slice of occupied bandwidth. Now drag **Noise (dB)** up from $-40$ toward $0$ and watch the grass rise until it drowns the spikes. That rising floor is falling SNR, and equation (5) is reading it in real time: as the noise climbs, the channel's capacity collapses, and the densest constellation you could have afforded a moment ago becomes unusable. The $B$ in Shannon's law is how wide your spikes are allowed to spread; the SNR is how far they stick up above the grass. Capacity is the product of the two.

## The same plane, everywhere

Once you see modulation as steering a point around the IQ plane, the plane starts showing up in places that look unrelated. Every Wi-Fi, LTE, and cable-modem standard is, underneath, a story about climbing the QAM ladder as far as the channel's SNR allows. Early Wi-Fi topped out at 64-QAM; Wi-Fi 6 now reaches 1024-QAM (10 bits/symbol) on a pristine link; LTE and 5G negotiate the constellation order live, dropping to QPSK at the cell edge where SNR is poor and pushing to 256-QAM up close; DOCSIS 4.0 cable modems run 4096-QAM down a coax with a famously high SNR. They're the same equation (5) trade, made adaptively, millions of times a second.

The IQ plane itself recurs across this whole desk. It is the same complex plane the [Smith chart](/blog/smith-chart-is-geometry/) lives on. There a point's distance from the origin is a reflection magnitude and its angle a phase; here distance is amplitude and angle is carrier phase. It is the plane the FFT works in, decomposing any signal into complex $I + jQ$ components at each frequency, which is exactly how a real receiver pulls $I$ and $Q$ apart from $s(t)$. Modulation, impedance matching, and spectral analysis are three readings of one geometry: each is a point in the complex plane, each a story about magnitude and angle.

That's the unifying claim worth keeping. There's no modulation zoo, really. There is only a single carrier, a single plane, and a single packing problem with a hard floor that Shannon drew in 1948. AM paints a line on that plane, FM a circle, QAM a grid, and the whole history of wireless is the slow, disciplined business of fitting as many points as the noise will allow. When your phone quietly drops from 256-QAM to QPSK at the edge of a cell, that's the packing problem giving ground to the noise, one rung at a time.

## Reading further

- [Shannon, *A Mathematical Theory of Communication* (Bell System Technical Journal, 1948)](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf): the founding paper of information theory. Equation (5) and the very idea of channel capacity come straight from the source, and it remains startlingly readable.
- [Proakis & Salehi, *Digital Communications* (5th ed.)](https://www.amazon.com/Digital-Communications-5th-John-Proakis/dp/0072957166): the canonical graduate text on signal-space and constellation design. The IQ-plane treatment of QAM as points on a grid, and the geometry of minimum-distance decoding, is laid out here in full.
- [Haykin, *Communication Systems*, 5th ed.](https://www.wiley.com/en-us/Communication+Systems%2C+5th+Edition-p-9780471697909): the standard undergraduate bridge from analog AM/FM to digital QAM, with the sideband algebra of equation (2) and Carson's rule worked carefully.
- [Couch, *Digital and Analog Communication Systems*](https://www.pearson.com/): a teaching favourite for the spectral-occupancy and bandwidth accounting that turns Shannon's abstract capacity into a hertz-by-hertz design budget.
