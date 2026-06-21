---
title: 'A* Search, Visually: the Heuristic Is the Whole Game'
date: '2026-06-17T00:00:00.000Z'
description: >-
  A* is not a clever algorithm so much as Dijkstra plus a bet about the future.
  The same code becomes Dijkstra, greedy best-first, or A* depending on one term
  in the priority key — and admissibility is the single property that buys
  optimality.
labels: 'software,algorithms,computer science,ai'
release: true
author: Ben Ebsworth
heroImage: /blog/a-star-search-visually/hero.webp
takeaways:
  - >-
    Dijkstra, greedy best-first, and A* are the same expand-the-cheapest-node
    loop; only the priority key f = g + h differs, with h dropped, g dropped, or
    both kept.
  - >-
    Optimality hinges on one inequality: the heuristic must never overestimate
    the true cost-to-go (h ≤ h*); an optimistic guess can reorder the work
    without corrupting the answer.
  - >-
    Consistency (the triangle inequality for heuristics) is what lets you close
    a node forever — the first settling is already the cheapest route, so no
    re-opening.
  - >-
    Weighted A* (f = g + w·h) trades optimality for speed with a bounded cost:
    the returned path is at most w times the true shortest.
markdown_url: /blog/a-star-search-visually/
canonical_url: 'https://benebsworth.com/blog/a-star-search-visually/'
---
## Key takeaways

- Dijkstra, greedy best-first, and A* are the same expand-the-cheapest-node loop; only the priority key f = g + h differs, with h dropped, g dropped, or both kept.
- Optimality hinges on one inequality: the heuristic must never overestimate the true cost-to-go (h ≤ h*); an optimistic guess can reorder the work without corrupting the answer.
- Consistency (the triangle inequality for heuristics) is what lets you close a node forever — the first settling is already the cheapest route, so no re-opening.
- Weighted A* (f = g + w·h) trades optimality for speed with a bounded cost: the returned path is at most w times the true shortest.

A* (pronounced "A-star") gets taught as a brand-new algorithm, a clever specialised thing you reach for when Dijkstra is too slow. That framing hides what's going on. A* is Dijkstra plus a *bet about the future*. We keep the exact same priority queue, the exact same expand-the-cheapest-node loop, and we add one term to the score: a guess at how far each node still has to go. Change that one term and the same code becomes Dijkstra, greedy best-first search, or A*. Nothing else moves.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Watch the search above before reading on. The cells fill in not as an expanding disc but as a *cone* aimed at the goal ring on the right. That cone is the heuristic at work, pulling the frontier toward the target, refusing to waste expansions on cells that point the wrong way. This post is about that single pull: where it comes from, the one property it must have to stay honest, and what happens when you crank it past honest into reckless.

The plan: let's strip A* back to Dijkstra to see the baseline, add the heuristic to recover A*, then work out exactly why the guess buys the optimal path, and exactly when it stops.

## The baseline: Dijkstra is search with no opinion

Let's start from the algorithm with no bet at all. Edsger Dijkstra's 1959 shortest-path algorithm, run from a single source toward a goal, is **uniform-cost search**: a priority queue of frontier nodes, each keyed by $g(n)$, the cheapest cost found so far to reach node $n$ from the start. You pop the cheapest node, mark it *settled*, and relax its neighbours: if going through $n$ gives a cheaper route to a neighbour $m$, you record the new $g(m)$ and push $m$ onto the queue.

The key word is *cheapest*. Because you always settle the lowest-$g$ frontier node, you settle nodes in strict order of distance from the start. The closed set grows as a wavefront: every node at cost $r$ is settled before any node at cost $r+1$.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Set the **Algorithm** control to *Dijkstra* and you're watching pure $g$-ordered expansion. The closed set blooms as a near-circular disc centred on the start, because every direction looks equally promising to an algorithm that has no idea where the goal is. It reaches the goal, and the path it returns is provably the shortest, but look at how many cells it settles getting there. Most of them point *away* from the target.

