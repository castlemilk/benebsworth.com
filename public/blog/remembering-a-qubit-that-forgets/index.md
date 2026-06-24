---
title: Remembering a qubit that forgets
date: '2026-06-24T11:00:00.000Z'
author: Ben Ebsworth
description: >-
  Every physical qubit forgets within microseconds and can smudge in two
  directions at once, yet you can weld many forgetful qubits into one logical
  qubit that remembers, and spending more of them lowers the error rate, but
  only once each qubit is good enough. The trick is to measure the neighbours'
  parity and never the data. We build the surface code by hand, watch errors
  become chains whose endpoints light up, and see why Google's Willow result
  mattered.
labels: 'physics,quantum,quantum computing,error correction,surface codes'
release: true
heroImage: /blog/remembering-a-qubit-that-forgets/hero.webp
takeaways:
  - >-
    Spending more physical qubits per logical qubit lowers the logical error
    rate exponentially, but only below a threshold. Above it, more qubits make
    things strictly worse, which is exactly why Google's Willow result mattered.
  - >-
    You can correct a qubit you are forbidden to copy and forbidden to read,
    because a parity (syndrome) measurement reveals where an error landed
    without revealing the encoded state. It collapses the error, not the
    information.
  - >-
    Quantum errors are continuous and two-dimensional (X and Z), but measuring a
    stabiliser discretises them into a handful of Pauli flips, turning an analog
    noise problem into a digital one you can decode.
  - >-
    On the surface code an error is a chain of flips and the syndrome is only
    its two endpoints, so correcting the qubit is the geometry problem of
    pairing up endpoints with the shortest total path.
markdown_url: /blog/remembering-a-qubit-that-forgets/
canonical_url: 'https://benebsworth.com/blog/remembering-a-qubit-that-forgets/'
---
## Key takeaways

- Spending more physical qubits per logical qubit lowers the logical error rate exponentially, but only below a threshold. Above it, more qubits make things strictly worse, which is exactly why Google's Willow result mattered.
- You can correct a qubit you are forbidden to copy and forbidden to read, because a parity (syndrome) measurement reveals where an error landed without revealing the encoded state. It collapses the error, not the information.
- Quantum errors are continuous and two-dimensional (X and Z), but measuring a stabiliser discretises them into a handful of Pauli flips, turning an analog noise problem into a digital one you can decode.
- On the surface code an error is a chain of flips and the syndrome is only its two endpoints, so correcting the qubit is the geometry problem of pairing up endpoints with the shortest total path.

Here is a promise that sounds like it breaks a conservation law: take a pile of components that each fail constantly, and build from them a single component that almost never fails. Worse, the more of the unreliable parts you spend, the more reliable the whole becomes. That's not how a chain works, where one weak link sinks everything. It's how *error correction* works, and the quantum version of it is one of the loveliest pieces of engineering I know.

A qubit is a desperately fragile thing. In the [Bloch sphere post](/blog/every-qubit-gate-is-a-rotation/) we drew its state as an arrow on a sphere, and every [stray interaction](/blog/quantum-tunnelling-you-can-see/) with the outside world nudges that arrow until the information is gone, usually within microseconds. So before quantum computers can do anything useful, they have to solve a memory problem: how do you remember a qubit that forgets?

## A bit that forgets two ways at once

A classical bit fails one way: it flips, 0 to 1. A qubit is worse, because its arrow can topple in two independent directions.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

A *bit-flip* (the Pauli $X$) rotates the arrow 180° about the $x$ axis, swapping north and south, the quantum version of 0 becoming 1. A *phase-flip* (the Pauli $Z$) rotates it about the $z$ axis, spinning the equator round so $\lvert+\rangle$ becomes $\lvert-\rangle$. These are genuinely different failures, and a real qubit suffers both at once. Whatever scheme we build has to catch two kinds of error, not one.

## Why you can't just photocopy it

Classical error correction is almost insultingly simple: store every bit three times, and if one copy disagrees, take the majority vote. The obvious move is to do the same here. It's illegal, twice over.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
U(|\psi\rangle\otimes|0\rangle) = |\psi\rangle\otimes|\psi\rangle \;\;\Rightarrow\;\; \langle\psi|\phi\rangle = \langle\psi|\phi\rangle^2 \;\Rightarrow\; \langle\psi|\phi\rangle\in\{0,1\}
```

$$
U(|\psi\rangle\otimes|0\rangle) = |\psi\rangle\otimes|\psi\rangle \;\;\Rightarrow\;\; \langle\psi|\phi\rangle = \langle\psi|\phi\rangle^2 \;\Rightarrow\; \langle\psi|\phi\rangle\in\{0,1\}
$$

That one line is the no-cloning theorem: you cannot build a machine that copies an unknown quantum state. And even if you could, reading a copy to check it would *measure* it, collapsing the very superposition you're trying to protect. So we're cornered into a strange task: correct something you may neither copy nor look at.

## Measure the agreement, not the message

The way out is to stop asking "what is this qubit?" and start asking "do these qubits still agree?". A *parity* check, the answer to "is the number of flips here even or odd?", is a yes/no question that, set up correctly, commutes with the encoded information. It can tell you an error happened without telling you a thing about the state you're hiding.

The warm-up is the three-qubit repetition code. Encode your logical bit across three qubits and measure two parities, "do qubits 1 and 2 match?" and "do qubits 2 and 3 match?". Those two answers, the *syndrome*, point straight at which qubit flipped, and you flip it back. You never learned the data, only the disagreements.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
S_i\,|\psi_L\rangle = +1\,|\psi_L\rangle \quad\text{for all } S_i,\qquad [S_i, S_j] = 0
```

