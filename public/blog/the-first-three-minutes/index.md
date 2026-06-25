---
title: The first three minutes
date: '2026-05-29T00:00:00.000Z'
description: >-
  Within minutes of the Big Bang the entire universe was a fusion reactor. The
  helium it forged then, about a quarter of all ordinary matter, is still here,
  and it matches the prediction to the percent.
labels: 'cosmology,astrophysics,nuclear physics,Big Bang'
release: true
author: Ben Ebsworth
heroImage: /blog/the-first-three-minutes/hero.webp
takeaways:
  - >-
    About a quarter of all ordinary matter is helium that was fused in the first
    few minutes after the Big Bang, before any star existed. It is a fossil, and
    you can hold the prediction against the measurement.
  - >-
    The helium fraction is set almost entirely by one number: the
    neutron-to-proton ratio when the weak force froze out, which simple nuclear
    physics pins at about 1 in 7.
  - >-
    A single parameter, the baryon-to-photon ratio, fixes the yields of every
    light element. The cosmic microwave background measures it independently,
    and the two answers agree.
  - >-
    Theory says the primordial helium mass fraction is 0.247; metal-poor
    galaxies measure 0.246. That sub-percent match is one of the most stringent
    tests in all of physics.
markdown_url: /blog/the-first-three-minutes/
canonical_url: 'https://benebsworth.com/blog/the-first-three-minutes/'
---
## Key takeaways

- About a quarter of all ordinary matter is helium that was fused in the first few minutes after the Big Bang, before any star existed. It is a fossil, and you can hold the prediction against the measurement.
- The helium fraction is set almost entirely by one number: the neutron-to-proton ratio when the weak force froze out, which simple nuclear physics pins at about 1 in 7.
- A single parameter, the baryon-to-photon ratio, fixes the yields of every light element. The cosmic microwave background measures it independently, and the two answers agree.
- Theory says the primordial helium mass fraction is 0.247; metal-poor galaxies measure 0.246. That sub-percent match is one of the most stringent tests in all of physics.

Here is a fact that should be harder to believe than it is: roughly a quarter of every ordinary atom in your body, in the Sun, in the most distant galaxy we can see, is helium that was not made in any star. It was forged in the first few minutes after the Big Bang, when the whole universe was hot and dense enough to run as a single fusion reactor, and then it was switched off forever once everything cooled. That helium is a fossil. It predates the first star by hundreds of millions of years, it cannot be unmade, and we can calculate how much of it there should be from nuclear physics you could fit on a napkin.

The astonishing part is not the story. The astonishing part is the number. Theory says the primordial helium should be 24.7% of ordinary matter by mass. Go and measure it in the most pristine, least-processed gas we can find, dwarf galaxies so metal-poor that almost nothing has been cooked in stars since the beginning, and you get 24.6%. That agreement, to within about a percent, is not a vague "the Big Bang basically works". It is a quantitative prediction about the composition of the universe, made from the temperature it had when it was three minutes old, confirmed by light that left a galaxy before the Earth existed.

Let me try to convince you the number is forced, not fitted.

## A reactor with a cooling problem

To make helium you need to fuse protons and neutrons. The early universe had both, in vast quantities, slammed together at billions of kelvin. So why didn't all of it become helium? Why is the universe still three-quarters hydrogen?

The answer is a race. The universe is fusing nuclei and cooling at the same time, and cooling wins. Everything about primordial nucleosynthesis is a competition between reaction rates, which want to build heavier nuclei, and the expansion of space, which is dropping the temperature and density out from under those reactions before they can finish the job.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

The grid of galaxies is being carried apart by the growth of the scale factor $a(t)$, exactly the FLRW picture that governs the modern cosmos. Wind the **expansion rate** up and watch how quickly separations balloon. In the first few minutes that same expansion was dropping the temperature through the narrow window where fusion can happen, faster than the reactions could consume the available neutrons. The cooling is the clock. Fusion doesn't stop because it runs out of fuel; it stops because the reactor cools below the ignition point while there are still protons left over.

So the whole problem reduces to a stopwatch. How many neutrons are around when fusion finally fires, and what fraction of them get locked into helium before the universe cools too far? Get those two numbers and you have the helium abundance. Everything else is detail.

## Freeze-out: the universe forgets how to make neutrons

Rewind to about one second after the Big Bang, temperature near 10 billion kelvin, or about 1 MeV in the units particle physicists prefer. The cosmos is a soup of photons, electrons, positrons, neutrinos, and a thin sprinkling of protons and neutrons. At these energies the weak force keeps protons and neutrons interconverting freely: a proton plus an electron becomes a neutron plus a neutrino, and the reverse, back and forth, fast.

