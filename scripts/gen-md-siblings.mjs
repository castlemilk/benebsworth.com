// Generates LLM-friendly plain-Markdown siblings for every published blog
// post. Runs as a postbuild step: reads each content/blog/<slug>/index.mdx,
// strips MDX-only constructs, rewrites image paths to absolute URLs, and
// writes public/blog/<slug>/index.md so it is served at
// https://<site>/blog/<slug>/index.md. Each post page advertises the sibling
// via <link rel="alternate" type="text/markdown" href="..."> in the head.
//
// Why this format:
//   - LLMs (GPTBot, ClaudeBot, PerplexityBot, etc.) handle plain Markdown
//     more reliably than MDX-with-JSX. They get a clean text document with
//     no broken image refs, no missing-component placeholders, and no
//     client-side only behaviour.
//   - Some LLM crawlers also explicitly try fetching `<page>.md` or
//     `<page>/index.md` when they see a rel="alternate" type="text/markdown"
//     hint in the HTML head.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execSync } from 'node:child_process'
import matter from 'gray-matter'

const ROOT = process.cwd()
const SRC = join(ROOT, 'content/blog')
const OUT = join(ROOT, 'public/blog')

/**
 * Map of MDX component name → human-readable description, used when we
 * replace a self-closing or paired component tag in the body. The
 * description is appended to the body as a fenced block so the LLM knows
 * the original post had an interactive widget here, and a reader following
 * the markdown link back to the canonical post will see it.
 */
