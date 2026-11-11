# Science collection production release

Published on 24 October 2026 (Australia/Melbourne) to
[benebsworth.com](https://benebsworth.com).

## Deployment receipt

- Cloudflare Pages project: `benebsworth`, production branch `master`.
- Deployment: `ae67e460-d289-46bc-a332-96fc876440e4`.
- Immutable deployment: <https://ae67e460.benebsworth.pages.dev>.
- Cloudflare creation time: `2026-10-23T14:55:48.281742Z`.
- Previous deployment: `f721f242-e970-4fda-bea6-7a6766b84401`.
- Command: `TMPDIR=/private/tmp task deploy:prod --yes`.
- Cloudflare reports the canonical production deployment as successful.

## Source preservation

The main checkout was older than the live site. Deploying it directly would
have removed already-published content. The release was prepared in the
attached worktree at
`/Users/benebsworth/.codex/worktrees/science-production/benebsworth.com`.
Keep this worktree until its source has been integrated into the main checkout;
the main checkout is not a complete production baseline yet.

The release combines the September production sources from
`c34fc19b3bb49bcadf4ccbd210377339bce71f1d` and
`aa5abbbcb30d3303a39b72509f98dbfca51b3d9a`, with the already-published
sitemap and harness-model URL handling captured in `30f76c4`, plus this
collection. Its local merge HEAD is
`ac078b393e6e0e62ebe7d2d37d24c75e35f2e1ba`; the collection and routing
preservation changes were deployed as dirty working-tree changes.

Only the requested ten article/lab pairs were added. The unrelated unpublished
USB Wi-Fi work, graph changes and vector assets in the main checkout were not
included. Existing benchmark results were retained; no benchmark runs were
performed.

The clean-build task now runs Markdown and benchmark-output generation before
the Next build, followed by the existing Open Graph and Pagefind postbuild.
This fixes fresh-worktree exports missing their required generated files.

## Verification

- `task verify` passed: ESLint, TypeScript, prose checks and **1,429 unit
  tests**, with five existing skipped tests.
- `task build:clean` and the deployment's clean build both passed.
- Built-in production verification passed for the home page, blog, lab,
  benchmark, sitemap and robots routes, plus security headers.
- **14 Playwright tests passed against the canonical production domain**:
  all articles and labs, equations, image and Markdown assets, changing model
  geometry/readouts, timeline, playback, reset, camera views, lab discovery,
  mobile layouts, reduced motion, SVG fallback and WebGL context loss.
- **10 additional production policy tests passed**, visiting both the article
  and lab for each model. No enforced CSP violations, uncaught page errors or
  failed same-origin script, style, font or image requests were recorded.
- **12 search tests passed through the live Search dialog**: all ten new
  science articles and the existing Astra/Devin and Splash articles appeared
  with their correct URLs. No Pagefind asset failures or page errors occurred.
  The three live browser suites passed **36 tests** in total.
- The live sitemap has **311 URLs**, preserving all **291 prior URLs** and
  adding exactly the **20 requested routes**.
- The live Markdown for the existing Astra/Devin and Splash articles matches
  the pre-deployment versions byte for byte.

The initial policy test raced streamed hydration while scrolling to a lazy
lesson. The verification helper was corrected to retry the scroll until the
canvas appears; a subsequent full policy run passed. No application changes
or second deployment were required.

Local receipts and test logs are in `/tmp/science-production-after.json`,
`/tmp/science-production-deploy.log`, `/tmp/science-live-playwright-results.json`
and `/tmp/science-live-csp-results.json`.
Search receipts are in `/tmp/science-live-pagefind-receipt.json` and
`/tmp/science-live-pagefind-results.json`.

See [the collection guide](science-workbench-validation.md) for all ten article
and lab links and model boundaries.
