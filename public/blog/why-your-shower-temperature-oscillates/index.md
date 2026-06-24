---
title: Why your shower temperature oscillates
date: '2026-06-23T00:00:00.000Z'
author: Ben Ebsworth
description: >-
  The scalding-then-freezing shower dance isn't you being bad at taps — it's a
  feedback loop fighting a time delay, and it has a name. We meet the PID
  controller behind thermostats, cruise control and showers, tune one live, and
  find out why a little lag turns sensible corrections into oscillation.
labels: 'electrical-engineering,control,feedback'
release: true
heroImage: /blog/why-your-shower-temperature-oscillates/hero.webp
takeaways:
  - >-
    A shower, a thermostat and cruise control are the same thing: a feedback
    loop comparing a measurement to a setpoint and acting on the error. When you
    adjust a shower, you ARE the controller.
  - >-
    Oscillation comes from gain racing a time delay. The pipe lag means your
    correction lands too late, so a strong correction overshoots, and you chase
    the temperature back and forth.
  - >-
    PID splits the job three ways: P reacts to the present error, I erases
    steady-state offset by accumulating the past, D anticipates by watching the
    rate of change. Too much P oscillates; too much D amplifies noise; I left
    unchecked winds up.
markdown_url: /blog/why-your-shower-temperature-oscillates/
canonical_url: 'https://benebsworth.com/blog/why-your-shower-temperature-oscillates/'
---
## Key takeaways

- A shower, a thermostat and cruise control are the same thing: a feedback loop comparing a measurement to a setpoint and acting on the error. When you adjust a shower, you ARE the controller.
- Oscillation comes from gain racing a time delay. The pipe lag means your correction lands too late, so a strong correction overshoots, and you chase the temperature back and forth.
- PID splits the job three ways: P reacts to the present error, I erases steady-state offset by accumulating the past, D anticipates by watching the rate of change. Too much P oscillates; too much D amplifies noise; I left unchecked winds up.

You know the dance. You step in, it's cold, you crank the tap toward hot. Nothing happens, so you crank it further. Then a wall of scalding water arrives, you recoil and yank it back toward cold, overshoot, and now it's freezing again. A few cycles of this and you either find the spot or give up and accept lukewarm. It feels like incompetence, but it isn't. You're a control system fighting a time delay, and the fact that you oscillate is a predictable, named phenomenon that engineers design around every day.

Showers, thermostats, cruise control, an oven, the autopilot holding a heading: under the skin they're all the same loop. Once you see the loop, the shower stops being annoying and starts being a little physics demo you stand in every morning.

## You are the controller

Every feedback loop has the same four parts. A **setpoint** (the temperature you want), a **measurement** (what your skin reports), an **error** (the gap between them), and an **actuator** (the tap) that you move to shrink the error.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
e(t) = r(t) - y(t)
```

$$
e(t) = r(t) - y(t)
$$

Here $r$ is the reference (desired temperature) and $y$ is the measured output. The whole game is driving $e$ to zero and keeping it there. The simplest strategy, and the one your hand reaches for instinctively, is **proportional control**: push the tap in proportion to how wrong things are. Big error, big correction; small error, gentle nudge. Correction $u = K_p\, e$, and $K_p$ is how aggressive you are.

That works beautifully when the system responds instantly. Showers don't.

## The delay is the villain

Between turning the tap and feeling the change, there's a pipe full of water that has to flush through. That **dead time** is the whole problem. Your correction is based on a temperature that's already several seconds old, so a strong proportional response sends a big slug of hot water that you won't feel until it's too late to take it back. By the time it arrives you've often corrected again, stacking the changes. The result is overshoot, then over-correction, then oscillation.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Oscillation is what happens when your eagerness outruns your information. With no delay, you could use a huge $K_p$, slam the error to zero and stop. Add delay and that same aggressive gain becomes a liability: every correction is a bet on stale data, and a big bet on stale data overshoots. Crank the gain past a critical point and the loop won't just overshoot once, it'll oscillate forever, each swing feeding the next. The cure is either to be gentler (lower $K_p$), to anticipate (the D term, below), or to genuinely wait out the lag between adjustments, which is the grown-up shower technique nobody tells you.

## Tune one yourself

Rather than describe it, here's the loop to play with. It's a PID-controlled second-order system: drag the three gains and watch the step response settle, overshoot, or ring.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Start with only $K_p$. Low, and it's sluggish and never quite arrives. Raise it and it gets snappier, then starts overshooting, then rings like a struck bell. Now add a touch of $K_d$ and watch the ringing calm down. That term is reacting to how *fast* the error is changing and pushing back against the swing before it overshoots. Finally, notice that proportional control alone settles a little short of the target. Add $K_i$ and the gap closes. Three knobs, three jobs.

## The three terms

That's the whole PID controller: present, past, and future error, added together.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
u(t) = K_p\, e(t) + K_i \int_0^t e(\tau)\,d\tau + K_d\, \frac{de(t)}{dt}
```

