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

  // Translate native Diagram components. Assumes the JSON file name matches the imported var name or is nearby.
  // We'll scan the file for import varName from './basename.json'
  out = out.replace(/<Diagram\s+data=\{([^}]+)\}\s*\/>/g, (m, varName) => {
    const importMatch = new RegExp(`import\\s+${varName}\\s+from\\s+['"]\\.\\/([^'"]+)\\.json['"]`).exec(body);
    if (importMatch) {
      const basename = importMatch[1];
      const jsonPath = join(SRC, slugDir, `${basename}.json`);
      if (existsSync(jsonPath)) {
        try {
          const text = execSync(`python3 scripts/render-diagram.py "${jsonPath}" --llm /dev/stdout`, { encoding: 'utf8' });
          return `\n\n${text}\n\n`;
        } catch (e) {
          console.error(`Failed to render LLM text for ${jsonPath}: ${e.message}`);
        }
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

  const body = absolutiseImages(stripMdx(content, slugDir), slugDir)

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