const COMPONENT_DESCRIPTIONS = {
  LabCanvas:
    'Embedded interactive lab effect (Canvas 2D) with live controls. The `effect` prop names a simulation from the lab registry (e.g. "black-hole", "cosmic-expansion"); the rendered post shows the running canvas plus sliders. This placeholder stands in for the markdown-only sibling.',
  LabSide:
    'Two-column layout pairing prose with an embedded interactive lab effect (Canvas 2D). The `effect` prop names a lab simulation; the surrounding text explains what to watch for. The rendered post has the live, controllable version.',
  UniverseScale:
    'Embedded "Universe Scale" explorer: a logarithmic zoom across 62 orders of magnitude, from the Planck length to the observable universe (ant, human, whale, skyscraper, Mount Everest, Earth, Sun, galaxy, cosmic web). The `focus` prop sets the initial scale. Markers at the Sun\'s Schwarzschild radius and the Planck length link to the black-hole-cosmology essay. The rendered post has the live, scrollable canvas.',
  FfnnFlow:
    'Interactive SVG diagram (feed-forward network). See the rendered post for a live, animated visualisation with input sliders, edge weights, and a per-frame activation readout.',
  RnnFlow:
    'Interactive SVG diagram (recurrent network unrolled across time steps). See the rendered post for the live version.',
  LstmFlow:
    'Interactive SVG diagram (LSTM cell with input / forget / output gates and memory cell). See the rendered post for the live version.',
  VaeFlow:
    'Interactive SVG diagram (variational autoencoder: encoder → μ/σ → sample z → decoder). See the rendered post for the live version.',
  GanFlow:
    'Interactive SVG diagram (generative adversarial network: generator + discriminator). See the rendered post for the live version.',
  TransformerFlow:
    'Interactive SVG diagram (multi-head self-attention). See the rendered post for the live version.',
  IngressFlowBasic:
    'Interactive step-by-step flow diagram (Istio ingress with gateway, virtual service, destination rule). See the rendered post for the live version.',
  EgressFlowBasic:
    'Interactive step-by-step flow diagram (Istio egress with service entry, destination rule, external endpoint). See the rendered post for the live version.',
  EgressFlowAdvanced:
    'Interactive step-by-step flow diagram (Istio advanced egress via egress gateway). See the rendered post for the live version.',
  GithubLink:
    'GitHub link card. The rendered post links to a repository; this card was inlined here for the human reader.',
  Video: 'Looping demo video. The rendered post embeds the video inline.',
  PullQuote:
    'Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.',
  StatGroup:
    'Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.',
  Stat:
    'Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.',
  // Neurual Network Zoo-specific components. These render a clickable
  // mini-map / colour legend at the top of the post as a navigation aid
  // and a visual vocabulary reference. The .md sibling is meant for LLM
  // consumption, so the description is more explicit than the other
  // components: the LLM should understand the role of each section.
  ZooMiniMap:
    'Clickable mini-map of the Neural Network Zoo. A 3×2 grid of SVG thumbnails, one per major architecture (Feed-forward, Recurrent, LSTM, VAE, GAN, Transformer), each acting as a navigation button that scrolls the page to the matching interactive diagram further down. The rendered post has the live, clickable version; this is a placeholder for the markdown-only sibling.',
  ColorLegend:
    'Colour-legend block for the Neural Network Zoo diagrams, modelled on the Asimov Institute poster legend. Renders a 3-column grid of 15 swatches: Input cell, Backfed input cell, Noisy input cell, Hidden cell, Probabilistic hidden cell, Spiking hidden cell, Capsule cell, Output cell, Match input/output cell, Recurrent cell, Memory cell, Gated memory cell, Kernel cell, Convolution or pooling cell, and a generic Neuron. The visual encoding is: colour encodes role (yellow=input, green=hidden, orange=output, blue=memory/recurrent, pink=kernel/conv), shape encodes cell type (circle=standard neuron, triangle=specialised dynamics like noisy/spiking/gated, square=capsule), and fill encodes behaviour variant (hollow ring=probabilistic/memory/pool). A small arc on top marks a recurrent cell.',
  Callout:
    'Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.',
  Equation:
    'Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post\'s argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.',
  LabCanvas:
    'Inline interactive lab canvas. Embeds any effect registered in `lib/lab/registry.ts` (referenced by its `effect` slug) as a live Canvas2D/WebGL visualisation, with the effect\'s own controls rendered below unless `controls={false}`. Optional `params` override the effect\'s defaults and `caption` adds a figcaption. The rendered post has the live, interactive version; this is a static placeholder for the markdown-only sibling — read the matching lab explainer under `/lab/<slug>/` for the full description of what the effect shows.',
  LabSide:
    'Side-by-side lab layout: the same interactive lab effect as LabCanvas (referenced by its `effect` slug) rendered in one column with the post\'s prose (`children`) beside it, stacking vertically on mobile. `reverse` swaps the columns; `params` override defaults and `controls={false}` hides the effect\'s controls. Used to weave explanation and visualisation together rather than dropping the lab as an isolated figure. The rendered post has the live version; this is a placeholder for the markdown-only sibling.',
  PllDiagram:
    'Phase-locked-loop feedback diagram. Renders the PLL block-and-feedback schematic for the "PLL from first principles" post from a JSON definition (`pll-feedback.json`) via the shared `<Diagram>` renderer, showing the phase detector, loop filter, and voltage-controlled oscillator with the feedback path closed back to the detector. The .md sibling substitutes the diagram\'s LLM-text rendering (generated by `scripts/render-diagram.py`) in place of this component, so crawlers get the structural description rather than this placeholder.',
  // Attention post — interactive visualisations driven by anime.js.
  // Both run real arithmetic from components/mdx/attention-data.ts
  // (hand-tuned compatibility scores + exact softmax / √dₖ scaling).
  AttentionHeatmap:
    'Interactive self-attention matrix for the toy sentence "the cat sat because it napped", rendered as an SVG heatmap. Hovering or tapping a query token (left column) draws in connection arcs (via anime.js line-drawing) to each key token (top row), with arc thickness proportional to the attention weight. A toggle switches between raw scaled scores (QKᵀ/√dₖ) and the softmax-normalised probabilities; a slider adjusts the √dₖ scale factor live, showing how under-scaling collapses attention to a near one-hot pick and over-scaling flattens it toward uniform. The default selection lands on the pronoun "it", which resolves to its antecedent "cat". The rendered post has the live, animated version.',
  SoftmaxLab:
    'Animated walkthrough of the four softmax pipeline stages — raw scores → ÷√dₖ → exp(·) → ÷Σ — for the "it" attention row. Renders as signed-axis vertical bars that morph stage-by-stage (driven by an anime.js tween), with a live numeric readout on each bar and a per-stage caption explaining what that step does (positivise via exp, normalise to sum-to-one, why the √dₖ scale keeps the softmax in its well-gradiented range). Clicking a stage button or scrolling into view triggers the morph. The rendered post has the live, animated version.',
  TokenSampler:
    'Interactive next-token sampler for the "Temperature & sampling" section. Renders the model output logits over 8 candidate continuations as horizontal probability bars, plus three sliders: temperature T (divides the logits before the softmax — T→0 is greedy, T→∞ is uniform, exactly analogous to the √dₖ knob in attention), top-k (keep only the k most likely, zero the rest), and top-p / nucleus (keep the smallest set whose cumulative probability ≥ p). A "sample" button draws from the live distribution; anime.js dims the field and pulses the chosen bar. Dimmed rows were truncated by top-k / top-p and can no longer be drawn. The rendered post has the live version.',
  MoEBlock:
    'Interactive Mixture-of-Experts diagram for the "where the parameters live" section. Shows a token flowing through the shared attention block, a router/gate that selects 2 of 64 expert FFNs per token, and the combine→output path. The 64 experts render as an 8×8 grid; the 2 selected experts light up (anime.js stagger + glow) and routing lines draw in from the gate (anime.js line-drawing). A three-cell parameter accounting below shows total params (≈1T, all experts + shared), active-per-token params (≈46B, shared + 2 experts), and the resulting sparsity (~5%). The numbers are illustrative but calibrated (64 × 15B experts + 16B shared, top-2) to reproduce the 46B-active / 1T-total ratio of the DeepSeek-V3 / GLM / Kimi model class. Auto-advances to a new token (new expert pair) every couple of seconds. The rendered post has the live version.',
  // "A transformer reads everything at once" — five interactive explainers
  // built for the deeper transformer post (parallelism, embeddings, position,
  // the residual stream, and the feed-forward sublayer).
  ParallelismRace:
    'Animated comparison of an RNN against a transformer over the same sentence. The RNN row shows a hidden-state "baton" crawling one token at a time (sequential, longest path N−1 hops); the transformer row wires every token to every other in a single parallel step (longest path 1 hop). A sequence-length slider widens the gap — the RNN\'s step count grows with N while the transformer\'s stays at 1 — illustrating the O(n) vs O(1) path length that let attention be trained efficiently on a GPU. The rendered post has the live, animated version.',
  EmbeddingSpace:
    'A hand-placed 2-D map of word embeddings showing that meaning is geometry: similar words (cats by dogs, numbers by numbers, kings by queens) cluster together, and directions carry meaning. Hovering a word lights its three nearest neighbours; a toggle draws the king − man + woman ≈ queen analogy as an exact parallelogram (the man→king "royalty" vector copied onto woman lands on queen). The layout is a toy — real embeddings are high-dimensional — but it conveys the shape of the input space the transformer reads. The rendered post has the live version.',
  PositionalEncoder:
    'Two views of positional encoding, the trick that gives a permutation-blind attention layer a sense of order. The sinusoidal view is the classic heatmap (positions as rows, dimensions as columns) of fast-and-slow sine/cosine waves, with a position slider highlighting one row\'s unique "fingerprint"; nearby positions look alike, distant ones differ. The RoPE view shows three dimension-pairs as clocks rotating by an angle proportional to position, with a ghost arrow for a later token — demonstrating that the angle between two tokens depends only on their relative offset, which is why rotary models extrapolate to longer contexts. The rendered post has the live version.',
  ResidualStream:
    'A diagram of the residual stream — the mental model the other AI posts skip. Each token rides its own vertical lane; a block never overwrites the lane, it reads the current vector, computes a sublayer, and adds the result back at a ⊕ junction. Two sublayers per block: self-attention (mixes across lanes — the only place tokens interact) and feed-forward (per-lane, where most knowledge lives). A depth slider stacks more blocks (real models stack dozens), a highlight toggle isolates attention vs FFN, and a play button raises every token\'s marker up the stack in parallel. The rendered post has the live version.',
  FfnStep:
    'A genuine forward pass of a 4→16→4 feed-forward sublayer (the transformer\'s per-token "thinking" step, where most parameters live). The input vector is projected up into a wider hidden space, gated by an activation (ReLU snaps negatives to zero, GELU eases them — toggleable), then projected back down. Bars show real values from fixed deterministic weights; an input slider shifts the pattern and the readout counts how many of the 16 hidden units fire. The rendered post has the live version.',
  // Lab-expansion posts (CLT, entropy, backprop, diffusion, JPEG, Game of Life)
  GaltonBoard:
    'An interactive Galton board (quincunx) illustrating the Central Limit Theorem for the "why everything becomes a bell curve" post. Balls rain through a triangular array of pegs, each peg deflecting a ball left or right on a fair coin-flip, and pile into n+1 bottom bins to form a binomial histogram with an orange Normal(μ=n/2, σ²=n/4) curve overlaid. The reader presses drop to animate balls falling and drags a rows slider (6–14 peg rows); as the rows increase the histogram tightens onto the bell curve. The rendered post has the live version.',
  ComputeGraph:
    'An interactive computation graph for the expression e = (a + b)·(b + 1), showing that backpropagation is just the chain rule on a DAG (for the "backprop is just the chain rule" post). Inputs a and b feed c = a+b and d = b+1, which multiply into e; a forward/backward toggle switches each node between its value and its gradient ∂e/∂node, with edges labelled by local derivatives. The key beat: because b feeds both c and d, two gradient paths converge on it and its gradient is their sum, ∂e/∂b = d + c. Sliders set a and b. The rendered post has the live version.',
  EntropyMixing:
    'An interactive box of two-colour particles for the "why time only runs forwards" post: teal start on the left, warm-orange on the right, separated. On release every particle drifts and bounces elastically off the walls, interdiffusing into an even mix, while a coarse-grained positional entropy S/k climbs from ~0 (separated) to its maximum N·ln2 (mixed) and plateaus. It dramatises that the arrow of time is a counting argument — the micro-rules are reversible, but mixed arrangements so vastly outnumber separated ones that it never un-mixes. Controls: release/pause, reset, particle count. The rendered post has the live version.',
  DiffusionLoop:
    'An interactive forward-diffusion demo for the "how to paint with noise" post. A procedurally drawn 28×28 image (a smiley) is progressively corrupted by x_t = √ᾱ_t·x₀ + √(1−ᾱ_t)·ε with a fixed seeded Gaussian noise field, marching from a clean image to pure static and back via a timestep slider or an add-noise/denoise play button. The caption makes the honest point that denoising here just replays the same stored noise backward, whereas a real model learns to predict the noise and subtract it. The rendered post has the live version.',
  NoiseSchedule:
    'A small SVG line chart (companion to DiffusionLoop) plotting the two diffusion mixing weights — signal = √ᾱ_t in teal and noise = √(1−ᾱ_t) in orange — across the timesteps, with a marker at the current step. Because the weights sum in quadrature to 1, the image is a pure blend at every step and the curves cross exactly where ᾱ_t = 0.5, anchoring why the schedule trades signal for noise as t grows. The rendered post has the live version.',
  DctBlock:
    'An interactive 8×8 JPEG demonstration for the "what JPEG throws away" post, with three panels: the original grayscale block, its 2-D DCT coefficient magnitudes as a log heatmap (DC top-left, AC ramping right and down), and the reconstruction after quantisation and inverse DCT. A quality slider (1–100) and a sample selector (gradient / edge / texture) let the reader watch high-frequency coefficients round to zero — the kept-coefficient count falls, the block goes blocky, and RMSE rises — making concrete the detail JPEG discards because the eye barely notices it. The rendered post has the live version.',
  GameOfLife:
    "An interactive Conway's Game of Life on a 50×30 toroidal grid running B3/S23 (a live cell with 2–3 neighbours survives, a dead cell with exactly 3 is born) for the \"three rules build a computer\" post. Controls cover play/pause, single step, clear, randomise, speed, and a pattern library (Glider, LWSS, Pulsar, Gosper glider gun); click or drag paints cells, and counters show generation and population. From three local rules emerge gliders, oscillators, and the glider gun — and gliders plus guns are enough to build logic gates, which is why Life is Turing-complete. The rendered post has the live version.",
  HashTableDemo:
    'An interactive open-addressing hash table visualiser for the "how Python dicts really work" post. Inserting keys animates the djb2 hash being computed and the probe sequence ricocheting through slots (collisions flashed orange, the landing slot in the blog accent); deletes leave tombstones that lookups must probe past, and crossing the 2/3 load factor triggers an animated 2× resize and rehash. A probe-strategy toggle (Linear, Quadratic, Python-style Perturbed) shows how each walk clusters differently. The rendered post has the live version.',
  StorageEngineSim:
    'A dual-pane interactive contrasting the two on-disk storage philosophies for the "B-trees vs LSM-trees" post. A B-tree (read-optimised, update-in-place, with real top-down node splits that push the median up) sits beside an LSM-tree (write-optimised: a memtable that flushes to immutable L0 SSTable runs which then size-tier-compact into L1). Controls — Insert key, Insert ×8, a read-heavy/write-heavy workload toggle, and Reset — drive live counters (page writes, SSTable writes, live vs total bytes) and a qualitative read/write/space amplification readout illustrating the RUM-conjecture trade-off. The rendered post has the live version.',
  // KV-cache compression post — five interactive explainers.
  KvCacheCompressor:
    'The centrepiece for the KV-cache compression post: frames the cache as a 4-D tensor (2·layers·KV-heads·tokens·head_dim, fp16) and lets the reader select a compression method to see which axis it attacks. Tabs: fp16 (baseline), TurboQuant 4-bit (precision axis — quantise each number to 4 bits), StreamingLLM and H2O (sequence axis — drop middle tokens, keep sinks + recent), Cross-layer sharing/CLA (layers axis), and linear attention/GLA (collapse the sequence into a fixed recurrent state). Selecting a method morphs a schematic of one layer\'s KV slab, updates a relative-footprint bar, and shows a card with the axis attacked, the keep/drop rule, the cost class (zero-shot lossless vs lossy vs needs-retraining), and the measured HumanEval-X Go pass@1. The rendered post has the live version.',
  KvQuantDial:
    'A TurboQuant quantisation explainer. Shows a 16-value group of cached numbers; a bit-width selector (fp16 / 8-bit / 4-bit) draws the quantisation grid and snaps each value to its nearest of 2^bits levels, drawing the residual error; a "rotate" toggle applies a fixed orthogonal (Hadamard) rotation that spreads a lone outlier across the group so the same levels land closer to every value — the trick that makes 4-bit essentially lossless. Read-outs: bits per value (including the per-group scale overhead at group size 32), memory ratio, and mean reconstruction error. The rendered post has the live version.',
  KvEvictionWindow:
    'The eviction failure-mode animation. Plots a token sequence (prompt + generated) along a token axis and shades what a streaming/H2O KV cache keeps (4 attention sinks + a recent window of budget−4 tokens) versus evicts, as generation advances. Controls: budget (64 / 256 / 512), prompt length, a generation scrubber + play, and a streaming/H2O policy toggle. The verdict line states whether the whole prompt is still cached: once the context length (prompt + generated) exceeds the budget, the prompt body scrolls out of the recent window and is evicted — the model writes code for a problem it can no longer see. The rendered post has the live version.',
  KvAblationLedger:
    'The attribution payoff chart. Lists every config from the compound-compression ablation as a pass@1 bar (exact counts out of 164) against the fp16 baseline, grouped as: quantise-only (8-bit and 4-bit sit on the baseline — lossless), evict @ budget 256 (streaming, H2O, and streaming+quant all collapse to the same 37.8% — so the budget is the cause, not the policy or the quantisation), evict @ budget 512 (recovers to baseline; streaming-512 + 4-bit is the recommended best), and needs-training (cross-layer and linear-attention collapse to 0% zero-shot). A toggle switches the bars to relative cache footprint. The rendered post has the live version.',
  KvContextHistogram:
    'Shows why the 15-problem smoke set was blind. A histogram of measured prompt lengths (tokens ≈ chars/4): the smoke set (15 problems, all under 48 tokens) overlaid on the full HumanEval-X Go set (164 problems, median ~100, max 334), with a movable eviction-budget line at 256 or 512. The smoke set never crosses 256, so a 256-token budget never evicted anything there. A "generated so far" slider shifts the distribution right (effective context = prompt + output), showing the count of problems that overflow the budget — and lose their prompt mid-generation — climbing far past the 4-of-164 visible at prefill. The rendered post has the live version.',
  // Cutting-edge expansion posts (reasoning, state-space models, QEC, diffusion policy).
  ReasoningTree:
    'An interactive reasoning tree for the "why thinking longer makes models smarter" post. It samples up to N chains of thought branching from one prompt, each ending in a final answer, with the majority answer lighting up as you raise N (self-consistency). A mode toggle switches from plain majority vote to a learned-verifier best-of-N, showing the verifier pick the correct chain on a seeded problem where the plurality is wrong. The rendered post has the live version.',
  ComputeScaling:
    'An interactive log-x plot of accuracy against test-time compute for the reasoning post. A small model plus search climbs as accuracy ≈ a + b·log C past a much larger model\'s flat single-shot baseline, with the crossover point marked. A strategy toggle swaps between majority vote, best-of-N, and process-reward beam search to compare how each spends compute. The rendered post has the live version.',
  CostRace:
    'An interactive cost race for the "loop that beats attention" (Mamba) post. A context-length slider drives two growing areas — attention scaling as the square of sequence length, a state-space model scaling linearly — with live counters and a ratio that climbs as you lengthen the context, plus a faint linearly-growing KV-cache overlay. It makes the O(n²) versus O(n) gap something you watch rather than take on faith. The rendered post has the live version.',
  SelectiveScan:
    'A selective-scan visualiser for the Mamba/state-space post. Tokens stream past while a single fixed-size state vector updates each step through an input-dependent gate (Mamba\'s selectivity), lighting up when a token is written/remembered and staying dim when it is ignored, computed from the real recurrence h_t = Δ·write + (1−Δ)·decay·h_{t-1}. A row of all-pairs attention arcs sits above it for contrast, so you can see the difference between reading everything and carrying one steerable summary. The rendered post has the live version.',
  SurfaceCodeLattice:
    'An interactive surface-code lattice for the "remembering a qubit that forgets" post. Data qubits sit on the edges of a square lattice with X- and Z-type stabiliser plaquettes; an X/Z toggle lets the reader click data qubits to inject Pauli errors, and every affected stabiliser lights up as a syndrome computed from the live parity of its neighbours. Because interior checks see an even number of flips, a chain of errors lights only its two endpoints, making concrete that the syndrome is the boundary of the error; a distance slider (3/5/7) grows the patch and an optional decoder runs minimum-weight matching to show when an error chain is corrected versus when it spans the lattice and becomes a logical error. The rendered post has the live version.',
  ThresholdCurve:
    'A log-log threshold-curve plot for the QEC post, showing the logical error rate versus the physical error rate for several code distances (3/5/7/9). All curves cross at the code threshold p_th; below it they fan downward so larger codes suppress errors exponentially, while above it they fan upward so larger codes make things worse — the counter-intuitive heart of the threshold theorem. A draggable operating-point marker reports each distance\'s logical error rate, the per-two-distance suppression factor Λ, and whether you are below or above threshold, echoing Google\'s Willow demonstration of Λ ≈ 2.14. The rendered post has the live version.',
  DenoisingPlanner:
    'An interactive 2D planner for the "robots that act by denoising" (diffusion policy) post. A cloud of random action trajectories refines, step by step over the reverse diffusion schedule, into clean paths that curve around an obstacle to the goal, conditioned on the scene; a multimodality toggle splits them into two valid routes. A regression-baseline toggle overlays the pointwise mean of two valid routes, which drives straight through the obstacle — the mode-averaging failure made visible. The rendered post has the live version.',
  ModeCollapseStrip:
    'A one-dimensional view of why averaging fails, for the diffusion-policy post: a bimodal action distribution p(a|o) with the regression prediction (the conditional mean) pinned in the empty valley between its two peaks, while diffusion samples land on the peaks themselves. A "mode separation" slider widens the gap to show the averaged prediction getting steadily worse as the modes separate. The rendered post has the live version.',
  // Note: the .md sibling script processes these and other MDX components
  // (IngressFlowBasic, EgressFlowBasic, EgressFlowAdvanced) the same way
  // — see entries above for the istio-patterns post.
}

