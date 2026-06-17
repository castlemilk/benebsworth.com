---
name: writing-blog-posts
description: Use when writing, editing, or adding a blog post on this site (benebsworth.com) — authoring MDX, setting frontmatter, adding post images, choosing topic/tags, or building bespoke interactive MDX components for richer posts.
---

# Writing Blog Posts

## Overview

Posts are **MDX** files rendered by `next-mdx-remote/rsc` at build time (static export, `output: 'export'`). Markdown gives you prose, GFM tables, and highlighted code; registered React components give you bespoke interactive content (diagrams, cards, demos). This skill is the authoring reference for both.

**Two rules that cause most breakage:**
1. **Post images must exist in BOTH `content/blog/<slug>/` and `public/blog/<slug>/`** — only `public/` is served. Nothing copies between them automatically.
2. **Interactive components must be PascalCase and registered** in `components/mdx/mdx-components.tsx`. `import` statements inside `.mdx` do **not** work, and kebab-case tags (`<github-link>`) silently render as nothing.

## When to Use

- Adding a new blog post, or editing an existing one's content/frontmatter
- Adding images, code samples, tables to a post
- Building a custom interactive component for a post (charts, steppers, diagrams, demos)
- A post element isn't rendering (image broken, component blank, draft not showing)

Not for: projects (`content/projects/<slug>.mdx`) or lab explainers (`content/lab/<slug>.mdx`) — same MDX pipeline, but different frontmatter/layout (see **Adjacent content** below).

## Quickstart — add a post

The **slug is the directory name** — `content/blog/gitops-with-argo/` serves at `/blog/gitops-with-argo/`. (Blog posts have no `slug` frontmatter field; projects do.)

```
content/blog/<slug>/
  index.mdx          # frontmatter + body
  diagram.png        # co-located source images (any subdirs ok, e.g. diagrams/x.svg)
public/blog/<slug>/
  diagram.png        # SAME images mirrored here — this is what's actually served
```

```bash
# After dropping images into content/blog/<slug>/, mirror everything (incl.
# subdirs) to public/, then drop the copied mdx. Re-run whenever images change.
mkdir -p public/blog/<slug>
cp -R content/blog/<slug>/. public/blog/<slug>/ && rm -f public/blog/<slug>/index.mdx
```

Preview with `npm run dev` (visit `/blog/<slug>/`); confirm images load (no 404 in the network tab). Ship with `SKIP_ARCHIVE=1 npm run deploy:next` (staging) then `npm run deploy:prod` — these are two independent targets, not a required sequence.

### Full minimal example (`content/blog/<slug>/index.mdx`)

(Outer fence is 4 backticks only so the inner code fence shows; don't copy the outer fence.)

````mdx
---
title: GitOps with Argo
date: "2026-06-08T00:00:00.000Z"
description: "Declarative delivery with Argo CD — sync waves, drift, and rollbacks."
labels: technology,kubernetes
release: true
---

## Why GitOps

The cluster's desired state lives in git; a controller reconciles reality to it.

![Argo sync flow](./flow.png)

Inline `kubectl` and fenced blocks both render:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
```

<GithubLink url="https://github.com/owner/repo" />
````

## Frontmatter

Parsed in `lib/content.ts`. Only **`title`** and **`date`** are required (missing either throws a build error).

| Field | Required | Notes |
|---|---|---|
| `title` | ✅ | Post headline |
| `date` | ✅ | ISO 8601, e.g. `"2026-06-08T00:00:00.000Z"`. Drives ordering (newest first) |
| `description` | – | Summary; used in listings, `<meta>`, OG image. Write one |
| `labels` | – | CSV string, e.g. `technology,kubernetes,istio`. Split into tags. Drives topic/accent. What existing posts use |
| `tags` | – | Array form alternative to `labels`. **If both are set, `tags` wins** (`tags ?? labels`). Use one |
| `release` | – | Defaults `true`. Set `release: false` to keep a draft out of the published list/build |
| `draft` | – | Defaults `false`. `draft: true` also hides it |
| `heroImage` | – | Optional hero URL (`heroImage` or `hero_image`) |
| `author`, `keywords` | – | Stored but not currently read by the loader |

**Publish gate** (`isPublished`): a post is live iff `release !== false && !draft`. Unpublished posts are excluded from the listing **and** from `generateStaticParams`, so they aren't built at all.

```yaml
---
title: Your Post Title
date: "2026-06-08T00:00:00.000Z"
description: "One-sentence summary for listings, meta tags and the OG image."
labels: technology,kubernetes
release: true
heroImage: /blog/<slug>/hero.png
---
```

## Generating Hero Images

When creating a new post or updating an existing one without a `heroImage`, you should generate a high-quality hero image using OpenAI's `gpt-image-2` model. The image should be abstract, visually striking, and technically themed to match the site's aesthetic (often dark backgrounds with neon/vibrant accents).

**Step 1: Generate and download the image**
Use the `OPENAI_API_KEY` located in `~/projects/brandbrain/.env` to call the API. Note that `gpt-image-2` returns a base64 encoded string.

```bash
# 1. Source the API key
export OPENAI_API_KEY=$(grep OPENAI_API_KEY ~/projects/brandbrain/.env | cut -d '=' -f2)

# 2. Call the OpenAI API (adjust the prompt to match the post topic)
curl -s https://api.openai.com/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "Abstract editorial art: highly technical geometric vector illustration representing [TOPIC]. Clean isometric lines or layered gradients, translucent materials, subtle depth-of-field, brand teal (#00E0B8) and purple (#7C5CFF) accents against near-black (#0a0a0a). Generous negative space, matte finish.\n\nSTRICT: no text, words, numbers, letters, charts, UI elements, glossy 3D chrome, or stock-photo clichés.",
    "n": 1,
    "size": "1024x1024"
  }' > response.json

# 3. Extract the base64 string and save it to BOTH the content and public directories (crucial!)
mkdir -p public/blog/<slug> content/blog/<slug>
node -e '
  const fs = require("fs");
  const data = JSON.parse(fs.readFileSync("response.json", "utf8"));
  if (data.data && data.data[0] && data.data[0].b64_json) {
    const buf = Buffer.from(data.data[0].b64_json, "base64");
    fs.writeFileSync("content/blog/<slug>/hero.png", buf);
    fs.writeFileSync("public/blog/<slug>/hero.png", buf);
  } else {
    console.error("Failed to parse image from response", data);
  }
'
```

**Step 2: Update the frontmatter**
Add the `heroImage` field pointing to the downloaded file:
`heroImage: /blog/<slug>/hero.png`

## Markdown / MDX features

- **GFM** via `remark-gfm`: tables, strikethrough, task lists, autolinks.
- **Headings** auto-get `id` anchors (`rehype-slug`). Use `##`/`###` for structure (`#` h1 is the post title region; body usually starts at `##`).
- **Code blocks**: fenced with a language tag for highlighting (`github-dark` via `rehype-pretty-code`). Always tag the language:

  ````
  ```yaml
  apiVersion: v1
  kind: ConfigMap
  ```
  ````
  Line-highlighting is **not** configured — just syntax colors. Inline `code` is restyled (no background, mono).
