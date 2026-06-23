# Cloudflare Web Analytics (cookieless). auto_install injects the beacon at the
# edge for the proxied/Pages hosts, so the app should leave
# NEXT_PUBLIC_CF_BEACON_TOKEN unset (GA4 stays the only app-injected analytics).
resource "cloudflare_web_analytics_site" "main" {
  account_id   = var.cloudflare_account_id
  zone_tag     = var.cloudflare_zone_id
  auto_install = true
}
