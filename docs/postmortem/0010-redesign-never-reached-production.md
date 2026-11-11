# 0010 — The folio redesign looked "wiped" from production

**Executive summary.** Two weeks of look-and-feel work (the research-folio
redesign: serif display type, the handwritten Caveat accent, red ink notes)
built up on a long-lived umbrella branch and was only ever deployed to Vercel
previews. benebsworth.com is published from master to Cloudflare Pages by a
different path, so a production deploy of master shipped the old design while
everyone believed the redesign was "merged and deployed". Nothing was lost in
git; it was never released. Production can now only move forward along master,
and a daily check fails when production and master drift apart.

## Timeline

- **2026-10-27** (`0d908d6`) — folio components land on
  `codex/gamma-blog-editorial-20261027`; GitHub-built Vercel previews of that
  branch start (`27e3b3e`). Slices merge *into the umbrella branch*, and are
  reported as "merged" and "deployed".
- **2026-11-10** — master (`788f9a4`, no redesign) is deployed to production
  with `task deploy:prod` (Cloudflare `e113dd23`). Correct for master, but it is
  the moment the owner sees the redesign "missing" on the custom domain.
- **2026-11-11** — umbrella PR #78 merges to master (`24803971`). The checked
  publish workflow fails twice on missing Production-environment configuration
  (GA ID, then the Cloudflare token), then publishes (`3aa96b22`).

## Root cause

Two publishing paths with no shared notion of "what is live". Vercel previews
followed the umbrella branch; Cloudflare production followed whatever checkout
ran the deploy. `scripts/deploy-pages.sh prod` deployed any working tree,
`--commit-dirty=true`, and the task docs called serving non-master code
"deliberate". Nothing compared the candidate with what production already
served, so a stale checkout (the shared main checkout sat 114 commits behind
master) would have replaced the redesign without any error. Status reports said
"merged" for merges into a branch that was not master.

## Guardrails

- `scripts/site-release.mjs` `assert-forward` — reads the live
  `/build-info.json` receipt and refuses a release that does not contain the
  live commit. Only `ALLOW_PROD_ROLLBACK=<live sha>` bypasses it.
- `scripts/publish-checked-site.sh` — runs `assert-forward` before upload.
- `scripts/deploy-pages.sh prod` — refuses a dirty tree or anything but the tip
  of origin/master, runs `assert-forward`, and stamps a receipt
  (`stamp-local`) with `--commit-dirty=false`.
- `.github/workflows/production-drift.yml` — daily: fails when production is
  not on master, or master has been unreleased for more than 72 hours.
- `scripts/site-release.test.mjs` — `'a release must contain the commit
  production serves'`, `'only a typed rollback naming the live commit bypasses
  the forward check'`, `'drift flags production off master and long-unreleased
  master work'`.
- The umbrella branch and 28 other merged branches were deleted on 2026-11-11.
  The draft PRs based on it (#95, #98, #134) were retargeted at master.
- Known gap: nothing stops new work from collecting on another long-lived
  branch. The drift check only sees master. Merge to master in small PRs.
