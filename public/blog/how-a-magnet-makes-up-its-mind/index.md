---
title: How a magnet makes up its mind
date: '2026-07-13T00:00:00.000Z'
description: >-
  Cool a magnet through its critical temperature and a billion spins
  spontaneously agree on a direction nothing outside ever chose: the 2D Ising
  model, spontaneous symmetry breaking, and the universality that ties a magnet
  to boiling water and neural memory.
labels: 'physics,statistical-mechanics,phase-transitions'
release: true
heroImage: /blog/how-a-magnet-makes-up-its-mind/hero.webp
author: Ben Ebsworth
takeaways:
  - >-
    A ferromagnet below its critical temperature picks a direction with no field
    to tell it which way: spontaneous symmetry breaking, out of purely local
    rules.
  - >-
    The 2D Ising model orders at exactly kT_c = 2J / ln(1+√2) ≈ 2.269 J, the one
    case Lars Onsager solved exactly, in 1944.
  - >-
    At the critical point the correlation length diverges and the lattice looks
    the same at every scale, so a single order-parameter exponent β = 1/8
    captures the magnet.
  - >-
    Universality means a magnet, boiling water, and a Hopfield network share the
    same critical exponents; near Tc the microscopic details wash out.
markdown_url: /blog/how-a-magnet-makes-up-its-mind/
canonical_url: 'https://benebsworth.com/blog/how-a-magnet-makes-up-its-mind/'
---
## Key takeaways

- A ferromagnet below its critical temperature picks a direction with no field to tell it which way: spontaneous symmetry breaking, out of purely local rules.
- The 2D Ising model orders at exactly kT_c = 2J / ln(1+√2) ≈ 2.269 J, the one case Lars Onsager solved exactly, in 1944.
- At the critical point the correlation length diverges and the lattice looks the same at every scale, so a single order-parameter exponent β = 1/8 captures the magnet.
- Universality means a magnet, boiling water, and a Hopfield network share the same critical exponents; near Tc the microscopic details wash out.

## A magnet with no instructions still picks a direction

Take a lump of iron above a few hundred degrees and it is not a magnet. Its atoms each carry a tiny magnetic moment, a little arrow, but the arrows point every which way and average to nothing. Now let it cool. At one specific temperature, with no magnet nearby, no field, nothing outside telling the arrows which way to face, a billion of them suddenly agree. The lump becomes a magnet, and it had to *choose* a direction, north or south, out of thin air.

That is the strange bit. The laws governing the arrows are perfectly even-handed: flip every arrow at once and the energy doesn't change, so "up" and "down" are equally good. Yet below a critical temperature the material commits to one of them. The symmetry of the rules is not the symmetry of the outcome. Physicists call this spontaneous symmetry breaking, and the cleanest place to watch it happen is a toy model a graduate student wrote down in 1925.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Meet the lattice. Every cell holds a spin $s_i$ that is either $+1$ (up) or $-1$ (down), and it only talks to its four nearest neighbours. Right now the **temperature** sits near the critical value, and you can see the system can't make up its mind: black and white domains form, grow, and dissolve at every size, from single flipped cells to islands that span the whole grid.

Turn the **temperature** up and the pattern dissolves into a fine salt-and-pepper fizz, every spin doing its own thing. Cool it right down and one colour floods the lattice, a single opinion winning out. Somewhere between those two behaviours is the transition, and that is where all the interesting physics lives.

## The only two rules

Each spin feels two competing pressures. The first is its neighbours: aligning with them lowers the energy. The second is heat, which jostles the spins at random and cares nothing for alignment. Write the total energy of a configuration as a sum over neighbouring pairs, plus a term for any external field $h$ leaning on the spins:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
E = -J \sum_{\langle i,j \rangle} s_i s_j - h \sum_i s_i
```

$$
E = -J \sum_{\langle i,j \rangle} s_i s_j - h \sum_i s_i
$$

With $J > 0$, a pair pointing the same way ($s_i s_j = +1$) contributes $-J$ and lowers the energy; a mismatched pair costs $+J$. So the energy is happiest when everyone agrees. Set the field $h$ to zero and the tie between all-up and all-down is exact, which is the even-handedness we need for the magnet to *choose*.

Heat enters through statistics, not force. At temperature $T$ the probability of finding the system in a given configuration follows the Boltzmann weight: low-energy configurations are exponentially more likely, but the bias softens as $T$ climbs.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
P(\text{config}) = \frac{1}{Z}\, e^{-E / k_B T}
```

$$
P(\text{config}) = \frac{1}{Z}\, e^{-E / k_B T}
$$

