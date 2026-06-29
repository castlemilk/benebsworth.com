# Trailkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Trailkit" — a family of branded, SSR-first MDX components (TrailSummary, TrailMap, Stages/Checkpoint, Stop, Landmark, Quest, Flora, Fauna, GearList) that turn an MDX blog post into a rich trail guide, plus a `writing-trail-guides` authoring skill and a brandbrain-generated brand kit.

**Architecture:** Components live in `components/mdx/trailkit/`, share one icon + contour-motif vocabulary from `trailkit/primitives.tsx`, are registered in `components/mdx/mdx-components.tsx` and described in `scripts/gen-md-siblings.mjs` (the 3-place sync rule). A trail guide is an ordinary blog post (`content/blog/<slug>/`, `labels: hiking`); components accept explicit props and an optional `hike="slug"` that auto-binds stats/accent/waypoints from `content/hiking.ts`. `TrailMap` reuses the existing `JourneyMap` after its pure helpers are extracted to a shared core and its `active/onSelect` props go optional. Zero protobuf changes.

**Tech Stack:** Next.js (App Router, static export), React 19, Tailwind CSS v4, `next-mdx-remote` v6, TypeScript, Vitest (unit tests for pure logic), Playwright (visual verification), the brandbrain flow-orchestrator MCP (remote).

**Branch:** `trailkit-hiking-mdx` (already created; the design spec is committed there at `docs/superpowers/specs/2026-06-29-trailkit-hiking-mdx-design.md`).

**Conventions (read before starting):**
- Components are `'use client'` only if they use hooks/interaction; otherwise plain server components. All must SSR (no `ssr:false` dynamic import — that path renders nothing in the static export and hurts SEO). The lazy registry `components/mdx/lazy-mdx-components.tsx` is therefore NOT used by Trailkit.
- Every visual block wrapper uses `not-prose` and must NOT emit a `<p>` directly around MDX children (MDX wraps text in `<p>`, and `<p>` inside `<p>` is invalid → hydration error). Use `<div>` and style descendant paragraphs with `[&_p]:…` like `components/mdx/editorial-components.tsx`'s `PullQuote`.
- Per-hike accent is injected as the inline CSS var `--accent` (and `--ink` where the existing `.accent-ink` light-mode darkening helps). Default accent is the blog teal `var(--color-blog)`.
- British spelling, house voice in any prose.
- After EVERY component: register it in `mdx-components.tsx` AND add a `COMPONENT_DESCRIPTIONS` entry in `scripts/gen-md-siblings.mjs`, or `npm run build` (which runs `prebuild → md:siblings`) will fall back to a generic description (and crawlers lose the real text).
- Commit after each task. Use `git add <explicit paths>` (the working tree has unrelated uncommitted hiking/admin work — never `git add -A`).

**Verification commands (used throughout):**
- `npm run typecheck` → expect `tsc --noEmit` clean.
- `npx vitest run <file>` → unit tests.
- `npm run build` → full static export (runs md-siblings + pagefind); expect success.
- Dev server: `npm run dev` then visit `http://localhost:3000/blog/<exemplar-slug>/`.

---

## Task 0: Confirm baseline is green

**Files:** none (sanity check).

- [ ] **Step 1: Confirm branch + clean typecheck/build baseline**

Run:
```bash
git branch --show-current      # expect: trailkit-hiking-mdx
npm run typecheck              # expect: clean (no errors)
```
Expected: typecheck passes. If it does not, STOP and report — do not build on a red baseline. (Do not run a full `npm run build` yet; it is slow. Typecheck is the gate here.)

- [ ] **Step 2: Note the existing token names we depend on**

Run:
```bash
grep -nE '\-\-color-(stage|surface|border|muted|blog|fg|bg)\b' app/globals.css | head -20
```
Expected: the vars `--color-stage`, `--color-surface`, `--color-border`, `--color-muted`, `--color-blog`, `--color-fg`, `--color-bg` exist. `JourneyMap` uses `--color-stage` and `bg-surface`; Trailkit reuses the same. If `--color-stage` is missing, substitute `--color-bg` in later tasks.

---

## Task 1: Extract the journey-map pure core (shared, testable)

Pull the pure geometry/profile helpers out of `journey-map.tsx` so both `JourneyMap` and the new `TrailMap` share one implementation. No behaviour change to `/hiking/[slug]`.

**Files:**
- Create: `components/hiking/journey-core.ts`
- Create: `components/hiking/journey-core.test.ts`
- Modify: `components/hiking/journey-map.tsx` (import helpers instead of defining them)

- [ ] **Step 1: Write `journey-core.ts` (move the pure helpers verbatim)**

Create `components/hiking/journey-core.ts`:
```ts
import type { HikeWaypoint } from '@/lib/gen/content'

// viewBox is 100 × 62 so 1 user-unit == 1% of width, making an HTML overlay
// trivial to align with the SVG markers.
export const VB_W = 100
export const VB_H = 62
export const PAD_X = 9
export const PAD_TOP = 9
export const PAD_BOT = 9

export type Pt = { x: number; y: number }

export function project(w: HikeWaypoint): Pt {
  return {
    x: PAD_X + w.x * (VB_W - 2 * PAD_X),
    y: PAD_TOP + w.y * (VB_H - PAD_TOP - PAD_BOT),
  }
}

/** Catmull-Rom → cubic-bezier smooth path through points. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return ''
  const d: string[] = [`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`)
  }
  return d.join(' ')
}

// Build an elevation profile (area + line paths over a 100×20 box) by walking the
// waypoints along cumulative planar distance, interpolating elevation with a
// smoothstep and a deterministic terrain wobble (so SSR and client agree).
export function buildProfile(wps: HikeWaypoint[]) {
  const pts = wps.map(project)
  const cum: number[] = [0]
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  }
  const total = cum[cum.length - 1] || 1
  const elevs = wps.map((w) => w.elev)
  const minE = Math.min(...elevs)
  const maxE = Math.max(...elevs)
  const span = Math.max(1, maxE - minE)

  const N = 120
  const top = 2
  const bottom = 19
  const xy: Pt[] = []
  for (let s = 0; s <= N; s++) {
    const d = (s / N) * total
    let seg = 0
    while (seg < cum.length - 2 && cum[seg + 1] < d) seg++
    const t = (d - cum[seg]) / Math.max(0.0001, cum[seg + 1] - cum[seg])
    const ts = t * t * (3 - 2 * t) // smoothstep
    let e = elevs[seg] + (elevs[seg + 1] - elevs[seg]) * ts
    const wob = Math.sin(d * 1.7) * 0.5 + Math.sin(d * 0.6 + 1.3) * 0.5
    e += wob * span * 0.05 * Math.sin(Math.PI * t)
    const x = (s / N) * 100
    const y = top + (1 - (e - minE) / span) * (bottom - top)
    xy.push({ x, y })
  }
  const line = xy.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const area = `${line} L 100 ${bottom} L 0 ${bottom} Z`
  const marks = cum.map((c) => ({ x: (c / total) * 100, y: top }))
  return { line, area, marks }
}

/** Index of the highest waypoint (the peak marker). */
export function peakIndex(wps: HikeWaypoint[]): number {
  return wps.reduce((best, w, i) => (w.elev > wps[best].elev ? i : best), 0)
}
```

- [ ] **Step 2: Write the failing test**

Create `components/hiking/journey-core.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { project, smoothPath, buildProfile, peakIndex, VB_W, VB_H } from './journey-core'
import type { HikeWaypoint } from '@/lib/gen/content'

const wp = (x: number, y: number, elev: number): HikeWaypoint =>
  ({ name: 'p', x, y, elev, day: '', note: '' }) as HikeWaypoint

describe('journey-core', () => {
  it('projects normalized coords into the padded viewBox', () => {
    expect(project(wp(0, 0, 0))).toEqual({ x: 9, y: 9 })
    expect(project(wp(1, 1, 0))).toEqual({ x: VB_W - 9, y: VB_H - 9 })
  })

  it('smoothPath starts with a moveto and is empty for <2 points', () => {
    expect(smoothPath([])).toBe('')
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])
    expect(d.startsWith('M 0.00 0.00')).toBe(true)
    expect(d).toContain('C ')
  })

  it('peakIndex finds the highest waypoint', () => {
    expect(peakIndex([wp(0, 0, 100), wp(0, 0, 900), wp(0, 0, 300)])).toBe(1)
  })

  it('buildProfile returns line/area/marks with one mark per waypoint', () => {
    const wps = [wp(0, 0.5, 100), wp(0.5, 0.2, 800), wp(1, 0.5, 200)]
    const p = buildProfile(wps)
    expect(p.line.startsWith('M ')).toBe(true)
    expect(p.area.endsWith('Z')).toBe(true)
    expect(p.marks).toHaveLength(3)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails (module not yet imported by anything)**

Run: `npx vitest run components/hiking/journey-core.test.ts`
Expected: PASS actually — the core file already exists from Step 1. If Step 1 was done, this passes; the point of this task is the refactor below. (If it fails, fix `journey-core.ts`.)

- [ ] **Step 4: Refactor `journey-map.tsx` to import the core**

In `components/hiking/journey-map.tsx`:
- Delete the local definitions of `VB_W, VB_H, PAD_X, PAD_TOP, PAD_BOT, Pt, project, smoothPath, buildProfile` and the inline `peakIdx` reduce.
- Add at the top (after the `'use client'` and the `HikeWaypoint` import):
```ts
import { VB_W, VB_H, project, smoothPath, buildProfile, peakIndex, type Pt } from './journey-core'
```
- Replace the `peakIdx` memo body with:
```ts
  const peakIdx = useMemo(() => peakIndex(wps), [wps])
