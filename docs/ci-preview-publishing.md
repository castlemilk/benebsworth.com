# Editorial previews built and published in CI

The owner selected existing trusted-maintainer permissions rather than branch
protection on 2026-10-28. Anyone able to rewrite the allowed editorial control branch
can change its workflow. These controls are not independent native approval gates.

## Recurring path

Every push to `codex/gamma-blog-editorial-20261027` starts two workflows:

1. `vercel-artifact.yml` compiles exact source on a credential-free ephemeral runner,
   using the reviewed public-only profile, and uploads Build Output plus provenance.
2. `vercel-publish-reviewed.yml` tests controls, then starts a fresh publisher that
   checks out no application source. It waits for the separate exact-SHA artifact run
   to finish successfully, downloads the exact immutable artifact, checks GitHub API
   identity/digests, profile equality, output hashes/safe extraction, and owner identity.
   ALL symlinks are rejected. The token is absent from installation and validation.
3. An explicit owner-trusted-push policy generates a one-hour preview authorization.
   This is not per-artifact human review. `releaseApproved:false` remains unchanged;
   it does not claim production parity or a full application/security test-suite pass.
4. Pinned CLI uploads only `--prebuilt --target=preview` using the existing token,
   exact project linkage and explicit team scope. Unique per-run Git metadata avoids
   implicitly targeting the editorial branch alias during upload.
5. Authenticated deployment metadata must prove READY, exact SHA/run-specific ref,
   preview target and project identity. Only then may the existing editorial alias
   be reassigned. Production/Cloudflare domains are never targeted.

## Freshness and aliases

Publisher runs are serialized, not canceled mid-upload. Branch head is checked while
waiting, immediately before upload, and immediately before aliasing. A superseded
revision cannot knowingly replace a newer preview; if superseded during upload it
keeps its immutable URL but skips alias assignment. GitHub and Vercel have no shared
transaction: a push can still arrive between the last check and alias assignment.
The subsequent serialized current-head run restores latest-head tracking. This is
not an atomic freshness guarantee. Failed builds leave the existing preview intact.

Only this existing preview alias is managed:
`benebsworthcom-git-codex-gamma-blog-ed-351f7b-document-analyser.vercel.app`.
Other 13 baseline aliases, production domains, protection settings and Cloudflare
remain unchanged. Immutable deployment URLs are recorded in the Actions summary.

## Evidence and remaining cutover

The initial CI canary succeeded in Actions run40617625858, deployment
`dpl_7QoN8JDLEcPwgKTBvU7epoQQ6CMh`, source6251b5b. Vercel explicitly used prebuilt
output; home/blog/article/CSS/search/sitemap/robots returned200 and all14aliases
were unchanged. Earlier protected HTTP checks returned200 through the authenticated connector. An additional OG request was later blocked because that tool may create/reuse a23hoursharelink. No further protected fetch is performed without explicit permission for that side effect; it is not a side-effect-free read.
No automation bypass credential is created/read by this workflow; `vercel curl`
is deliberately not used because CLI59 can create a bypass credential.

This recurring workflow must pass a real push build+publish and preview-alias check
before project-wide Git disconnection. Repository `git.deploymentEnabled:false`
already prevents source builds for revisions containing it; old branches can still
trigger Git builds until the project's repository link is disconnected. The supported
pinned CLI action is `vercel git disconnect --yes --scope <existing-team>` from the
verified project directory, in CI, as a separate reviewed cutover step. That action
is NOT in this change. Prebuilt hosting still has deployment processing and charges;
this removes application compilation from Vercel, not hosting or all processing.
