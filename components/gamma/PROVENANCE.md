# Gamma component provenance

Retrieved 27 October 2026 through the authenticated Gamma — Nocturne Playground MCP: gamma_get_component(button, includeSource=true), gamma_get_component(range-slider, includeSource=true), plus range-slider usage brief.

React sources are unmodified. The tool returned the full library stylesheet; only the contiguous Button/spinner and Range slider production rules are retained in controls.css, with spin keyframes and reduced-motion treatment. No preview CSS, duplicate library, external fonts or theme reset is imported.

The MCP response did not supply a repository commit identifier. These content hashes pin this retrieved snapshot; do not invent a commit or equate catalogue review with runtime validation.

- RangeSlider.tsx: SHA256 59093142525d4b505193ed68179d4894b57d7254fa532ccfcc2ed47273842470
- controls.css: SHA256 d6b146e477226b5a44de2d8eada40277608d14f06fc8e43e9f78f34e46664a44
- GammaButton.tsx: SHA256 a8ffa0370e5c559c106b5bb6f95d29f62a7bd2536e21a67c87bb87bbaeb9c773

Canonical repository: https://github.com/skunkworq/gamma
App adapter: app/editorial.css maps the maintained site palette/fonts and supports the existing theme state.
