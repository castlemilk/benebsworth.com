# Agent notes — benebsworth.com

## ui-sdk (SPEC-01 hardware skin)

Before using ui-sdk, follow the `ui-sdk` skill if it's installed, and read
`node_modules/@ui-sdk/react/docs/llms.txt`. To build a new component, also
search `node_modules/@ui-sdk/react/docs/core.md` by heading, and read
`rendering.md` next to it.

- Packages: `@ui-sdk/react` + `@ui-sdk/core` (npm).
- Styles: `app/globals.css` imports `@ui-sdk/core/web.css` in
  `layer(components)` after Tailwind — keep that order so Tailwind's base
  doesn't reset the skin.
- Components come from the SPEC-01 shadcn registry, registered as
  `@spec-01` in `components.json`: `npx shadcn@latest add @spec-01/<name>`.
- Only the knowledge console is wrapped in `<Hardware>` (`components/ui/hardware.tsx`).
  Keep the editorial shell outside it; everything inside inherits its skin.
