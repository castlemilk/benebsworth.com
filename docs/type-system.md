# Type system

One reading voice across the site. The research-folio redesign introduced a
serif, a condensed label face and a handwritten accent, but only reading pages
used them; everything else still rendered the older Space Grotesk, mono-label
system. Since 2026-11-11 the tokens themselves carry the folio voice, so a page
gets it by default rather than by override.

## Faces

| Token | Face | Use |
|---|---|---|
| `--font-serif` (`font-serif`, also `font-display`) | Folio Serif (Source Serif 4, variable, woff2 subset) | Display, headings, reading text, nav |
| `--font-label` (`font-label`) | Folio Condensed (Barlow Condensed 600) | Eyebrows, section labels, meta (dates, reading time, byline) |
| `--font-hand` | Folio Hand (Caveat) | Margin notes and annotations only: a few words, at most two per viewport |
| `--font-mono` | JetBrains Mono | Code, numbers, data tables |
| `--font-sans` | Hanken Grotesk | Form controls, lab parameter panels, dense UI |

Space Grotesk is retired. `font-display` now resolves to the serif; its old
bold weights are paired down to 480 in `app/globals.css` rather than at each
call site.

The folio faces are self-hosted in `public/fonts/editorial/` as woff2 (with
the original woff/ttf as fallback). The serif and label faces are preloaded
from `app/layout.tsx`. The serif is subset to Latin, Greek, punctuation,
super/subscripts, arrows and math operators; `unicode-range` lets any other
glyph fall back per character.

## Scale

| Role | Class / source | Size (desktop → mobile) | Line-height |
|---|---|---|---|
| Display | `.type-display` | `--text-display` | 1.02 |
| Page / post title | `.type-h1`, `h1` | `--text-h1` | 1.06 |
| Section | `.type-h2`, MDX `h2` | `clamp(1.75rem, 1.3rem + 1.6vw, 2.6rem)` | 1.15 |
| Sub-section | `.type-h3`, MDX `h3` | `clamp(1.35rem, 1.15rem + .8vw, 1.75rem)` | 1.25 |
| Deck / lead | `.folio-post-deck` | `clamp(1.2rem, 1.1rem + .4vw, 1.375rem)` | 1.5 |
| Body | `.type-body`, MDX `p`/`ul` | `clamp(1.0625rem, 1rem + .25vw, 1.1875rem)` | 1.7 (1.65 mobile) |
| Label / eyebrow | `.type-label` | 0.8125rem, uppercase, 0.1em | 1.3 |
| Meta | `.type-meta` | 0.875rem, sentence case, 0.04em | 1.4 |

Rules:

- Nothing on index, chrome or card surfaces is smaller than 12px. Bespoke
  diagram widgets inside posts keep their own tuned sizes.
- Muted text uses `--muted`, not opacity (`text-fg/40` failed contrast).
- Mono is for code and numbers, not labels.

## Layout

- Light mode is warm paper everywhere (`--bg: #f4f1e9`); dark mode is a warm
  charcoal (`--bg: #111312`). Canvases keep `--stage` / `--diagram-paper`.
- Content sits in the header's 72rem column. Articles, the vectors library and
  the footer all align to it.
- The breadcrumb is one full-bleed strip directly under the header on every
  page (`.breadcrumb[data-site-breadcrumb]`), even when a page renders it
  inside its own column. Secondary bars (the LLM benchmark nav) stack beneath
  it using the measured `--site-nav-height` and `--site-breadcrumb-height`.
