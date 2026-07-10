# Site UI and Animated Lab Uplift — Design Specification

**Date:** 2026-07-11 · **Status:** Approved direction · **Product:** benebsworth.com

## Goal

Lift the site's navigation, layout, styling, and accessibility while preserving the distinctive generative landing grid. Recompose the lab as an editorial discovery surface instead of a wall of identical cards, and publish three new animated concept guides using the existing canvas engine.

The result should feel like a senior engineer's technical dossier with live instrument plates: precise, editorial, image-rich, and lightly playful. It must remain fast, static-export compatible, keyboard usable, responsive, and meaningful with reduced motion enabled.

## Audience and jobs

The primary audience remains recruiters, hiring managers, platform/SRE/cloud engineers, and peers arriving from talks, GitHub, or technical writing. They need to:

1. Understand who Ben is and reach the core sections quickly.
2. Scan projects, writing, experience, and credentials without learning a novel navigation system.
3. Discover the lab as evidence of engineering depth rather than as a disconnected effects catalogue.
4. Use the site with a keyboard, screen reader, touch input, zoomed text, or reduced motion.

## Approved direction

Use the **technical dossier + live instrument plates** direction.

- Keep the home grid as the signature experience.
- Give conventional navigation a quiet but reliable path everywhere, including the home page.
- Use the site header as the only sticky layer; breadcrumbs and lab filters remain in document flow.
- Standardise page gutters, hero rhythm, line lengths, and section labels.
- Make the lab editorial and asymmetric at the top, then progressively denser for the long tail.
- Concentrate motion in a few orchestrated moments and retain useful static states under reduced motion.

Rejected alternatives:

- A connected-grid motif on every page would dilute the home page's signature and risk visual noise.
- A fully immersive masonry lab would increase rendering cost and weaken recruiter scanability.

## Baseline findings

### Strengths to preserve

- The home grid is memorable and specific to the site.
- The approved Space Grotesk, Hanken Grotesk, and JetBrains Mono hierarchy is coherent.
- Light and dark design tokens already exist.
- The global skip link, focus outline, semantic breadcrumbs, and heading hierarchy are sound foundations.
- EffectCanvas already pauses offscreen, hidden-tab, and active-scroll work and paints a static reduced-motion frame.
- Lab effects are code split and share a stable renderer contract.

### Problems to address

1. Site navigation uses accents that conflict with the approved semantic palette.
2. Active navigation lacks aria-current and desktop navigation lacks an accessible name.
3. Search is presented as site-wide even though it only indexes writing, and its dialog is not keyboard-modal.
4. Mobile menu, theme, search, lab filters, and clear controls have undersized touch targets.
5. Mobile menu does not support Escape, focus placement, or focus return.
6. Lab search and category filters lack durable labels, pressed state, and live result announcements.
7. Header, breadcrumb, and lab filter positions depend on unrelated hard-coded pixel offsets.
8. The home skip link points at an ID that does not exist, and home content is split across multiple top-level regions instead of one main landmark.
9. The lab renders a long series of same-sized bordered cards, weakening hierarchy and encouraging unnecessary preview-module work.
10. AI and Cosmology category accents fall back inconsistently because multiple partial accent maps exist.

## Information architecture

### Primary navigation

Primary destinations remain:

- Projects
- Blog
- Lab
- Hiking
- About

Secondary destinations remain discoverable in the expanded index and footer:

- Now
- Uses
- GitHub
- LinkedIn
- RSS

The conventional navigation must not replace the crossword links on the home page. It supplements them for predictable access to sections the crossword does not expose.

### Accent semantics

Use one exported category/section metadata source rather than local maps:

- Blog: teal token
- Projects: purple token
- About: orange token
- Hiking: green token
- Lab: neutral foreground for the route, with category-specific accents inside the lab
- Lab Art: teal
- Lab Mathematics: purple
- Lab Physics: orange
- Lab Engineering: blue
- Lab AI: rose
- Lab Cosmology: indigo

Light-mode accent ink must continue to use the existing contrast-safe mixing behavior.

## Component architecture

### 1. Navigation data

Create a small shared navigation module that exports primary links, secondary links, route matching, and semantic accent names. SiteNav, the home index, and SiteFooter consume this module so labels and destinations cannot drift.