```
Leave everything else (the JSX, `Tooltip`, `Stat`) unchanged.

- [ ] **Step 5: Verify typecheck + tests pass**

Run:
```bash
npm run typecheck
npx vitest run components/hiking/journey-core.test.ts
```
Expected: typecheck clean; tests PASS.

- [ ] **Step 6: Commit**
```bash
git add components/hiking/journey-core.ts components/hiking/journey-core.test.ts components/hiking/journey-map.tsx
git commit -m "refactor(hiking): extract journey-map pure core into journey-core (shared, tested)"
```

---

## Task 2: Make `JourneyMap` reusable (optional active/onSelect, compact, showElevation)

So `TrailMap` can reuse it without the gallery wiring and in a compact glyph form.

**Files:**
- Modify: `components/hiking/journey-map.tsx`

- [ ] **Step 1: Loosen the props and add options**

Change the `JourneyMap` signature and add internal-state fallback. Replace the function signature block:
```ts
export function JourneyMap({
  hike,
  active,
  onSelect,
  compact = false,
  showElevation = true,
}: {
  hike: Hike
  active?: string | null
  onSelect?: (name: string | null) => void
  /** glyph mode: hides start/end chips + stat band, tightens the plate */
  compact?: boolean
  /** show the elevation-profile strip (default true) */
  showElevation?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const [selfActive, setSelfActive] = useState<string | null>(null)
  const activeName = active !== undefined ? active : selfActive
  const select = onSelect ?? setSelfActive
```
Then within the body replace usages: `active` → `activeName`, and `onSelect(...)` → `select(...)`. Specifically:
- The focus line: `const focus = hover ?? wps.findIndex((w) => w.name === activeName)`
- The marker click: `onClick={() => select(activeName === wps[i].name ? null : wps[i].name)}`

- [ ] **Step 2: Gate the chrome on `compact`/`showElevation`**

- Wrap the elevation strip `<div className="border-t …">…</div>` so it only renders when `showElevation` is true: `{showElevation && ( … )}`.
- Wrap the two start/end chips and the bottom stat band/legend (`<div className="mt-3 flex …">…</div>`) so they only render when `!compact`: `{!compact && ( … )}`.

- [ ] **Step 3: Verify `/hiking/[slug]` still compiles and is unchanged in behaviour**

Run: `npm run typecheck`
Expected: clean. (`HikeJourney` passes `active`/`onSelect`, so behaviour there is identical; `compact`/`showElevation` default to the old behaviour.)

- [ ] **Step 4: Commit**
```bash
git add components/hiking/journey-map.tsx
git commit -m "feat(hiking): JourneyMap supports self-managed selection + compact/no-elevation modes"
```

---

## Task 3: Trailkit tokens (globals.css)

Add the difficulty-band ramp and a contour keyframe used across Trailkit.

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add Trailkit tokens + keyframe**

Append to `app/globals.css` (end of file is fine; keep the `@layer base` convention used for existing keyframes — check how `snakedraw`/`jm-draw` are declared and match it):
```css
/* ── Trailkit (hiking guide components) ───────────────────────────── */
@layer base {
  :root {
    --trail-easy: #4f9d8f;
    --trail-moderate: #5aa0b5;
    --trail-hard: #c2693a;
    --trail-severe: #b4453a;
    --trail-extreme: #2b2b30;
  }
  .dark {
    --trail-extreme: #d6d6dc;
  }
  /* gentle draw-in for trailkit SVG accents; respects reduced-motion via the
     global * { animation-duration: 0.001ms } rule already in this file. */
  @keyframes trail-draw {
    from { stroke-dashoffset: 1; }
    to { stroke-dashoffset: 0; }
  }
}
```

- [ ] **Step 2: Verify the dev server still renders (no CSS parse error)**

Run: `npm run typecheck` (CSS isn't typechecked, but this confirms nothing else broke). Optionally start `npm run dev` and confirm the home page renders with no console CSS errors, then stop it.
Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add app/globals.css
git commit -m "feat(trailkit): difficulty-band tokens + trail-draw keyframe"
```

---

## Task 4: Trailkit primitives — icons, ContourMotif, accent helper, card chrome

The shared brand layer every component composes.

**Files:**
- Create: `components/mdx/trailkit/icons.tsx`
- Create: `components/mdx/trailkit/primitives.tsx`

- [ ] **Step 1: Write the icon set**

Create `components/mdx/trailkit/icons.tsx`. Single-stroke, 24×24, `currentColor`, 1.5px. Each icon is a tiny component taking `{ className?: string }`:
```tsx
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...p }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24" width="1em" height="1em" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable="false" {...p}
    >
      {children}
    </svg>
  )
}

export const DistanceIcon = (p: IconProps) => <Svg {...p}><path d="M3 17h18" /><path d="M5 17v-3l3-5 4 4 3-6 4 6v4" /></Svg>
export const DurationIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
export const AscentIcon = (p: IconProps) => <Svg {...p}><path d="M4 19h16" /><path d="M4 19l7-12 4 6 2-3 3 9" /></Svg>
export const DescentIcon = (p: IconProps) => <Svg {...p}><path d="M4 5h16" /><path d="M20 5l-7 12-4-6-2 3-3-9" /></Svg>
export const SummitIcon = (p: IconProps) => <Svg {...p}><path d="M3 19h18L14 6l-3 5-2-2-6 10Z" /><path d="M12.5 8.5l1.5-2.5" /></Svg>
export const AltitudeIcon = (p: IconProps) => <Svg {...p}><path d="M3 20l6-11 4 5 3-4 5 10H3Z" /></Svg>
export const BootIcon = (p: IconProps) => <Svg {...p}><path d="M6 4v9l-1.5 1.2A2 2 0 0 0 4 16v2a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1c0-2-1.5-2.6-3.5-3.5L11 13V4Z" /><path d="M6 9h5" /></Svg>
export const SeasonIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9h17M8 3.5v3M16 3.5v3" /></Svg>
export const PackIcon = (p: IconProps) => <Svg {...p}><path d="M7 8a5 5 0 0 1 10 0v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" /><path d="M9.5 8V6a2.5 2.5 0 0 1 5 0v2M9 13h6" /></Svg>
export const HutIcon = (p: IconProps) => <Svg {...p}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-4h4v4" /></Svg>
export const TentIcon = (p: IconProps) => <Svg {...p}><path d="M12 4 3 19h18L12 4Z" /><path d="M12 9l-4 10M12 9l4 10" /></Svg>
export const WaterIcon = (p: IconProps) => <Svg {...p}><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z" /></Svg>
export const PassIcon = (p: IconProps) => <Svg {...p}><path d="M3 17l5-7 3 3 3-5 4 6" /><path d="M2 20h20" /><circle cx="14" cy="8" r="1" /></Svg>
export const ViewpointIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /></Svg>
export const JunctionIcon = (p: IconProps) => <Svg {...p}><path d="M12 21V8" /><path d="M12 8 6 3M12 8l6-5" /><circle cx="12" cy="21" r="1" /></Svg>
export const LeafIcon = (p: IconProps) => <Svg {...p}><path d="M5 19c0-8 6-13 14-14 1 9-4 15-14 14Z" /><path d="M9 15c3-3 5-5 8-7" /></Svg>
export const TrackIcon = (p: IconProps) => <Svg {...p}><ellipse cx="9" cy="15" rx="2.3" ry="3" /><circle cx="6" cy="10.5" r="1.2" /><circle cx="9.5" cy="8.5" r="1.2" /><circle cx="13" cy="10.5" r="1.2" /></Svg>
export const StarIcon = (p: IconProps) => <Svg {...p}><path d="m12 3 2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.9 6.6 19.5l1.2-6L3.4 9.3l6-.7Z" /></Svg>
export const ExposureIcon = (p: IconProps) => <Svg {...p}><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4.5M12 17.2v.1" /></Svg>
export const CompassIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m9 15 1.5-4.5L15 9l-1.5 4.5L9 15Z" /></Svg>
export const SunriseIcon = (p: IconProps) => <Svg {...p}><path d="M3 18h18M12 3v4M5 8 7 10M19 8l-2 2M2 14h3M19 14h3" /><path d="M8 18a4 4 0 0 1 8 0" /></Svg>

// kind → icon lookup, used by Checkpoint/Stop/Landmark.
export const KIND_ICON = {
  pass: PassIcon, summit: SummitIcon, water: WaterIcon, junction: JunctionIcon,
  viewpoint: ViewpointIcon, camp: TentIcon, hut: HutIcon, milestone: StarIcon,
  rifugio: HutIcon, hotel: HutIcon, bivvy: TentIcon, refuge: HutIcon,
  gorge: PassIcon, lake: WaterIcon, monument: ViewpointIcon, glacier: AltitudeIcon,
} as const

export type IconKind = keyof typeof KIND_ICON
```

- [ ] **Step 2: Write `primitives.tsx` (accent helper, ContourMotif, card chrome, stat chips)**

Create `components/mdx/trailkit/primitives.tsx`:
```tsx
import { useId, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Inline style that sets the per-component accent (default = blog teal). */
export function accentStyle(accent?: string): CSSProperties {
  return { ['--accent' as string]: accent || 'var(--color-blog)' } as CSSProperties
}

/** Faint topographic contour motif — the connective brand texture. Pure SVG,
 *  decorative (aria-hidden). Sits behind cards / as the Stages spine. */
export function ContourMotif({ className, rings = 5 }: { className?: string; rings?: number }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <radialGradient id={`tcm-${uid}`}>
          <stop offset="55%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id={`tcmm-${uid}`}><rect width="120" height="80" fill={`url(#tcm-${uid})`} /></mask>
      </defs>
      <g mask={`url(#tcmm-${uid})`} fill="none" stroke="color-mix(in srgb, var(--accent) 26%, transparent)" strokeWidth={0.4}>
        {Array.from({ length: rings }).map((_, i) => (
          <ellipse key={i} cx={84} cy={20} rx={10 + i * 11} ry={(10 + i * 11) * 0.6} opacity={1 - i * 0.14} />
        ))}
      </g>
    </svg>
  )
}

/** The shared card chrome: bordered, soft-glow-on-hover, contour-backed surface. */
export function TrailCard({
  children, className, accent, motif = false, glow = true, style,
}: {
  children: ReactNode; className?: string; accent?: string; motif?: boolean; glow?: boolean; style?: CSSProperties
}) {
  return (
    <div
      className={cn(
        'not-prose relative overflow-hidden rounded-[0.625rem] border border-[var(--color-border)] bg-surface',
        glow && 'transition-[box-shadow,border-color] duration-200 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--color-border))] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_18%,transparent),0_18px_44px_-30px_color-mix(in_srgb,var(--accent)_60%,transparent)]',
        className,
      )}
      style={{ ...accentStyle(accent), ...style }}
    >
      {motif && <ContourMotif className="opacity-[0.5]" />}
      <div className="relative">{children}</div>
    </div>
  )
}

/** A mono uppercase section eyebrow, e.g. "▸ The route". */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted', className)}>
      <span style={{ color: 'var(--accent)' }}>▸</span> {children}
    </p>
  )
}

