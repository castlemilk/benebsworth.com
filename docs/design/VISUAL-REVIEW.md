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


## Required interaction-state review

A component is not accepted from its resting screenshot alone. For every changed interactive surface, keep a short state record with **observed**, **automated**, **source-only**, or **unverified** evidence. Record the exact source revision, viewport, input method, theme and artifact path. Run the applicable cases together in the bounded review pass:

- **Desktop pointer:** resting, hover entry/exit, pressed, repeated actions and disabled behavior. Confirm hidden actions do not intercept clicks and that reveal controls are anchored to the content they operate on.
- **Keyboard:** enter and leave with Tab/Shift+Tab, visible focus, Enter/Space activation, arrow keys where appropriate, Escape and focus return. Hover-only controls must reveal on keyboard focus. Repeated navigation must not replace the focused element.
- **Touch and hybrid devices:** keep essential actions discoverable without hover, including a fine primary pointer with any coarse pointer. Distinguish deliberate swipes from vertical scrolling and taps on overlaid controls. Never let one gesture navigate twice.
- **Mobile and zoom:** test the narrow layout and a short viewport, target size and spacing, portrait/landscape media, overflow and containment. Anchor overlays to actual displayed image bounds, not an object-fit letterbox. Preserve a readable image and accessible counter.
- **Recovery:** loading, absent dimensions, broken image/request, empty/single-item sets and content changes while open. Keep recovery controls usable, preserve source truth, and do not silently reset the user's selection.
- **Motion and contrast:** inspect light/dark and focus contrast over both bright and dark imagery. Verify reduced-motion and forced-colors behavior where available; otherwise label these source-only or unverified.

Name tools and skills honestly in the record. A Gamma catalogue validation result, a read skill file, a manual Hallmark/design-taste lens, an independent review and an executed automated command are different kinds of evidence. State the actual tool/command, result and receipt for execution claims. If a named skill is unavailable or was only read, say so. Never infer that it ran because its checklist informed the work.

### Hiking viewer feedback, 5 November 2026

The owner supplied an image with a compact dark previous/next pair inside the photograph's upper-right corner. The requested behavior is desktop hover reveal, with keyboard-focus reveal and always-visible mobile/touch controls. The current refinement retains the existing photo count, full-size link, wraparound navigation, Escape/focus return and map handoff. The review must include arrows hidden at rest, revealed on pointer hover and keyboard focus, mobile visibility, repeated navigation retaining focus, and image-error recovery. An actual preview is separate from a production release; the existing release decision is unchanged.

For this bounded pass, the installed Hallmark v2.0.0 `sloplint.mjs` ran with `--scope component --genre editorial`, and design-taste/tasteskill v2 `lint.mjs` ran on the four changed implementation/style files. Both still exited 1, not a clean automated pass. The first candidate had Hallmark 36 FAIL/2 REFLEX/2 WARN and taste 7 FAIL/5 WARN. After correction, Hallmark reported 11 FAIL/0 REFLEX/1 WARN and taste 5 FAIL/4 WARN; the unchanged 1187f36 baseline was 29/3/2 and 6/5 respectively. Resolved: new literal colors, duplicated viewer styles, transition-all, moving-photo hover, decorative resting button shadows and off-scale padding. The overlay focus ring is now inset on its dark surface so bright sky does not determine its contrast.

Remaining findings are explicitly triaged, not silently suppressed. Hallmark does not recognize the local component token block (7 flags), flags a genuine photo-legibility scrim (1), joins separate native-option strings when checking separators (2), and expects its own certification stamp (1). Its numeric-status warning refers to prose loading/error messages. Taste flags the gallery/filter boundaries (2), the owner's requested paired-control divider (1), that same allowed neutral photo scrim (1), and a functional selected-area ring (1). Its four outline warnings refer to real selectable areas, native controls, the overlay and forced-colors support. These should remain unless a future actual interaction review finds a defect. A fake clean certification stamp, global palette refactor or removal of accessible focus/selection affordances is not a fix.

Exact commands, script hashes and raw initial/baseline/corrected outputs are retained in the local review receipt. The skills' direct-browser inspector/render tiers were not executed; supported-browser captures and independent visual review are separate evidence.

The component preview confirmed desktop resting/hover/focus states, equal image/frame bounds, 46px arrow targets, an accessible persistent counter, and focus retained after wraparound navigation. The narrow preview confirmed in-image controls with the pointer outside the photograph. Automated tests additionally cover image-error recovery, missing image dimensions, single-image behavior and preventing a touch on an arrow from also triggering a swipe. Touch/hybrid hardware, forced-colors and reduced-motion rendering remain unverified by a physical device; the latter two have source CSS support. Exact full-page validation belongs in the candidate's acceptance receipt, not in these reusable instructions.

### In-photo expand action

