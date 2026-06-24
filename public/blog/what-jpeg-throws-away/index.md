---
title: What JPEG throws away
date: '2026-06-23T00:00:00.000Z'
author: Ben Ebsworth
description: >-
  A JPEG is often a tenth the size of the raw image and you can't see the
  difference. Where did ninety percent of the data go? We follow an 8×8 block
  through the discrete cosine transform and quantisation to find out: JPEG sorts
  a picture by spatial frequency, then quietly bins the fine detail your eyes
  barely register.
labels: 'electrical-engineering,signals,compression'
release: true
heroImage: /blog/what-jpeg-throws-away/hero.webp
takeaways:
  - >-
    JPEG works by changing what it stores: instead of pixels, it stores how much
    of each spatial frequency a small block contains, using the discrete cosine
    transform.
  - >-
    The DCT compacts almost all of a block's energy into a few low-frequency
    coefficients, so quantisation can round the rest to zero — and the rest is
    the fine detail the eye is least sensitive to.
  - >-
    Push the quality down and you see the cost directly: the 8×8 block grid
    appears and sharp edges ring, because you've thrown away the high-frequency
    coefficients that described them.
markdown_url: /blog/what-jpeg-throws-away/
canonical_url: 'https://benebsworth.com/blog/what-jpeg-throws-away/'
---
## Key takeaways

- JPEG works by changing what it stores: instead of pixels, it stores how much of each spatial frequency a small block contains, using the discrete cosine transform.
- The DCT compacts almost all of a block's energy into a few low-frequency coefficients, so quantisation can round the rest to zero — and the rest is the fine detail the eye is least sensitive to.
- Push the quality down and you see the cost directly: the 8×8 block grid appears and sharp edges ring, because you've thrown away the high-frequency coefficients that described them.

Save a photo as a JPEG and it's often a tenth the size of the raw original, sometimes less, and you'd struggle to spot the difference. That should bother you a little. Where did ninety percent of the information go? It can't be free. The answer is that JPEG is very good at finding the parts of an image your eyes don't actually use, and throwing exactly those away. It's not magic compression; it's a careful model of what human vision ignores. Let's follow a single tile of an image through the machine and watch the data disappear.

