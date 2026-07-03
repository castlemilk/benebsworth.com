locals {
  zone_settings = {
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    min_tls_version          = "1.2"
    http3                    = "on"
    # `full` (not `strict`) because `paprika` proxies to a self-signed cert
    # from cert-manager's selfsigned-issuer. The Free plan's Universal SSL
    # wildcard cert at the edge covers *.benebsworth.com — that's the only
    # thing making the cert valid in browsers. All other proxied hosts in
    # this zone are Cloudflare Pages (HTTPS, valid). If we move paprika
    # to a CA-signed origin cert, flip back to "strict" so a hostile origin
    # can't serve an invalid cert.
    ssl = "full"
  }
}

resource "cloudflare_zone_setting" "this" {
  for_each   = local.zone_settings
  zone_id    = var.cloudflare_zone_id
  setting_id = each.key
  value      = each.value
}
