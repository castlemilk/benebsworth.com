# 0009 — Blog posts stuck on the loading skeleton

**Executive summary.** When a post's JavaScript arrived well after its HTML,
the page could stay on the root `loading.tsx` skeleton for good. The article,
nav and footer were in the DOM but hidden with `display:none`, and the page
never hydrated. The trigger was next-themes re-rendering its root provider with
a new context value straight after hydration, while React still had the post's
Suspense boundaries to hydrate. The theme now lives in a module store, so
nothing above the route tree re-renders. An e2e spec serves the export with
per-request latency to keep it that way.

## Timeline

- **2026-05-31** (`75ecd90`) — next-themes provider wraps the whole app.
- **Date unrecovered** — first user impact. The previous production deployment
  (`63dcf879`, 24 Oct) carried the same provider; the verification agent saw 4
  of its 10 post loads stuck.
- **2026-11-10** — post-deploy verification of `788f9a4` saw 4 of 18 post loads
  stuck through an HTTP/1.1 proxy. Served locally with 30, 45 and 60 ms per
  response: 11/12, 11/12 and 12/18 stuck. Direct loads from this machine and
  Chrome's network throttling against production: 0/24.

## Root cause

next-themes `1.0.0-beta.0` builds a new context value on every render. It
starts `resolvedTheme` from storage (empty on a first visit) and corrects it
from `matchMedia` in an effect. Every first visit therefore changed the root
context right after hydration. A stored theme that differs from the OS does
the same; only a stored theme that matches the OS escaped (0/12 stuck).

React hydrates each Suspense boundary in its own pass. The post's boundaries
(`app/blog/loading.tsx`, `app/blog/[slug]/loading.tsx`) were still dehydrated
while their client chunks were in flight. Once the theme commit landed, React
showed the root `loading.tsx` fallback and hid the server HTML beneath it. The
blog boundary stayed dehydrated inside the hidden tree.

Why it never recovers is not confirmed. The likely path is Next's layout
router: it suspends on a promise that never settles (`use(unresolvedThenable)`
in `layout-router.js`) when it lacks data for a segment. The same context change
over a pending boundary in plain React kept the server HTML (jsdom), so the
router is part of the failure.

It looked correct because a root provider is the documented next-themes setup.
The failure needs HTML that lands well before the JavaScript, which a fast
machine, a nearby edge or Chrome's throttling profiles never produced.

## Guardrails

- `components/theme/theme-store.ts` — the preference lives outside React.
  `useTheme` (`components/theme/use-theme.ts`) reads it with
  `useSyncExternalStore`. `ThemeProvider` renders only the pre-paint script and
  a stateless `ThemeSync`. next-themes is removed from `package.json`.
- `e2e/post-hydration-latency.spec.ts` — `'a first-visit blog post hydrates out
  of its loading skeleton when every request is slow'`. Fails on the `788f9a4`
  export and passes on the fix.
- `components/theme/theme-provider.test.tsx` — `'hydrates cleanly, then
  re-renders only theme readers when the theme resolves or changes'`.
- `components/theme/theme-script.test.ts` — `"agrees with the store's first
  snapshot for every stored value and OS"`.
- Known gap: any other root context that changes right after hydration would
  reopen this. The latency spec covers one post, and no unit test reproduces
  the mechanism.
- The folio-review lab (`app/lab/folio-review/review.tsx`) and its test, plus
  the theme toggle test, read `@/components/theme/use-theme`; nothing imports
  `next-themes` any more.
- Trade-off, measured in CI on 2026-11-11: without the forced root re-render,
  a page's Suspense boundaries hydrate at normal priority. On a slow runner the
  header was live within 0.2s of `load` in 1 of 6 loads, against 6 of 6 with
  next-themes, and in every load by 2s. A click in that window is ignored, and
  the reader repeats it. Specs wait with `waitForSettled` (`e2e/settled.ts`).
