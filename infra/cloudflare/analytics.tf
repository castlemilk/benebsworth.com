# Cloudflare Web Analytics (cookieless) — NOT managed via Terraform.
#
# The `cloudflare_web_analytics_site` provider resource (v5) consistently fails
# with "failed to make http request" even with full Global-Key access (a provider
# bug, not a permissions issue). Enable it instead with one click in the dashboard:
#   Cloudflare → Pages → benebsworth → Settings → Enable Web Analytics
# (or Web Analytics → Add a site → benebsworth.com, automatic injection).
#
# GA4 is the primary analytics and is wired in-app (components/analytics/analytics.tsx,
# NEXT_PUBLIC_GA_MEASUREMENT_ID), so this is purely the cookieless second source.
