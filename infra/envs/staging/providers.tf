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
}
variable "dnsimple_token" {
  type      = string
  sensitive = true
}