Here $k_B$ is Boltzmann's constant and $Z$, the partition function, is just the sum of $e^{-E/k_B T}$ over every configuration so the probabilities add to one. Two knobs, $J$ and $T$, and their ratio decides everything.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Lining up costs the spins their freedom. Alignment minimises the energy $E$, but there is only one all-up state and astronomically many jumbled ones, so disorder has entropy $S$ on its side. What the system actually minimises is the free energy $F = E - TS$. At low $T$ the energy term wins and the spins order; at high $T$ the $TS$ term wins and they scramble. The phase transition is the temperature where the two terms trade places.

## Simulating it: Metropolis Monte Carlo

You can't sum over every configuration by hand. A modest 32×32 grid has $2^{1024}$ of them, more than there are atoms in the observable universe. So the lab does what every working physicist does and samples instead. The recipe is Metropolis Monte Carlo (Metropolis and co-workers, 1953), and it is almost suspiciously simple:

1. Pick a spin at random.
2. Work out $\Delta E$, the energy change if you flip it.
3. If the flip lowers the energy ($\Delta E \le 0$), accept it.
4. If it raises the energy, accept it anyway with probability $e^{-\Delta E / k_B T}$.

Repeat a few million times. That fourth step is the whole trick: the system is sometimes allowed an "uphill" move, and the temperature sets how often. Cold, and uphill moves almost never happen, so the lattice freezes into agreement. Hot, and they happen constantly, so it never settles. Run it long enough and the configurations you see appear with exactly the Boltzmann probability of equation (2), no derivation required.

## The transition, and the number Onsager found

Turn the **temperature** in the lab slowly downward and there is a moment where the fizz stops being fizz and starts being domains. For the 2D square lattice that moment sits at a precise value:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
k_B T_c = \frac{2J}{\ln(1 + \sqrt{2})} \approx 2.269\,J
```

$$
k_B T_c = \frac{2J}{\ln(1 + \sqrt{2})} \approx 2.269\,J
$$

Above $T_c$ the net magnetisation is zero: as many spins up as down, no overall direction. Below it, a nonzero fraction of the spins agree, and the material carries a real magnetisation even with the field switched off. That fraction is the *order parameter* $M$, the single number that tells you which phase you're in. It is zero in the disordered phase and climbs towards one as you cool.

Lars Onsager then did something people had thought impossible. In 1944 he solved the 2D model exactly, with no external field, and wrote the magnetisation down in closed form.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
M(T) = \left[\, 1 - \sinh^{-4}\!\left(\frac{2J}{k_B T}\right) \right]^{1/8}
```

$$
M(T) = \left[\, 1 - \sinh^{-4}\!\left(\frac{2J}{k_B T}\right) \right]^{1/8}
$$

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

A magnet is a room full of arrows agreeing on a direction that nothing outside the room ever specified.

Look at how $M$ switches on. Just below $T_c$ it doesn't ramp up gently. It rises with that $1/8$ power, a curve that leaves zero with an infinite slope. Near the critical point we write $M \sim (T_c - T)^\beta$, and Onsager's formula hands you $\beta = 1/8$ exactly. That $\beta$ is our first *critical exponent*, and it is where the story stops being about magnets in particular.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The exact results assume an infinite lattice. The grid in the lab is finite, so the transition you watch is a little blurred: the magnetisation above $T_c$ jitters around zero rather than sitting flat at it, and the sharp corner in $M(T)$ is rounded off. Make the lattice bigger and the transition sharpens towards Onsager's ideal. This finite-size rounding is not a flaw in the simulation. It is a real, well-studied effect, and physicists turn it around to *measure* critical exponents from how the rounding scales with system size.

## Why the same numbers keep turning up

Approach $T_c$ and a second quantity misbehaves: the correlation length $\xi$, the typical size of an aligned domain. Far from $T_c$ it is a few lattice spacings across. As you close in on $T_c$ it grows without bound, and *at* $T_c$ it diverges. That divergence is exactly what you're watching when domains appear at every size at once. With no characteristic length left, the lattice looks statistically the same whether you squint at ten cells or a thousand. It has gone scale-free.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Here is the punchline that turned this into a whole field. The exponents like $\beta = 1/8$ don't depend on the microscopic details: not the lattice shape, not the precise strength of $J$, not whether the "spins" are atomic moments or something else entirely. They depend only on coarse features like the dimension of the system and the number of components the order parameter has. Systems that could not look less alike up close fall into the same *universality class* and share the same exponents near their critical point. The magnet has forgotten it is a magnet.