$$
S_i\,|\psi_L\rangle = +1\,|\psi_L\rangle \quad\text{for all } S_i,\qquad [S_i, S_j] = 0
$$

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Quantum errors look hopeless because they're continuous: a rotation by 3.7° is a different error from one by 3.8°, an uncountable infinity of ways to go wrong. The quiet miracle of the parity check is that it *discretises* them. Projecting onto the ±1 eigenspaces of the checks collapses any tiny continuous rotation into either "no error" or "a full Pauli flip here", with the right probabilities. You end up correcting a clean digital error you never quite committed, because the measurement chose it for you. An analog problem becomes a digital one, and that's the only reason error correction can ever terminate.

## Two codes woven into one lattice

The repetition code has a fatal gap: it catches bit-flips and is completely blind to phase-flips. The surface code's answer is to run two repetition codes at once, woven through the same 2D lattice at right angles, one watching for $X$ errors and one for $Z$. Data qubits sit on the edges; parity checks (the stabilisers) sit on the faces, each one a four-qubit "do my neighbours agree?". Click around and inject some errors.

> [SurfaceCodeLattice component] An interactive surface-code lattice for the "remembering a qubit that forgets" post. Data qubits sit on the edges of a square lattice with X- and Z-type stabiliser plaquettes; an X/Z toggle lets the reader click data qubits to inject Pauli errors, and every affected stabiliser lights up as a syndrome computed from the live parity of its neighbours. Because interior checks see an even number of flips, a chain of errors lights only its two endpoints, making concrete that the syndrome is the boundary of the error; a distance slider (3/5/7) grows the patch and an optional decoder runs minimum-weight matching to show when an error chain is corrected versus when it spans the lattice and becomes a logical error. The rendered post has the live version.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

For the two codes to coexist, every $X$-type check and every $Z$-type check has to commute, otherwise measuring one would scramble the other. They commute precisely because each $X$-plaquette overlaps each $Z$-plaquette on an even number of qubits, zero or two. That single geometric constraint, even overlap everywhere, is what lets a 2D surface code exist at all rather than collapsing into a tangle of incompatible measurements. The whole architecture hangs off it.

## Errors are chains, syndromes are their endpoints

