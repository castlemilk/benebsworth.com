# Personal Site Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Gatsby site with a fully-static Next.js site featuring an animated responsive grid landing, projects/blog/about sections built from migrated content, the old Gatsby preserved at `/archive`, all deployed to S3+CloudFront via Terraform.

**Architecture:** Next.js App Router with `output: 'export'` (static). Landing is custom SVG + Web Animations API driven by a pure monotone-path packing solver. Content is MDX validated against Protobuf-generated TS types. Infra is a reusable Terraform module instantiated for staging (`next.benebsworth.com`) and prod (`benebsworth.com`).

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript, Tailwind CSS, shadcn/ui, MDX (`next-mdx-remote/rsc`, `rehype-pretty-code`), Protobuf (`buf` + `ts-proto`), Vitest, Playwright, Terraform (AWS + DNSimple).

**Working branch:** `redesign` (already created).

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `legacy/` | Old Gatsby site (moved), rebuilt with `pathPrefix=/archive` |
| `package.json`, `next.config.mjs`, `tsconfig.json` | New app config, static export |
| `tailwind.config.ts`, `app/globals.css` | Theme tokens (dark/mono/neon) |
| `app/layout.tsx`, `app/page.tsx` | Root layout + landing |
| `components/landing/packer.ts` | Pure →/↓ packing solver (seeded) |
| `components/landing/rng.ts` | Seedable RNG |
| `components/landing/grid-nav.tsx` | SVG grid renderer + animation + responsive |
| `components/landing/artifacts.ts` | Artifact pool |
| `components/landing/artifact-tiles.tsx` | Tile renderers |
| `proto/content.proto`, `buf.yaml`, `buf.gen.yaml` | Data models |
| `lib/gen/content.ts` | Generated TS types |
| `lib/content.ts` | MDX/frontmatter loader + validation |
| `content/blog/**`, `content/projects/**`, `content/about.ts` | Migrated content |
| `app/projects/**`, `app/blog/**`, `app/about/page.tsx` | Section pages |
| `app/sitemap.ts`, `app/robots.ts`, `app/feed.xml/route.ts` | SEO/RSS |
| `infra/modules/site/**` | Reusable S3+CloudFront+ACM+DNS module |
| `infra/envs/{staging,prod}/**` | Environment stacks |
| `infra/cloudfront-rewrite.js` | Clean-URL CloudFront Function |
| `scripts/deploy.sh`, `scripts/build-archive.sh` | Build + deploy |

---

## Phase 0 — Repo Preparation

### Task 0.1: Tag and move the old Gatsby site into `legacy/`

**Files:** moves existing root files into `legacy/`.

- [ ] **Step 1: Tag the current state**

```bash
git tag legacy-gatsby
```

- [ ] **Step 2: Move everything except new/meta files into `legacy/`**

```bash
mkdir -p legacy
for item in cli cloudfunctions content plugins src static gatsby-browser.js gatsby-config.js gatsby-node.js package.json package-lock.json yarn.lock blog.sketch LICENSE README.md Makefile .prettierrc; do
  [ -e "$item" ] && git mv "$item" legacy/ 2>/dev/null || true
done
git status
```

Expected: the listed items now under `legacy/`; `docs/`, `.gitignore`, `.git/`, `.github/` remain at root.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: move Gatsby site into legacy/ for archive"
```

---

## Phase 1 — Scaffold the Next.js App

### Task 1.1: Initialize Next.js project files at root

**Files:** Create `package.json`, `next.config.mjs`, `tsconfig.json`, `next-env.d.ts`, `.nvmrc`.

- [ ] **Step 1: Create `.nvmrc`**

```
20
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "benebsworth-com",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "proto:gen": "buf generate",
    "build:archive": "bash scripts/build-archive.sh",
    "deploy:next": "bash scripts/deploy.sh staging",
    "deploy:prod": "bash scripts/deploy.sh prod"
  }
}
```

- [ ] **Step 3: Create `next.config.mjs`**

```js
import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  images: { unoptimized: true },
  reactStrictMode: true,
}

const withMDX = createMDX({})
export default withMDX(nextConfig)
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "legacy", "out", ".next"]
}
```

- [ ] **Step 5: Install dependencies**

```bash
npm install next@latest react@latest react-dom@latest
npm install -D typescript @types/react @types/node @types/react-dom
npm install @next/mdx @mdx-js/loader @mdx-js/react gray-matter next-mdx-remote
npm install remark-gfm rehype-pretty-code rehype-slug rehype-autolink-headings shiki
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @playwright/test
```

- [ ] **Step 6: Verify install**

Run: `npx tsc --noEmit`
Expected: passes (no source files yet beyond config) or only "no inputs" — acceptable.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js app config"
```

### Task 1.2: Tailwind + theme tokens + base layout

**Files:** Create `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx` (placeholder).

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss postcss autoprefixer
```

- [ ] **Step 2: Create `postcss.config.mjs`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

- [ ] **Step 3: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}', './content/**/*.{mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0c',
        fg: '#ececf0',
        muted: '#5a5a64',
        blog: '#00e0b8',
        project: '#7c5cff',
        about: '#ff7a59',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { --bg: #0a0a0c; --fg: #ececf0; }
html { color-scheme: dark; }
body {
  background: radial-gradient(120% 120% at 50% 0%, #131318 0%, var(--bg) 60%);
  color: var(--fg);
  min-height: 100vh;
}
*:focus-visible { outline: 2px solid #7c5cff; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 5: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { JetBrains_Mono, Inter } from 'next/font/google'
import './globals.css'

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  metadataBase: new URL('https://benebsworth.com'),
  title: { default: 'Ben Ebsworth', template: '%s · Ben Ebsworth' },
  description: 'A playground for development and writing material.',
  openGraph: { type: 'website', siteName: 'Ben Ebsworth' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body className="font-mono antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: Create placeholder `app/page.tsx`**

```tsx
export default function Home() {
  return <main className="flex min-h-screen items-center justify-center">landing</main>
}
```

- [ ] **Step 7: Verify dev build**

Run: `npm run build`
Expected: build succeeds; `out/index.html` produced.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: tailwind theme + base layout"
```

### Task 1.3: Initialize shadcn/ui

**Files:** Creates `components.json`, `lib/utils.ts`, `components/ui/*`.

- [ ] **Step 1: Init shadcn**

```bash
npx shadcn@latest init -d
```

