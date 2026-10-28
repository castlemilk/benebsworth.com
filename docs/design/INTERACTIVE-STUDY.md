# Shared interactive study frame

## Owner-selected direction
On 28 October 2026 the owner selected the **open margin folio** concept: an open-right fine ruled boundary, subtle cross-tick corners, continuous paper, and a purposeful red handwritten cue. The request also requires light/dark compatibility and a light-touch helper that appears when the study scrolls into view and disappears when used. This is a functional shared component, not raster UI or a modal onboarding tour.

The generated reference is visual direction only. Its diagram, values and prose are not replacements for the real model or authored content. Do not introduce fake experimental status, numbered measurements, a new scientific claim or an iframe permission change to imitate the image.

## State and interaction contract
- A study has its own guide state. It does not share dismissal with another instance.
- A guide may appear automatically only when the component is ready, its genuine target is at least 15% visible and the reserved hint region is at least 75% visible. This prevents a detached arrow appearing before its readable instruction. Loading placeholders and absent targets do not receive misleading pointers.
- A meaningful enabled interaction dismisses the guide: changing a control, activating a button or using an explicitly marked direct-manipulation surface. Hover, ordinary scroll, Tab traversal, focus alone and clicking empty frame space do not dismiss it.
- After dismissal, scrolling away and back does not show the guide again during that mounted instance. Changing or resetting model values does not reset onboarding state.
- A persistent, keyboard-accessible Gamma Show guide/Hide guide control lets readers return to the cue. Showing it never steals focus, changes model data or starts an animation/run.
- No storage, tracking or network request is needed for this state. Remounting a genuinely different study starts a fresh instance.
- Nested studies resolve their own target and interaction events. Inner activity must not accidentally dismiss an outer study.
- Reduced motion removes guide arrival/exit motion; all state changes and controls remain usable. The implementation must clean up observers/listeners when removed.

## Composition and accessibility
Use existing paper/ink/border tokens and explicit readable red handwriting in both themes. Do not recolour scientific encodings. Keep the guide as selectable text and its measured connector as a separate decorative SVG. The pointer must land on an actual target and be routed through reserved space, not through labels, plots or controls. Neither annotation nor its invisible hit area may intercept input. Avoid a layout shift while a reader drags a control.

Preserve existing figures/captions, control labels, bounds, keyboard behaviour and live output. The frame's actions are real controls; do not add fake Expand/Play buttons just because a mockup contains them. Helper text describes an existing affordance, not a scientific conclusion. Missing IntersectionObserver/measurement capability must leave the study usable and the manual guide affordance honest.

## Adapter model
InteractiveStudy accepts a title, optional hint, scoped target selector, readiness, stage/content children and optional controls. The target marker defaults to data-study-target. Direct manipulation may be marked data-study-action. Adapters retain their own renderer, data and event handlers.

The initial integration covers the shared LabCanvas/LabSide family plus representative canvas drawing, SVG manipulation, DOM sampling and shared demo framing. This demonstrates a common mechanism across types, not a claim that every legacy custom embed has been migrated. Sandboxed third-party/generated artifact frames require a separately validated interaction bridge; do not loosen sandbox policy or infer an interaction from focus merely to dismiss a cue.

## Acceptance evidence
Required automated cases: not ready/offscreen, visible first entry, pointer and keyboard use, change/input, no dismissal on focus/Tab/background, explicit replay, no reappearance on re-entry, multiple/nested instances, missing/replaced targets, observer cleanup, reduced motion, readable light/dark ink and unchanged model behaviour.

Required consuming-browser pass: scroll into a canvas/controls study, dismiss by real interaction, scroll out/in, show again, inspect a second instance independently, verify target/curve placement without overlap in light and dark, and inspect one non-canvas adapter. Record narrow-window limitations rather than deriving success from source queries. Keep local source, CI and deployed acceptance distinct.

InteractiveStudy is also registered in the shared MDX component map for future authored adapters. Mark the full honest interaction region (including its label/padding where appropriate), rather than pointing to an arbitrary decorative pixel. Container-specific paper palettes are read by EffectCanvas from its wrapper; standalone canvases continue to inherit their normal palette. The plotted values and encodings are unchanged.

## Verified initial rollout — 28 October 2026
The shared frame is wired into LabCanvas/LabSide, TokenSampler, ThresholdCurve, GameOfLife and DemoFrame. DemoFrame callers opt into truthful hints; existing callers without a hint do not gain invented guidance. ArtifactFrame and other legacy bespoke embeds are not claimed as migrated.

Final automated verification: 1,649 tests passed, five explicitly skipped; full two-worker static export passed. Actual local browser at 1180×757 confirmed RLC offscreen hiding, entry reveal, no dismissal on Tab/focus, dismissal on keyboard range change, no reappearance after scrolling out/back, and explicit replay without value/focus change. A second study remained independent. Light/dark guide ink and scoped stage palette were verified and light mode restored. ThresholdCurve direct SVG drag changed its real operating point and dismissed its guide; hint typography remained Folio Hand24px. Curves stayed in empty gutter space, with no horizontal overflow or application/ResizeObserver errors.

A consuming-browser refinement now waits for both the target and readable hint region before automatic reveal. The final targeted check showed no detached arrow while the note was offscreen, joint reveal once both were visible, and working drag/replay afterwards. Narrow-device and browser reduced-motion emulation remain unavailable; reduced-motion behaviour has unit coverage. Screenshots are local implementation previews, not deployed acceptance.