While those reactions are fast, the ratio of neutrons to protons is set by thermodynamics. A neutron is slightly heavier than a proton, by $\Delta m = 1.293$ MeV, and nature charges you that energy difference to make the heavier one. So the populations follow a Boltzmann factor: the colder it gets, the rarer neutrons become.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{n}{p} = e^{-\Delta m / T}, \qquad \Delta m = 1.293\ \text{MeV}
```

$$
\frac{n}{p} = e^{-\Delta m / T}, \qquad \Delta m = 1.293\ \text{MeV}
$$

Now bring in the expansion. The weak reactions that maintain this balance have a rate $\Gamma_{\text{wk}}$ that falls steeply as the universe cools, much faster than the expansion rate $H$ does. At some point the reactions can no longer keep up with the expanding, thinning plasma. The conversions effectively stop. Physicists call this **freeze-out**, and it happens when the two rates cross.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\Gamma_{\text{wk}} < H \quad \Rightarrow \quad \frac{n}{p} \approx e^{-\Delta m / T_f}, \quad T_f \approx 0.8\ \text{MeV}
```

$$
\Gamma_{\text{wk}} < H \quad \Rightarrow \quad \frac{n}{p} \approx e^{-\Delta m / T_f}, \quad T_f \approx 0.8\ \text{MeV}
$$

Freeze-out lands at roughly $T_f \approx 0.8$ MeV. Plug that into the Boltzmann factor and you get a neutron-to-proton ratio of about $1/6$. The universe has, in effect, forgotten how to convert protons into neutrons. Whatever neutrons exist at this instant are nearly all the neutrons that will ever be available to build nuclei.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Notice what fixed the ratio: the neutron-proton mass difference (a property of the nuclei) and the freeze-out temperature (set by how the weak interaction rate compares to the cosmic expansion rate). Both are physics we measure in laboratories and in the sky, with nothing tuned to make cosmology work. The helium fraction falls out of $\Delta m$, the strength of the weak force, and the gravitational constant that sets the expansion. Three numbers from three different corners of physics, none of them chosen with helium in mind, conspire to give you a quarter.

There's one more twist before fusion begins. A free neutron is unstable; it decays into a proton with a half-life of about 10 minutes. Between freeze-out and the start of nucleosynthesis a few minutes elapse, and in that gap some neutrons quietly decay away. The ratio slides from about $1/6$ down to roughly $1/7$. That decay is a slow leak, and it's racing the same stopwatch: the sooner fusion starts, the fewer neutrons are lost. As it happens, fusion starts just in time to save most of them.

## The deuterium bottleneck

You'd think that with neutrons and protons both present at MeV temperatures, helium would assemble immediately. It can't, and the reason is a single fragile nucleus standing in the doorway.

The first step toward helium is making deuterium: one proton plus one neutron, the simplest compound nucleus. But deuterium is weakly bound, held together by only 2.22 MeV. In a bath of energetic photons, any deuteron that forms is instantly blown apart again by a gamma ray before it can react further. This is the **deuterium bottleneck**. Until the photon bath cools enough that deuterons survive, no helium can be built, because there's no stepping stone to stand on.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Here's the counter-intuitive bit. Deuterium can't survive until the temperature drops to about 0.07 MeV, far below its 2.22 MeV binding energy. Why so much colder than you'd expect? Because photons outnumber baryons by roughly two billion to one. Even when the average photon is far too feeble to break a deuteron, the rare high-energy photons in the tail of the distribution are still numerous enough to disrupt every deuteron the instant it forms. You have to cool until even that tail goes quiet. The bottleneck is set by the ratio of photons to matter, which is exactly the parameter we're about to meet.

When the gate finally opens, the whole episode runs at $T_{\text{BBN}} \sim 10^{9}$ K (about 0.1 MeV) and roughly three minutes in. Everything then happens fast. Deuterium piles up, then rapidly fuses up the chain to helium-3, tritium, and finally the very tightly bound helium-4. Helium-4 is a dead end: it's so stable, and the gaps in the chart of nuclei at mass 5 and mass 8 are so unforgiving, that almost everything funnels into helium-4 and stops there. Below 0.1 MeV the reactions themselves fall behind the expansion and freeze out, just as the weak interactions did earlier, and the reactor goes dark.

