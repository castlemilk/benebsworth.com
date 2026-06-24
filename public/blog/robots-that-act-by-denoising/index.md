---
title: Robots that act by denoising
date: '2026-06-24T12:00:00.000Z'
author: Ben Ebsworth
description: >-
  The same denoising trick that paints a cat from TV static can drive a robot
  arm. Instead of refining pixels you refine a trajectory of future actions,
  sculpting a random tangle of motions into a plan conditioned on what the
  camera sees. We work out why plain regression freezes a robot between two
  valid moves, why diffusion handles that naturally, and how the idea scales
  into the vision-language-action models on the frontier.
labels: 'software,machine-learning,robotics,diffusion,embodied-ai'
release: true
heroImage: /blog/robots-that-act-by-denoising/hero.webp
takeaways:
  - >-
    A diffusion policy doesn't output a single action; it denoises a whole chunk
    of future actions from random noise, conditioned on the latest camera frame.
    It's the image-diffusion sampler run in trajectory space.
  - >-
    Plain behaviour cloning fails on human demos because the data is multimodal:
    there are several good ways to grab a mug, and a regression head averages
    them into one useless in-between motion that collides with it.
  - >-
    The forward and reverse processes are the exact DDPM maths from image
    generation; only the output space changes from pixels to actions. The same
    reason it could paint is the reason it can plan.
  - >-
    The two real costs are inference speed and demo hunger, and flow-matching
    and consistency-distilled policies are closing the speed gap from dozens of
    steps down to one or two.
markdown_url: /blog/robots-that-act-by-denoising/
canonical_url: 'https://benebsworth.com/blog/robots-that-act-by-denoising/'
---
## Key takeaways

- A diffusion policy doesn't output a single action; it denoises a whole chunk of future actions from random noise, conditioned on the latest camera frame. It's the image-diffusion sampler run in trajectory space.
- Plain behaviour cloning fails on human demos because the data is multimodal: there are several good ways to grab a mug, and a regression head averages them into one useless in-between motion that collides with it.
- The forward and reverse processes are the exact DDPM maths from image generation; only the output space changes from pixels to actions. The same reason it could paint is the reason it can plan.
- The two real costs are inference speed and demo hunger, and flow-matching and consistency-distilled policies are closing the speed gap from dozens of steps down to one or two.

I [wrote recently](/blog/how-to-paint-with-noise/) about how an image generator turns pure TV static into a sharp photo: it never learns to paint, it learns to remove a little noise, and then it runs that backwards from static until a picture assembles itself. I called it the sneakiest idea in modern AI. Here's the part that genuinely surprised me afterwards. That same trick can drive a robot.

Swap the thing being denoised. Instead of cleaning the noise out of an image, clean it out of a *plan*: start with a random scribble of future arm movements and, looking at the camera, rub the randomness off until the scribble becomes a smooth path that reaches the cup without knocking it over. The maths barely changes. What changes is what lives in the output vector, and that one swap fixes a problem that had quietly held robot learning back for years.

## Why copying the expert isn't enough

The obvious way to teach a robot is to show it. Collect a few hundred demonstrations of a human teleoperating the arm, then train a network to map "what the camera sees" to "what the human did". This is *behaviour cloning*, and it's plain supervised regression. It works, until it doesn't, and the way it fails is instructive.

Picture a mug on a table. Some demonstrators reach for it from the left, some from the right, and both are perfectly good grasps. Your training data now contains, for nearly the same camera image, two very different correct actions. Ask a regression network to fit that, and it does the only thing least-squares can do: it splits the difference. The average of "go left" and "go right" is "go straight ahead", directly into the mug. The robot, faced with two good options, freezes in the dead centre and fails.

> [ModeCollapseStrip component] A one-dimensional view of why averaging fails, for the diffusion-policy post: a bimodal action distribution p(a|o) with the regression prediction (the conditional mean) pinned in the empty valley between its two peaks, while diffusion samples land on the peaks themselves. A "mode separation" slider widens the gap to show the averaged prediction getting steadily worse as the modes separate. The rendered post has the live version.

## Mode-averaging, made precise

