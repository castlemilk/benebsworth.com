# Cloudflare migration — design spec

**Date:** 2026-06-23
**Status:** Approved (design)
**Owner:** Ben Ebsworth

Migrate benebsworth.com from **AWS S3 + CloudFront (DNSimple DNS)** to **Cloudflare
Pages**, with Cloudflare as the authoritative DNS and CDN. Patterned on the
`../shorted` Cloudflare setup (same Cloudflare account, `cloudflare/cloudflare ~>5`
Terraform provider), simplified for a static site. Analytics via **both** Cloudflare
Web Analytics and GA4.

## Decisions (locked)

| Question | Decision |
|---|---|
| Scope | Full migration — Cloudflare becomes the CDN; retire CloudFront/S3 from **serving** |
| Serving target | **Cloudflare Pages** (static `out/` export), HTTPS end-to-end |
| Analytics | **Both** Cloudflare Web Analytics + GA4 (`@next/third-parties`, prod-only) |
| CF account | Reuse the existing account (`Ben.ebsworth@gmail.com's Account`, id `2132ccf4…`) and its account-scoped API token (shared with shorted) |
| Decommission | **Keep AWS dormant** — detach from serving, but leave S3 buckets + CloudFront + their Terraform intact as a long-lived fallback. No deletion. |

## End-state architecture