That mass gap is why the Big Bang made no carbon, no oxygen, no iron. There is no stable nucleus at mass 5 or mass 8 to bridge across, and by the time you'd need three-body collisions to leap the gap the universe is too thin and too cold for them to happen. The early universe builds hydrogen, helium, a trace of lithium, and then quits. Every heavier element in existence, every atom of the calcium in your bones and the iron in your blood, was made later, inside stars. Cosmology hands you the first two rungs of the periodic table; stars build the rest.

## A quarter, from one ratio

Now the payoff. Once deuterium survives, nearly every available neutron ends up bound into a helium-4 nucleus, because helium-4 is the most tightly bound light nucleus and the chain runs straight to it. So the helium abundance is essentially a counting exercise. Take the neutrons; pair each with a proton; the result is helium.

A helium-4 nucleus holds 2 neutrons and 2 protons. If the neutron-to-proton ratio is $n/p$, then for every pair of neutrons you consume two protons to match, and the mass fraction of helium works out to a clean formula.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
Y_p \approx \frac{2(n/p)}{1 + (n/p)}
```

$$
Y_p \approx \frac{2(n/p)}{1 + (n/p)}
$$

Put $n/p \approx 1/7$ into equation (3): the numerator is $2/7$, the denominator is $8/7$, and the ratio is $2/8 = 0.25$. A quarter. The helium fraction of the universe is, to a first approximation, just the geometry of pairing up a population of neutrons that's one-seventh the size of the proton population. No fine-tuning, no free parameters in this estimate. The neutron-to-proton ratio came from freeze-out physics; the helium fraction is what arithmetic does to it.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The universe is a quarter helium because, when the weak force let go, there was one neutron for every seven protons. Pair them up, and a quarter of the mass ends up in helium. That is the whole calculation, and it predates the first star.

This is the result that made Gamow, Alpher, and Herman's hot Big Bang model credible in the late 1940s, long before the cosmic microwave background was found. Their 1948 work predicted that a hot, dense early universe would naturally bake in roughly 25% helium, matching the abundance astronomers actually saw, and it predicted leftover radiation at a few kelvin as the afterglow. The radiation temperature they guessed, around 5 K, turned out to be 2.725 K when Penzias and Wilson stumbled onto it in 1965. Not exact, but the right idea and the right scale from a back-of-envelope calculation two decades early.

## The one dial that sets everything

The 25% estimate is robust because helium barely cares about the details. But the other light elements, deuterium, helium-3, lithium-7, are exquisitely sensitive to a single number: the **baryon-to-photon ratio**, the count of ordinary-matter particles per photon in the universe.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\eta \equiv \frac{n_b}{n_\gamma} \approx 6 \times 10^{-10}
```

$$
\eta \equiv \frac{n_b}{n_\gamma} \approx 6 \times 10^{-10}
$$

That tiny number, about six baryons for every ten billion photons, is the master dial. Turn $\eta$ up and there's more matter packed into each volume, so reactions run faster and more completely: more deuterium gets burned up into helium, leaving less leftover deuterium behind. Turn $\eta$ down and reactions stall earlier, leaving more unburned deuterium stranded. The effect is dramatic. Drop $\eta$ by a factor of 10 and the leftover deuterium abundance jumps by a factor of roughly 50. Deuterium is the most sensitive gauge we have; cosmologists call it a **baryometer**.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Here is the part that turns a nice story into hard science. You can measure $\eta$ two completely independent ways. First, by measuring primordial deuterium in ancient gas clouds backlit by distant quasars, then reading off the $\eta$ that produces it. Second, from the cosmic microwave background: the relative heights of the acoustic peaks in the CMB power spectrum depend on the baryon density, fixing $\eta$ from physics 380,000 years after the Big Bang, with nothing to do with nucleosynthesis. The two roads, separated by a hundred thousand years of cosmic history and using entirely different physics, give the same answer: $\eta_{10} \approx 6.1$. When two independent measurements of a fundamental number agree, you are no longer telling a story. You are measuring the universe.

So the framework is over-determined, which is the strongest position a theory can be in. One parameter, $\eta$, predicts the abundances of four different light nuclei across nine orders of magnitude. And that same parameter is pinned by a completely separate observation. There is no freedom left to fudge.

## Holding the fossil up to the light