Now flip back to *A\** and the disc collapses into a cone. The code didn't change; the data structures didn't change. Only the number we sort the queue by changed. That's the whole lesson, and the rest of this post just makes it precise.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Both algorithms pop the lowest-keyed node from a priority queue and relax its neighbours. The only difference is the key. Dijkstra sorts by "how far I have come." A* sorts by "how far I have come, plus how far I think I still have to go." Give A* a heuristic that always returns zero and it *becomes* Dijkstra, byte for byte. There's no separate Dijkstra in the lab: one search loop, three score functions.

## The bet: add a guess, get f = g + h

Here's the move. To each node, attach a second number $h(n)$, a **heuristic**, an estimate of the remaining cost from $n$ to the goal. On a grid you get one for free: the straight-line or city-block distance to the goal, ignoring walls. Then sort the queue not by $g$ alone but by their sum.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
f(n) = g(n) + h(n)
```

$$
f(n) = g(n) + h(n)
$$

That's the whole of A*. $g(n)$ is what you've spent; $h(n)$ is what you bet you still owe; $f(n)$ is your best current guess at the total cost of the cheapest path *through* $n$. Pop the lowest $f$, settle it, relax neighbours, repeat. Equation (1) is probably the most consequential plus sign in search, and every property below follows from it.

Read the two endpoints of that sum and you recover the whole family:

- Set $h(n) = 0$ everywhere. Then $f = g$, and you're back to Dijkstra. The bet is "I have no idea," so the search has no opinion.
- Ignore $g$ entirely and sort by $f = h$. Now you're doing **greedy best-first search**: always lunging at whichever frontier cell *looks* closest to the goal, never accounting for the cost already paid. It's fast and direct, and it cheerfully walks into dead-ends and detours because it never asks what a step cost.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

A* is not a new algorithm. It is a dial between caution and ambition, and the heuristic is the dial.

Set the **Algorithm** control to *Greedy* in either lab above. The frontier streaks at the goal even harder than A*, and on a cluttered maze you'll catch it returning a visibly kinked, longer path. It got there fast; it didn't get there cheaply. A* sits between the extremes, weighting "where I've been" against "where I'm going," and that balance is what lets it be both fast *and* correct. But "correct" is a promise, and the promise has a precondition.

## Why admissibility buys optimality

A* returns the genuinely shortest path only when the heuristic obeys one rule: it must never overestimate the true remaining cost. Call $h^*(n)$ the *actual* cheapest cost from $n$ to the goal, the thing you don't know yet, the thing you're trying to compute. The condition is one inequality:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
h(n) \le h^*(n) \quad \text{for every node } n
```

$$
h(n) \le h^*(n) \quad \text{for every node } n
$$

A heuristic satisfying equation (2) is **admissible**: optimistic, never pessimistic. Straight-line distance on a grid is admissible because no path can be shorter than a straight line; walls only ever make the real cost *bigger*. So the guess is always a lower bound, which is exactly what we need.

The proof intuition is short enough to carry in your head. Suppose A* is about to pop the goal with path cost $C$, but a cheaper path of cost $C^* < C$ actually exists. That cheaper path passes through some node $n$ still sitting on the frontier. The start is settled, the goal is not yet, so somewhere along the cheaper route there's a first unsettled node. Assuming $n$ already carries its optimal cost-so-far, $g(n) = g^*(n)$, its key is

$$
f(n) = g(n) + h(n) \le g(n) + h^*(n) = C^*
$$

The inequality is admissibility ($h \le h^*$); the last equality holds because $n$ lies on the optimal path, so its cost-so-far plus its true cost-to-go is exactly $C^*$. So $f(n) \le C^* < C$. But A* always pops the lowest $f$ first. It would have popped $n$, and continued down the cheaper path, before ever popping the goal at cost $C$. Contradiction. The goal is popped only at the true optimal cost. Neat, isn't it.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Admissibility is a one-sided constraint. The heuristic is allowed to be wildly *low*: $h(n) = 0$ is admissible, and that just gives you Dijkstra, slow but correct. What it must never do is guess *high*. The instant your heuristic overestimates even one node's cost-to-go, A* can settle the goal via a route it wrongly believed was cheap and walk past a better path it wrongly believed was expensive. You don't lose a little optimality. You lose the guarantee entirely. A heuristic that's "usually accurate" but occasionally optimistic is fine; one that's "usually accurate" but occasionally pessimistic is broken.

