# Editorial component contracts — BLOG DESIGN 03

This is the integration contract for the additive component workbench at **/lab/folio-components/**. It documents the implementation in [components/editorial-workbench](../../../components/editorial-workbench), not a replacement graph model, a global theme or an SDK migration.

The source inventory and demonstration records were read from repository baseline **1121edc4ae6ac8de415b5395d8fadc11450fc55f**. The implementation is developed on **codex/blog-design-03-folio-workbench-20261117**; that baseline SHA identifies the fixtures, not an implementation commit. Use the final commit/PR receipt to identify a candidate for testing. Source observations below were checked on 17 November 2026. They do not establish browser acceptance or deployment.

## 1. Ownership and import boundaries

| Boundary | Contract |
| --- | --- |
| Component lane | Owns the new workbench route, the components in this directory and its scoped CSS module. It presents supplied records and emits local interaction callbacks. |
| Graph model/source lane | Owns canonical entity and edge identity, vocabulary mapping, relation meaning, source extraction and provenance. No graph model is imported or created here. |
| Graph views/journeys lane | Owns exploration root, selection persistence, traversal, routing, query parameters, history, request lifecycle and missing-record recovery. |
| Category artwork lane | Owns additions to category assets and reviewed registry mappings. This workbench consumes existing Topic records and their original asset paths. |
| Motion/accessibility lane | Owns cross-surface interaction review. The workbench provides native controls, explicit state and scoped media rules; actual keyboard, zoom, theme and assistive-technology acceptance remains a separate gate. |
| Existing application | Retains the active UI SDK, global styling, shared Gamma implementation, fonts, About and Hiking identities. No document-root theme class, storage value, cookie or SDK preference is changed by these components. |

Import named exports from their actual modules. **There is no barrel index file.**

| Module | Exports |
| --- | --- |
| **@/components/editorial-workbench/primitives** | FolioSurface, FolioNavigation, FolioContext, FolioSourceCitation, FolioEntityCard, FolioRelationshipCard, FolioCategoryHeading, FolioStatus, FolioInspectorBody |
| **@/components/editorial-workbench/controls** | FolioFilters, FolioReadingControls, FolioInspectorDialog |
| **@/components/editorial-workbench/types** | FolioTheme, FolioSource, FolioEntity, FolioRelationship, FolioFacet, FolioSelection, FolioReadingPreferences, FolioCollectionState, DEFAULT_READING, folioHref |
| **@/components/editorial-workbench/workbench** | FolioWorkbench: the complete, single-instance demonstration route |
| **@/components/editorial-workbench/fixtures** | FIXTURE_REVISION, FOLIO_ENTITIES, FOLIO_RELATIONSHIPS, FOLIO_TOPICS: demonstration data, not the graph integration API |

The controls and complete workbench are client components. Use a client boundary for callbacks and local state. The CSS module is imported by the components; a consumer does not copy styles into a shared stylesheet. **FolioSurface** provides the local token scope but no page-width wrapper or navigation. A consumer supplies its own containing layout.

The complete workbench contains route-specific IDs such as main-content, entries and inline-inspector-title. Mount it once as the route demonstration. Compose the individual components for reusable graph surfaces.

### Maintained dependencies

The workbench consumes the existing **GammaButton** from **@/components/gamma/GammaButton** and **RangeSlider** from **@/components/gamma/RangeSlider**. It does not copy their source or replace their integration. **TopicGlyph** comes from **@/components/blog/topic-marker**.

Existing locally hosted font faces are declared in **app/editorial.css**: Folio Serif maps to Source Serif 4, Folio Condensed to Barlow Condensed, and Folio Hand to Caveat. The workbench does not fetch a new font provider or supply a standalone font package. Keep the application’s existing font and Gamma stylesheet loading in place.

## 2. Data and content contracts

### Entity identity and context

**FolioEntity** requires id, kind, kindLabel, title, actionLabel, tags and sources. It accepts optional summary, href, context and category. Tags and sources are readonly arrays. Category, when present, is the exact object shape **{ registry: string; key: string; label: string }**.

Identity remains opaque. Do not derive id from a title, strip a namespace, or merge records because their slugs match. The kind string is extensible; the presentation layer does not close the vocabulary to blog/lab/study or to six node types. kindLabel and actionLabel are human-readable copy supplied by the consumer.

A graph exploration root and the selected entry are separate values. **FolioContext** displays those values and does not modify either. Opening an inspector need not change the root. Filtering the list need not discard an already selected source record. If data becomes unavailable, the graph owner decides whether to retain a known record, identify a missing selection or clear it.

Preserve exact vocabulary alongside its origin:

| Supplied registry | Exact key | Supplied label in the demonstration |
| --- | --- | --- |
| Blog topic | ee | Electrical Eng |
| Lab category | engineering | Electrical Engineering |
| Study category | Electronics | Electronics |

These labels are not a cross-registry equivalence assertion. The same raw slug **rlc-resonance** identifies two different records: the Lab’s capacitor-voltage transient response and the SVG study’s resistor-voltage frequency response. The demonstration gives them separate opaque IDs and preserves their distinct routes.

The category selector uses all entries from **Object.entries(TOPIC)** in **lib/topics.ts**. At the audited baseline that is 20 topics. The six custom-v6 symbols are part of that larger vocabulary. Do not turn their existence into a six-category schema or replace canonical technology artwork.

### Relationship meaning

**FolioRelationship** requires id, subject, predicate, object, basis, basisLabel, explanation and sources. Its basis is exactly **'source-record' | 'proposal' | 'unknown'**.

Subject, predicate and object are display strings. The graph adapter retains canonical endpoint IDs and edge direction outside this presentation record. The card does not create edges, resolve aliases, calculate confidence or infer a relationship from proximity.

Provide a basisLabel and explanation that accurately describe the record. A proposal receives an explicit “Proposal” prefix and dashed rule. A proposal without sources says that no source-backed relationship is asserted. For unknown basis, supply an explicitly uncertain label; the component does not invent one. Shared exact tags describe metadata overlap, not scientific equivalence. Glossary hubs and normalized aliases remain proposals until the model/source lane supplies a supported mapping.

### Sources and evidence

**FolioSource** requires id, title and state; it accepts href, locator, revision and detail. The state enum describes a supplied record’s availability/review context. **It is not a scientific validation enum.** No state means peer reviewed, experimentally measured or proven.

| State | Implemented presentation | Consumer responsibility |
| --- | --- | --- |
| recorded | “Source recorded.” A usable URL becomes a normal link. A nonblank printed or archival locator can remain recorded without a URL. If both a usable URL and a nonblank locator are absent, presentation falls back to missing. | Supply the original location; do not use this state as a claim-validity badge. |
| unchecked | “Not yet checked,” with a dashed source rail. A supplied usable link remains available. | Do not fabricate a review date, reviewer or confidence value. |
| unavailable | “Source unavailable.” A supplied usable link is retained; an absent link is stated explicitly. | Distinguish a failed lookup from an empty successful response. |
| missing | “Locator missing,” with a dashed source rail. No link is exposed, even if an inconsistent href was supplied. | Keep the input coherent; preserve the source ID for recovery rather than inventing a destination. |

A missing online URL adds **“No usable source link supplied.”** It does not erase a supplied printed locator or turn that locator into a link. The component performs no HTTP request and cannot know whether a URL is reachable.

The visible revision is the first eight supplied characters; the full value is retained in the element’s title attribute. A revision is not a document date, retrieval time or review time. The source type does not invent those fields.

**compact=true** hides only detail. State, title/link, locator, revision and the missing-link message remain. Put essential relationship meaning and limitations in the always-visible relationship explanation; do not rely on optional citation detail to carry indispensable scientific qualifications.

**folioHref(value)** accepts a single-leading-slash path, a simple letter-starting hash target, or an absolute HTTP/HTTPS URL. It rejects whitespace/control characters through U+0020, backslashes, protocol-relative URLs and other schemes. It neither normalizes identity nor verifies a destination. Native anchors keep normal modified activation and browser history behavior; the decorative arrow does not add a new-window behavior.

### Filters and asynchronous states

**FolioFacet** contains id, label and readonly options. Each option has id, label and optional count and disabled. Group IDs and option IDs must be stable and unique within their applicable collection.

**FolioSelection** is a readonly map of group IDs to readonly option-ID arrays. Its documented interpretation is unrestricted when a group is absent/empty, OR within one group and AND across groups. **FolioFilters only emits values.** The consumer implements matching, calculates resultCount and supplies option counts. An absent count stays unknown; it is not rendered as zero.

**FolioCollectionState** is one of:

~~~ts
type FolioCollectionState =
  | { kind: 'loading'; message: string }
  | { kind: 'empty'; reason: 'filters' | 'collection'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'missing'; message: string }
~~~

There is no ready/success variant in this exported type. A ready consumer renders its records. Empty filters, an empty collection, a missing selection and a failed request are distinct conditions. Request state, retry, cancellation, retained data and completion announcements belong to the consumer.

## 3. Component anatomy and API reference

### Structural and reading primitives

| Export and props | Anatomy and behavior | Content/accessibility contract |
| --- | --- | --- |
| **FolioSurface**: children; optional theme='inherit', className='' | Div with scoped class and data-theme. Theme is inherit, light or dark. | Place the components inside this scope. className is an additive host layout hook, not a global theme adapter. |
| **FolioNavigation**: label; items of { label, href?, current? } | Named nav → ordered list → native destination link or text. Current item gets aria-current="page". | Supply a useful nav label and one current item where applicable. It represents location, not graph selection or tab-panel switching. |
| **FolioContext**: root; optional selection | Definition list with “Exploring” and “Inspecting.” Missing selection says “Nothing selected.” | Pass display text separately from opaque identity. Both values wrap; no traversal or selection callback exists. |
| **FolioSourceCitation**: source; optional compact=false | Status/revision → title/link → exact locator → missing-link message → optional detail. | Locator and evidence status are supplied data. No external-link target, tooltip-only source action or fabricated source is added. |
| **FolioEntityCard**: entity; optional selected=false, onInspect(entity) | Named article → type/selection/category → h3 title/link → summary → exact tags → reading link and separate Inspect button. | Heading links and buttons are siblings. Selection has written “Selected” text plus a rule. The article is not a listbox option and has no click-anywhere behavior. Put cards under an appropriate h2. |
| **FolioRelationshipCard**: relationship | Named article → basis → h3 subject/predicate/object sentence → explanation → source citations. | Meaning must remain understandable without the visual rule. Source-free proposals are labelled; unknown evidence is not promoted to certainty. |
| **FolioCategoryHeading**: topic: Topic; registry; categoryKey; optional description | Original decorative 42px TopicGlyph → registry/key → h3 topic label → description. | Supply the exact Topic and matching registry/key. Visible text is independent of the glyph. The component does not look up or reclassify content. |
| **FolioInspectorBody**: entity | Source-trail label → source citations → summary/context/category → destination → native identity/tags disclosure. | No landmark, modal or focus trap is created. Wrap it in a named aside, region, route section or FolioInspectorDialog as appropriate. Empty sources and absent summary are explicit. |
| **FolioStatus**: state; optional action={label,onClick}, announce=true | State label → h3 explanation → message → optional action. Loading adds three decorative static bars. | With announce=true, text has role="status" and polite live semantics. The action invokes a callback; it does not implement a retry. Use announce=false for static state galleries. |

The individual content components generate instance-unique labelled-heading IDs with useId where needed. Most card/status headings are h3; the host must supply a coherent surrounding heading hierarchy. Essential actions are visible at rest.

### Controlled interactions

| Export and props | Implemented behavior | Consumer responsibility |
| --- | --- | --- |
| **FolioFilters**: query, onQueryChange, groups, selection, onSelectionChange; optional resultCount, inputRef, description | Labelled search input, Clear search, native checkbox fieldsets, supplied counts, polite result summary, Reset filters. Clear empties only query. Reset clears query and only supplied group IDs, preserving unrelated selection keys. Both return focus to search. Unknown selected option values remain counted, are explained, and can be reset. | Own data matching and all state. Do not silently zero unknown counts or erase another view’s filters. Current label/placeholder use source-entry/RLC wording; description is the available copy override. |
| **FolioReadingControls**: value, onChange | Existing Gamma native range, line-length select, note checkbox and reset. Range is 16–24 with step 1. Reset emits a fresh copy of DEFAULT_READING. | Apply values only to the intended reading region. The component does not change an article or persist preferences. |
| **FolioInspectorDialog**: entity, open, onDismiss; optional fallbackFocusRef: RefObject&lt;HTMLElement \| null&gt; | Native modal dialog; compact persistent header/Close; complete h2 title and inspector body in the scroller. Opens with showModal(), captures the active opener and focuses the title. Escape prevents the native cancel default and calls onDismiss; Close also calls onDismiss. | onDismiss must change controlled open to false. Keep a connected, programmatically focusable fallback outside the dialog. Manage conflicting/nested modal policies in the host. No custom portal, gesture dismissal or form workflow is supplied. |
| **FolioWorkbench**: no props | Full local demonstration, including theme, filters, selected record, category picker, reading sample and state picker. | Use as the dedicated route, not a data-backed graph view or multi-instance library primitive. |

### Dialog lifecycle and focus

The implementation synchronizes its native open state from the controlled open prop. Dismissal preserves the selected record; the caller decides when to clear selection.

When closing, it returns focus to the captured opener if that element is still connected; otherwise it uses the latest connected fallback ref. Teardown calls the same restoration helper, including when the original opener has disappeared. A queued close event is ignored while a newer dialog cycle is open. This prevents the previous cycle’s event from clearing the new opener.

The compact header preserves the Close action while the long title and content scroll. The title is a labelled h2 with tabIndex=-1 and an explicit focus outline. The body has min-height:0, overflow-y:auto and overscroll-behavior:contain. This is source support for long-content and short-viewport operation; native focus containment, repeated entry/exit and actual scroll behavior still require browser acceptance.

## 4. Typography, color and geometry

Values below are the current source contract in [workbench.module.css](../../../components/editorial-workbench/workbench.module.css). They are scoped component tokens and dimensions, not replacements for the application’s token system.

### Local color tokens

| Token | Light | Dark | Inherit |
| --- | --- | --- | --- |
| --ew-paper | #f4f1e9 | #111312 | --bg, fallback #f4f1e9 |
| --ew-ink | #202c34 | #ecebe6 | --fg, fallback #202c34 |
| --ew-muted | #56616b | #afb3ac | --muted, fallback #56616b |
| --ew-layer | #fbf9f3 | #181b1a | --surface, fallback #fbf9f3 |
| --ew-red | #b32624 | #ffaaa5 | #b32624; #ffaaa5 under the existing .dark ancestor |
| --ew-rule | 24% ink mixed with paper | Same formula | Same formula |
| --ew-soft | 5% ink mixed with paper | Same formula | Same formula |

Explicit light/dark surfaces set the corresponding color-scheme locally. Red is handwriting/annotation ink, not a warning or scientific certainty signal. Selection uses ink and written text.

The local Gamma adapter maps background, layers, ink, muted, border, accent and accent ink to these tokens. Accent is ink; accent ink is paper. It maps the UI font to --ew-ui, sets button radius to 4px and disables the Gamma shadow focus ring in favor of the explicit workbench outline. Existing Gamma source remains unchanged.

### Type roles

| Role | Current value |
| --- | --- |
| Narrative family | --ew-serif: 'Folio Serif', 'Source Serif 4', Georgia, serif |
| Technical label family | --ew-label: 'Folio Condensed', 'Barlow Condensed', 'Arial Narrow', sans-serif |
| Selectable annotation family | --ew-hand: 'Folio Hand', Caveat, cursive |
| UI family | --ew-ui: existing --font-sans, otherwise system-ui, sans-serif |
| h2/h3 base | Serif, weight 450, letter-spacing -0.025em |
| Eyebrow | 600 0.875rem/1.5 condensed; 0.08em tracking; uppercase |
| Supporting text | 0.875rem/1.6 UI |
| Entity title | 1.6rem/1.2 serif |
| Entity summary | 1.0625rem/1.6 serif |
| Source title | 1.125rem/1.4 serif |
| Locator / revision | 0.75rem mono; line-height 1.7 / 1.6 respectively |
| Relationship sentence | clamp(1.375rem, 2vw, 1.8rem)/1.3 serif; predicate 1.125rem |
| Category heading | 1.8rem serif |
| Reading sample | Default 1.1875rem/1.75 serif; 54ch measure |
| Reading note | 1.75rem/1.2 handwriting; maximum 24ch; red |
| Workbench masthead | clamp(3rem, 5.8vw, 5.25rem)/1.04 serif, weight 450, tracking -0.05em |
| Workbench note | 1.85rem handwriting with an explicit local red color rule |

DEFAULT_READING is **{ size: 19, measure: 'comfortable', notes: true }**. The sample applies size/16 rem and chooses 54ch or 68ch. The range displays nominal “px” values, while the sample’s rem conversion preserves root-font scaling; those are not guaranteed measured device pixels at a customized root size. No root font-size is written.

### Spacing and anatomy dimensions

| Component / region | Exact source values |
| --- | --- |
| Workbench page | 24px top, clamp(20px, 5vw, 80px) inline, 64px bottom; sheet maximum 1280px |
| Wide section | 196px label column + flexible content; 48px column gap and vertical padding; 1px separator |
| Context | 24px field gap; 16px top / 24px bottom padding; 8px label-to-value gap |
| Search | 8px input/button gap; fields have 8px 12px padding, 4px radius, 1px border, 44px minimum height |
| Facets | 20px top margin; 20px row / 32px column gaps; checkbox-label gap 8px; options gap 16px |
| Filter summary | 16px top margin, 8px vertical padding, 12px gap, 1px top rule |
| Entity | 24px vertical padding; 12px metadata/title and summary spacing; tags/actions 16px top margin |
| Selected entity | 3px inline-start rule and 16px inline-start padding; written selection label |
| Citation | 16px top/bottom and inline-start padding; 1px source rail; 8px internal text gaps |
| Relationship | 24px top padding; 16px sentence margins; 8px sentence gap; sources 24px top margin and gap |
| Inline inspector specimen | 2px top rule; 24px 20px padding; soft background |
| Inspector description | 24px vertical padding; context gap 16px; metadata item gap 12px |
| Category heading | 24px vertical padding; 20px icon/text gap; 44px icon column with 42px glyph |
| Reading controls / sample | 16px row / 32px column gaps; 24px bottom padding; sample 32px top margin and 24px vertical padding |
| State block | 24px vertical padding; title/message gaps 12px; action gap 20px |
| Loading bars | Three static 8px bars; 12px gap; widths 100%, 88%, 60%; maximum width 520px |
| Dialog | Maximum width 580px; 16px outer margin; width at most viewport minus 32px; max-height viewport minus 32px; 6px radius |
| Dialog interior | Header 24px padding and 16px gap; scroller 24px padding; title bottom margin 24px |
| Control focus | 2px ink outline, 4px offset, no shadow; the programmatically focused dialog title has its own equivalent rule |

Buttons, standalone navigation/actions, search/select fields, checkbox/radio labels, range hit area and disclosure summaries have a 44px minimum height where their component styles apply. Inline source/title links retain text flow; this is not a claim that every inline link is a 44×44 target.

At **1050px**, section labels become 156px with 32px gaps, the entry/inline-inspector layout stacks, and the inline inspector uses 24px padding. At **760px**, main sections, context, category specimen, reading controls and state tools stack. Section padding becomes 32px; the dialog margin becomes 8px, viewport deductions 16px, and header/scroller padding 20px. At **420px**, search wraps with the input occupying a full row; inline inspector padding becomes 20px 16px.

### Forced colors, motion and print

Forced-colors rules map the local paper/layers to Canvas, ink/muted/rules to CanvasText and red to LinkText. Focus and selected-entity rule use Highlight. Static loading bars retain an explicit CanvasText border. Topic text remains available even if decorative artwork changes in forced colors.

Reduced-motion rules are scoped to descendants of FolioSurface and remove local animation, transition and smooth scrolling. Loading bars are already static. No meaningful state depends on animation.

Print rules use white/black output, hide demonstration controls, modal, section navigation and contract disclosures, simplify layouts and avoid breaks inside entity/citation/relationship/category blocks. Print output and forced-colors rendering are source-supported, not browser-observed in this documentation pass.

## 5. Annotation integration

Use the existing **AnnotatedBlock**, **AnnotationTarget** and **MarginNote** from **@/components/mdx/annotated-block**; use **HandUnderline** from **@/components/mdx/hand-underline** for an existing measured underline. Do not introduce a second connector system.

AnnotatedBlock accepts placement **'margin' | 'above' | 'below'**, defaulting to margin. It requires exactly one AnnotationTarget and one MarginNote. The target id must match the note’s target and satisfy **/^[A-Za-z][\w-]*$/**. MarginNote accepts optional label (default “Working note”) and mark **'connector' | 'bracket' | 'none'**.

An opaque graph ID is not an authored annotation DOM ID. Generate a separate instance ID with a letter prefix and valid characters; keep the domain ID unchanged in data. The workbench uses a sanitized useId suffix prefixed with folio-source-. Multiple blocks still need document-wide unique targets; the existing block validator checks its own pair, not the whole document.

Notes remain selectable text with a real native link to the target. Their drawing is a decorative reading guide. The existing layout owns measured connectors and responsive placement; no note or generated concept artwork is factual scientific evidence. The workbench maps --folio-handwriting to its local red token and explicitly colors its masthead handwritten text, avoiding the shared note fallback’s unrelated blue.

## 6. What works, and what is a specimen

“Implemented” below describes source behavior. It is not a statement of observed browser success.

| Surface | Implemented local behavior | Specimen/integration boundary |
| --- | --- | --- |
| Navigation | Native root/Lab links, local section anchors and accepted-study/archive links | No graph traversal, URL query serialization or graph Back/Forward behavior |
| Entry search/filter | Searches three supplied fixture records; filters entry kind and exact tags; Clear/Reset update local state | No production index, server query or graph search |
| Selection/inspector | Inspect selects a record and opens a native dialog; inline source trail follows selection; close retains selection | Data refresh, missing-ID policy and persistence are consumer-owned |
| Theme | Follow-site, light and dark controls update only the workbench surface | No saved site or SDK preference |
| Category picker | Selects from the actual TOPIC records and renders the original marker | Does not change taxonomy or reclassify any article |
| Reading controls | Update only the authored sample’s size, measure and optional note; reset restores defaults | Do not alter scientific article text or persist a reading preference |
| Recovery picker | Changes the visible loading/empty/error/missing/ready specimen | No network request, actual retry or data import |
| Source states | Render recorded, unchecked, unavailable and missing content contracts | No verification service or invented review status |
| Relationships | Render an authored embed, exact shared metadata and a labelled future proposal | No new graph edges or normalized glossary hubs |
| Concept artwork | Original visual-study artifact and prompt retained with the documentation | Illustrative concept; not a browser capture, deployed UI or scientific evidence |

The route metadata is noindex/nofollow. A source-defined route or local build does not establish a public deployment.

## 7. Complete consumer integration example

This client component consumes **caller-supplied FolioEntity records**. It owns only temporary presentation selection and modal visibility. It does not define canonical IDs, map categories, create relationships or write route state. The always-mounted return link is a connected focus fallback if a list update removes the opener.

~~~tsx
'use client'

import { useId, useRef, useState } from 'react'
import {
  FolioContext,
  FolioEntityCard,
  FolioStatus,
  FolioSurface,
} from '@/components/editorial-workbench/primitives'
import { FolioInspectorDialog } from '@/components/editorial-workbench/controls'
import type {
  FolioEntity,
  FolioTheme,
} from '@/components/editorial-workbench/types'

type SourceEntriesProps = {
  entries: readonly FolioEntity[]
  explorationLabel: string
  theme?: FolioTheme
}

export function SourceEntries({
  entries,
  explorationLabel,
  theme = 'inherit',
}: SourceEntriesProps) {
  const suffix = useId().replace(/[^A-Za-z0-9_-]/g, '')
  const sectionId = 'source-entries-' + suffix
  const headingId = sectionId + '-heading'
  const fallbackFocusRef = useRef<HTMLAnchorElement>(null)
  const [selected, setSelected] = useState<FolioEntity | null>(null)
  const [open, setOpen] = useState(false)

  function inspect(entity: FolioEntity) {
    setSelected(entity)
    setOpen(true)
  }

  return (
    <FolioSurface theme={theme}>
      <section id={sectionId} aria-labelledby={headingId}>
        <h2 id={headingId}>Source entries</h2>
        <FolioContext
          root={explorationLabel}
          selection={
            selected ? selected.kindLabel + ': ' + selected.title : undefined
          }
        />

        {entries.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {entries.map(entity => (
              <li key={entity.id}>
                <FolioEntityCard
                  entity={entity}
                  selected={selected?.id === entity.id}
                  onInspect={inspect}
                />
              </li>
            ))}
          </ul>
        ) : (
          <FolioStatus
            state={{
              kind: 'empty',
              reason: 'collection',
              message: 'No entries were supplied to this view.',
            }}
          />
        )}

        <a
          ref={fallbackFocusRef}
          href={'#' + sectionId}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 44,
          }}
        >
          Return to source entries
        </a>

        {selected && (
          <FolioInspectorDialog
            entity={selected}
            open={open}
            onDismiss={() => setOpen(false)}
            fallbackFocusRef={fallbackFocusRef}
          />
        )}
      </section>
    </FolioSurface>
  )
}
~~~

The example deliberately retains the selected record snapshot if entries changes; removing a card does not silently delete the inspection context. A production graph view must supply its own refresh/invalidation policy and may lift this state to its route controller. If the entire example is unmounted, its local fallback also disappears; a host that needs focus restoration after that event should supply a persistent fallback outside the removed region to its dialog integration.

## 8. Source review and pending acceptance

The available **Impeccable v4.3.1** skill and its technical-audit reference were read as the repository’s accessibility/robustness review lens. The context command was attempted from the repository with target components/editorial-workbench/workbench.tsx. It failed with exit 127 because **.codex/skills/impeccable/scripts/impeccable** is absent. PRODUCT.md is also absent. Existing DESIGN.md, the blog-development instructions and VISUAL-REVIEW.md were read directly. No installer, detector, browser or visual-scoring run is claimed.

| Review dimension | Concrete source observation | Evidence/acceptance boundary |
| --- | --- | --- |
| Naming and keyboard structure | Native labels/fieldsets, sibling link/button actions, explicit selection text, native disclosure, generated heading IDs and named dialog | Source inspected. Keyboard order, focus containment, screen-reader output and announcement timing remain pending. |
| Interruption recovery | Unknown filter values can be reset without deleting unrelated groups. Dialog teardown uses the current connected fallback; stale close events cannot restore focus while the dialog is open. | Source inspected after correction. Native event ordering, repeated reopen and removed-opener behavior need browser acceptance. |
| Long content | Dialog’s complete title moved into the scroller; compact Close header remains separate. Wrapping and min-width:0 are present across records. | Source inspected after correction. Narrow/short viewport, long-title and 200% zoom rendering remain pending. |
| Source integrity | A printed locator can stay recorded without href; states do not imply scientific validation; proposal evidence remains explicit. | Source inspected after correction. Fixture provenance is separately documented in REGISTRY-AUDIT.md. |
| Theme and typography | Scoped light/dark tokens preserve Source Serif 4, Barlow Condensed and selectable Caveat. Masthead handwriting explicitly uses local red. | Source inspected after correction. Font loading, actual contrast, wrapping and artistic alignment require rendered comparison. |
| Motion/performance | Static skeletons; no new animation loop, fetch, persistence, graph dependency or layout-read loop in the new controls. Existing annotation measurement is reused. | Source observation, not a bundle-size, runtime-performance or physical-device result. |
| Isolation | CSS-module classes and local variables; the .dark ancestor is read, not modified. Shared Gamma, topic, annotation and global files are consumed unchanged. | Source inspected. A local state change is not a deployment or shared SDK migration. |

For browser acceptance, use the exact candidate revision and record route, viewport, theme, fixture, input method and artifact path. Cover light/dark/inherit; keyboard inspection, Escape and explicit Close; repeated close/reopen; removed opener and surviving fallback; long titles and locators; approximately 320px narrow and short viewports; 200% zoom; filter-empty recovery; reduced motion; forced colors; and print. Confirm the full source remains readable and the Close control reachable. Distinguish resized-pointer checks from physical touch/hybrid evidence.

This documentation pass ran no tests or browser sessions. Refer to the parent implementation receipt for commands actually executed and their exact outcomes. The source review, a test result, an illustrative concept, a local preview, a remote PR and a deployed revision are different evidence.