That isn't bad luck, it's exactly what the loss function asks for. Squared-error training has a known minimiser, and it's the conditional mean.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\theta^\star = \arg\min_\theta\; \mathbb{E}_{(o,a)\sim\mathcal{D}}\bigl[\,\lVert a - f_\theta(o)\rVert^2\,\bigr] \;\;\Longrightarrow\;\; f_{\theta^\star}(o) = \mathbb{E}[\,a \mid o\,]
```

$$
\theta^\star = \arg\min_\theta\; \mathbb{E}_{(o,a)\sim\mathcal{D}}\bigl[\,\lVert a - f_\theta(o)\rVert^2\,\bigr] \;\;\Longrightarrow\;\; f_{\theta^\star}(o) = \mathbb{E}[\,a \mid o\,]
$$

When the right answer is a single mode, the conditional mean is fine. When the right answer is "either of these two", the mean lands in the valley between them, where the density is near zero and no expert ever went. Drag the separation slider above and watch it: the further apart the two good grasps, the worse the averaged prediction gets. This is the wall, and it's a property of the loss, not the network. (The optimiser that drives the network to that mean is just [gradient descent](/blog/learning-by-rolling-downhill/) doing its job.)

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The whole argument turns on one statistical fact. Reach for a mug from the left or from the right and both succeed; the midpoint of those two reaches is a head-on collision. Regression has no escape from this, because its loss is minimised *exactly* at that collision. Diffusion escapes because it doesn't predict a single number, it learns the whole shape of the answer distribution and then samples one point from it, so it commits to one valid grasp instead of blending all of them into an invalid one.

## Denoise the plan, not the pixels

So we want a policy that can represent "either of these" and pick one cleanly, rather than averaging. A diffusion model does precisely that, because it fits a full distribution rather than its mean. The recipe is the image one, lifted wholesale. Take a clean chunk of actions, add noise to it step by step until it's random (the forward process), and train a network to undo one step of that noising while looking at the camera.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
a_t^{(k)} = \sqrt{\bar\alpha_k}\, a_t^{(0)} + \sqrt{1-\bar\alpha_k}\,\varepsilon, \qquad \varepsilon \sim \mathcal{N}(0, I)
```

$$
a_t^{(k)} = \sqrt{\bar\alpha_k}\, a_t^{(0)} + \sqrt{1-\bar\alpha_k}\,\varepsilon, \qquad \varepsilon \sim \mathcal{N}(0, I)
$$

To act, you run it in reverse: start from a random tangle of motions and denoise it, step by step, into a clean path, with one extra ingredient threaded through every step.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
a_t^{(k-1)} = \frac{1}{\sqrt{\alpha_k}}\!\left(a_t^{(k)} - \frac{1-\alpha_k}{\sqrt{1-\bar\alpha_k}}\,\varepsilon_\theta\bigl(a_t^{(k)},\, k,\, o_t\bigr)\right) + \sigma_k z
```

$$
a_t^{(k-1)} = \frac{1}{\sqrt{\alpha_k}}\!\left(a_t^{(k)} - \frac{1-\alpha_k}{\sqrt{1-\bar\alpha_k}}\,\varepsilon_\theta\bigl(a_t^{(k)},\, k,\, o_t\bigr)\right) + \sigma_k z
$$

Watch it happen. A cloud of random trajectories refines into clean paths that curve around the obstacle to the goal, and the toggle drops the regression baseline back in so you can see it slice straight through.

> [DenoisingPlanner component] An interactive 2D planner for the "robots that act by denoising" (diffusion policy) post. A cloud of random action trajectories refines, step by step over the reverse diffusion schedule, into clean paths that curve around an obstacle to the goal, conditioned on the scene; a multimodality toggle splits them into two valid routes. A regression-baseline toggle overlays the pointwise mean of two valid routes, which drives straight through the obstacle — the mode-averaging failure made visible. The rendered post has the live version.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Equation (2) is line for line the forward process from the [image post](/blog/how-to-paint-with-noise/). Equation (3) is the same reverse step with one extra argument, the observation $o_t$, threaded into the noise-predictor. If you followed how a model paints a cat from static, you already know how a robot plans. The only thing that changed is what sits in the output vector: pixels became joint targets. The same reason it could paint is the reason it can plan.

## Action chunking and the receding horizon

One detail makes it work on a real arm. You don't denoise a single next action, you denoise a whole *chunk* of the next $H$ actions at once.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\hat a_{t:t+H} \sim p_\theta\bigl(a_{t:t+H} \mid o_t\bigr), \qquad \text{execute } a_{t:t+H_e},\; H_e < H,\; \text{then replan}
```

$$
\hat a_{t:t+H} \sim p_\theta\bigl(a_{t:t+H} \mid o_t\bigr), \qquad \text{execute } a_{t:t+H_e},\; H_e < H,\; \text{then replan}
$$

Predicting a chunk gives the motion temporal consistency, so the arm doesn't dither and reverse itself every control tick. But you don't blindly run the whole chunk, you execute the first slice and then re-observe and resample, so a fresh camera frame can still change the plan. Long horizon buys smoothness; frequent replanning buys reactivity, and you trade them off. (If that loop, predict a horizon, act on the front of it, replan, rings a bell, hold that thought for the aside.)

## What the camera has to say

I've been waving at "conditioned on the camera". Concretely, an image encoder turns the camera frame into a vector, and that vector steers every denoising step, exactly the way a text prompt steered the image model. The policy's output is a target for where the hand should go; turning that target into actual joint angles is the job of a separate, much older piece of machinery.

> [LabSide component] Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post's prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect's controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.