When prompted (if `-d` defaults don't fully apply): base color neutral, CSS variables yes, components dir `components`, utils `lib/utils`.

- [ ] **Step 2: Add the components used by sections**

```bash
npx shadcn@latest add card badge button separator
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build still succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: init shadcn/ui + base components"
```

### Task 1.4: Protobuf data models + codegen

**Files:** Create `proto/content.proto`, `buf.yaml`, `buf.gen.yaml`; generate `lib/gen/content.ts`.

- [ ] **Step 1: Install codegen tooling**

```bash
npm install -D @bufbuild/buf ts-proto
```

- [ ] **Step 2: Create `proto/content.proto`**

```protobuf
syntax = "proto3";
package content;

message Technology { string text = 1; string color = 2; }
message Link { string url = 1; bool outbound = 2; }

message Project {
  string slug = 1;
  string title = 2;
  string description = 3;
  string image = 4;
  Link link = 5;
  repeated Technology technologies = 6;
  int32 order = 7;
}

message BlogPost {
  string slug = 1;
  string title = 2;
  string date = 3;
  string description = 4;
  repeated string tags = 5;
  string hero_image = 6;
  bool draft = 7;
}

message TimelineEntry { string when = 1; string title = 2; string detail = 3; }
message SpeakingEvent { string title = 1; string description = 2; string url = 3; string date = 4; }
message Certification { string title = 1; string issuer = 2; string url = 3; }

message About {
  string bio = 1;
  repeated TimelineEntry timeline = 2;
  repeated SpeakingEvent speaking = 3;
  repeated Certification certifications = 4;
  repeated string skills = 5;
}

enum ArtifactKind {
  ARTIFACT_KIND_UNSPECIFIED = 0;
  IMAGE = 1; TEXT = 2; ANIM = 3; AVATAR = 4; GLYPH = 5;
}
message Artifact {
  string id = 1;
  string label = 2;
  string link = 3;
  ArtifactKind kind = 4;
  string image = 5;
  repeated string lines = 6;
  string glyph = 7;
}
```

- [ ] **Step 3: Create `buf.yaml`**

```yaml
version: v2
modules:
  - path: proto
```

- [ ] **Step 4: Create `buf.gen.yaml`**

```yaml
version: v2
plugins:
  - local: ./node_modules/.bin/protoc-gen-ts_proto
    out: lib/gen
    opt:
      - esModuleInterop=true
      - outputServices=false
      - outputJsonMethods=false
      - outputEncodeMethods=false
      - stringEnums=true
      - snakeToCamel=true
```

- [ ] **Step 5: Generate and verify**

Run: `npm run proto:gen && npx tsc --noEmit`
Expected: `lib/gen/content.ts` created with `Project`, `BlogPost`, `About`, `Artifact` interfaces; typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: protobuf content models + generated TS types"
```

---

## Phase 2 — Landing Engine

### Task 2.1: Seedable RNG (TDD)

**Files:** Create `components/landing/rng.ts`, `components/landing/rng.test.ts`; create `vitest.config.ts`.

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
})
```

- [ ] **Step 2: Write the failing test `components/landing/rng.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mulberry32 } from './rng'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('returns floats in [0,1)', () => {
    const r = mulberry32(1)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)())
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- rng`
Expected: FAIL (`mulberry32` not exported).

- [ ] **Step 4: Implement `components/landing/rng.ts`**

```ts
/** Small deterministic PRNG. Returns a function yielding floats in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates shuffle using a provided rng. Returns a new array. */
export function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- rng`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: seedable rng for landing"
```

### Task 2.2: Monotone packing solver (TDD)

**Files:** Create `components/landing/packer.ts`, `components/landing/packer.test.ts`.

- [ ] **Step 1: Write the failing test `components/landing/packer.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { pack, type Placement } from './packer'

const WORDS = [
  { key: 'blog', text: 'BLOG' },
  { key: 'project', text: 'PROJECT' },
  { key: 'about', text: 'ABOUT' },
]

function isMonotone(cells: [number, number][]) {
  for (let i = 1; i < cells.length; i++) {
    const [pc, pr] = cells[i - 1]
    const [c, r] = cells[i]
    const right = c === pc + 1 && r === pr
    const down = r === pr + 1 && c === pc
    if (!right && !down) return false
  }
  return true
}

function allCells(p: Placement) {
  return Object.values(p).flat()
}

describe('pack', () => {
  for (const [cols, rows] of [[5, 4], [4, 5]] as const) {
    it(`packs ${cols}x${rows} with monotone, disjoint, in-bounds paths`, () => {
      const p = pack(cols, rows, WORDS, 123)
      expect(p).not.toBeNull()
      const placement = p!
      // length matches each word
      for (const w of WORDS) expect(placement[w.key].length).toBe(w.text.length)
      // monotone
      for (const w of WORDS) expect(isMonotone(placement[w.key])).toBe(true)
      // in bounds
      for (const [c, r] of allCells(placement)) {
        expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(cols)
        expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThan(rows)
      }
      // disjoint
      const seen = new Set(allCells(placement).map(([c, r]) => `${c},${r}`))
      expect(seen.size).toBe(16)
    })
  }

  it('is deterministic for a given seed', () => {
    expect(pack(5, 4, WORDS, 7)).toEqual(pack(5, 4, WORDS, 7))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- packer`
Expected: FAIL (`pack` not defined).

- [ ] **Step 3: Implement `components/landing/packer.ts`**

```ts
import { shuffle } from './rng'
import { mulberry32 } from './rng'

export type Cell = [number, number]
export type Word = { key: string; text: string }
export type Placement = Record<string, Cell[]>

const key = (c: number, r: number) => `${c},${r}`

/**
 * Pack words into a cols×rows grid. Each word occupies a contiguous monotone
 * path (each step right or down only). Words are disjoint; gaps allowed.
 * Largest word is placed first to improve packing success. Returns null if no
 * packing is found. Deterministic for a given seed.
 */
export function pack(cols: number, rows: number, words: Word[], seed: number): Placement | null {
  const rng = mulberry32(seed)
  const order = [...words].sort((a, b) => b.text.length - a.text.length)
  const occ = new Set<string>()
  const place: Placement = {}

  function put(wi: number): boolean {
    if (wi === order.length) return true
    const len = order[wi].text.length
    const starts: Cell[] = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) if (!occ.has(key(c, r))) starts.push([c, r])

    for (const st of shuffle(starts, rng)) {
      const path: Cell[] = []
      const ext = (c: number, r: number): boolean => {
        path.push([c, r]); occ.add(key(c, r))
        if (path.length === len) {
          if (put(wi + 1)) { place[order[wi].key] = path.slice(); return true }
        } else {
          for (const [dc, dr] of shuffle([[1, 0], [0, 1]] as Cell[], rng)) {
            const nc = c + dc, nr = r + dr
            if (nc < cols && nr < rows && !occ.has(key(nc, nr)) && ext(nc, nr)) return true
          }
        }
        path.pop(); occ.delete(key(c, r)); return false
      }
      if (ext(st[0], st[1])) return true
    }
    return false
  }

  return put(0) ? place : null
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- packer`
Expected: PASS (both orientations + determinism).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: monotone packing solver with tests"
```

### Task 2.3: Artifact pool

**Files:** Create `components/landing/artifacts.ts`.

- [ ] **Step 1: Create `components/landing/artifacts.ts`**

```ts
import type { Artifact } from '@/lib/gen/content'
import { ArtifactKind } from '@/lib/gen/content'

/**
 * Pool of artifact tiles for landing gaps. More than the gap count so the
 * selection reshuffles each load. `latest post` is patched at runtime with the
 * newest blog slug/title (see grid-nav).
 */
export const ARTIFACTS: Artifact[] = [
  { id: 'nutry', label: 'Nutry →', link: '/projects/nutry/', kind: ArtifactKind.IMAGE, image: '/artifacts/nutry.png', lines: [], glyph: '' },
  { id: 'latest', label: 'latest post →', link: '/blog/', kind: ArtifactKind.TEXT, image: '', lines: ['↳ NEW', 'latest', 'post'], glyph: '' },
  { id: 'doodle', label: 'generative →', link: '/lab/', kind: ArtifactKind.ANIM, image: '', lines: [], glyph: '' },
  { id: 'me', label: 'about me →', link: '/about/', kind: ArtifactKind.AVATAR, image: '', lines: [], glyph: '' },
  { id: 'gh', label: 'github →', link: 'https://github.com/castlemilk', kind: ArtifactKind.GLYPH, image: '', lines: [], glyph: '{ }' },
  { id: 'archive', label: 'the old site →', link: '/archive/', kind: ArtifactKind.GLYPH, image: '', lines: [], glyph: '⌘' },
]
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: landing artifact pool"
```

### Task 2.4: Artifact tile renderer

**Files:** Create `components/landing/artifact-tiles.tsx`.

- [ ] **Step 1: Create `components/landing/artifact-tiles.tsx`**

```tsx
'use client'
import type { Artifact } from '@/lib/gen/content'
import { ArtifactKind } from '@/lib/gen/content'

type Props = { artifact: Artifact; cx: number; cy: number; cell: number }

export function ArtifactTile({ artifact: a, cx, cy, cell }: Props) {
  const s = cell * 0.84
  const x = cx - s / 2, y = cy - s / 2, rad = s * 0.16
  const cols = ['#00e0b8', '#7c5cff', '#ff7a59']
  return (
    <g className="group cursor-pointer">
      <rect x={x} y={y} width={s} height={s} rx={rad}
        className="fill-[#14141b] stroke-[#2a2a34] [stroke-width:1.5] transition group-hover:stroke-[#5a5a66]" />
      {a.kind === ArtifactKind.IMAGE && a.image && (
        <>
          <clipPath id={`clip-${a.id}-${Math.round(cx)}-${Math.round(cy)}`}>
            <rect x={x} y={y} width={s} height={s} rx={rad} />
          </clipPath>
          <image href={a.image} x={x} y={y} width={s} height={s}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#clip-${a.id}-${Math.round(cx)}-${Math.round(cy)})`} />
        </>
      )}
      {a.kind === ArtifactKind.TEXT && a.lines.map((ln, i) => (
        <text key={i} x={cx} y={y + s * 0.32 + i * (s * 0.22)} textAnchor="middle"
          fill={i === 0 ? '#00e0b8' : '#b9b9c4'} fontSize={Math.round(s * (i === 0 ? 0.13 : 0.16))}
          fontWeight={i === 0 ? 700 : 500}>{ln}</text>
      ))}
      {a.kind === ArtifactKind.GLYPH && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill="#9a9aa6" fontSize={Math.round(s * 0.42)} fontWeight={700}>{a.glyph}</text>
      )}
      {a.kind === ArtifactKind.AVATAR && (
        <>
          <circle cx={cx} cy={cy} r={s * 0.3} fill="none" stroke="#ff7a59" strokeWidth={2}
            className="motion-safe:animate-[pulse_2.6s_ease-in-out_infinite]" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#ff7a59"
            fontSize={Math.round(s * 0.26)} fontWeight={700}>be</text>
        </>
      )}
      {a.kind === ArtifactKind.ANIM && (
        <>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={cx} cy={cy} r={s * 0.06} fill={cols[i]}>
              <animateTransform attributeName="transform" type="rotate"
                from={`${i * 120} ${cx} ${cy}`} to={`${i * 120 + 360} ${cx} ${cy}`}
                dur="3.2s" repeatCount="indefinite" />
              <animate attributeName="cx" values={`${cx};${cx + s * 0.24}`} dur="0s" fill="freeze" />
            </circle>
          ))}
          <circle cx={cx} cy={cy} r={s * 0.05} fill="#fff" opacity={0.8} />
        </>
      )}
      <text x={cx} y={y + s + cell * 0.18} textAnchor="middle" fill="#cfcfd6" fontSize={9}
        className="opacity-0 transition group-hover:opacity-100">{a.label}</text>
    </g>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: artifact tile renderer"
