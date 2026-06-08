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
---
```

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
- **Images**: ` ![alt](./diagram.png) `. The `remarkImageBasePath` plugin rewrites `./x.png`, `x.png`, and `/x.png` → `/blog/<slug>/x.png`. Absolute `http(s)://`/`//`/`data:` URLs are left alone. (Remember: the file must be in `public/blog/<slug>/`.)
- **Restyled elements**: `h2 h3 p a ul code` are themed in `mdx-components.tsx`. Everything else falls back to Tailwind `prose`.

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

## Build, preview, deploy

- **Author/preview:** `npm run dev` → `/blog/<slug>/`. (If CSS looks stale, kill stray `next dev`, `rm -rf .next`, restart.)
- **Build:** `npm run build` (static export to `out/`; `postbuild` runs `og-rewrite.mjs`). Spot-check `out/blog/<slug>/index.html` and that images resolved.
- **Deploy:** staging `SKIP_ARCHIVE=1 npm run deploy:next` → `next.benebsworth.com`; prod `npm run deploy:prod`.

## Adjacent content

- **Projects** — `content/projects/<slug>.mdx` (flat files). Frontmatter: `slug`, `title` (req), `description`, `image`, `link {url,outbound}`, `technologies [{text,color}]`, `order`. Project MDX has **no** image base-path rewrite — reference images by absolute `public/` path (e.g. `/projects/x.png`).
- **Lab explainers** — `content/lab/<slug>.mdx`, one per registered effect in `lib/lab/registry.ts`; rendered below the experiment.
