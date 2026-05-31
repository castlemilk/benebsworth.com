# Light/Dark Theming — Design

**Date:** 2026-05-31
**Status:** Approved design → ready for implementation plan

## Overview

The site is currently hardwired to dark (`<html class="dark">`, `color-scheme: dark`, and many
hardcoded dark hexes/alpha-on-white utilities throughout). Restore **full light/dark theming
across the entire app** using shadcn's CSS-variable token system + `next-themes`, with a
persisted sun/moon toggle that defaults to the OS preference. Also fix the Istio flow diagrams,
whose colored line-art (built for a light page) is invisible on the dark canvas, by rendering
them on a light "schematic paper" panel in both themes.

## Goals
- Real light AND dark themes across **every** surface: nav/footer, landing snake-grid, projects, blog index + posts, about (hero, timeline, certs, speaking, skills), lab index + playgrounds, the home embed, and the generative canvas effects.
- `next-themes` provider: `attribute="class"`, `defaultTheme="system"`, `enableSystem`, persisted, no hydration flash.
- A shadcn `Button` sun/moon toggle in `SiteNav` and a compact one on the landing header.
- Istio diagrams render correctly (light schematic panel, no color distortion) in both themes.
- Cohesive in both themes; accents (teal/purple/orange) stay recognizable; WCAG AA body contrast in both.
- Honor `prefers-reduced-motion`; static export safe; **use shadcn** (token system + Button).

## Non-Goals
- No new color brand beyond adapting the existing accents.
- No per-component theme overrides UI (single global toggle only).

## Decisions (locked)
| Topic | Decision |
|-------|----------|
| Scope | Full theming everywhere, incl. landing grid, lab effects, portrait |
| Engine | `next-themes` (class attribute) + shadcn token vars |
| Default | `system`, persisted, sun/moon toggle |
| Istio diagrams | Light "schematic paper" panel in both themes (no invert) |
| Toggle UI | shadcn `Button` + lucide `Sun`/`Moon`, in SiteNav + landing header |

## Architecture

### 1. Theme provider + toggle
- Install `next-themes`. Create `components/theme/theme-provider.tsx` (`'use client'`) wrapping `next-themes` `ThemeProvider` with `attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`.
- `app/layout.tsx`: wrap `{children}` in `<ThemeProvider>`; remove the hardcoded `dark` from `<html className>`; add `suppressHydrationWarning` to `<html>`.
- `components/theme/theme-toggle.tsx` (`'use client'`): shadcn `Button` (variant `ghost`, size `icon`) toggling `theme` between `light`/`dark` via `useTheme()`, showing lucide `Sun`/`Moon` (cross-fade), `aria-label="Toggle theme"`. Render-after-mount guard to avoid hydration mismatch (render a neutral placeholder until mounted). Place in `SiteNav` (right of the nav links) and a compact instance on the landing header (top-right).
- lucide-react: confirm it's installed (shadcn base-nova uses it); if not, `npm install lucide-react`.
- `color-scheme`: set `color-scheme: light` in `:root` and `color-scheme: dark` in `.dark` (replace the static `html { color-scheme: dark }`).

### 2. Semantic token system (`app/globals.css`)
Define theme-aware CSS variables in `:root` (light) and `.dark` (dark), and map them in `@theme inline` so Tailwind utilities are reactive:

```
:root {                      .dark {
  --bg:   #f7f7f9;             --bg:   #0a0a0c;
  --fg:   #16161a;             --fg:   #ececf0;
  --muted:#6a6a74;             --muted:#8a8a94;
  --surface:    #ffffff;       --surface:    #14141b;
  --surface-2:  #f0f0f3;       --surface-2:  #1a1a23;
  --border:     #1616161a;     --border:     #ffffff1a;   /* rgba border */
  --stage:      #0c0c10;       --stage:      #0c0c10;     /* canvas stage base; see effects */
  --blog:   #00b89a;           --blog:   #00e0b8;
  --project:#6b46ff;           --project:#7c5cff;
  --about:  #f0623d;           --about:  #ff7a59;
}
```
(Light accents are slightly deepened for AA text contrast on light; dark accents unchanged.) Map in `@theme inline`: `--color-bg: var(--bg)`, `--color-fg: var(--fg)`, `--color-muted: var(--muted)`, `--color-surface: var(--surface)`, `--color-surface-2: var(--surface-2)`, `--color-border: var(--border)`, `--color-blog/project/about` → vars. Body background becomes a themed pair (light: subtle light radial; dark: current dark radial) via `.dark` override. Keep `font-*` tokens as-is.

> Exact light values are tuned during implementation for AA contrast; the variable names + `:root`/`.dark` structure above are the contract.