```

### Task 2.5: Grid nav component (responsive + animated)

**Files:** Create `components/landing/grid-nav.tsx`; update `app/page.tsx`.

- [ ] **Step 1: Create `components/landing/grid-nav.tsx`**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { pack, type Placement } from './packer'
import { shuffle, mulberry32 } from './rng'
import { ARTIFACTS } from './artifacts'
import { ArtifactTile } from './artifact-tiles'

const WORDS = [
  { key: 'blog', text: 'BLOG' },
  { key: 'project', text: 'PROJECT' },
  { key: 'about', text: 'ABOUT' },
]
const HREF: Record<string, string> = { blog: '/blog/', project: '/projects/', about: '/about/' }
const COLOR: Record<string, string> = { blog: '#00e0b8', project: '#7c5cff', about: '#ff7a59' }

type Latest = { title: string; href: string } | null

export function GridNav({ latest }: { latest: Latest }) {
  const [dims, setDims] = useState<{ cols: number; rows: number }>({ cols: 5, rows: 4 })
  const [seed, setSeed] = useState(1)
  const [cell, setCell] = useState(84)

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 1e9))
    function fit() {
      const w = window.innerWidth, h = window.innerHeight
      const cols = w < 560 || h > w ? 4 : 5
      const rows = cols === 4 ? 5 : 4
      const availW = Math.min(w * 0.92, 660), availH = Math.min(h * 0.58, 560)
      const PAD_FRAC = 0.5
      const c = Math.max(48, Math.floor(Math.min(availW / (cols + PAD_FRAC * 2), availH / (rows + PAD_FRAC * 2))))
      setDims({ cols, rows }); setCell(c)
    }
    fit()
    let t: number
    const onResize = () => { clearTimeout(t); t = window.setTimeout(fit, 180) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { cols, rows } = dims
  const PAD = cell * 0.5
  const W = cols * cell + PAD * 2, H = rows * cell + PAD * 2
  const cx = (c: number) => PAD + c * cell + cell / 2
  const cy = (r: number) => PAD + r * cell + cell / 2

  let placement: Placement | null = null
  for (let s = seed; !placement && s < seed + 80; s++) placement = pack(cols, rows, WORDS, s)
  if (!placement) return null

  const occ = new Set(Object.values(placement).flat().map(([c, r]) => `${c},${r}`))
  const gaps: [number, number][] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!occ.has(`${c},${r}`)) gaps.push([c, r])

  const rng = mulberry32(seed)
  const picks = shuffle(ARTIFACTS, rng).slice(0, gaps.length).map((a) =>
    a.id === 'latest' && latest
      ? { ...a, link: latest.href, lines: ['↳ NEW', ...latest.title.split(' ').slice(0, 2)] }
      : a,
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="navigation" aria-label="Primary">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => (
            <circle key={`${c}-${r}`} cx={cx(c)} cy={cy(r)} r={Math.max(1.6, cell * 0.024)} fill="#26262d" opacity={0.5} />
          )),
        )}
        {WORDS.map((w) => {
          const path = placement![w.key]
          return (
            <Link key={w.key} href={HREF[w.key]} aria-label={w.key}>
              <g className="word">
                {path.map(([c, r], i) => (
                  <text key={i} x={cx(c)} y={cy(r)} textAnchor="middle" dominantBaseline="central"
                    fill={COLOR[w.key]} fontWeight={700} fontSize={Math.round(cell * 0.46)}
                    className="motion-safe:animate-[fadeglyph_.3s_ease_both]"
                    style={{ animationDelay: `${i * 60}ms` }}>{w.text[i]}</text>
                ))}
              </g>
            </Link>
          )
        })}
        {gaps.map(([c, r], i) => {
          const a = picks[i]; if (!a) return null
          const external = a.link.startsWith('http')
          const inner = <ArtifactTile artifact={a} cx={cx(c)} cy={cy(r)} cell={cell} />
          return external
            ? <a key={i} href={a.link} target="_blank" rel="noreferrer">{inner}</a>
            : <Link key={i} href={a.link}>{inner}</Link>
        })}
      </svg>
      <button onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
        className="text-xs uppercase tracking-wider text-muted hover:text-fg">↻ shuffle</button>
    </main>
  )
}
```