/**
 * Replace MDX-only constructs in `body` with prose equivalents:
 *   - `<Component />` and `<Component ... />` self-closing tags
 *   - `<Component>...</Component>` paired tags
 *   - `import` lines at the top of the file (MDX-only)
 *   - `{...}` JSX expression blocks
 *   - Bare frontmatter escapes that look like JSX
 */
function stripMdx(body, slugDir) {
  let out = body

  // Drop MDX import / export statements.
  out = out.replace(/^(import|export)\s.+$/gm, '')

  // Translate animated diagram iframes into LLM text representations if a JSON definition exists
  out = out.replace(/<iframe\b[^>]*\bsrc=["']\/blog\/([^/]+)\/([^/.]+)\.html["'][^>]*><\/iframe>/gi, (m, iframeSlug, basename) => {
    if (iframeSlug !== slugDir) return m;
    const jsonPath = join(SRC, slugDir, `${basename}.json`);
    if (existsSync(jsonPath)) {
      try {
        const text = execSync(`python3 scripts/render-diagram.py "${jsonPath}" --llm /dev/stdout`, { encoding: 'utf8' });
        return `\n\n${text}\n\n`;
      } catch (e) {
        console.error(`Failed to render LLM text for ${jsonPath}: ${e.message}`);
      }
    }
    return m;
  })

  // Translate PllDiagram component
  out = out.replace(/<PllDiagram\s*\/>/g, (m) => {
    const jsonPath = join(SRC, 'pll-from-first-principles', 'pll-feedback.json');
    if (existsSync(jsonPath)) {
      try {
        const text = execSync(`python3 scripts/render-diagram.py "${jsonPath}" --llm /dev/stdout`, { encoding: 'utf8' });
        return `\n\n${text}\n\n`;
      } catch (e) {
        console.error(`Failed to render LLM text for ${jsonPath}: ${e.message}`);
      }
    }
    return m;
  })

  // Replace self-closing component tags. Match `<Name ... />` where Name
  // starts with an uppercase letter (the convention for a React component,
  // not a native HTML element).
  out = out.replace(/<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/>/g, (_m, name, attrs) => {
    const desc = COMPONENT_DESCRIPTIONS[name] ?? `Interactive component \`${name}\` — see the rendered post.`
    // Try to extract a `url="..."` attribute so the markdown equivalent
    // can include a usable link (only relevant for GithubLink, today).
    const urlMatch = attrs.match(/\burl="([^"]+)"/)
    const extra = urlMatch ? `\n\nLink: ${urlMatch[1]}` : ''
    return `\n\n> [${name} component] ${desc}${extra}\n\n`
  })

  // Replace paired component tags. The contents inside are usually prose
  // (for the Stepper pattern) or render as children; we keep the children
  // and just drop the wrapper tags, leaving a hint that there was a wrapper.
  // For `<Equation>`, also extract the `latex="..."` attribute and surface
  // it after the description so LLM readers get the LaTeX source verbatim
  // — this is the whole point of the component for non-rendering readers.
  out = out.replace(/<([A-Z][A-Za-z0-9]*)\b([^>]*?)>([\s\S]*?)<\/\1>/g, (_m, name, attrs, inner) => {
    const desc = COMPONENT_DESCRIPTIONS[name] ?? `Component \`${name}\` — see the rendered post.`
    let extra = ''
    if (name === 'Equation') {
      const latexMatch = attrs.match(/\blatex="((?:[^"\\]|\\.)*)"/)
      if (latexMatch) extra = `\n\n\`\`\`latex\n${latexMatch[1]}\n\`\`\``
    }
    return `\n\n> [${name} component] ${desc}${extra}\n\n${inner.trim()}\n\n`
  })

  // Drop stray JSX expression blocks like `{ foo }` that are otherwise
  // orphaned (these only appear in MDX). Conservative: only match braces
  // that look like JS expressions (contain an identifier or operator), not
  // arbitrary punctuation.
  out = out.replace(/^\s*\{[A-Za-z_$][\s\S]*?\}\s*$/gm, '')

  // Collapse runs of 3+ blank lines to 2.
  out = out.replace(/\n{3,}/g, '\n\n')

  return out.trim() + '\n'
}

