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

# NOTE: `google_verify` (TXT), `apex`, and `www` are intentionally NOT managed
# here. When the zone was added to Cloudflare, the auto-scan already imported:
#   - the google-site-verification TXT (kept as-is)
#   - apex + www as A/AAAA records → the CloudFront anycast IPs, PROXIED (orange),
#     which is what currently serves prod via Cloudflare → CloudFront.
# They're left untouched so prod keeps serving. At the Pages cutover they get
# REPLACED with CNAME → "<project>.pages.dev" (proxied) — handled in that phase,
# not as transitional CloudFront-IP records. Managing them here now would either
# conflict (TXT already exists) or disrupt the working apex/www.

# `next` was MISSING after the premature NS move (auto-import didn't catch the
# CNAME); restored here. Re-points to the staging Pages project at cutover.
resource "cloudflare_dns_record" "next" {
  zone_id = var.cloudflare_zone_id
  name    = "next"
  type    = "CNAME"
  content = "d1qwco52fxejjm.cloudfront.net"
  ttl     = 300
  proxied = false
}