Step back and look at what we can now do. Take the standard model of nucleosynthesis, feed it the baryon density that the CMB independently measures, and let it predict the primordial helium fraction. The modern calculation gives a sharp number.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
Y_p = 0.24709 \pm 0.00017 \;\; (\text{theory}) \quad \text{vs.} \quad Y_p = 0.2458 \pm 0.0013 \;\; (\text{obs.})
```

$$
Y_p = 0.24709 \pm 0.00017 \;\; (\text{theory}) \quad \text{vs.} \quad Y_p = 0.2458 \pm 0.0013 \;\; (\text{obs.})
$$

To measure that observed value, astronomers hunt for the most chemically pristine gas in the universe: metal-poor dwarf galaxies where almost no stellar processing has happened since the beginning, so the helium you see is nearly all primordial. Take the helium fraction in galaxies of varying metal content, and extrapolate back to zero metals, to the gas as the Big Bang left it. That extrapolation lands at $Y_p = 0.2458$, against a theoretical $0.24709$. The two agree to within a percent, comfortably inside the error bars.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Take a moment with what this is. A measurement of the light from galaxies billions of light-years away matches a calculation based on the temperature the universe had when it was three minutes old, using nuclear cross-sections measured in terrestrial labs and a baryon density read off the afterglow of the Big Bang. Three independent windows onto the same instant, and they line up. The agreement between the nucleosynthesis baryon density and the CMB baryon density holds the standard cosmological model together to within about two standard deviations.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

It would be easy to wave this away as "roughly right". It is the opposite of rough. For the helium prediction to land within a percent, the freeze-out temperature, the neutron lifetime, the deuterium binding energy, the expansion rate of the early universe, and the baryon density all have to be simultaneously correct. Change any one of them by much and the prediction drifts off the measurement. The fact that they all hold together is why primordial helium is not a curiosity but a test: a quantitative, falsifiable check on what the universe was doing in its first minutes, passed to the percent. Few predictions in any science are this sharp, this old, and this directly checkable against the sky.

## What the fossil tells us

There's a quiet philosophical payload here worth sitting with. We cannot rewind the universe and watch the first three minutes. There is no recording, no laboratory that reaches a billion kelvin and cosmic densities at once. And yet we can say, with sub-percent confidence, what was happening then, because the era left a fossil that survives intact: the helium, the deuterium, the trace of lithium. They are unchanged relics of a time we can never directly observe, and they let us reconstruct it the way a palaeontologist reconstructs an animal from bones.

The reconstruction even flags its own gaps honestly. The predicted lithium-7 abundance sits a factor of three above what we measure in old stars, the so-called lithium problem, and it has stubbornly refused to resolve for decades. That isn't a failure of the framework; it's the framework being precise enough that a factor-of-three discrepancy in one element is a genuine, sharp puzzle rather than noise. A theory that matches three elements to the percent and misses the fourth by a clean factor is far more interesting, and far more scientific, than one that vaguely fits everything.

So the next time you read that the universe is about three-quarters hydrogen and a quarter helium, remember that the second number is not a measured accident. It is a prediction, made from the neutron-to-proton ratio at one second, the deuterium binding energy, and the rate at which space was expanding when the cosmos was a single fusion reactor. The reactor ran for a few minutes, switched off, and left its ash everywhere. We are still reading it. Some food for thought, the next time you breathe in a little helium fossil from the first three minutes.

## Reading further

- [Alpher, Bethe & Gamow, *The Origin of Chemical Elements* (Phys. Rev. 73, 1948)](https://en.wikipedia.org/wiki/Alpher%E2%80%93Bethe%E2%80%93Gamow_paper). The two-page paper that started it all: a hot early universe that bakes in roughly 25% helium and leaves a few-kelvin afterglow, decades before the CMB was found.
- [Weinberg, *The First Three Minutes* (Basic Books, 1977)](https://en.wikipedia.org/wiki/The_First_Three_Minutes). The definitive popular account of nucleosynthesis, and the source of the framing this post borrows; still the clearest narrative of the freeze-out and the deuterium bottleneck.
- [Pitrou, Coc, Uzan & Vangioni, *Precision big bang nucleosynthesis with improved Helium-4 predictions* (arXiv:1801.08023, 2018)](https://arxiv.org/abs/1801.08023). The modern calculation behind $Y_p = 0.24709 \pm 0.00017$, with the nuclear-reaction-rate detail that makes the sub-percent comparison possible.
- [Cyburt et al., *Big Bang Nucleosynthesis: 2015* (Nucl. Phys. A 944)](https://ned.ipac.caltech.edu/level5/March15/Cyburt/Cyburt2.html). A thorough review of the theory and the data, including the baryon-to-photon ratio, the CMB cross-check, and the lingering lithium problem.
