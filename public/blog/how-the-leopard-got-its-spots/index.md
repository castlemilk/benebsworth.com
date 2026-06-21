---
title: How the Leopard Got Its Spots
date: '2026-06-18T00:00:00.000Z'
description: >-
  Two chemicals that do nothing but react and spread can break a blank sheet
  into spots, stripes, and mazes. Turing's last great idea was that diffusion,
  the great smoother, is also where pattern comes from.
labels: 'maths,nonlinear dynamics,pattern formation'
release: true
author: Ben Ebsworth
heroImage: /blog/how-the-leopard-got-its-spots/hero.webp
takeaways:
  - >-
    Turing patterns need a *difference* in diffusion rates, not diffusion
    itself: make the two chemicals spread at equal speeds and the flat state
    stays stable and blank.
  - >-
    Pattern formation is a diffusion-driven instability — a steady state that's
    stable to reactions alone goes unstable once spreading is switched on, the
    reverse of the usual smoothing intuition.
  - >-
    Linear analysis only sets the spacing; spots actually pinching in half or
    labyrinths weaving are nonlinear effects that appear only at finite
    amplitude.
  - >-
    Domain geometry decides shape: a tapering tail forces stripes while a broad
    flank allows spots, so a spotted body can have a striped tail but never the
    reverse.
markdown_url: /blog/how-the-leopard-got-its-spots/
canonical_url: 'https://benebsworth.com/blog/how-the-leopard-got-its-spots/'
---
## Key takeaways

- Turing patterns need a *difference* in diffusion rates, not diffusion itself: make the two chemicals spread at equal speeds and the flat state stays stable and blank.
- Pattern formation is a diffusion-driven instability — a steady state that's stable to reactions alone goes unstable once spreading is switched on, the reverse of the usual smoothing intuition.
- Linear analysis only sets the spacing; spots actually pinching in half or labyrinths weaving are nonlinear effects that appear only at finite amplitude.
- Domain geometry decides shape: a tapering tail forces stripes while a broad flank allows spots, so a spotted body can have a striped tail but never the reverse.

Here is a claim that should sound wrong. Take two chemicals. Let one of them catalyse its own production, let the other one feed it, and let both simply spread out the way ink spreads in water. Start them mixed almost evenly across a dish, with only a whisper of noise to break the symmetry. Wait. Spots appear. Not because anything tells them where to go, not because a mould stamps them in, but because the maths of "react and spread" has no stable flat answer. The blank sheet is the one thing the system cannot keep.

That is the idea Alan Turing published in 1952, in what turned out to be his last major paper, *The Chemical Basis of Morphogenesis*. He was asking how a ball of identical cells in an embryo decides to become a striped tail or a spotted flank when every cell starts with the same instructions. His answer was that **diffusion, which we all learn is the great smoother, can be the very thing that creates structure.** Let's watch it happen first, then take it apart.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Watch the field before you read another equation. It does not start patterned. It starts as a near-uniform blur, and the spots *grow into it* and settle to a spacing, then keep drifting and re-knitting as fresh disturbances ripple through. Nothing in the rules says "put a dot here". The only rules are: each chemical spreads to its neighbours, and where they meet they react.

Switch the **Pattern** control from Spots to Maze and the same machinery gives you fingerprints instead. Same two chemicals, same two operations, a different balance of feed and kill. The pattern is a property of the numbers, not of any picture drawn in advance.

## The two-chemical recipe

The model in the lab is the **Gray-Scott** system, a particularly clean activator-substrate pair. Call the two concentrations $u$ and $v$. The reaction is autocatalysis: one unit of $v$ recruits more $v$ by consuming $u$, written as a chemical scheme it looks like this.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
U + 2V \longrightarrow 3V, \qquad V \longrightarrow P
```

$$
U + 2V \longrightarrow 3V, \qquad V \longrightarrow P
$$

So $v$ is the **activator**: the more of it there is, the faster it makes more of itself (that $uv^2$ term, cubic in the reactants). And $u$ is the **substrate** it burns through. Now add diffusion, write down the rate of change of each concentration at every point, and you get the two coupled partial differential equations the lab is actually integrating.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\begin{aligned} \frac{\partial u}{\partial t} &= D_u\,\nabla^2 u - u v^2 + F(1 - u) \\[4pt] \frac{\partial v}{\partial t} &= D_v\,\nabla^2 v + u v^2 - (F + k)\,v \end{aligned}
```

$$
\begin{aligned}
\frac{\partial u}{\partial t} &= D_u\,\nabla^2 u - u v^2 + F(1 - u) \\[4pt]
\frac{\partial v}{\partial t} &= D_v\,\nabla^2 v + u v^2 - (F + k)\,v
\end{aligned}
$$

Read it left to right. The $\nabla^2$ term is diffusion, the bit that spreads each chemical toward its neighbours. The $uv^2$ term is the reaction that moves $u$ into $v$. The $F(1-u)$ term tops $u$ back up (the **feed**, replacing what gets used), and $(F+k)v$ removes $v$ (the **kill**). Four moving parts, two of them just spreading and reacting. There is genuinely nothing else in here, no hidden template, which is what makes the result feel like a magic trick.

