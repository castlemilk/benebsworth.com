# Labs field notebook — 1 November 2026

Baseline: 533f9e346ab5f74e6b0be73bb4133820b4b09731, PR83 base codex/gamma-blog-editorial-20261027. User endorsed the field-notebook concept direction and requested implementation. Scope is the Labs landing page, not an unreviewed global redesign.

Acceptance: retain all four research destinations; feature a real existing experiment rather than generated scientific art; reuse custom topic SVG; responsive light/dark typography, visible focus and intact discovery→experiment→return journey. No category/filter/data changes.

Changes: serif editorial opening; authored red note and curved connector; actual Wave Superposition preview; four numbered compact research links; warm light-theme paper and coordinated existing dark palette; quieter experiment card framing. Reused existing fonts, renderer and icons. No new dependency or illustration generation.

Five critique layers (manual lenses; named packages were not installed):
1. design-taste-frontend: research utility blocks previously dominated the opening. A featured experiment and compact index now clarify the entry task. Check whole viewport, not just the new component.
2. gpt-taste: pale rounded card repetition weakened identity. Restrained paper, editorial type and purposeful note replace decorative repetition.
3. frontend-design: two-column desk collapses to one; index becomes single column at390px. Do not crop scientific preview or substitute conceptual imagegen art.
4. Impeccable: preserve named search/filter controls, explicit focus outlines, real links and readable contrast. Existing canvas reduced-motion logic retained; no new animation added. Device/screen-reader certification not claimed.
5. Hallmark: custom Physics atom stays canonical. Initial arrow glyph rendered as a missing character in the actual browser; replaced with explicit SVG icons before final review. Scientific detail pages still have older visual framing and glyphs, a separate next slice.

Initial test failures were assertions expecting trailing slashes that Next Link normalises in standalone rendering; changed assertions to accept either equivalent path. Functional results and visual acceptance are recorded separately below. No push/deployment claim; GitHub write authentication remains unavailable.

Final functional evidence: 1,782 tests passed, 5 skipped (138 files passed, 2 skipped). TypeScript and scoped ESLint passed. Two-worker Next export535pages, OG rewrite and Pagefind76pages completed. Temporary build cpus setting restored; no dependency/lockfile changes. Actual browser: feature link opens Wave Superposition; keyboard Right changes Frequency1 from2 to2.1; Back returns to Labs. 390px iframe category selection returns7Physics results. Actual desktop and390px iframe light/dark screenshots captured; this is not physical-device certification. Review-only narrow.html wrapper is outside repository and publication.

Visual outcome: editorial hierarchy, visible handwritten guidance and compact tools index now match the selected concept direction without replacing scientific rendering. Remaining gap: experiment detail header and existing per-category section rhythm have not been restyled in this slice. Screenshots are actual local output, not deployment evidence.
