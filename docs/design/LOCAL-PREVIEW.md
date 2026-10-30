# Reliable local visual review (FOLIO-028)

## Reproduce the actual exported site

From the repository root, with the existing dependencies installed:

```sh
task build --force
task test:serve
```

The normal build runs its existing pre-generation, Next static export, OG rename,
and Pagefind phases; do not skip postbuild or serve a partial `out/`. The manual
preview is `http://localhost:4321/` by default. Verify that the port's listener
belongs to this invocation before using it. Stop your own server before starting
a fresh one; do not terminate an unidentified listener. A clean browser context
with cache disabled verifies clean-start route loads without deleting other work.

Review actual consumers, starting with:

- `/lab/editorial-system/`
- `/blog/every-wire-is-an-rlc-circuit/`
- `/blog/chaos-in-one-equation/`
- `/blog/` and `/`

Capture light/dark at desktop and 390px phone width, with exact height, URL,
port, source commit **and dirty-worktree status**, build command/result, console
errors and screenshot paths recorded in the acceptance ledger. Verify local
JS/CSS/assets and fonts return successfully. Use a new context for clean-start
checks; never use generated direction boards as implementation screenshots.
Managed preview environments may stage this complete `out/` into their existing
static hosting directory; keep all `_next`, public, OG and Pagefind files together.
Do not pass Vite arguments to Next dev or alter security policy to launch a server.

## Offline OG font contract

`lib/og-fonts.ts` keeps the exact installed Next.js bundled Geist primary font
and loads OFL-licensed Noto fallback bytes from `assets/og-fonts/`. Those assets
are build-only, not new browser fonts. This replaces automatic remote fallback
for authored Greek/category symbols; it does not replace images, routes or
metadata. Local font provenance and license are retained beside the bytes.

```sh
node_modules/.bin/vitest run lib/og-fonts.test.tsx
```

This renders both OG card types across the actual metadata character corpus,
including all six lab category symbols and the hiking fallback symbol, with
network fetches intercepted and rejected. Inline bundled WASM data URLs remain
allowed. Because next/og catches font-load errors, the test explicitly asserts
zero network requests in addition to valid PNG output. New writing systems or
emoji require deliberately extending licensed local coverage, not retrying a
denied Google font request. No external font download or security exception is
part of this workflow.

## Evidence boundaries

A passing font test is **not** a full export or visual acceptance. FOLIO-028 stays
open until a complete build, clean-start consumer loads and the viewport/theme
captures above have been recorded. Deployed acceptance remains a separate gate.

## Verified first slice on 28 October

Full Task verify/build completed with 1,679 tests passed and five skipped, 535
static routes and 76 Pagefind pages. The additional route is the noindex
`/lab/folio-review/` specimen. The real RLC article loaded cleanly from the full
export; its stats and insight were inspected at 1180×757 in light/dark, with
red title ink rgb(179,38,36)/rgb(255,170,165) and no horizontal overflow. The
review specimen uses production components for all seven callout types, long
labels and titleless/rich-content cases. Its 390px content column was measured
and inspected in both themes without overflow; it is not a phone viewport.

Browser DevTools is disabled by policy in this environment. No policy bypass
was used. True phone-viewport, 200% zoom, reduced-motion and print browser
acceptance remain open. Generated direction and actual captures are kept
separately in the blog Space. No production deployment is implied.