The one number that matters more than any other is the *ratio* of the two diffusion rates. In the lab, $D_u = 0.16$ and $D_v = 0.08$: the substrate spreads twice as fast as the activator. Hold that thought, because it turns out to be the whole secret.

## Why the great smoother makes structure

The intuition Turing gave is short-range activation with long-range inhibition. The activator $v$ is slow, so wherever it gets a local lead it builds a sharp peak right where it is. The substrate it depends on is fast, so a growing peak drains $u$ from a wide area around itself. Nearby, $u$ has been eaten and can't be replenished quickly, so no second peak can start there. Far away, the substrate is still plentiful and another peak can rise. The peaks therefore sit at a preferred distance from each other. That spacing is the pattern.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Diffusion on its own only ever flattens. Drop ink in still water and it fades to grey; it never spontaneously re-gathers into dots. So how does the same $\nabla^2$ that flattens a single chemical *sharpen* a pattern in a pair of them? Because the two chemicals diffuse at different speeds. The fast one carries an inhibiting effect further than the slow one carries its activating effect, and that imbalance is what a single, uniform mixture cannot survive. Make the two diffusion rates equal and the magic stops: the flat state goes stable again and the dish stays blank. Pattern needs the *difference* in diffusion, not diffusion itself.

The phrase "long-range inhibition" is a useful lie worth flagging. The substrate $u$ does not actively suppress $v$ the way a true inhibitor would. It just gets eaten, and because it refills slowly and spreads quickly, a local feast of $v$ leaves a wide ring of starvation around it. The inhibition is *effective*, a consequence of depletion plus fast diffusion, rather than a chemical that hunts $v$ down. The behaviour is the same; the mechanism is gentler than the name suggests.

## The maths of the instability

We can make "a uniform mixture cannot survive" precise, and this is where the post connects to every other dynamical-system story on this site. Freeze the diffusion for a second and treat the reaction terms as an ordinary two-variable system. It has a steady mixed state where production balances loss, and you check its stability with the Jacobian $J$ of the reaction kinetics, exactly the linearisation we use to classify fixed points in [phase portraits](/blog/phase-portraits-of-differential-equations/). For Gray-Scott in the patterning regime, that mixed state is stable on its own: leave the chemicals to react with no spreading and they settle.