- [ ] **Step 2: Add keyframes to `app/globals.css`**

```css
@keyframes fadeglyph { from { opacity: 0; transform: scale(.12); } to { opacity: 1; transform: scale(1); } }
.word text { transform-box: fill-box; transform-origin: center; }
.word:hover text { filter: drop-shadow(0 0 12px currentColor); }
```

- [ ] **Step 3: Update `app/page.tsx`**

```tsx
import { GridNav } from '@/components/landing/grid-nav'
import { getLatestPost } from '@/lib/content'

export default function Home() {
  const latest = getLatestPost()
  return <GridNav latest={latest ? { title: latest.title, href: `/blog/${latest.slug}/` } : null} />
}
```

> Note: `getLatestPost` is implemented in Task 3.2. Until then, temporarily stub `app/page.tsx` to pass `latest={null}` so the build stays green; replace when content loader lands.

- [ ] **Step 4: Verify build with stub**

Temporarily set `app/page.tsx` to `return <GridNav latest={null} />` (drop the import). Run: `npm run build`
Expected: build succeeds; `out/index.html` contains the SVG nav.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: responsive animated grid nav landing"
```

### Task 2.6: Landing E2E (Playwright)

**Files:** Create `playwright.config.ts`, `e2e/landing.spec.ts`.

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: { command: 'npx serve out -l 4321', port: 4321, reuseExistingServer: true },
  use: { baseURL: 'http://localhost:4321' },
})
```

- [ ] **Step 2: Create `e2e/landing.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('landing shows nav words and routes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Primary')).toBeVisible()
  await page.getByLabel('blog').click()
  await expect(page).toHaveURL(/\/blog\/?$/)
})

test('reduced motion still renders words', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect(page.getByLabel('Primary')).toBeVisible()
})
```

- [ ] **Step 3: Build and run E2E**

