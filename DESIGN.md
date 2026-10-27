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