/** One stat: icon + value + label. Used in summary/stage headers. */
export function StatChip({ icon: Icon, value, label }: { icon?: (p: { className?: string }) => ReactNode; value: ReactNode; label: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {Icon && <span className="text-[1.05rem]" style={{ color: 'var(--accent)' }}><Icon /></span>}
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-fg tabular-nums">{value}</span>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">{label}</span>
      </span>
    </div>
  )
}

/** A small inline icon+text pill. */
export function IconPill({ icon: Icon, children }: { icon?: (p: { className?: string }) => ReactNode; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.66rem]"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent) 38%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--accent) 9%, transparent)',
        color: 'color-mix(in srgb, var(--accent) 85%, var(--color-fg))',
      }}
    >
      {Icon && <span className="text-[0.85rem]"><Icon /></span>}
      {children}
    </span>
  )
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: clean. (`cn` exists at `@/lib/utils`, confirmed used in `editorial-components.tsx`.)

- [ ] **Step 4: Commit**
```bash
git add components/mdx/trailkit/icons.tsx components/mdx/trailkit/primitives.tsx
git commit -m "feat(trailkit): brand primitives — icon set, ContourMotif, TrailCard chrome, stat chips"
```

---

## Task 5: Difficulty scoring + hike binding (pure logic, TDD)

**Files:**
- Create: `components/mdx/trailkit/difficulty.ts`
- Create: `components/mdx/trailkit/difficulty.test.ts`
- Create: `components/mdx/trailkit/hike-binding.ts`
- Create: `components/mdx/trailkit/hike-binding.test.ts`

- [ ] **Step 1: Write the failing difficulty test**

Create `components/mdx/trailkit/difficulty.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { deriveDifficulty, DIFFICULTY_LABEL, type Difficulty } from './difficulty'

describe('deriveDifficulty', () => {
  it('rates a short, low, gentle walk as easy', () => {
    expect(deriveDifficulty({ distanceKm: 20, days: 3, elevationGainM: 600, maxAltitudeM: 400 })).toBe<Difficulty>('easy')
  })
  it('rates a long, very-high, big-ascent traverse as severe or extreme', () => {
    const d = deriveDifficulty({ distanceKm: 223, days: 14, elevationGainM: 12000, maxAltitudeM: 5644 })
    expect(['severe', 'extreme']).toContain(d)
  })
  it('returns a band for every hike without throwing', () => {
    const d = deriveDifficulty({ distanceKm: 65, days: 6, elevationGainM: 2500, maxAltitudeM: 1617 })
    expect(Object.keys(DIFFICULTY_LABEL)).toContain(d)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/mdx/trailkit/difficulty.test.ts`
Expected: FAIL — `Cannot find module './difficulty'`.

- [ ] **Step 3: Implement `difficulty.ts`**

Create `components/mdx/trailkit/difficulty.ts`:
```ts
export type Difficulty = 'easy' | 'moderate' | 'hard' | 'severe' | 'extreme'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy', moderate: 'Moderate', hard: 'Hard', severe: 'Severe', extreme: 'Extreme',
}

export const DIFFICULTY_VAR: Record<Difficulty, string> = {
  easy: 'var(--trail-easy)', moderate: 'var(--trail-moderate)', hard: 'var(--trail-hard)',
  severe: 'var(--trail-severe)', extreme: 'var(--trail-extreme)',
}

const ORDER: Difficulty[] = ['easy', 'moderate', 'hard', 'severe', 'extreme']

/** Heuristic 0..~4 score from the four index stats. Tuned so the seeded hikes in
 *  content/hiking.ts land sensibly (Overland≈moderate/hard, Larapinta/GR20≈severe+). */
export function difficultyScore(s: { distanceKm: number; days: number; elevationGainM: number; maxAltitudeM: number }): number {
  const perDayKm = s.distanceKm / Math.max(1, s.days)
  const perDayAscent = s.elevationGainM / Math.max(1, s.days)
  const distScore = Math.min(1.4, s.distanceKm / 160)        // 224km → ~1.4
  const ascentScore = Math.min(1.3, s.elevationGainM / 9000) // 12000m → 1.3
  const altScore = Math.min(1.3, Math.max(0, s.maxAltitudeM - 1500) / 3500) // 5000m → 1.0
  const intensity = Math.min(1, (perDayKm / 22) * 0.5 + (perDayAscent / 1100) * 0.5)
  return distScore + ascentScore + altScore + intensity
}

export function deriveDifficulty(s: { distanceKm: number; days: number; elevationGainM: number; maxAltitudeM: number }): Difficulty {
  const score = difficultyScore(s)
  // thresholds: easy <1, moderate <1.8, hard <2.6, severe <3.4, else extreme
  const idx = score < 1 ? 0 : score < 1.8 ? 1 : score < 2.6 ? 2 : score < 3.4 ? 3 : 4
  return ORDER[idx]
}
```

- [ ] **Step 4: Run difficulty test to verify pass**

Run: `npx vitest run components/mdx/trailkit/difficulty.test.ts`
Expected: PASS. (If the "easy" case fails, the 20km/600m walk scored ≥1 — nudge the `distScore`/`intensity` divisors; keep the severe case passing.)

- [ ] **Step 5: Write the failing hike-binding test**

Create `components/mdx/trailkit/hike-binding.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getHikeDefaults } from './hike-binding'

describe('getHikeDefaults', () => {
  it('returns stats + accent + waypoints for a known slug', () => {
    const d = getHikeDefaults('overland-track')
    expect(d).not.toBeNull()
    expect(d!.distanceKm).toBe(65)
    expect(d!.accent).toBe('#5b8c5a')
    expect(d!.waypoints.length).toBeGreaterThan(0)
  })
  it('returns null for an unknown slug', () => {
    expect(getHikeDefaults('not-a-real-hike')).toBeNull()
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run components/mdx/trailkit/hike-binding.test.ts`
Expected: FAIL — `Cannot find module './hike-binding'`.

- [ ] **Step 7: Implement `hike-binding.ts`**

Create `components/mdx/trailkit/hike-binding.ts`:
```ts
import { getHike } from '@/content/hiking'
import type { Hike, HikeWaypoint } from '@/lib/gen/content'

export interface HikeDefaults {
  region: string
  country: string
  accent: string
  distanceKm: number
  days: number
  elevationGainM: number
  maxAltitudeM: number
  name: string
  waypoints: HikeWaypoint[]
  hike: Hike
}

/** Static, SSR-safe lookup of a hike's index data by slug (no fetch). */
export function getHikeDefaults(slug?: string): HikeDefaults | null {
  if (!slug) return null
  const h = getHike(slug)
  if (!h) return null
  return {
    region: h.region, country: h.country, accent: h.accent,
    distanceKm: h.distanceKm, days: h.days, elevationGainM: h.elevationGainM,
    maxAltitudeM: h.maxAltitudeM, name: h.name, waypoints: h.waypoints, hike: h,
  }
}
```

- [ ] **Step 8: Run both test files to verify pass**

Run: `npx vitest run components/mdx/trailkit/difficulty.test.ts components/mdx/trailkit/hike-binding.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**
```bash
git add components/mdx/trailkit/difficulty.ts components/mdx/trailkit/difficulty.test.ts components/mdx/trailkit/hike-binding.ts components/mdx/trailkit/hike-binding.test.ts
git commit -m "feat(trailkit): difficulty scoring + hike-data binding (TDD)"
```

---

## Task 6: `<TrailMap>` — MDX route map (binding wrapper around JourneyMap)

**Files:**
- Create: `components/mdx/trailkit/trail-map.tsx`

- [ ] **Step 1: Implement `TrailMap`**

Create `components/mdx/trailkit/trail-map.tsx`:
```tsx
'use client'

import type { Hike, HikeWaypoint } from '@/lib/gen/content'
import { JourneyMap } from '@/components/hiking/journey-map'
import { getHikeDefaults } from './hike-binding'