Inject not one error but a line of them, and something elegant happens: only the two stabilisers at the *ends* of the line light up. Every check in the interior sees two flips, an even number, so it stays silent. The syndrome isn't the error; it's the *boundary* of the error.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\sigma(E) = \partial E,\qquad S_i\,E = (-1)^{|\,i\cap E\,|}\,E\,S_i
```

$$
\sigma(E) = \partial E,\qquad S_i\,E = (-1)^{|\,i\cap E\,|}\,E\,S_i
$$

This should feel familiar if you read the [random walk post](/blog/why-everything-becomes-a-bell-curve/).

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

A random walk is summarised by where it started and where it ended; the wandering path in between washes out. An error chain is the same: the parity checks can only see its two endpoints, and the exact route it took through the interior is invisible to them. That's a feature, not a loss. We don't need the route, only the endpoints, to work out how to undo it.

## Decoding is pairing up the lights

So you're handed a scatter of lit syndromes and asked: what error most likely caused these? The endpoints have to be paired up, and since a shorter error chain is more probable than a longer one, you want the pairing with the smallest total length. That's *minimum-weight perfect matching*, Edmonds' blossom algorithm from 1965, and it's exactly a routing problem.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The lit syndromes are cities. The cost of joining two of them is the length of the shortest error chain between them, a shortest-path search across the lattice. The decoder wants the cheapest way to pair up every city, then applies the matching as its correction. A real decoder is a routing engine running on a stopwatch, because it has to finish before the next round of errors lands a microsecond later.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Decoding fails when an error chain stretches clear across the lattice and the matcher pairs its endpoints the wrong way round, applying a "correction" that, combined with the real error, wraps the whole patch and flips the logical qubit. The longer the chain has to be to span the patch, the rarer that is. So the *distance* of the code, the length of the shortest error that can cause a logical failure, is the dial that sets how safe you are. Bigger patch, longer required chain, exponentially rarer failure.

## Below threshold: more qubits, fewer errors

Now the payoff, and the counter-intuitive heart of the whole field. Write $d$ for the code distance and $p$ for the physical error rate of one qubit per cycle. The logical error rate goes as a power of $d$:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

p_th the base is above 1 and more qubits make it worse. The whole game is getting p below threshold." latex="p_L \;\approx\; A\left(\frac{p}{p_{\text{th}}}\right)^{\lfloor d/2\rfloor + 1}">

$$
p_L \;\approx\; A\left(\frac{p}{p_{\text{th}}}\right)^{\lfloor d/2\rfloor + 1}
$$

Everything turns on whether the ratio $p/p_\text{th}$ is below 1 or above it. Drag the operating point across the threshold here and watch the curves for different code sizes fan apart.

> [ThresholdCurve component] A log-log threshold-curve plot for the QEC post, showing the logical error rate versus the physical error rate for several code distances (3/5/7/9). All curves cross at the code threshold p_th; below it they fan downward so larger codes suppress errors exponentially, while above it they fan upward so larger codes make things worse — the counter-intuitive heart of the threshold theorem. A draggable operating-point marker reports each distance's logical error rate, the per-two-distance suppression factor Λ, and whether you are below or above threshold, echoing Google's Willow demonstration of Λ ≈ 2.14. The rendered post has the live version.

Below threshold, every extra ring of qubits multiplies the logical error rate by a fixed factor smaller than 1, so errors fall off a cliff as you scale. Above threshold, the same spending makes things *worse*. We can name how much each step buys you:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

\;1">

$$
\Lambda \;=\; \frac{p_L(d)}{p_L(d+2)} \;\approx\; \sqrt{\frac{p_{\text{th}}}{p}}\;>\;1
$$

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

For two decades this was the embarrassing asterisk on every error-correction talk. The theory promised exponential suppression, but if each physical qubit fails more often than $p_\text{th}$, adding qubits just adds more places to fail faster than the code can mop up, so the logical error goes *up* with distance. No hardware had ever shown a larger code beating a smaller one. "More qubits is better" is simply false until your qubits are good enough, and only then is it violently true.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

In 2024 Google's Willow processor became the first to show it, running surface codes at distance 3, then 5, then 7 and watching the logical error rate *drop* at each step, with a suppression factor of about 2.14. That's the experimental moment the curves above stopped being a hopeful extrapolation and became a measurement. It's one device, one kind of qubit, one demonstration, but the line has been crossed.

## The bill: thousands of qubits for one

None of this is cheap. A logical qubit good enough to run a real algorithm needs a distance somewhere around 20 to 30, and a few non-obvious extras.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

That's the honest cost of fault tolerance, and here's the analogy that finally made it sit still in my head. A logical qubit is the quantum world's RAID array. RAID builds a reliable volume out of unreliable disks by storing *parity*, never a second copy of the data, and reconstructing a lost block from the parity of its siblings, which is exactly the move here: measure the neighbours' parity, never read the data. RAID even has a threshold of its own, below some per-disk failure rate adding spindles raises reliability and above it you've just added more things to break. Fault tolerance isn't a quantum exotic. It's parity and redundancy wearing a lab coat.

## Recap

A qubit forgets in two directions and can't be copied or read, so we protect it by measuring parities instead, which discretise continuous errors and reveal where they happened without revealing the state. The surface code weaves two such codes through one lattice; errors become chains whose endpoints are the syndrome, and decoding is the geometry of pairing those endpoints by shortest path. Make the patch bigger and the logical error falls exponentially, but only once each physical qubit is below threshold, the line Willow finally crossed.

## Reading further

- **Fowler, Mariantoni, Martinis & Cleland (2012), *Surface codes: Towards practical large-scale quantum computation***: the canonical engineering reference for layout, syndromes, decoding and budgets. [PhysRevA 86, 032324](https://doi.org/10.1103/PhysRevA.86.032324)
- **Kitaev (2003), *Fault-tolerant quantum computation by anyons***: the original toric/surface code, errors as worldlines and logicals that wrap the torus. [Ann. Phys. 303, 2](https://doi.org/10.1016/S0003-4916(02)00018-0)
- **Google Quantum AI (2024), *Quantum error correction below the surface code threshold***: the Willow result, $d = 3 \to 5 \to 7$ suppression with $\Lambda \approx 2.14$. [Nature](https://doi.org/10.1038/s41586-024-08449-y)
- **Devitt, Munro & Nemoto (2013), *Quantum error correction for beginners***: a gentle walk from the repetition code through stabilisers to surface codes. [Rep. Prog. Phys. 76, 076001](https://doi.org/10.1088/0034-4885/76/7/076001)

The threshold has now been crossed exactly once, in one lab, for one kind of qubit. So the open problem has quietly changed from "is fault tolerance even possible?" to "how cheaply can we manufacture it?", which is a far better problem to be stuck on. Watch this space.
