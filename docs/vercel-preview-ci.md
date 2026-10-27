# Vercel previews built in GitHub Actions

The live site and shared staging stay on **Cloudflare Pages**, using the existing
`task deploy:prod` and `task deploy:staging` paths. This workflow replaces only
the remaining Vercel **branch-preview build execution**. It does not publish to
either Cloudflare project, promote production, alter domains, or disable existing
branches' Git integration by itself.

`vercel.json` prevents an unnecessary source build of **only** the new preparation
branch `codex/github-actions-vercel-previews-20261027`. Every unspecified branch
retains Vercel's default enabled behavior. There is deliberately no `"*": true`
rule: a matching `true` rule would override a `false` rule. Publish this file in
the branch's **initial commit** (create the tree/commit first, then create the
branch ref directly at that commit). Creating the branch at an unguarded base
commit first can trigger a chargeable build. This branch-specific Git guard does
not disable explicit prebuilt CLI uploads or replace the global cutover below.

## What runs

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

## Enable safely, then cut over

This is an intentionally staged migration. Until the following prerequisites
are verified, `VERCEL_PREVIEW_CI_ENABLED` stays absent/false and the job skips.
Adding workflow YAML alone does **not** stop Vercel build charges.

1. Inspect existing GitHub environment configuration and reuse the established
   protected preview environment if one exists (update the workflow name if
   needed). Otherwise, configure `preview-deploy` with required reviewers and
   suitable branch restrictions. This is a separate authorized settings change.
   Never allow arbitrary PR code through `pull_request_target`.
2. Verify that a suitably scoped **existing** `VERCEL_TOKEN` is available as an
   environment secret. Do not put it in YAML, repository-wide PR-accessible
   secrets, logs, artifacts, or chat. Any creation/transfer of a token requires
   explicit authorization; this patch creates no credentials or ongoing access.
   Project/team IDs are fixed public identifiers:
   `prj_sxj2GQBYr1GDrSADoiKBve3nAlmO` /
   `team_xE5DMN3hIo8aPqyHNkBybg8r`.
3. Review/publish this change, verify the exact remote SHA, then explicitly enable
   the repository variable `VERCEL_PREVIEW_CI_ENABLED=true`. Push a reviewed
   non-master canary commit containing the workflow, or dispatch on that branch
   once GitHub recognizes the workflow. Approve its exact commit.
4. Leave existing branches' Vercel Git triggers enabled for this first canary;
   only the new preparation branch has the source-build guard above. Require
   a green Actions run and READY deployment for the same SHA. Inspect logs:
   compilation, static generation, postbuild, and Pagefind must run in Actions;
   the Vercel upload must not run `npm run build` / `next build` remotely.
   Prebuilt upload processing can still incur Vercel charges.
5. Verify the new preview and branch alias with authenticated Vercel access.
   The project currently has SSO protection on non-custom domains; an anonymous
   401/403 is not a failed app. Check home, blog, an actual post, a lab page,
   search and an OG image. Compare against the previous preview for the same
   branch. Confirm a Preview deployment (REST may report `target: null`), the
   expected team/project and commit metadata.
6. **Only after that proof**, separately disable Vercel's automatic Git builds
   for this project (all branches, including the obsolete Vercel master build).
   Do not delete the project, domains, aliases, deployment history, or Cloudflare
   configuration. An `ignoreCommand` that starts a remote build is not the goal.
7. Push one more reviewed preview change: require exactly one Actions-built
   preview, no parallel Git-source build, correct updated branch alias, and the
   old immutable preview still accessible. Record both commit/run/deployment
   IDs and the settings change as the cutover evidence.

Changes reach existing feature branches only after they incorporate this
workflow. In particular, incorporate it into
`codex/gamma-blog-editorial-20261027` before relying on its next preview. Merely
merging into master does not retrofit older feature branch workflow files.

## Failure and rollback

- Missing secret/environment approval or a failed build: leave/reinstate the
  previous preview; do not upload source as a workaround or deploy production.
- Incorrect project/team, missing build artifacts or invalid CLI URL: fail
  closed before producing a success link.
- After cutover, stop new CI runs with `VERCEL_PREVIEW_CI_ENABLED=false`. If a
  preview must be restored urgently, temporarily re-enable the previous Git
  trigger as a separately authorized rollback, accepting the remote-build cost.
  Do not run both pipelines indefinitely.

## Focused checks

```sh
node --test scripts/ci/vercel-preview.test.mjs
node --check scripts/ci/vercel-preview.mjs
```

These test guardrails, not the site's full build or a real Vercel upload. Run the
actual canary and authenticated smoke checks before declaring migration complete.
The existing full site quality gate remains `task ci`.

References: [Vercel prebuilt deployments and branch metadata](https://vercel.com/docs/cli/deploy),
[branch-scoped pull](https://vercel.com/docs/cli/pull),
[branch-scoped Git build controls](https://vercel.com/docs/project-configuration/git-configuration),
[GitHub protected environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