The route matcher normalises a missing trailing slash, matches root only to root, and matches a section only when the pathname equals its prefix or begins with that prefix followed by a segment boundary. It is a pure function with unit tests for root, collection, deep-detail, similarly prefixed non-matches, and trailing-slash variants.

### 2. SiteNav

SiteNav supports two presentations backed by the same content and menu behavior:

- **Standard:** sticky dossier rail on internal pages, with brand, primary links, writing search, theme toggle, and mobile index trigger.
- **Home overlay:** quiet Index, writing search, and theme controls over the home hero without adding a second brand heading or changing the crossword composition.

Standard behavior:

- The total `--site-header-height` token includes the visual rail and `env(safe-area-inset-top)` exactly once. Header content applies the safe-area top padding; consumers do not add it again.
- Desktop nav has aria-label="Primary".
- The active link uses aria-current="page", accent ink, and a non-color marker.
- Search, theme, and menu hit areas are at least 44 by 44 CSS pixels.
- The active marker enters with a short opacity/transform reveal; it does not animate layout.

Home overlay behavior:

- At every viewport width, a labelled **Index** trigger appears at the top left, with Search writing and theme controls at the top right.
- At desktop widths, Index opens an anchored, non-modal popover containing primary and secondary links. Outside pointer activation and Escape close it, and focus returns to the trigger.
- At mobile widths, the same trigger opens the modal index sheet described below.
- The overlay uses the shared navigation data and does not duplicate the brand heading.

Mobile index behavior:

- Opening moves focus to the first navigation link.
- Escape closes the menu.
- Closing or navigating returns focus to the trigger when the trigger remains mounted.
- Background page content is inert while the index is modal at narrow widths.
- A visible close control is present.
- Rows are at least 48 pixels high.
- Route change and outside activation close the index.
- Reduced motion makes the panel appear immediately.

### 3. SiteSearch

Keep the existing static Pagefind integration, but label it honestly as **Search writing**.

- Use an explicit dialog title and search input label.
- Add a visible close button.
- Trap focus within the dialog and restore it to the search trigger.
- The focused input uses the combobox pattern: `role="combobox"`, `aria-controls`, `aria-expanded`, `aria-autocomplete="list"`, and `aria-activedescendant` pointing at the active result ID.
- The result container uses `role="listbox"`. Results use `role="option"`, stable IDs, `aria-selected`, and `tabIndex={-1}`; Arrow keys change the active descendant and Enter performs navigation.
- Announce loading, unavailable, empty, and result-count changes through a polite live region.
- Preserve Arrow Up, Arrow Down, Enter, Escape, Command-K, and Control-K behavior.
- Keep body scroll locked while open.
- Clicking the backdrop may close the dialog, but the backdrop itself is not the only close mechanism.

### 4. Breadcrumb and sticky behavior

- Breadcrumbs are static within collection and detail-page hero regions.
- The lab category toolbar also remains in document flow.
- The site header is the only sticky surface, including on the lab index and deep detail pages.
- No component hard-codes another component's pixel height.

### 5. PageFrame and page rhythm

Add focused layout primitives rather than duplicating long Tailwind class strings:

- PageFrame: main landmark, stable max width, fluid gutters, bottom spacing.
- PageHero: optional breadcrumb, eyebrow, H1, description, and adjacent feature slot.
- SectionLabel: numbered/labelled divider used by collection pages.

Collection pages adopt the primitives where their structure is compatible: Blog, Projects, Lab, Hiking, Now, and Uses. About keeps its custom portrait layout but adopts the shared frame/gutter tokens.

Rhythm targets:

- Fluid horizontal gutter: approximately 24 pixels on mobile to 40 pixels on wide screens.
- Wide dossier frame: approximately 76–80rem.
- Long-form text measure: at most 72ch.
- Major vertical separations: 64–128 pixels depending on hierarchy.
- Tighter group spacing inside a section: 12–32 pixels.

### 6. Home page

