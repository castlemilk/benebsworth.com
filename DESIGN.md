# Blog editorial implementation context

The maintained brand authority remains `.impeccable.md`: dark canonical technical dossier, Space Grotesk display, Hanken Grotesk body and JetBrains Mono metadata, with teal blog accents. Do not silently replace this with the poster editor’s graphite/cyan interface or import a whole external font theme.

## Gamma foundation, 27 October 2026
The hosted Gamma MCP supplied current Button and Range slider source and portable CSS. `components/gamma/PROVENANCE.md` records retrieval and local scope. `app/editorial.css` is the sole adapter to existing site tokens; `app/globals.css` imports only the selected component CSS and adapter. Exact Atelier tokens were reviewed, not adopted wholesale, to preserve the established identity and avoid remote font imports.

## Signature
A research folio inside the technical dossier: fine structural rules, semantic field notes, explicitly stated assumptions, and figures with a quiet reading annotation. Decoration points to meaning, never fabricates measurements. Body content is server-renderable and selectable. A field note is not an interactive dashboard card. Smaller screens place notes below figures and omit connector brackets.

## Scope
This first slice adds reusable MDX FieldNote, Assumptions and FigureFocus primitives, refines existing Figure frames and article hierarchy, and adopts Gamma actions in archive filters and Gamma ranges/actions in the shared lab controls. Existing computation, article content, URLs, theme switching, publishing and auth behavior are preserved. Remaining native legacy controls are not claimed as migrated.

## Verification
Static rendering, component behavior, typecheck and full three-phase export are separate gates. Catalogue review is not browser evidence. Preserve review-first article publication; this UI branch must not include or replace PR77 content.

## Corrected artistic direction, 27 October 2026
User rejected the initial specimen because handwritten lines, typography and hierarchy were missing. The research-folio references now take precedence for blog reading surfaces: Source Serif 4 titles/body, Barlow Condensed short technical labels, Caveat for short selectable margin annotations. Gamma remains the controls layer, not the artistic voice. Existing site navigation and other route identities remain intact. The specimen uses a paper/graphite/copper canvas; articles retain supported theme contrast through scoped mappings.

Bundle the three fonts locally with their SIL OFL notices. No browser calls to a new font provider. Curated deterministic SVG arrows, underlines, brackets and circles are separate from exact scientific geometry. AnnotatedBlock requires one matching AnnotationTarget and MarginNote, rejects missing/mismatched/duplicate children, and keeps meaningful target links. Notes stack under targets on mobile/print; cross-block document-wide duplicate-ID validation is still TODO. No random marks or manually placed page-wide connectors.

## Archive continuation
The archive heading and reading entries now share the research-folio typography. A selectable Caveat note links to the search/topic index; its deterministic underline/arrow is decorative, never a scientific trace. Plain ruled FolioEntry replaces pointer-tracking spotlight cards in the archive. Existing post ordering, data, routes, topic identity, light/dark theme and Gamma filters remain. Entry metadata has a larger minimum type size. Site navigation and non-blog routes are not restyled.

## Target-aware annotations
27 October screenshot review: the isolated underline was letterboxed inside a tall SVG viewBox, while decorative arrows ended in empty space. HandUnderline now measures text fragments and draws one deterministic stroke per wrapped line, with a native underline fallback. AnnotationLayout measures target/note rectangles, routes connectors through their gap, and uses an explicit data-annotation-anchor when a diagram has a meaningful feature. ResizeObserver, font readiness and target mutations refresh the geometry. Overlapping or narrow layouts suppress connectors and stack selectable notes; above, margin, below and grouping-bracket placements are supported. The wire rim and live signal peak provide actual geometric targets. These are visual reading aids, not new scientific evidence.

## Curved connectors at responsive widths
User feedback on 27 October: keep purposeful bowed connectors, including when the viewport crosses 760px. The old viewport cutoff hid the line entirely. Notes now move above their own targets on narrow screens (explicit below placements remain below); the same measured geometry reconnects them instead of disabling decoration by viewport. Cubic controls bow perpendicular to the endpoint chord, including vertically aligned endpoints, and are bounded by the target/note region. Short paths scale the flourish down. Underlines use a shallow sweep, not a ruler-straight double stroke. Overlap, unmeasurable layout and print still suppress decorative paths. This supersedes the earlier blanket mobile omission rule.

## Pen-drawn gesture
User refinement: more hand-drawn rather than mathematically smooth curves. Connectors and measured underlines use the same deterministic seven-segment pen gesture with small asymmetric drift, exact endpoints and uneven curved arrowhead legs. No per-render randomness, animated jitter, or alteration to the scientific drawing itself. Responsive anchoring remains unchanged.

## Excalidraw reference refinement
The user explicitly selected Excalidraw as the stroke-style reference. Rough.js 4.6.6 now owns the decorative sketch treatment: fixed seeds, double strokes, roughness 1.45, bounded randomness offset 3, and preserved vertices. This replaces the bespoke seven-segment wobble. The same helper serves connectors, arrowheads, brackets, circles and measured underlines. The diagram data/geometry, fonts, Gamma controls, resize measurements and endpoints are unchanged. Dependency pinned with lockfile; no full Excalidraw editor or font replacement. Reference: https://github.com/rough-stuff/rough/wiki .

## Red note writing
The user requested red writing on notes. Dedicated handwriting ink is #b32624 on paper/light surfaces and #ffaaa5 on dark articles/archive. Apply it to handwritten margin/figure notes, field-note titles and archive note prose. Keep body text, figure geometry, connector ink, copper headings and Gamma controls unchanged. Both ink variants meet 4.5:1 on their supported surfaces; this is text colour, not a new warning state.

## Matching red annotation lines
Follow-up request: match the sketch lines to the red note writing. Connector overlays, decorative arrows/brackets/circles and measured underlines now use the same light/dark handwriting ink. Scientific SVG strokes and plot colours remain unchanged. This supersedes the earlier connector-colour preservation rule, without changing geometry or resize behaviour.

Anchor dots use the same red handwriting ink for both fill and stroke. The live signal anchor is painted after the polyline so its centre remains red at the attachment point; scientific trace colour/data are unchanged.

## Column-aware refinement
Notes now respond to the figure container width as well as the window breakpoint: at 620px or less of available figure width, notes occupy their own row above the figure (explicit below stays below). This preserves illustration space inside narrow desktop article columns without dropping the curved red connector. Note links use a 44px minimum target and 12px label; handwriting wraps within 22ch. The shared measurement lifecycle reconnects optional/replaced notes, responds to mark changes, and excludes nested figures from outer-note selection. Stable Rough.js styling and scientific geometry remain unchanged. Unit layout tests use mocked rectangles; container-query appearance still requires real-browser visual verification.

## Post-family authoring system
The approved style now has shared PostBrief (explainer, experiment, essay, practical guide), EvidenceNote (explicit evidence basis and optional limits), and MethodSteps (real ordered procedure) MDX primitives. They inherit existing type and ink rather than separate card themes. Titles, author/date/canonical metadata, factual article content and publishing flow are unchanged. The editorial study demonstrates the patterns; docs/design/POST-PATTERNS.txt gives composition recipes. Repeated coil illustrations now use React-generated unique gradient IDs. Cross-block authored target-ID validation and real-article/browser rollout remain open.
