---
title: How to paint with noise
date: '2026-06-23T00:00:00.000Z'
author: Ben Ebsworth
description: >-
  Image generators start from pure TV static and end with a photo. The trick
  that makes it possible is wonderfully sneaky: don't learn to paint, learn to
  remove a little noise, then run that backwards from static. We build the
  forward noising process step by step, see the signal-versus-noise schedule,
  and work out why predicting noise is such a clever thing to train.
labels: 'software,machine-learning,diffusion,generative-ai'
release: true
heroImage: /blog/how-to-paint-with-noise/hero.webp
takeaways:
  - >-
    Diffusion models don't learn to paint; they learn to remove a little noise.
    Run that denoiser backwards from pure static, step by step, and an image
    appears.
  - >-
    The forward process — repeatedly adding Gaussian noise until the image is
    destroyed — is fixed and needs no learning. Only the reverse is learned, and
    the forward process hands you infinite free training data.
  - >-
    Predicting the noise is a well-posed regression with a right answer, unlike
    the impossible task of 'draw a cat from nothing'. That reframing is the
    whole reason it works.
markdown_url: /blog/how-to-paint-with-noise/
canonical_url: 'https://benebsworth.com/blog/how-to-paint-with-noise/'
---
## Key takeaways

- Diffusion models don't learn to paint; they learn to remove a little noise. Run that denoiser backwards from pure static, step by step, and an image appears.
- The forward process — repeatedly adding Gaussian noise until the image is destroyed — is fixed and needs no learning. Only the reverse is learned, and the forward process hands you infinite free training data.
- Predicting the noise is a well-posed regression with a right answer, unlike the impossible task of 'draw a cat from nothing'. That reframing is the whole reason it works.

