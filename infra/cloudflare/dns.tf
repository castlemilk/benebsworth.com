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

# `paprika` → VKE paprika dev cluster Envoy Gateway LoadBalancer.
# Proxied through Cloudflare so the Universal SSL wildcard cert at the edge
# covers the TLS handshake (free; covers *.benebsworth.com). Origin serves
# a self-signed cert from cert-manager's selfsigned-issuer, hence ssl="full"
# in zone-settings.tf so CF accepts the origin cert without requiring a CA
# signature. Envoy Gateway replaced ingress-nginx due to a Go crypto/x509
# cert validation bug in ingress-nginx v1.12. When the cluster is
# decommissioned delete this record.
variable "paprika_lb_ip" {
  type        = string
  description = "IPv4 of the VKE Envoy Gateway LB that fronts paprika.benebsworth.com"
  default     = "45.77.238.224"
}

resource "cloudflare_dns_record" "paprika" {
  zone_id  = var.cloudflare_zone_id
  name     = "paprika"
  type     = "A"
  content  = var.paprika_lb_ip
  ttl      = 1  # ttl is ignored when proxied=true (CF sets it to auto)
  proxied  = true
  comment  = "VKE paprika Envoy Gateway LB (managed in this file; revisit when cluster is decommissioned)"
  tags     = []
}

# ── ACM DNS-validation CNAMEs ────────────────────────────────────────────────
# The us-east-1 ACM cert (a6f0b992-…) on CloudFront distribution E30L2WGIX5OPQG
# still lists benebsworth.com + www as aliases. ACM re-checks these CNAMEs at
# every renewal; they were lost in the Cloudflare cutover, so the Sep 2026
# renewal stalled in PENDING_VALIDATION. Must be DNS-only (proxied = false).
# Delete these (and the distribution) once CloudFront is fully retired.
resource "cloudflare_dns_record" "acm_validation_apex" {
  zone_id = var.cloudflare_zone_id
  name    = "_522734140e7786b8b283f2024465d867"
  type    = "CNAME"
  content = "_5c35002a5fc00ea5e2d7f7d21ca4591b.acm-validations.aws"
  ttl     = 300
  proxied = false
  comment = "ACM DNS validation for benebsworth.com (CloudFront cert)"
}

resource "cloudflare_dns_record" "acm_validation_www" {
  zone_id = var.cloudflare_zone_id
  name    = "_9be799bb7779523fe4661a8af081454b.www"
  type    = "CNAME"
  content = "_100e56b660f7df9e26134678bb2de12a.acm-validations.aws"
  ttl     = 300
  proxied = false
  comment = "ACM DNS validation for www.benebsworth.com (CloudFront cert)"
}

# The two records above were created via the Cloudflare API on 2026-09-07 to
# beat the ACM deadline. Import them on the next apply (safe to keep; no-op once
# they are in state).
import {
  to = cloudflare_dns_record.acm_validation_apex
  id = "${var.cloudflare_zone_id}/92c5a424bf1e6ce2acc3fbf705b60b9b"
}

import {
  to = cloudflare_dns_record.acm_validation_www
  id = "${var.cloudflare_zone_id}/1e4cb35401a067f7464a70ed5960ff9d"
}