Now switch diffusion back on and ask what a small ripple of wavenumber $q$ does. A bumpy perturbation grows or shrinks at a rate $\lambda(q)$, the larger of two eigenvalues, and its sign is controlled by a single function.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
h(q^2) = D_u D_v\,q^4 - (D_u\, g_v + D_v\, f_u)\,q^2 + \det J
```

$$
h(q^2) = D_u D_v\,q^4 - (D_u\, g_v + D_v\, f_u)\,q^2 + \det J
$$

Here $f_u$ and $g_v$ are entries of that reaction Jacobian. When $h(q^2) < 0$ for some band of $q$, ripples at those wavelengths *grow*, even though the no-diffusion state was stable. That is a **diffusion-driven instability**, and it is the engine of the whole thing. The fastest-growing wavelength wins and sets the spot spacing you measure on the screen.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

It is tempting to stop at "stable without diffusion, unstable with it", but the full Turing recipe is four inequalities. The kinetics must be stable on their own ($\operatorname{tr}J < 0$ and $\det J > 0$). Then the cross term must be positive ($D_u g_v + D_v f_u > 0$), and finally it must be *large enough* to push $h$ below zero, $(D_u g_v + D_v f_u)^2 > 4 D_u D_v \det J$. That last one is where the diffusion ratio earns its keep: if the two chemicals spread at the same speed, the inequality fails and there is no pattern. A non-zero pattern wavelength exists only when the diffusion rates differ enough for $h$ to actually dip below the axis.

A footnote for the connoisseur: classical linear activator-inhibitor models often need the inhibitor to diffuse roughly ten times faster than the activator before patterns appear, which is awkward biologically, because real morphogens of similar size diffuse at similar rates. Gray-Scott gets away with a ratio of two because its cubic autocatalysis does extra work the linear models can't. It is one reason this particular toy is so beloved.

## Reading the parameter map

Everything above sets the *scale* of the pattern. What kind of pattern you get, dots versus mazes versus something that splits and crawls, lives in the two dials $F$ and $k$. Pearson's 1993 survey mapped this plane and found a small continent of wildly different behaviours packed into a narrow strip of parameter space.

> [LabCanvas component] Inline interactive lab canvas. Embeds any effect registered in `lib/lab/registry.ts` (referenced by its `effect` slug) as a live Canvas2D/WebGL visualisation, with the effect's own controls rendered below unless `controls={false}`. Optional `params` override the effect's defaults and `caption` adds a figcaption. The rendered post has the live, interactive version; this is a static placeholder for the markdown-only sibling — read the matching lab explainer under `/lab/<slug>/` for the full description of what the effect shows.

The preset above is the strange one. The dots grow, and when a dot gets too fat for the wavelength the dispersion relation allows, it becomes unstable to splitting and pinches into two, which then push apart and repeat. It looks exactly like cells dividing. There are no cells. There is no instruction to divide. It is the same two equations, parked at a different $(F, k)$.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Be careful what you credit to the dispersion relation. The band of unstable wavelengths predicts the *spacing* of the spots, and that is a genuinely linear result. But the dramatic stuff, a spot actually pinching in half, the labyrinth weaving itself, is nonlinear and only happens at finite amplitude. Linear analysis tells you the system can't stay flat and roughly how far apart the features will sit. It does not, by itself, tell you a dot will split. For that you have to let the full equations run, which is exactly what the lab does.

Two failure modes are worth a try while you have the controls. Push the kill rate $k$ too high and $v$ can't sustain itself; the whole field collapses to the dead, uniform "all substrate" state and stays there. Pull the diffusion rates together (you can't in this lab, but it's the thought experiment from the callout) and the pattern never starts. Both are reminders that the pattern lives in a window, and outside it the blank sheet wins after all.

## From two chemicals to a leopard

Turing wrote about chemistry, but the title of this post is stolen, gently, from James Murray, who in 1988 used exactly this reasoning to argue about animal coats. The argument has a lovely, testable consequence about geometry. A reaction-diffusion pattern fitting into a narrow, tapering domain, like a tail, is forced toward stripes, because a single wavelength can only pack across the width one way. A broad domain, like a flank, has room for spots. So you can have a spotted body running out into a striped tail, but **a striped body cannot end in a spotted tail.** Look at the big cats and the rule holds: plenty of spotted cats with banded tails, no banded cats with spotted tails.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

A spotted animal can have a striped tail, but a striped animal cannot have a spotted tail. The geometry of the canvas decides, and the chemistry just fills it in.

This is not only a story about ink in a dish. In 2020 a team led by Stephan Getzin showed that the "fairy circles" in the Australian outback near Newman, regular gaps in spinifex grass, fit a Turing model where the grass biomass is the slow activator and soil water is the fast-spreading inhibitor. The vegetation engineers its own water supply, the water redistributes faster than the plants do, and the landscape settles into a honeycomb you can see from a plane. Same maths, a different pair of "chemicals".

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

It is hard to read the 1952 paper without the biography pressing in. Turing had been convicted of gross indecency only months earlier, in March 1952, and was undergoing court-mandated hormone treatment, a chemical castration, while he worked on it. He died in June 1954, not yet 42. The man who had done as much as anyone to win a war and to invent the computer spent some of his last clear years asking why a tiger has stripes, and got the answer essentially right four decades before anyone could simulate it on a screen. Some food for thought about what we lost.

## The same instability, elsewhere

The reason this clicks, if you've read around the site, is that it is the same move as everywhere else. A stable fixed point, a perturbation, a parameter that flips stability and lets the perturbation grow. In the [Lorenz post](/blog/lorenz-and-the-limits-of-prediction/) a tiny difference in initial conditions blows up and you get chaos; here a tiny ripple blows up and you get order. Both are linear instabilities of an equilibrium, classified with the same Jacobian we use in [phase portraits](/blog/phase-portraits-of-differential-equations/). The difference is only what the growing mode looks like: a trajectory peeling away from a point, or a wavelength peeling away from a flat field.

We tend to think of "smoothing" and "structure" as opposites. Turing's quiet, radical point was that with two ingredients spreading at different speeds, the smoothing *is* the structure. Drag the Feed and Kill sliders for a while and you'll start to feel where the window is. The blank sheet, it turns out, was never an option.

## Reading further

- [Turing, *The Chemical Basis of Morphogenesis* (1952)](https://doi.org/10.1098/rstb.1952.0012). The original, Phil. Trans. R. Soc. B 237, 37-72. Surprisingly readable, and the source of the whole field; his "morphogen" instability is equation (3) in disguise.
- [Pearson, *Complex Patterns in a Simple System* (1993)](https://doi.org/10.1126/science.261.5118.189). Science 261, 189-192. The map of the Gray-Scott $(F, k)$ plane, including the self-replicating-spot regime in the lab.
- [Murray, *How the Leopard Gets Its Spots* (1988)](https://doi.org/10.1038/scientificamerican0388-80). Scientific American 258(3), 80-87. The animal-coat argument and the spotted-body-striped-tail rule, from the master of mathematical biology.
- [Getzin et al., *Fairy circle Turing patterns* (2021)](https://doi.org/10.1111/1365-2745.13493). J. Ecology 109, 399-416. Reaction-diffusion confirmed in the field, in Australian spinifex grassland.
- [Karl Sims, *Reaction-Diffusion Tutorial*](https://karlsims.com/rd.html). The clearest hands-on explanation of the Gray-Scott numerics, and the source of the exact Laplacian stencil this lab uses.