Here's a thing that sounds like it shouldn't be possible. You feed a model pure noise (the snow you'd get from an untuned TV) and out comes a sharp, detailed, never-before-seen photograph of a cat. Not retrieved, not collaged: generated, pixel by pixel, from static. The first time I really understood how, I laughed, because the trick is so sneaky it feels like cheating. The model never learns to paint. It learns to do something much easier, and then we run that easy thing backwards.

This is the other half of the modern AI story. I spent a [whole post on transformers](/blog/a-transformer-reads-everything-at-once/), the engine behind text. Diffusion is the engine behind images, and its central idea is completely different and, I think, even more surprising once it clicks.

## Destroying an image is easy

Start at the easy end. Take an image and add a little random noise. Add a little more. Keep going, and after enough steps every trace of the original is gone and you're left with pure static. That's the **forward process**, and the lovely thing about it is that it requires no intelligence whatsoever. Anyone can destroy a picture. Drag the slider to ruin this one, or hit play to watch it dissolve.

> [DiffusionLoop component] An interactive forward-diffusion demo for the "how to paint with noise" post. A procedurally drawn 28×28 image (a smiley) is progressively corrupted by x_t = √ᾱ_t·x₀ + √(1−ᾱ_t)·ε with a fixed seeded Gaussian noise field, marching from a clean image to pure static and back via a timestep slider or an add-noise/denoise play button. The caption makes the honest point that denoising here just replays the same stored noise backward, whereas a real model learns to predict the noise and subtract it. The rendered post has the live version.

At each step we mix a shrinking amount of the real image with a growing amount of fresh noise. The exact recipe, the thing the whole field is built on, is one line:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
x_t = \sqrt{\bar\alpha_t}\, x_0 + \sqrt{1-\bar\alpha_t}\,\varepsilon, \qquad \varepsilon \sim \mathcal{N}(0, I)
```

$$
x_t = \sqrt{\bar\alpha_t}\, x_0 + \sqrt{1-\bar\alpha_t}\,\varepsilon, \qquad \varepsilon \sim \mathcal{N}(0, I)
$$

The single knob is $\bar\alpha_t$: at the start it's nearly 1, so the image is almost all signal; by the end it's nearly 0, so it's almost all noise. That trajectory from signal to noise is the **schedule**, and it's worth seeing on its own, because the reverse process is going to walk it backwards.

> [NoiseSchedule component] A small SVG line chart (companion to DiffusionLoop) plotting the two diffusion mixing weights — signal = √ᾱ_t in teal and noise = √(1−ᾱ_t) in orange — across the timesteps, with a marker at the current step. Because the weights sum in quadrature to 1, the image is a pure blend at every step and the curves cross exactly where ᾱ_t = 0.5, anchoring why the schedule trades signal for noise as t grows. The rendered post has the live version.

The two curves are how much signal and how much noise are in the picture at each step. They cross in the middle, where the image is half itself and half static, and because they're square-rooted shares of one whole, signal² plus noise² is always exactly 1. The image at any step is a pure blend, never anything more complicated.

## Creating one is destruction, reversed

Now the sneaky part. We've got a process that turns images into noise. We want the opposite: noise into images. So we train a network to undo *one step* of the damage. Given a noisy image and which step it's at, it learns to predict the noise that was added. Subtract a bit of that predicted noise and you've got a slightly cleaner image. Do it again. And again. Start from pure static and run this denoiser all the way back, and an image you've never seen assembles itself out of the snow.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

This is the reframing that makes the impossible possible. "Generate a photorealistic cat from nothing" is a hopeless thing to ask a network to learn directly: there's no single right answer, no gradient pointing at "more correct". But "here is a slightly noisy cat, what noise did I add?" is a *regression problem with an exact right answer*: you literally know the noise, because you added it. So you turn an impossible creative task into a million easy, well-posed denoising tasks, learn those, and chain them. Creation falls out of running destruction backwards.

Because the forward process is fixed and known, the training data is free and infinite. Take any image, pick any noise level, add the corresponding noise, and you have a labelled example: the input is the noisy image and the step, the answer is the noise. The training objective is just "predict that noise well":

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\mathcal{L} = \mathbb{E}_{x_0,\,t,\,\varepsilon}\left[\,\bigl\lVert \varepsilon - \varepsilon_\theta(x_t, t) \bigr\rVert^2\,\right]
```

$$
\mathcal{L} = \mathbb{E}_{x_0,\,t,\,\varepsilon}\left[\,\bigl\lVert \varepsilon - \varepsilon_\theta(x_t, t) \bigr\rVert^2\,\right]
$$

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

In the toy above, the "denoise" direction just replays the *same* noise it added, in reverse. That's a cheat I'm owning up to: I already know the noise, so of course I can subtract it. A real model doesn't know it. That's the entire job of $\varepsilon_\theta$, to *predict* the noise from the messy image alone, having learned what cats and faces and grass tend to look like. Everything else in the demo (the schedule, the blend, the step-by-step walk) is exactly what a real sampler does. The one piece you can't fake in a browser is the learned guess, which is precisely the piece that took a few hundred million images to train.

## How it knows to draw a *cat*

If you just run the denoiser from random static you get *a* plausible image, but not one you asked for. To steer it, you feed in a condition, usually a text prompt, and the denoiser learns to predict the noise *given* that prompt. The text gets turned into a vector by a language encoder (which is, pleasingly, a [transformer](/blog/a-transformer-reads-everything-at-once/)), and that vector nudges every denoising step toward images that match. A trick called classifier-free guidance lets you dial the strength of that nudge: turn it up and the model clings harder to your prompt, sometimes at the cost of looking a bit overcooked. So the two halves of modern AI meet here: a transformer reads your words, and a diffusion model paints them by un-noising.

## What it costs

Nothing's free. The obvious price is speed: where a [GAN](/blog/neural-network-zoo-explained/) generates an image in one forward pass, a diffusion model takes many denoising steps, dozens to a thousand depending on the sampler. A lot of recent research is about getting the step count down (better schedules, distillation, clever solvers) without wrecking quality. The schedule itself matters more than you'd guess: spend too few steps near the noisy end and the model never establishes the big shapes; too few near the clean end and the fine detail comes out mushy.

Some food for thought to end on. There's something almost philosophical about the idea that the way to create is to learn destruction and run it in reverse: that a detailed, specific image is just static with the right noise carefully removed. It rhymes with how sculptors talk about finding the statue inside the marble. I don't want to push the metaphor too far, but I do think it's one of those ideas that's prettier than it had any right to be.

## Recap

A diffusion model is trained on the easiest possible task: look at a noisy image and guess the noise. Because the forward noising process is fixed, that training data is free and the task is well-posed. Chain the learned denoiser backwards from pure static, optionally steered by a text prompt, and an image emerges one small step at a time. Don't learn to paint. Learn to un-noise, then run it in reverse.

## Reading further

- **Ho, Jain & Abbeel (2020), *Denoising Diffusion Probabilistic Models***: the paper that made diffusion work and fixed the form of the equations above. [arXiv:2006.11239](https://arxiv.org/abs/2006.11239)
- **Sohl-Dickstein et al. (2015)**: the original idea of learning to reverse a diffusion, five years before it caught fire. [arXiv:1503.03585](https://arxiv.org/abs/1503.03585)
- **Song et al. (2021), *Score-Based Generative Modeling through SDEs***: the deeper view that unifies diffusion with score matching and continuous-time SDEs. [arXiv:2011.13456](https://arxiv.org/abs/2011.13456)
- **Lilian Weng, *What are Diffusion Models?***: the best single explainer online once you want every term in the equations pinned down. [lilianweng.github.io](https://lilianweng.github.io/posts/2021-07-11-diffusion-models/)
