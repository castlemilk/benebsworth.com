# Verification

- 2026-11-21: Read the supplied PDF and cross-checked model card and authors’ contamination analysis; evidence and page references in sources.md and ARTICLE.md. No independent inference run.
- Prose lint: passed with 0 hard errors and 29 advisory warnings.
- MDX syntax: compiled with @mdx-js/mdx.
- Markdown sibling generator: isolated copy skipped the draft, wrote 0 files. Source remains release: false and draft: true; no public sibling exists.
- Full site build, unit suite, rendered browser review and e2e: not run. An attempted isolated copy was stopped; the checkout contains extensive unrelated edits and generated assets. No claim of visual verification.
- Artwork: not generated; brief only. Human editorial and factual review pending.

## Research study integration

- 2026-11-21: Added separate research packet, original-question quiz, written answer key and progress record. Added a Study index link and linked the unpublished blog draft to the packet. Research source is attributed to Aleph Alpha, not the MLSys book.
- TypeScript and targeted ESLint passed. Existing study markdown tests: 10 passed.
- The local Next dev server started but did not finish compiling the research route within 60 seconds; browser navigation and a separate HTTP request timed out. No end-to-end, visual or production-build verification is claimed.
- Research packet diagrams, generated audio, Anki and flattened Markdown export have not been added. The existing book-only generation pipeline does not cover this research route.

## Continued verification

- Created original sparse-routing SVG and mirrored it under the research study public path. Inspected a raster rendering and added a light background for readable ink on dark pages.
- Added study-specific Markdown and Anki endpoints. 13 targeted tests pass across exports and the existing study Markdown renderer, including rendering the actual packet. TypeScript and targeted ESLint pass.
- Synthesised a 336.45-second AAC audio overview. The public and source transcripts match; all 23 segments have word-level timings. Audio and transcript are wired into the research page when both exist. No listening or browser playback assessment was performed.
- Next dev with Node 26, both Turbopack and webpack, timed out while compiling; a home-page request also timed out. A further Node 22 attempt was made. A full production build and browser end-to-end pass remain outstanding.

## Browser verification after route fix

- The initial 404 was caused by the public asset directory at the page path; moving the sketch to `/study-research/kolibri/` restored the route.
- Node 22 dev server: research page, study index, Markdown and Anki endpoints all returned 200. Browser showed the packet and sketch; selecting the first correct answer showed 1/7 answered and 1 correct. The audio player started, loaded the hosts and 23-segment transcript, and advanced. Desktop and 390px mobile screenshots inspected. No listening review or full quiz completion was performed.
- Targeted renderer/export tests: 13 passed. TypeScript and targeted ESLint passed. A full production build and built-site e2e suite were not run.

## Expanded architecture study and figure reader

- Rechecked the reported architecture against the released config. Independently calculated 3.457B active matrix weights and idealised FP8 KV budgets of 2.52 GiB at 262,144 tokens and 10.02 GiB at 1,048,576 tokens.
- Extracted, visually inspected and archived 12 PNGs from the 189-page vendor PDF. The archive includes author attribution, page links, crop disclosure and a reading guide. Verified all four original study SVGs and the two blog mirrors.
- Blog prose lint passed with zero warnings. The site MDX options resolved both asset URLs. The Markdown generator excluded the draft. Eighteen targeted tests passed across the study renderer, exports and MDX pipeline.
- The Node 22.9 isolated build stopped in the artwork generator with an ESM compatibility error. The workspace's Node 22.20 toolchain completed `task build`, including TypeScript, static export and search checks. The output included the Kolibri study and both exports and excluded the draft blog route.
- Playwright completed all 12 quiz questions and verified scoring, audio playback, diagram loading and exports on the development route. A second browser check against the static export verified navigation from Study, all four diagrams, quiz interaction, audio playback, both exports and mobile width.
- The first disposable blog preview scanned generated HTML into Tailwind because the isolation copy lacked the repository ignore file. Restoring the ignore file and moving the export outside the preview root resolved it. The browser then loaded the draft with the site's stat components and both SVGs, found its study link and checked mobile width. Desktop and mobile captures are under `output/playwright/`. The working draft was excluded from the production export.

## Interactive diagrams

- The workspace already had React 19, both ui-sdk packages, the prescribed Tailwind import order, and the AGENTS.md docs rule. The skills CLI installed Anatomy and refreshed the official ui-sdk skill for Codex. The lock records both source commits.
- The same component renders on the study route and in the blog draft. The token stack responds to stage changes, the router keeps weights independent of selection bias, and the Bklit chart models both cache layouts. The new repo skill records when to use these patterns and their verification requirements.
- The first touch probe exposed ui-sdk’s coarse-pointer overlay on the wrapping label. The cache presets now use the radio buttons as their full tap targets. The phone regression test covers that interaction.
- A reused isolated Pagefind directory contained empty files. A clean regenerated index passed, followed by a production build into a fresh export. The generated blog sibling remained excluded by the draft flags.
- Twenty-one targeted Vitest tests passed, including an agent action that found and changed the router controls by name. Playwright covered navigation from Learning, keyboard interaction, cache values and mobile touch against the exported site. The isolated blog preview also passed the mobile tap and chart check.

## Performance figures

- Cross-checked the published benchmark values and evaluation settings. Added three original charts for checkpoint gains, RULER context scaling and decode throughput relative to Kolibri Origin.
- Diagram lint passed for six blog sections and eleven study sections. Targeted ESLint and five Vitest checks passed. Blog prose lint reported zero errors and one advisory warning.
- Five Playwright checks passed on the refreshed local export. They covered the two routes, figure loading and placement, mobile layout, exact table values, Markdown exports and the existing interactive controls.
- The disposable build compiled and generated both pages. Pagefind emitted an empty index entry. Regenerating the preview index from Pagefind’s in-memory output passed the search and export checks.

## Benchmark links and table presentation

- Checked each benchmark link against the original project, dataset, paper or competition organiser. Verified all 27 score rows and their bold leaders in the Markdown sources.
- The two site renderers use the same percentage bars and row-leader labels. Nineteen targeted unit tests and eight Playwright tests passed, including exact scores, ties, provider links, Markdown output, mobile layout and link contrast in both themes.
- The disposable preview build passed with the Pagefind in-memory output workaround.
