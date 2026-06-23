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

resource "cloudflare_dns_record" "google_verify" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "TXT"
  content = "google-site-verification=1xudaaFggITzBja9R3XeRC6JhSZTyvh1ij6WOZHcbFw"
  ttl     = 3600
}

# ── Website records — grey-cloud → current CloudFront during transition ──────
# Flip to the Pages projects (content = "<project>.pages.dev", proxied = true)
# during the staged cutover (spec Phase D).
resource "cloudflare_dns_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "CNAME" # Cloudflare flattens CNAME at the apex
  content = "d1nnawiq8qdjgb.cloudfront.net"
  ttl     = 300
  proxied = false
}

resource "cloudflare_dns_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"
  content = "d1nnawiq8qdjgb.cloudfront.net"
  ttl     = 300
  proxied = false
}

resource "cloudflare_dns_record" "next" {
  zone_id = var.cloudflare_zone_id
  name    = "next"
  type    = "CNAME"
  content = "d1qwco52fxejjm.cloudfront.net"
  ttl     = 300
  proxied = false
}
