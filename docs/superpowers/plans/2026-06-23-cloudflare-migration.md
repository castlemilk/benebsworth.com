# Cloudflare Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate benebsworth.com from AWS S3+CloudFront (DNSimple DNS) to Cloudflare Pages, with Cloudflare as authoritative DNS + CDN, CF Web Analytics + GA4, keeping AWS dormant as a fallback.

**Architecture:** Static `out/` export deployed to two Cloudflare Pages projects (prod `benebsworth`, staging `benebsworth-next`). Cloudflare authoritative DNS (NS moved from DNSimple at GoDaddy), all records replicated. Security headers/CSP/redirects ship in-repo via `public/_headers` + `public/_redirects`. Staged, reversible cutover; AWS left intact-but-unused.

**Tech Stack:** Next.js 16 static export, Cloudflare Pages + Wrangler, `cloudflare/cloudflare ~>5` Terraform provider, `@next/third-parties` (GA4), Pagefind (existing).

**Spec:** `docs/superpowers/specs/2026-06-23-cloudflare-migration-design.md`

**Conventions:** Reuse the shared Cloudflare account (`2132ccf47ceb5fff234c34d85490470a`) + its account-scoped token (in `../shorted/.env` as `CLOUDFLARE_API_TOKEN`). Terraform remote state in the existing backend bucket `benebsworth-tfstate-299413881343`, new key `cloudflare/`. **Phases A–C are safe and inert on the live AWS site. Phase D contains the user-owned nameserver flip and the serving cutover. Phase E detaches AWS.**

---

## Phase A — App-side changes (safe; inert on AWS, ready for Pages)

### Task 1: Analytics — add GA4, keep CF beacon, drop Plausible

**Files:**
- Modify: `components/analytics/analytics.tsx`
- Modify: `package.json` (add `@next/third-parties`)
- (No `app/layout.tsx` change — it already renders `<Analytics />`.)

- [ ] **Step 1: Install the GA4 helper**

Run: `npm install @next/third-parties`
Expected: adds `@next/third-parties` to `dependencies`, exit 0.

- [ ] **Step 2: Rewrite the analytics component**

Replace the whole body of `components/analytics/analytics.tsx` with:

```tsx
import { GoogleAnalytics } from '@next/third-parties/google'

/**
 * Production-only, env-gated analytics. Two cookieless/GA providers:
 *
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID   GA4 (like ../shorted). Renders the gtag
 *                                   loader via @next/third-parties.
 *   NEXT_PUBLIC_CF_BEACON_TOKEN     Cloudflare Web Analytics beacon. OPTIONAL —
 *                                   leave UNSET when CF Web Analytics is set to
 *                                   "automatic" injection at the edge (the
 *                                   default in this project's Terraform), so the
 *                                   beacon isn't injected twice.
 *
 * Both only render in production builds, so dev/preview ship no third-party JS.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const CF_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN
const IS_PROD = process.env.NODE_ENV === 'production'

export function Analytics() {
  return (
    <>
      {IS_PROD && GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      {IS_PROD && CF_TOKEN ? (
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: CF_TOKEN })}
        />
      ) : null}
    </>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add components/analytics/analytics.tsx package.json package-lock.json
git commit -m "feat(analytics): add GA4 (@next/third-parties), keep CF beacon, drop Plausible"
```

---

### Task 2: Security headers, CSP, and redirects for Pages

**Files:**
- Create: `public/_headers`
- Create: `public/_redirects`

The CSP extends the current one with `'wasm-unsafe-eval'` (Pagefind) **and** the GA4 + Cloudflare Web Analytics domains. `public/**` is copied verbatim into `out/` by the static export, so these ship with every deploy and are version-controlled.

- [ ] **Step 1: Write `public/_headers`**

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com https://www.googletagmanager.com https://*.google-analytics.com; font-src 'self'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://cloudflareinsights.com; frame-src 'none'; upgrade-insecure-requests

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 2: Write `public/_redirects`**