## Consistency: settling each node exactly once

Admissibility buys the optimal path, but a slightly stronger property buys *efficiency*. A heuristic is **consistent** (or monotone) when the estimate never drops by more than the actual step cost between neighbours:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
h(n) \le c(n, n') + h(n')
```

$$
h(n) \le c(n, n') + h(n')
$$

where $c(n, n')$ is the cost of the edge from $n$ to a neighbour $n'$. This is the triangle inequality wearing a heuristic's clothes: the estimated distance from $n$ can't exceed one real step plus the estimate from where that step lands you. Consistency implies admissibility, and it gives you something concrete in return. Along any path the $f$ values never decrease, so the first time A* settles a node it has already found the cheapest route to it. You never have to re-open a settled node. The closed set is final.

That's why a grid implementation can mark a cell *closed* and skip it forever after. Without consistency you'd occasionally discover a cheaper route to an already-settled node and have to drag it back into the open set. The grid heuristics in the lab (Manhattan, Euclidean, Chebyshev) are all consistent, which is why the closed set in the visualisation only ever grows.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Those are representative counts for one mid-density maze. Watch the `expanded:` readout in the lab's caption strip and you'll see the same ordering hold on every fresh maze: Dijkstra dwarfs A*, and inflating the weight shrinks A* further. The exact numbers shift; the ranking never does.

## Weighted A*: trading optimality for speed, visibly

Equation (2) gives you optimality. What if you don't need it? Real systems, like game AI choosing a route inside a single frame or a robot replanning at 30 Hz, often want a *good* path *fast* more than the *best* path eventually. So we cheat, deliberately and by a known amount: inflate the heuristic by a weight $w \ge 1$ and sort by $f = g + w \cdot h$.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Drag the **Heuristic weight** control from 1 toward 4 and watch the cone clamp shut. At $w = 1$ you have honest A*. As $w$ climbs, $h$ dominates $g$ in the key and the search behaves more like greedy best-first: it stops caring how much it has spent and lunges at the goal. The `expanded:` counter drops sharply. On an open maze the path often stays optimal anyway; on a cluttered one you'll catch it taking a visible kink, a detour a cost-aware search would have skipped.

The trade is *bounded*, which is what makes it usable rather than reckless. With weight $w$, the returned path costs at most $w$ times the true shortest path: a guaranteed ceiling on how wrong you can be. A weight of 1.5 caps the path at 50% over optimal while typically expanding a fraction of the nodes, and in practice usually lands much closer. You're buying speed with a coupon that caps the price.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The family is really one continuous dial, not three discrete algorithms. Send $w \to 0$ and the heuristic vanishes: you have Dijkstra. At $w = 1$ you have optimal A*. As $w \to \infty$, $g$ becomes negligible and you have greedy best-first. "Dijkstra," "A*," and "greedy" are three labelled detents on a single weight knob. The lab exposes both ends: the weight slider sweeps the $1 \le w \le 4$ stretch (optimal A* up toward greedy), and the Algorithm dropdown snaps to the detents the slider can't reach, namely Dijkstra ($h$ dropped entirely) and pure greedy ($g$ dropped entirely).

## Choosing h: match the heuristic to the moves

The heuristic is the whole game, so picking it well is most of the engineering. The constraint from equation (2) is sharp. $h$ must be a *lower bound* on real cost, which means it has to respect how the agent is actually allowed to move. We tend to forget that part.

Flip the **Heuristic** control between the three options and watch the grid's connectivity change with it:

- **Manhattan distance**, $|\Delta x| + |\Delta y|$, is the exact shortest distance on a 4-connected grid (no diagonals) with no walls. It's the tightest admissible heuristic there, so A* with Manhattan on an open grid expands almost nothing but the path itself. Use it the instant diagonal moves are forbidden.
- **Euclidean distance**, $\sqrt{\Delta x^2 + \Delta y^2}$, is the straight-line distance, and it's admissible on *any* grid: nothing physical beats a straight line. On an 8-connected grid where diagonals cost $\sqrt{2}$ (which is what the lab charges) it's the honest lower bound, just a loose one, so it expands a touch more than it has to.
- **Chebyshev distance**, $\max(|\Delta x|, |\Delta y|)$, counts the moves needed when a diagonal step costs the same as an orthogonal one. On the lab's grid each diagonal actually costs $\sqrt{2}$, so Chebyshev sits *below* the true cost: still admissible, just optimistic, which keeps the optimality guarantee intact while expanding a few more cells.

The rule under all three: a *tighter* admissible heuristic, one closer to $h^*$ without going over, expands fewer nodes. Pick Manhattan on an 8-connected grid and it *overestimates* (a diagonal shortcut beats the city-block count), breaking admissibility and the optimality guarantee with it. The lab enforces the safe pairing for you (choosing Manhattan switches the grid to 4-connected) precisely because mismatching the heuristic to the move set is probably the classic A* bug.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Everything else about A* is bookkeeping you can copy from a textbook: a binary heap, parent pointers, a closed set. The heuristic is the only place real judgement lives. A weak one wastes effort like Dijkstra; an inadmissible one silently returns wrong answers; a tight, admissible, consistent one gives you the provably shortest path for the least possible work. When A* underperforms, the heuristic is almost always why. Worth checking first.

## The same pattern, everywhere

A* is the canonical instance of **informed search**: the idea that an estimate of cost-to-go should steer exploration. Strip away the grid and the pattern reappears across computing. Network routing protocols run Dijkstra's algorithm (A* with $h = 0$) to build forwarding tables; they skip the heuristic only because a router has no useful geometric guess about the rest of the internet. Game and robotics planners run weighted A* to hit a frame budget, trading a bounded slice of optimality for a guaranteed deadline. Same dial, different priorities.

The deeper relative is **dynamic programming (DP)**. The relaxation step at the heart of every variant, "if going through $n$ gives a cheaper route to $m$, update $m$," is the Bellman optimality equation, evaluated lazily in best-first order:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
g(m) = \min_{n} \big[\, g(n) + c(n, m) \,\big]
```

