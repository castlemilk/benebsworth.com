# Kimi K3 Blog Trilogy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three interactive blog posts (`how-kimi-k3-works`, `benchmarking-kimi-k3`, `delta-rule-linear-attention`) with four new MDX components, heroes, topics wiring, and full publish-gate verification, deployed to next then prod.

**Architecture:** Follows the house MDX pipeline (content/blog/<slug>/index.mdx + public/blog/<slug>/ assets + registered components). Four new presentational/iframe components registered in `components/mdx/mdx-components.tsx` and described in `scripts/gen-md-siblings.mjs`. Data for post 2 is baked at authoring time from `lib/lab/llm-benchmark/results.json`. Spec: `docs/superpowers/specs/2026-07-19-kimi-k3-posts-design.md` (source of truth for claims/attribution).

**Tech Stack:** Next.js 16 static export, MDX (next-mdx-remote/rsc), React client components, vitest, Playwright, gpt-image-2 + sharp for heroes.

**Reference skills:** @.claude/skills/writing-blog-posts/SKILL.md (authoring rules, publish gate, voice), @.claude/skills/deploying-the-site/SKILL.md if present.

**Branch:** work happens on `lab-expansion-2per-field` (no worktree; consistent with prior work in flight). There may be unrelated uncommitted files from another session (`components/site/site-nav.tsx`, vectors/*) — never stage them; commit only files listed per task.

**Accuracy contract (re-stated for every executor):** K3 facts only from kimi.com/blog/kimi-k3 + the platform quickstart; delta-rule lineage framed as the family KDA belongs to (signposted, attributed to quickstart's "hybrid linear attention mechanism"); partial benchmark cells marked †; no invented numbers. Voice: curious engineer's notebook, we/let's, hedges ok, British spelling, em-dash budget ~1 per 600–800 words, 3–5 Callouts per post, sentence-case headings.

---

## Chunk 1: Foundations (topics, skill line, heroes)

### Task 1.1: topics.ts BY_SLUG entries

**Files:**
- Modify: `lib/topics.ts` (BY_SLUG map, near existing `'why-thinking-longer-makes-models-smarter': TOPIC.software,` ~line 103)

- [ ] **Step 1: Add the three slugs**

In the `BY_SLUG` object, next to the other LLM posts, add:

```ts
  'how-kimi-k3-works': TOPIC.software,
  'benchmarking-kimi-k3': TOPIC.software,
  'delta-rule-linear-attention': TOPIC.software,
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` — Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/topics.ts && git commit -m "feat(blog): topic accents for the K3 trilogy"
```

### Task 1.2: writing-blog-posts skill credential line

**Files:**
- Modify: `.claude/skills/writing-blog-posts/SKILL.md` (~line 122, the sentence "The key lives in `~/projects/brandbrain/.env` (`OPENAI_API_KEY`).")

- [ ] **Step 1: Update the line**

Replace with: "The key lives in this project's `.env` (`OPENAI_API_KEY`, confirmed present) and historically also in `~/projects/brandbrain/.env` — prefer the project `.env`; if it's ever absent, surface the cross-project read and get the user's OK."

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/writing-blog-posts/SKILL.md && git commit -m "docs(blog-skill): OPENAI_API_KEY now lives in the project .env"
```

### Task 1.3: Hero generation script + three heroes

**Files:**
- Create: `scripts/gen-hero.mjs` (reusable one-off hero generator)
- Create: `/tmp/heroes/*.png` (staging), then `content/blog/<slug>/hero.webp` + `public/blog/<slug>/hero.webp`

- [ ] **Step 1: Write `scripts/gen-hero.mjs`**

```js
// Usage: node scripts/gen-hero.mjs <slug> "<scene prompt>"
// Generates a 1536x1024 hero with gpt-image-2 → /tmp/heroes/<slug>.png (staging,
// never clobbers an existing hero), then converts to webp q80 into BOTH
// content/blog/<slug>/hero.webp and public/blog/<slug>/hero.webp.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const [slug, scene] = process.argv.slice(2)
if (!slug || !scene) { console.error('usage: gen-hero.mjs <slug> "<scene>"'); process.exit(1) }

// Load OPENAI_API_KEY from project .env without printing it
const env = readFileSync('.env', 'utf8')
const key = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
if (!key) { console.error('OPENAI_API_KEY missing from .env'); process.exit(1) }

const NO_TEXT = 'Strict: no text, no letters, no numbers, no logos, no watermarks anywhere in the image.'

// Guard BEFORE the paid API call: never half-write the content/ + public/ pair
// (the skill's #1 breakage rule is that both dirs must carry the image).
for (const d of ['content', 'public']) {
  if (existsSync(`${d}/blog/${slug}/hero.webp`)) {
    console.error(`hero.webp already exists for ${slug} in ${d}/ — delete both copies first if regenerating`)
    process.exit(1)
  }
}

const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model: 'gpt-image-2', prompt: `${scene}\n\n${NO_TEXT}`, n: 1, size: '1536x1024' }),
})
if (!res.ok) { console.error('image API', res.status, await res.text()); process.exit(1) }
const b64 = (await res.json()).data[0].b64_json
mkdirSync('/tmp/heroes', { recursive: true })
const staging = `/tmp/heroes/${slug}.png`
writeFileSync(staging, Buffer.from(b64, 'base64'))

const sharp = (await import('sharp')).default
const webp = await sharp(staging).resize(1536, 1024, { fit: 'cover' }).webp({ quality: 80 }).toBuffer()
for (const d of ['content', 'public']) {
  mkdirSync(`${d}/blog/${slug}`, { recursive: true })
  writeFileSync(`${d}/blog/${slug}/hero.webp`, webp)
}
console.log(`hero written for ${slug} (${Math.round(webp.length / 1024)}KB webp)`)
```

- [ ] **Step 2: Generate the three heroes**

```bash
node scripts/gen-hero.mjs how-kimi-k3-works "Dark editorial scene, near-black background: a vast dim hall of hundreds of tiny dormant square cells arranged in a deep grid receding into shadow, one narrow aisle of 16 glowing cells lit in teal #00E0B8 and purple #7C5CFF, a single small bright mote of light travelling down the lit aisle, cinematic depth, moody, high contrast, orange accent #FF7A59 on two or three cells only"
node scripts/gen-hero.mjs benchmarking-kimi-k3 "Dark editorial lab bench scene: a row of four glowing browser windows floating above a workbench, each running a different colourful tiny experiment (orbiting particles, a platformer game, a circuit plot, a landing page), one window visibly cracked and dark, teal #00E0B8 and purple #7C5CFF glow on near-black #0a0a0a, subtle orange #FF7A59 warning glow from the cracked window, cinematic, moody"
node scripts/gen-hero.mjs delta-rule-linear-attention "Dark editorial scene: a stone tablet carved with glowing lines of symbols, a spectral quill editing exactly one carved line which glows teal #00E0B8 as it is rewritten while the rest of the tablet stays dim, faint purple #7C5CFF ghost of the old line being erased beneath the new one, near-black background, cinematic, moody, high contrast"
```

Expected: three `hero written …` lines, each webp ~50–140KB. If a render is off-thesis/samey/contains text, delete `/tmp/heroes/<slug>.png` AND the two `hero.webp` files and re-run with an adjusted scene.

- [ ] **Step 3: Eyeball each hero**

Read each `public/blog/<slug>/hero.webp` with the media tool. Confirm: distinct composition, dark editorial mood, no text artefacts.

- [ ] **Step 4: Commit**

```bash
git add scripts/gen-hero.mjs content/blog/*/hero.webp public/blog/*/hero.webp
git commit -m "feat(blog): hero art for the K3 trilogy"
```

---

## Chunk 2: Post 3 — `delta-rule-linear-attention` (components first)

### Task 2.1: `AttentionCostCurve` component

**Files:**
- Create: `components/mdx/attention-cost-curve.tsx`

- [ ] **Step 1: Write the component**

Presentational SVG (no rAF). Contract:
- `'use client'`, `not-prose` wrapper, theme tokens (`var(--color-border)`, `bg-surface`, `text-muted`, accents `#00E0B8` linear vs `#FF7A59` quadratic).
- Log-log plot, x = sequence length 1K→1M tokens, y = "attention pair scores" normalised so linear(1M)=1M·d and quadratic(1M)=1M²·d with d folded into a unit-less "relative work" axis (label the axis "relative work (illustrative)").
- Two paths computed by sampling 60 points each: `y=x` and `y=x*x`, log10-scaled into the viewBox; gridlines at decades; marker dots at 128K and 1M on both curves with a small label of the ratio (1M/128K: linear 7.8×, quadratic 61×… compute exactly: (1e6/128e3)=7.8125, squared ≈ 61.0).
- Hover/tap on a marker shows the exact values in a tooltip (element-anchored, smart flip); keyboard-focusable markers.
- Mobile: viewBox scales to width; min touch target 44px on markers; `scroll-mt-32` not needed (no id).
- Light/dark: strokes use `currentColor`-aware tokens with explicit dark-safe fallbacks.

- [ ] **Step 2: Register + describe**

In `components/mdx/mdx-components.tsx`: `import { AttentionCostCurve } from './attention-cost-curve'` and add `AttentionCostCurve,` to `mdxComponents`.
In `scripts/gen-md-siblings.mjs` `COMPONENT_DESCRIPTIONS` add:
`AttentionCostCurve: 'Log-log SVG chart comparing attention work vs sequence length: a quadratic curve (full self-attention) against a linear curve (linear attention), from 1K to 1M tokens, with markers at 128K and 1M showing the exact work ratio at each point.'`

- [ ] **Step 3: Build check**

Run: `npm run build` — Expected: PASS (no MDX uses it yet; this verifies compile + registration).

- [ ] **Step 4: Commit**

```bash
git add components/mdx/attention-cost-curve.tsx components/mdx/mdx-components.tsx scripts/gen-md-siblings.mjs
git commit -m "feat(mdx): AttentionCostCurve component"
```

### Task 2.2: `DeltaMemory` component

**Files:**
- Create: `components/mdx/delta-memory.tsx`

- [ ] **Step 1: Write the component**

Step-through demo (no rAF):
- A memory matrix **M** of 4 slots; each slot holds a key tag (K1…K4) and a 4-cell value row (numbers, 2 decimals).
- A scripted write sequence of 6 writes (fixed data, e.g. write key "moon" → slot 2 twice with different values, then "mars" → slot 2 again) so collisions happen.
- Two modes toggled by a segmented control: **additive write** (`M += v kᵀ`, values accumulate/smear) vs **delta rule** (`M += β (v − M k) kᵀ`, the old value at that key is removed before the new one is written — collision replaces instead of smearing). β fixed at 1 for clarity.
- After each write, a "query" row shows retrieval `M k` for the queried key in both modes; the punchline row reads "what the memory thinks 'moon' is now".
- UI: Previous/Next step buttons, step counter, the current write spelled out in a caption; mode toggle re-runs the same script so both modes are comparable at every step; reset button.
- Same component conventions (theme tokens, not-prose, mobile, reduced-motion irrelevant since click-driven).

Keep the matrix math honest: implement the two updates literally on a 4×4 Float array with toy key vectors (unit basis) so the retrieval numbers are real, not canned.

- [ ] **Step 2: Register + describe**

`mdx-components.tsx`: `DeltaMemory,` (import from `./delta-memory`).
`gen-md-siblings.mjs`: `DeltaMemory: 'Step-through demo of a small associative matrix memory: watch key-value writes accumulate with a plain additive rule versus the delta rule, which removes the old value at a key before writing the new one, so collisions replace instead of smear. Includes query/retrieval readout for both modes.'`

- [ ] **Step 3: Build check + commit**

`npm run build` PASS; commit `feat(mdx): DeltaMemory component`.

### Task 2.3: The post MDX

**Files:**
- Create: `content/blog/delta-rule-linear-attention/index.mdx`

- [ ] **Step 1: Write the post** (~1,800–2,400 words)

Frontmatter:
```yaml
---
title: "The delta rule: linear attention for a million-token context"
date: "2026-07-19T11:00:00.000Z"
description: "Full attention pays an n² bill that a 1M-token context can't afford. Linear attention swaps the bill for a memory you write to — and the delta rule is what makes that memory smart. Kimi calls K3's KDA a 'hybrid linear attention mechanism'; this is the family it belongs to, from the kernel trick to gated delta updates."
labels: software,machine-learning,llm,sequence-models
release: true
heroImage: /blog/delta-rule-linear-attention/hero.webp
takeaways:
  - "Full self-attention compares every token with every token: at 1M tokens that's 10^12 pair scores per layer, and the KV cache grows without bound."
  - "Drop the softmax and attention factors into a read from a fixed-size matrix memory — cost per token stops depending on the past."
  - "A plain additive memory smears collisions; the delta rule removes the old value at a key before writing the new one, so re-writes replace instead of blur."
  - "Kimi's KDA is a production member of this family, and it changes serving: a fixed state replaces the growing KV cache, which is why K3's cached input is 10x cheaper."
---
```

Content brief (follow spec outline §1–6; cross-link `/blog/a-transformer-reads-everything-at-once/`, `/blog/shrinking-the-kv-cache/`, `/blog/the-loop-that-beats-attention/`):
- **Prose pitfall (applies to all three posts): escape literal dollars as `\$`** (e.g. `\$0.30 vs \$3.00 per MTok`) — `remark-math` will otherwise eat `$0.30 … $` as broken inline math (SKILL.md "Common math pitfalls"). In frontmatter (YAML), dollars are safe unescaped.
- Hook: the 10¹² bill at 1M tokens (arithmetic: 1M² = 10¹²), then `<AttentionCostCurve />`.
- Kernel trick section with 3–5 numbered `<Equation>`s (unique `eqn:` ids, `latex` props; the three below plus the delta-rule update later):
  1. softmax attention `y_i = \sum_j \frac{\exp(q_i^\top k_j)}{\sum_l \exp(q_i^\top k_l)} v_j`
  2. kernel form `y_i = \frac{\phi(q_i)^\top \sum_j \phi(k_j) v_j^\top}{\phi(q_i)^\top \sum_j \phi(k_j)}` and the associative regrouping that makes it O(n)
  3. the recurrence `M_t = M_{t-1} + v_t k_t^\top,\quad y_t = M_t k_t`-style read.
- `<DeltaMemory />` section: collisions and smear; delta rule `M_t = M_{t-1} + \beta\,(v_t - M_{t-1} k_t)\,k_t^\top` (attribute Schlag et al. 2021 DeltaNet).
- Gating: Gated DeltaNet (Yang et al. 2024) forget gate; KDA signposted as Kimi's production member of the family ("the quickstart calls it 'a hybrid linear attention mechanism'; the deep details land with the technical report").
- Cache consequence + pricing ($0.30 vs $3.00 per MTok) — blog-sourced.
- 3–5 `<Callout>`s; "Reading further": DeltaNet, Gated DeltaNet, K3 blog, the-loop post, Mamba (Gu & Dao 2023).
- Voice rules apply (see header). Hedged, first-person-plural, one honest aside allowed.

- [ ] **Step 2: Build + math check**

`npm run build` PASS. Then:
```bash
grep -o 'class="katex"' out/blog/delta-rule-linear-attention/index.html | wc -l
```
Expected: ≥ the number of `$$…$$` blocks written (each display block yields ≥1). No raw `$$` left in the HTML text.

- [ ] **Step 3: Playwright render check** (serve `out/` on 3128 first)
- `<AttentionCostCurve />`: 2 curve paths + ≥2 markers present.
- `<DeltaMemory />`: 4 slots, mode toggle switches text; step buttons advance the counter.
- 390px viewport: no horizontal scrollbar; dark+light theme legible.

- [ ] **Step 4: md sibling**

`npm run md:siblings`; confirm `public/blog/delta-rule-linear-attention/index.md` exists with component blockquotes.

- [ ] **Step 5: Commit**

```bash
git add content/blog/delta-rule-linear-attention public/blog/delta-rule-linear-attention
git commit -m "feat(blog): the delta rule — linear attention for a million-token context"
```

---

## Chunk 3: Post 1 — `how-kimi-k3-works`

### Task 3.1: `AttnResDepth` component

**Files:**
- Create: `components/mdx/attn-res-depth.tsx`

- [ ] **Step 1: Write the component**

Stepper contrast diagram (no rAF):
- A vertical stack of 6 blocks (labels: block n−5 … n). Block n (top) is the reader.
- Mode A "plain residual": one thick straight edge from block n−1 up to n (accumulate what the previous block handed over).
- Mode B "attention residuals (mental model)": curved edges from block n to blocks n−1…n−5 with stroke width ∝ α (fixed illustrative α set, e.g. [0.42, 0.27, 0.16, 0.10, 0.05]); a readout row lists the mix. Caption states: the blog says AttnRes "selectively retrieves representations across depth rather than accumulating them uniformly"; α mechanics are our illustration pending the technical report.
- Segmented control toggles modes; Prev/Next not needed (single contrast). Mobile-safe SVG; theme tokens; `not-prose`.

- [ ] **Step 2: Register + describe**

`mdx-components.tsx`: `AttnResDepth,` from `./attn-res-depth`.
`gen-md-siblings.mjs`: `AttnResDepth: 'Contrast diagram of residual connections: a plain residual passes only the previous block\'s output upward, while attention residuals let a block read several earlier blocks\' outputs with different weights (alpha), i.e. selective retrieval across depth. Illustrated weights; K3 details pending the technical report.'`

- [ ] **Step 3: Build + commit**

`npm run build` PASS; commit `feat(mdx): AttnResDepth component`.

### Task 3.2: The post MDX

**Files:**
- Create: `content/blog/how-kimi-k3-works/index.mdx`

- [ ] **Step 1: Write the post** (~1,800–2,400 words)

Frontmatter:
```yaml
---
title: "How Kimi K3 works: 2.8 trillion parameters, 16 experts awake"
date: "2026-07-19T09:00:00.000Z"
description: "Kimi K3 is the first open 3T-class model: 2.8T parameters, a 1M-token context, and only 16 of 896 experts active per token. We take the architecture apart — Kimi Delta Attention, Attention Residuals, and Stable LatentMoE — and what each one buys."
labels: software,machine-learning,deep-learning,llm
release: true
heroImage: /blog/how-kimi-k3-works/hero.webp
takeaways:
  - "Kimi K3 is 2.8T parameters but activates only 16 of 896 experts per token — capacity and compute are finally separate dials, worth ~2.5x the scaling efficiency of K2."
  - "KDA replaces full attention's growing bill with a fixed-size memory, and it changes serving too: cached input is $0.30/MTok against $3.00 uncached."
  - "Attention Residuals let blocks retrieve from earlier depth selectively instead of inheriting one uniform residual stream."
  - "It ships with honest caveats: keep the thinking history intact, expect it to take initiative, and the very top proprietary models still lead it."
---
```

Content brief (spec outline §1–7): StatGroup hook (2.8T / 1M / 16-of-896 / 2.5×) → `<MoEBlock />` with the illustrative-2-of-64 caveat callout → LatentMoE details (Quantile Balancing, SiTU, Per-Head Muon, "report forthcoming") → KDA section (cost shape forward-ref to post 3, quickstart "hybrid linear attention mechanism" attribution, prefix-cache challenge quote, >90% cache-hit, pricing with `\$`-escaped dollars) → `<AttnResDepth />` section → systems (MXFP4/MXFP8 QAT from SFT, balanced expert-parallel, supernode 64+, Mooncake) → case studies (MiniTriton, 48-hour chip, kernel optimization, astrophysics pipeline) + limitations (thinking-history, proactiveness, UX gap) → Reading further (K3 blog, quickstart, post 2 link, Gated DeltaNet).
- Equations optional here (0–2); 3–5 Callouts; PullQuote allowed once ("2.8 trillion parameters, and most of them are asleep.").

- [ ] **Steps 2–5:** same verification pattern as Task 2.3 (build, katex count, Playwright: MoEBlock 64 cells + AttnResDepth stack + toggle, md sibling, commit `feat(blog): how Kimi K3 works`).

---

## Chunk 4: Post 2 — `benchmarking-kimi-k3`

### Task 4.1: `ArtifactFrame` component

**Files:**
- Create: `components/mdx/artifact-frame.tsx`

- [ ] **Step 1: Write the component**

Reuse the `GeneratedDemo` pattern (do NOT iframe a URL — the site CSP `frame-src` blocks it):
- Props: `taskId: string`, `modelId: string`, `version?: string`, `title?: string`, `caption?: string`, `height?: number` (default 480).
- Client fetch of `outputUrl(taskId, modelId, version)` (from `lib/lab/llm-benchmark/nav.ts`) on mount; states: loading skeleton (pulse), error note, ready.
- Ready: iframe `srcDoc={withPrelude(output)}` (from `lib/lab/llm-benchmark/frame-prelude.ts`), `sandbox="allow-scripts"`, fixed height, dark bg.
- Reduced-motion users get a play gate (button sets started state) exactly like GeneratedDemo.
- Caption row: `caption` text + "Open full page" anchor to `outputHtmlUrl(taskId, modelId, version)` (target _blank, rel noopener) — top-level navigation is not frame-src restricted. Note for verification: this URL is extensionless (Cloudflare Pages serves `x.html` as `/x` and 308-redirects the `.html` form), so it 404s under the local `python3 -m http.server` preview — verify the link only against the deployed site; locally check `/lab-data/llm-benchmark/outputs/<taskId>/<modelId>.html` directly instead.
- Wrap export with `next/dynamic` `ssr:false` + pulse loading fallback, mirroring `components/mdx/black-hole-sim-embed.tsx`.

- [ ] **Step 2: Register + describe**

`mdx-components.tsx`: `ArtifactFrame,` from `./artifact-frame`.
`gen-md-siblings.mjs`: `ArtifactFrame: 'Embeds a live model-generated HTML artifact from the site\'s LLM benchmark (fetched from /lab-data/llm-benchmark/outputs and run in a sandboxed srcdoc iframe). Props: taskId, modelId, optional version/title/caption/height.'`

- [ ] **Step 3: Build + commit**

`npm run build` PASS; commit `feat(mdx): ArtifactFrame component`.

### Task 4.2: The post MDX

**Files:**
- Create: `content/blog/benchmarking-kimi-k3/index.mdx`

- [ ] **Step 1: Write the post** (~1,500–2,000 words)

Frontmatter:
```yaml
---
title: "We pointed our own benchmark at Kimi K3 on launch week"
date: "2026-07-19T10:00:00.000Z"
description: "Our 7-task harness renders (or shows) what models actually generate, live and sandboxed. Running Kimi K3 against K2.7, Gemini and Codex broke the harness three different ways before it produced a fair table — here's the data, and what K3 is actually good at."
labels: software,machine-learning,llm,benchmarking
release: true
heroImage: /blog/benchmarking-kimi-k3/hero.webp
takeaways:
  - "On a fair 5-iteration comparison Kimi K3 leads our interactive-artifact tasks outright: n-body 100 vs 63, landing page 65 vs 35, circuit builder 100 vs 87."
  - "K2.7 still wins the terse text tasks (equations 100 vs 84, crypto 96.4 vs 86.8) — bigger is not better everywhere."
  - "K2.7's worst score was a serving artifact: it burned its whole 32k completion budget on reasoning and truncated before writing any answer."
  - "A billing-quota outage halfway through a sweep taught the harness its best lesson: never let a failed re-run overwrite good results."
---
```

Baked results table (GFM), † = partial (mean over successful iterations):

| Task | Kimi K2.7 | Kimi K3 |
|---|---|---|
| N-Body Field | 63 | **100** |
| Mini Platformer | **100** | 97.5 † |
| Crypto Hash Race | **96.4** | 86.8 |
| Equation Solver | **100** | 84 |
| Landing Page Morph | 35 † | **65** |
| Pendulum Wave | 100 † | 100 |
| Circuit Builder | 87 | **100** † |

(Averages: K2.7 ≈ 83.1, K3 ≈ 90.5.)

Content brief (spec outline §1–7): hook → harness-in-a-minute (5 live-render + 2 source-view disclosure) → how-it-broke trilogy (streaming fix; quota circuit-breaker + merge protection; 32k truncation with `finish_reason: 'length'`) with short sanitized log excerpts in fenced code blocks → the fair table + gap callouts → `<ArtifactFrame taskId="n-body-field" modelId="kimi-k3" version="<current outputVersion for that record>" title="Kimi K3's N-Body Field" caption="The exact artifact K3 produced, running live. Open it full-page from the benchmark." />` → what-we-took-from-it + links to `/lab/llm-benchmark/` and task pages → Reading further (K3 blog, quickstart, benchmark pages).
- For the `version` prop: read `lib/lab/llm-benchmark/results.json`, compute nothing — copy the record's `output` sha-256 first 10 hex (same recipe as `stripOutput`) OR simpler: omit `version` (it's optional; the JSON is fetched fresh at view time and the deployment is immutable per build).

- [ ] **Steps 2–5:** same verification pattern (build, katex count likely 0 — table post, Playwright: ArtifactFrame fetches JSON 200 + iframe srcdoc contains artifact markup, table has 7 rows, md sibling, commit `feat(blog): benchmarking Kimi K3 on our own harness`).

---

## Chunk 5: Publish gate + deploy

### Task 5.1: Full publish gate

- [ ] **Step 1: Gates**

```bash
npm run build && npm run typecheck && npm run test -- lib/lab/llm-benchmark/
npm run md:siblings
```

Then the component drift check. The naive recipe double-counts (the lazy-import block matches the same regex), so **dedupe with `sort -u`** and judge against the true baseline:

```bash
grep -oE '^\s+[A-Z][A-Za-z0-9]+,' components/mdx/mdx-components.tsx | tr -d ' ,' | sort -u > /tmp/registered.txt
grep -oE '^\s+[A-Z][A-Za-z0-9]+:' scripts/gen-md-siblings.mjs | tr -d ' :' | sort -u > /tmp/described.txt
diff /tmp/registered.txt /tmp/described.txt || true
```

Expected diff after this plan lands: exactly two lines — `< GithubLink` and `< Video` (both are registered as object *methods* in mdx-components.tsx so the registered-grep can't see them; they are described). The four new components (AttentionCostCurve, DeltaMemory, AttnResDepth, ArtifactFrame) must appear on BOTH sides. One pre-existing real drift gets fixed in this chunk: `Figure` is registered but has no description — add `Figure: 'A captioned layout image with optional credit and text-wrap placement (full, left, right, inset). Used for layout imagery with proper figure/caption semantics.'` to `COMPONENT_DESCRIPTIONS` and commit it with the chunk.

```bash
python3 -m http.server 3128 --directory out &   # if 3128 is already bound from an earlier chunk, skip — the running server serves the rebuilt out/
```

- [ ] **Step 2: Playwright sweep over the three posts** (write `scripts/verify-k3-posts.mjs`):
- Each post 200s; hero webp 200s; components present with expected node counts (per chunk steps); katex counts match; no raw `$$` in HTML; light+dark screenshots; 390px no horizontal overflow; ArtifactFrame srcdoc non-empty.
- Expected: all assertions pass. Save screenshots to `tmp/k3-posts/`.

- [ ] **Step 3: Commit any fixes + the verify script**

```bash
git add scripts/verify-k3-posts.mjs && git commit -m "test(blog): render verification for the K3 trilogy"
```

### Task 5.2: Deploy

- [ ] **Step 1: Next**

```bash
npm run deploy:next
```
Then run `scripts/verify-k3-posts.mjs` against the deployment URL.

- [ ] **Step 2: Prod**

```bash
npm run deploy:prod
```
Re-run the verify script against `https://benebsworth.com`.

- [ ] **Step 3: Push**

```bash
git push origin lab-expansion-2per-field
```