The same owner reference includes a separate expand square immediately before the paired arrows. Keep that action inside the actual photograph frame and in the same reveal group: hidden at desktop rest, visible on pointer hover or keyboard focus, and always visible on narrow or touch-capable layouts. Preserve the original-file link behavior rather than silently introducing browser fullscreen. Its accessible name and title must state that it opens the full-size photo in a new tab.

The state matrix also requires the expander to survive single-photo and failed-image states, retain focus when arrow navigation changes its destination, and avoid turning a touch on the link into a second swipe action. Validate its actual destination through keyboard activation, not merely the presence of an expand icon. Review landscape and portrait image bounds in a short viewport. Keep the counter, Close, captions, filmstrip and map handoff as separate working controls.

### In-photo location action

The location handoff is a compact map-pin icon alongside expand and the arrow pair, not a separate “show photos” text button. It shares the same in-photo bounds and desktop-hover/keyboard-focus reveal, and remains visible on narrow/touch layouts. Its accessible name/title identifies the verified approximate photo area. It is absent when the photograph has no verified reference-area connection; provenance warnings remain intact. The owner's later simplification request removes the separate footer Location link, without changing stored coordinates or other source data.

Activating it closes the viewer, selects that photo area and focuses the map without an initial browser jump, then scrolls smoothly. Reduced-motion preferences use an instant scroll. The acceptance matrix must include icon-only appearance, useful accessible name, actual selected-area/focus readback, lost-focus recovery when moving from linked to unlinked photographs, and no swipe caused by touch drift on the icon. Preserve the original-file expander, count, Close, captions and filmstrip. The local candidate is not evidence of publication.

### Hover exit and simplified controls

Pointer activation must not keep the photo toolbar visible after the pointer leaves the actual image. Use keyboard-visible focus, not all `:focus-within`, for focus reveal. Keep the focused native element and make keyboard reveal immediate. Narrow/touch/hybrid layouts and failed-image recovery retain discoverable controls. Verify hover exit after both an arrow click and returning from the full-size original, not only before any interaction. The existing full-size action opens the original in a new tab, where no application toolbar is rendered; it is not an in-app expanded/fullscreen mode.

Keep exactly one location icon when a verified map area exists, one full-size action and one previous/next pair for multiple photos. Do not repeat a Location text link in the footer or add a “show photos” button. Tests count these actions and protect the map handoff and source identity. CSS-contract tests are source evidence, not a substitute for actual desktop hover/keyboard and narrow screenshots; mark rendering unverified whenever the browser cannot reach the candidate.

### Portrait scrolling and an always-reachable exit

Review the narrow viewer after vertical scrolling to the caption and filmstrip, not only at scrollTop zero. Keep the title, photo position and single Close button outside the scrollable photo/content region. The photo and caption may scroll naturally, but the header must not overlay them or shrink away. Do not add a duplicate Close action or reduce the full photograph just to force everything into one viewport. Verify that keyboard focus scrolls content controls into view, thumbnail navigation preserves the current source, Escape/Close restores the opener, and the page behind remains locked. A resized pointer browser proves narrow layout and native scrolling, not physical touch gestures.


### Location-icon arrival at the selected marker

Review location return with a southernmost photo as well as a northern one. The existing icon should close the viewer and bring its actual selected coarse-area marker fully into view, including its label below the photograph stack. Focus the selected singleton/group without activating its chooser; keep grouped selected-area context available to assistive technology. Centre the marker clear of sticky navigation and short viewport edges, preserve reduced-motion instant arrival, and retain the map-figure fallback if no marker exists. Test grouped keyboard open/selected-row/Escape and returning repeatedly from different photographs. This is an arrival/focus correction, not permission to redesign the map, change its copy or infer precise locations.

### Keep the current photograph visible in its filmstrip

For long galleries, open a late photograph directly and navigate across both ends with the paired arrows and keyboard. The selected thumbnail, including its ring, should remain horizontally visible. Reveal only the necessary horizontal distance, immediately, without moving keyboard focus, the main photo scroller or the page behind it. A fully visible thumbnail needs no scroll. Preserve manual filmstrip browsing until the selected photo, gallery contents or strip width changes. Test resizing, thumbnail activation, short/single-photo sets, caption-depth navigation and opener restoration. Do not use ancestor-scrolling scrollIntoView or move focus to make the selected thumbnail visible. Narrow pointer evidence is not a physical swipe test.

### Keep keyboard commands within the active surface

Interrupt the photo viewer with Ctrl/Cmd+K site search. Left/Right must edit the search query without changing the photograph underneath; search Escape must close only Search, returning to the same viewer control with body scrolling still locked. Only the next Escape in the viewer should dismiss it and restore its original opener and pre-existing scroll state. Repeat shortcut toggling and pointer dismissal. Keep ordinary viewer arrows and Tab/Shift+Tab containment, but leave handled events, composition and native modified shortcuts alone. Test actual cursor movement and dismissal in the built browser; mocked native-dialog methods or synthetic composition tests are not top-layer, native IME or physical-device certification. No extra buttons or modal styling are needed for this interaction fix.
