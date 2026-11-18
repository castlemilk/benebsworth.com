# Motion and interaction contract

This contract is offered to BLOG KG 02 and BLOG DESIGN 03. It is implemented and source-tested in the standalone specimen; production integration and rendered acceptance are pending. It does not decide graph semantics, the production URL schema or the existing UI SDK boundary.

## Authority and responsibilities

| Owner | Responsibilities retained | Motion receives |
| --- | --- | --- |
| Graph model and source mapping | Stable IDs, node/edge types, evidence, aliases and source truth | An already validated selection identity; no inferred equivalence |
| Graph views and reader journeys | Root/selection state, views, source links, URL/history, inspector layout and explicit focus actions | A committed action origin and an owned decorative element |
| Editorial design system | Component anatomy, typography, spacing, states, focus appearance and shared tokens | A final visible target; local workbench values are not global token proposals |
| Category artwork | Original artwork, alpha, subject identity, provenance and usage guidance | An explicitly decorative wrapper, never a factual scientific trace |
| Existing InteractiveStudy | Ready/visible first entry, meaningful-use dismissal, per-instance replay, target geometry | Optional guide-visible feedback after the owner has made the state decision |
| Motion | Finite cue, preference observation, effect cancellation and scoped teardown | No navigation, selection, document scroll or semantic-state authority |

Graph and design owners can adopt the primitive without adopting the specimen's query keys or UI layout. A full graph, mobile modal and source-inspector production integration remain with the views lane.