Run: `npm install -D serve && npm run build && npm run e2e`
Expected: both tests PASS (blog index page exists after Phase 4; until then this task's nav-click test may 404 — run after Phase 4, mark complete then).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: landing e2e"
```

---

## Phase 3 — Content Pipeline & Migration

### Task 3.1: Content directories + migrate blog posts

**Files:** Create `content/blog/**` (from `legacy/content/blog`), `content/projects/*.mdx`, `content/about.ts`, `public/artifacts/nutry.png`.

- [ ] **Step 1: Copy blog posts and assets**

```bash
mkdir -p content/blog
cp -R legacy/content/blog/* content/blog/
ls content/blog | head
```

Expected: ~28 post folders, each with `index.md`/`index.mdx` + images.

- [ ] **Step 2: Normalize extensions to `.mdx`**

```bash
find content/blog -name 'index.md' -exec bash -c 'mv "$0" "${0%.md}.mdx"' {} \;
find content/blog -name '*.mdx' | wc -l
```

Expected: count equals number of posts.

- [ ] **Step 3: Create project assets dir and copy images**

```bash
mkdir -p public/artifacts public/projects
cp legacy/src/assets/images/nutry.png public/artifacts/nutry.png 2>/dev/null || true
```

- [ ] **Step 4: Create `content/projects/nutry.mdx`**

```mdx
---
slug: nutry
title: Nutry
description: Aggregated nutritional information and common food search & analytics platform
image: /projects/nutry.png
order: 1
technologies:
  - { text: Elasticsearch, color: "#00897b" }
  - { text: React, color: "#61dafb" }
  - { text: AWS, color: "#ff9900" }
  - { text: Redux, color: "#7c5cff" }
  - { text: Firebase, color: "#ff7a59" }
  - { text: Jest, color: "#3b82f6" }
---

Nutry aggregates nutritional information into a single searchable analytics platform.
```

- [ ] **Step 5: Create `content/projects/this-site.mdx`**

```mdx
---
slug: this-site
title: This Site
description: Lightweight personal site with an animated grid landing, built with Next.js
image: /artifacts/nutry.png
order: 2
link: { url: "https://github.com/castlemilk/benebsworth.com", outbound: true }
technologies:
  - { text: Next.js, color: "#7c5cff" }
  - { text: React, color: "#61dafb" }
  - { text: Terraform, color: "#844fba" }
  - { text: AWS, color: "#ff9900" }
---

The site you're on now — see the writeup and source on GitHub.
```

- [ ] **Step 6: Create `content/about.ts` (migrated from legacy AboutPage)**

```ts
import type { About } from '@/lib/gen/content'

export const about: About = {
  bio: "Highly self-driven engineer continually exploring new ideas. This is a space for experiments and writing. I'm glad you've stopped by.",
  timeline: [],
  speaking: [
    { title: 'Kubernetes Meetup', description: 'Practical Istio in enterprise environments — likely the first production Istio deployment in Australia.', url: 'https://www.meetup.com/Melbourne-Kubernetes-Meetup/events/263929562/', date: '' },
    { title: 'Google Cloud Summit', description: 'Service mesh and platform engineering.', url: '', date: '' },
    { title: 'Container Camp', description: 'Kubernetes developer experience.', url: '', date: '' },
    { title: 'CNCF | Kubernetes Forum', description: 'Istio patterns and operations.', url: '', date: '' },
  ],
  certifications: [],
  skills: ['Kubernetes', 'Istio', 'GCP', 'AWS', 'Go', 'Python', 'React', 'Terraform', 'CI/CD', 'SRE'],
}
```

> The implementer should review `legacy/src/components/AboutPage/*` and fill `timeline`/`certifications` with any real entries found there.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "content: migrate blog posts, projects, about data"
```

### Task 3.2: Content loader (TDD)

**Files:** Create `lib/content.ts`, `lib/content.test.ts`.

- [ ] **Step 1: Write failing test `lib/content.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { getAllPosts, getLatestPost, getAllProjects } from './content'

describe('content loader', () => {
  it('loads blog posts with required frontmatter', () => {
    const posts = getAllPosts()
    expect(posts.length).toBeGreaterThan(0)
    for (const p of posts) {
      expect(p.slug).toBeTruthy()
      expect(p.title).toBeTruthy()
      expect(p.date).toBeTruthy()
    }
  })
  it('sorts posts newest-first', () => {
    const posts = getAllPosts()
    for (let i = 1; i < posts.length; i++) {
      expect(new Date(posts[i - 1].date) >= new Date(posts[i].date)).toBe(true)
    }
  })
  it('latest post is the newest non-draft', () => {
    expect(getLatestPost()?.slug).toBe(getAllPosts().filter(p => !p.draft)[0].slug)
  })
  it('loads projects ordered by order field', () => {
    const projs = getAllProjects()
    expect(projs.length).toBeGreaterThan(0)
    for (let i = 1; i < projs.length; i++) expect(projs[i - 1].order <= projs[i].order).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- content`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/content.ts`**

```ts
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { BlogPost, Project } from '@/lib/gen/content'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')
const PROJECT_DIR = path.join(process.cwd(), 'content/projects')

function require_(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`content validation: ${msg}`)
}

export type LoadedPost = BlogPost & { body: string }

export function getAllPosts(): LoadedPost[] {
  const slugs = fs.readdirSync(BLOG_DIR).filter((d) =>
    fs.existsSync(path.join(BLOG_DIR, d, 'index.mdx')))
  const posts = slugs.map((slug) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, slug, 'index.mdx'), 'utf8')
    const { data, content } = matter(raw)
    require_(data.title, `${slug}: missing title`)
    require_(data.date, `${slug}: missing date`)
    return {
      slug,
      title: String(data.title),
      date: String(data.date),
      description: String(data.description ?? ''),
      tags: (data.tags ?? []) as string[],
      heroImage: String(data.heroImage ?? data.hero_image ?? ''),
      draft: Boolean(data.draft ?? false),
      body: content,
    }
  })
  return posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

export function getPost(slug: string): LoadedPost | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}

export function getLatestPost(): LoadedPost | null {
  return getAllPosts().find((p) => !p.draft) ?? null
}

export type LoadedProject = Project & { body: string }

export function getAllProjects(): LoadedProject[] {
  const files = fs.readdirSync(PROJECT_DIR).filter((f) => f.endsWith('.mdx'))
  const projs = files.map((f) => {
    const raw = fs.readFileSync(path.join(PROJECT_DIR, f), 'utf8')
    const { data, content } = matter(raw)
    require_(data.slug, `${f}: missing slug`)
    require_(data.title, `${f}: missing title`)
    return {
      slug: String(data.slug),
      title: String(data.title),
      description: String(data.description ?? ''),
      image: String(data.image ?? ''),
      link: data.link ?? undefined,
      technologies: (data.technologies ?? []) as Project['technologies'],
      order: Number(data.order ?? 99),
      body: content,
    }
  })
  return projs.sort((a, b) => a.order - b.order)
}

export function getProject(slug: string): LoadedProject | undefined {
  return getAllProjects().find((p) => p.slug === slug)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- content`
Expected: PASS.

- [ ] **Step 5: Wire real `getLatestPost` into `app/page.tsx`** (replace the Task 2.5 stub with the version shown in Task 2.5 Step 3). Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: content loader with validation + tests"
```

### Task 3.3: MDX renderer component

**Files:** Create `components/mdx/mdx-content.tsx`, `components/mdx/mdx-components.tsx`.

- [ ] **Step 1: Create `components/mdx/mdx-components.tsx`**

```tsx
import type { MDXComponents } from 'mdx/types'

export const mdxComponents: MDXComponents = {
  h2: (p) => <h2 className="mt-10 text-2xl font-bold text-fg" {...p} />,
  h3: (p) => <h3 className="mt-8 text-xl font-semibold text-fg" {...p} />,
  p: (p) => <p className="mt-4 leading-7 text-fg/90" {...p} />,
  a: (p) => <a className="text-project underline underline-offset-4" {...p} />,
  ul: (p) => <ul className="mt-4 list-disc pl-6" {...p} />,
  code: (p) => <code className="rounded bg-white/5 px-1.5 py-0.5 text-sm" {...p} />,
}
```

- [ ] **Step 2: Create `components/mdx/mdx-content.tsx`**

```tsx
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypePrettyCode from 'rehype-pretty-code'
import { mdxComponents } from './mdx-components'

export function MdxContent({ source }: { source: string }) {
  return (
    <div className="prose-invert max-w-none">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeSlug, [rehypePrettyCode, { theme: 'github-dark' }]],
          },
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: mdx renderer with code highlighting"
```

---

## Phase 4 — Section Pages

### Task 4.1: Shared site chrome (nav + footer)

**Files:** Create `components/site/site-nav.tsx`, `components/site/site-footer.tsx`.

- [ ] **Step 1: Create `components/site/site-nav.tsx`**

```tsx
import Link from 'next/link'

export function SiteNav() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between p-6 text-sm">
      <Link href="/" className="font-bold tracking-wide">ben ebsworth</Link>
      <nav className="flex gap-5 uppercase tracking-wider text-muted">
        <Link href="/projects/" className="hover:text-project">projects</Link>
        <Link href="/blog/" className="hover:text-blog">blog</Link>
        <Link href="/about/" className="hover:text-about">about</Link>
      </nav>
    </header>
  )
}
```

- [ ] **Step 2: Create `components/site/site-footer.tsx`**

```tsx
export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-3xl border-t border-white/10 p-6 text-xs text-muted">
      <div className="flex justify-between">
        <span>© Ben Ebsworth</span>
        <a href="/archive/" className="hover:text-fg">view the old site →</a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: shared nav + footer"
```

### Task 4.2: Projects index + detail

**Files:** Create `app/projects/page.tsx`, `app/projects/[slug]/page.tsx`.

- [ ] **Step 1: Create `app/projects/page.tsx`**

```tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllProjects } from '@/lib/content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Projects' }

export default function ProjectsPage() {
  const projects = getAllProjects()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl p-6">
        <h1 className="mb-8 text-3xl font-bold">Projects</h1>
        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}/`}>
              <Card className="h-full bg-white/[0.03] p-5 transition hover:border-project/60">
                <h2 className="text-xl font-semibold">{p.title}</h2>
                <p className="mt-2 text-sm text-fg/70">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.technologies.map((t) => (
                    <Badge key={t.text} style={{ backgroundColor: t.color }} className="text-black">{t.text}</Badge>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 2: Create `app/projects/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllProjects, getProject } from '@/lib/content'
import { MdxContent } from '@/components/mdx/mdx-content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Badge } from '@/components/ui/badge'

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProject(params.slug)
  return { title: p?.title ?? 'Project', description: p?.description }
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const p = getProject(params.slug)
  if (!p) notFound()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl p-6">
        <h1 className="text-3xl font-bold">{p.title}</h1>
        <p className="mt-2 text-fg/70">{p.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.technologies.map((t) => (
            <Badge key={t.text} style={{ backgroundColor: t.color }} className="text-black">{t.text}</Badge>
          ))}
        </div>
        {p.link?.url && <a className="mt-4 inline-block text-project underline" href={p.link.url}>View source →</a>}
        <article className="mt-8"><MdxContent source={p.body} /></article>
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `out/projects/index.html` + `out/projects/nutry/index.html` produced.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: projects index + detail pages"
```

### Task 4.3: Blog index + post

**Files:** Create `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`.

- [ ] **Step 1: Create `app/blog/page.tsx`**

```tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export const metadata: Metadata = { title: 'Blog' }

export default function BlogPage() {
  const posts = getAllPosts().filter((p) => !p.draft)
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl p-6">
        <h1 className="mb-8 text-3xl font-bold">Blog</h1>
        <ul className="space-y-6">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}/`} className="group block">
                <time className="text-xs uppercase tracking-wider text-muted">{p.date.slice(0, 10)}</time>
                <h2 className="text-xl font-semibold group-hover:text-blog">{p.title}</h2>
                <p className="mt-1 text-sm text-fg/70">{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 2: Create `app/blog/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllPosts, getPost } from '@/lib/content'
import { MdxContent } from '@/components/mdx/mdx-content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getPost(params.slug)
  return { title: p?.title ?? 'Post', description: p?.description }
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const p = getPost(params.slug)
  if (!p) notFound()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl p-6">
        <time className="text-xs uppercase tracking-wider text-muted">{p.date.slice(0, 10)}</time>
        <h1 className="mt-1 text-3xl font-bold">{p.title}</h1>
        <article className="mt-8"><MdxContent source={p.body} /></article>
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `out/blog/index.html` + one folder per post. Fix any MDX that fails to compile (legacy posts may have raw HTML/JSX quirks — escape or adjust frontmatter as errors surface).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: blog index + post pages"
```

### Task 4.4: About page

**Files:** Create `app/about/page.tsx`.

- [ ] **Step 1: Create `app/about/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { about } from '@/content/about'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl space-y-12 p-6">
        <section>
          <h1 className="mb-4 text-3xl font-bold">About</h1>
          <p className="leading-7 text-fg/90">{about.bio}</p>
        </section>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-about">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {about.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          </div>
        </section>
        <section id="speaking">
          <h2 className="mb-4 text-xl font-semibold text-about">Speaking</h2>
          <ul className="space-y-4">
            {about.speaking.map((e, i) => (
              <li key={i}>
                <a href={e.url || '#'} className="font-medium hover:text-about">{e.title}</a>
                <p className="text-sm text-fg/70">{e.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `out/about/index.html` produced.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: about page"
```

### Task 4.5: SEO — sitemap, robots, RSS

**Files:** Create `app/sitemap.ts`, `app/robots.ts`, `app/feed.xml/route.ts`.

- [ ] **Step 1: Create `app/robots.ts`**

```ts
import type { MetadataRoute } from 'next'
export const dynamic = 'force-static'
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://benebsworth.com/sitemap.xml' }
}
```

- [ ] **Step 2: Create `app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next'
import { getAllPosts, getAllProjects } from '@/lib/content'
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://benebsworth.com'
  const staticUrls = ['', '/projects/', '/blog/', '/about/'].map((u) => ({ url: base + u }))
  const posts = getAllPosts().filter((p) => !p.draft).map((p) => ({ url: `${base}/blog/${p.slug}/`, lastModified: p.date }))
  const projects = getAllProjects().map((p) => ({ url: `${base}/projects/${p.slug}/` }))
  return [...staticUrls, ...posts, ...projects]
}
```

- [ ] **Step 3: Create `app/feed.xml/route.ts`**

```ts
import { getAllPosts } from '@/lib/content'
export const dynamic = 'force-static'

export function GET() {
  const base = 'https://benebsworth.com'
  const items = getAllPosts().filter((p) => !p.draft).map((p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${base}/blog/${p.slug}/</link>
      <guid>${base}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
    </item>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Ben Ebsworth</title><link>${base}</link>
  <description>A playground for development and writing material.</description>${items}
</channel></rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `out/sitemap.xml`, `out/robots.txt`, `out/feed.xml` produced.

- [ ] **Step 5: Commit + run landing E2E now that sections exist**

```bash
npm run e2e
git add -A && git commit -m "feat: sitemap, robots, rss feed"
```

Expected: Task 2.6 E2E now passes (blog route exists).

---

## Phase 5 — Archive

### Task 5.1: Build the legacy Gatsby site under /archive

**Files:** Modify `legacy/gatsby-config.js`; create `scripts/build-archive.sh`.

- [ ] **Step 1: Set `pathPrefix` in `legacy/gatsby-config.js`**

Add to the exported config object (top level):

```js
module.exports = {
  pathPrefix: `/archive`,
  // ...existing siteMetadata + plugins unchanged
```

- [ ] **Step 2: Create `scripts/build-archive.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
# Build the legacy Gatsby site with /archive prefix and place it in out/archive.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/legacy"
# Legacy toolchain needs an older Node; pin via nvm if available.
if command -v nvm >/dev/null 2>&1; then nvm use 14 || nvm install 14; fi
npm install --legacy-peer-deps
npx gatsby clean
npx gatsby build --prefix-paths
mkdir -p "$ROOT/out/archive"
cp -R public/* "$ROOT/out/archive/"
echo "archive built into out/archive"
```

- [ ] **Step 3: Make executable and run**

```bash
chmod +x scripts/build-archive.sh
npm run build            # produces out/ for the new site first
npm run build:archive    # adds out/archive
ls out/archive | head
```

Expected: `out/archive/index.html` exists and references `/archive/...` asset paths. If the legacy build fails on the installed Node, document the working Node version in `scripts/build-archive.sh` comments and retry.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: build legacy gatsby into /archive"
```

---

## Phase 6 — Infrastructure & Deploy

### Task 6.1: Reusable Terraform site module

**Files:** Create `infra/cloudfront-rewrite.js`, `infra/modules/site/{main.tf,variables.tf,outputs.tf,versions.tf}`.

- [ ] **Step 1: Create `infra/cloudfront-rewrite.js`**

```js
function handler(event) {
  var req = event.request
  var uri = req.uri
  if (uri.endsWith('/')) { req.uri = uri + 'index.html' }
  else if (!uri.includes('.')) { req.uri = uri + '/index.html' }
  return req
}
```

- [ ] **Step 2: Create `infra/modules/site/versions.tf`**

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws      = { source = "hashicorp/aws", version = "~> 5.0" }
    dnsimple = { source = "dnsimple/dnsimple", version = "~> 1.5" }
  }
}
```

- [ ] **Step 3: Create `infra/modules/site/variables.tf`**

```hcl
variable "domain"        { type = string }                 # e.g. next.benebsworth.com
variable "aliases"       { type = list(string) }           # all CNAMEs on the distribution
variable "bucket_name"   { type = string }
variable "bucket_region" { type = string, default = "ap-southeast-2" }
variable "dnsimple_zone" { type = string, default = "benebsworth.com" }
```

- [ ] **Step 4: Create `infra/modules/site/main.tf`**

```hcl
# Bucket (private)
resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}
resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ACM cert (must be us-east-1 for CloudFront)
resource "aws_acm_certificate" "cert" {
  provider          = aws.us_east_1
  domain_name       = var.domain
  subject_alternative_names = [for a in var.aliases : a if a != var.domain]
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}
resource "dnsimple_zone_record" "cert_validation" {
  for_each = { for o in aws_acm_certificate.cert.domain_validation_options : o.domain_name => o }
  zone_name = var.dnsimple_zone
  name      = trimsuffix(replace(each.value.resource_record_name, ".${var.dnsimple_zone}.", ""), ".")
  type      = each.value.resource_record_type
  value     = trimsuffix(each.value.resource_record_value, ".")
  ttl       = 60
}
resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for r in dnsimple_zone_record.cert_validation : "${r.name}.${var.dnsimple_zone}"]
}

# CloudFront Function for clean URLs
resource "aws_cloudfront_function" "rewrite" {
  name    = "rewrite-${replace(var.domain, ".", "-")}"
  runtime = "cloudfront-js-2.0"
  code    = file("${path.module}/../../cloudfront-rewrite.js")
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "oac-${replace(var.domain, ".", "-")}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = var.aliases

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cert.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# Allow CloudFront (OAC) to read the bucket
data "aws_iam_policy_document" "s3" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]
    principals { type = "Service"; identifiers = ["cloudfront.amazonaws.com"] }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }
}
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.s3.json
}

# DNS alias for each hostname -> CloudFront
resource "dnsimple_zone_record" "alias" {
  for_each  = toset(var.aliases)
  zone_name = var.dnsimple_zone
  name      = trimsuffix(replace(each.value, var.dnsimple_zone, ""), ".")
  type      = "CNAME"
  value     = aws_cloudfront_distribution.cdn.domain_name
  ttl       = 300
}
```

- [ ] **Step 5: Create `infra/modules/site/outputs.tf`**

```hcl
output "bucket"          { value = aws_s3_bucket.site.id }
output "distribution_id" { value = aws_cloudfront_distribution.cdn.id }
output "cloudfront_domain" { value = aws_cloudfront_distribution.cdn.domain_name }
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "infra: reusable s3+cloudfront+acm+dnsimple site module"
```

### Task 6.2: Staging and prod environments

**Files:** Create `infra/envs/staging/{main.tf,providers.tf}`, `infra/envs/prod/{main.tf,providers.tf}`.

- [ ] **Step 1: Create `infra/envs/staging/providers.tf`**

```hcl
provider "aws" { region = "ap-southeast-2", profile = "ben" }
provider "aws" { alias = "us_east_1", region = "us-east-1", profile = "ben" }
provider "dnsimple" { account = var.dnsimple_account, token = var.dnsimple_token }
variable "dnsimple_account" { type = string }
variable "dnsimple_token"   { type = string, sensitive = true }
```

- [ ] **Step 2: Create `infra/envs/staging/main.tf`**

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws      = { source = "hashicorp/aws", version = "~> 5.0" }
    dnsimple = { source = "dnsimple/dnsimple", version = "~> 1.5" }
  }
}
module "site" {
  source      = "../../modules/site"
  domain      = "next.benebsworth.com"
  aliases     = ["next.benebsworth.com"]
  bucket_name = "next.benebsworth.com"
  providers   = { aws = aws, aws.us_east_1 = aws.us_east_1, dnsimple = dnsimple }
}
output "distribution_id" { value = module.site.distribution_id }
output "bucket"          { value = module.site.bucket }
```

- [ ] **Step 3: Create `infra/envs/prod/providers.tf`** (identical to staging providers.tf)

```hcl
provider "aws" { region = "ap-southeast-2", profile = "ben" }
provider "aws" { alias = "us_east_1", region = "us-east-1", profile = "ben" }
provider "dnsimple" { account = var.dnsimple_account, token = var.dnsimple_token }
variable "dnsimple_account" { type = string }
variable "dnsimple_token"   { type = string, sensitive = true }
```

- [ ] **Step 4: Create `infra/envs/prod/main.tf`**

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws      = { source = "hashicorp/aws", version = "~> 5.0" }
    dnsimple = { source = "dnsimple/dnsimple", version = "~> 1.5" }
  }
}
module "site" {
  source      = "../../modules/site"
  domain      = "benebsworth.com"
  aliases     = ["benebsworth.com", "www.benebsworth.com"]
  bucket_name = "benebsworth.com"
  providers   = { aws = aws, aws.us_east_1 = aws.us_east_1, dnsimple = dnsimple }
}
output "distribution_id" { value = module.site.distribution_id }
output "bucket"          { value = module.site.bucket }
```

- [ ] **Step 5: Validate (no apply yet)**

```bash
cd infra/envs/staging && terraform init && terraform validate && cd -
cd infra/envs/prod && terraform init && terraform validate && cd -
```

Expected: both `Success! The configuration is valid.`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "infra: staging + prod environments"
```

> Note: `prod` env currently also creates a CNAME alias for the apex `benebsworth.com`. CNAME at a zone apex is invalid; DNSimple supports `ALIAS` records for apex. If `terraform apply` rejects the apex CNAME, change the apex record's `type` to `ALIAS` in the module (branch on `each.value == var.dnsimple_zone`). Document and adjust during apply.

### Task 6.3: Deploy script

**Files:** Create `scripts/deploy.sh`.

- [ ] **Step 1: Create `scripts/deploy.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: deploy.sh [staging|prod]}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "$ENV" = "prod" ]; then BUCKET="benebsworth.com"; else BUCKET="next.benebsworth.com"; fi
DIST_ID="$(cd "infra/envs/$ENV" && terraform output -raw distribution_id)"

npm run build
npm run build:archive

# HTML: short cache; hashed assets: long immutable cache
aws --profile ben s3 sync out/ "s3://$BUCKET" --delete \
  --exclude '*.html' --cache-control 'public,max-age=31536000,immutable'
aws --profile ben s3 sync out/ "s3://$BUCKET" --delete \
  --exclude '*' --include '*.html' --cache-control 'public,max-age=60'

aws --profile ben cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*'
echo "deployed $ENV -> $BUCKET"
```

- [ ] **Step 2: Make executable + commit**

```bash
chmod +x scripts/deploy.sh
git add -A && git commit -m "feat: deploy script (staging/prod)"
```

### Task 6.4: Apply staging, verify, then prod cutover

**This task runs real infrastructure changes — execute interactively with the user.**

- [ ] **Step 1: Apply staging**

```bash
cd infra/envs/staging
terraform apply   # provide dnsimple_account + dnsimple_token when prompted
cd -
```

Expected: bucket + distribution + cert created; cert validates within a few minutes.

- [ ] **Step 2: Deploy to staging**

```bash
npm run deploy:next
```

Expected: site syncs; invalidation created.

- [ ] **Step 3: Verify staging**

Open `https://next.benebsworth.com/` — landing renders, nav routes work, `/blog/`, `/projects/`, `/about/`, and `/archive/` all load. Run `npm run e2e` against the live URL if desired.

- [ ] **Step 4: Apply prod + deploy + cutover**

```bash
cd infra/envs/prod && terraform apply && cd -   # adjust apex record to ALIAS if needed
npm run deploy:prod
```

Then confirm `https://benebsworth.com/` serves the new site. Old distribution `E30L2WGIX5OPQG` can be retired once DNS has fully propagated.

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "chore: production deploy of new site" || true
```

---

## Self-Review Notes

- **Spec coverage:** landing engine (Phase 2), 3 sections (Phase 4), protobuf models (1.4), MDX content + migration (Phase 3), archive at /archive (Phase 5), Terraform S3/CloudFront + DNSimple + staging/prod (Phase 6), SEO/RSS (4.5), accessibility (reduced-motion in 1.2/2.5, focus styles, real links), tests (rng/packer/content unit + landing E2E). All spec sections map to tasks.
- **Known follow-ups flagged inline:** apex CNAME→ALIAS adjustment (6.2), legacy Node version for archive build (5.1), `getLatestPost` stub→real swap (2.5→3.2), legacy MDX compile fixes (4.3).
- **Type consistency:** `pack()`, `Placement`, `getAllPosts`/`getLatestPost`/`getAllProjects`, `Artifact`/`ArtifactKind`, `MdxContent({source})` used consistently across tasks.