export interface TrailMapProps {
  /** auto-bind waypoints + accent + name from content/hiking.ts */
  hike?: string
  /** explicit override / non-hike usage */
  waypoints?: HikeWaypoint[]
  name?: string
  accent?: string
  showElevation?: boolean
  compact?: boolean
}

/** Build a minimal Hike object JourneyMap can render from explicit props. */
function syntheticHike(props: TrailMapProps): Hike | null {
  if (!props.waypoints || props.waypoints.length < 2) return null
  return {
    slug: 'inline', name: props.name ?? 'Route', region: '', country: '', status: '',
    year: '', dates: '', summary: '', distanceKm: 0, days: 0, elevationGainM: 0,
    maxAltitudeM: 0, accent: props.accent ?? '', highlights: [], waypoints: props.waypoints,
    order: 0, hero: '',
  } as Hike
}

export function TrailMap(props: TrailMapProps) {
  const bound = getHikeDefaults(props.hike)
  const hike = bound?.hike ?? syntheticHike(props)
  if (!hike) {
    return (
      <p className="not-prose my-6 rounded-lg border border-[var(--color-border)] bg-surface p-4 font-mono text-sm text-muted">
        TrailMap: unknown hike <code>{props.hike}</code> and no <code>waypoints</code> provided.
      </p>
    )
  }
  // allow accent override even when bound to a hike
  const withAccent = props.accent ? ({ ...hike, accent: props.accent } as Hike) : hike
  return (
    <div className="my-10">
      <JourneyMap hike={withAccent} compact={props.compact} showElevation={props.showElevation ?? true} />
    </div>
  )
}
```

- [ ] **Step 2: Register it (3-place sync)**

In `components/mdx/mdx-components.tsx`:
- Add import near the top (after the editorial import):
```ts
import { TrailMap } from './trailkit/trail-map'
```
- Add `TrailMap,` into the `mdxComponents` object (anywhere in the list, e.g. just before `Callout,`).

In `scripts/gen-md-siblings.mjs`, add inside `COMPONENT_DESCRIPTIONS`:
```js
  TrailMap:
    'Bespoke route map for a hike — a stylised topographic plate (not a geographic map) showing the trail as a smooth line through numbered waypoints over a faint contour backdrop, with a peak marker on the high point and an elevation-profile strip beneath. Driven by the hike\'s normalised waypoints and per-hike accent colour. The `hike` prop names a hike from content/hiking.ts to auto-bind its waypoints; alternatively pass explicit `waypoints`. The rendered post has the live, hoverable version.',
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**
```bash
git add components/mdx/trailkit/trail-map.tsx components/mdx/mdx-components.tsx scripts/gen-md-siblings.mjs
git commit -m "feat(trailkit): <TrailMap> MDX route map bound to hike data"
```

---

## Task 7: `<TrailSummary>` — the hero card

**Files:**
- Create: `components/mdx/trailkit/trail-summary.tsx`

- [ ] **Step 1: Implement `TrailSummary`**

Create `components/mdx/trailkit/trail-summary.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Reveal } from '@/components/motion/reveal'
import { TrailCard, SectionLabel, StatChip, IconPill, accentStyle } from './primitives'
import { DistanceIcon, DurationIcon, AscentIcon, AltitudeIcon, BootIcon, SeasonIcon, PackIcon } from './icons'
import { deriveDifficulty, DIFFICULTY_LABEL, DIFFICULTY_VAR, type Difficulty } from './difficulty'
import { getHikeDefaults } from './hike-binding'
import { TrailMap } from './trail-map'

export interface TrailSummaryProps {
  hike?: string
  title?: string; region?: string; country?: string
  distanceKm?: number; days?: number; elevationGainM?: number; maxAltitudeM?: number
  difficulty?: Difficulty; season?: string; gearClass?: string
  accent?: string
  /** show the inline mini route map (needs a bound hike or waypoints) */
  map?: boolean
}

export function TrailSummary(props: TrailSummaryProps) {
  const bound = getHikeDefaults(props.hike)
  const [open, setOpen] = useState(false)

  const distanceKm = props.distanceKm ?? bound?.distanceKm ?? 0
  const days = props.days ?? bound?.days ?? 0
  const elevationGainM = props.elevationGainM ?? bound?.elevationGainM ?? 0
  const maxAltitudeM = props.maxAltitudeM ?? bound?.maxAltitudeM ?? 0
  const title = props.title ?? bound?.name ?? 'The route'
  const region = props.region ?? bound?.region
  const country = props.country ?? bound?.country
  const accent = props.accent ?? bound?.accent

  const difficulty = props.difficulty ?? deriveDifficulty({ distanceKm, days, elevationGainM, maxAltitudeM })
  const perDayKm = days ? Math.round((distanceKm / days) * 10) / 10 : null
  const perDayAscent = days ? Math.round(elevationGainM / days) : null

  return (
    <Reveal>
      <TrailCard accent={accent} motif className="my-12 p-6 sm:p-8">
        <SectionLabel>Trail summary</SectionLabel>
        <h3 className="mt-2 font-display text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] font-semibold tracking-tight text-fg">{title}</h3>
        {(region || country) && (
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-muted">{[region, country].filter(Boolean).join(' · ')}</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <StatChip icon={DistanceIcon} value={`${distanceKm} km`} label="distance" />
          <StatChip icon={DurationIcon} value={`${days} days`} label="on trail" />
          <StatChip icon={AscentIcon} value={`+${elevationGainM.toLocaleString()} m`} label="ascent" />
          <StatChip icon={AltitudeIcon} value={`${maxAltitudeM.toLocaleString()} m`} label="high point" />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2" style={accentStyle(accent)}>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.12em]"
            style={{ backgroundColor: `color-mix(in srgb, ${DIFFICULTY_VAR[difficulty]} 16%, transparent)`, color: DIFFICULTY_VAR[difficulty] }}
          >
            <BootIcon /> {DIFFICULTY_LABEL[difficulty]}
          </span>
          {props.season && <IconPill icon={SeasonIcon}>{props.season}</IconPill>}
          {props.gearClass && <IconPill icon={PackIcon}>{props.gearClass}</IconPill>}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-auto font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted underline decoration-fg/20 underline-offset-4 transition-colors hover:text-fg"
            aria-expanded={open}
          >
            {open ? 'less' : 'more'}
          </button>
        </div>

        {open && (
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--color-border)] pt-5 font-mono text-xs sm:grid-cols-3">
            {perDayKm !== null && (
              <div><dt className="text-muted">avg / day</dt><dd className="mt-0.5 font-display text-base font-semibold text-fg">{perDayKm} km</dd></div>
            )}
            {perDayAscent !== null && (
              <div><dt className="text-muted">ascent / day</dt><dd className="mt-0.5 font-display text-base font-semibold text-fg">+{perDayAscent.toLocaleString()} m</dd></div>
            )}
            <div><dt className="text-muted">difficulty</dt><dd className="mt-0.5 font-display text-base font-semibold text-fg">{DIFFICULTY_LABEL[difficulty]}</dd></div>
          </dl>
        )}

        {props.map && (props.hike || bound) && (
          <div className="mt-6">
            <TrailMap hike={props.hike} accent={accent} compact showElevation />
          </div>
        )}
      </TrailCard>
    </Reveal>
  )
}
```

- [ ] **Step 2: Register (3-place sync)**

`mdx-components.tsx`: `import { TrailSummary } from './trailkit/trail-summary'` and add `TrailSummary,` to the object.

`scripts/gen-md-siblings.mjs` → `COMPONENT_DESCRIPTIONS`:
```js
  TrailSummary:
    'Hero "at a glance" card for a trail guide. Shows the headline stats (distance, days on trail, total ascent, high point) with icons, a derived or explicit difficulty band (easy → extreme, trail-grade colour), and optional season window and gear class. An expandable "more" panel reveals secondary figures (avg km/day, ascent/day). The `hike` prop auto-binds the stats and accent colour from content/hiking.ts; an optional inline mini route map can be shown. The rendered post has the live, interactive card.',
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**
```bash
git add components/mdx/trailkit/trail-summary.tsx components/mdx/mdx-components.tsx scripts/gen-md-siblings.mjs
git commit -m "feat(trailkit): <TrailSummary> hero card with derived difficulty + hike binding"
```

---

## Task 8: `<Stages>` / `<Stage>` / `<Checkpoint>` — the day-by-day guide

**Files:**
- Create: `components/mdx/trailkit/stages.tsx`

- [ ] **Step 1: Implement the cluster**

Create `components/mdx/trailkit/stages.tsx`:
```tsx
import type { ReactNode } from 'react'
import { accentStyle, StatChip } from './primitives'
import { DistanceIcon, AscentIcon, DescentIcon, DurationIcon, KIND_ICON, type IconKind } from './icons'

export interface StageProps {
  day?: string | number
  from?: string; to?: string
  distanceKm?: number; ascentM?: number; descentM?: number
  timeHours?: number | string
  terrain?: string
  accent?: string
  children?: ReactNode
}

export interface CheckpointProps {
  name: string
  elevM?: number
  kind?: IconKind
  note?: ReactNode
}

function fmtTime(t: number | string | undefined): string | null {
  if (t == null) return null
  if (typeof t === 'string') return t
  return `${t} h`
}

/** Wrapper: a vertical contour-spine timeline of <Stage> children. */
export function Stages({ children, accent }: { children?: ReactNode; accent?: string }) {
  return (
    <div className="not-prose my-12" style={accentStyle(accent)}>
      <ol className="relative ml-1 border-l border-[color-mix(in_srgb,var(--accent)_30%,var(--color-border))] pl-6 sm:pl-8">
        {children}
      </ol>
    </div>
  )
}

