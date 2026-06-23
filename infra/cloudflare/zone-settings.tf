locals {
  zone_settings = {
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    min_tls_version          = "1.2"
    http3                    = "on"
    ssl                      = "strict" # all proxied origins are now Pages (HTTPS) → safe
  }
}

resource "cloudflare_zone_setting" "this" {
  for_each   = local.zone_settings
  zone_id    = var.cloudflare_zone_id
  setting_id = each.key
  value      = each.value
}