This is, underneath, the same frequency-domain idea as the [Fourier series](/blog/every-wave-is-a-circle/) (re-describing a signal by which waves it's made of), applied to pictures. If that post was about sound and circles, this is the same trick in two dimensions, doing something eminently practical.

## Stop storing pixels

JPEG's first move is to stop thinking in pixels. It chops the image into 8×8 blocks and asks a different question of each one: not "what are these 64 brightness values" but "how much of each *spatial frequency* is in this block". A flat patch of sky is almost all low frequency (it barely changes across the block); a patch with a sharp edge or fine texture has high-frequency content. The tool that re-expresses a block this way is the **discrete cosine transform** (DCT), a close cousin of the Fourier transform that uses cosines:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
F(u,v) = \tfrac{1}{4} C(u)C(v) \sum_{x=0}^{7}\sum_{y=0}^{7} f(x,y) \cos\!\frac{(2x{+}1)u\pi}{16}\cos\!\frac{(2y{+}1)v\pi}{16}
```

$$
F(u,v) = \tfrac{1}{4} C(u)C(v) \sum_{x=0}^{7}\sum_{y=0}^{7} f(x,y) \cos\!\frac{(2x{+}1)u\pi}{16}\cos\!\frac{(2y{+}1)v\pi}{16}
$$

with $C(0) = 1/\sqrt{2}$ and $C(k)=1$ otherwise.

The output is another 8×8 grid, but now each cell is a *coefficient*: how much of one particular cosine pattern the block contains. The top-left cell ($u=v=0$) is the block's average brightness, the "DC" term; move right and down and the patterns get finer, up to a fine checkerboard in the bottom-right corner. Here's a block, its coefficients, and the reconstruction, side by side. Drag the quality down and watch what happens.

> [DctBlock component] An interactive 8×8 JPEG demonstration for the "what JPEG throws away" post, with three panels: the original grayscale block, its 2-D DCT coefficient magnitudes as a log heatmap (DC top-left, AC ramping right and down), and the reconstruction after quantisation and inverse DCT. A quality slider (1–100) and a sample selector (gradient / edge / texture) let the reader watch high-frequency coefficients round to zero — the kept-coefficient count falls, the block goes blocky, and RMSE rises — making concrete the detail JPEG discards because the eye barely notices it. The rendered post has the live version.

## The detail clusters where you'll miss it

Here's the property that makes the whole thing work, and you can see it in the coefficient panel: for real images, almost all the magnitude piles up in the top-left, the low frequencies. The fine, high-frequency coefficients are mostly small. That's called **energy compaction**, and the DCT is famously good at it for natural images. So most of a block is described by a handful of numbers, and the rest is small change.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This is the quiet brilliance. The transform doesn't *delete* anything: it's perfectly reversible, the reconstruction at top quality is exact. What it does is *reorganise* the block so that the important, low-frequency structure and the negligible, high-frequency detail end up in separate, labelled boxes. Once they're sorted, you can keep the big boxes and discard the small ones. And it happens that human vision is far more sensitive to low spatial frequencies (broad shapes and gradients) than to high ones (fine texture), so "the small coefficients" and "the detail you won't miss" are largely the same set. The DCT lines the data up so the throwing-away is easy and cheap to your eye.

## The actual throwing-away

Sorting doesn't save space by itself; the discarding happens at the next step, **quantisation**. Each coefficient is divided by a number from a quantisation table and rounded:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
F_q(u,v) = \operatorname{round}\!\left(\frac{F(u,v)}{Q(u,v)}\right)
```

$$
F_q(u,v) = \operatorname{round}\!\left(\frac{F(u,v)}{Q(u,v)}\right)
$$

The table $Q$ uses small divisors for the low frequencies (keep them precise) and large divisors for the high ones (crush them). A high-frequency coefficient divided by a big number and rounded becomes zero, and a block full of zeros compresses to almost nothing in the final lossless step. That's where the ninety percent goes: into runs of zeros that used to be faint detail.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The standard JPEG quantisation table isn't arbitrary. It was tuned against experiments on human contrast sensitivity. It throws away high-frequency *luminance* aggressively, and high-frequency *colour* even more aggressively, because the eye is least sensitive there (it's also why JPEG stores colour at lower resolution than brightness). The "quality" slider just scales this whole table up or down. So a JPEG isn't a generic compressor that happens to work on images; it's a compressor with a model of your visual system baked into a little 8×8 table of numbers.

To get the picture back, you multiply the quantised coefficients by the table again (recovering approximations of the originals, the rounding now permanent) and run the DCT in reverse:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
f(x,y) = \tfrac{1}{4}\sum_{u=0}^{7}\sum_{v=0}^{7} C(u)C(v)\,F(u,v) \cos\!\frac{(2x{+}1)u\pi}{16}\cos\!\frac{(2y{+}1)v\pi}{16}
```

$$
f(x,y) = \tfrac{1}{4}\sum_{u=0}^{7}\sum_{v=0}^{7} C(u)C(v)\,F(u,v) \cos\!\frac{(2x{+}1)u\pi}{16}\cos\!\frac{(2y{+}1)v\pi}{16}
$$

## You can push it too far

Drag the quality slider all the way down in the demo and the trick stops hiding. Two things appear. First, the **8×8 grid** becomes visible. Because each block is quantised independently, neighbours stop agreeing at their edges and the tiling shows through. Second, sharp edges **ring**: an edge needs lots of high-frequency coefficients to stay crisp, and once you've binned those away, the inverse DCT reconstructs the edge as a wobble, the same overshoot the [Fourier series shows at a discontinuity](/blog/every-wave-is-a-circle/) (the Gibbs phenomenon, in two dimensions). Those two artefacts, blocking and ringing, are the visible signature of JPEG running out of room.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Every time an image is re-saved as JPEG it gets quantised again, and the damage accumulates. This is "generation loss", the reason a meme that's been screenshotted and re-shared a hundred times looks like it's been through a war. It's also why you should keep a lossless master (PNG, or the raw) of anything you'll edit repeatedly, and only export to JPEG at the end. Quantisation is a one-way door; walk through it once per save.

Some food for thought: JPEG, MP3, and most of the media you consume are built on the same philosophy: find the limits of human perception and store only up to them. MP3 throws away sounds your ear masks; JPEG throws away detail your eye glosses over. There's something a bit unsettling and a bit wonderful about how much of our digital world is shaped precisely around the gaps in our own senses. We're not storing reality; we're storing the part of it we can tell apart.

## Recap

JPEG stops storing pixels and starts storing spatial frequencies, using the DCT to sort each 8×8 block so the important low-frequency structure separates cleanly from the negligible high-frequency detail. Quantisation then rounds the high frequencies toward zero, guided by a table tuned to human vision, and the resulting runs of zeros compress away. Done gently it's invisible; pushed hard it shows its hand as blocking and ringing. Ninety percent of the file was detail you were never going to see.

## Reading further

- **Wallace (1991), *The JPEG Still Picture Compression Standard***: the original overview from the committee that designed it, and still the clearest end-to-end description. [ieeexplore / PDF](https://www.cs.cmu.edu/~chuck/lennapg/lenna_files/wallace_1991.pdf)
- **Ahmed, Natarajan & Rao (1974)**: the paper that introduced the discrete cosine transform itself, the mathematical engine under the whole format. [the DCT paper](https://ieeexplore.ieee.org/document/1672377)
- **Pennebaker & Mitchell, *JPEG: Still Image Data Compression Standard***: the deep reference book if you want every stage including the entropy coding the post skipped.
- **Christopher Olah-style visual treatments and the *Unraveling JPEG* interactive (Omar Shehata, parametric.press)**: a gorgeous interactive walk through every stage if you want to poke at a real image. [parametric.press/issue-01/unraveling-the-jpeg](https://parametric.press/issue-01/unraveling-the-jpeg/)
