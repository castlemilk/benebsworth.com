# Vercel previews built in GitHub Actions

## Current source configuration

The public site is published to **Cloudflare Pages** project `benebsworth` by
`.github/workflows/publish-site.yml` (**Publish checked site**), after its exact
master commit passes `task remote:check`. See
[Remote blog drafts and publication](remote-blog-publishing.md) for the release
inputs, existing Production environment and live-byte verification. Vercel
preview deployments do not establish what `benebsworth.com` serves. Existing
shared staging remains a separate Cloudflare path.

The reconciled source retains three independent CI lanes:

| Lane | Source and purpose | Deployment behavior |
| --- | --- | --- |
| Cloudflare release | `site-checks.yml` and manual `publish-site.yml` | Validate the reviewed master source, then publish its checked export to the public domain through the existing Production environment. |
| Editorial artifact and publisher | `vercel-artifact.yml` and `vercel-publish-reviewed.yml` | Build the exact editorial source without deployment credentials; the separate reviewed publisher verifies the artifact and uploads only a prebuilt preview. |
| Legacy opt-in preview | `vercel-preview.yml` | Retained behind `VERCEL_PREVIEW_CI_ENABLED == 'true'` and `preview-deploy`; keep this lane disabled while the reviewed publisher is active. |

`vercel.json` contains **`git.deploymentEnabled: false`**. Preserve that global
source-build guard and its matching assertion in
`scripts/ci/vercel-preview.test.mjs`; restoring the older branch-only map would
re-enable Vercel source builds on other branches. The guard does not prevent
explicit `--prebuilt` uploads or change Cloudflare publishing. Current dashboard
configuration and served content still require deployment evidence; this source
setting is not a claim about a live release.

## Editorial preview lane

The artifact workflow builds the exact `codex/gamma-blog-editorial-20261027`
commit on editorial pushes, or an explicitly selected same-repository PR head.
It uses the committed public-only configuration profile and records source,
run, file hashes and `releaseApproved: false`. It does not pull environment
secrets. See [Build Output validation](vercel-artifact-validation.md) for that
lane's original scope and limitations; its initial branch-guard/cutover notes
are historical, and the current global guard is described above.

The separate publisher preserves its existing owner-trusted branch policy,
`preview-deploy` environment, allowed actor/ref checks, immutable artifact
verification and fresh branch-head checks. It installs the pinned upload tool
outside the artifact, uploads with `--prebuilt --target=preview`, verifies READY
identity and updates only the established editorial preview alias. The policy
records the earlier qualified canary; that receipt does not qualify a new
source commit. No application code runs in the upload job, and no Cloudflare
release, Vercel production promotion or broadened credential access is implied.

The legacy reconciliation branch exclusion is retained in
`vercel-preview.yml`, even if its opt-in flag is enabled elsewhere. Resolving
these source conflicts does not enable that legacy lane or modify any GitHub
environment, credential, publisher policy, domain or protection setting.

## Legacy opt-in preview workflow

The following describes the retained `vercel-preview.yml` implementation. It
is not the active editorial artifact/publisher path and must not run alongside
that publisher for the same branch.

- A push to a non-`master` branch in `castlemilk/benebsworth.com`, or a manual
  retry on such a branch. No duplicate push + PR build and no tag/branch-delete
  deploy. Fork PRs do not receive deployment credentials.
- The job waits for approval in the protected `preview-deploy` environment.
  Review **the exact run commit and workflow changes** before approving; a
  same-repository branch is not automatically trusted. Checkout is pinned to
  that SHA with persisted GitHub credentials disabled.
- `npm ci`, then pinned Vercel CLI 65.1.0. Node 24 matches the actual Vercel
  project's current `24.x` setting; `.nvmrc` still describes older local usage.
- `vercel pull --environment=preview --git-branch=...` preserves branch-specific
  preview settings. `vercel build --target=preview` executes on the GitHub
  runner using the existing full build lifecycle. The actual upload payload is
  checked for Build Output API v3, successful preview build metadata, HTML,
  sitemap, robots, rewritten OG image and Pagefind assets.
- `vercel deploy --prebuilt --target=preview` uploads that output; there is
  deliberately **no source-upload fallback**. Explicit GitHub branch/SHA metadata
  retains the Vercel branch association despite Actions' detached checkout.
  A read-only branch-head check rejects superseded manual reruns before upload;
  per-branch concurrency cancels older active runs when new work arrives.
- The preview URL is exposed in the GitHub environment, job output and run
  summary. Existing immutable preview URLs remain valid. The new URL and branch
  alias must be verified during cutover; this workflow does not invent or
  reassign aliases itself. It does not add a separate PR-comment bot.

The token exists only in the pull and upload steps. Pulled `.vercel` files are
never logged, cached, or uploaded as Actions artifacts and are removed at job end.
Build code can read the preview configuration pulled for it, so environment
review must happen before **any** job code executes.

## Preserve the existing release boundaries

- Keep `VERCEL_PREVIEW_CI_ENABLED` absent/false while the separate reviewed
  publisher serves editorial previews. A merge is not an instruction to enable
  another deployment lane.
- Keep `git.deploymentEnabled: false` and the matching regression together.
  The earlier preparation-branch maps are superseded by this current guard.
- Keep the fixed project/team identity checks, exact-source checkout,
  branch-head freshness, preview-only target and prebuilt-only upload. Never
  add a source-upload fallback or `pull_request_target` credential path.
- Keep the existing environment and credential bindings. Inspect their actual
  configuration through the supported provider before a release; documentation
  or an old success does not prove current availability. Do not move secrets or
  relax branch/environment controls to make a job run.
- Confirm the exact run, source SHA, artifact, deployment target and established
  alias after each preview publication. A successful artifact build alone is
  not browser acceptance or a public-domain release.

The original branch-only migration and canary plan remains in Git history.
Reconciliation preserves the later editorial configuration instead of replaying
that initial cutover. Existing feature branches inherit these files only when
they incorporate the reconciled source.

## Failure and rollback

- Missing secret/environment approval or a failed build: leave/reinstate the
  previous preview; do not upload source as a workaround or deploy production.
- Incorrect project/team, missing build artifacts or invalid CLI URL: fail
  closed before producing a success link.
- Keep the legacy opt-in flag disabled during recovery. Inspect the existing
  immutable deployment and branch alias before changing any source or settings.
  Any rollback uses the already authorized provider process; do not re-enable
  Git-source builds or another publisher as an automatic fallback.

## Focused checks

```sh
node --test scripts/ci/vercel-preview.test.mjs
node --check scripts/ci/vercel-preview.mjs
```

These test guardrails, not the site's full build or a real Vercel upload. Run the
actual canary and authenticated smoke checks before declaring migration complete.
The Cloudflare release uses `task remote:check`, including the full export and
browser suite. The editorial artifact lane has its own documented scope; do not
claim that one lane's checks establish the other lane's release acceptance.

References: [Vercel prebuilt deployments and branch metadata](https://vercel.com/docs/cli/deploy),
[branch-scoped pull](https://vercel.com/docs/cli/pull),
[branch-scoped Git build controls](https://vercel.com/docs/project-configuration/git-configuration),
[GitHub protected environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
