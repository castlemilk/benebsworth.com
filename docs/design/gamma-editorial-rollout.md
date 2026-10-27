# Gamma editorial rollout

## First source slice
- [x] Retrieve Button and Range slider from Gamma MCP; preserve original component source.
- [x] One site-token adapter; no second font/theme network request.
- [x] FieldNote, Assumptions and FigureFocus registered in the native MDX component map.
- [x] Gamma archive action buttons, search label, pressed filter state and operable scrollbar.
- [x] Shared lab Gamma range/actions; existing parameter calculation remains unchanged.
- [ ] Browser visual/keyboard/mobile verification.
- [ ] Review and publish tested source through the existing repository release path.

## Authoring examples
```mdx
<FieldNote title="What changed" kind="observation">
The response changes when damping increases. This note should explain a real observation.
</FieldNote>

<Assumptions>
- Ideal source.
- Fixed component values during the experiment.
</Assumptions>

<FigureFocus title="Response curve" caption="Describe the source and units." note="Explain what to inspect.">
  <Figure src="/path/to/verified-figure.png" alt="Describe the plotted response" width={1200} height={800} />
</FigureFocus>
```
Use a simple image/SVG child rather than nesting Figure when a single figcaption is desired. Notes do not imply verified experimental evidence. Never create fictional data to fill a visual slot.

## Remaining artistic work
Keep three editorial families: personal field essays (restrained object/photographic compositions), engineering explainers (diagram-led figures) and interactive experiments (instrument/control framing). Develop thumbnail proofs at actual archive size, a small semantic annotation gesture kit, source trails and one full article review before broad content migration. Preserve MDX and the existing review gate.

## Artistic correction after review
The first generic component study was rejected. The revised specimen implements the actual folio hierarchy, locally licensed serif/condensed/handwritten fonts, deterministic SVG gestures, target-linked MarginNote/AnnotationTarget/AnnotatedBlock and a code-native wire specimen. This is a materially different composition, not a recolour. Article titles/prose and figure notes adopt the new typography; navigation and unrelated routes remain unchanged. Cross-block ID validation, all-article adoption and browser visual acceptance remain open.