This is the actuator the policy commands. The diffusion model decides *where* to reach, a point in space for the end of the arm. Inverse kinematics decides *how* the joints bend to get there, solving for the shoulder and elbow angles that land the hand on the target. Drag the target and watch the arm reconfigure. The policy and the IK solver split the labour cleanly: one chooses the goal, the other works out the geometry.

## Where it breaks

I don't want to leave you thinking this is solved. Diffusion fixes the multimodality problem and inherits two of its own, plus an old ghost.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A diffusion policy runs many forward passes per decision, which is awkward inside a 10 Hz control loop. It still drifts: the moment the robot strays off the demonstrated states, its camera sees situations no demo covered, and small errors compound, the oldest problem in imitation learning. And it's demo-hungry, still needing hundreds of teleoperated examples. Action chunking softens the drift and faster samplers soften the latency, but none of these is fully exorcised.

The latency one has a clean fix worth naming. Instead of many small stochastic denoising steps, learn a *velocity field* that transports noise straight to a clean action chunk, integrable in one or two steps. That's flow matching, the trick behind the fastest policies.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\frac{\mathrm{d}a^{(s)}}{\mathrm{d}s} = v_\theta\bigl(a^{(s)}, s, o_t\bigr), \qquad a^{(0)} \sim \mathcal{N}(0, I)\ \longrightarrow\ a^{(1)} = \hat a_{t:t+H}
```

$$
\frac{\mathrm{d}a^{(s)}}{\mathrm{d}s} = v_\theta\bigl(a^{(s)}, s, o_t\bigr), \qquad a^{(0)} \sim \mathcal{N}(0, I)\ \longrightarrow\ a^{(1)} = \hat a_{t:t+H}
$$

## Why "act by denoising" scales

The reason this recipe has taken over isn't the denoiser, it's *composition*. The denoising head doesn't care where its conditioning vector comes from.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Feed the denoiser a tiny image encoder and you get a competent single-task arm. Feed it a pretrained vision-language model and you get a robot that already knows what a "stapler" is because it read about one on the internet, and can generalise to objects and instructions it never saw in any demo. That's the whole vision-language-action idea: RT-2, OpenVLA, π0 are a language model's world-knowledge with an action-denoiser stuck on the end. The robot inherits everything the big models already learned, for free.

Here's the honest aside. Roboticists were planning trajectories under uncertainty long before diffusion turned up, and if you squint, a receding-horizon diffusion policy *is* Model Predictive Control with a learned generative model standing in for the hand-written cost function and dynamics. MPC optimises a horizon, executes the first step, and replans; the diffusion policy samples a horizon, executes the first chunk, and replans. The loop is the same loop control engineers have run for decades. The novelty isn't the loop. It's that the "optimiser" is a denoiser trained from demonstrations, not a solver grinding on an objective somebody had to write down by hand.

## Recap

Plain regression averages a robot's options and freezes it in the gap between them. A diffusion policy learns the whole distribution of good actions and samples one cleanly, using the exact DDPM maths from image generation with the camera threaded in as conditioning. Chunk the actions for smoothness and replan on a receding horizon for reactivity; hand the targets to inverse kinematics for the joints. Its real costs are speed and demos, fixed by flow matching and scale, and the reason it scales is that you can bolt the action-denoiser onto a pretrained vision-language model and inherit its world knowledge.

## Reading further

- **Chi et al. (2023), *Diffusion Policy: Visuomotor Policy Learning via Action Diffusion***: the canonical paper, denoising an action chunk with chunking and receding-horizon execution. [arXiv:2303.04137](https://arxiv.org/abs/2303.04137)
- **Ho, Jain & Abbeel (2020), *Denoising Diffusion Probabilistic Models***: the original DDPM maths reused wholesale here, equations (2) and (3). [arXiv:2006.11239](https://arxiv.org/abs/2006.11239)
- **Janner et al. (2022), *Planning with Diffusion (Diffuser)***: the teaching bridge from offline RL, diffusion as a trajectory planner. [arXiv:2205.09991](https://arxiv.org/abs/2205.09991)
- **Florence et al. (2022), *Implicit Behavioral Cloning***: the rigorous version of the multimodality argument behind the mode-averaging section. [arXiv:2109.00137](https://arxiv.org/abs/2109.00137)
- **Brohan et al. (2023), *RT-2***: the vision-language-action frontier, bolting an action decoder onto a pretrained VLM. [arXiv:2307.15818](https://arxiv.org/abs/2307.15818)
- **Black et al. (2024), *π0: A Vision-Language-Action Flow Model***: a flow-matching VLA, the concrete fix for diffusion's inference cost. [arXiv:2410.24164](https://arxiv.org/abs/2410.24164)

For a decade robots were programmed; lately they are trained, and now they're starting to inherit the very same generative stack that paints pictures and writes prose. Which makes me suspect the next jump in what a robot can do might arrive not from robotics at all, but from whatever the image and language models learn to do next. Watch this space.
