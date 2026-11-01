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

## Follow-up: annotation target (2026-11-01)
User feedback: “try changing one thing” did not point to anything. Moved the note from the unrelated research index into the Wave Superposition link, directly above the actual preview. Changed it to “Open this. Change a wave.” The curved arrow now ends at the preview at both desktop and 390px CSS width; clicking the instruction opens the experiment. No new animation or client state.

Manual five-lens correction: design-taste-frontend groups instruction with its object; gpt-taste removes purposeless decoration; frontend-design keeps a local arrow rather than viewport-dependent offsets; Impeccable preserves one keyboard-operable link and decorative SVG; Hallmark retains red handwritten lettering. React best-practices guidance reviewed; these five design lenses are manual, not installed automated checks.

Validation: 1,783 tests passed, five skipped; scoped ESLint and TypeScript passed; production export 535 pages plus OG rewrite and Pagefind 76 pages passed. A DOM regression checks that the note is inside the correct link, before its preview, and outside Research & tools. Actual desktop light/dark and 390px iframe review, plus clicking the note and adjusting Frequency 1, verified. Narrow review is not a physical-device test. Source changes do not establish deployment.

## Detail-page continuation (1 November, 13:23 UTC)
Scope: carry approved notebook style into the shared experiment detail route. CategoryIcon now replaces raw glyphs where approved assets exist; the visible category label remains. Serif heading, soft topic lozenge and explicit Explore/Read section links connect the landing direction with study pages. Missing explainers do not get dead Read links. EffectPlayground accepts the existing editorial Controls variant; underlying Gamma sliders, URL parameters and simulation modules are unchanged. Dedicated circuit/universe/black-hole pages are outside this slice.

Five manual critique lenses (not automated installed skill checks): hierarchy now connects category/title/simulation; generic boxed controls replaced with existing editorial styling; typography and responsive stacking inspected; named regions and 44px section targets preserve keyboard usability; custom icon and warm paper connect the family. Remaining limitation: prose examples have their own independent simulations/controls by design and have not been consolidated. No new decorative handwritten arrow was added without a target.

Regression: 1,785 tests passed, five skipped (139 files passed, two skipped); scoped ESLint and TypeScript passed; 535-page production export, OG rewrite and Pagefind76 passed. Actual desktop light/dark and390px dark iframe inspected; Frequency1 changed2→2.1 and reset2; Read link navigated to explanation anchor. Narrow is not a physical device. Full mobile-light, all60 experiment journeys, clipboard permission flow and screen-reader review not claimed. Source/PR candidate, not deployed; merge decision remains separate.