export function Stage(props: StageProps) {
  const time = fmtTime(props.timeHours)
  const label = props.day != null ? (typeof props.day === 'number' ? `Day ${props.day}` : props.day) : null
  return (
    <li className="relative mb-10 last:mb-0" style={accentStyle(props.accent)}>
      {/* node on the spine */}
      <span className="absolute -left-[calc(1.5rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-bg)] sm:-left-[calc(2rem+5px)]" style={{ backgroundColor: 'var(--accent)' }} aria-hidden />
      {label && <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>{label}</p>}
      {(props.from || props.to) && (
        <h4 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">
          {props.from}{props.from && props.to ? ' → ' : ''}{props.to}
        </h4>
      )}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        {props.distanceKm != null && <StatChip icon={DistanceIcon} value={`${props.distanceKm} km`} label="distance" />}
        {props.ascentM != null && <StatChip icon={AscentIcon} value={`+${props.ascentM.toLocaleString()} m`} label="ascent" />}
        {props.descentM != null && <StatChip icon={DescentIcon} value={`−${props.descentM.toLocaleString()} m`} label="descent" />}
        {time && <StatChip icon={DurationIcon} value={time} label="walking" />}
      </div>
      {props.terrain && <p className="mt-3 font-mono text-[0.72rem] text-muted">{props.terrain}</p>}
      {props.children && <div className="mt-3 [&_p]:mt-3 [&_p]:font-sans [&_p]:text-[1rem] [&_p]:leading-[1.75] [&_p]:text-fg/85">{props.children}</div>}
    </li>
  )
}

/** Inline milestone/checkpoint marker — use in prose or inside a <Stage>. */
export function Checkpoint({ name, elevM, kind = 'milestone', note }: CheckpointProps) {
  const Icon = KIND_ICON[kind] ?? KIND_ICON.milestone
  return (
    <span className="not-prose my-2 flex items-start gap-2.5 rounded-md border-l-2 py-1 pl-3" style={{ borderColor: 'var(--accent)' }}>
      <span className="mt-0.5 text-[1rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
      <span className="leading-snug">
        <span className="font-display text-[0.95rem] font-semibold text-fg">{name}</span>
        {elevM != null && <span className="ml-2 font-mono text-[0.7rem] tabular-nums text-muted">{elevM.toLocaleString()} m</span>}
        {note && <span className="mt-0.5 block font-sans text-[0.85rem] leading-snug text-fg/65">{note}</span>}
      </span>
    </span>
  )
}
```

> Note: `Checkpoint` renders a `<span>` (not `<p>`/`<div>`) so it is valid when MDX places it inside a paragraph. `Stage`'s children wrapper styles descendant `<p>` via `[&_p]:…` to avoid nested-`<p>` issues.

- [ ] **Step 2: Register all three (3-place sync)**

`mdx-components.tsx`: `import { Stages, Stage, Checkpoint } from './trailkit/stages'` and add `Stages, Stage, Checkpoint,` to the object.

`scripts/gen-md-siblings.mjs` → `COMPONENT_DESCRIPTIONS`:
```js
  Stages:
    'Wrapper for an ordered list of <Stage> day-segments, rendered as a vertical timeline with a topographic contour spine. Use it to lay out a trail day by day.',
  Stage:
    'One day/segment of a trail: a timeline entry with an optional "Day N" label, a from → to headline, and stat chips for distance, ascent, descent and walking time, followed by narrative prose that may contain <Checkpoint> markers. The structured per-day route detail of the guide.',
  Checkpoint:
    'Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day\'s walk.',
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**
```bash
git add components/mdx/trailkit/stages.tsx components/mdx/mdx-components.tsx scripts/gen-md-siblings.mjs
git commit -m "feat(trailkit): <Stages>/<Stage>/<Checkpoint> day-by-day timeline"
```

---

## Task 9: Card components — `<Stop>`, `<Landmark>`, `<Quest>`, `<Flora>`, `<Fauna>`, `<GearList>`/`<Gear>`, `<TrailGrid>`

These share `TrailCard`/`IconPill`/`StatChip`. Build them in one file per the spec's grouping, then register all in one sync pass.

**Files:**
- Create: `components/mdx/trailkit/trail-grid.tsx`
- Create: `components/mdx/trailkit/stop.tsx`
- Create: `components/mdx/trailkit/landmark.tsx`
- Create: `components/mdx/trailkit/quest.tsx`
- Create: `components/mdx/trailkit/species.tsx`
- Create: `components/mdx/trailkit/gear.tsx`

- [ ] **Step 1: `TrailGrid` (shared responsive grid wrapper)**

Create `components/mdx/trailkit/trail-grid.tsx`:
```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Responsive grid for Stop/Landmark/Flora/Fauna cards. */
export function TrailGrid({ children, cols = 2, className }: { children?: ReactNode; cols?: 1 | 2 | 3; className?: string }) {
  const colClass = cols === 1 ? 'sm:grid-cols-1' : cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'
  return <div className={cn('not-prose my-10 grid grid-cols-1 gap-4', colClass, className)}>{children}</div>
}
```

- [ ] **Step 2: `<Stop>`**

Create `components/mdx/trailkit/stop.tsx`:
```tsx
import type { ReactNode } from 'react'
import { TrailCard, IconPill } from './primitives'
import { KIND_ICON, WaterIcon, type IconKind } from './icons'

export interface StopProps {
  name: string
  type: 'hut' | 'rifugio' | 'camp' | 'hotel' | 'bivvy' | 'refuge'
  elevM?: number; capacity?: number
  booking?: ReactNode
  water?: boolean; meals?: boolean
  note?: ReactNode
  accent?: string
}

const TYPE_LABEL: Record<StopProps['type'], string> = {
  hut: 'Hut', rifugio: 'Rifugio', camp: 'Campsite', hotel: 'Hotel', bivvy: 'Bivvy', refuge: 'Refuge',
}

export function Stop(props: StopProps) {
  const Icon = KIND_ICON[props.type as IconKind] ?? KIND_ICON.hut
  return (
    <TrailCard accent={props.accent} className="p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[1.3rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-display text-base font-semibold tracking-tight text-fg">{props.name}</h4>
            {props.elevM != null && <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted">{props.elevM.toLocaleString()} m</span>}
          </div>
          <p className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>{TYPE_LABEL[props.type]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {props.capacity != null && <IconPill>{props.capacity} beds</IconPill>}
            {props.water && <IconPill icon={WaterIcon}>water</IconPill>}
            {props.meals && <IconPill>meals</IconPill>}
          </div>
          {props.note && <p className="mt-3 font-sans text-[0.85rem] leading-snug text-fg/70">{props.note}</p>}
          {props.booking && <p className="mt-2 font-mono text-[0.7rem] text-muted">Booking: <span className="text-fg/75">{props.booking}</span></p>}
        </div>
      </div>
    </TrailCard>
  )
}
```

- [ ] **Step 3: `<Landmark>`**

Create `components/mdx/trailkit/landmark.tsx`:
```tsx
import type { ReactNode } from 'react'
import { TrailCard, IconPill } from './primitives'
import { KIND_ICON, CompassIcon, AltitudeIcon, type IconKind } from './icons'

export interface LandmarkProps {
  name: string
  kind?: 'summit' | 'gorge' | 'lake' | 'pass' | 'monument' | 'glacier' | 'viewpoint'
  elevM?: number; bearing?: string
  image?: string; alt?: string
  accent?: string
  children?: ReactNode
}

export function Landmark(props: LandmarkProps) {
  const Icon = (props.kind && KIND_ICON[props.kind as IconKind]) || KIND_ICON.viewpoint
  return (
    <TrailCard accent={props.accent} motif className="p-0">
      {props.image && (
        <img src={props.image} alt={props.alt ?? props.name} className="h-44 w-full object-cover" loading="lazy" />
      )}
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="text-[1.2rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
          <h4 className="font-display text-base font-semibold tracking-tight text-fg">{props.name}</h4>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {props.elevM != null && <IconPill icon={AltitudeIcon}>{props.elevM.toLocaleString()} m</IconPill>}
          {props.bearing && <IconPill icon={CompassIcon}>{props.bearing}</IconPill>}
        </div>
        {props.children && <div className="mt-3 [&_p]:font-sans [&_p]:text-[0.9rem] [&_p]:leading-relaxed [&_p]:text-fg/75">{props.children}</div>}
      </div>
    </TrailCard>
  )
}
```

- [ ] **Step 4: `<Quest>` (signature side-quest piece)**