Kenneth Wilson explained *why* in the early 1970s, and it won him a Nobel Prize. His renormalisation group takes the scale-free lattice at $T_c$ and repeatedly blurs it: average each block of spins into one, zoom out, repeat. Because the critical system looks the same at every scale, the blurring flows towards a fixed point, and everything that once told one system apart from another (the lattice, the exact $J$) gets averaged away in the first few steps. What survives the blurring is only the dimension and the symmetry, and those alone fix the exponents. Universality is not a coincidence. It is what is left once you throw away everything that isn't scale-invariant.

This is why the Ising model earns your time even if you never touch a magnet. The liquid-gas critical point (the temperature and pressure where the distinction between water and steam vanishes) sits in the *same universality class* as the 3D Ising magnet. Swap "spin up or down" for "dense or sparse region" and the order parameter, the exponents, the whole critical behaviour carry straight across. Boiling water and a cooling magnet are, near their critical points, the same problem wearing different clothes.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Ernst Ising solved the model in one dimension for his 1925 thesis, a single chain of spins, and found no phase transition at any temperature above absolute zero: a lone thermal flip splits the chain cheaply, so order never survives. He concluded the model was a failure and, discouraged, left research physics for years. He was half right. The 1D chain really doesn't order. What he couldn't have known is that two dimensions is a different animal, where breaking a domain costs a whole *boundary* of mismatched pairs, and Onsager's 1944 solution proved the 2D model orders after all. The lesson stuck: dimensionality is not a detail. It can decide whether a phase transition exists at all.

## The same trick, elsewhere

Local rules producing global order is not unique to spins. The **reaction-diffusion** system below has a completely different cast, two chemicals that react and spread, and yet it plays the same game: nothing in the equations specifies a stripe or a spot, and the pattern that emerges still spans the whole dish. Watch a global structure organise itself out of purely neighbour-to-neighbour rules.

> [LabCanvas component] Inline interactive lab canvas. Embeds any effect registered in `lib/lab/registry.ts` (referenced by its `effect` slug) as a live Canvas2D/WebGL visualisation, with the effect's own controls rendered below unless `controls={false}`. Optional `params` override the effect's defaults and `caption` adds a figcaption. The rendered post has the live, interactive version; this is a static placeholder for the markdown-only sibling — read the matching lab explainer under `/lab/<slug>/` for the full description of what the effect shows.

The connection reaches into computing, too. A Hopfield network, one of the founding models of neural memory, is an Ising model in disguise: neurons standing in for spins, learned synaptic weights standing in for the uniform coupling $J$. Storing a memory means carving an energy minimum for the network to roll into, exactly as a magnet rolls into its all-up or all-down ground state. Recalling a memory is the network relaxing to the nearest minimum, the same settling that let our lattice pick a direction. The maths that decides which way a magnet points also decides how a network remembers a face.

So the next time your compass swings north, remember there was a moment, deep in the iron's history, when north and south were equally on offer and the atoms simply had to pick. The lab up top lets you rerun that decision as often as you like: cool it through 2.269 and watch a billion arrows make up their collective mind, with nobody in charge. Next time we can let the field $h$ back in and watch hysteresis appear, the magnet's memory of which way it was last pushed. Have a play with the temperature knob first.

## Reading further

- [Ernst Ising, "Beitrag zur Theorie des Ferromagnetismus" (Zeitschrift für Physik, 1925)](https://link.springer.com/article/10.1007/BF02980577). The original thesis paper that solved the 1D chain and found no transition. Short, and a lesson in how a "negative" result can still name a field.
- [Lars Onsager, "Crystal Statistics. I." (Physical Review 65, 117, 1944)](https://journals.aps.org/pr/abstract/10.1103/PhysRev.65.117). The exact 2D solution, one of the hardest and most celebrated calculations in statistical mechanics. Equations (3) and (4) are its headline results.
- [Kenneth G. Wilson, "The renormalization group: Critical phenomena and the Kondo problem" (Reviews of Modern Physics 47, 773, 1975)](https://journals.aps.org/rmp/abstract/10.1103/RevModPhys.47.773). The Nobel-winning account of why universality holds: blur the scale-free critical system and watch the microscopic details flow away. Builds on Leo Kadanoff's block-spin picture of 1966.
- [James P. Sethna, *Statistical Mechanics: Entropy, Order Parameters, and Complexity*](https://sethna.lassp.cornell.edu/StatMech/). The modern textbook that puts order parameters and universality at the centre. Free online, and the single best source for everything above.
