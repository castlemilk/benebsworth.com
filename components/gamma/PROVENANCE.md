# Gamma component provenance

Retrieved 27 October 2026 through the authenticated Gamma — Nocturne Playground MCP: gamma_get_component(button, includeSource=true), gamma_get_component(range-slider, includeSource=true), plus range-slider usage brief.

React sources are unmodified. The tool returned the full library stylesheet; only the contiguous Button/spinner and Range slider production rules are retained in controls.css, with spin keyframes and reduced-motion treatment. No preview CSS, duplicate library, external fonts or theme reset is imported.

The MCP response did not supply a repository commit identifier. These content hashes pin this retrieved snapshot; do not invent a commit or equate catalogue review with runtime validation.

- RangeSlider.tsx: SHA256 59093142525d4b505193ed68179d4894b57d7254fa532ccfcc2ed47273842470
- controls.css: SHA256 d6b146e477226b5a44de2d8eada40277608d14f06fc8e43e9f78f34e46664a44
- GammaButton.tsx: SHA256 a8ffa0370e5c559c106b5bb6f95d29f62a7bd2536e21a67c87bb87bbaeb9c773

Canonical repository: https://github.com/skunkworq/gamma
App adapter: app/editorial.css maps the maintained site palette/fonts and supports the existing theme state.

## Action menu — 28 October 2026

Retrieved through the authenticated Gamma MCP during FOLIO-005 review. The maintained ActionMenu React source and portable action-menu CSS are copied unchanged; no shortcut bindings are implied. Equation supplies the existing two copy actions and keeps asynchronous feedback outside the closing menu. Local sizing adapters remain in `app/editorial.css`; `app/globals.css` imports the portable stylesheet.

- ActionMenu.tsx: SHA256 fa7fab17f819f6ae42645b6087fbc6fee3c145dc13acacf402e1a31cd584a4e2
- action-menu.css: SHA256 f72c9e53d40d0733255da356913ca19bccec95598ef2d62c0b79af0113d4472a

No upstream commit identifier was supplied; these are snapshot content hashes, not runtime acceptance evidence.
