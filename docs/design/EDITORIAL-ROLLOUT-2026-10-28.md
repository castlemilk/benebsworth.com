# Editorial reading-surface rollout

Reference: accepted editorial-system lab on preview commit9b30281b278435ccdf8ed52e1d42fd1b2a98c625. Mode: Read. Goal: coherent typography, hierarchy and useful handwritten annotation across real post types, not an identical decorative wrapper.

## Scope
- Shared article masthead: existing topic/date/reading time/author/title/deck/tags, no topic glow or dashboard pills.
- Authored takeaways and author biography: quiet ruled folio, exact copy and destinations preserved.
- Home Latest writing and related posts: one semantic ReadingEntry with correctly nested h3 titles, optional existing imagery and machine-readable dates.
- LabSide: available-width container query, identical loading/live figure structure, full commentary preserved, semantic captions.
- TOC typography aligns with the reading surface; observer and navigation behaviour unchanged.

## Review decisions
Existing local primitives and Gamma foundation cover the job; no new rendering or component library is needed. Preserve Source Serif4/Caveat/Barlow and existing red measured Rough.js marks. Reuse rather than duplicate the annotation engine. No generated labels, scientific claims, article content, simulation parameters, source links, release flags or metadata are changed.

The design helper could not initialise its engine in the restricted home directory; maintained DESIGN.md, post-pattern docs and source were inspected directly. Applicable frontend-design, premium, Impeccable and React guidance informed the review. The user's accepted visual direction supersedes generic defaults.

## Verification gates
Component tests cover text/routes/date semantics, heading hierarchy, optional/empty fields and loading/live figure composition. Existing MDX preservation/compilation and annotation geometry tests remain required. Full verify/build and rendered desktop/narrow preview evidence must be recorded separately before visual acceptance. The live Vercel preview currently requires sign-in; no protection or credentials are changed by this work.

## Flow and build corrections
- Capture diagram prose through Python stdout rather than opening a process device; regression tests cover captured pipes, Unicode and normal files.
- Include diagram renderer and diagram JSON in Markdown generation fingerprints so corrected prose is regenerated rather than reusing stale output.
- Use Node's tsx import loader for build exports and CLI subprocess tests, avoiding an unnecessary IPC listener without changing assertions or skipping tests.
- Preserve the artifact integrity test's two-space manifest semantics while removing its lint error.
- Scope warm paper to light-mode article/archive routes; preserve dark theme, landing/lab identity and scientific stage colours.
- Inline article controls use an optional ruled editorial variant, while the standalone lab retains its existing panel.

## Render evidence
Actual local static-export previews were inspected at approximately 1170px desktop width: homepage Latest writing, RLC article masthead, diagram, four controls, full caption/commentary, red FieldNote, and the accepted editorial reference. No overlap or clipping was observed in those inspected regions. Initial diagram absence resolved after mounting; full authored commentary remained present. No page-origin console error was observed. Narrow-window and deployed visual acceptance remain outstanding, not inferred from unit tests.

The initial full Task verification passed 1,598 tests with five explicit skips; subsequent scoped palette/control refinements require a fresh final verification. Full static build passed including Markdown siblings, benchmark exports, OG rewriting and Pagefind. No paid generation or deployment-protection change was used.

Additional review corrections: restore existing theme-safe topic ink, inherit red handwriting at page scope for the sibling TOC, and hide Copy when inline controls have no copy operation. Supplied standalone Copy handlers remain functional. The results-invariant script passed all applicable checks over 269 records; 1,396 log-dependent checks were skipped because retained run logs are absent and 178 records predate bundles. The script was invoked through Node with the tsx import loader because the Task CLI entry needs unavailable IPC sockets.

Final verification: Task verify passed (114 test files, 1,604 tests passed, five explicit skips); full forced Task build passed, including 534 static pages, OG rewrite and Pagefind indexing 76 pages. The separate Node regression suites passed 19/19. This is local source/build evidence, not deployment or narrow-window acceptance.
