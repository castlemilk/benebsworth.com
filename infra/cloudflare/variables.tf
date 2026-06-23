variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_account_id" {
  type    = string
  default = "2132ccf47ceb5fff234c34d85490470a" # Ben.ebsworth@gmail.com's Account
}

# The zone must be ADDED to Cloudflare first (dashboard or an API token with
# Zone:Create), which yields this id + the assigned nameservers. Then set
# TF_VAR_cloudflare_zone_id and apply. Mirrors ../shorted (zone managed
# out-of-band, records/settings managed here against the zone id).
variable "cloudflare_zone_id" {
  type = string
}

variable "domain" {
  type    = string
  default = "benebsworth.com"
}
