provider "aws" {
  region  = "ap-southeast-2"
  profile = "default"
}
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = "default"
}
provider "dnsimple" {
  account = var.dnsimple_account
  token   = var.dnsimple_token
}
variable "dnsimple_account" {
  type = string
  # DNSimple's API path needs the NUMERIC account id (54968), not the account
  # name ("benebsworth") — the name yields `GET /v2/benebsworth/... 401`. Default
  # it so staging plan/apply only needs the (secret) token passed.
  default = "54968"
}
variable "dnsimple_token" {
  type      = string
  sensitive = true
}
