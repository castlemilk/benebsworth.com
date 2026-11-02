# Editorial UI critique, 2 November 2026

Baseline: merged source `7fda9f818a52d452d61c90c8e6ac26f885a8f924`; local browser uses the reviewed `711c4da` static artifact (same application tree). Production release is separate from local visual evidence. The canonical Space remains inaccessible; this record does not claim a Space write.

## Tools and limits

Hallmark v2 and Stageshow installed locally with the requested skills CLI. Source identities are in skills-lock.json. Hallmark static lint executed against app/components: 309 files, 1,010 FAIL, 541 REFLEX, 82 WARN. These are mechanical house-style findings, not 1,010 verified user-facing bugs. Most are tracked small capitals, literal tokens and decorative monospace. No wholesale fix is justified by a count. Render lint and Stageshow film scripts were not executed: browser inspection uses the authorized browser tool. Stageshow is authored faux-product presentation guidance, not an accessibility or application correctness validator. It must never replace real simulations or be represented as actual interaction footage.

The other four named critique layers are manual lenses, not installed automated skill checks. Preserve the owner's custom symbols, canonical technology logos, content, red handwritten marks, exact scientific equations and light/dark direction even where a generic skill would choose another identity.

## Five distinct critiques

1. **design-taste-frontend:** The shared entry surfaces lack one hierarchy. Blog and Labs have editorial serif display; Projects, About, Hiking, Uses and Now retain heavy sans-serif banners. On Hiking the actual landscape material arrives near the bottom of the first screen. Keep the real material, reduce header overhead before adding decoration.
2. **gpt-taste:** Projects' violet spotlight and brightly filled stack tags read as a generic portfolio template. Vectors has nested filter/card shells and a cyan brand badge competing with the actual marks. Remove redundant framing before adding more illustrations. The home letter-grid is distinctive and should not be flattened into a stock hero, but its initial reveal and tiny lab preview need separate scrutiny.
3. **frontend-design:** Search is the most urgent shared surface. Measured dialog bounds 1180×106.828 inside a 1180×757 viewport: the backdrop is contained by the blurred sticky header. Search typography and close affordance also diverge from Labs. The archive's topic strip scrolls horizontally and the handwritten arrow points into empty hero space; investigate a meaningful anchor without removing the note.
4. **Impeccable:** Old search declares aria-modal but has no native modal or focus trap, no actual Close button, and no explicit input label. Empty/error recovery needs useful public copy. Native dialog top-layer plus body portal addresses containment and browser focus/inert behaviour; tests and real-browser keyboard checks remain distinct. Home animation, gallery copy, mobile menu and article journeys require their own focused follow-through rather than a global accessibility-pass claim.
5. **Hallmark:** Static flags align with visible tracked-cap labels and inconsistent type. New search scope uses tokens, quiet rules, one content surface, ordinary case, visible focus, 44px close target and reduced-motion fallback. Retain the owner's editorial signature instead of random theme selection. Global scientific figures, authored copy and exact logos must not be changed merely to satisfy generic house rules.

**Stageshow presentation lens:** One focal action, real words at the focal point, no extra browser/window chrome, no fabricated UI evidence. For a future walkthrough: open search → type a real topic → choose a real result → arrive at the article. A recorded real journey must be labelled separately from a choreographed concept. Compact layout is redesigned at its actual width rather than shrinking desktop.

## Bounded first improvement

Files: edit `components/search/site-search.tsx`, `app/globals.css`; add search stylesheet and regression tests. No routes, assets, project facts or scientific data removed. Search data adapter, result URLs, query shortcut and eight-result limit retained. Native dialog is portaled to body; explicit Close, honest unavailable recovery, editorial heading/result hierarchy and responsive sizing added.

Acceptance: actual backdrop covers viewport; focus remains in dialog; Escape/Close/backdrop restore focus and prior scroll state; repeat open/close works; real results still navigate; light/dark and 390px viewport inspected. Unit tests do not prove browser native focus trapping or visual acceptance.

## Curated next queue

| State | Slice | Impact / effort | Dependencies and acceptance |
| --- | --- | --- | --- |
| In progress | Shared search modal | High / small | Exact artifact browser acceptance; preserve search behaviour |
| Ready | Shared nav/footer and breadcrumbs | High / medium | Calm readable labels, consistent focus and mobile menu; preserve destinations |
| Ready | Projects index/detail | High / medium | Editorial hierarchy and quiet technology lozenges; preserve real content/logos |
| Ready | About / Uses / Now | Medium / medium | Shared heading rhythm and useful real material; no invented personal updates |
| Ready | Hiking index/detail | Medium / medium | Bring authentic landscape/journey material forward; preserve routes/maps |
| Ready | Vector gallery | Medium / medium | Remove nested chrome; test filters, copy actions, empty state and both themes |
| Ready | Home / archive continuity | High / medium | Preserve distinctive home; review motion, entry labels, topic-strip discoverability |

This is a consolidation of the user's requested existing sections, not six new product features. No completion claim for unreviewed mobile/dark route combinations, screen-reader use, production browser behaviour, or every nested Labs tool.