Create `components/mdx/trailkit/quest.tsx`:
```tsx
import type { ReactNode } from 'react'
import { TrailCard, IconPill } from './primitives'
import { StarIcon, DistanceIcon, AscentIcon, DurationIcon, ExposureIcon } from './icons'

export interface QuestProps {
  title: string
  extraKm?: number; extraAscentM?: number; extraTimeHours?: number | string
  payoff?: ReactNode
  difficultyDelta?: 'same' | 'harder' | 'much-harder'
  optional?: boolean
  accent?: string
  children?: ReactNode
}

const DELTA_LABEL: Record<NonNullable<QuestProps['difficultyDelta']>, string> = {
  same: 'no harder', harder: 'harder', 'much-harder': 'much harder',
}

export function Quest(props: QuestProps) {
  const optional = props.optional ?? true
  const time = props.extraTimeHours == null ? null : typeof props.extraTimeHours === 'string' ? props.extraTimeHours : `+${props.extraTimeHours} h`
  return (
    <TrailCard accent={props.accent} motif className="my-10 p-6">
      <div className="flex items-center gap-2.5">
        <span className="text-[1.25rem]" style={{ color: 'var(--accent)' }}><StarIcon /></span>
        <p className="font-mono text-[0.64rem] uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
          Side-quest{optional ? ' · optional' : ''}
        </p>
      </div>
      <h4 className="mt-2 font-display text-xl font-semibold tracking-tight text-fg">{props.title}</h4>

      <div className="mt-4 flex flex-wrap gap-2">
        {props.extraKm != null && <IconPill icon={DistanceIcon}>+{props.extraKm} km</IconPill>}
        {props.extraAscentM != null && <IconPill icon={AscentIcon}>+{props.extraAscentM.toLocaleString()} m</IconPill>}
        {time && <IconPill icon={DurationIcon}>{time}</IconPill>}
        {props.difficultyDelta && <IconPill icon={ExposureIcon}>{DELTA_LABEL[props.difficultyDelta]}</IconPill>}
      </div>

      {props.children && <div className="mt-4 [&_p]:font-sans [&_p]:text-[0.95rem] [&_p]:leading-[1.7] [&_p]:text-fg/80">{props.children}</div>}
      {props.payoff && (
        <p className="mt-4 border-t border-[var(--color-border)] pt-3 font-sans text-[0.9rem] leading-snug text-fg/75">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Payoff </span>
          {props.payoff}
        </p>
      )}
    </TrailCard>
  )
}
```

- [ ] **Step 5: `<Flora>` / `<Fauna>`**

Create `components/mdx/trailkit/species.tsx`:
```tsx
import type { ReactNode } from 'react'
import { TrailCard, IconPill } from './primitives'
import { LeafIcon, TrackIcon } from './icons'

export interface SpeciesProps {
  name: string; latin?: string
  when?: string; where?: string
  image?: string; alt?: string
  likelihood?: 'common' | 'occasional' | 'rare'
  accent?: string
  children?: ReactNode
}

function SpeciesCard({ kind, props }: { kind: 'flora' | 'fauna'; props: SpeciesProps }) {
  const Icon = kind === 'flora' ? LeafIcon : TrackIcon
  return (
    <TrailCard accent={props.accent} className="overflow-hidden p-0">
      {props.image && <img src={props.image} alt={props.alt ?? props.name} className="h-40 w-full object-cover" loading="lazy" />}
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="text-[1.15rem]" style={{ color: 'var(--accent)' }}><Icon /></span>
          <div>
            <h4 className="font-display text-base font-semibold leading-tight tracking-tight text-fg">{props.name}</h4>
            {props.latin && <p className="font-sans text-[0.78rem] italic text-muted">{props.latin}</p>}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {props.likelihood && <IconPill>{props.likelihood}</IconPill>}
          {props.when && <IconPill>{props.when}</IconPill>}
          {props.where && <IconPill>{props.where}</IconPill>}
        </div>
        {props.children && <div className="mt-3 [&_p]:font-sans [&_p]:text-[0.85rem] [&_p]:leading-snug [&_p]:text-fg/70">{props.children}</div>}
      </div>
    </TrailCard>
  )
}

export function Flora(props: SpeciesProps) { return <SpeciesCard kind="flora" props={props} /> }
export function Fauna(props: SpeciesProps) { return <SpeciesCard kind="fauna" props={props} /> }
```

- [ ] **Step 6: `<GearList>` / `<Gear>`**

Create `components/mdx/trailkit/gear.tsx`:
```tsx
import { Children, isValidElement, type ReactNode, type ReactElement } from 'react'
import { accentStyle } from './primitives'
import { PackIcon } from './icons'

export interface GearProps {
  name: string
  group?: 'worn' | 'pack' | 'safety' | 'optional'
  essential?: boolean
  note?: ReactNode
}

const GROUP_ORDER: NonNullable<GearProps['group']>[] = ['worn', 'pack', 'safety', 'optional']
const GROUP_LABEL: Record<NonNullable<GearProps['group']>, string> = {
  worn: 'Worn', pack: 'In the pack', safety: 'Safety', optional: 'Optional',
}

export function Gear(_: GearProps) { return null } // data-only; rendered by GearList

export function GearList({ children, accent }: { children?: ReactNode; accent?: string }) {
  const items = Children.toArray(children).filter((c): c is ReactElement<GearProps> => isValidElement(c)) as ReactElement<GearProps>[]
  const groups = GROUP_ORDER.map((g) => ({ g, items: items.filter((it) => (it.props.group ?? 'pack') === g) })).filter((x) => x.items.length)

  return (
    <div className="not-prose my-12 rounded-[0.625rem] border border-[var(--color-border)] bg-surface p-6" style={accentStyle(accent)}>
      <p className="flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted">
        <span className="text-[1rem]" style={{ color: 'var(--accent)' }}><PackIcon /></span> Gear
      </p>
      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {groups.map(({ g, items }) => (
          <div key={g}>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>{GROUP_LABEL[g]}</p>
            <ul className="mt-2 space-y-1.5">
              {items.map((it, i) => (
                <li key={i} className="flex items-baseline gap-2 font-sans text-[0.9rem] text-fg/85">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: it.props.essential ? 'var(--accent)' : 'color-mix(in srgb, var(--color-fg) 30%, transparent)' }} aria-hidden />
                  <span>
                    {it.props.name}
                    {it.props.essential && <span className="ml-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>essential</span>}
                    {it.props.note && <span className="block font-sans text-[0.78rem] leading-snug text-muted">{it.props.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Register all (3-place sync)**

`mdx-components.tsx` imports:
```ts
import { TrailGrid } from './trailkit/trail-grid'
import { Stop } from './trailkit/stop'
import { Landmark } from './trailkit/landmark'
import { Quest } from './trailkit/quest'
import { Flora, Fauna } from './trailkit/species'
import { GearList, Gear } from './trailkit/gear'
```
Add to the `mdxComponents` object: `TrailGrid, Stop, Landmark, Quest, Flora, Fauna, GearList, Gear,`.

`scripts/gen-md-siblings.mjs` → `COMPONENT_DESCRIPTIONS`:
```js
  TrailGrid:
    'Responsive grid wrapper (1–3 columns) for laying out Stop / Landmark / Flora / Fauna cards side by side.',
  Stop:
    'Accommodation card for a trail guide: a hut, rifugio, campsite, hotel, bivvy or refuge, with an icon, altitude, capacity, water/meals flags, a booking note and a description. Where you sleep along the route.',
  Landmark:
    'Card for a notable feature along the route — a summit, gorge, lake, pass, monument, glacier or viewpoint — with an optional photo, altitude, compass bearing and a "why it matters" note.',
  Quest:
    'A "side-quest" card: an optional detour or side-trip off the main trail (a side summit, a hidden gorge), framed playfully but informatively with the extra distance, ascent and time it costs, how much harder it is, and the payoff for doing it.',
  Flora:
    'Species card for a plant seen along the trail: common name, Latin name, when/where it appears, an optional photo and a short note. A leaf icon marks it.',
  Fauna:
    'Species card for an animal seen along the trail: common name, Latin name, how likely you are to see it (common/occasional/rare), when/where, an optional photo and a note. A track icon marks it.',
  GearList:
    'Gear checklist for the trail, grouped into Worn / In the pack / Safety / Optional. Each <Gear> item can be flagged essential and carry a short note. Renders as a two-column grouped list.',
  Gear:
    'A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.',
```

- [ ] **Step 8: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 9: Commit**
```bash
git add components/mdx/trailkit/trail-grid.tsx components/mdx/trailkit/stop.tsx components/mdx/trailkit/landmark.tsx components/mdx/trailkit/quest.tsx components/mdx/trailkit/species.tsx components/mdx/trailkit/gear.tsx components/mdx/mdx-components.tsx scripts/gen-md-siblings.mjs
git commit -m "feat(trailkit): Stop, Landmark, Quest, Flora, Fauna, GearList, TrailGrid cards"
```

---

## Task 10: Full build + component-sync verification

**Files:** none (verification).

- [ ] **Step 1: Run the full build (exercises prebuild → md:siblings)**

Run: `npm run build`
Expected: success. Watch for any warning that a Trailkit component is missing from `COMPONENT_DESCRIPTIONS` (it falls back to a generic string — not fatal, but fix it). If the build fails on a Trailkit file, fix and re-run.

- [ ] **Step 2: Confirm every Trailkit component is registered + described**

Run:
```bash
for c in TrailSummary TrailMap Stages Stage Checkpoint Stop Landmark Quest Flora Fauna GearList Gear TrailGrid; do
  printf '%-14s reg=%s desc=%s\n' "$c" \
    "$(grep -c "^\s*$c,\?$" components/mdx/mdx-components.tsx)" \
    "$(grep -c "  $c:" scripts/gen-md-siblings.mjs)"
