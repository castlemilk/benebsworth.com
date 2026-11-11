# Science & Engineering Vector Pack — set 1

Vintage technical-textbook line-art ornaments (maths / physics / EE) for background
use, generated 2026-08-22 via the BrandBrain flow MCP asset-set pipeline
(session `flow_session_d810a57a2108`, run `36ceb911c4f5ae233a7e6bdd63c50951`,
template `icon-set`, gpt-image-2 contact sheet → split → rembg → normalize →
vtracer → review). Total generation cost: $0.25.

## Items (8)

am-waveform · dipole-field · wireframe-globe · rlc-circuit · lissajous ·
ruled-hyperboloid · phase-portrait · icosahedron

## Directories

- `png/` — transparent 512×512 masters, **cleaned**: rebuilt as flat #1e3a8a ink
  with darkness-derived alpha (kills white matte speckle/fringe on dark
  backgrounds), then despeckled (231 faint sub-16px dust islands removed;
  dashed strokes verified intact). Safe on any background color.
- `png-raw/` — the pipeline's original review-stage PNGs (kept for provenance;
  fine on light backgrounds, white speckles visible on dark).
- `svg/` — **canonical web set.** Monochrome traces of the cleaned masters
  (alpha-mask → vtracer bw), all fills set to `currentColor` so they recolor
  via CSS (`color: …`). 11–80 KB each.
- `svg-color/` — the 3 SVGs that passed the pipeline's vector-fidelity gate
  (multi-path indigo color traces). The other 5 items failed the
  `alpha_iou ≥ 0.74` gate (hairline/dashed strokes shift under tracing) and
  fell back to PNG-only; their `svg/` versions were traced locally.
- `_raw-sheet.webp` — the original 1536×1024 contact sheet.

## Usage

`currentColor` only inherits when the SVG is **inlined** in the DOM (or imported
as a React component). For `<img>`/`background-image`, tint with a CSS mask
instead:

```css
.ornament {
  width: 160px; aspect-ratio: 1;
  background: #1e3a8a; opacity: 0.5;
  mask: url(/vectors/sci-eng/svg/lissajous.svg) center / contain no-repeat;
}
```
