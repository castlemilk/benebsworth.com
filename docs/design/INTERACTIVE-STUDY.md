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

## Arbitrary author-selected targets — 28 October 2026
`targetSelector` accepts a scoped CSS selector and may change during the life of
one study. The first matching non-guide element owned by that study is the
explicit target; matching a nested study never borrows its controls. Use unique
IDs or data attributes when the intended target is not the first match. This is
author-selected guidance, not random focus or automatic form selection.

While the guide is open, a thin deterministic red pen perimeter identifies a measured control
target, including an inset/grid control for which no safe gutter curve exists.
The curve still appears only when it can travel through reserved empty space.
Pure canvas/SVG plot targets retain the approved gutter cue without a large
perimeter around scientific output. The padded control perimeter is bounded to
the frame, including after internal scrolling. The perimeter uses the existing light/dark handwriting ink, has no fill and is
pointer-transparent, decorative and absent from print. It does not write target
styles, move focus, change text selection, set checked/value state or override a
native keyboard-focus outline. Keep hints specific enough to identify the target
without relying on the visual perimeter alone.

Native select/text/radio controls and authored slider, spinbutton, combobox,
checkbox/radio/switch, textbox or editable surfaces retain their own semantics.
Direct-manipulation adapters can continue to use `data-study-action`. Read-only,
disabled, inert, hidden, absent and malformed-selector targets do not offer a
guide; wrappers whose owned controls are all unavailable do not either. Selector,
attribute, replacement-node, resize and internal-scroll changes remeasure the
cue. They do not reset the mounted study's one-time automatic reveal/dismissal
state. No target-selection action is implied by mounting or showing a guide.

Regression coverage includes inset targets without unsafe connectors, dynamic and
malformed selectors, replacement nodes, arbitrary data-attribute changes,
unavailable wrapped fields, native/custom input interactions, retained focus and
text selection, and nested/broad-selector isolation. These are mocked-layout
component tests; real-browser theme/geometry review remains a separate gate.


### Target-selection verification
The editorial-system specimen now allows explicit Amplitude/Frequency/Damping guide targets using Gamma actions and ranges. It preserves values and focus when selecting a cue. Final local verification: 1,660 tests passed, five skipped; typecheck, lint and prose gates passed. Strict design audit reported zero findings. A full static export was attempted but stopped by the environment's blocked fonts.gstatic.com access after compilation/typecheck and partial route generation; this is not a successful full export.

The newly generated editorial route and its exact local JS/CSS were reviewed in the cloud browser against local static hosting at 1180×757. Middle- and right-column controls received a 4px padded pen perimeter; keyboard ArrowRight changed only frequency from 1.0 to 1.1 and dismissed the guide. Explicit replay/retargeting retained values and did not steal focus. No horizontal overflow. Narrow-device and new dark-mode browser capture remain unverified; existing palette tokens are reused. No merge or production deployment performed.
