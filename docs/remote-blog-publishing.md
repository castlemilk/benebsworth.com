# Remote blog drafts and publication

## Supported path

Remote authoring host → reviewed branch with MDX and image bytes → `Site checks`
→ explicitly reviewed release commit on `master` → manual `Publish checked site`
→ Cloudflare Pages project `benebsworth` → receipt and live article verification.

The workflows use `ubuntu-latest`, Node 22, the npm lockfile, Task and Chromium.
They do not need this Mac, its `.env`, local image files, `.omega/reports`, Ollama,
or a benchmark run. Existing Task build phases generate Markdown siblings and
benchmark output assets, then export Next, rewrite OG URLs and build Pagefind.
`task remote:check` cleans first and calls the normal full build; it avoids the
older `build:clean` definition that omitted generation. It runs the existing
verification/browser suites and the release regression tests. Browser checks use
a fresh server with one worker, never a possibly stale listener.

## Draft and review

Use `$blog "seed"` in Codex or `/blog "seed"` in Claude Code with repository
access. Other hosts can read `.agents/skills/blog/SKILL.md` explicitly. The same
editorial and style + theme + topic guidance applies remotely; use the imagegen
capability available to that host. If it is unavailable, hand off the exact brief
and required sizes instead of inventing artwork completion.

The initial integration commit must also include the already prepared local blog
skill support files (`.agents/skills/blog/{references,scripts,evals}/`), Claude
adapter (`.claude/skills/blog/SKILL.md`) and the editorial skill's linked image
composition reference. They were installed locally earlier; an untracked local
skill is not available to a fresh remote clone merely because the workflow exists.

1. Choose a current source base after checking active PRs and the production
   receipt. Do not reset a dirty checkout or assume master equals production.
2. Keep `release: false` and `draft: true` as YAML booleans. Add
   `content/blog/<slug>/index.mdx` plus real image bytes in both
   `content/blog/<slug>/` and `public/blog/<slug>/`. Stage those exact paths when
   a push/PR has been requested. Check with `git ls-files`; an image in Library,
   a sandbox attachment, or a local absolute path is not an asset in a clone.
3. Keep private working notes outside this **public repository**. The source of a
   draft committed here is publicly readable even though the site hides its route.
   `public/` is public by definition; do not put provenance/private briefs there.
4. A seed alone does not authorize pushing, opening a PR or publishing. Deliver a
   review package first, then create the remote draft PR only when requested.
   Review its exact head SHA, text and imagery. Current Vercel Git integration
   may create a public preview from pushes independently of these workflows.
