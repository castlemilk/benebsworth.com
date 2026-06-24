---
title: Three rules build a computer
date: '2026-06-23T00:00:00.000Z'
author: Ben Ebsworth
description: >-
  Conway's Game of Life has three rules and a grid of on-or-off cells, and
  nothing else. From that, gliders crawl, guns fire, and — astonishingly — you
  can build a working computer. We play with the rules, watch structure emerge
  that nobody designed, and follow the thread to its unsettling end: a system
  this simple can be impossible to predict.
labels: 'software,emergence,cellular-automata'
release: true
heroImage: /blog/three-rules-build-a-computer/hero.webp
takeaways:
  - >-
    Three local rules on a grid of on/off cells produce gliders, oscillators and
    guns — complex global behaviour nobody designed, emerging from dead-simple
    local interactions.
  - >-
    Gliders carry information and guns produce streams; arrange their collisions
    and you get logic gates, memory, and a universal computer. The Game of Life
    is Turing-complete.
  - >-
    Because it can compute anything, it inherits the halting problem: there's no
    general shortcut to its far future. For many boards the only way to know
    what happens is to run them — computational irreducibility.
markdown_url: /blog/three-rules-build-a-computer/
canonical_url: 'https://benebsworth.com/blog/three-rules-build-a-computer/'
---
## Key takeaways

- Three local rules on a grid of on/off cells produce gliders, oscillators and guns — complex global behaviour nobody designed, emerging from dead-simple local interactions.
- Gliders carry information and guns produce streams; arrange their collisions and you get logic gates, memory, and a universal computer. The Game of Life is Turing-complete.
- Because it can compute anything, it inherits the halting problem: there's no general shortcut to its far future. For many boards the only way to know what happens is to run them — computational irreducibility.

In 1970 the mathematician John Conway invented a game with no players. You take a grid of cells, each either alive or dead, and apply three rules over and over. That's the entire thing: no input, no scoring, no goal. It should be boring. Instead it turned out to contain crawling creatures, oscillating machines, factories that spit out a stream of gliders, and (this is the part that still amazes me) enough machinery to build a general-purpose computer. Out of three rules. A whole universe of behaviour, none of it designed, all of it just *implied* by those rules from the start.

This is the cleanest example I know of **emergence**: simple local rules producing complex global behaviour that nobody put there on purpose. Let's play with it, and then follow the thread to where it gets genuinely strange.

## The rules

Each cell looks at its eight neighbours and counts how many are alive:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
n = \sum_{(\Delta x,\Delta y)\neq(0,0)} \text{cell}(x+\Delta x,\; y+\Delta y)
```

$$
n = \sum_{(\Delta x,\Delta y)\neq(0,0)} \text{cell}(x+\Delta x,\; y+\Delta y)
$$

Then it updates by three rules, usually written **B3/S23** (born on 3, survives on 2 or 3):

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
s' = \begin{cases} 1 & s=1 \text{ and } n \in \{2,3\} \\ 1 & s=0 \text{ and } n = 3 \\ 0 & \text{otherwise} \end{cases}
```

$$
s' = \begin{cases} 1 & s=1 \text{ and } n \in \{2,3\} \\ 1 & s=0 \text{ and } n = 3 \\ 0 & \text{otherwise} \end{cases}
$$

Too few neighbours and a cell dies of loneliness; too many and it dies of crowding; just right and it lives or is born. Every cell applies these at once, the board ticks forward, and you repeat. Here it is. Press play, draw your own cells, or load one of the famous patterns.

> [GameOfLife component] An interactive Conway's Game of Life on a 50×30 toroidal grid running B3/S23 (a live cell with 2–3 neighbours survives, a dead cell with exactly 3 is born) for the "three rules build a computer" post. Controls cover play/pause, single step, clear, randomise, speed, and a pattern library (Glider, LWSS, Pulsar, Gosper glider gun); click or drag paints cells, and counters show generation and population. From three local rules emerge gliders, oscillators, and the glider gun — and gliders plus guns are enough to build logic gates, which is why Life is Turing-complete. The rendered post has the live version.

## Nobody designed the glider

Start it from a random scatter and most of it quickly burns down to little still lifes and blinkers. But load a **glider** (the five-cell arrow) and something different happens: it cycles through four shapes and ends up one square diagonally over from where it began. It *walks*. Load the **Gosper glider gun** and you get a machine that periodically fires gliders off across the grid forever.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Here's what I find hard to get over. Conway didn't design the glider. He picked three rules that gave interesting-looking behaviour, and the glider was *already in them*, waiting to be found: as were the gun, the puffers, the long-lived "Methuselahs" that churn for thousands of generations before settling. The rules are the complete specification of the system, and yet you cannot read the glider off the rules by inspection; you have to run them and watch it appear. The complexity isn't added from outside. It's latent in the simplicity, which is a genuinely strange thing for simplicity to contain.

