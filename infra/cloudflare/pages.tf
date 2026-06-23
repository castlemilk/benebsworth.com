# Cloudflare Pages projects (account-level; independent of the zone).
# Custom domains (benebsworth.com / www / next) are attached during the staged
# cutover once the zone is active on Cloudflare — see cloudflare_pages_domain
# blocks, commented until then.

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

# ── Custom domains are managed OUT-OF-BAND via the Cloudflare API, not here ──
# The `cloudflare_pages_domain` provider resource makes an extra cert-status call
# that the scoped token can't do (needs SSL&Certificates:Edit), so it 401s — but
# the plain domain-add API call works. Custom domains attached via:
#   POST /accounts/<acct>/pages/projects/<project>/domains  {"name": "<host>"}
# Attached so far: next.benebsworth.com → benebsworth-next.
# resource "cloudflare_pages_domain" "apex" {
#   account_id   = var.cloudflare_account_id
#   project_name = cloudflare_pages_project.prod.name
#   name         = "benebsworth.com"
# }
# resource "cloudflare_pages_domain" "www" {
#   account_id   = var.cloudflare_account_id
#   project_name = cloudflare_pages_project.prod.name
#   name         = "www.benebsworth.com"
# }