- App Home owns one main element with id="main-content".
- GridNav becomes a labelled hero section rather than a nested main.
- SiteNav's home-overlay presentation provides a conventional Index control, writing search, and the theme toggle.
- Preserve the crossword layout, shuffle behavior, WebGL word reaction, and artifact tiles.
- Recompose Latest writing: one lead story with prominent art, followed by two border-separated editorial rows rather than three identical cards.
- Recompose From the lab: one larger live tile and four supporting static category plates. Supporting plates do not load effect modules; they use a poster when one exists and otherwise render a lightweight category glyph/grid treatment.
- Supporting entries may continue the existing periodic content replacement for pointer users. The interval is never created under reduced motion, pauses while focus is anywhere in the matrix, and restarts with a full interval only after focus leaves the matrix.
- Derive the experiment count from the registry rather than showing a stale hard-coded total.
- Add the shared footer below the home content so all secondary destinations are reachable.

### 7. Lab index

The index has three layers of density.

#### Layer A: hero instrument plate

- The hero uses a split layout on desktop and a compact stacked layout on mobile.
- `optic-flow-reveals-depth` is the deterministic hero feature. Its aliased Starfield renderer runs as the single live first-viewport canvas after loading. Loading and reduced-motion use its poster; an import failure uses the same poster-backed plate plus `role="status"` and “Interactive preview unavailable”.
- Hero copy remains concise.
- The LLM Benchmark moves from the hero's primary action to a secondary utility rail after the featured guides.

#### Layer B: concept guides

- Rename the visual treatment to **Field guides** while retaining clear concept-guide semantics in code.
- Add an explicit `LAB_FEATURED_GUIDE_SLUGS` order: `optic-flow-reveals-depth`, `negative-effective-mass`, then `cyclic-dominance-spirals`. The first is the large lead plate; the other two follow as prominent rows; existing guides follow in the current concept-guide list order.
- Render the next guides as poster-led rows with title, thesis, and category; do not repeat tag-pill clusters.
- All guides remain present and linkable.
- Existing five guide posters remain; the three new guides receive captured posters.

#### Layer C: experiment index

- Each category has one deterministic live lead experiment plate: Art `orbits`; Mathematics `double-pendulum`; Physics `wave-superposition`; Engineering `rlc-resonance`; AI `self-attention`; Cosmology `spacetime-curvature`.
- If a lead renderer fails, the plate switches from its loading skeleton to an accessible category fallback with `role="status"` and the text “Interactive preview unavailable”; the link and written metadata remain usable.
- Remaining experiments render as compact editorial rows with category marker, title, and blurb; they do not instantiate canvas renderers on the index.
- The detail page remains the place for controls, tags, and the full live canvas.
- Search/filter results use the same compact row component.
- This preserves access to every effect while reducing DOM weight, dynamic imports, and visual repetition.

### 8. CategoryNav

- The toolbar remains in normal document flow below the hero/featured plate.
- Search has a persistent accessible label and stable width; no focus-driven layout shift.
- Clear search is conditionally rendered only when a non-empty query exists.
- Category buttons expose aria-pressed.
- All interactive targets meet the 44-pixel target.
- Only opacity, color, and transform transition.
- A polite live region reports result counts and current filter.
- A dedicated `lib/lab/index-url-state.ts` module parses and serialises `lab_q` and `lab_category`; it is separate from the effect-control URL module.
- `lab_q` is trimmed, internal whitespace is collapsed, and the value is capped at 80 characters. Empty values are removed.
- `lab_category` accepts only the six canonical registry keys. When repeated values differ, the first valid value in query order wins; if none are valid, the parameter is removed. Repeated `lab_q` values likewise canonicalise to the first non-empty normalised value.
- Serialisation preserves unrelated query parameters and uses `history.replaceState`, so reload, sharing, and Back from a detail page restore the final filter without creating a history entry for every keystroke.
- With no lab filter, the hero, Field guides, benchmark rail, and all category sections render.
- With either lab filter active, Field guides and the benchmark rail hide and one compact result section searches all `LAB_EFFECTS`, including guide aliases. Guide results carry a visible “Guide” label. Filtered results do not mount live lead canvases.
- The All control clears both lab parameters and restores the editorial default view.

### 9. Overlay coordination and effect load state

SiteNav owns a single overlay state: none, index, or search. Opening one overlay closes the other before the next one opens. Consequently, only one component can own Escape, focus containment, body scroll lock, background inertness, and focus restoration at a time.

