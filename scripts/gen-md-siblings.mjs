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