## From gliders to logic gates

Now the leap that takes this from a curiosity to something profound. A glider is a moving packet of information: a bit, travelling. A gun is a clock, emitting bits at a fixed rate. And when streams of gliders **collide**, the outcome depends on whether both, one, or neither were present. That's the raw material of logic: arrange collisions so that two glider streams produce an output stream only when both inputs are present and you've built an AND gate. Other arrangements give OR and NOT. Wire enough gates together and you have memory, a clock, and arithmetic.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Logic gates plus memory plus a clock is, in principle, everything you need to compute anything a computer can compute. People have actually built it: there are Life patterns implementing full logic circuits, binary counters, and even a complete, working Turing machine laid out as a vast field of guns and gliders. So the Game of Life is **Turing-complete**. It can run any algorithm, simulate any computer, in principle play any game or compute any function, all by setting up the right initial pattern of live cells. Three rules on a grid are enough to build a universal machine. That still sounds absurd to me, and it's true.

## The catch: you can't skip to the end

Turing-completeness gives, but it also takes away, and what it takes is *predictability*. Once a system can compute anything, it inherits the famous limit on computation: the **halting problem**. There is no general algorithm that can tell you whether an arbitrary program (and therefore an arbitrary Life pattern) will eventually settle, die out, or grow forever, short of running it and seeing.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

For lots of Life boards there's simply no shortcut to the future. You cannot derive what generation ten-thousand looks like by clever maths; the *fastest* way to find out is to simulate all ten thousand steps. Stephen Wolfram calls this **computational irreducibility**: the system is its own quickest description, and no formula leapfrogs the work. It's a humbling thing to bump into: a system you can specify in two lines whose behaviour is provably beyond prediction. Notice this is a *different* reason for unpredictability than the [chaos in the Lorenz system](/blog/lorenz-and-the-limits-of-prediction/): chaos is sensitivity to initial conditions, where tiny errors blow up; this is irreducibility, where even with perfect knowledge there's no shortcut but to run it. Two different walls, and Life hits both.

Some food for thought, and I'll keep it light because it's the kind of idea that's fun precisely because you can't settle it: if three rules on a grid can host gliders, guns, and a universal computer, and if its far future is unpredictable except by living through it, how confident should we be that *our* universe isn't something similar: a simple rule, run forward, whose richness (including us) is emergent and whose future is computationally irreducible? I don't believe we live in Conway's grid. But the Game of Life makes the idea that complexity and unpredictability can come from almost nothing feel a lot less far-fetched than it has any right to. Conway himself, by the way, grew a bit tired of how much the Game overshadowed his deeper mathematics, a nice reminder that you don't always get to choose which of your ideas takes over the world.

## Recap

Three rules — born on 3, survive on 2 or 3, die otherwise — applied to a grid of cells with no input, produce gliders and guns nobody designed, enough logic to build a universal computer, and a future that for many starting patterns can't be predicted without simulating it. It's the tidiest demonstration I know that "simple rules" and "simple behaviour" are completely different claims, and that the gap between them is where all the interesting things live. Go draw something in the grid above and set it running. You genuinely cannot be sure what it'll do.

## Reading further

- **Martin Gardner, *Mathematical Games*, Scientific American (October 1970)**: the column that introduced the Game of Life to the world and set off the whole hobby. A delight to read even now.
- **Berlekamp, Conway & Guy, *Winning Ways for Your Mathematical Plays***: where the original proof sketch that Life is universal appears, among a mountain of other game mathematics.
- **Paul Rendell, *A Turing Machine in Conway's Game of Life***: someone actually built one. The patterns and the write-up are online and worth a gawk. [rendell-attic.org](http://rendell-attic.org/gol/tm.htm)
- **Wolfram, *A New Kind of Science***: the source of "computational irreducibility" and a very long argument that simple rules running forward are how nature does most of its work. [wolframscience.com](https://www.wolframscience.com/nks/)
- **LifeWiki**: the community encyclopedia of patterns: guns, spaceships, oscillators, and the genuinely enormous engineered machines. [conwaylife.com/wiki](https://conwaylife.com/wiki/)