- Search and the mobile index share one local dialog boundary built on the already-installed accessible UI primitives rather than separate hand-rolled focus traps.
- The modal backdrop remains inside that boundary, so it can close the active dialog while the background page is inert.
- The desktop home Index is a non-modal popover and cannot remain open when Search opens.
- Command-K and Control-K always switch the overlay state to Search.

Refactor effect loading to expose `loading`, `ready`, and `error` states instead of treating a rejected dynamic import as permanent loading. EffectPlayground, LabCanvas/LabSide, lead lab plates, and home live previews consume this state. On error they render a labelled unavailable plate while the server-rendered title, blurb, MDX body, and navigation remain readable.

## New animated lab guides

The guides reuse existing renderer modules. This adds editorial depth and multiple animated states without adding three new simulation engines or duplicating canvas code.

### 1. How Motion Reveals Depth

- Slug: optic-flow-reveals-depth
- Category: Physics
- Renderer alias: starfield
- Thesis: perspective projection makes nearby points move faster and causes trajectories to radiate from a focus of expansion, allowing animals and robots to infer depth and heading from motion.
- Interactive sequence: sparse/slow/no streak; normal radial flow; fast full streaks that expose velocity vectors; density changes that preserve the expansion focus.
- Content includes the projection relationship, time-to-contact intuition, a robotics/vision connection, one equation block, two inline canvases, one typed callout, and reading prompts.

### 2. An Electron Can Have Negative Mass

- Slug: negative-effective-mass
- Category: Physics
- Renderer alias: band-structure
- Thesis: a carrier's response is set by band curvature, not by replacing the electron's bare mass; negative curvature motivates the hole description.
- Interactive sequence: free parabola; weak periodic potential; stronger potential and flatter bands; inspection near a band maximum.
- The guide states that animated dots are tracers and do not represent group velocity unless the renderer explicitly calculates it.
- Content includes the effective-mass curvature equation, positive/negative curvature comparison, semiconductor connection, two inline canvases, one warning callout, and reading prompts.

### 3. Rock–Paper–Scissors Paints Spirals

- Slug: cyclic-dominance-spirals
- Category: Mathematics
- Renderer alias: cyclic-automaton
- Thesis: local cyclic invasion can produce travelling fronts and global order without a planner.
- Interactive sequence: three states/threshold one; threshold two coherent fronts; eight-state longer phase cycle; high-threshold freezing; tick/cell changes that separate display scale and speed from the rule.
- The guide explicitly distinguishes this discrete successor rule from the continuous reaction-diffusion mechanism in Turing Patterns.
- Content includes the successor rule, threshold explanation, ecology connection, two inline canvases, one comparison callout, and reading prompts.

For all three guides:

- Add metadata to LAB_EFFECTS with homeEmbedSafe false.
- Add the slug to the concept-guide list.
- Add the slug in the explicit featured-guide order described above.
- Add an EFFECT_LOADERS alias to the source renderer.
- Add a corresponding MDX file using LabSide and LabCanvas.
- Register an editorial poster in `lib/lab/posters.ts` at `public/lab/previews/<slug>.webp`.
- Capture a deterministic 1280 by 720 frame with `scripts/capture-lab-poster.mjs` using the documented representative parameters, then verify dimensions and both-theme legibility before committing it.
- Keep captions useful when animation is suppressed.

## Motion design

The signature motion is the lab hero/featured-guide entrance, not animation on every card.

- Hero/feature entrance: 500–650ms, opacity plus small translate, exponential ease-out.
- Stagger: 60–80ms for adjacent elements.
- Hover/focus feedback: 180–250ms.
- Mobile menu and search: opacity plus translate/scale only.
- Experiment-row preview/arrow feedback must appear on both hover and focus-visible.
- Avoid transition-all, width animation, height animation, bounce, and elastic easing.
- Existing canvas effects continue to use requestAnimationFrame through EffectCanvas.

Under prefers-reduced-motion:

- Navigation, dialog, menu, and reveal transitions become immediate.
- Each canvas paints one representative static frame.
- Home matrix selection remains stable and does not rotate automatically.
- No information is communicated only by motion.

## Accessibility acceptance criteria

