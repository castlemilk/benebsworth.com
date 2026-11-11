# Reuse and extend editorial artwork

The `/vectors/` library holds two different kinds of assets:

- **SVG studies:** pure, parameterized models with configurable appearance and deterministic SVG export. See `.agents/skills/generate-svg-studies/SKILL.md`.
- **Editorial artwork:** generated raster PNGs. The original transparent master is served and downloaded unchanged. Matte selection is only a preview, not a recolor or a new export.

## Reuse

Browse the Editorial artwork section by name, alias or tag. Download the original PNG or open its stable `/vectors/#artwork-ID` link. The existing site search includes both kinds with distinct result descriptions.

For source use, import `ARTWORK` from `lib/editorial-artwork/registry.ts` and select its stable ID. Use `src`, `width`, `height`, and `alt` with Next Image (unoptimized for static export), contained sizing and lazy loading. Titles and descriptions belong in page text, not baked into the pixels. Typical display size is 160–360 CSS pixels. Do not upscale these square masters to poster-sized scientific evidence.

`public/artwork/editorial/provenance.json` is the public, downloadable inventory, including exact prompts, dates, dimensions, byte hashes, alpha checks, intended use and limitations. The same records live in `lib/editorial-artwork/manifest.json`; the invariant test requires exact agreement.

## Add a generated asset

1. Inspect current art direction and the asset inventory. Generate a new original through the image generation skill, explicitly requesting a transparent background. Keep exact scientific diagrams and canonical logos untouched.
2. Inspect the actual pixels on both warm paper and charcoal. Check for an invented checkerboard, paper rectangle, clipped strokes, stray marks and misleading scientific features. Preserve the original master; correction is another recorded generation, not an unreported trace or cleanup.
3. Copy the approved PNG byte-for-byte to `public/artwork/editorial/`. Use a stable kebab-case ID and versioned PNG filename. Never embed a PNG in a file called SVG to imply editability.
4. Add its record to both manifests: title, alt text, curated lowercase tags and aliases, intended use, honest illustrative basis, format/provenance, path, dimensions, bytes, SHA-256, generation date/tool, exact prompt, real alpha statistics and whether the master is unchanged. No private workspace paths, account IDs, storage URLs or secrets belong in public provenance.
5. Run `lib/editorial-artwork/registry.test.ts`, `components/editorial-artwork/collection.test.tsx` and `lib/generative-svg/search-build.test.ts`, followed by the relevant gallery/search regressions, typecheck and lint. The real emitted Pagefind test verifies every title, alias and tag. Preserve all existing SVG model invariants and original asset hashes.
6. Verify build, actual narrow/dark/browser image loading, keyboard navigation, history, downloads and print through authorized paths. Source tests and static alpha specimens do not clear browser or release holds. Never retry a denied or cancelled access request without the required authorization.

Artwork search indexes curated discovery metadata only, not prompts or caveats. A warning such as “not a measured winding” must not advertise a measured-winding capability. Do not copy raster entries into the procedural study registry or expose nonfunctional SVG styling controls for them.