$$
g(m) = \min_{n} \big[\, g(n) + c(n, m) \,\big]
$$

Dijkstra solves equation (4) by always expanding the node whose value is already final. A* solves the same equation with a heuristic that reorders *which* node you finalise next, so you reach the goal's value before computing everyone else's. The heuristic doesn't change *what* you compute, the optimal cost-to-come, only the *order*. That's why the admissibility proof works: an optimistic guess can reorder the work without corrupting the answer.

Seen this way, A* is not a pathfinding trick. It's a statement that a single optimistic lower bound on the future lets you solve a shortest-path problem in goal-directed order instead of breadth-first order, as true on a road network, a puzzle state graph, or a robot's configuration space as on the grid in the lab. Open it again, set the algorithm back to A*, and watch the cone form. You now know the cone *is* the heuristic, and the heuristic is the whole game. Go bend the dial and see where it takes you.

## Reading further

- [Hart, Nilsson & Raphael (1968), *A Formal Basis for the Heuristic Determination of Minimum Cost Paths*](https://ieeexplore.ieee.org/document/4082128): the original A* paper; short, and the source of the admissibility and optimality proofs sketched above.
- [Russell & Norvig, *Artificial Intelligence: A Modern Approach*, ch. 3 (Informed Search)](https://aima.cs.berkeley.edu/): the canonical textbook treatment of $f = g + h$, admissibility versus consistency, and where A* sits in the search family.
- [Dijkstra (1959), *A Note on Two Problems in Connexion with Graphs*](https://link.springer.com/article/10.1007/BF01386390): the two-and-a-half-page paper that defines the uniform-cost baseline A* generalises.
- [Amit Patel, *Introduction to A\** (Red Blob Games)](https://www.redblobgames.com/pathfinding/a-star/introduction.html): the definitive interactive teaching case; the best place to build the same intuition this post argues for, with knobs of its own.
