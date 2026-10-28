# Credential-free blog Build Output validation

This lane compiles the **current editorial application** in GitHub Actions and
stores a preview-target Build Output artifact. It does not deploy, read or pull
secrets, attach a GitHub environment, change deployment protection, change
Cloudflare, or turn off existing Vercel Git builds. It does not depend on paid
GitHub environment approval features. The existing token-bearing preview lane
must remain disabled (`VERCEL_PREVIEW_CI_ENABLED=false`); this lane is not an
approval-gate workaround and its artifact is not release approval.

## Exact source and explicit public profile

Prepared against PR #80 head `85e8e52fa894a6fc343c89f165c544b0a17d037b`, based on
editorial `46b4014e3be86dc0ef6b3a07225f51e407a118c8`. No application or content
replacement from master. `scripts/ci/vercel-artifact-profile.json` records each
setting's evidence and limitations:

- A read of the Vercel project on 2026-10-28 verified project
  `prj_sxj2GQBYr1GDrSADoiKBve3nAlmO`, team `team_xE5DMN3hIo8aPqyHNkBybg8r`,
  `nextjs`, and Node `24.x`.
- Repository root is an intentional **local validation setting**, evidenced by
  root `package.json` and `next.config.mjs`. The connector does not expose the
  live project's root/build/install overrides; remote settings parity is NOT
  established. The other local defaults are also explicit, not inferred remote
  values.
- `npm ci` installs the committed npm lockfile. The adapter's install command
  is empty to avoid a second install. `npm run build` preserves prebuild content
  generators, `next build` (`output: 'export'`, trailing slash), OG image rewriting,
  and Pagefind. A fresh empty HOME avoids importing personal harness reports.
- No public environment values are supplied. Analytics/configuration parity is
  unverified. If this build needs missing private values, stop that dependency;
  never fetch credentials or silently replace them with fake values.
- `vercel.json` has only Git-build guards, no headers/redirects. The pinned
  Next adapter generates routing from the current Next config; this patch does
  not manufacture edge configuration or reinterpret Cloudflare `_headers`.
  Cloudflare header/redirect parity is not claimed.

## Opt in and inspect

After review and publication, apply `ci:vercel-artifact` to a same-repository PR.
The `pull_request` labeled/synchronize/reopened events build its **exact head**,
not the synthetic merge commit. Removing the label stops later PR-triggered
runs. Manual invocation, if available on the default branch, requires the full
selected SHA as `confirm_sha`. Neither event grants release authority.

Each job uses a fresh `ubuntu-24.04` runner, Node 24, pinned action commits,
`contents: read`, and checkout with `persist-credentials: false`. No secrets,
protected environment, self-hosted runner, `pull_request_target`, auth pull,
Vercel upload, alias, or promotion is present. Vercel CLI **59.13.1** is pinned
for this lane; the existing disabled preview workflow is untouched.

The local helper writes the audited public `.vercel/project.json`, uses a fresh
HOME and an environment allowlist, and runs:

```sh
vercel build --target=preview --standalone --non-interactive
```

This creates `.vercel/output` locally for a future separately authorized
`--prebuilt` upload. The lane itself never invokes upload. It requires successful
preview metadata, Build Output API v3, nonempty home/blog HTML, sitemap, robots,
rewritten OG image and Pagefind. It rejects forbidden dotenv/Git files and
external/absolute/broken/cyclic symlinks before packaging. The archive includes
only `.vercel/output`, public project/team IDs, and `manifest.json`; no source
checkout, node_modules, environment pull or auth home is archived.

`manifest.json` binds the exact source SHA, run ID/attempt, CLI/Node versions,
public settings profile, per-file SHA-256 digests, and **releaseApproved: false**.
The tarball also has a SHA-256 sidecar. `upload-artifact` v4 stores an immutable
run artifact for seven days. These hashes are integrity evidence, not a signed
release attestation or proof that arbitrary PR code is trusted.

## Validation and remaining gates

```sh
node --test scripts/ci/vercel-artifact.test.mjs scripts/ci/vercel-preview.test.mjs
```

The local fixture/control tests do not establish a successful full application
build. A real green Actions artifact run is required to establish compilation
and packaging for its exact SHA; inspect the manifest and downloaded archive.
The existing `task ci` remains the full site quality gate and is not replaced by
these checks.

Even a green artifact run is NOT a deployment canary. Before any token-bearing
release, independently review the exact workflow/artifact/settings, establish a
supported approval design, then obtain the required release authorization.
A same-SHA READY prebuilt preview, authenticated home/blog/post/lab/search/OG
checks, branch alias verification and absence of remote compilation remain
necessary before global Vercel Git-build disable. Preserve the two preparation
branch Git guards meanwhile. No merge, enable flag, dispatch, security setting,
credential, Cloudflare or global Git-build change is part of this patch.

References: [Vercel local build](https://vercel.com/docs/cli/build),
[prebuilt upload](https://vercel.com/docs/cli/deploy#prebuilt),
[Build Output API](https://vercel.com/docs/build-output-api/v3),
[GitHub artifact immutability](https://github.com/actions/upload-artifact#v4---whats-new).
