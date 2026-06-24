---
title: Why time only runs forwards
date: '2026-06-23T00:00:00.000Z'
author: Ben Ebsworth
description: >-
  The microscopic laws of physics run the same forwards and backwards, yet eggs
  never unscramble and gases never un-mix. We resolve the paradox with a box of
  mixing particles: the arrow of time isn't a force, it's a counting argument —
  there are overwhelmingly more messy arrangements than tidy ones, so disorder
  wins by sheer weight of numbers.
labels: 'physics,thermodynamics,entropy'
release: true
heroImage: /blog/why-time-only-runs-forwards/hero.webp
takeaways:
  - >-
    The fundamental laws are time-reversible, so the arrow of time isn't built
    into the dynamics. It comes from counting: a 'mixed' macrostate corresponds
    to vastly more microstates than a 'separated' one.
  - >-
    Entropy is just the log of how many microscopic arrangements look the same
    from outside (S = k log W). The second law is not a force — it's
    overwhelming probability.
  - >-
    You could un-mix a gas by reversing every velocity; the rules allow it. It
    never happens because that ordered macrostate is one in astronomically many,
    so we never land on it by chance.
markdown_url: /blog/why-time-only-runs-forwards/
canonical_url: 'https://benebsworth.com/blog/why-time-only-runs-forwards/'
---
## Key takeaways

- The fundamental laws are time-reversible, so the arrow of time isn't built into the dynamics. It comes from counting: a 'mixed' macrostate corresponds to vastly more microstates than a 'separated' one.
- Entropy is just the log of how many microscopic arrangements look the same from outside (S = k log W). The second law is not a force — it's overwhelming probability.
- You could un-mix a gas by reversing every velocity; the rules allow it. It never happens because that ordered macrostate is one in astronomically many, so we never land on it by chance.

A film of two billiard balls colliding looks perfectly normal played backwards. So does a planet orbiting, a pendulum swinging, two molecules bouncing off each other. The microscopic laws of physics don't care which way time runs; reverse every velocity and the motion is still a legal solution. And yet. Eggs don't unscramble. Coffee doesn't un-stir. A smell doesn't gather itself back into the bottle. The big picture has an unmistakable direction even though every tiny piece of it is reversible.

That's a real puzzle, and it bothered the people who first thought about it properly. If nothing in the rules picks a direction, where does the arrow of time come from? The answer, which I find one of the most satisfying ideas in physics, is that it isn't in the rules at all. It's in the *counting*.

## Take the partition out

Here's the whole thing in a box. Teal particles on the left, warm ones on the right, a partition between them. Pull the partition and let the particles do what particles do: drift, bounce off the walls, mind their own business. Watch what the box does as a whole.

> [EntropyMixing component] An interactive box of two-colour particles for the "why time only runs forwards" post: teal start on the left, warm-orange on the right, separated. On release every particle drifts and bounces elastically off the walls, interdiffusing into an even mix, while a coarse-grained positional entropy S/k climbs from ~0 (separated) to its maximum N·ln2 (mixed) and plateaus. It dramatises that the arrow of time is a counting argument — the micro-rules are reversible, but mixed arrangements so vastly outnumber separated ones that it never un-mixes. Controls: release/pause, reset, particle count. The rendered post has the live version.

It mixes, every time, and the entropy readout climbs and then sits at the top. Now here's the uncomfortable question: which rule did that? None of them. Each particle is just moving in a straight line and bouncing elastically, all of it perfectly reversible. No particle "wants" to spread out. The box mixes anyway. So the direction has to come from somewhere other than the per-particle physics.

## It's a counting argument

The trick is to separate two things we usually blur together. A **microstate** is the complete description: every particle's exact position and velocity. A **macrostate** is the blurry view: roughly how many teal are on the left, how mixed it looks. The point is that one macrostate corresponds to a colossal number of microstates, and crucially, **not the same number for every macrostate**.

Ask how many ways you can arrange the particles so they look "mixed" versus "all teal on the left". The separated arrangement is rare and special: there's basically one way to have every teal particle on the left. The mixed arrangement is generic: there are astronomically many ways to scatter the colours evenly. Entropy is just the log of that count:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
S = k_B \ln W
```

$$
S = k_B \ln W
$$

For our two-colour box, the number of ways to split $N$ particles so that $n$ are on the left is a binomial coefficient, and the count is overwhelmingly peaked at the even split:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
W(n) = \binom{N}{n} = \frac{N!}{n!\,(N-n)!}
```