done
```
Expected: every component shows `reg=1 desc=1` (a `0` means a missing registration or description — fix it). (The `reg` grep is approximate; if a component is registered on a shared line, verify by eye.)

- [ ] **Step 3: Commit any sync fixes**
```bash
git add -p components/mdx/mdx-components.tsx scripts/gen-md-siblings.mjs
git commit -m "fix(trailkit): component registration/description sync"   # only if changes were needed
```

---

## Task 11: Brand kit via the brandbrain flow MCP (verify-first, non-blocking)

Generate the hiking sub-brand assets. **If the MCP/remote is unreachable, log it, skip to Step 6 (hand-authored fallback), and continue — the components already work without it.**

**Files:**
- Modify: `.mcp.json` (create if absent)
- Create: `public/trailkit/` (asset output)
- Create: `public/trailkit/README.md` (provenance)

- [ ] **Step 1: Register the brandbrain MCP for this repo (remote backend)**

Add to `/Users/benebsworth/projects/benebsworth.com/.mcp.json` (merge if the file exists):
```json
{
  "mcpServers": {
    "brandbrain-flow": {
      "command": "node",
      "args": ["/Users/benebsworth/projects/brandbrain/mcp/flow-orchestrator/dist/index.js"],
      "env": {
        "BRANDBRAIN_API_URL": "https://api.brandbrain.dev",
        "BRANDBRAIN_APP_URL": "https://brandbrain.dev"
      }
    }
  }
}
```
The bearer token / OAuth is read from the MCP's own `.env` at `~/projects/brandbrain/mcp/flow-orchestrator/.env` (already present). Then **reconnect the MCP** (in Claude Code: `/mcp` reconnect, or restart the session) so the `brandbrain-flow` tools load. This requires a human/agent action outside the static plan — note it and proceed when the tools are available.

- [ ] **Step 2: Smoke-test the connection (verify-first)**

Use the MCP tools (via ToolSearch → `whoamiBrandbrain` / `listAssetFlowTemplates`):
- `whoamiBrandbrain` → expect `authenticated: true`.
- `listAssetFlowTemplates` → expect a non-empty template list (logo-exploration, brand-moodboard, etc.).
If either fails: STOP this task, record "brandbrain unreachable" in `public/trailkit/README.md`, and go to Step 6.

- [ ] **Step 3: Generate the sub-brand emblem / wordmark**

`createAssetFlow` with a goal like: *"A minimalist topographic emblem + wordmark for a hiking trail-guide sub-brand called 'Field Notes' on a personal engineering site. Single-weight line mark evoking contour lines and a summit; mono palette with one teal accent (#00e0b8). SVG-friendly, works small."* Use `templateId` = the logo-exploration template if `listAssetFlowTemplates` named one. Run live, then `getFlowOutputs` (or the run-fetch tool) and save the chosen artifact to `public/trailkit/emblem.svg` (or `.png` if raster).

- [ ] **Step 4: Generate the contour texture pack**

`createAssetFlow` goal: *"A subtle, tileable topographic contour-line texture, very low contrast, in both light and dark variants, to sit behind cards as a faint brand motif. Teal-tinted neutral."* Save outputs to `public/trailkit/contour-light.*` and `public/trailkit/contour-dark.*`.

- [ ] **Step 5: Generate the icon moodboard (reference only)**

`createAssetFlow` goal: *"A cohesive single-stroke line-icon moodboard for hiking concepts: summit, hut, tent, water, pass, viewpoint, junction, distance, ascent, descent, duration, compass, pack, leaf, animal-track, star, exposure-warning, sunrise. 24px grid, round caps, one consistent weight."* Save the reference image to `public/trailkit/icon-moodboard.*`. Use it to refine `components/mdx/trailkit/icons.tsx` if the hand-cut icons diverge from the agreed look (optional polish; not required for correctness).

- [ ] **Step 6: Record provenance (and fallback note if used)**

Create `public/trailkit/README.md`:
```markdown
# Trailkit brand assets

Generated via the BrandBrain flow MCP (remote: api.brandbrain.dev) on 2026-06-29.

- emblem.svg — "Field Notes" hiking sub-brand mark/wordmark
- contour-light.* / contour-dark.* — faint topographic card texture
- icon-moodboard.* — reference for components/mdx/trailkit/icons.tsx

If brandbrain was unreachable at build time, the components fall back to the
hand-authored SVG icon set in `components/mdx/trailkit/icons.tsx` and the
`ContourMotif` SVG in `primitives.tsx` — no generated asset is load-bearing.
```

- [ ] **Step 7: Wire the emblem into the brand layer (only if generated)**

If `public/trailkit/emblem.svg` exists, surface it as a small mark in the `TrailSummary` header (top-right) — add to `trail-summary.tsx` inside the `TrailCard`, before `</TrailCard>`:
```tsx
{/* sub-brand mark (only renders if the asset exists at build) */}
<img src="/trailkit/emblem.svg" alt="" aria-hidden className="pointer-events-none absolute right-5 top-5 h-6 w-auto opacity-40" />
```
(Skip this step if no emblem was generated.)

- [ ] **Step 8: Commit**
```bash
git add .mcp.json public/trailkit components/mdx/trailkit/trail-summary.tsx
git commit -m "feat(trailkit): brand kit via brandbrain flow MCP (emblem, contour texture, icon moodboard)"
```

---

## Task 12: Exemplar trail guide post

Author one full guide exercising every component. **Recommended hike: Overland Track** (`overland-track`, 6 days, rich waypoints). Content must be researched, not invented — the stats in `content/hiking.ts` are flagged DRAFTS.

**Files:**
- Create: `content/blog/overland-track-guide/index.mdx`
- Create: hero image in BOTH `content/blog/overland-track-guide/` AND `public/blog/overland-track-guide/`
- Modify: `app/hiking/[slug]/page.tsx` (add the "Read the trail guide →" link)

- [ ] **Step 1: Research the route**

Gather real, verifiable detail for the Overland Track: the 6 standard stages (Ronny Creek → Waterfall Valley → Lake Windermere/Pelion → Kia Ora → Bert Nichols → Narcissus/Lake St Clair), the huts, the side trips (Mt Ossa, Barn Bluff, Cradle Mountain summit, the waterfall circuit), notable landmarks, characteristic flora (pandani, deciduous beech/fagus, button grass) and fauna (wombat, echidna, Bennett's wallaby, currawong), and the gear expected for a 6-day Tasmanian alpine walk. Cross-check stats against the draft figures in `content/hiking.ts`; correct the MDX prose to reality (do not silently inherit drafts).

- [ ] **Step 2: Generate + place the hero image**

Per the blog-post image workflow (see `.claude/skills/writing-blog-posts/SKILL.md`): generate a 1536×1024 hero (gpt-image), convert to webp (quality 80, ~50–140 KB), and place the SAME file at both `content/blog/overland-track-guide/hero.webp` and `public/blog/overland-track-guide/hero.webp`.

- [ ] **Step 3: Write the MDX**

Create `content/blog/overland-track-guide/index.mdx` with frontmatter + every component. Skeleton (fill with researched prose):
```mdx
---
title: "The Overland Track — a trail guide"
date: 2026-06-29
description: "Cradle Mountain to Lake St Clair through the heart of the Tasmanian wilderness — stage by stage, hut by hut, with the side trips worth the legs."
labels: hiking, trail-guide
heroImage: hero.webp
takeaways:
  - Six days, hut to hut, with optional summits that make or break the trip.
  - Book the Cradle Mountain end and the huts well ahead in season.
  - The side trips (Mt Ossa, Barn Bluff) are the real reward.
---

<TrailSummary hike="overland-track" season="Oct–May" gearClass="Hut-to-hut · 3-season alpine" map />

Opening narrative: what the walk is, why it matters... (researched prose)

## The route

<TrailMap hike="overland-track" />

## Day by day

<Stages>
  <Stage day={1} from="Ronny Creek" to="Waterfall Valley" distanceKm={10.7} ascentM={500} timeHours="4–6">
    Narrative for day 1...
    <Checkpoint name="Marions Lookout" elevM={1223} kind="viewpoint" note="The big climb out of Cradle Valley." />
  </Stage>
  <Stage day={2} from="Waterfall Valley" to="Lake Windermere" distanceKm={7.8} ascentM={150} timeHours="3">
    ...
  </Stage>
  {/* days 3–6 ... */}
</Stages>

## Side trips

<Quest title="Mount Ossa (1,617 m)" extraKm={6.4} extraAscentM={600} extraTimeHours={4} difficultyDelta="harder" payoff="Tasmania's highest summit, and on a clear day the best view on the track.">
  Researched detail...
</Quest>

## Where you sleep

<TrailGrid>
  <Stop name="Waterfall Valley Hut" type="hut" elevM={1130} capacity={24} water meals={false} note="..." />
  {/* more huts ... */}
</TrailGrid>

## Landmarks

<TrailGrid>
  <Landmark name="Barn Bluff" kind="summit" elevM={1559} bearing="SW">...</Landmark>
  {/* ... */}
</TrailGrid>

## What grows here

<TrailGrid cols={3}>
  <Flora name="Pandani" latin="Richea pandanifolia" when="year-round" where="rainforest gullies">World's tallest heath...</Flora>
  {/* ... */}
</TrailGrid>

## What lives here

<TrailGrid cols={3}>
  <Fauna name="Common wombat" latin="Vombatus ursinus" likelihood="common" where="button-grass moorland">...</Fauna>
  {/* ... */}
</TrailGrid>

## Gear

<GearList>
  <Gear name="Waterproof shell" group="worn" essential />
  <Gear name="4-season sleeping bag" group="pack" essential note="Nights drop below zero even in summer." />
  <Gear name="PLB" group="safety" essential />
  <Gear name="Gaiters" group="optional" />
  {/* ... */}
</GearList>
```

- [ ] **Step 4: Add the "Read the trail guide →" link on the overview page**

In `app/hiking/[slug]/page.tsx`, add a guide-slug map near the top of the module (after imports):
```ts
// hikes that have a long-form MDX trail guide (content/blog/<slug>/)
const GUIDE_SLUG: Record<string, string> = {
  'overland-track': 'overland-track-guide',
}
```
Then inside the component, after `const url = …`, add:
```ts
  const guide = GUIDE_SLUG[slug]
