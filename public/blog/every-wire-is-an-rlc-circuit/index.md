---
title: 'Every Wire Is an RLC Circuit: Why Your Digital Signal Rings'
date: '2026-06-17T00:00:00.000Z'
description: >-
  There is no such thing as a digital signal at the physical layer. The clean
  trapezoid you draw is a fiction; every trace is a distributed RLC network, and
  the ringing and reflections are the lumped RLC step response playing out at
  picosecond timescales.
labels: 'electrical engineering,signal integrity,circuits,rf'
release: true
author: Ben Ebsworth
heroImage: /blog/every-wire-is-an-rlc-circuit/hero.webp
takeaways:
  - >-
    A PCB trace is a series RLC circuit (~few nH/cm, ~1 pF/cm, plus skin-effect
    R); a logic edge is a step that kicks this underdamped resonator and watches
    it ring.
  - >-
    Ringing, ground bounce, and reflections are one phenomenon: the same
    second-order step response expressed via L, di/dt, and the reflection
    coefficient Gamma.
  - >-
    Damping ratio governs overshoot exponentially: zeta=0.5 gives 16%, zeta=0.1
    gives 73% — enough for a 3.3 V edge to briefly hit 5.7 V.
  - >-
    Treat a trace as a transmission line once its length exceeds ~t_r·v/2; the
    factor of 2 is the round trip a reflection must make before it matters.
markdown_url: /blog/every-wire-is-an-rlc-circuit/
canonical_url: 'https://benebsworth.com/blog/every-wire-is-an-rlc-circuit/'
---
## Key takeaways

- A PCB trace is a series RLC circuit (~few nH/cm, ~1 pF/cm, plus skin-effect R); a logic edge is a step that kicks this underdamped resonator and watches it ring.
- Ringing, ground bounce, and reflections are one phenomenon: the same second-order step response expressed via L, di/dt, and the reflection coefficient Gamma.
- Damping ratio governs overshoot exponentially: zeta=0.5 gives 16%, zeta=0.1 gives 73% — enough for a 3.3 V edge to briefly hit 5.7 V.
- Treat a trace as a transmission line once its length exceeds ~t_r·v/2; the factor of 2 is the round trip a reflection must make before it matters.

There is no such thing as a digital signal at the physical layer. The clean trapezoid you draw on a whiteboard, flat low, sharp rising edge, flat high, is a fiction your oscilloscope never sees. What it sees instead is a smear of overshoot, ringing, and little reflected ghosts that arrive too late. We tend to call these problems "signal integrity" and treat them as a separate, intimidating discipline with its own black-magic reputation. They're not separate. They're the step response of a second-order circuit you already know, run at picosecond timescales.

Here's the claim worth testing as you read: every copper trace on a printed circuit board (PCB) is a resistor, an inductor, and a capacitor wired in series, an RLC circuit. Drive it with a logic edge and you're not sending a "1". You're kicking an underdamped resonator and watching it ring down. The overshoot, the ringing, the reflections that plague high-speed design are not noise to be filtered out. They're the lumped RLC step response, the same transient you'd analyse in a first-year circuits course, sped up by a factor of a billion.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Drag the **Resistance R** slider. At the low end ($R = 0.5\,\Omega$) the capacitor voltage overshoots its target and oscillates before settling. That wobble is your "clean" logic transition. Push $R$ up to $5\,\Omega$ and the overshoot vanishes; the response becomes a smooth, sluggish climb with no ring. Somewhere in between is the sweet spot where the edge arrives as fast as possible without overshooting at all. Everything that follows in this post is an argument about roughly where that spot is and how to get there on a real board.

## Why a wire has L and C (and a little R)

Let's start with the offending claim: a wire is not a wire. A length of copper is a *conductor*, and every conductor carrying a changing current has two unavoidable parasitic personalities.

It has **inductance**, because current flowing through it sets up a magnetic field, and a changing current means a changing field, and a changing field induces a back-EMF (electromotive force) that opposes the change. That opposition is exactly what an inductor does. A straight trace over a ground plane carries on the order of a few nanohenries per centimetre. Tiny, but $V = L\,\frac{di}{dt}$ scales with how fast the current changes, and a 50-picosecond edge changes current *very* fast.

It has **capacitance**, because the trace and the ground plane beneath it are two conductors separated by a dielectric, which is the definition of a capacitor. A signal trace over a return plane stores charge across that gap, on the order of 1 picofarad per centimetre. Every gap between two conductors is a capacitor whether you drew one or not.