$$
W(n) = \binom{N}{n} = \frac{N!}{n!\,(N-n)!}
$$

So the box doesn't mix because of a law that says "mix". It mixes because there are so many more mixed-looking microstates than separated ones that, wandering randomly through its options, it spends essentially all its time in the mixed ones. The second law of thermodynamics, the one that says entropy never decreases, isn't a force pushing things around. It's a statement about counting that's true with overwhelming probability.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This reframing is the whole insight. "Entropy increases" sounds like a commandment. It's really closer to "if you shuffle a deck it probably won't come out sorted". Nothing forbids the sorted deck; it's just one arrangement out of $52!$. For a box of even a few hundred particles the numbers are so much larger than $52!$ that "probably won't un-mix" becomes "won't un-mix before the heat death of the universe". The arrow of time is the difference between *forbidden* and *absurdly unlikely*, and at the scale of $10^{23}$ particles those are the same thing.

## The reversibility paradox

If you're feeling sharp you might object: hang on, the rules are reversible, so the un-mixing motion exists. Reverse every particle's velocity at the mixed moment and the box would obediently un-mix, particle by particle, back into neat halves. You're completely right, and this is exactly the objection Loschmidt raised to Boltzmann in the 1870s. It's not a flaw in the argument; it's the heart of it.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Yes, the un-mixing trajectory is a perfectly legal solution to the equations of motion. The resolution is that it corresponds to one fantastically fine-tuned microstate out of all the mixed ones. To trigger it you'd have to set every velocity exactly right, to a precision no physical process can manage; nudge any particle by a hair and the un-mixing collapses back into ordinary mixing. So the reverse motion isn't impossible, it's *measure-zero in practice*: the set of microstates that would un-mix is so vanishingly small compared to the ones that stay mixed that we never, ever land on it by chance. Reversible rules, irreversible behaviour, and no contradiction between them.

## But where did the order come from?

There's one more turn of the screw, and it's the part that still genuinely puzzles me. The counting argument explains why entropy goes *up* from any given moment. But by the same logic it should have been higher in the past too: the maths is symmetric, so "more microstates" wins looking backwards as much as forwards. Run the reasoning naively and it predicts the past was *also* high-entropy, which is plainly false: yesterday was more ordered than today, and the early universe was extraordinarily ordered.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The standard patch is to add one extra assumption that the dynamics can't give you: the universe simply *started* in a very low-entropy state. Physicists call this the "past hypothesis". Given that ordered beginning, the counting argument does all the rest. Entropy has been climbing ever since, and that climb *is* the arrow of time, the thing that lets us remember the past but not the future and makes eggs a one-way street. Why the universe began so ordered is, as far as I know, still genuinely open. Some food for thought: the direction of time you feel every second might trace all the way back to the initial conditions of the cosmos, and nothing more.

## So, why does time run one way?

Because "ordered" is rare and "messy" is common, and a system left alone wanders from the rare into the common simply because there's so much more of it. Stir the counting argument into a universe that happened to start tidy, and you get every irreversible thing you've ever seen: heat flowing hot-to-cold, smells spreading, the unscrambleable egg, and the plain fact that you can remember breakfast but not dinner. The micro-laws never picked a direction. We did, by living downstream of a low-entropy beginning, in a world where the messy outcomes outnumber the tidy ones by numbers with twenty-three zeros.

## Reading further

- **Boltzmann (1877)**: where $S = k \ln W$ comes from. The equation is literally carved on his gravestone. Any statistical-mechanics text traces the original argument.
- **Feynman, *The Character of Physical Law*, chapter 5 ("The Distinction of Past and Future")**: the clearest hour you can spend on exactly this question, from someone who thought about it beautifully.
- **Sethna, *Statistical Mechanics: Entropy, Order Parameters, and Complexity***: the modern textbook treatment, free online, with the counting made precise. [sethna.lassp.cornell.edu](https://sethna.lassp.cornell.edu/StatMech/)
- **Carroll, *From Eternity to Here***: a whole popular book on the arrow of time and the past hypothesis, if the last callout left you wanting more.
