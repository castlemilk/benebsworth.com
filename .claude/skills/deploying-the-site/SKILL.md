---
name: deploying-the-site
description: Use when deploying benebsworth.com (staging or prod), changing CloudFront/S3/DNS/cache/security headers, or touching infra/ Terraform — covers the content-deploy path, the S3 remote-state backend, the staging-vs-prod architecture split (prod adopted + self-contained), and the Terraform-managed prod headers/CSP.
---

# Deploying benebsworth.com

Static Next.js (`output: 'export'`) → `out/` → **S3 + CloudFront**. NOT Vercel (ignore the Vercel session plugins). Two environments:

| Env | URL | Distribution | Bucket |
|---|---|---|---|
| staging ("next") | https://next.benebsworth.com/ | `E1VMC7Y17IQOR9` | `benebsworth-site-staging-299413881343` |
| prod | https://benebsworth.com/ | `E30L2WGIX5OPQG` | `benebsworth.com` |

**Content deploys and Terraform are two completely separate systems.** Confusing them wastes hours (it did once). Content = `aws s3 sync` + invalidation. Terraform = the CloudFront/S3/DNS infra. You almost always want *content*.

## Terraform: prod is adopted now (fixed 2026-06-19)

Prod **used to** be a landmine — empty local state + architecture drift made a prod plan read **"13 to create"** (would have recreated the bucket/distribution/cert and overwritten the live `benebsworth.com`/`www` DNS, taking the site down). **Fixed:**
- The live prod resources were adopted via `import` + `-generate-config-out` into a **self-contained** `infra/envs/prod` (`adopted.tf`), decoupled from `modules/site` (prod's architecture differs — see below).
- State moved to a **remote S3 backend** (`benebsworth-tfstate-299413881343`, versioned/encrypted/private) so it survives fresh clones — the empty-state landmine can't recur.
- `terraform plan` (prod) now reports **"No changes"**; `terraform apply` (prod) is safe.

**Still always `terraform plan` first** and confirm "No changes" (or only your intended edits) before `apply`. Never point prod at the OAC module — prod and staging are different architectures.

## Content deploy (the 99% case)

```bash
SKIP_ARCHIVE=1 npm run deploy:next    # staging → scripts/deploy.sh staging
SKIP_ARCHIVE=1 npm run deploy:prod    # prod    → scripts/deploy.sh prod
```
- `SKIP_ARCHIVE=1` skips the flaky legacy Gatsby `build:archive` (the script documents this).
- After finishing deployable work, **auto-deploy to staging** for review without asking; **never auto-deploy prod** (see [[auto-deploy-staging]]).
- `deploy.sh` does: `npm run build` → **3-pass `aws s3 sync`** → CloudFront `/*` invalidation.
  - Pass 1: `_next/static/*` (content-hashed) → `max-age=31536000, immutable`.
  - Pass 2: media (`*.webp,png,jpg,jpeg,gif,svg,avif,ico,woff2,mp4,webm`) → `max-age=86400` (CDN invalidated each deploy, so only browser repeat-loads use this window; raise once content settles).
  - Pass 3: everything else (HTML, sitemap, feed, robots, llms, `.md` siblings) → `max-age=60`.
- `DIST_ID`/`BUCKET` come from `terraform output` (now works for both envs) **or** env-var override. Needs working AWS creds (`default` profile = account `299413881343` / `dev-deployer`, which owns both buckets).

## Infra reality (read before touching `infra/`)

- Envs `infra/envs/{staging,prod}`, both on a **remote S3 backend** (`benebsworth-tfstate-299413881343`, keys `staging/` + `prod/`). State is durable across clones.
- **Staging** (dist `E1VMC7Y17IQOR9`) uses the shared module `infra/modules/site` — S3 **REST** origin + **OAC** + the `rewrite` function + (now applied) the **security-headers policy + CSP** (parity with prod). `terraform plan/apply` (staging) needs only the secret `TF_VAR_dnsimple_token` (repo `.env` → `DNSSIMPLE_TOKEN`); `dnsimple_account` defaults to **`54968`** and `dnsimple_zone` defaults in the module. Plan is clean ("No changes"). ⚠️ `dnsimple_account` MUST be the **numeric id `54968`**, not the name `"benebsworth"` — the name makes the provider hit `GET /v2/benebsworth/… → 401` (this once looked like a "missing record" but the record was fine; the account id was wrong).
- **Prod** (dist `E30L2WGIX5OPQG`) is **self-contained** (`infra/envs/prod/{main,adopted,providers}.tf`), **AWS-only (no DNSimple token needed)**, decoupled from the module. Older architecture: S3 **website-endpoint** origin (`…s3-website-…`), **public bucket**, **no OAC/function**, legacy forwarded-values cache. DNS + the ACM cert are managed **outside** Terraform (the distribution references the cert ARN literally). To change prod infra: edit `adopted.tf` → `terraform plan` (expect "No changes" + your edit) → `apply`.

## Security headers + CSP (prod)

CloudFront response-headers policy **`security-benebsworth-com`** (id `b577b51c-65b3-4b6c-9993-e07a1c1dbe58`), attached to dist `E30L2WGIX5OPQG`. Originally applied via CLI, **now Terraform-managed** in `infra/envs/prod/adopted.tf`. Headers: HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a **tested CSP**.

CSP (validated: 0 console violations across home/post/lab/about, incl. the `i.ytimg.com` talk thumbnails):
```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com; font-src 'self'; connect-src 'self'; frame-src 'none'; upgrade-insecure-requests
```
- `'unsafe-inline'` is required: the static export inlines the anti-FOUC theme script + Next bootstrap + hundreds of `style=` attrs, and a static site can't mint nonces. `i.ytimg.com` is for the /about YouTube thumbnails. Fonts are self-hosted by `next/font`.
- **Change it:** edit the `aws_cloudfront_response_headers_policy.security` block in `infra/envs/prod/adopted.tf` → `terraform apply`. (Or imperatively: `aws cloudfront update-response-headers-policy`.)

To validate a CSP change before shipping: serve `out/` locally with the candidate header (a ~30-line node http server) and load pages in a browser checking the console for `Refused to…` violations. Drop `upgrade-insecure-requests` for the localhost test only.

## www → apex redirect

- Staging/module: handled by `infra/cloudfront-rewrite.js` (`www.*` → apex 301, domain-agnostic) — applies on `terraform apply` staging.
- **Prod: not applied** (no function; website-endpoint origin). Canonical tags already point Google at non-www, so it's low-urgency. Adding it to prod means creating + associating a viewer-request function on the website-endpoint distribution.

## Verify after any deploy / infra change

```bash
# headers + cache (prod)
curl -sI https://benebsworth.com/ | grep -iE 'http/|cache-control|content-security|strict-transport|x-frame|x-content-type|referrer'
# a long-cached image vs short-cached HTML
curl -sI https://benebsworth.com/blog/<slug>/hero.webp | grep -i cache-control   # max-age=86400
curl -sI https://benebsworth.com/blog/<slug>/ | grep -i cache-control            # max-age=60
```
Then load a couple of pages in a real browser and confirm **0 console errors** (CSP violations show as errors). The `og-rewrite.mjs` postbuild + extensionless-route gotcha is documented in [[staging-deploy]].
