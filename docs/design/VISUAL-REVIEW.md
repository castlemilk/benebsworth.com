# Reference-led visual review

## Authority and scope
Resolve the exact surface, accepted reference, source revision and deployed revision before judging it. Current owner-approved art direction outranks generic design-skill defaults. Keep each product's visual identity separate. Gamma owns maintained controls and interaction behaviour; it does not replace the product's artistic voice.

Review has two independent outcomes: **functional quality** and **art-direction alignment**. Passing tests, readable contrast and no overlapping elements do not establish visual fidelity. Never label an entire experience reviewed from one attractive crop.

## Evidence packet before edits
Record the route, revision, viewport, theme, content fixture and state for each capture. Pair the reference with the candidate at comparable viewport and scale. Include the first viewport, one complete content/task sequence, and a full-page overview. Capture wide and narrow layouts, a long-content case, and relevant open/loading/error states. If a viewport or signed-in state cannot be inspected, mark it unverified rather than inferring success from CSS.

Generated mockups establish intention, not a working interaction contract. Real screenshots establish appearance, not persisted data or execution success. Local previews and live authenticated views are separate evidence.

## Two reviews, then synthesis
1. Design critique first, without test results: what is the focal point, what does the eye visit next, and does that journey serve this surface's purpose?
2. Independent implementation review: semantics, layout constraints, contrast, focus, keyboard, resizing, overflow, state transitions and content preservation.
3. Combine only after both assessments. Mark subjective judgment, observed behaviour, source inference and unavailable evidence separately. Do not average a critical problem away with a high total score.

## Art-direction rubric
For every dimension record **aligned**, **drift**, or **unverified**, plus visible evidence and a concrete remedy.
- **Composition and hierarchy:** first, second and third focal points; headline/figure balance; whether navigation or metadata competes with the work.
- **Typography:** role, scale, line length, wrapping and contrast between display, prose and utility text. Sharing font names alone is not fidelity.
- **Spatial rhythm:** section cadence, meaningful whitespace, repeated rules and grouping. Test whether each border expresses a real boundary rather than a component wrapper.
- **Artwork and diagrams:** scale, crop, focal subject, useful detail and integration with surrounding text. Preserve factual/scientific content and distinguish artistic studies from verified diagrams.
- **Annotations:** a note must guide a real observation, limitation or action. Inspect text, target, curve trajectory, endpoint and clearance together. No random marks, decorative numbering or detached pointers.
- **Materials and colour:** surface relationships, restrained accents, semantic colours and theme-specific mapping. Do not copy one app's palette onto another.
- **Interaction/state composition:** open menus, selection, focus, validation, undo, loading and recovery must belong to the same design. A screenshot-perfect disabled control is a failure.
- **Adaptation:** hierarchy and annotation intent survive narrow columns, long text, zoom and theme changes; merely shrinking desktop is insufficient.

## Findings and acceptance
Each finding includes route/state, evidence crop or source location, reference principle, user impact, severity, owner component, proposed change and a falsifiable acceptance condition. Distinguish release-blocking interaction/accessibility failures from high-priority artistic drift and optional polish. Keep the next implementation batch to the three highest-impact findings.

Use two bounded rounds: one combined assessment, one batched correction and one confirmation capture. Do not repeatedly rebuild for isolated decorative tweaks. Preserve good decisions and explicitly note what should not change. If a new blocker appears, report it and scope the next pass rather than silently declaring acceptance.

The review record must state what was changed, what was actually verified, what is still unverified, and whether the result is local, staged or deployed. Never claim exact/pixel fidelity when content, viewport or reference differ. End with the next specific decision or correction, not “looks good”.

## Blog-specific artistic contract
Authority: the owner-approved `/lab/editorial-system/` study, captured from source 9b30281b278435ccdf8ed52e1d42fd1b2a98c625. The blog is a reading folio: Source Serif 4 narrative hierarchy, Barlow Condensed utility labels, short selectable Caveat notes and intentional red hand-drawn connectors/dots. The characteristic composition is argument + meaningful figure + useful margin observation, not cream paint applied to a generic documentation page. Use wide figure beats where they clarify the argument; do not force every essay into an illustrated experiment. Preserve exact article claims, equations and metadata.

Minimum representative set: RLC explainer, logistic-map experiment, a text-led essay or practical guide, archive and Latest writing. Inspect the opening, one figure/caption/commentary sequence, a long heading/note and the ending. A permanent TOC is supporting navigation, never the page's visual subject.