```
https://www.benebsworth.com/* https://benebsworth.com/:splat 301
```

- [ ] **Step 3: Build and confirm both ship into `out/`**

Run: `npm run build && ls out/_headers out/_redirects`
Expected: both paths listed, exit 0.

- [ ] **Step 4: Verify the CSP still allows Pagefind WASM AND the analytics domains**

Create a throwaway check `csp-check.cjs` at repo root that serves `out/` with the EXACT `Content-Security-Policy` value from `public/_headers` (strip `upgrade-insecure-requests` for localhost), launches Playwright, opens `/blog/`, runs the ⌘K search for "fourier", and asserts results appear with zero `Refused to`/WASM console errors. (Reuse the pattern proven earlier in this project's history.)

Run: `node csp-check.cjs && rm csp-check.cjs`
Expected: `✅ SEARCH WORKS under prod CSP`, `CSP/console violations: NONE`.

- [ ] **Step 5: Commit**

```bash
git add public/_headers public/_redirects
git commit -m "feat(cf): ship security headers + CSP + www->apex redirect for Cloudflare Pages"
```

---

### Task 3: Wrangler config + Pages deploy scripts

**Files:**
- Create: `wrangler.toml`
- Modify: `package.json` (add `wrangler` devDep + `deploy:pages:*` scripts)
- Create: `scripts/deploy-pages.sh`

- [ ] **Step 1: Install wrangler**

Run: `npm install -D wrangler`
Expected: `wrangler` in devDependencies, exit 0.

- [ ] **Step 2: Write `wrangler.toml`**

```toml
name = "benebsworth"
pages_build_output_dir = "out"
compatibility_date = "2026-06-23"
```

- [ ] **Step 3: Write `scripts/deploy-pages.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
ENV="${1:?usage: deploy-pages.sh [staging|prod]}"
case "$ENV" in
  staging) PROJECT="benebsworth-next" ;;
  prod)    PROJECT="benebsworth" ;;
  *) echo "error: ENV must be 'staging' or 'prod' (got '$ENV')" >&2; exit 1 ;;
esac
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
npm run build
npx wrangler pages deploy out --project-name="$PROJECT" --commit-dirty=true
echo "deployed $ENV -> Cloudflare Pages project $PROJECT"
```

- [ ] **Step 4: Add scripts to `package.json`**

Add to `"scripts"` (keep the AWS `deploy:next`/`deploy:prod` until Phase E):

```json
"deploy:pages:next": "bash scripts/deploy-pages.sh staging",
"deploy:pages:prod": "bash scripts/deploy-pages.sh prod",
```

- [ ] **Step 5: Verify wrangler is wired + authenticated**

Run: `CLOUDFLARE_API_TOKEN=$(grep -E '^CLOUDFLARE_API_TOKEN=' ../shorted/.env | cut -d= -f2- | tr -d "\"'") npx wrangler whoami`
Expected: prints the authenticated account (`Ben.ebsworth@gmail.com's Account`).

- [ ] **Step 6: Commit**

```bash
git add wrangler.toml scripts/deploy-pages.sh package.json package-lock.json
git commit -m "feat(cf): wrangler config + Cloudflare Pages deploy scripts"
```

---

## Phase B — Cloudflare DNS + zone (Terraform, grey-cloud, NO serving change)

> All website records start grey-cloud pointing at the CURRENT CloudFront targets, so the later nameserver flip changes nothing about how the site is served.

### Task 4: Scaffold `infra/cloudflare/` (provider + variables + zone)

**Files:**
- Create: `infra/cloudflare/providers.tf`
- Create: `infra/cloudflare/variables.tf`
- Create: `infra/cloudflare/zone.tf`

- [ ] **Step 1: `providers.tf`**

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket  = "benebsworth-tfstate-299413881343"
    key     = "cloudflare/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

- [ ] **Step 2: `variables.tf`**

```hcl
variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}
variable "cloudflare_account_id" {
  type    = string
  default = "2132ccf47ceb5fff234c34d85490470a" # Ben.ebsworth@gmail.com's Account
}
variable "domain" {
  type    = string
  default = "benebsworth.com"
}
```

- [ ] **Step 3: `zone.tf` (v5 nested account form)**

```hcl
resource "cloudflare_zone" "main" {
  account = { id = var.cloudflare_account_id }
  name    = var.domain
  type    = "full"
}

output "nameservers" {
  value = cloudflare_zone.main.name_servers
}
output "zone_id" {
  value = cloudflare_zone.main.id
}
```

- [ ] **Step 4: Init + validate (catches any v5 arg drift)**

```bash
export TF_VAR_cloudflare_api_token=$(grep -E '^CLOUDFLARE_API_TOKEN=' ../shorted/.env | cut -d= -f2- | tr -d "\"'")
terraform -chdir=infra/cloudflare init
terraform -chdir=infra/cloudflare validate
```
Expected: `Success! The configuration is valid.` If an argument name is rejected, fix it against the `cloudflare/cloudflare` v5 provider docs, then re-validate.

- [ ] **Step 5: Commit**

```bash
git add infra/cloudflare/providers.tf infra/cloudflare/variables.tf infra/cloudflare/zone.tf
git commit -m "feat(cf-infra): scaffold Cloudflare provider + zone"
```

---

### Task 5: Replicate every DNS record

**Files:**
- Create: `infra/cloudflare/dns.tf`

These mirror the current DNSimple zone exactly. Website records are grey (`proxied = false`) → current CloudFront targets; they flip to Pages in Phase D.

- [ ] **Step 1: `dns.tf`**

```hcl
locals {
  # Subdomain NS delegations to Google Cloud DNS (preserve exactly).
  cicd_ns = {
    "default.cicd"          = ["a1", "a2", "a3", "a4"]
    "np.cicd"               = ["d1", "d2", "d3", "d4"]
    "prod.cicd"             = ["d1", "d2", "d3", "d4"]
    "tekton-pipelines.cicd" = ["c1", "c2", "c3", "c4"]
  }
  cicd_ns_flat = merge([
    for sub, ids in local.cicd_ns : {
      for id in ids : "${sub}-${id}" => { name = sub, server = "ns-cloud-${id}.googledomains.com" }
    }
  ]...)
}

# ── Non-website infrastructure (must survive the migration) ────────────────
resource "cloudflare_dns_record" "ci" {
  zone_id = cloudflare_zone.main.id
  name    = "ci"
  type    = "A"
  content = "159.65.10.120"
  ttl     = 600
  proxied = false
}
resource "cloudflare_dns_record" "www_ci" {
  zone_id = cloudflare_zone.main.id
  name    = "www.ci"
  type    = "A"
  content = "159.65.10.120"
  ttl     = 3600
  proxied = false
}
resource "cloudflare_dns_record" "dask" {
  zone_id = cloudflare_zone.main.id
  name    = "dask"
  type    = "A"
  content = "35.197.175.157"
  ttl     = 60
  proxied = false
}
resource "cloudflare_dns_record" "cicd_ns" {
  for_each = local.cicd_ns_flat
  zone_id  = cloudflare_zone.main.id
  name     = each.value.name
  type     = "NS"
  content  = each.value.server
  ttl      = 3600
}
resource "cloudflare_dns_record" "google_verify" {
  zone_id = cloudflare_zone.main.id
  name    = "@"
  type    = "TXT"
  content = "google-site-verification=1xudaaFggITzBja9R3XeRC6JhSZTyvh1ij6WOZHcbFw"
  ttl     = 3600
}

# ── Website records — grey-cloud → current CloudFront during transition ────
resource "cloudflare_dns_record" "apex" {
  zone_id = cloudflare_zone.main.id
  name    = "@"
  type    = "CNAME" # Cloudflare flattens CNAME at apex
  content = "d1nnawiq8qdjgb.cloudfront.net"
  ttl     = 300
  proxied = false
}
resource "cloudflare_dns_record" "www" {
  zone_id = cloudflare_zone.main.id
  name    = "www"
  type    = "CNAME"
  content = "d1nnawiq8qdjgb.cloudfront.net"
  ttl     = 300
  proxied = false
}
resource "cloudflare_dns_record" "next" {
  zone_id = cloudflare_zone.main.id
  name    = "next"
  type    = "CNAME"
  content = "d1qwco52fxejjm.cloudfront.net"
  ttl     = 300
  proxied = false
}
```

- [ ] **Step 2: Validate**

Run: `terraform -chdir=infra/cloudflare validate`
Expected: `Success! The configuration is valid.`

- [ ] **Step 3: Commit**

```bash
git add infra/cloudflare/dns.tf
git commit -m "feat(cf-infra): replicate all DNSimple records (grey-cloud website -> CloudFront)"
```

---

### Task 6: Zone settings

**Files:**
- Create: `infra/cloudflare/zone-settings.tf`

- [ ] **Step 1: `zone-settings.tf` (v5 per-setting resources)**

```hcl
locals {
  zone_settings = {
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    min_tls_version          = "1.2"
    http3                    = "on"
    ssl                      = "strict" # Pages origin is HTTPS → full(strict)
  }
}
resource "cloudflare_zone_setting" "this" {
  for_each   = local.zone_settings
  zone_id    = cloudflare_zone.main.id
  setting_id = each.key
  value      = each.value
}
```

- [ ] **Step 2: Validate**

Run: `terraform -chdir=infra/cloudflare validate`
Expected: valid. (If `cloudflare_zone_setting` arg names differ in v5, reconcile with provider docs.)

- [ ] **Step 3: Commit**

```bash
git add infra/cloudflare/zone-settings.tf
git commit -m "feat(cf-infra): zone settings (always-https, http3, min-tls 1.2, ssl strict)"
```

---

### Task 7: Apply the zone + DNS (creates zone, yields nameservers) — NO serving change yet

- [ ] **Step 1: Plan**

```bash
export TF_VAR_cloudflare_api_token=$(grep -E '^CLOUDFLARE_API_TOKEN=' ../shorted/.env | cut -d= -f2- | tr -d "\"'")
terraform -chdir=infra/cloudflare plan
```
Expected: creates `cloudflare_zone.main`, all `cloudflare_dns_record.*`, all `cloudflare_zone_setting.*`. No errors. (If the token lacks Zone:Create, add `benebsworth.com` once in the Cloudflare dashboard, then `terraform import cloudflare_zone.main <zone_id>` and re-plan.)

- [ ] **Step 2: Apply**

Run: `terraform -chdir=infra/cloudflare apply` → review → `yes`
Expected: zone created in `pending` state (until nameservers move); records created.

- [ ] **Step 3: Capture the assigned nameservers (needed by the user for GoDaddy)**

Run: `terraform -chdir=infra/cloudflare output nameservers`
Expected: two `*.ns.cloudflare.com` hostnames. **Record these for Task 11.**

- [ ] **Step 4: Confirm the live site is UNAFFECTED**

Run: `curl -sI https://benebsworth.com/ | grep -i server`
Expected: still served via CloudFront/AWS (DNSimple still authoritative — nothing has changed). This task only staged Cloudflare config.

---

## Phase C — Pages projects + Web Analytics

### Task 8: Create both Pages projects + first deploys (validate on `*.pages.dev`)

**Files:**
- Create: `infra/cloudflare/pages.tf`

- [ ] **Step 1: `pages.tf` (projects only; custom domains added in Phase D)**

```hcl
resource "cloudflare_pages_project" "prod" {
  account_id        = var.cloudflare_account_id
  name              = "benebsworth"
  production_branch = "master"
}
resource "cloudflare_pages_project" "next" {
  account_id        = var.cloudflare_account_id
  name              = "benebsworth-next"
  production_branch = "lab-expansion-8-posts"
}
```

- [ ] **Step 2: Apply**

Run: `terraform -chdir=infra/cloudflare apply` → `yes`
Expected: both Pages projects created. (Or create with `npx wrangler pages project create <name> --production-branch <branch>` if the provider resource lags; then `terraform import`.)

- [ ] **Step 3: Deploy the build to staging Pages**

```bash
export CLOUDFLARE_API_TOKEN=$(grep -E '^CLOUDFLARE_API_TOKEN=' ../shorted/.env | cut -d= -f2- | tr -d "\"'")
export CLOUDFLARE_ACCOUNT_ID=2132ccf47ceb5fff234c34d85490470a
npm run deploy:pages:next
```
Expected: build runs, `wrangler pages deploy` uploads `out/`, prints a `https://<hash>.benebsworth-next.pages.dev` URL.

- [ ] **Step 4: Validate the deployment on its `*.pages.dev` URL (real browser)**

Write a throwaway Playwright check against the `benebsworth-next.pages.dev` URL: load `/blog/`, run ⌘K search for "kubernetes" (assert results + 0 CSP/WASM errors), load `/now/` and `/uses/` (assert 200 + headings), and `curl -sI` the URL to confirm the `_headers` CSP (with `wasm-unsafe-eval`) and `Strict-Transport-Security` are present.
Expected: search works, pages render, security headers present. Delete the throwaway script.

- [ ] **Step 5: Deploy prod project too (still only on pages.dev, no custom domain yet)**

Run: `npm run deploy:pages:prod`
Expected: `https://<hash>.benebsworth.pages.dev` serves the site.

- [ ] **Step 6: Commit**

```bash
git add infra/cloudflare/pages.tf
git commit -m "feat(cf-infra): two Cloudflare Pages projects (prod + next)"
```

---

### Task 9: Cloudflare Web Analytics

**Files:**
- Create: `infra/cloudflare/analytics.tf`

- [ ] **Step 1: `analytics.tf`**

```hcl
resource "cloudflare_web_analytics_site" "main" {
  account_id   = var.cloudflare_account_id
  zone_tag     = cloudflare_zone.main.id
  auto_install = true # CF injects the beacon at the edge for proxied/Pages hosts
}
```

- [ ] **Step 2: Apply + validate**

Run: `terraform -chdir=infra/cloudflare apply` → `yes` → `terraform -chdir=infra/cloudflare validate`
Expected: web analytics site created. (Reconcile arg names with provider v5 docs if needed.) Because `auto_install = true`, **leave `NEXT_PUBLIC_CF_BEACON_TOKEN` unset** so the app doesn't double-inject (GA4 stays the only app-injected analytics).

- [ ] **Step 3: Commit**

```bash
git add infra/cloudflare/analytics.tf
git commit -m "feat(cf-infra): Cloudflare Web Analytics (auto-install)"
```

---

## Phase D — Cutover (USER-OWNED nameserver flip + staged serving switch)

> Reversible at every step: AWS/CloudFront stays live, so any record can be pointed back. Lower TTLs first to shrink the rollback window.

### Task 10: Lower website-record TTLs

- [ ] **Step 1: Set website records to 60s TTL** in `infra/cloudflare/dns.tf` (`apex`, `www`, `next` → `ttl = 60`), `apply`, commit.

```bash
git add infra/cloudflare/dns.tf
git commit -m "chore(cf-infra): drop website TTLs to 60s ahead of cutover"
```

### Task 11: USER — change nameservers at GoDaddy

- [ ] **Step 1 (USER, MANUAL):** In GoDaddy (registrar for benebsworth.com), replace the nameservers `NS1–4.DNSIMPLE.COM` with the two Cloudflare nameservers from `terraform output nameservers` (Task 7). Save.

- [ ] **Step 2: Wait for activation + verify the zone is active**

Run: `terraform -chdir=infra/cloudflare apply` (re-reads zone status) and `dig NS benebsworth.com +short`
Expected: nameservers now show `*.ns.cloudflare.com`; Cloudflare zone status `active`.

- [ ] **Step 3: Verify NOTHING broke (still served by CloudFront via CF DNS)**

```bash
for h in benebsworth.com www.benebsworth.com next.benebsworth.com ci.benebsworth.com dask.benebsworth.com; do echo "== $h =="; curl -sI "https://$h/" | head -1; done
dig NS default.cicd.benebsworth.com +short   # google NS delegation intact
dig TXT benebsworth.com +short               # google-site-verification intact
```
Expected: website hosts still 200 via CloudFront; `ci`/`dask` resolve to their IPs; `*.cicd` delegations + TXT intact.

### Task 12: Cut `next.` → Pages (staging proving-ground)

**Files:**
- Modify: `infra/cloudflare/pages.tf` (add `next` custom domain)
- Modify: `infra/cloudflare/dns.tf` (point `next` at Pages)

- [ ] **Step 1: Attach the custom domain + repoint DNS**

Add to `pages.tf`:
```hcl
resource "cloudflare_pages_domain" "next" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.next.name
  name         = "next.benebsworth.com"
}
```
In `dns.tf`, change the `next` record to point at the Pages project and proxy it:
```hcl
resource "cloudflare_dns_record" "next" {
  zone_id = cloudflare_zone.main.id
  name    = "next"
  type    = "CNAME"
  content = "benebsworth-next.pages.dev"
  ttl     = 1     # "automatic" when proxied
  proxied = true
}
```

- [ ] **Step 2: Apply + redeploy staging**

```bash
terraform -chdir=infra/cloudflare apply   # -> yes
npm run deploy:pages:next
```
Expected: `next.benebsworth.com` now served by Cloudflare Pages.

- [ ] **Step 3: Validate live on `next.benebsworth.com`**

Playwright + curl check against `https://next.benebsworth.com`: search works (0 CSP/WASM errors), `/now` + `/uses` render, `curl -sI` shows the `_headers` CSP + HSTS, and GA4 (`googletagmanager.com`) loads only if `NEXT_PUBLIC_GA_MEASUREMENT_ID` was set at build.
Expected: all pass. **If anything fails, revert `next` to the CloudFront target and re-apply (instant rollback).**

- [ ] **Step 4: Commit**

```bash
git add infra/cloudflare/pages.tf infra/cloudflare/dns.tf
git commit -m "feat(cf): cut next.benebsworth.com over to Cloudflare Pages"
```

### Task 13: Cut apex + www → Pages (production)

**Files:**
- Modify: `infra/cloudflare/pages.tf` (apex + www custom domains)
- Modify: `infra/cloudflare/dns.tf` (apex/www → Pages, proxied)

- [ ] **Step 1: Attach apex + www custom domains**

```hcl
resource "cloudflare_pages_domain" "apex" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.prod.name
  name         = "benebsworth.com"
}
resource "cloudflare_pages_domain" "www" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.prod.name
  name         = "www.benebsworth.com"
}
```

- [ ] **Step 2: Repoint apex + www at Pages (proxied)**

In `dns.tf`, set both `apex` and `www` records:
```hcl
  content = "benebsworth.pages.dev"
  proxied = true
  ttl     = 1
```

- [ ] **Step 3: Apply + redeploy prod**

```bash
terraform -chdir=infra/cloudflare apply   # -> yes
npm run deploy:pages:prod
```

- [ ] **Step 4: Validate production live**

```bash
curl -sI https://benebsworth.com/ | grep -iE 'content-security|strict-transport|server'
curl -sI https://www.benebsworth.com/ | head -1   # expect 301 -> https://benebsworth.com/
```
Plus a Playwright pass on `https://benebsworth.com`: search works (0 CSP/WASM errors), key pages render, OG images load. **Rollback = point apex/www back to the CloudFront target + re-apply.**

- [ ] **Step 5: Commit**

```bash
git add infra/cloudflare/pages.tf infra/cloudflare/dns.tf
git commit -m "feat(cf): cut apex + www over to Cloudflare Pages (production)"
```

---

## Phase E — Detach AWS (keep dormant) + docs

### Task 14: Repoint deploy scripts + update docs/memory

**Files:**
- Modify: `package.json` (`deploy:next`/`deploy:prod` → Pages)
- Modify: `.claude/skills/deploying-the-site/SKILL.md`
- Modify: memory (`deploying-the-site` notes / `staging-deploy`)

- [ ] **Step 1: Point the canonical deploy scripts at Pages**

In `package.json`, repoint (keep the AWS ones available under `deploy:aws:*` for the dormant fallback):
```json
"deploy:aws:next": "bash scripts/deploy.sh staging",
"deploy:aws:prod": "bash scripts/deploy.sh prod",
"deploy:next": "bash scripts/deploy-pages.sh staging",
"deploy:prod": "bash scripts/deploy-pages.sh prod",
```

- [ ] **Step 2: Confirm AWS is fully detached but intact**

```bash
dig benebsworth.com +short        # resolves to Cloudflare, NOT *.cloudfront.net
aws cloudfront get-distribution --id E30L2WGIX5OPQG --query 'Distribution.Status' --output text
```
Expected: DNS no longer references CloudFront; the distribution still exists (`Deployed`) — dormant, untouched, available for rollback. **Do not delete** the buckets/distributions or the AWS Terraform.

- [ ] **Step 3: Update the `deploying-the-site` skill** to describe the Pages world (build → `wrangler pages deploy out`, `_headers`/`_redirects` as the CSP/header source of truth, two Pages projects), and document AWS S3+CloudFront as the **dormant fallback** (how to roll back: repoint apex/www/next at the CloudFront targets + `terraform -chdir=infra/cloudflare apply`).

- [ ] **Step 4: Update memory** (`deploying-the-site`/`staging-deploy`/`prod-infra`) to reflect Cloudflare Pages as the live path and AWS as dormant fallback.

- [ ] **Step 5: Commit**

```bash
git add package.json .claude/skills/deploying-the-site/SKILL.md
git commit -m "docs(cf): make Cloudflare Pages the canonical deploy; AWS kept dormant as fallback"
```

---

## Self-Review

**Spec coverage:**
- Two Pages projects → Tasks 8, 12, 13. ✓
- Cloudflare authoritative DNS + all records replicated → Tasks 5, 7, 11. ✓
- Security headers/CSP/redirects in-repo (`_headers`/`_redirects`, incl. `wasm-unsafe-eval` + analytics domains) → Task 2. ✓
- CF Web Analytics + GA4 → Tasks 1, 9. ✓
- Reuse account token + remote state → Tasks 4, 7. ✓
- Staged reversible cutover → Phase D (Tasks 10–13), rollback noted each step. ✓
- Keep AWS dormant (no deletion) → Task 14 explicitly. ✓
- Out-of-scope (no Workers/WAF/KV) → honored (none planned). ✓

**Placeholder scan:** No TBD/TODO. The two intentionally-narrated validation steps (Task 2 Step 4, Task 8 Step 4, Task 12 Step 3) describe a throwaway Playwright/curl check rather than inlining a full script — these reuse a pattern already proven earlier in this project and are deliberately ephemeral; acceptable.

**Type/name consistency:** Pages project names (`benebsworth`, `benebsworth-next`), account id (`2132ccf4…`), backend bucket (`benebsworth-tfstate-299413881343`), and the CloudFront targets (`d1nnawiq8qdjgb` prod, `d1qwco52fxejjm` next) are used consistently across tasks.

**Provider-version caveat:** `cloudflare/cloudflare ~>5` changed several resource argument shapes vs v4 (`cloudflare_zone.account`, `cloudflare_dns_record.content`, per-setting `cloudflare_zone_setting`, `cloudflare_pages_*`). Every Terraform task ends in `validate`/`plan`, which surfaces any arg drift to fix against the provider docs before `apply`.