And it has a little **resistance**. The copper isn't superconducting, and at high frequencies the current crowds into the outer skin of the conductor (the skin effect), raising the effective resistance further. Resistance is the smallest of the three personalities, but it's the one that decides whether the circuit rings or settles, so it earns its place.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

We call L, C, and R "parasitics" as if they were unwanted hitchhikers. They're not optional; they are what a conductor *is*. A trace with no inductance and no capacitance would be a mathematical abstraction, not a physical object. The trapezoid on your whiteboard is the real parasite, the fiction. The RLC behaviour is the wire telling you the truth about itself.

## The lumped model: a trace is a series RLC, the edge is a step

Let's take the simplest honest model. Lump the trace's total inductance into one $L$, its total capacitance into one $C$, and its loss into one $R$, in series. A logic gate switching from low to high applies a voltage step across this network. The capacitor voltage, which is what the receiving gate actually reads, obeys a second-order linear differential equation, the same one that governs a mass on a spring or a pendulum:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{d^2 v_C}{dt^2} + 2\zeta\omega_0\,\frac{dv_C}{dt} + \omega_0^2\,v_C = \omega_0^2\,V_{step}
```

$$
\frac{d^2 v_C}{dt^2} + 2\zeta\omega_0\,\frac{dv_C}{dt} + \omega_0^2\,v_C = \omega_0^2\,V_{step}
$$

Two numbers control everything. The natural frequency $\omega_0$ sets how fast the circuit *wants* to oscillate, and the damping ratio $\zeta$ sets whether it actually does. Both come straight from the component values:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\omega_0 = \frac{1}{\sqrt{LC}}, \qquad \zeta = \frac{R}{2}\sqrt{\frac{C}{L}}
```

$$
\omega_0 = \frac{1}{\sqrt{LC}}, \qquad \zeta = \frac{R}{2}\sqrt{\frac{C}{L}}
$$

When $\zeta < 1$ the circuit is **underdamped**: the step response overshoots and rings at the damped frequency $\omega_d = \omega_0\sqrt{1 - \zeta^2}$, the oscillation decaying under an envelope $e^{-\zeta\omega_0 t}$. When $\zeta = 1$ it's **critically damped**: the fastest possible rise with no overshoot at all. When $\zeta > 1$ it's **overdamped**: slow and sluggish, no ring but no speed either. Go back to the lab and watch the regimes change as you drag $R$. You're sliding $\zeta$ directly, since $\zeta$ is linear in $R$.

The single most useful fact a digital designer can carry around is probably the relationship between damping and overshoot. The peak overshoot of an underdamped step response, as a fraction of the step height, is:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
M_p = \exp\!\left(\frac{-\pi\zeta}{\sqrt{1-\zeta^2}}\right)
```

$$
M_p = \exp\!\left(\frac{-\pi\zeta}{\sqrt{1-\zeta^2}}\right)
$$

Plug in numbers and the picture sharpens. A damping ratio of $\zeta = 0.5$ gives 16% overshoot. $\zeta = 0.3$ gives 37%. $\zeta = 0.1$, a lightly damped trace, overshoots by a punishing 73%, meaning a 3.3-volt edge briefly swings to 5.7 volts. That's enough to forward-bias a protection diode, false-trigger a downstream input, or, repeated billions of times, slowly wear out a gate oxide.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Equation (3) is not a signal-integrity formula. It's *the* second-order step-response formula. A control engineer reads it off a feedback loop; a mechanical engineer reads it off a shock absorber; a structural engineer reads it off a building swaying after a gust. Same $\zeta$, same overshoot, same exponential ring-down. The fact that your data bus and a car's suspension are governed by the identical equation is not a coincidence. It's the whole point of the post.

## When the lumped model fails: reflections and the distributed line

The lumped RLC model explains ringing, but it quietly assumes the whole trace switches at once: that the signal at the far end is the same as the signal at the near end, just delayed. That assumption holds only while the trace is *electrically short*: short enough that the edge takes negligible time to traverse it compared to how long the edge itself lasts.

Signals propagate down a PCB trace at roughly half the speed of light, about 15 cm/ns. So an edge with a 50-picosecond rise time has a physical "length" of only about 7.5 mm of trace, the spatial extent of the rising slope as it travels. Once your trace approaches that scale, the near end has already finished switching before the far end has heard about it, and you can no longer treat the wire as one lumped circuit. It becomes a **distributed** system, a transmission line, an infinite ladder of tiny series-$L$, shunt-$C$ segments, and its defining number is its **characteristic impedance** $Z_0 = \sqrt{L/C}$, the ratio it presents to a travelling wave.

The rule of thumb that tells you which world you're in:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\ell_{crit} \approx \frac{t_r \cdot v}{2}
```

