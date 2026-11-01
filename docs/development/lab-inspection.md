# Effect-authored inspection

Opt a full-size Labs graph into the shared tooltip with `EffectModule.inspect(x, timeMs, params)`. Return concise `{label, value}` rows derived from the same formula/data used by the renderer. `x` is normalized0–1; `timeMs` is the exact displayed frame, not wall time. Use `inspection.title` and `inspection.caption` for domain-specific naming/units. Do not invent values, time axes or units. Wave Superposition is the initial integration.

The shared EffectCanvas owns pointer-following positioning, chart/visible-window edge flipping and clamping, crosshair, light/dark appearance, focus inspection, Left/Right/Home/End movement, Escape/blur/outside/scroll/resize dismissal. Touch starts with pointer-down; real touch hardware acceptance remains separate. Unsupported effects and miniature cards do not gain a focus stop or fabricated tooltip.

Inspection holds the displayed timestamp while active; renderers opting in must support replaying a frame without advancing mutable physics state. For stateful simulations, add a snapshot adapter before opting in. Keep readouts short (the current wave readout uses four rows); validate actual longest labels/values at desktop and narrow widths, including a partially scrolled chart. Very small visible graph regions suppress the readout rather than clipping the data. A plot's own accessibility summary is still required; a tooltip is not a replacement for an accessible table or explanation.

Regression boundaries: exact sampling, numeric formatting, edge placement, unsupported/mini opt-out, held frame, keyboard navigation and dismissal. Run the full suite and inspect actual themed screenshots; functional tests alone do not accept the design. Add effect-specific tests whenever another graph adopts the capability.


## Standard visual hierarchy

InspectionRow supports optional `role: 'primary' | 'position'`, `color`, and normalized plot `y` (top=0). The reusable GraphReadout uses the position in its sample header, promotes the primary result, and pairs remaining series with colour swatches. Metadata is optional: ordinary label/value rows still work. A marker must use the renderer's true mapping, never infer a coordinate from a formatted value. Omit markers for hidden or non-plotted series.

Below480px chart width, the same readout docks after the plot instead of covering it. The dock includes a Close button; desktop remains a pointer-following tooltip. Both layouts retain the same values, held timestamp and keyboard controls. The plot keeps its own measured aspect and canvas size while the dock grows below it. Reuse the shared stylesheet rather than per-effect tooltip styling.