1. Every page has exactly one reachable main landmark and a working skip link.
2. Desktop and mobile primary navigation expose a label and aria-current.
3. Search and mobile index keep focus inside while open and restore focus after close.
4. Search results and lab-filter changes are announced without moving focus.
5. Search, theme, menu, close, and lab filter targets are at least 44 by 44 pixels.
6. The site is fully navigable at 390px width and at 200% browser zoom without horizontal page scrolling.
7. Color is never the only active-state cue.
8. All poster images have useful alt text; decorative graphics are hidden.
9. Reduced-motion users receive stable static canvas states and no automatic content replacement.
10. Light and dark foreground/background, muted text, and semantic accents meet WCAG AA for their usage size.

## Performance and resilience

- Keep Next.js static export and current content loading architecture.
- Do not introduce a new animation dependency.
- Long-tail lab rows do not call useEffectModule and therefore do not download or mount preview renderers.
- Lead canvases retain offscreen, visibility, active-scroll, and reduced-motion pausing.
- Poster images have explicit dimensions, lazy loading below the fold, and appropriate decoding.
- URL filter parsing follows the canonical `lab_q`/`lab_category` contract and never consumes global writing-search `q`.
- Search continues to show an explicit unavailable state if Pagefind cannot load.
- Dynamic effect imports expose a terminal error state. New guide pages and existing effect pages keep their server-rendered text and replace a failed canvas with the labelled unavailable plate.

## Testing strategy

Use test-driven development for behavior changes.

### Unit/component tests

- Navigation route matching and shared link metadata.
- Lab category metadata includes all six categories and unique semantic accents.
- Lab registry includes the three guide slugs, keeps guides out of demo/home subsets, and resolves each renderer alias.
- Lab filter URL parsing/serialization covers valid values, whitespace, 80-character truncation, duplicates, invalid categories, clearing, and preservation of unrelated parameters.
- Lab default and filtered collection selectors cover guide inclusion, deterministic lead exclusion, and empty results.
- Home matrix rotation guard under reduced motion and focus.
- Overlay arbitration ensures Index and Search cannot be open concurrently.
- Effect-module loading reaches explicit ready and error states.

### End-to-end tests

- Home skip link targets the sole main landmark.
- Standard desktop nav exposes Primary and aria-current.
- Mobile index opens, focuses its first link, closes with Escape, and restores focus.
- Search dialog traps focus, exposes labelled combobox/listbox state, closes, and restores focus.
- Opening Search while Index is open closes Index and gives Search sole modal ownership.
- Lab search and category buttons expose labels/pressed state, update the URL, and announce results.
- Active lab filters hide Field guides/benchmark content, include matching guide aliases in compact results, and clear back to the default editorial view.
- Lab index has no horizontal overflow at 390px.
- The featured lab plate and compact long-tail rows both navigate to detail pages.
- Each new guide renders its H1, full animation, MDX section, and inline animated figure.
- New guides appear in Field guides and do not appear in demo-category lists or the home rotation pool.
- Reduced-motion contexts render home and the three guides without page errors or automatic swapping.
- A rejected effect-module request produces the unavailable plate while guide text remains readable.
- Touch-target bounds are checked for the key navigation and lab-filter controls.

### Verification commands

Run the repository's complete unit tests, lint, typecheck, production build, and Playwright suite. Serve the generated out directory and inspect Home, Blog, Projects, Lab, one lab detail, and the mobile menu at desktop and 390px widths in both themes. Capture final screenshots for comparison and inspect the browser console.

## Out of scope

- Replacing the canvas renderer contract.
- Creating a new distributed-systems category or three new simulation engines.
- Rewriting existing blog articles or lab explainers.
- Changing hosting, analytics, content protobufs, or deployment infrastructure.
- Replacing the landing crossword with conventional navigation.
- Making Pagefind search every non-writing page in this pass; the UI is relabelled to match its actual scope.

## Success criteria

- The home page remains immediately recognisable as the current site.
- Conventional navigation is predictable and accessible on every route.
- Collection pages share a clear dossier rhythm without becoming templated card grids.
- The lab shows its live hero experiment in the first viewport when motion is allowed and the module is ready; reduced-motion, loading, and error states show its meaningful poster fallback.
- Three new guide pages provide novel, technically sound, interactive explanations.
- No regression in static export, light/dark theming, reduced motion, keyboard operation, or core E2E flows.