$$
u(t) = K_p\, e(t) + K_i \int_0^t e(\tau)\,d\tau + K_d\, \frac{de(t)}{dt}
$$

- **P, the present.** Proportional to the current error. Does the bulk of the work, but on its own leaves a small permanent offset.
- **I, the past.** Integrates the error over time, so even a tiny lingering offset accumulates until the controller has pushed it out. This is what gets you *exactly* to temperature, not nearly.
- **D, the future.** Looks at the rate of change and reacts to where the error is *heading*. It's the anticipation that lets you damp a swing before it overshoots.

Why does plain proportional control fall short? Because at steady state the only thing producing any correction is the error itself, so the error can't actually reach zero: it settles at whatever small value keeps the tap where it needs to be. For a simple system the leftover offset is

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
e_\infty = \frac{1}{1 + K_p}
```

$$
e_\infty = \frac{1}{1 + K_p}
$$

You can shrink that by cranking $K_p$, but we've just seen where that road leads: oscillation. The integral term is the honest fix.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The integral term has a sharp edge. If the error stays large for a while (say the tap is already fully open but the water just isn't hot enough yet), the integral keeps accumulating a correction the actuator can't deliver. When things finally catch up, that built-up demand has to unwind, and the system blows past the setpoint hugely before recovering. This is "integral windup", and it's behind a surprising number of real-world control disasters. The fix is to stop accumulating once the actuator saturates ("anti-windup"). If you've ever had an oven rocket past its target after a slow start, you've probably watched windup happen.

Too much D has its own failure: it's differentiating the measurement, and differentiation amplifies noise, so a jittery sensor and a big $K_d$ make the controller twitch at shadows. Tuning PID is the art of balancing these three against the system's lag, and there are recipes (Ziegler–Nichols is the famous one) for getting close before you fine-tune by hand.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Here's the cross-field connection I can't resist. A [phase-locked loop](/blog/pll-from-first-principles/), the circuit that keeps your radio tuned and your CPU clock honest, is exactly this same loop with the temperature swapped for phase: it compares the phase of an incoming signal to its own oscillator, and a loop filter (a P plus an I, basically) drives the error to zero. Same equations, completely different hardware. Once you have the controller in your head you start seeing it everywhere — in circuits, in robotics, in your shower, arguably in the way a central bank chases inflation with a lag.

Which is the food-for-thought note I'll leave on. Humans are genuinely bad at controlling systems with long delays, because our instinct is proportional and impatient: we see no response, so we push harder, and the delayed reaction then overshoots. Showers, yes, but also slow-moving things like an economy or a climate, where the "tap" we turn today won't be felt for years. The shower is the harmless version of a mistake we make at much larger scales.

## Recap

Your shower oscillates because you're running a proportional controller against a time delay, and gain racing lag is the recipe for ringing. The professional fix is PID: react to the present error, accumulate the past to kill the offset, and anticipate the future to damp the swing, all while watching out for windup and noise. Next time you're doing the cold-hot dance, try the engineer's move: make a small change and *wait* for the pipe to flush before judging it. You'll lock on in two moves instead of ten.

## Reading further

- **Åström & Murray, *Feedback Systems***: the modern standard, rigorous and free online, with PID treated properly. [fbsbook.org](https://fbsbook.org/)
- **Franklin, Powell & Emami-Naeini, *Feedback Control of Dynamic Systems***: the classic course textbook if you want the full control-theory treatment.
- **Ziegler & Nichols (1942), *Optimum Settings for Automatic Controllers***: the original tuning recipe, still taught and still used. A nice piece of practical engineering history.
- **Brett Beauregard, *Improving the Beginner's PID***: a wonderful blog series on the real-world gotchas (windup, derivative kick, sample time) from someone who wrote a widely-used PID library. [brettbeauregard.com](http://brettbeauregard.com/blog/2011/04/improving-the-beginners-pid-introduction/)