```
And in the JSX, replace the closing `<div className="mt-16">…all hikes…</div>` block with one that also shows the guide link when present:
```tsx
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4">
          <Link href="/hiking/" className="font-mono text-sm text-muted underline decoration-fg/20 underline-offset-4 hover:text-fg">
            ← all hikes
          </Link>
          {guide && (
            <Link
              href={`/blog/${guide}/`}
              className="font-mono text-sm underline decoration-fg/20 underline-offset-4 hover:text-fg"
              style={{ color: accent }}
            >
              Read the trail guide →
            </Link>
          )}
        </div>
```

- [ ] **Step 5: Verify build + render**

Run:
```bash
npm run typecheck
npm run build
```
Expected: build succeeds and emits the new post. Then `npm run dev` and open `http://localhost:3000/blog/overland-track-guide/` — confirm every component renders. Stop the dev server when done.

- [ ] **Step 6: Commit**
```bash
git add content/blog/overland-track-guide public/blog/overland-track-guide app/hiking/[slug]/page.tsx
git commit -m "content(hiking): Overland Track trail guide — exemplar exercising all of Trailkit"
```

> Quote the path with the `[slug]` glob carefully in zsh: `git add 'app/hiking/[slug]/page.tsx'`.

---

## Task 13: `writing-trail-guides` skill

**Files:**
- Create: `.claude/skills/writing-trail-guides/SKILL.md`
- Create: `.claude/skills/writing-trail-guides/trailkit-reference.md`

- [ ] **Step 1: Write `SKILL.md`**

Create `.claude/skills/writing-trail-guides/SKILL.md`:
```markdown
---
name: writing-trail-guides
description: Use when writing or editing a long-form hiking trail guide on this site (benebsworth.com) — authoring an MDX guide with the bespoke Trailkit components (TrailSummary, TrailMap, Stages/Checkpoint, Stop, Landmark, Quest, Flora, Fauna, GearList). A trail guide is a blog post with `labels: hiking`. For general posts, use writing-blog-posts instead.
---

# Writing trail guides

A trail guide is a blog post (`content/blog/<slug>/index.mdx`, `labels: hiking`)
that uses the **Trailkit** components to lay out a route as a navigable guide.
It pairs with the data-driven overview at `/hiking/<hike-slug>/` (from
`content/hiking.ts`); link the two via the `GUIDE_SLUG` map in
`app/hiking/[slug]/page.tsx`.

## Before you start
- Read `.claude/skills/writing-blog-posts/SKILL.md` for the shared mechanics
  (frontmatter, images in BOTH `content/` and `public/`, the math/voice rules,
  the deploy gate). Everything there applies.
- Read `trailkit-reference.md` (next to this file) for the full component +
  prop catalogue.

## The components (quick map)
- `<TrailSummary hike="slug" season=… gearClass=… map />` — the hero stat card.
- `<TrailMap hike="slug" />` — the route map.
- `<Stages>` / `<Stage>` / `<Checkpoint>` — the day-by-day spine.
- `<Stop>` — huts/camps; wrap several in `<TrailGrid>`.
- `<Landmark>` — notable features.
- `<Quest>` — optional side-trips.
- `<Flora>` / `<Fauna>` — species cards.
- `<GearList>` / `<Gear>` — gear checklist.

The `hike="slug"` prop on `TrailSummary`/`TrailMap` auto-binds stats, accent and
waypoints from `content/hiking.ts` — never re-type those numbers.

## Authoring workflow
1. **Research the route** — real stages, huts, side trips, landmarks, flora/fauna,
   gear. The stats in `content/hiking.ts` are DRAFTS; verify and correct in the prose.
2. **Frontmatter** — `title`, `date`, `description`, `labels: hiking, trail-guide`,
   `heroImage`, `takeaways`. Generate + place the hero in BOTH dirs.
3. **Structure** — `TrailSummary` up top → `TrailMap` → `## Day by day` `Stages` →
   `## Side trips` `Quest`s → `## Where you sleep` `Stop`s → `## Landmarks` →
   `## What grows / lives here` `Flora`/`Fauna` → `## Gear` `GearList`.
4. **Voice** — house voice (curious, first-person-plural, British spelling), em-dash
   budget ≤1 per 600–800 words.
5. **Link** — add the hike to `GUIDE_SLUG` in `app/hiking/[slug]/page.tsx`.

## Verify checklist
- [ ] `npm run typecheck` clean.
- [ ] `npm run build` succeeds (runs md:siblings — every component must be in
      `mdx-components.tsx` AND `COMPONENT_DESCRIPTIONS` in `scripts/gen-md-siblings.mjs`).
- [ ] Render at `/blog/<slug>/`: every component in light AND dark, at mobile width,
      with prefers-reduced-motion on (content still visible, no broken motion).
- [ ] Hero image present in BOTH `content/blog/<slug>/` and `public/blog/<slug>/`.
- [ ] No nested-`<p>` hydration warnings in the console.
- [ ] `release`/`draft` frontmatter reflects intent before shipping.
```

- [ ] **Step 2: Write `trailkit-reference.md`**

Create `.claude/skills/writing-trail-guides/trailkit-reference.md` documenting every component's full prop table and a copy-paste example. Source the prop names/types verbatim from the component files in `components/mdx/trailkit/` (TrailSummaryProps, TrailMapProps, StageProps, CheckpointProps, StopProps, LandmarkProps, QuestProps, SpeciesProps, GearProps) and the `TrailGrid` `cols` prop. Include the `hike="slug"` binding note and the difficulty-band list (easy/moderate/hard/severe/extreme). Mirror the structure of `circuit-simulator/drawing-rules.md`.

- [ ] **Step 3: Verify the skill is well-formed**

Run:
```bash
head -5 .claude/skills/writing-trail-guides/SKILL.md   # frontmatter present (name + description)
ls .claude/skills/writing-trail-guides/
```
Expected: `SKILL.md` with valid YAML frontmatter + `trailkit-reference.md`.

- [ ] **Step 4: Commit**
```bash
git add .claude/skills/writing-trail-guides
git commit -m "docs(skill): writing-trail-guides — authoring guide for the Trailkit components"
```

---

## Task 14: Final verification + staging deploy

**Files:** none (verification + deploy).

- [ ] **Step 1: Full green check**

Run:
```bash
npm run typecheck
npx vitest run components/hiking/journey-core.test.ts components/mdx/trailkit/difficulty.test.ts components/mdx/trailkit/hike-binding.test.ts
npm run build
```
Expected: all green; build emits the exemplar post and its `.md` sibling.

- [ ] **Step 2: Visual pass (Playwright MCP or dev server)**

Start `npm run dev`, confirm the LISTEN pid is the server you started
(`lsof -nP -iTCP:3000 -sTCP:LISTEN`), then visit `/blog/overland-track-guide/`:
- Toggle light/dark — every component correct in both.
- Mobile width (375px) — cards stack, nothing overflows.
- prefers-reduced-motion on — Reveal/draw animations degrade gracefully, content visible.
- Console clean (no nested-`<p>` hydration warnings, no 404s on images/emblem).
- Visit `/hiking/overland-track/` — the "Read the trail guide →" link appears and works.
Screenshot before/after for the record. Stop the dev server.

- [ ] **Step 3: Deploy to staging (auto — never prod)**

Per the auto-deploy-staging memory and the deploying-the-site skill, deploy the
branch to staging for review:
```bash
npm run deploy:pages:next
```
Expected: deploy succeeds; spot-check `https://next.benebsworth.com/blog/overland-track-guide/` live (and the `/hiking/overland-track/` link). Do NOT deploy to prod.

- [ ] **Step 4: Report**

Summarise: components shipped, the exemplar guide URL on staging, brandbrain
asset status (generated vs hand-authored fallback), and anything deferred. Offer
to open a PR for `trailkit-hiking-mdx`.

---

## Self-Review (completed during plan authoring)

**Spec coverage:**
- §3 Brand layer → Tasks 3 (tokens), 4 (icons/motif/chrome), 11 (brandbrain kit). ✓
- §4.1 TrailSummary → Task 7. §4.2 TrailMap → Tasks 1–2 (core) + 6. §4.3 Stages/Stage/Checkpoint → Task 8. §4.4 Stop, §4.5 Landmark, §4.6 Quest, §4.7 Flora/Fauna, §4.8 GearList/Gear → Task 9. ✓
- §5 Data binding → Task 5 (`hike-binding.ts`). ✓
- §6 Registration/sync → every component task + Task 10. ✓
- §7 Exemplar guide → Task 12. §8 Skill → Task 13. ✓
- §9 Build sequence / §10 Testing → Tasks 10, 14. ✓
- §12 open questions: journey-map refactor = shared-core (Tasks 1–2); exemplar = Overland Track (Task 12); TrailGrid helper added (Task 9); difficulty constants fixed (Task 5). ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases". The exemplar prose is intentionally
research-driven (Task 12 Step 1 says gather real detail) — code/skeleton is complete; only
the human-readable trail prose is to be written during execution, which is correct.

**Type consistency:** `Difficulty`, `DIFFICULTY_LABEL`, `DIFFICULTY_VAR`, `deriveDifficulty`
used consistently (Task 5 → 7). `getHikeDefaults`/`HikeDefaults` consistent (Task 5 → 6, 7).
`HikeWaypoint`, `Hike`, `project/smoothPath/buildProfile/peakIndex` consistent (Tasks 1 → 6).
`TrailCard/IconPill/StatChip/SectionLabel/accentStyle/ContourMotif` defined in Task 4, consumed
in 7–9. `KIND_ICON`/`IconKind` defined in Task 4, used in 8–9. Component prop interface names
match between implementation and the skill reference (Task 13).
```