### 3. Surface refactor (replace hardcoded darks)
Sweep these and route colors through tokens / `dark:`-paired utilities so they read in both themes:
- `components/landing/grid-nav.tsx` — dot `fill="#26262d"` → `var(--color-muted)`/a `--dot` token; the SVG has no bg (page bg themes); word accent colors → `--blog/--project/--about` tokens; artifact tile backers → tokens; foreignObject embed wrapper bg → `--stage`.
- `components/landing/artifact-tiles.tsx` — `fill-[#14141b]` + stroke + label fills → `--surface`/`--border`/`--fg`.
- `components/motion/spotlight-card.tsx` — `bg-white/[0.02]`, `white/10` borders, glow → `--surface`/`--border` (alpha on `--fg`) so they're visible on light; spotlight highlight uses the entry accent (fine in both).
- `components/about/portrait-hero.tsx` — plate `#16161d`/`#0c0c10`/grid lines → `--stage`/tokens; **line-art recolor**: apply `invert(1)` only under `.dark` (light shows black strokes directly); photo-reveal canvas unchanged.
- `components/mdx/mdx-content.tsx` — wrapper `prose` always + `dark:prose-invert` (currently `prose prose-invert` unconditionally); code blocks: rehype-pretty-code `github-dark` theme is dark — keep code blocks on a dark surface in both themes (a code block reads fine as a dark "terminal" on a light page), so the `prose-pre` styling pins a dark bg regardless of theme.
- `components/site/site-nav.tsx`, `site-footer.tsx`, `app/{projects,blog,blog/[slug],about,lab,lab/[slug]}/page.tsx`, `components/lab/{controls,lab-card,effect-playground}.tsx`, `components/projects/project-emblem.tsx`, `components/blog/topic-marker.tsx` — replace literal dark hexes / `white/x` alphas / `bg-[#0a0a0c]` with the new tokens.

### 4. Theme-aware canvas effects
- `components/lab/effect-canvas.tsx`: after sizing, resolve the current theme palette from CSS vars — `getComputedStyle(document.documentElement).getPropertyValue('--stage'|'--fg'|...)` → pass a `theme: { bg, fg }` object into `effect.createRenderer(ctx, dims, theme)` (extend the `EffectModule.createRenderer` signature with an optional `theme`), and re-create the renderer when the theme class changes (observe via a `MutationObserver` on `documentElement` class, or read on each `start()`).
- Update `EffectModule` type (`lib/lab/types.ts`) `createRenderer(ctx, dims, theme?)` where `theme = { bg: string; fg: string }`.
- Each effect (`orbits, flow-field, starfield, cyclic-automaton, ripple-grid`) uses `theme.bg` for its clear/trail fill (instead of hardcoded `rgba(10,10,12,…)`) and `theme.fg` for neutral elements (starfield stars, orbit core, ripple dots default) while keeping brand accents for accented elements. The canvas wrapper bg → `--stage`.
- `components/lab/home-embed.tsx` inherits this automatically (uses `EffectCanvas`).
- The landing dot-grid (not an EffectCanvas) themes via the `--dot`/muted token in §3.

### 5. Istio diagram light panel
- `components/mdx/flow-diagram.tsx`: wrap the diagram stage (background + layers + controls) so the **image stage** sits on a light panel (e.g. `bg-[#f5f6f8]` / a `--diagram-paper` token that's light in both themes) with a subtle border + rounded corners, so the colored line-art renders correctly regardless of theme. The step message panel + controls follow the normal theme tokens.

### 6. Reduced motion / hydration
- `disableTransitionOnChange` avoids transition flashes on toggle. The toggle renders a neutral icon until mounted (no SSR/CSR mismatch). Effects already honor reduced-motion; theme palette read is cheap and only on (re)create.

## Testing
- **E2E (Playwright):** toggling the theme adds/removes `.dark` on `<html>` and persists across reload (localStorage); `/`, `/about/`, `/projects/`, `/blog/`, a blog post (with Istio diagram), and `/lab/` render in BOTH themes with zero console errors; reduced-motion still renders. A check that body computed background differs between themes.
- **Unit:** if a `resolveEffectTheme()` helper is extracted, test it parses CSS var strings to `{bg,fg}`; otherwise none required (theming is CSS/visual).
- **Gates:** `proto`/`tsc` clean (type change to `createRenderer`), `npm test`, `npm run build` green; existing 28 unit tests still pass; lab + landing e2e still pass.
- **Visual verification:** screenshot every page in light AND dark (desktop + mobile spot-check) — confirm contrast, no invisible elements, diagrams legible, effects render on light.

## Milestones (for the plan)
1. `next-themes` + `ThemeProvider` + layout changes; `ThemeToggle` (shadcn Button + lucide); place in nav + landing; `color-scheme` per theme.
2. Token system in `globals.css` (`:root`/`.dark` vars + `@theme inline` map + themed body bg + light accents).
3. Surface refactor of static components/pages (§3) — replace hardcoded darks with tokens; mdx prose light/dark; portrait recolor theme-aware.
4. Theme-aware canvas effects (§4) — `createRenderer(ctx,dims,theme)` signature, EffectCanvas palette resolve + re-create on theme change, update all 5 effects + types/tests.
5. Istio diagram light panel (§5).
6. E2E + both-theme visual verification + fixes.

## Risks / Open Items
- **Effect signature change** ripples to the registry-integrity test and any caller — keep `theme` optional with a dark fallback so existing tests/usage compile.
- **Light-mode contrast** for neon accents as text — use the deepened light accent variants; verify AA.
- **Hydration flash** — mitigated by `suppressHydrationWarning` + next-themes' inline script + mounted-guard on the toggle.
- **Code blocks** intentionally stay dark in both themes (Shiki github-dark) — documented choice, not a bug.
