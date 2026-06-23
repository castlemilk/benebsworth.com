---
name: deploy
description: Deploy benebsworth.com to production or staging. The live site is on Cloudflare Pages (AWS S3+CloudFront is a dormant fallback).
---

# Deploy benebsworth.com

The site is a fully static export (`next build` → `out/`) served by **Cloudflare Pages**
(migrated off AWS S3+CloudFront on 2026-06-23).

## Architecture
- **Two Cloudflare Pages projects**: `benebsworth` (prod) and `benebsworth-next` (staging).
- **DNS on Cloudflare** (registrar GoDaddy, nameservers `luke`/`mckinley.ns.cloudflare.com`).
  `benebsworth.com` + `www` + `next.benebsworth.com` are CNAMEs → `<project>.pages.dev`.
- **Security headers + CSP** ship in-repo via `public/_headers`; **www→apex 301** is a
  Cloudflare dynamic-redirect ruleset.
- **IaC**: `infra/cloudflare/` (Terraform; DNS, zone settings, Pages projects). Pages
  custom domains, the www-redirect, and the google-verify TXT are API/dashboard-managed.
- **Analytics**: GA4 (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, prod-only); CF Web Analytics via the
  Pages dashboard toggle.

## Deploy
```bash
# staging → next.benebsworth.com (project benebsworth-next)
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npm run deploy:pages:next
# prod → benebsworth.com (project benebsworth)
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npm run deploy:pages:prod
```
`scripts/deploy-pages.sh` runs `next build` then `wrangler pages deploy out --project-name=<…>
--branch=<production-branch>` (the `--branch` makes it a production deploy, not a preview).

## Rollback / dormant AWS
AWS S3 + both CloudFront distributions are still live-but-unused (0 DNS points at them).
To roll back, point the apex/www/next CNAME **content** back at the CloudFront targets
(`d1nnawiq8qdjgb.cloudfront.net` prod, `d1qwco52fxejjm.cloudfront.net` next) — a DNS change,
no rebuild. The legacy AWS deploy (`npm run deploy:aws:*` → `scripts/deploy.sh` → 3-pass
`aws s3 sync` + CloudFront invalidation, `SKIP_ARCHIVE=1` to skip the flaky Gatsby archive)
still works if you ever re-point DNS at it.
```bash
SKIP_ARCHIVE=1 npm run deploy:aws:prod   # legacy AWS path (dormant)
```

Full detail + the migration play-by-play: `.claude/skills/deploying-the-site/SKILL.md` and
`docs/superpowers/{specs,plans}/2026-06-23-cloudflare-*`.