- **Images**:  `![alt](./diagram.png)`. The `remarkImageBasePath` plugin rewrites `./x.png`, `x.png`, and `/x.png` → `/blog/<slug>/x.png`. Absolute `http(s)://`/`//`/`data:` URLs are left alone. (Remember: the file must be in `public/blog/<slug>/`.)
- **Restyled elements**: `h2 h3 p a ul code` are themed in `mdx-components.tsx`. Everything else falls back to Tailwind `prose`.
- **Math** — see [Math and equations](#math-and-equations) below.

### Editorial MDX Palette (for enhanced readability)

To improve the scannability, narrative flow, and engagement of the articles, use the following layout components:

| Component | Props | Use |
|---|---|---|
| `<StatGroup>` | (none) | Wrapper for 2-4 `<Stat>` components to break up long sections of prose. |
| `<Stat />` | `label`, `value`, `context?` | A bold callout for important metrics or numbers. `value` is large text, `label` is the header, `context` is a short subtext. |
| `<PullQuote>` | children | Wrap a striking sentence from the text to create a large, italicized blockquote with a branded accent border. Use 1 or 2 per article. |
| `<Figure />` | `src`, `caption?`, `credit?`, `placement?` | For rendering layout images with proper captioning. `placement` can be `full`, `left`, `right`, or `inset` to allow text wrapping and varied rhythm. |

Example:
```mdx
<StatGroup>
  <Stat label="Training Time" value="48 Hours" context="on 8x A100 GPUs" />
  <Stat label="Parameter Count" value="1.2B" context="sparse mixture" />
</StatGroup>

As we discovered during the final epoch:
<PullQuote>
  The real bottleneck wasn't the compute, but the memory bandwidth required to shuffle the latent embeddings.
</PullQuote>

<Figure src="/blog/post-slug/layout-1.png" caption="The memory allocation profile during the forward pass." placement="right" />
```

## MDX Component Palette

This is the menu — reuse a Reusable component before building a new one; one-off rows show what's possible, not what to drop into an unrelated post. One row per key actually registered in `components/mdx/mdx-components.tsx`.

| Component | Props (types; required ✅) | When to use | Reusable / one-off |
|---|---|---|---|
| `StatGroup` | children (none) | Wrap 2–4 `<Stat>` to break up long prose with a metric row | Reusable (editorial) |
| `Stat` | `label` str ✅, `value` str ✅, `context?` str | A bold callout for an important metric/number | Reusable (editorial) |
| `PullQuote` | children ✅ | A striking sentence as a large branded blockquote; 1–2 per post | Reusable (editorial) |
| `Figure` | `src` str ✅, `caption?` str, `credit?` str, `placement?` `full\|left\|right\|inset` | Captioned layout image with text-wrap placement | Reusable (editorial) |
| `Callout` | `type?` `info\|warning\|success\|error\|thinking\|feeling\|doing`, children ✅ | A "stop, look at this" insight, gotcha, or contrast; 3–5 per post | Reusable (editorial) |
| `Equation` | `id?` str, `number?` str, `caption?` str, `latex?` str, children (`$$…$$`) ✅ | A numbered, cross-referenceable display equation; 3–5 per post | Reusable (editorial) |
| `GithubLink` | `url` str ✅ | Inline styled repo link card | Reusable (editorial) |
| `Video` | `src?` str, `width?` num, `height?` num, `alt?` str | Auto-playing muted looping demo video | Reusable (editorial) |
| `LabCanvas` | `effect` str ✅, `height?` num, `params?` obj, `caption?` str, `controls?` bool | Embed ANY registered lab effect inline as an interactive canvas + live controls | Reusable (lab) |
| `LabSide` | `effect` str ✅, children ✅, `height?` num, `params?` obj, `controls?` bool, `caption?` str, `reverse?` bool | Two-column text-beside-lab layout (stacks on mobile); weave prose and lab | Reusable (lab) |
| `FlowDiagram` | `background` str ✅, `width` num ✅, `height` num ✅, `steps` FlowStep[] ✅, `label` str ✅ | The reusable walkthrough primitive: stepped image+SVG-overlay reveal with per-step prose/code. Register a thin wrapper that supplies data | Reusable (primitive) |
| `IngressFlowBasic` / `EgressFlowBasic` / `EgressFlowAdvanced` | (none — wrappers) | Istio ingress/egress walkthroughs; data-only wrappers over `FlowDiagram` | one-off (istio post) |
| `FfnnFlow` / `RnnFlow` / `LstmFlow` / `VaeFlow` / `GanFlow` / `TransformerFlow` | (none) | Animated neural-net architecture diagrams (one per zoo cell type) | one-off (zoo post) |
| `ZooMiniMap` | (none) | Clickable 3×2 mini-map navigating to each zoo diagram | one-off (zoo post) |
| `ColorLegend` | (none) | 15-swatch Asimov-poster colour legend for the zoo diagrams | one-off (zoo post) |
| `AttentionHeatmap` | (none) | Interactive self-attention matrix heatmap with scale slider | one-off (LLM-internals) |
| `SoftmaxLab` | (none) | Animated softmax-pipeline walkthrough (raw → ÷√dₖ → exp → ÷Σ) | one-off (LLM-internals) |
| `TokenSampler` | (none) | Next-token sampler with temperature / top-k / top-p sliders | one-off (LLM-internals) |
| `MoEBlock` | (none) | Mixture-of-Experts routing diagram with parameter accounting | one-off (LLM-internals) |
| `PllDiagram` | (none) | Renders the PLL feedback circuit from its JSON via `<Diagram>` | one-off (PLL post) |

`LabCanvas` and `LabSide` are how most posts become interactive "for free": `effect` is any slug in `lib/lab/registry.ts`, so you embed an existing lab effect (with its real controls) without writing canvas code. Reach for these before authoring a bespoke component.

### THE COMPONENT SYNC RULE (keep three places in sync)

A registered MDX component lives in **three** places, and all three must agree:

1. **Implementation** — `components/mdx/<name>.tsx` (the actual React component).
2. **Registration KEY** — `components/mdx/mdx-components.tsx`. The MDX tag IS the object key: `{ Foo: Bar }` means you write `<Foo/>`, not `<Bar/>`.
3. **Description** — `scripts/gen-md-siblings.mjs` `COMPONENT_DESCRIPTIONS`. This is what LLM crawlers see in the `.md` sibling where the live component can't render.

**The invariant:** a registered component with **no** `COMPONENT_DESCRIPTIONS` entry ships a blank placeholder to crawlers (the script falls back to `` `Interactive component `Name` — see the rendered post.` `` — useless); a description with **no** registration is dead — it describes a tag no post can use.

**Drift check** — compare the registration keys against the description keys:

```bash
# Registered keys (object keys + inline component definitions in mdx-components.tsx)
grep -oE '^\s+[A-Z][A-Za-z0-9]+,' components/mdx/mdx-components.tsx | tr -d ' ,'
# Description keys
grep -oE '^\s+[A-Z][A-Za-z0-9]+:' scripts/gen-md-siblings.mjs | tr -d ' :'
# Diff the two sorted lists; anything registered-but-undescribed is drift.
```

**Worked example (current known drift):** `LabCanvas`, `LabSide`, and `PllDiagram` are registered in `mdx-components.tsx` but were missing from `COMPONENT_DESCRIPTIONS` — so any post embedding a lab shipped a blank placeholder to crawlers. When you add a component, add its description in the same change.

## Deep dive: math and equations

The deep-dive reference for the `Equation` palette row and raw `$…$` / `$$…$$` math. The MDX pipeline has `remark-math` + `rehype-katex` enabled, so LaTeX-style math renders server-side. No configuration needed by the author — write `$...$` for inline and `$$...$$` for display, and it just works. KaTeX is the rendering engine (not MathJax), so it's fast enough to be in the static export without a runtime cost.

### Inline math — `$...$`

Use for variables, simple expressions, and short formulas in running prose:

```mdx
where $Z_L$ is the load impedance (typically $50\Omega$ real).
The product is $2\sin(\omega_\text{ref} t) \cdot \sin(\omega_\text{vco} t)$.
```

Inline math uses the body's font size and colour, sits on the baseline (no separate line), and inherits the surrounding theme (light/dark). It does NOT break prose line-height; the `.prose .katex` rule in `globals.css` sets `vertical-align: -0.15em; line-height: 1`.

### Display math — `$$...$$`

Use for standalone equations and longer expressions:

```mdx
$$
\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}
$$
```

Display math is centred, has `overflow-x: auto` so it doesn't break the layout when the expression is wider than the prose column, and has breathing room (`margin: 1.5rem 0`). Use it for 3-5 important equations per post — the ones the reader should remember, the ones the post's argument hinges on. Don't number them or label them; use the `<Equation>` component for that.

### Numbered equations — `<Equation>`

For equations you want to **cross-reference** later ("by equation (3)...", "see figure 2") or **caption** ("the reflection coefficient of a load on a transmission line"), wrap the display math in the `<Equation>` component:

```mdx
<Equation id="eqn:smith-reflection" number="1" caption="The reflection coefficient of a load impedance on a transmission line." latex="\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}">

$$
\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}
$$

</Equation>
```

Props:
- `id` — optional DOM anchor for cross-references via `<a href="#eqn:smith-reflection">equation (1)</a>`. Use the prefix `eqn:` to disambiguate from heading anchors.
- `number` — explicit label like `"1"`, `"3.2"`, or `"A.5"`. Renders as `(1)` in monospace muted text, before the caption.
- `caption` — short prose annotation below the equation. Not the derivation; just a one-line "this is the X" reminder.
- `latex` — the raw LaTeX source string. Drives the **Copy LaTeX** and **Copy math** buttons (with/without `$$` delimiters). Also exported to the `.md` sibling as a `data-latex` attribute for LLM crawlers. If `latex` is omitted, the copy buttons are hidden.
- `children` — the math expression (typically `$$...$$`).

Renders as `<figure id="..." data-equation data-latex="...">` with `not-prose` so the prose typography doesn't override the equation styling. The figure's `data-latex` attribute is also useful for LLM crawlers that don't render the full button set.

**Why the `latex` prop is separate from `children`**: by the time the component receives `children`, the MDX pipeline has already converted the `$$...$$` source into KaTeX HTML. The original LaTeX string is no longer recoverable from `children` — it has been turned into a tree of `<span class="mord">` and `<span class="mbin">` elements. The `latex` prop is the only way to surface the source back to the user. Authors must provide it explicitly; this is intentional, because a copy of "the math as the user sees it" should match a copy of "the math as the user wrote it" — and the rendering pipeline can reformat whitespace, insert `\displaystyle`, or change macro expansions in subtle ways that an explicit source string avoids.

**The rule of thumb**: 3-5 numbered equations per 2000-word post. The rest stay as inline `$...$` math or are not rendered as math at all.

### Copy button — top-right hover icon + expanding menu

When the `latex` prop is set, the equation figure shows a small `⧉` icon in the **top-right corner**. The icon is **invisible by default** (`opacity: 0`) and only appears when the cursor hovers anywhere in the figure. The icon itself is small, circular, and subtle — the goal is a discoverable utility, not a primary action.

Once the icon is visible, hovering directly over it (or the menu that expands below) opens a panel with two menu items:

- **Copy LaTeX** — copies `latex` wrapped in `$$ ... $$` delimiters, suitable for pasting straight into a Markdown block.
- **Copy math** — copies just the LaTeX expression (no delimiters), suitable for pasting into a Python REPL, a KaTeX snippet, or a notebook cell.

Each menu item shows a label and a small hint on the right (`with $$ delimiters` / `expression only`). After a copy, the item shows a check icon and the word "Copied" in green for 1.5 seconds. The menu uses `navigator.clipboard` with a `textarea + execCommand` fallback for older browsers / insecure contexts.

**Three levels of visibility, in increasing engagement:**

| State | Trigger | Icon | Menu |
|---|---|---|---|
| Idle | No hover | 0 (invisible) | 0 (invisible) |
| Hover the figure | Cursor anywhere in the figure | 1 (visible) | 0 (invisible) |
| Hover the icon or menu | Cursor on the icon or menu | 1 (visible) | 1 (expanded) |
| Just clicked | Click on a menu item | 1 (visible) | 1 (expanded with "Copied" for 1.5s) |
| Keyboard focus | Tab into the icon | 1 (visible) | 1 (expanded) |

**Why the icon uses `group-hover/eq` and not `onPointerEnter` on the figure**: CSS `group-hover` is more performant than a React state change for a "cursor over the figure" detector. It also has no edge case with cursor movement between figure and menu — the menu uses a separate `onPointerEnter`/`onPointerLeave` on its wrapper div to keep itself open independently. The two hover states (figure-level for the icon, wrapper-level for the menu) compose cleanly: hovering the menu keeps the menu open *and* keeps the figure-hovered state, so the icon stays visible.

**Why the menu doesn't close when the cursor moves from icon to menu**: the icon and menu are siblings inside the same wrapper `div`. The `onPointerEnter` / `onPointerLeave` on that div keeps `open` true while the cursor is anywhere inside it. A naive CSS-only `:hover` on the icon would close the menu the moment the cursor moved off the icon — the React state handler closes that gap.

**Why the icon is in `position: absolute` top-right**: the equation figure is centred, and the math is the primary content. The copy menu is a utility — it should be discoverable but never compete with the math. The right padding on the math wrapper (`pr-10`) keeps the icon from overlapping tall equations.

**Keyboard accessibility**: the icon is a real `<button>` with `aria-haspopup="menu"` and `aria-expanded`. The menu items have `role="menuitem"`. Escape closes the menu. Tab moves through the items. Focus on the figure (or the icon) keeps the menu open via the `open` state.

**Reduced motion**: the 200ms expand transition is the only animation. If the user has `prefers-reduced-motion: reduce`, the transition collapses to `transition: none` via the global rule in `globals.css`. Verify if you make changes — the post's prose is heavy enough that the expand animation is felt, not just seen.

### Math features supported

KaTeX supports a large subset of LaTeX. The full reference is at https://katex.org/docs/supported.html, but the subset you actually need:

- **Fractions**: `\frac{a}{b}` → a/b
- **Subscripts/superscripts**: `x^2`, `x_i`, `x_i^2`, `x_{i+1}`
- **Greek letters**: `\Gamma`, `\omega`, `\tau`, `\theta` (capital: `\Omega`, `\Phi`, `\Delta`)
- **Trig/exp**: `\sin`, `\cos`, `\exp`, `\log` — note KaTeX uses `\\` for `\sin(\theta)` to render "sin" upright, not italic
- **Operators**: `\sum_{i=0}^{n}`, `\int_{0}^{\infty}`, `\prod_{i=1}^{N}`
- **Roots**: `\sqrt{x}`, `\sqrt[3]{x}`
- **Matrices**: `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` (note `\\` for row break)
- **Cases**: `\begin{cases} x, & \text{if } x > 0 \\ -x, & \text{otherwise} \end{cases}`
- **Text in math**: `\text{load}` — upright text inside math mode
- **Subscripts with text**: `\omega_\text{ref}` (NOT `\omega_ref` — that puts "ref" in math italics)
- **Accents**: `\hat{x}`, `\bar{x}`, `\vec{x}`, `\dot{x}`, `\tilde{x}`
- **Spacing**: `\,` (small), `\:` (medium), `\;` (large), `\!` (negative)
- **Aligned equations**: `\begin{aligned} a &= b + c \\ &= d \end{aligned}`

### Math features NOT supported (or workaround)

- **Display math inside Markdown lists** — KaTeX can have layout issues when `$$...$$` is inside a bullet list. Workaround: end the list, do the math, start a new list.
- **The `align*` environment** is unreliable; use `aligned` inside display math instead.
- **`\boxed{}`** — not in KaTeX. Workaround: wrap in `\fbox{...}` for a similar effect.
- **`\boxed` in aligned** — workaround is to use `\\[1ex]` and `\text{…}` for line labels.
- **Custom macros** — KaTeX supports a small set via the `macros` option but our pipeline doesn't expose it. Use the equivalent LaTeX directly (e.g. write `\mathbb{R}` not `\R`).

### The .md sibling and math

The .md sibling (LLM-readable version) does not have KaTeX. The `scripts/gen-md-siblings.mjs` script leaves `$$...$$` in place as raw LaTeX — the LLM sees the source math and can parse it directly. For `<Equation>` components it substitutes a blockquote with the description from `COMPONENT_DESCRIPTIONS.Equation` followed by the raw `$$...$$` block. So:

```mdx
<Equation id="eqn:smith-reflection" number="1" caption="The reflection coefficient of a load impedance on a transmission line.">

$$
\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}
$$

</Equation>
```

becomes in the .md sibling:

```markdown
> [Equation component] Labeled display-math block (KaTeX-rendered). ...

$$
\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}
$$
```

The math stays; only the editorial frame (figure, caption styling, anchor) is replaced with a placeholder.

### Common math pitfalls

- **Math inside Markdown code blocks is NOT rendered.** The `\`\`\`-fenced code block escapes KaTeX parsing. Use `$$...$$` directly in prose, not in a code block.
- **Single dollar vs escaped dollar.** `$5 and $10` will be parsed as math (broken). Escape with `\$5 and \$10` if you need literal dollars in prose. In code spans (`` `$10` ``) the dollar is also a problem only at the start/end — backticks are safe.
- **Multi-line display math needs a blank line** before and after the `$$`. Adjacent paragraphs get joined into the math.
- **Brackets and parens auto-scale** with `\left( ... \right)`. Use them for nested expressions to keep them readable: `\left( \frac{a}{b} \right)^2`.
- **Bold/italic in math**: `\mathbf{x}` for vectors, `\mathrm{d}t` for differential `d`. NOT `\textbf{d}` — that's text mode, breaks inside math.
- **When in doubt, write it on KaTeX's live demo at https://katex.org/** before committing. Paste your LaTeX, see if it renders the way you want. Saves a build cycle.

## Topics & accent

Each post resolves to one topic (label + icon + accent color) via `lib/topics.ts` → `topicFor()`, in priority order:
1. `BY_SLUG` hand-curated override for the exact slug
2. First matching `TAG_RULES` entry (matches a tag, case-insensitive)
3. Fallback `technology` ("Engineering", teal)

Topics include `kubernetes`/`tekton`/`kustomize`/`minikube`/`react` (teal `#00e0b8`), `istio` (purple `#7c5cff`), `gcp`/`algorithms`/`general` (orange `#ff7a59`). To control a post's accent, give it the right `labels`, or add a `BY_SLUG` override in `lib/topics.ts`.

## Bespoke interactive components

This is how to add richer-than-markdown content. The pipeline does **not** support `import` inside `.mdx` (legacy imports were stripped on migration). Instead:

**Wiring (3 steps):**
1. Write the component in `components/mdx/` (add `'use client'` if it uses state/effects/events).
2. Import + register it in `components/mdx/mdx-components.tsx` under a **PascalCase** key.
3. Use it in the post as a self-closing PascalCase tag: `<MyThing prop="x" />`.

```tsx
// components/mdx/mdx-components.tsx
import { MyThing } from './my-thing'

export const mdxComponents: MDXComponents = {
  MyThing,            // ← now <MyThing/> works in any post
  GithubLink,         // existing examples...
  IngressFlowBasic, EgressFlowBasic, EgressFlowAdvanced,
  h2: (p) => <h2 .../>,
  // ...
}
```

The **MDX tag matches the object KEY**, not the import identifier. `{ Foo: CostCalc }` means you write `<Foo/>` in the post, not `<CostCalc/>`. Conventionally keep them the same.

**Minimal example — a prop-driven card** (`GithubLink` in `mdx-components.tsx`): takes `url`, renders a styled repo link. Use as `<GithubLink url="https://github.com/owner/repo" />`. Good template for small static widgets.

**Rich example — stepped interactive diagram** (`components/mdx/flow-diagram.tsx` + `istio-flows.tsx`): `FlowDiagram` is a reusable, state-driven primitive — a background image with SVG overlay layers revealed step-by-step plus per-step prose/code. Domain wrappers (`IngressFlowBasic`, …) just supply data and render `<FlowDiagram .../>`, then are registered and used as `<IngressFlowBasic/>`. Reuse this pattern for any "walkthrough" content.

```tsx
// FlowDiagram contract (components/mdx/flow-diagram.tsx)
type FlowLayer = { src: string; top: number; width: number; alt: string } // src = absolute /blog/... path; top/width are % of bg
type FlowStep  = { header: string; description: string; layers: FlowLayer[] } // layers reveal cumulatively; description = prose + ```fenced``` code
type FlowDiagramProps = { background: string; width: number; height: number; steps: FlowStep[]; label: string }
// background = absolute /blog/... path; width/height = the background's intrinsic
// pixel size (drives aspect ratio only); steps[] non-empty (step 0 = bg alone).
```

```tsx
// Your wrapper, e.g. components/mdx/argo-flow.tsx — register as { ArgoFlow } → <ArgoFlow/>
'use client'
import { FlowDiagram, type FlowStep } from './flow-diagram'
const BG = '/blog/gitops-with-argo/diagrams' // assets live under public/blog/<slug>/diagrams/
const steps: FlowStep[] = [
  { header: 'Application', description: 'An `Application` declares the desired state.', layers: [] },
  { header: 'Sync', description: 'The controller **reconciles** the cluster.\n\n```bash\nargocd app sync demo\n```',
    layers: [{ src: `${BG}/sync.svg`, top: 12, width: 100, alt: 'Sync layer' }] },
]
export function ArgoFlow() {
  return <FlowDiagram background={`${BG}/bg.svg`} width={306} height={411} steps={steps} label="Argo sync flow" />
}
```

```tsx
// Template: a new registered interactive component
'use client'
import { useState } from 'react'

export function Stepper({ items }: { items: string[] }) {
  const [i, setI] = useState(0)
  return (
    <div className="not-prose my-7 rounded-xl border border-[var(--color-border)] bg-surface p-5">
      <p className="font-mono text-sm text-fg/80">{items[i]}</p>
      <button className="mt-3 text-xs uppercase tracking-wider text-muted hover:text-fg"
        onClick={() => setI((i + 1) % items.length)}>next →</button>
    </div>
  )
}
```

**Component conventions:** use theme tokens (`var(--color-fg)`, `bg-surface`, `border-[var(--color-border)]`, accent `text-blog`/`text-project`/`text-about`); wrap non-prose UI in `not-prose`; assets a component references go in `public/blog/...` with **absolute** paths (e.g. `/blog/<slug>/diagrams/x.svg`).

### Adding a new MDX component (when the existing set isn't enough)

When a post needs a feature the current set of registered components doesn't have, add it in three steps. Don't bloat the components file for a one-off use — only register a component if it'll be used in 2+ posts or has a clear general utility.

**Step 1 — Write the component.** Create a new file in `components/mdx/<name>.tsx` (or `components/ui/<name>.tsx` for shared cross-project UI). Use `'use client'` if the component uses state, effects, or events. Keep the props typed.

**Step 2 — Register the component.** Import and add the component to `components/mdx/mdx-components.tsx`:
```tsx
import { MyNewThing } from './my-new-thing'

export const mdxComponents: MDXComponents = {
  // ...existing registrations
  MyNewThing,  // tag is the key — `<MyNewThing />` in MDX
  h2: (p) => <h2 .../>,
  // ...
}
```

**Step 3 — Add a description to the .md sibling generator.** Open `scripts/gen-md-siblings.mjs` and add an entry to `COMPONENT_DESCRIPTIONS`:
```js
const COMPONENT_DESCRIPTIONS = {
  // ...
  MyNewThing: 'A 2-3 sentence description of what this component renders and when to use it. Mention any inputs it expects and what visual elements it produces.',
}
```
This is what an LLM sees in the .md sibling file. Without this entry, the LLM-readable version has no useful placeholder for the component.

**Component design checklist:**
- Works in both light and dark mode (test the colour tokens against `--bg` and `--fg`)
- Mobile-responsive (no fixed widths that overflow on 375px screens)
- Doesn't break the scroll-anchor (figures with `id` get `scroll-mt-32`)
- Doesn't break TOC click performance (use `content-visibility: auto` for off-screen content)
- Follows the rAF pause pattern (if interactive, pause on scroll, off-viewport, drag, prefers-reduced-motion)
- Has tooltips that work — element-anchored popover via `createPortal`, smart positioning (flip below if off-screen above), correct content (no "Shape: triangle" filler that duplicates the visual)
- `not-prose` wrapper for any non-prose UI so Tailwind typography doesn't override your styles

**Common components to consider adding:**
- `<Equation>` — KaTeX-rendered display math, for posts heavy on derivations
- `<Timeline>` — vertical event timeline with year markers
- `<SideBySide>` — two-column layout that stacks on mobile
- `<ProgressiveImage>` — image with blur-up placeholder
- `<ComparisonTable>` — styled side-by-side feature comparison
- `<CodeSandbox>` / `<CodePen>` — embedded live-editable code
- `<KeyInsight>` — bolded inline callout pill for short one-liner insights
- `<Aside>` — a margin note that floats on `lg+` and inlines on mobile

When adding any new component, also update the `mdx-components.tsx` `h2: (p) => <h2 ... />` and `h3: (p) => <h3 ... />` overrides so they have `scroll-mt-32` for the sticky breadcrumb offset.

## Authoring workflow — research, discover, build

The pipeline from "I have a topic idea" to "I have a published post" is four phases. Skipping a phase is the most common reason posts come out thin.

### Phase 1: Discover — what's worth writing?

**Step 1.1 — Audit the existing lab.** Run `grep "slug:" lib/lab/registry.ts` to enumerate the 30+ interactive effects. Each effect is a *promised interactive section* in a future blog post. A topic is high-leverage if it can reuse 2+ existing effects with no new art.

**Step 1.2 — Survey existing posts.** `ls content/blog/`, then `grep -hE "^labels: " content/blog/*/index.mdx` to count tags. Underrepresented tags are opportunities:
```
   15 kubernetes     ← heavily covered
   4 algorithms      ← thin, room for more
   1 machine-learning
   1 general
```
Tag the post with underused labels to broaden the topic palette.

**Step 1.3 — Score topics on three axes** (1–5 each, total ≥ 12 to write, < 8 to wait):
1. **Reusable lab effects** — 1 (none) to 5 (multiple existing effects)
2. **Visual / interactive payoff** — 1 (pure prose) to 5 (topic demands a diagram)
3. **Personal conviction** — 1 ("could write") to 5 ("have to write this")

The single biggest predictor of engagement: topic that ties together 2+ existing labs the user already cares about.

### Phase 2: Research — what's the canonical source?

**Step 2.1 — Find the textbook.** Every technical topic has a canonical reference work (Pozar for RF, Franklin/Powell for control systems, Nielsen/Chuang for quantum, Cooley/Tukey 1965 for FFT, Knuth for algorithms). The book's job is to be the *anchor* — it tells you what the field considers correct.

**Step 2.2 — Find the original paper.** The Asimov Institute neural network zoo is one example; the Cooley-Tukey 1965 paper is another; the Lorenz 1963 paper is a third. Original papers are short, often 5–10 pages, and they cut through the modern textbook's accumulated narrative to the core idea. Read the paper first if you can.

**Step 2.3 — Find a teaching case.** Look for a worked example in a different field that uses the same pattern. The Smith chart post above uses the Möbius transform, which is also the Joukowski airfoil mapping, the modular group, and the conformal-grid lab. The PLL post treats the PLL as a control system, then maps it onto the PID lab. **The same math, two contexts**, is the single most powerful way to make an idea stick.

**Sources to use:**
- The `search_files`, `web_search`, `web_extract` tools for finding primary sources
- The `mcp_docgraph_*` tools if you have a knowledge graph of documents
- The repo's `lib/lab/` and `content/lab/` directories for prior coverage

### Phase 3: Build — write the post

**Step 3.1 — Outline the post on the lab effects first.** Each lab is a *section* in the post. The post skeleton:
```
1. Lead image / hook (no lab)
2. First lab — illustrates the problem
3. Section: "Why this matters" (the "what's the trade-off" section)
4. Math + intuition
5. Second lab — illustrates the solution
6. Section: "How to read this" (the practical guide)
7. Optional: third lab — illustrates the application
8. "Reading further" — 3-4 citations
```
Posts that use 2-3 labs at strategic moments outperform posts that pack all labs in one section.

**Step 3.2 — Lead with intuition, follow with derivation.** The "first lab" should show the *effect* the post will explain. The reader should know what they're trying to understand before they read the maths. The PLL post opens with a chirped reference being tracked; the Smith chart post opens with a frequency sweep around the unit circle.

**Step 3.3 — Use `<Callout>` for the 3-5 key insights.** A post with no callouts reads as a wall of text. A post with too many callouts reads as Twitter. Three to five callouts per post is the sweet spot. Each callout should be a "stop, look at this" moment — a counter-intuitive result, a common mistake, or a unifying insight.

**Step 3.4 — Use `<LabSide>` to weave text and lab.** Don't drop the lab as a single isolated figure — alternate between prose and lab. The pattern: explain one idea, show it on the lab, explain the next idea, show it. Each `<LabSide>` should advance the post, not just decorate it.

**Step 3.5 — Cite the sources as links.** The "Reading further" section should have 3-4 actual papers or textbooks, hyperlinked, with one-sentence annotations explaining what each one is good for. The reader can find the canonical source, the modern treatment, and the historical paper.

**Step 3.6 — Frontmatter.** `title`, `date` (ISO 8601), `description`, `labels` (CSV), `release: true`. Pick labels that drive the right topic accent — see `lib/topics.ts`. Underrepresented labels broaden the topic palette; overrepresented labels can dilute a post.

### Phase 4: Verify — does it actually work?

**Step 4.1 — Build.** `npm run build` — must succeed. Build errors usually mean MDX syntax (unclosed tags, missing components, escaping issues).

**Step 4.2 — Visual check.** Visit the post in the browser (or via Playwright + the production server at `python3 -m http.server 3128 --directory out`):
- Every lab renders
- Every Callout has the right accent and icon
- The math typesets (or displays as code) correctly
- The post reads top to bottom without broken anchors

**Step 4.3 — Run the validation checklist** (see below). Especially: component presence, interactive behaviour, performance sanity.

**Step 4.4 — Regenerate the .md sibling** (see "LLM-readable .md sibling" in the Validation section). Verify the new post's components are in `COMPONENT_DESCRIPTIONS` of `scripts/gen-md-siblings.mjs` so the LLM-readable version has a useful placeholder.

**Step 4.5 — Deploy.** `SKIP_ARCHIVE=1 npm run deploy:next` (staging) → verify → `npm run deploy:prod` (production). The two are independent, not sequential.

### What makes a post engaging (insight, not just content)

Five qualities separate a post readers remember from a post readers skim:

1. **Lead with a counter-intuitive claim.** "Every wire is an RLC circuit." "A PLL is a PID controller in disguise." "The Smith chart is geometry, not engineering." A claim the reader wants to test as they read.
2. **Show the failure modes.** "Here's what goes wrong when you push K_p too high." Engineers trust posts that show both the recipe and the failure.
3. **Cross-reference other fields.** The PLL post maps onto the PID lab. The Smith chart post maps onto the conformal grid. The FFT post will map onto the random-walk lab (CLT). The reader's *map* of which labs/ideas relate to which is the *durable* knowledge.
4. **Cite the original source.** The 1965 Cooley-Tukey paper, the 1963 Lorenz paper, the 1943 McCulloch-Pitts neuron, the 1975 Gardner PLL book. A post with citations is a *reference*; a post without citations is an *opinion*.
5. **End with a working artifact.** The lab is the artifact. A reader who interacts with the lab at the end of the post leaves with a *demonstrated* understanding, not just a *described* one.

## Common mistakes

| Symptom | Cause / fix |
|---|---|
| Image broken / 404 on live site | File only in `content/`. Copy it to `public/blog/<slug>/` too |
| Component renders as nothing | Used kebab-case (`<my-thing>`) or not registered. Use PascalCase + add to `mdxComponents` |
| `import` in `.mdx` does nothing | Imports aren't supported in MDX source. Register the component globally instead |
| Post not appearing | `release: false` or `draft: true` (or missing — defaults publish, but check). It's also not built when unpublished |
| Build error `missing title/date` | Both are required frontmatter fields |
| Code block not highlighted | Missing language tag after the opening fence |
| Wrong accent color on listing | Set `labels`/`tags`, or add a `BY_SLUG` override in `lib/topics.ts` |
| Math not rendering | Math is inside a ` ``` ` code block — KaTeX doesn't parse code-fenced content. Use `$$...$$` directly in prose |
| Math shows raw LaTeX | `remark-math` not in the plugin chain — verify `components/mdx/mdx-content.tsx` includes it |
| `<Equation>` shows nothing | `id` clashes with an existing heading anchor — use the `eqn:` prefix |
| Math breaks in dark mode | The `.katex` CSS colour override was lost — re-add the rules in `globals.css` |
| Literal `$5` renders as broken math | Escape the dollar: `\$5` |
| Copy buttons missing on `<Equation>` | `latex` prop not set — add it. Authors must provide the LaTeX source explicitly because it's not recoverable from `children` after the MDX pipeline converts to KaTeX HTML |

## Publish gate (NEVER ship without)

If **any** of these fail, the post is **not done** — no exceptions, no "I'll fix it after deploy". Each gate is hard and verifiable; each points at the deeper section that explains it.

1. **`npm run build` passes.** A failed build is a broken post. Build errors are almost always MDX syntax (unclosed tag, unregistered component, bad escaping). See [Build, preview, deploy](#build-preview-deploy).
2. **Every image exists in BOTH `content/blog/<slug>/` and `public/blog/<slug>/`.** Only `public/` is served; nothing copies automatically. Confirm zero 404s in the network tab. See [Quickstart](#quickstart--add-a-post).
3. **Every custom tag is PascalCase AND registered** in `components/mdx/mdx-components.tsx`. kebab-case tags and unregistered tags render as nothing. See [Bespoke interactive components](#bespoke-interactive-components).
4. **Math is RENDERED, not raw.** Count `.katex` elements in the served HTML and confirm it matches the number of `$…$` + `$$…$$` blocks. Every `<Equation>` has a **unique** `eqn:`-prefixed `id` AND a `latex` prop (the copy buttons and `.md` sibling depend on it). See [Deep dive: math and equations](#deep-dive-math-and-equations).
5. **`.md` sibling regenerated** (`npm run md:siblings`) AND every component used in the post has a `COMPONENT_DESCRIPTIONS` entry — no blank crawler placeholders. See [THE COMPONENT SYNC RULE](#the-component-sync-rule-keep-three-places-in-sync).
6. **Renders in BOTH light and dark theme.** Callouts, sticky nav, breadcrumb, diagram colours all legible in each. See [Cross-theme verification](#6-cross-theme-verification).
7. **Diagram accuracy verified by Playwright DOM check, not eyeball.** A diagram that renders is not a diagram that is correct — assert node counts / colours / cursor-on-trace against the data. See [Diagram accuracy](#diagram-accuracy--verifying-interactive-components).
8. **Frontmatter has `title` + `date` + intended release/draft state.** `title`/`date` are required (build throws without them); set `release`/`draft` to the state you actually intend (defaults publish). See [Frontmatter](#frontmatter).

## Commissioning a post

### Is this topic worth writing?

Score it on three axes, 1–5 each. **Total ≥ 12 → write it. < 8 → wait** (the idea isn't ready, or you don't care enough yet).

| Axis | 1 = skip | 3 = maybe | 5 = must-write |
|---|---|---|---|
| Reusable lab effects | no existing effect fits | one effect fits | two-plus existing effects compose into the post |
| Visual / interactive payoff | pure prose, nothing to show | a static figure would help | the topic *demands* an interactive diagram |
| Personal conviction | "could write it" | "would enjoy writing it" | "have to write this" |

The single best predictor of engagement: **a topic that ties together 2+ existing labs the author already cares about.** That combination scores high on all three axes at once and the post almost writes itself.

### Desk house angles

Each desk has a canonical anchor source (what the field considers correct), the reusable labs it draws from, and a house angle (the framing that makes the post land).

| Desk | Canonical anchor source | Reusable labs | House angle |
|---|---|---|---|
| Maths / Algorithms | Knuth (TAOCP); Cooley–Tukey 1965 | `fourier-series`, `random-walk`, `phase-portrait`, `lorenz` | "the same structure shows up in two unrelated places" |
| Physics | Lorenz 1963; Nielsen & Chuang | `lorenz-attractor`, `bloch-sphere`, `quantum-tunneling`, `band-structure` | "lead with the phenomenon, derive after" |
| Software / Infra | k8s / Tekton / Argo docs | `flow-diagram` walkthroughs | "desired-state vs reality — show the failure mode" |
| EE / Signals | Pozar (RF); Franklin & Powell (control) | `smith-chart`, `rlc-resonance`, `pll-lock-in`, `transmission-line`, `bode-plotter` | "every wire is an RLC; every loop is a control system" |

## Voice & house style

**Positive rules:**

- **Lead with a counter-intuitive claim.** "Every wire is an RLC circuit." "A PLL is a PID controller in disguise." A claim the reader wants to test as they read.
- **Second person + present tense for the reader's actions.** "You sweep the frequency and the marker walks the unit circle" — not "the user would observe…".
- **Sentence-case headings.** "How to read a Smith chart", not "How To Read A Smith Chart".
- **Figures as digits, with units.** `50 Ω`, `1.2B`, `48 hours` — not "fifty ohm", "one point two billion".
- **Define each acronym on first use.** "phase-locked loop (PLL)", then `PLL` thereafter.
- **Pace with components.** 3–5 `<Callout>`s and 3–5 numbered `<Equation>`s per ~2000-word post. Fewer reads as a wall of text; more reads as Twitter.

**Banned phrases / AI tells** — do not use:

- "it's worth noting", "in today's fast-paced world", "delve", "leverage" (as a verb), "in conclusion"
- Stacked transitions: "moreover", "furthermore", "additionally" piling up between paragraphs
- Clickbait superlatives ("the ultimate guide", "game-changing", "revolutionary")

## Build, preview, deploy

- **Author/preview:** `npm run dev` → `/blog/<slug>/`. (If CSS looks stale, kill stray `next dev`, `rm -rf .next`, restart.)
- **Build:** `npm run build` (static export to `out/`; `postbuild` runs `og-rewrite.mjs`). Spot-check `out/blog/<slug>/index.html` and that images resolved.
- **Preview production build:** after `npm run build`, serve with `python3 -m http.server 3128 --directory out` and visit `http://localhost:3128`. The dev server doesn't run the prebuild/postbuild scripts, so the static export is the ground truth.
- **Deploy:** staging `SKIP_ARCHIVE=1 npm run deploy:next` → `next.benebsworth.com`; prod `npm run deploy:prod`.

## Diagram accuracy — verifying interactive components

**The golden rule: a diagram that renders is not the same as a diagram that is correct.** Every interactive component needs verification that its visual output matches the data or math it claims to represent. This is the most common class of bug in bespoke MDX components (and the hardest to spot by eye).

### Pattern: cursor / marker doesn't ride the trace

When a component draws a static dataset (waveform, spectrum, trajectory) AND a moving cursor/dot that is supposed to "ride" that trace over time, verify the cursor and the trace use the **same formula**. The Fourier series lab had this bug: the epicycle tip traced `Σ amp·sin(k·time + φ)` while the waveform used `Σ amp·cos(k·θ + φ)`, and the cursor derived its Y from the mirrored epicycle tip rather than the Fourier sum directly.

Fix: the cursor's (x, y) should be computed by the **same function** that draws the trace, evaluated at the cursor's angle/time, not by deriving a value from a different visual system.

```typescript
// ❌ Wrong: cursor Y derived from epicycle tip (different formula branch)
const traceVal = (cy - centerY) / scale  // uses sin, not cos
ctx.arc(traceX, centerY - traceVal * scale, 3, 0, 2*Math.PI)  // mismatched

// ✅ Right: compute the SAME sum as the waveform trace
let sum = 0
for (const c of coefs) sum += c.amp * Math.cos(c.freq * angle + c.phase)
const cursorY = centerY - sum * scale
ctx.arc(traceX, cursorY, 3, 0, 2*Math.PI)  // matches the trace exactly
```

### Pattern: color legend / swatches don't match the diagrams

When a post has a colour legend block AND interactive diagrams that follow the same colour convention, verify legend and diagrams stay in sync:

- The legend should use the SAME constants as the diagram renderer (import shared `NODE_COLOURS`, not hardcoded hex strings)
- Every entry in the legend must match a role/category that actually appears in the diagrams
- If the legend has visual encoding beyond colour (shape, fill, self-loop arc), the diagram renderer must apply that same encoding via a shared `nodeStyleFor()` or equivalent
- Verify via Playwright: count unique roles in the diagram's DOM, verify each one has a corresponding legend entry with the correct colour

### Pattern: ring buffer trails

When a component stores positions in a ring buffer and draws a trail, verify:
- The stored coordinate (e.g. `trailX[i] = tx, trailY[i] = ty`) is the SAME value used elsewhere in the frame (e.g. the tip position of a pendulum arm, the particle position)
- The trail-drawing loop reads from the ring buffer in the correct order (oldest → newest, from `head` forward)
- If the trail is cleared on param change, verify it clears immediately (not leaving ghost segments from the old params)

### Pattern: mathematical correctness

For components that implement formulas (Fourier coefficients, ODE integrators, spectrum analyzers):
- Verify with **known test cases**: e.g. a square wave's first 3 Fourier terms have known amplitudes (4/π, 0, 4/(3π))
- For ODEs (phase portraits, pendulums), verify energy conservation or known periodic orbits
- For frequency-domain displays, verify a single sine tone maps to exactly one bin with correct magnitude

### Pattern: visual elements escaping their bounding box

When a plot/display maps data values to pixel coordinates, CRITICAL: the mapping must keep every value within the allocated rectangle. Two common failures:

**Overshoot clipping**: physical systems (RLC circuits, pendulums, ODEs) can produce values well outside the expected range. An underdamped RLC with ζ = 0.1 overshoots to 1.7× the step amplitude, but if vMax = 1.2×A, the trace draws ABOVE the plot area — overlapping the circuit schematic above.

Fix: clamp the output of the coordinate mapping function:
```typescript
// ❌ Wrong: unclamped fraction can return pixel coords outside the plot
const vScale = (v) => py + ph - ((v - vMin) / (vMax - vMin)) * ph

// ✅ Right: clamped to [0,1] so the output is always inside [py, py+ph]
const vScale = (v) => {
  const frac = Math.max(0, Math.min(1, (v - vMin) / (vMax - vMin)))
  return py + ph - frac * ph
}
```

Also: choose generous bounds (vMax = 2× typical peak) and detect the actual range at runtime. If the data consistently stays within tighter bounds, tighten the axis labels to match.

**Layout overlap**: when a canvas renders multiple sections (circuit + plot, left panel + right panel), verify none bleed into each other. For canvas renderers, the layout is entirely manual — no CSS flow, no overflow protection. The only guard is the drawing code. Verify by computing the `y` extremes of every drawn element and comparing against the section's allocated rect. On the RLC lab, the circuit schematic and the waveform plot overlapped because the plot's top margin was inside the circuit's bottom edge.

Fix: give sections generous boundaries and use a fixed-height allocation (e.g. `Math.min(h * 0.20, 90)` for a compact header) so the plot always gets clear space. Draw a subtle divider line between sections so any overlap is visually obvious.

### Pattern: simulation doesn't reset on parameter change

When a component runs a physical simulation whose state evolves over time (RLC transient, pendulum, ODE trajectory), changing a parameter should restart the simulation. The old state (Vc, iL, t, ring buffer) is from a DIFFERENT physical system — keeping it invalidates the result.

Fix: hash the relevant parameters into a key string. On each frame, compare against the last-seen key. On mismatch, reinitialize ALL state variables (positions, velocities, buffer indices, time):
```typescript
const paramKey = `${R.toFixed(2)}_${L.toFixed(2)}_${C.toFixed(2)}`
if (paramKey !== lastKey) {
  Vc = 0; iL = 0; t = 0; stepIdx = 0
  lastKey = paramKey
}
```

### Pattern: transient simulation gets "stuck" at steady state

Systems with damping (RLC, pendulums, PID controllers) settle to a steady-state value. After the transient decays, the display shows a flat line — making it look like the animation is frozen.

Fix: detect settlement (e.g. envelope < threshold) and **auto-retrigger** the simulation after a pause:
```typescript
const decayEnv = A * Math.exp(-zeta * omega0 * t)
if (t > 0 && decayEnv < A * 0.01 && !settled) {
  settled = true
  autoRetriggerTime = timeMs + 2000  // restart after 2s
}
if (settled && timeMs > autoRetriggerTime) {
  // reset the simulation
}
```
This keeps the visualization alive — the user always sees the transient behaviour, never a flat line.

### Pattern: scroll/TOC jank on dense pages

Long posts with many interactive components (6+ NeuralGraphs, 5+ Callouts, mini-map, TOC) frequently drop frames during scroll/TOC clicks. The browser's `requestAnimationFrame` budget is the bottleneck.

Fix: layer multiple auto-pause conditions, each one self-clearing:
```typescript
const running = !paused
const scrolling = useScrollActivity(300)   // true while user scrolls, false 300ms after
const inView = useInViewport('100px')      // true when in/near viewport
const dragging = false                     // set by slider onPointerDown

useEffect(() => {
  if (!running || scrolling || !inView || dragging) return
  // ...rAF loop
}, [running, scrolling, inView, dragging])
```

**Dynamic backdrop-blur on sticky elements** — the biggest single win for scroll perf. GPU-blur is expensive on every scroll frame:
```tsx
<header className={cn(
  'sticky top-0 z-50 border-b',
  scrolling ? 'bg-[var(--color-bg)]' : 'bg-[var(--color-bg)]/75 backdrop-blur-md backdrop-saturate-150'
)}>
```

**Instant scroll on TOC click** — `el.scrollIntoView({ block: 'start' })` (default `behavior: 'auto'`) instead of `behavior: 'smooth'`. The smooth scroll fires 50+ scroll events per click; instant is one. Set `scroll-mt-32` on headings so the landing accounts for sticky header + breadcrumb (~128px).

**IntersectionObserver in TOC** — replace per-frame `getBoundingClientRect` polling with an observer that fires only on threshold crossings. Set the trigger rootMargin to account for the sticky header (`-100px 0px 0px 0px`).

**content-visibility: auto on off-screen figures** — skip layout/paint for figures that aren't in the viewport:
```tsx
<figure style={!id ? { contentVisibility: 'auto', containIntrinsicSize: '0 600px' } : undefined}>
```

**Measured impact** of all four: p95 frame time during TOC click went from 309.60ms to 10.20ms (30× faster), dropped frames from 27% to 2%.

### Pattern: `mdx-components.tsx` gets broken by overlapping patches

When multiple agents/subagents edit `components/mdx/mdx-components.tsx` concurrently, patches can leave the file in a syntactically broken state (nested imports, indent corruption). The file is small — if anything goes wrong, just `git checkout -- components/mdx/mdx-components.tsx` and re-add the registrations you need.

Fix: after every round of patches, verify the file compiles (`npm run build`). If a component "doesn't exist" error appears, read the file to confirm the import + registration. If corrupted, `git checkout` and re-apply.

## Validation / sanity checklist

After building a post with interactive components, run this checklist before deploying. Do NOT rely on visual inspection alone — use Playwright for DOM-level verification.

### 1. Build and serve
```bash
npm run build
python3 -m http.server 3128 --directory out &
# Visit http://localhost:3128 in preview
```

### 2. Component presence and count
- Count expected components in the rendered HTML: `grep -c 'your-component-name' out/blog/<slug>/index.html`
- Verify every registered component actually renders: check that each `<YourComponent />` in the MDX produces visible DOM in the page
- For diagram components (NeuralGraphs, etc.): verify the correct number of figures, correct number of SVG nodes per figure

### 3. Data / labeling accuracy
- Input labels, defaults, tooltips, legend encoding are architecture-specific (e.g. RNN figure shows `t-1, t, t+1` not generic `x0, x1, x2`)
- `<Equation>` IDs are unique and follow the `eqn:` prefix convention
- Math is **rendered**, not displayed as raw LaTeX: count `.katex` elements in the served HTML; if it matches the expected number of `$...$` + `$$...$$` blocks, math is rendering
- Verify default inputs are architecture-appropriate (step-like for RNN, asymmetric for GAN, etc.)
- Verify tooltips show correct role labels (matching the legend vocabulary), correct activation values, correct layer/row info
- For the Zoo post specifically: verify all 15 Asimov cell types appear in the colour legend, with correct SVG shape (circle/triangle/square), fill (solid/hollow), and self-loop arc

### 4. Interactive behaviour
- **Hover**: tooltips appear within 100ms, show correct data, dismiss on mouseleave
- **Click**: legend swatches highlight/dim the correct roles; "Show all" clears the highlight
- **Sliders**: dragging changes the displayed value; the rAF pauses during drag (performance win)
- **Speed control**: default speed is correct (0.25× for NeuralGraphs), buttons change speed and the UI reflects the active one
- **TOC / navigation**: clicking a TOC item scrolls to the correct heading; sticky nav and breadcrumb stay pinned during scroll

### 5. Performance sanity
- **TOC click**: scroll is instant or smooth without visible jank. Measure with Playwright + PerformanceObserver — p95 frame time should be under 16.67ms (60fps)
- **Scroll performance**: rAF rate drops during scroll (graphs auto-pause). Verify with `requestAnimationFrame` monkey-patch:
  - Baseline idle: ~200-300 rAF/sec
  - During scroll: significantly lower (graphs paused)
  - After scroll settles: back to baseline within 300ms
- **Out-of-viewport graphs**: graphs that are scrolled out of view should produce zero rAF calls (IntersectionObserver-based pause)
- **Heavy page elements**: `backdrop-blur` on sticky elements should drop to solid background during scroll to avoid GPU blur pass on every frame

### 6. Cross-theme verification
- Test in **both light and dark mode** — the site supports both
- Verify Callout blocks are readable in both themes (mid-luminance accent colours, title text has `dark:` variants)
- Verify sticky elements (nav, breadcrumb) are visible in both themes
- Verify diagram colours are distinct in both themes (the Asimov palette uses mid-luminance Tailwind-600 colours for this reason)

### 7. LLM-readable .md sibling
After any content change, regenerate the .md sibling:
```bash
npm run md:siblings   # or: node scripts/gen-md-siblings.mjs
```
Verify the .md includes `<blockquote>` replacements for all custom components so LLM crawlers get a text description of them. For math content, verify the raw LaTeX `$$...$$` is preserved (the script leaves math in place, only the editorial frame is replaced).

### 8. Regression check
- Re-run any existing Playwright verification scripts from `/tmp/` — they should still pass
- Verify other blog posts still build and render (not just the one you changed)
- If you added a new component to `mdx-components.tsx`, verify it doesn't break lab pages (check `LabCanvas` and `LabSide` are still registered)

### 9. Lab effects (when editing `components/lab/effects/`)
When modifying a Canvas2D effect, the same rules apply plus:

- **Sectional layout**: if the canvas has multiple sections (circuit + plot, controls + visualization), use a **fixed-height allocation** for the header section (`Math.min(h * 0.20, 90)`) so the visualization always gets clear space. Draw a subtle divider line so any overlap is visible.
- **Y-axis bounded**: any `vScale`/`iScale` that maps data values to pixels MUST clamp the result to the allocated plot rectangle:
  ```typescript
  const vScale = (v) => {
    const frac = Math.max(0, Math.min(1, (v - vMin) / (vMax - vMin)))
    return py + ph - frac * ph
  }
  ```
  Choose generous bounds (`vMax = 2×` typical peak) — physical systems overshoot well past the steady-state value.
- **Auto-retrigger transients**: simulations that decay (RLC, pendulums, PID) should detect settlement and auto-restart the step response after a 2s pause, so the user always sees the transient behaviour.
- **Reset on param change**: hash the relevant parameters and reinitialize all state (positions, velocities, buffer indices, time) when they change — otherwise the displayed state is from a different physical system.
- **Header line numbers**: when reading a Canvas2D file with `read_file`, use `offset`/`limit` to skip the long display code and focus on the simulation state and the layout section.

Verify with:
```bash
# Pixel check: the canvas should not have waveform-trace pixels in the
# circuit schematic area. Sample y=100 (circuit area) and y=300 (plot area):
python3 -c "import asyncio; ..."   # write to /tmp/verify_<lab>.py
```

### 10. Deployment
```bash
SKIP_ARCHIVE=1 npm run deploy:next   # staging → next.benebsworth.com
# Verify staging
npm run deploy:prod                   # production
```

## Adjacent content

- **Projects** — `content/projects/<slug>.mdx` (flat files). Frontmatter: `slug`, `title` (req), `description`, `image`, `link {url,outbound}`, `technologies [{text,color}]`, `order`. Project MDX has **no** image base-path rewrite — reference images by absolute `public/` path (e.g. `/projects/x.png`).
- **Lab explainers** — `content/lab/<slug>.mdx`, one per registered effect in `lib/lab/registry.ts`; rendered below the experiment.