/**
 * Rewrite image and link paths to absolute URLs so the markdown is
 * self-contained when served from /blog/<slug>/index.md. We rewrite:
 *   - `./foo.png` → `/blog/<slug>/foo.png`
 *   - `foo.png` (bare) → `/blog/<slug>/foo.png`
 *   - `/foo.png` (root-relative) → unchanged (already absolute)
 *   - external `http(s)://` → unchanged
 */
function absolutiseImages(body, slug) {
  return body
    // ![alt](./foo.png) or ![alt](foo.png)
    .replace(/(!\[[^\]]*\]\()(\.?\/?)([^)\s]+\.(?:png|jpg|jpeg|gif|webp|svg))(\))/gi, (m, pre, slash, file, post) => {
      if (/^https?:|^data:/.test(file)) return m
      return `${pre}/blog/${slug}/${file}${post}`
    })
    // Plain <img src="./foo.png">
    .replace(/(<img\b[^>]*\bsrc=["'])(\.?\/?)([^"']+\.(?:png|jpg|jpeg|gif|webp|svg))(["'])/gi, (m, pre, slash, file, post) => {
      if (/^https?:|^data:/.test(file)) return m
      return `${pre}/blog/${slug}/${file}${post}`
    })
}

/**
 * Process one post. Returns the path written (relative to ROOT), or null
 * if the post was skipped (draft / release:false).
 */
