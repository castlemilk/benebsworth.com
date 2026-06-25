---
title: Why the Night Sky Is Dark
date: '2026-06-14T00:00:00.000Z'
description: >-
  In an infinite, eternal, star-filled universe every line of sight should end
  on a star and the night should blaze like the Sun. It doesn't, and the
  darkness is hard evidence that the universe is neither infinitely old nor
  static.
labels: 'cosmology,astrophysics,olbers paradox,redshift'
release: true
author: Ben Ebsworth
heroImage: /blog/why-the-night-sky-is-dark/hero.webp
takeaways:
  - >-
    If the universe were infinite, eternal and static, every sightline would
    terminate on a stellar surface and the whole sky would glow at the
    temperature of a star. The night sky's darkness is therefore a measurement,
    not a mood.
  - >-
    The inverse-square law does not save you: distant stars dim as 1/r², but the
    number of stars at that distance grows as r², so every shell of sky
    contributes the same brightness. An infinite stack of equal terms diverges.
  - >-
    Dust can't rescue the paradox either. Absorbed starlight heats the dust
    until it re-radiates; in an eternal universe everything reaches the stars'
    own temperature and glows back.
  - >-
    The sky is dark because the universe has a finite age (light from far enough
    away simply hasn't arrived) and because expansion redshifts the light that
    does arrive down to invisible microwaves. Darkness is cosmology written on
    the sky every night.
markdown_url: /blog/why-the-night-sky-is-dark/
canonical_url: 'https://benebsworth.com/blog/why-the-night-sky-is-dark/'
---
## Key takeaways

- If the universe were infinite, eternal and static, every sightline would terminate on a stellar surface and the whole sky would glow at the temperature of a star. The night sky's darkness is therefore a measurement, not a mood.
- The inverse-square law does not save you: distant stars dim as 1/r², but the number of stars at that distance grows as r², so every shell of sky contributes the same brightness. An infinite stack of equal terms diverges.
- Dust can't rescue the paradox either. Absorbed starlight heats the dust until it re-radiates; in an eternal universe everything reaches the stars' own temperature and glows back.
- The sky is dark because the universe has a finite age (light from far enough away simply hasn't arrived) and because expansion redshifts the light that does arrive down to invisible microwaves. Darkness is cosmology written on the sky every night.

Step outside on a clear night, look up, and you are looking at a problem that took four centuries to solve. The sky between the stars is black. That sounds like the least surprising fact in astronomy, the default state of things, what you'd obviously expect. It is the opposite. If the universe were infinite in size, infinitely old, and roughly uniformly stuffed with stars, the night sky should not be dark at all. It should be a uniform blaze, every patch as bright as the surface of the Sun, glaring down on you with no gap anywhere for the black to show through. The darkness you take for granted is a genuine contradiction with a tidy-sounding cosmos, and resolving it forces a conclusion about the whole universe from nothing more than the fact that you can see the stars as separate points.

The argument has a name, Olbers' paradox, after the German astronomer Heinrich Olbers who laid it out cleanly in 1823. He was not the first to notice it and not the one who solved it, but the puzzle stuck to his name. The setup is almost insultingly simple, the conclusion is wrong, and the gap between them is where modern cosmology hides. Let's build the paradox first, take it seriously enough to feel its force, and only then break it.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Look at the field of stars and notice what dominates: the gaps. The dots are sparse and the black between them is almost everything. Now push the **Stars** control higher. More points, more crowding, but the darkness between them refuses to disappear. The paradox says this is an illusion of a small sample. In a truly infinite, ageless universe, follow any sightline far enough and it must eventually run into a star. Every pixel of sky should be the surface of *some* star. There should be no gap left to be dark.

## The argument that fills the sky with fire

Here is the claim in one sentence: in an infinite universe uniformly sprinkled with stars, every single line of sight, no matter which direction you pick, eventually terminates on the surface of a star.

Picture standing in an unimaginably vast forest, trees scattered evenly in every direction. Look horizontally. Nearby you can see between the trunks, out to the open. But the further you look the more trunks crowd into your line of sight, and past some distance there is no gap left: a solid wall of bark in every direction. The forest closes. Olbers' universe is that forest, with stars for trees and no edge to it. Stare into it and you should see an unbroken wall of stellar surface.

The objection comes immediately, and it's the wrong one. Surely distant stars are *dimmer*? A star twice as far away delivers a quarter of the light. The brightness of a source falls off as the inverse square of distance:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
F = \frac{L}{4\pi d^{2}}
```

$$
F = \frac{L}{4\pi d^{2}}
$$

The $L$ is the star's luminosity, the total power it pours out. The $4\pi d^{2}$ is the area of the sphere that power has spread across by the time it reaches you. Double the distance and the same light is smeared over four times the area, so you catch a quarter of it. Faraway stars really are fainter. It feels like this should rescue the darkness: pile up enough distance and each star fades to nothing.

It doesn't rescue anything, and seeing why is the heart of the paradox.

## The inverse square law cancels itself

Don't count stars one at a time. Count them in shells. Imagine the universe as a set of nested spherical shells centred on you, each one a thin slab of space at some distance $r$, of thickness $\mathrm{d}r$. Ask how much light arrives from a single shell.

Two effects fight inside that shell. Each star in it is dimmer by the inverse square, the factor $1/r^{2}$ from equation (1). But the shell is bigger the further out you go. The surface area of a sphere is $4\pi r^{2}$, so a shell at distance $r$ has a volume of $4\pi r^{2}\,\mathrm{d}r$, and if stars have some fixed number density $n$ per unit volume, the shell holds $n \cdot 4\pi r^{2}\,\mathrm{d}r$ stars. The star *count* grows as $r^{2}$, exactly the rate at which each star's brightness *shrinks*.

Multiply the two together. Light per star times number of stars:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\mathrm{d}F = \underbrace{\frac{L}{4\pi r^{2}}}_{\text{per star}} \times \underbrace{n\,4\pi r^{2}\,\mathrm{d}r}_{\text{stars in shell}} = n\,L\,\mathrm{d}r
```

$$
\mathrm{d}F = \underbrace{\frac{L}{4\pi r^{2}}}_{\text{per star}} \times \underbrace{n\,4\pi r^{2}\,\mathrm{d}r}_{\text{stars in shell}} = n\,L\,\mathrm{d}r
$$

The $r^{2}$ cancels. The distance disappears. Every shell, near or far, delivers the same amount of light: $n\,L\,\mathrm{d}r$. A shell a billion light-years out contributes exactly as much as a shell next door, because the extra stars it contains make up perfectly for each star being fainter.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Almost everyone reaches for the inverse-square law to explain the dark sky, and almost everyone stops there, satisfied. The trap is forgetting that there is *more sky* at greater distances. Dimming and crowding are the same power of $r$ pulling in opposite directions, and they exactly annul. The brightness of the sky is not a question about how faint distant stars are. It's a question about how many shells you stack, and in an infinite universe the answer is: infinitely many, each adding the same nonzero brightness.

Now add up all the shells, from your doorstep out to infinity. You are summing $n\,L\,\mathrm{d}r$ over $r$ from zero to forever:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
F_{\text{sky}} = \int_{0}^{\infty} n\,L\,\mathrm{d}r = n\,L \cdot \infty
```

$$
F_{\text{sky}} = \int_{0}^{\infty} n\,L\,\mathrm{d}r = n\,L \cdot \infty
$$

The total diverges. An infinite stack of equal terms is infinite. Taken at face value, equation (3) says the night sky should be infinitely bright.

Of course it isn't literally infinite, because stars are not transparent. A nearer star blocks the one directly behind it, so once your sightline hits a stellar surface, that's the end of the line. But that correction doesn't save the darkness, it just caps the blaze at a finite value: the surface brightness of a star. Every sightline ends on a star, so every direction shines at a star's surface temperature. The sky should glow uniformly at something like 6000 kelvin, the temperature of the Sun's surface. Day and night, in every direction, the entire celestial sphere as bright and as hot as the Sun. You would not survive a single such night, and neither would the oceans.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The darkness of the night sky is not the absence of information. It is one of the loudest pieces of evidence we have that the universe had a beginning.

That is Olbers' paradox in full. The reasoning is airtight given its premises. So one of the premises is false. The interesting question is which one, and the answer turns out to be: more than one, and each failure teaches you something real about the cosmos.

## The escape routes that don't work

Before the real solution, clear away the tempting wrong ones, because each is instructive.

**Maybe dust soaks up the light.** Space is not perfectly empty; there are clouds of gas and dust between the stars, and dust absorbs starlight. Couldn't that interstellar dust simply swallow the glow from distant stars and keep the sky dark? This was a serious proposal, floated by Olbers himself and others. It fails on thermodynamics. Dust that absorbs energy heats up. Keep pouring starlight into it forever, as an eternal universe would, and the dust reaches the same temperature as the stars themselves, at which point it radiates exactly as much as it absorbs and glows just as brightly. You can't hide a furnace inside a furnace. In a universe old enough for everything to reach equilibrium, the dust becomes part of the blaze rather than a shield against it.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The dust idea fails because absorption only redistributes energy, it never destroys it. A cold object placed in a hot radiation field heats until it re-emits everything it takes in. Given enough time, every absorber in the universe ends up at the radiation's temperature, glowing back. The only way absorption keeps the sky dark is if the universe hasn't had *time* to reach equilibrium, which is a clue, not a counterargument: it points straight at finite age.

**Maybe stars are just very sparse.** They are, staggeringly so. In our neighbourhood the density of stars is about 0.004 per cubic light-year, which is to say roughly one star per 250 cubic light-years of space. Stars are rare and tiny against the volume they float in. But sparseness only changes how *far* you have to look before sightlines fill up, not *whether* they do. Make the forest thinner and you simply have to walk further before the trunks close ranks; in an infinite forest they still close. Low density buys distance, not darkness. The integral in equation (3) still diverges; it just diverges more slowly.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

Neither dust nor sparseness touches the logic. The premises that actually fail are the two we treated as obvious: that the universe is infinitely old, and that it is static. Both are wrong, and each fix kills the paradox on its own.

## The first fix: the universe has a beginning

The cleanest resolution is also the most startling, and a poet got there before the astronomers. The universe is not infinitely old. It began, about 13.8 billion years ago, and light travels at a finite speed. Those two facts together put a hard wall around what you can see.

Light from a star a million light-years away left it a million years ago and is only now reaching your eye. Light from a star a billion light-years away has been travelling a billion years. So light from any star more than about 13.8 billion light-years away (in look-back time) simply *has not arrived yet*. It is still in transit. The shells in equation (3) don't run from zero to infinity. They run from zero out to a finite horizon, the distance light could have covered since the universe began, and you abruptly stop counting there.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

In 1848, the writer Edgar Allan Poe published *Eureka*, a strange book-length prose poem about cosmology. Buried in it is essentially the modern answer to Olbers, decades before astronomers accepted it. Poe wrote that the only way to reconcile the dark sky with countless stars is to suppose "that the distance of the invisible background was so immense that no ray from it has yet been able to reach us at all." That is the finite-age solution, stated as cleanly as anyone has since: the far universe is dark to us because its light is still on the way. The mathematics was filled in later by Johann Mädler in 1858 and Lord Kelvin in 1901, but the idea arrived first in a poem.

Cut the integral off at a finite horizon and equation (3) stops diverging. You sum a finite number of shells, each contributing $n\,L\,\mathrm{d}r$, and get a finite, *small* total. There has not been enough time for light from enough stars to pile up into a blaze. The forest has an edge after all, not in space, but in time. Beyond the horizon there may be endlessly more stars, but their light hasn't reached us and so contributes nothing to tonight's sky. Finite age alone is enough to make the sky dark. The darkness is, quite literally, the universe telling you it had a birthday.

The age scale isn't arbitrary either; it falls out of the expansion itself. The recession speed of a galaxy is proportional to its distance, Hubble's law, and the constant of proportionality sets a timescale:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
v = H_{0}\,d, \qquad H_{0} \approx 70\ \text{km/s/Mpc} \;\Rightarrow\; t_{H} = \frac{1}{H_{0}} \approx 14.4\ \text{Gyr}
```

$$
v = H_{0}\,d, \qquad H_{0} \approx 70\ \text{km/s/Mpc} \;\Rightarrow\; t_{H} = \frac{1}{H_{0}} \approx 14.4\ \text{Gyr}
$$

Invert the Hubble constant $H_{0}$ and you get the Hubble time, about 14.4 billion years, comfortingly close to the true age of 13.8 billion. The same expansion that we'll use for the second fix hands you the age scale for the first.

## The second fix: expansion drains the light

Finite age does the job by itself, but the universe piles on a second, independent rescue. Space is expanding, and that expansion stretches the light crossing it.

This is the part that surprises people who already know the universe is expanding. The stretching isn't a metaphor. As a photon travels through expanding space, the space it's crossing literally swells beneath it, and the photon's wavelength stretches in proportion. A wave that left a distant star as visible light arrives at your eye shifted toward the red, then the infrared, then the microwave, depending on how far it came and how much space grew along the way. The amount of stretch is the redshift:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
z = \frac{\lambda_{\text{observed}} - \lambda_{\text{emitted}}}{\lambda_{\text{emitted}}}
```

$$
z = \frac{\lambda_{\text{observed}} - \lambda_{\text{emitted}}}{\lambda_{\text{emitted}}}
$$

A redshift of $z = 1$ means the wavelength has doubled. Redshift does two damaging things to the would-be blaze. It robs each photon of energy, since a longer-wavelength photon carries less, and it shifts the light right out of the visible band, so even the light that does arrive often arrives as radiation your eye can't register at all. The expansion is a tax on every photon, and the tax compounds with distance.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

Push **Warp** and **Streak** up and watch the stars stretch into receding streaks, draining past the edges. It's a crude analogy, but it carries the right feeling: in an expanding universe, light from far away doesn't arrive at full strength. It arrives stretched, reddened, and weakened, its energy diluted by the very space it crossed. The further the source, the harder the expansion has worked on its light, until the most distant glow is shifted clean out of sight.

The most spectacular demonstration of this is already filling your sky, you just can't see it. The most distant light in the universe comes from the moment, about 380,000 years after the Big Bang, when the cosmos cooled enough to turn transparent. That light started out as a hot glow, roughly visible and ultraviolet, the radiance of a universe at a few thousand degrees. It has been travelling ever since, and the universe has expanded by a factor of about 1100 while it was in flight. So its wavelength has been stretched by that same factor, $z \approx 1100$, dragging it from the visible band all the way down to microwaves.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Here is the twist that makes the whole story click. Olbers was not entirely wrong. There *is* a wall of light surrounding us in every direction, a sky that genuinely does glow uniformly from edge to edge, exactly as the paradox demands. It's the cosmic microwave background, and it really does come from every line of sight terminating on a hot, opaque surface, the early universe at last scattering. The blaze is there. But expansion has redshifted it from a few thousand kelvin down to a frigid 2.7 K, deep in the microwave band, far below anything the eye can sense. The sky *is* on fire in every direction. The fire has simply cooled, by a factor of more than a thousand, into invisibility.

So the night is dark for two reasons working together. There hasn't been enough time for light from far enough away to reach us, which limits how many stars contribute at all. And the light from the most distant sources that does reach us has been redshifted into bands the eye cannot register. Take away either premise of the paradox, eternity or stasis, and the blaze fails to ignite. The real universe lacks both. It is finite in age and it is expanding, and the darkness overhead is the direct, visible consequence.

## What the dark sky is really telling you

It's worth sitting with how much this argument extracts from how little. You need no telescope, no spectrograph, no satellite. You need only to notice that the sky between the stars is black, and to take seriously what that blackness rules out. It rules out an infinite, eternal, static universe, the cosmos that nearly everyone from Aristotle to Newton assumed we lived in. The darkness is incompatible with it. You are looking, with your naked eye, at evidence for a universe with a beginning and a history.

Edward Harrison, the physicist who in 1987 wrote the definitive history of this puzzle, called it the riddle that the universe poses to anyone who looks up. For four hundred years the sharpest minds in astronomy circled it: Thomas Digges glimpsed it in 1576, Kepler worried at it, Halley and Cheseaux took swings, Olbers crystallised it in 1823, Poe intuited the answer in 1848, and it wasn't fully resolved until the expanding-universe cosmology of the twentieth century gave both the finite age and the redshift their proper footing. The fact that the answer demanded a beginning to time was, for a long while, exactly why people resisted it.

Some food for thought, then, the next time you're under a properly dark sky. The black between the stars is not nothing. It is the most ancient and most direct observation in all of cosmology, available to every human who has ever lived, and its message is plain once you know how to read it: the universe is young enough, and growing fast enough, that its fire hasn't reached you yet. The darkness is the data. The night sky is dark because the universe is still, in the deepest sense, getting started.

## Reading further

- [Edward Harrison, *Darkness at Night: A Riddle of the Universe* (Harvard University Press, 1987)](https://www.hup.harvard.edu/books/9780674192713). The definitive synthesis of four centuries of the puzzle, from Digges through Kepler, Olbers, Mädler and Kelvin to modern cosmology; the source for the historical thread above.
- [Olbers' paradox (Wikipedia)](https://en.wikipedia.org/wiki/Olbers%27_paradox). A clear historical and mathematical overview, tracking the paradox from 1576 to the finite-age and expansion solutions, with the shell argument worked through.
- [Cosmic microwave background (Wikipedia)](https://en.wikipedia.org/wiki/Cosmic_microwave_background). On the $z \approx 1100$ redshift that drags the early universe's glow from visible light down to a 2.7 K microwave hum, the realised version of Olbers' blaze.
- [Redshift (Wikipedia)](https://en.wikipedia.org/wiki/Redshift). The mechanism behind equation (5): how cosmic expansion stretches wavelengths and shifts starlight out of the visible band entirely.