- **Two Cloudflare Pages projects** (mirrors today's prod/staging split):
  - `benebsworth` — production branch → custom domains `benebsworth.com` + `www.benebsworth.com` (www 301 → apex)
  - `benebsworth-next` — built from the working/dev branch → custom domain `next.benebsworth.com`
- **Cloudflare authoritative DNS** for the `benebsworth.com` zone (nameservers moved DNSimple → Cloudflare at the **GoDaddy** registrar).
- Build is unchanged: `next build` → `pagefind --site out` → `og-rewrite.mjs` → `out/`.
- **Deploy** becomes `wrangler pages deploy out --project-name=<project>` (replaces the 3-pass `aws s3 sync` + CloudFront invalidation).
- No CloudFront, no S3-website origin, no Flexible-SSL — Pages serves HTTPS directly.

## Components

### Cloudflare Pages
- Two projects as above. Pages serves `out/` directly; directory `index.html` and the `trailingSlash: true` URLs are handled natively.
- `wrangler.toml` for project config; `wrangler` added as a devDependency.

### DNS (Terraform `infra/cloudflare/`)
Replicate **every** current DNSimple record exactly, so the nameserver flip is a no-op for non-website traffic:
- `ci` A → `159.65.10.120`, `www.ci` A → `159.65.10.120` (DigitalOcean)
- `dask` A → `35.197.175.157` (GCP)
- `default.cicd`, `np.cicd`, `prod.cicd`, `tekton-pipelines.cicd` — NS delegations to `ns-cloud-*.googledomains.com` (preserve all four sets)
- `@` TXT `google-site-verification=…`
- Website records (`@`, `www`, `next`) — initially **grey-cloud → current CloudFront targets** (`d1nnawiq8qdjgb.cloudfront.net`, `d1qwco52fxejjm.cloudfront.net`), then re-pointed to Pages per the cutover.
- No MX / email records exist in the zone — nothing to preserve there. (Confirm before cutover.)
- ACM-validation CNAMEs become irrelevant once CloudFront is detached; keep them harmlessly during transition, prune later.

### Security headers / CSP / redirects (in-repo)
- `public/_headers` — replicate the current CloudFront response-headers policy: HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and the CSP **including `'wasm-unsafe-eval'`** (so Pagefind search keeps working). Set `Cache-Control` per path class (immutable for `/_next/static/*`, short for HTML).
- `public/_redirects` — `www.benebsworth.com/* → https://benebsworth.com/:splat 301`.
- These ship inside `out/` (they live under `public/`), so they're version-controlled and deploy atomically with the site. The `wasm-unsafe-eval` CSP edit already applied to the AWS path carries over conceptually; the canonical CSP now lives in `_headers`.

### Analytics
- **Cloudflare Web Analytics** — `cloudflare_web_analytics_site` (Terraform); cookieless, auto-injected on the Pages custom domains. No consent banner.
- **GA4** — `@next/third-parties/google` `GoogleAnalytics` component in `app/layout.tsx`, gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID` and **production only** (mirrors shorted). Optionally report web-vitals to GA4 (`reportWebVitals`).
- Extend the existing `components/analytics/analytics.tsx`: keep the env-gated Cloudflare beacon branch, **add** GA4, **remove** the Plausible branch (no longer needed).

### IaC structure (`infra/cloudflare/`)
Mirrors shorted's `cloudflare-edge` module, simplified (no Workers/KV/WAF/rate-limit/Argo/Polish):
- `cloudflare` provider `~> 5`, authed via the shared `CLOUDFLARE_API_TOKEN` (env / `TF_VAR_cloudflare_api_token`).
- `cloudflare_zone` (benebsworth.com), all `cloudflare_dns_record`s, `cloudflare_zone_setting`s (`always_use_https`, `automatic_https_rewrites`, `min_tls_version=1.2`, `http3`, `ssl=strict`), `cloudflare_pages_project` + `cloudflare_pages_domain` (×2), `cloudflare_web_analytics_site`, optional `cloudflare_zone_dnssec`.
- Remote state alongside the existing backend convention.
- The existing AWS `infra/envs/{staging,prod}` + `infra/modules/site` stay in place (dormant after cutover).

## Cutover sequence (staged, reversible)

1. **Prep (no user-facing change).** Add the zone to Cloudflare; Terraform-replicate all records (website records grey-cloud → CloudFront). Capture Cloudflare's assigned nameservers.
2. **Build the targets.** Create both Pages projects; `wrangler pages deploy out`. Validate fully on the `*.pages.dev` URLs (search, all pages, `_headers` applied, analytics).
3. **Lower TTLs**, then **change nameservers at GoDaddy** → Cloudflare. Wait for activation. Site still served by CloudFront (records unchanged). Verify `ci`, `dask`, the `*.cicd` delegations, the TXT, and the site all resolve/serve intact.
4. **Staging cutover.** Point `next.benebsworth.com` → `benebsworth-next` Pages (custom domain). Validate: search works under the `_headers` CSP, pages render, CF + GA4 analytics fire.
5. **Prod cutover.** Point apex + `www` → `benebsworth` Pages. Validate the same.
6. **Detach AWS (keep dormant).** DNS no longer points at CloudFront. Leave the S3 buckets, both CloudFront distributions, and `infra/envs/*` + `infra/modules/site` **in place, unused**, as a fallback. Update `deploying-the-site` skill + memory to describe the Pages world and the dormant AWS fallback.

## Deploy pipeline

- New `scripts/deploy.sh` path (or a sibling `deploy-pages.sh`): build → `wrangler pages deploy out --project-name=<benebsworth|benebsworth-next>`. Keep `SKIP_ARCHIVE` semantics for the legacy Gatsby archive if still relevant, else drop.
- `npm run deploy:next` → staging Pages project; `npm run deploy:prod` → prod Pages project.
- Auth: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in `.env` (already available from the shorted token).
- Standing rule unchanged: auto-deploy staging after deployable work; never auto-deploy prod.

## Division of labour

- **User (manual):** change nameservers at GoDaddy (step 3); create a GA4 property and supply `NEXT_PUBLIC_GA_MEASUREMENT_ID`; if the token lacks Zone:Create, add the zone once in the Cloudflare dashboard so Terraform can adopt it.
- **Me (automated):** all Terraform, `wrangler.toml`, `_headers`/`_redirects`, GA4 + analytics code, deploy scripts, per-step validation (real-browser: search, CSP, analytics), and the docs/memory updates.

## Risks & rollback

- **DNS cutover is the only real risk.** Mitigated by replicating records exactly first (grey-cloud → CloudFront), so the NS flip changes nothing about serving; serving only changes when individual records are pointed at Pages, one env at a time, after validation.
- **Rollback at any step:** point the website records back at CloudFront (kept alive/dormant throughout), or revert nameservers to DNSimple (TTL-bound). Because AWS stays dormant, rollback is always a DNS change, never a rebuild.
- **Lower TTLs** before cutover to shrink the rollback window.

## Out of scope (YAGNI vs shorted)

No edge Workers, KV cache, pre-warm cron, WAF / rate-limiting, Argo/tiered cache, or Polish — those serve shorted's dynamic API and aren't needed for a static site. Straightforward to add later if wanted.