function processPost(slugDir) {
  const src = join(SRC, slugDir, 'index.mdx')
  if (!existsSync(src)) return null
  const raw = readFileSync(src, 'utf8')
  const { data, content } = matter(raw)

  // Skip drafts / unpublished.
  if (data.release === false || data.draft === true) return null

  // Skip if title/date missing (would've thrown at build time anyway).
  if (!data.title || !data.date) return null

  let body = absolutiseImages(stripMdx(content, slugDir), slugDir)

  // Lead the markdown sibling with a "Key takeaways" section (from the post's
  // `takeaways` frontmatter) so AI crawlers reading the .md get a citable,
  // verbatim summary up front without parsing the whole article.
  if (Array.isArray(data.takeaways) && data.takeaways.length) {
    body =
      '## Key takeaways\n\n' +
      data.takeaways.map((t) => `- ${t}`).join('\n') +
      '\n\n' +
      body
  }

  // Build the markdown frontmatter + body. We keep the original YAML
  // frontmatter so any tooling that consumes it (including the post
  // loader for sanity checks) can parse it back. We add a derived
  // `markdown_url` field so LLM tools that index the frontmatter know
  // where this canonical post lives.
  const out = matter.stringify(body, {
    ...data,
    markdown_url: `/blog/${slugDir}/`,
    canonical_url: `https://benebsworth.com/blog/${slugDir}/`,
  })

  const dest = join(OUT, slugDir, 'index.md')
  mkdirSync(join(OUT, slugDir), { recursive: true })
  writeFileSync(dest, out)
  return relative(ROOT, dest)
}

const written = []
const skipped = []
for (const entry of readdirSync(SRC)) {
  if (!statSync(join(SRC, entry)).isDirectory()) continue
  const result = processPost(entry)
  if (result) written.push(result)
  else skipped.push(entry)
}

console.log(`[md-siblings] wrote ${written.length} files:`)
for (const w of written) console.log(`  ${w}`)
if (skipped.length) {
  console.log(`[md-siblings] skipped ${skipped.length} (draft / release:false):`)
  for (const s of skipped) console.log(`  ${s}`)
}
