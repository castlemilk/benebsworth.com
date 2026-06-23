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

# ── Non-website infrastructure (must survive the migration) ──────────────────
resource "cloudflare_dns_record" "ci" {
  zone_id = var.cloudflare_zone_id
  name    = "ci"
  type    = "A"
  content = "159.65.10.120"
  ttl     = 600
  proxied = false
}

resource "cloudflare_dns_record" "www_ci" {
  zone_id = var.cloudflare_zone_id
  name    = "www.ci"
  type    = "A"
  content = "159.65.10.120"
  ttl     = 3600
  proxied = false
}

resource "cloudflare_dns_record" "dask" {
  zone_id = var.cloudflare_zone_id
  name    = "dask"
  type    = "A"
  content = "35.197.175.157"
  ttl     = 60
  proxied = false
}

resource "cloudflare_dns_record" "cicd_ns" {
  for_each = local.cicd_ns_flat
  zone_id  = var.cloudflare_zone_id
  name     = each.value.name
  type     = "NS"
  content  = each.value.server
  ttl      = 3600
}

# apex + www → Cloudflare Pages (cut over from CloudFront; apex uses CNAME
# flattening). The A/AAAA → CNAME swap was done via the API to control downtime,
# then imported into state — so these now match reality.
resource "cloudflare_dns_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "CNAME"
  content = "benebsworth.pages.dev"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"
  content = "benebsworth.pages.dev"
  ttl     = 1
  proxied = true
}

# Managed OUTSIDE Terraform (via the Cloudflare API): the google-site-verification
# TXT (auto-imported with the zone), the Pages custom domains, and the www→apex
# 301 (a http_request_dynamic_redirect ruleset). See pages.tf for the rationale.

# `next` → staging Pages project (cut over from CloudFront). Proxied so Cloudflare
# serves Pages + provisions the edge cert. Rollback = content back to the
# CloudFront target (d1qwco52fxejjm.cloudfront.net), proxied=false.
resource "cloudflare_dns_record" "next" {
  zone_id = var.cloudflare_zone_id
  name    = "next"
  type    = "CNAME"
  content = "benebsworth-next.pages.dev"
  ttl     = 1
  proxied = true
}
