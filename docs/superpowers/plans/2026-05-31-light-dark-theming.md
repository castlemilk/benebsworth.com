# Light/Dark Theming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real, persisted light/dark theming across the entire app (incl. landing grid, lab canvas effects, portrait) via shadcn tokens + next-themes, and fix the Istio diagrams by rendering them on a light schematic panel in both themes.

**Architecture:** Convert the pinned-dark brand tokens in `app/globals.css` `@theme inline` into theme-aware CSS variables defined per-theme in `:root` (light) / `.dark` (dark); drive the class with `next-themes`; sweep hardcoded dark hexes in components onto the new tokens; make canvas renderers theme-aware via an optional `theme` arg; wrap the Istio diagram stage in a light panel.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, Tailwind v4 (`@theme` CSS vars), shadcn base-nova (`Button`), `next-themes`, `lucide-react` (installed), Canvas 2D, Vitest, Playwright.

**Working branch:** `redesign`.

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `components/theme/theme-provider.tsx` | next-themes provider wrapper (client) |
| `components/theme/theme-toggle.tsx` | shadcn Button sun/moon toggle (client) |
| `app/layout.tsx` | mount provider; drop hardcoded `dark`; `suppressHydrationWarning` |
| `app/globals.css` | theme-aware token vars (`:root`/`.dark`) + `@theme` map + themed body + color-scheme |
| `components/site/site-nav.tsx` | place ThemeToggle; tokenize colors |
| `components/landing/grid-nav.tsx` | landing header ThemeToggle; tokenize dot/tile colors |
| `components/landing/artifact-tiles.tsx` | tokenize tile fills/strokes/labels |
| `components/motion/spotlight-card.tsx` | tokenize card bg/border/glow (visible on light) |
| `components/about/portrait-hero.tsx` | plate→tokens; line-art `invert` only on `.dark` |
| `components/mdx/mdx-content.tsx` | `prose` + `dark:prose-invert`; keep code blocks dark |
| `lib/lab/types.ts` | `createRenderer(ctx, dims, theme?)` signature |
| `components/lab/effect-canvas.tsx` | resolve theme palette, pass to renderer, recreate on theme change |
| `components/lab/effects/*.ts` | use `theme.bg`/`theme.fg` for clears/neutral strokes |
| `components/mdx/flow-diagram.tsx` | light schematic panel around the diagram stage |
| `components/site/site-footer.tsx`, `app/**/page.tsx`, `components/lab/{controls,lab-card,effect-playground}.tsx`, `components/projects/project-emblem.tsx`, `components/blog/topic-marker.tsx` | tokenize stray dark hexes/alphas |
| `e2e/theme.spec.ts` | toggle + both-theme render E2E |

---

## Task 1: next-themes provider + layout

**Files:** `npm i next-themes`; create `components/theme/theme-provider.tsx`; modify `app/layout.tsx`.

- [ ] **Step 1: Install**

```bash
npm install next-themes
```

- [ ] **Step 2: Create `components/theme/theme-provider.tsx`**

```tsx
'use client'
import { ThemeProvider as NextThemeProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemeProvider>
  )
}
```

- [ ] **Step 3: Modify `app/layout.tsx`** — remove the hardcoded `dark`, add `suppressHydrationWarning`, wrap children.

Change the `<html>` open tag from `className={\`dark ${mono.variable} ${sans.variable} ${display.variable}\`}` (whatever it currently is) to drop `dark` and add `suppressHydrationWarning`:

```tsx
import { ThemeProvider } from '@/components/theme/theme-provider'
// ...
<html lang="en" suppressHydrationWarning className={`${mono.variable} ${sans.variable} ${display.variable}`}>
  <body className="font-sans antialiased">
    <ThemeProvider>{children}</ThemeProvider>
  </body>
</html>
```
(Preserve the existing font-variable classes exactly as they are now; only remove the literal `dark ` prefix and add `suppressHydrationWarning` + the provider wrap. Keep whatever `body` className currently exists.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: green. (App still defaults to system; will look dark/light per OS — full token theming lands in Task 2.)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(theme): next-themes provider; drop hardcoded dark class"
```

---

## Task 2: Theme-aware token system (`app/globals.css`)

**Files:** Modify `app/globals.css`.

- [ ] **Step 1: Replace the pinned brand tokens in `@theme inline`** (currently lines ~9-14). Replace:

```css
  --color-bg: #0a0a0c;
  --color-fg: #ececf0;
  --color-muted: #5a5a64;
  --color-blog: #00e0b8;
  --color-project: #7c5cff;
  --color-about: #ff7a59;
```
with theme-var references + new surface tokens:
```css
  --color-bg: var(--bg);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-dot: var(--dot);
  --color-stage: var(--stage);
  --color-diagram-paper: var(--diagram-paper);
  --color-blog: var(--blog);
  --color-project: var(--project);
  --color-about: var(--about);
```

- [ ] **Step 2: Add the brand vars to `:root` (light)** — append inside the existing `:root { … }` block (after `--radius`):

```css
  /* site brand tokens — light */
  --bg: #f6f6f9;
  --fg: #16161a;
  --muted: #5d5d68;
  --surface: #ffffff;
  --surface-2: #eeeef2;
  --dot: #c9c9d2;
  --stage: #0c0c10;          /* dark "screen" base for canvases/plate, both themes */
  --diagram-paper: #f4f5f8;  /* light schematic panel, both themes */
  --blog: #0a7d6a;
  --project: #5b3fd6;
  --about: #d2532c;
  color-scheme: light;
```

- [ ] **Step 3: Add the brand vars to `.dark`** — append inside the existing `.dark { … }` block (after `--ring`):

```css
  /* site brand tokens — dark */
  --bg: #0a0a0c;
  --fg: #ececf0;
  --muted: #8a8a94;
  --surface: #14141b;
  --surface-2: #1a1a23;
  --dot: #26262d;
  --stage: #0c0c10;
  --diagram-paper: #f4f5f8;
  --blog: #00e0b8;
  --project: #7c5cff;
  --about: #ff7a59;
  color-scheme: dark;
```

- [ ] **Step 4: Theme the body background** — replace the `body { background: radial-gradient(... #131318 ... var(--color-bg) ...) }` rule (line ~104) with a token-based one and add a dark override:

```css
  body {
    background:
      radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--fg) 4%, var(--bg)) 0%, var(--bg) 60%);
    color: var(--color-fg);
    min-height: 100vh;
    font-family: var(--font-sans);
    font-size: var(--text-body);
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
```
And add (after the `@layer base { … }` block or near it):
```css
.dark body {
  background: radial-gradient(120% 120% at 50% 0%, #131318 0%, var(--bg) 60%);
}
```

- [ ] **Step 5: Remove the static color-scheme line.** Delete `html { color-scheme: dark; }` (line ~174) — `color-scheme` now lives in `:root`/`.dark` (Steps 2-3). Keep the `*:focus-visible` and reduced-motion rules.

- [ ] **Step 6: Verify both themes**

Run: `npm run build` (green). Then `npx serve out` and toggle the OS / or temporarily add `class="dark"` to `<html>` in devtools — confirm `bg-bg`, `text-fg`, `text-muted` flip between the light and dark values.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css && git commit -m "feat(theme): theme-aware brand tokens (light + dark) + themed body"
```

---

## Task 3: Theme toggle (shadcn Button + lucide), placed in nav + landing

**Files:** Create `components/theme/theme-toggle.tsx`; modify `components/site/site-nav.tsx` and `components/landing/grid-nav.tsx`.

- [ ] **Step 1: Create `components/theme/theme-toggle.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className={className}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {/* render-after-mount guard: show a stable icon until theme is known */}
      {mounted && !isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  )
}
```

- [ ] **Step 2: Place it in `components/site/site-nav.tsx`** — add `<ThemeToggle />` at the right end of the nav row.

Import `import { ThemeToggle } from '@/components/theme/theme-toggle'` and add it after the nav links (inside the right-hand group), e.g. wrap the existing `<nav>` + toggle in a flex container so the toggle sits to its right:

```tsx
<div className="flex items-center gap-4">
  <nav className="flex gap-5 uppercase tracking-wider text-muted">
    {/* existing links unchanged */}
  </nav>
  <ThemeToggle />
</div>
```
(Adapt to the current SiteNav markup — keep existing links/classes; just add the toggle alongside.)

- [ ] **Step 3: Place a compact one on the landing** — in `components/landing/grid-nav.tsx`, add `<ThemeToggle className="absolute right-4 top-4" />` inside the `<main>` (which is `relative`? if not, add `relative` to the `<main>` className). Import it. Keep it out of the centered grid flow.

- [ ] **Step 4: Build + verify toggle works**

Run: `npm run build && npx serve out`; click the toggle → `<html>` gains/loses `dark`, colors flip, choice persists across reload. No hydration warning in console.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(theme): sun/moon toggle in nav + landing"
```

---

## Task 4: Surface refactor — tokenize hardcoded darks

**Files:** modify the components/pages listed below. Each is an exact class/attr swap onto the Task-2 tokens. After all edits, both themes must read correctly (no white-on-white / black-on-black).

- [ ] **Step 1: `components/landing/grid-nav.tsx`** — the dot grid + any tile backer.
  - Dot circle fill: change `fill="#26262d"` → `fill="var(--color-dot)"`.
  - Any landing tile backer rect using a dark hex → `fill="var(--color-surface)"`, stroke → `stroke="var(--color-border)"`.
  - Word/accent colors already use `#00e0b8/#7c5cff/#ff7a59` literals in the `COLOR` map — replace with the CSS vars so they theme: `const COLOR = { blog: 'var(--color-blog)', project: 'var(--color-project)', about: 'var(--color-about)' }`. (SVG `fill`/`stroke`/`filter drop-shadow` accept `var()`.)

- [ ] **Step 2: `components/landing/artifact-tiles.tsx`** — replace `fill-[#14141b]` → `fill-[var(--color-surface)]`; tile stroke `stroke-[#2a2a34]`/`#2a2a34` → `var(--color-border)`; label text fill `#e6e6ee`/`#cfcfd6` → `var(--color-fg)`; the GLYPH/AVATAR/text neutral fills (`#9a9aa6`, `#b9b9c4`) → `var(--color-muted)`. Keep accent-colored bits (`var(--blog)` etc. via the COLOR map / accent props).

- [ ] **Step 3: `components/motion/spotlight-card.tsx`** — make the card visible on light:
  - Base bg `bg-white/[0.02]` (or similar) → `bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)]` (a faint fg tint, works on both).
  - Border `border-white/10` → `border-[var(--color-border)]`.
  - Hover border/glow that use the entry `accent` prop stay as-is (accent vars now theme).
  - Any `overflow-hidden` glare mask stays.

- [ ] **Step 4: `components/about/portrait-hero.tsx`**
  - Plate bg `#16161d`/`#0c0c10` radial → `var(--color-stage)` (keep the plate a dark "screen" in both themes — it frames the portrait); grid-line rgba stays subtle.
  - **Line-art recolor**: the `<img src="/about/portrait.svg" className="... [filter:invert(1)_drop-shadow(...)]">` — gate the `invert(1)` to dark only. Since the plate is always dark (`--stage`), the line-art needs to be light on it in BOTH themes → keep `invert(1)` always (it's on a dark plate regardless of page theme). **No change needed** if the plate stays dark; confirm the plate is `--stage` (dark) so the inverted (white) line-art still reads. (If you instead make the plate themable, then gate invert under `.dark` — but per spec the plate is the dark "screen", so keep invert always.)
  - Metadata strip / ticks neutral colors → `var(--color-fg)`/muted alphas.

- [ ] **Step 5: `components/mdx/mdx-content.tsx`** — wrapper className: change `prose prose-invert max-w-none …` → `prose dark:prose-invert max-w-none …` (so light mode uses normal prose, dark uses inverted). Keep the `prose-pre:*`/`prose-code:*` neutralizers. Add `prose-pre:bg-[#0c0c10] prose-pre:text-[#ececf0]` (or keep existing) so **code blocks stay dark** (Shiki github-dark) in both themes — a dark code surface on a light page is intentional.

- [ ] **Step 6: Remaining files** — grep and swap literal dark hexes / `bg-white/x` alphas / `bg-[#0a0a0c]`:
  - `components/site/site-nav.tsx`, `components/site/site-footer.tsx`: borders `border-white/10` → `border-[var(--color-border)]`; any `text-white` → `text-fg`.
  - `components/lab/effect-canvas.tsx` wrapper `bg-[#0a0a0c]` (in callers) → `bg-[var(--color-stage)]`.
  - `components/lab/{controls,lab-card,effect-playground}.tsx`: `bg-white/[0.02]`/`#0a0a0c`/`border-white/10` → tokens (`--color-surface`/`--color-stage`/`--color-border`).
  - `components/projects/project-emblem.tsx`: dark panel hex → `var(--color-surface)`/`--color-stage`; keep accent tints.
  - `components/blog/topic-marker.tsx`: neutral chip bg/border → tokens; keep accent.
  - `app/projects/page.tsx`, `app/projects/[slug]/page.tsx`, `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, `app/about/page.tsx`, `app/lab/page.tsx`, `app/lab/[slug]/page.tsx`: replace `bg-[#0a0a0c]`, `bg-white/[0.0x]`, `border-white/10`, `text-white` literals → tokens (`bg-bg`/`bg-surface`/`border-[var(--color-border)]`/`text-fg`). Leave `text-fg/70` etc. (already token alpha) as-is.

  Use `grep -rn '#0a0a0c\|#14141b\|#16161\|#26262d\|white/1\|white/\[0\|bg-\[#0' app components` to find them; convert each. Do NOT touch the canvas effect renderers here (Task 5) or the diagram paper (Task 6).

- [ ] **Step 7: Build + visual check both themes**

Run: `npm run build && npx serve out`. In a browser, view `/about/`, `/projects/`, `/blog/`, a post, `/lab/` in both themes (toggle). Confirm: cards/borders visible on light, text readable (AA), nothing white-on-white. Fix any element that disappears.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(theme): tokenize surfaces across components + pages (light + dark)"
```

---

## Task 5: Theme-aware canvas effects

**Files:** `lib/lab/types.ts`, `components/lab/effect-canvas.tsx`, `components/lab/effects/*.ts`, `lib/lab/registry.test.ts` (compat).

- [ ] **Step 1: Extend the renderer signature in `lib/lab/types.ts`**

```ts
export type Dims = { w: number; h: number; dpr: number }
export type EffectTheme = { bg: string; fg: string }
export type Renderer = { step: (timeMs: number, params: Params) => void; destroy?: () => void }
export type EffectModule = {
  controls: ControlSpec[]
  defaults: Params
  createRenderer: (ctx: CanvasRenderingContext2D, dims: Dims, theme?: EffectTheme) => Renderer
}
```
(`theme` is OPTIONAL with a dark fallback so existing tests/usages compile.)

- [ ] **Step 2: Resolve + pass theme in `components/lab/effect-canvas.tsx`**

Add a helper inside the effect, read CSS vars from `document.documentElement`, default to dark:
```ts
function resolveTheme(): { bg: string; fg: string } {
  if (typeof window === 'undefined') return { bg: '#0c0c10', fg: '#ececf0' }
  const s = getComputedStyle(document.documentElement)
  const bg = s.getPropertyValue('--stage').trim() || '#0c0c10'
  const fg = s.getPropertyValue('--fg').trim() || '#ececf0'
  return { bg, fg }
}
```
- Pass it when creating the renderer: `renderer = effect.createRenderer(ctx, dims, resolveTheme())` (in both the initial create and the `size()` recreate).
- **Recreate on theme change:** add a `MutationObserver` on `document.documentElement` watching the `class` attribute; on change, `renderer.destroy?.()` then recreate with the new `resolveTheme()` and (if reduced-motion) paint one static frame. Disconnect it in cleanup.

- [ ] **Step 3: Update each effect to use the theme**

For `orbits, flow-field, starfield, cyclic-automaton, ripple-grid` in `components/lab/effects/*.ts`: change `createRenderer(ctx, dims)` → `createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' })`, and:
- Replace hardcoded trail/clear fills `rgba(10,10,12,a)` → use `theme.bg` with the alpha. Since `theme.bg` is a hex, build the fill via `ctx.fillStyle = theme.bg; ctx.globalAlpha = trail; ctx.fillRect(...); ctx.globalAlpha = 1` (instead of an rgba string), OR keep a full clear `ctx.clearRect` for effects that fully clear (cyclic, ripple) and only use `theme.bg`+alpha for the trail effects (orbits, flow-field, starfield).
- Replace neutral whites: starfield star color default `#fff`/`#ececf0` and orbit core `#ececf0`, ripple default dot color where it used a near-white → use `theme.fg`. Keep accent-colored params (the `color` knob) as-is.
- Effects that `clearRect` (cyclic-automaton, ripple-grid) draw shapes in accent/hsl — on a light stage these still read; no bg fill needed, but set the canvas to transparent so the `--color-stage` wrapper shows. Confirm they look right on both light and dark stage.

Example (starfield trail clear): replace
```ts
ctx.fillStyle = `rgba(10,10,12,${1 - (p.streak as number) * 0.9})`; ctx.fillRect(0, 0, w, h)
```
with
```ts
ctx.save(); ctx.globalAlpha = 1 - (p.streak as number) * 0.9; ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, w, h); ctx.restore()
```
and the star color: `ctx.fillStyle = p.color as string` stays, but if `p.color` default is white, that's the knob; leave it (user-tunable). Use `theme.fg` only for non-knob neutral marks.

- [ ] **Step 4: Keep `registry.test.ts` green** — the test calls effects only via metadata, not `createRenderer`; the optional `theme` arg keeps it compiling. Run `npm test` → 28 pass.

- [ ] **Step 5: Build + verify effects on light**

Run: `npm run build && npx serve out`; view `/lab/` and each effect in light mode — confirm effects are visible on a light stage (the `--color-stage` wrapper keeps the canvas dark by default, so they look the same; if you set the lab canvas wrapper to `--bg` for light, verify strokes are visible). Per spec the stage stays dark, so effects render as today in both themes; the surrounding page themes. Confirm the home-embed tile still renders.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(theme): theme-aware canvas effects (createRenderer theme arg)"
```

---

## Task 6: Istio diagram light schematic panel

**Files:** `components/mdx/flow-diagram.tsx`.

- [ ] **Step 1: Wrap the diagram image stage in a light panel.** In `flow-diagram.tsx`, the element that contains the background `<img>` + layer `<img>`s gets a light paper background so the colored line-art shows in both themes. Add to that stage container's className: `bg-[var(--color-diagram-paper)] rounded-xl border border-black/10` (and keep its aspect/positioning). The step **message panel** + **controls** keep normal theme tokens (`text-fg`, `text-muted`, etc.).

- [ ] **Step 2: Build + verify**

Run: `npm run build && npx serve out`; open `/blog/istio-patterns/` in BOTH light and dark — the three diagrams render the colored Istio line-art clearly on the light panel; stepping works; the message panel reads in both themes.

- [ ] **Step 3: Commit**

```bash
git add components/mdx/flow-diagram.tsx && git commit -m "feat(theme): istio diagrams on light schematic panel"
```

---

## Task 7: E2E + final verification

**Files:** create `e2e/theme.spec.ts`.

- [ ] **Step 1: Create `e2e/theme.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('toggle switches theme and persists', async ({ page }) => {
  await page.goto('/about/')
  const html = page.locator('html')
  const before = (await html.getAttribute('class')) ?? ''
  await page.getByRole('button', { name: 'Toggle theme' }).click()
  const after = (await html.getAttribute('class')) ?? ''
  expect(after).not.toBe(before) // dark class added/removed
  const hadDark = after.includes('dark')
  await page.reload()
  expect(((await html.getAttribute('class')) ?? '').includes('dark')).toBe(hadDark) // persisted
})

test('key pages render in light mode with no console errors', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'light' })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  for (const path of ['/', '/about/', '/projects/', '/blog/', '/blog/istio-patterns/', '/lab/']) {
    await page.goto(path)
    await expect(page.locator('body')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('dark mode body background differs from light', async ({ browser }) => {
  const light = await (await browser.newContext({ colorScheme: 'light' })).newPage()
  await light.goto('/about/')
  const lbg = await light.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const dark = await (await browser.newContext({ colorScheme: 'dark' })).newPage()
  await dark.goto('/about/')
  const dbg = await dark.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(lbg).not.toBe(dbg)
})
```

- [ ] **Step 2: Run all gates**

Run: `npx tsc --noEmit && npm test && npm run build && npm run e2e`
Expected: tsc clean; 28 unit pass; build green; landing + lab + theme E2E pass.

- [ ] **Step 3: Visual verification (both themes)**

Build + serve; screenshot at desktop (1280) and a mobile spot-check (390): landing, about, projects, blog index, a blog post (with Istio diagram), lab index + a playground — in BOTH light and dark. Confirm contrast, no invisible elements, diagrams legible, effects render, toggle reachable. Fix any contrast/visibility issues found (tune the light accent/surface vars in `globals.css` if needed).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test(theme): light/dark e2e + final theming fixes"
```

---

## Self-Review Notes
- **Spec coverage:** provider+toggle+layout (T1,T3), token system + themed body + color-scheme (T2), surface refactor incl. mdx prose + portrait (T4), theme-aware effects via optional `theme` arg (T5), istio light panel (T6), E2E both-theme + visual (T7). System default + persistence via next-themes (T1). shadcn Button + lucide toggle (T3).
- **Type consistency:** `EffectModule.createRenderer(ctx, dims, theme?)`, `EffectTheme = {bg,fg}`, token names (`--bg/--fg/--muted/--surface/--surface-2/--dot/--stage/--diagram-paper/--blog/--project/--about`) and their `--color-*` `@theme` mappings used consistently across T2/T4/T5/T6.
- **Known follow-ups flagged inline:** light accent/surface values are tuned for AA during T7 visual pass; the portrait plate + lab canvas stage intentionally stay dark "screens" in both themes (T4/T5); code blocks intentionally stay dark (T4 Step 5).