The published [KG 01 navigation contract](https://github.com/castlemilk/benebsworth.com/blob/85eda8e00d4f2408aef841144bbae5a3a01f6713/docs/knowledge/01-source-contract.md) supplies canonical `node.id`, `navigation.href` and selection-recovery states. The specimen's short fixture IDs are not replacements. The [Design 03 handoff](https://chatgpt.com/space/page_74f855da15cc81919425d848da51513d) supplies separate reading/Inspect actions, inline and native-modal surfaces, and explicit clear/close focus handling. Those owner actions remain outside the motion primitive. Adoption by either lane has not been observed; the graph views owner must reconcile these boundaries in its real consumer.

## Purpose and timing

| Interaction | State committed first | Optional visual cue | Static/reduced/forced-colour result |
| --- | --- | --- | --- |
| Graph/list selection | Inspected ID, explicit selected label and source context | Selection mark opacity 0.45→1 over 120 ms | Immediate labelled selection |
| Inspector transition | Title, taxonomy and evidence links | Decorative rail opacity 0.55→1 and 3 px arrival over 160 ms | Immediate inspector; text never fades |
| Filter feedback | Query, matching count and retained context | None | Same result and concise status message |
| Category-art reveal | Sized image and adjacent readable label | Explicit 180 ms decorative arrival, at most 3 px | Original art and label already visible |
| Return to reading | Native authored URL/fragment | None | Browser navigation and restoration remain in charge |
| Study guide | Study owner's actual guide-visible state | Optional 160 ms, at most 2 px, on empty decorative ink | Selectable guide text remains immediately available |

All effects use `iterations: 1`, `delay: 0`, `fill: 'none'` and `ease-out`. There are no exit animations, staged text reveals or completion callbacks that change application state. Repeated activation of the current selection does not add history or replay a cue. History restoration cancels old cues and renders without new motion.

These durations and offsets are specimen design choices, not scientific measurements, WCAG-mandated values or approved global tokens.

## Preference and lifecycle contract

`createFeedback(scope)` subscribes to reduced-motion, forced-colour and document-visibility changes. Unknown/missing observation capabilities default to static output. Media-query observation must support live change events; an older unsupported environment remains usable without animation.

An active restriction cancels every effect owned by that scope. Returning to a visible tab or removing a preference never replays a past entrance. A new mount on the same root disposes its previous owner. Replacing an effect cancels only that target's prior effect; late completion/rejection cannot delete a newer one. Cancellation rejection is consumed.

The component owner must call `dispose()` on unmount/route teardown. The standalone document binds `pagehide` disposal and persisted `pageshow` remount separately; no animation is started by remounting. A persisted remount of the same URL keeps the retained context rows in an in-memory WeakMap tied to that document, avoiding a source-inferred height change on return. It writes no browser storage. DOM-model tests exercise this wiring, while genuine Back/Forward Cache behaviour is a browser gate.

## Keyboard, pointer and history

Use native links for sources and navigable inspection entries. Preserve valid `href`, modified click, middle click, open in a new tab, copy link and browser history. Inspection, Clear and Retry links enhance only unmodified primary same-document activation; the two GET forms also enhance after a successful history write. If the history write throws, the native action proceeds and the UI has not been mutated.

Keyboard focus, inspection and reading root are separate. The focused native node stays mounted; a focus outline is always independent of the red inspected marker. Focus alone changes neither selection nor URL. The inline inspector is a labelled region, not a dialog, and has no trap or `aria-modal`. Its native **Go to details** link is an explicit reader action.

Back/Forward render URL-derived state and never push another entry. The adapter preserves opaque `history.state`. It does not write `history.scrollRestoration`, call `focus`, call `scrollTo` or call `scrollIntoView`. A source link leaves the specimen normally. No application-defined scroll snapshot is stored.

If a filter/history change excludes the focused item, it remains as explicitly labelled context for that route state. It is not removed on `focusout`: that could move another pointer target between pointerdown and pointerup. It may be removed at the next completed route action if it is no longer focused or inspected. Inspected context remains until selection changes.

A future modal inspector requires its own explicit entry, containment, Escape and opener-restoration contract. This primitive neither supplies nor proves those behaviours. Never add modal semantics to the current inline panel.

## Feedback and failure semantics

One concise `role="status"` region reports filter counts or completed inspection. The whole list and inspector are not live regions. Waiting and unavailable states retain prior/current matching sources with truthful fixture labels; neither is represented as a successful empty response. Valid empty results say so. Unknown inspection IDs remain explicit rather than silently selecting the root.

Server-rendered links, source evidence, labels and GET forms work without enhancement. The `enhance=off` response contains no script and a `script-src 'none'` CSP. `enhance=broken` deliberately serves the missing module as HTTP 503 while preserving native navigation. This server fallback is specific to the prototype; a production static-export route must be validated by its owner before claiming equivalent no-JS behaviour.

All input is escaped into HTML, and navigation destinations come from pinned fixtures or bounded same-origin query changes. The local server serves only its declared files. No request to a source website is made by rendering the workbench.

## Contrast and adaptation

The specimen uses the selected local folio fonts and separate local light/dark variables. Essential field boundaries have their own control-border token; quiet editorial rules do not substitute for those boundaries. Source tests calculate text ≥4.5:1 and focus/control boundaries ≥3:1 against the declared flat surfaces. Actual rendering, image overlap and platform colour handling remain unverified.

Forced colours uses system-compatible text, border and outline cues. Decorative marks/images may disappear; their explicit text remains. There is no blanket `forced-color-adjust: none`. Narrow styles stack the inspector below the list; the same controls remain discoverable without hover. Targets use a 44 px minimum block size where they are discrete controls. This is a design intent until rendered measurements confirm it.

## Standards basis

The owner's reduced-motion rule is deliberately stricter than a general AA claim. [WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) is AAA; the selected contract removes all of this utility's nonessential motion under reduced-motion preferences. It is not a site-wide conformance statement.

[WCAG 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) describes the 3:1 requirement for necessary control/state cues. [WCAG 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible), [2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) and [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) inform the pending acceptance cases.

Platform references: [forced-colours behaviour](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors), [media-query change events](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event) and [native history scroll restoration](https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration). These references explain APIs and criteria; they do not certify this implementation.