$$
\ell_{crit} \approx \frac{t_r \cdot v}{2}
$$

A trace longer than $\ell_{crit}$ is "long" and must be treated as a controlled-impedance line; shorter than that, the lumped RLC model is fine. For that same 50-picosecond edge, $\ell_{crit}$ works out to about 3.75 mm, half the edge's spatial length. The factor of 2 is the key: it's the round trip. A wave has to travel *down* the line and reflect *back* before the reflection matters, so the threshold is set by twice the one-way delay. Different references put the constant anywhere from a sixth to a half of the rise length; in practice the exact fraction is a judgement call about how much ringing you tolerate, not a law.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Switch the **Load** selector to **Open**. The pulse races down the line, hits the unterminated far end, and bounces straight back at the same polarity, full amplitude. Now switch to **Short**: the reflection comes back *inverted*. Now switch to **Matched**: the pulse vanishes into the load and nothing returns. What you're watching is the reflection coefficient $\Gamma$ in the time domain, and it's the origin of the ringing you saw in the very first lab. The "ring" of a long line is just the same edge bouncing back and forth between two mismatches, each round trip a little smaller than the last.

That reflected amplitude has a name and a formula. At any junction where the line impedance $Z_0$ meets a load impedance $Z_L$, the fraction of the wave that reflects is:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}
```

$$
\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}
$$

A matched load ($Z_L = Z_0$) gives $\Gamma = 0$: the wave is fully absorbed, nothing comes back. An open ($Z_L = \infty$) gives $\Gamma = +1$: total reflection, same sign. A short ($Z_L = 0$) gives $\Gamma = -1$: total reflection, inverted. Every CMOS (complementary metal-oxide-semiconductor) input is a high-impedance, mostly-capacitive load, close to an open, so an unterminated high-speed line reflects nearly all the energy back at the driver, where it reflects *again* off the driver's own impedance mismatch, and the bus rings. (That double bounce is why the ring outlasts a single round trip.)

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The clean trapezoidal waveform in every digital-logic textbook is a teaching fiction that survives only because, at slow speeds, the ringing settles long before the next clock edge. Push the clock rate up, shorten the edges, and the lie stops being harmless. The flat tops sprout overshoot, the edges grow reflected staircases, and the eye diagram closes. You didn't introduce noise. You stopped being able to ignore physics that was always there. Every wire was always an RLC circuit; you simply ran out of margin to pretend otherwise.

## The three villains are one phenomenon

Signal-integrity courses present three separate monsters, each with its own chapter and its own dread. Reframed through the RLC lens, they collapse into one second-order story told in three accents.

**Ringing** is the underdamped step response of equation (1). The trace's $L$ and $C$ form a resonator; the logic edge is the step; $\zeta < 1$ means it rings. There is no second mechanism. It's literally the lab at the top of this page.

**Ground bounce** is $V = L\,\frac{di}{dt}$ applied to the *return* path. When many outputs switch at once, a large current swings through the shared inductance of the ground and power connections, develops a voltage across that lead inductance, and the chip's internal ground reference momentarily lifts off the board ground. Same $L$, same $\frac{di}{dt}$, same physics as the inductive term in the RLC circuit, just measured on the ground pin instead of the signal pin.

**Reflections** are $\Gamma$ at a mismatch, equation (5). The distributed version of the same energy that, in the lumped model, sloshed between $L$ and $C$. A reflection *is* a ring whose period is set by the round-trip line delay rather than by $\sqrt{LC}$.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Every wire is an RLC circuit; signal integrity is just that step response run at 10 GHz.

Three names, three chapters, one underdamped second-order system. Once you see that ringing, ground bounce, and reflections are the same energy expressed through $L$, $\frac{di}{dt}$, and $\Gamma$, the discipline stops being a bestiary of black magic and becomes a single equation we can reason about.

## The cures: damp it, match it, or slow it down

If the disease is an underdamped, mismatched second-order system, the cures are exactly the three knobs in equations (2), (3), and (5).

**Slow the edge.** Overshoot only happens because the edge contains frequencies near $\omega_0$. A slower rise time excites less of the resonance; in the critical-length rule of equation (4), a longer $t_r$ raises $\ell_{crit}$ so more of your traces stay "short." This is why driver chips offer slew-rate control: deliberately blunting the edge is often the cheapest fix. The cost is bandwidth. You can't ring a bell you tap gently, but you also can't ring it fast.

**Add damping.** A series resistor near the driver raises $R$, which raises $\zeta$ in equation (2), which crushes the overshoot in equation (3). This is **series termination**: a resistor chosen so the driver's output impedance plus the resistor equals $Z_0$, absorbing the reflection when it returns. It is the most direct application of "drag $R$ to the right" in the opening lab.

**Match the impedance.** End the line in a load equal to $Z_0$ and equation (5) gives $\Gamma = 0$: no reflection, ever. This is the gold standard: route every high-speed trace as a controlled-impedance line (a fixed $Z_0$, usually 50 Ω, set by trace width and dielectric height) and terminate it in its own impedance. The reflection problem disappears not by fighting it but by removing the mismatch that caused it. I find this the cleanest of the three to reason about, even if it's rarely the cheapest.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The Smith chart is the geometry of equation (5). The reflection coefficient $\Gamma$ is a point inside the unit disk: the **centre is a perfect match** ($\Gamma = 0$, no reflection, no ring), and the **edge is a total mismatch** ($|\Gamma| = 1$, open or short). Impedance matching is the act of walking a load from wherever it sits toward that centre. Sweep the **frequency** control and watch the marker trace a path. The further it strays from centre, the worse the standing wave and the harsher the ringing. Matching a load is more or less the same problem as damping the ring, drawn in a different coordinate system. (The full geometry of why the chart works is its own post: [The Smith Chart is Geometry](/blog/smith-chart-is-geometry/).)

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Slowing the edge, adding series resistance, and matching the load look like three separate techniques in three separate chapters. They're three ways of moving the *same* point. Slowing the edge moves energy away from $\omega_0$; adding $R$ moves $\zeta$ up; matching $Z_L$ to $Z_0$ moves $\Gamma$ to the origin. Pick the knob that's cheapest on your board. They all push the system toward the same critically damped, reflection-free target.

## Cross-field: every wire is a control system

The deepest payoff of the RLC reframing connects signal integrity to a field that looks, on the surface, unrelated: control theory.

Equation (1), the second-order ODE with damping ratio $\zeta$ and natural frequency $\omega_0$, is the *defining* equation of a second-order control loop. The overshoot formula in equation (3) is the one a control engineer uses to tune a PID (proportional-integral-derivative) controller. The phase-locked loop (PLL) that recovers your clock is a second-order feedback system with exactly the same step response. They're all the same mathematics wearing different costumes.

That means the intuition transfers in both directions. A PID controller pushed to high gain overshoots and oscillates, and so does a trace with too little series resistance. A PLL that's underdamped rings before it locks, and so does an unterminated bus. If you've tuned a control loop, you already know how to damp a wire; if you've terminated a transmission line, you already know how to stabilise a feedback loop. The labs make the equivalence concrete: the [PID tuner](/lab/pid-tuner/), the [PLL lock-in](/lab/pll-lock-in/), and the [RLC resonance](/lab/rlc-resonance/) lab at the top of this page are *the same second-order step response* driven from three different desks.

So the final reframing is the title taken one step further: every wire is an RLC circuit, and every RLC circuit is a control system. The flat trapezoid was never real. What's real is a damped resonator settling toward its setpoint, and your job as a high-speed designer is the control engineer's: pick $\zeta$ so it gets there fast, without overshooting, every single edge, a billion times a second. When your eye diagram closes, you're not fighting noise. You're tuning a control loop you can't see.

## Reading further

- [Bogatin, *Signal Integrity — Simplified*, ch. 8 (Prentice Hall)](https://www.pearson.com/en-us/subject-catalog/p/signal-and-power-integrity-simplified/P200000009404). The canonical text that builds the whole field up from the lumped RLC model and the transmission-line picture; start here if you want the physical intuition before the math.
- [Johnson & Graham, *High-Speed Digital Design: A Handbook of Black Magic* (Prentice Hall)](https://www.pearson.com/en-us/subject-catalog/p/high-speed-digital-design-a-handbook-of-black-magic/P200000009385). The practitioner's bible on ringing, ground bounce, and termination, written as field-tested rules of thumb rather than derivations.
- [Pozar, *Microwave Engineering*, 4th ed., ch. 2 (Wiley)](https://www.wiley.com/en-us/Microwave+Engineering%2C+4th+Edition-p-9780470631553). The rigorous derivation of transmission lines, the reflection coefficient $\Gamma$, and characteristic impedance from Maxwell's equations.
- [Sedra & Smith, *Microelectronic Circuits* (Oxford University Press)](https://global.oup.com/academic/product/microelectronic-circuits-9780197508060). The clean second-order treatment of the RLC step response, damping ratio, and overshoot that underpins equations (1) through (3).