5. `Site checks` runs on PRs, master pushes or an explicit validation dispatch.
   PR checks explicitly build the head SHA on both hosts (not a synthetic merge);
   missing PR diff context fails instead of silently selecting an empty range.
   It has no deployment secrets and no publish command. Draft HTML, feed, sitemap
   and search are excluded by the existing loader; draft asset directories are
   removed from **out/** before the new workflow's reviewed export is uploaded.
   Stale public Markdown or malformed flags fail preflight. A draft preview that
   needs rendered HTML must remain an explicitly prepared review artifact; never
   flip the committed draft flags just to make CI render it.
6. Inspect the CI result and download `site-review-<sha>` before claiming artifact
   delivery. The artifact is a production-shaped export, so it excludes drafts.
   Inspect the MDX/image diff or an authoring-host preview for draft content.

New/changed posts must have tracked, matching asset mirrors. `PROSE_BASE` scopes
strict missing-mirror checks to the reviewed change; unchanged historical missing
content copies are reported as warnings. Missing/untracked public assets, unsafe
paths, differing mirrors and malformed flags remain failures for the entire tree.

## Explicit release

Only after the author approves publication, review a commit that sets the intended
post to `release: true`, `draft: false` and includes its generated Markdown. Inspect
the complete diff so no other draft becomes published accidentally. Use the usual
PR review/merge permissions; this workflow does not change repository protections.

In GitHub Actions, choose **Publish checked site**, branch **master**, and supply:

- `expected_sha`: full 40-character SHA of the reviewed current master.
- `reviewed_base_sha`: earlier ancestor SHA bounding the complete reviewed release
  diff; it cannot equal `expected_sha`. Prose and changed-asset gates use this range.
- `article_path`: `/blog/<published-slug>/` (an existing article is sufficient for
  an authorized infrastructure-only smoke release).
- `confirmation`: `publish-benebsworth.com`.

These inputs prevent accidental release; they are not a replacement for review.
No release is triggered by a draft, PR, push, schedule or completion of CI. The
manual run builds/tests that exact commit in one job, checks the output digest,
checks the configured GA4 loader and compares the current production sitemap.
Unreadable production or any disappearing route stops the upload. Planned route
removals need a separately reviewed change to this policy, not a bypass flag.

The job uses the existing Wrangler dependency, Pages project and production branch
to upload the already checked `out/` without rebuilding. Wrangler receives the
selected SHA and `commit-dirty=false`. `/build-info.json` identifies the commit and
export digest. Live verification compares that receipt plus the chosen article,
its Markdown and a bounded set of its image bytes against the validated export.
HTML comparison removes only the known Cloudflare Web Analytics beacon injection
and its adjacent closing-body whitespace; it never strips arbitrary scripts or
article text. Markdown and image comparison remains byte-exact.
A failed post-upload check means **upload may have completed, verification failed**;
inspect the existing deployment before retrying, never blindly redeploy.

The workflow needs authorized `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
secret bindings plus the existing public `NEXT_PUBLIC_GA_MEASUREMENT_ID` variable.
It binds the already existing GitHub `Production` environment and honors its
configured controls; this source change does not create or alter those controls.
No credentials are generated or copied by these scripts. Missing bindings stop
the release. Existing environment protection must be retained; do not work around
it by moving a protected credential into repository scope.

## Cuttlefish is an execution choice, not a YAML label

The inspected Cuttlefish compatibility engine accepts `ubuntu-latest` but executes
Linux on ARM64. A matching label does not enroll this repository. The operator
must identify the intended project, repo mapping, compatible pinned job image and
live workflow allow-list. No such enrollment is changed by this work. Use either
GitHub execution or the authorized Cuttlefish cutover, avoiding duplicate builds.

Keep the two workflow files separate: Cuttlefish collects secret references across
an entire workflow, so a skipped publish step is not a credential boundary.
Its shadow mode produces neutral checks, not publication. Protected environments
with required reviewers/wait/custom rules are refused; do not remove protections
to make a run proceed. Artifact publication is best effort and cross-rig downloads
are not implemented, so publication builds and uploads within one job. Verify a
downloadable review artifact separately. Do not claim a Cuttlefish run until its
original receipt identifies the repository, commit, workflow and conclusion.

## Integration status at 24 October 2026

This implementation is local source, not a deployed pipeline. The GitHub audit
found zero Actions workflows/runs and no repository self-hosted runners; master
was `d851adc0534e2aecdcf7cb6c2a47e4b91eb15a33`. Vercel deployment statuses exist,
but they do not prove what the Cloudflare custom domain serves.

The later Cloudflare release receipt is
`ae67e460-d289-46bc-a332-96fc876440e4`, based on local merge
`ac078b393e6e0e62ebe7d2d37d24c75e35f2e1ba` **plus dirty changes**. Its published
science/routing source must be reconciled into the reviewed release branch before
using master to replace production. Preserve that release checkout until then.
The source mismatch is not fixed by a successful build. Current public verification
reads returned HTTP 403, so this audit has not independently confirmed the live
deployment or an exact serving commit. The new preflight fails closed in that case.

Repository secret/variable name lists were empty; Production environment secret
metadata was not obtained. Cuttlefish catalog access was observed, but the intended
project mapping/live mode and credential bindings remain unverified. Activation,
source reconciliation and a separately authorized release are still required.

References: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax),
[Cloudflare CI uploads](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/),
[Cloudflare preview visibility](https://developers.cloudflare.com/pages/configuration/preview-deployments/).
